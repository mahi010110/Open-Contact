/* ============================================================
   OpenContact — moteur · le rangement automatique
   (la refonte, lot 3 — l'idée d'Arc Search : ce qui ne sert plus se
   range tout seul ; fiche 0014)

   Une piste engagée qui se tait depuis `SILENCE_TROP_TARD` jours (45)
   n'est plus à relancer : « passé ce seuil, la littérature ne dit plus
   relance encore, elle dit passe à autre chose » (CLAUDE.md §6, « Le
   silence n'est pas une dette »). L'app proposait alors « Clore » sur
   une ligne d'« Aujourd'hui » — une décision de plus, qu'on repousse,
   et une pile qui grandit. Elle la range maintenant elle-même.

   TROIS GARDES, parce que c'est le seul geste que l'app fait sans tap :
   1. RIEN N'EST SUPPRIMÉ (invariant ②). Ranger, c'est clôturer en
      « Abandonné » : la piste reste dans « Mes pistes », avec tout ce
      qu'elle porte, et « Rouvrir » la rend.
   2. ÇA S'ANNONCE ET ÇA SE RATTRAPE. La piste garde le jour où l'app
      l'a rangée (`rangeAuto`, privé) : l'accueil le dit pendant
      `ANNONCE_JOURS` jours, avec « Annuler ».
   3. ÇA NE RECOMMENCE PAS. Annuler rouvre la piste et écrit « Rouverte »
      dans son historique : c'est une trace, le silence repart de zéro.

   Seules les pistes ENGAGÉES et sans prochaine action se rangent — ce
   que `silentPistes` appelle déjà « trop tard ». Une piste jamais
   contactée n'est pas en train de filer : elle attend. Une piste dont
   une action est prévue, même en retard, a un propriétaire.

   Fonctions pures : l'écran décide QUAND, le moteur dit QUOI.
   ============================================================ */
import { silentPistes, SILENCE_TROP_TARD } from './assist.js';
import { pushHist } from './model.js';

export const RANGER_APRES = SILENCE_TROP_TARD;   /* 45 jours : le seuil existant, pas un second chiffre */
export const ANNONCE_JOURS = 7;                  /* le temps de voir l'annonce, et d'annuler */

const temps = iso => Date.parse(iso + 'T00:00:00Z');
const ecart = (a, b) => Math.round((temps(b) - temps(a)) / 86400000);

/* les pistes à ranger aujourd'hui : `[{ id, jours }]` */
export function aRanger(companies, today){
  const demo = new Set((companies || []).filter(c => c && c.demo).map(c => c.id));
  return silentPistes(companies || [], today)
    .filter(s => s.cran === 'late' && !demo.has(s.id))
    .map(s => ({ id: s.id, jours: s.jours }));
}

/* Range UNE piste : clôturée « Abandonné », datée, et marquée comme
   rangée par l'app — c'est cette marque que l'accueil annonce. */
export function ranger(c, today, jours){
  c.closedReason = 'dropped';
  c.closedAt = today;
  c.rangeAuto = today;
  c.updatedAt = Date.now();
  pushHist(c, 'Rangée : ' + jours + ' jours sans réponse');
  /* l'historique se date du jour du RANGEMENT, pas de l'horloge : le
     moteur ne lit pas l'heure (`pushHist` la lit — on la corrige ici) */
  c.history[c.history.length - 1].d = today;
}

/* Range tout ce qui doit l'être. Rend les pistes rangées, avec leurs jours. */
export function rangerTout(companies, today){
  const parId = new Map((companies || []).filter(Boolean).map(c => [c.id, c]));
  const out = [];
  for (const r of aRanger(companies, today)){
    const c = parId.get(r.id);
    if (!c) continue;
    ranger(c, today, r.jours);
    out.push({ id: c.id, name: c.name, jours: r.jours });
  }
  return out;
}

/* Ce que l'accueil annonce : les pistes que l'app a rangées ces derniers
   jours. `jours` relit l'historique — c'est lui qui porte le chiffre. */
export function annonces(companies, today){
  const out = [];
  for (const c of companies || []){
    if (!c || c.closedReason !== 'dropped' || !c.rangeAuto) continue;
    const depuis = ecart(c.rangeAuto, today);
    if (depuis < 0 || depuis > ANNONCE_JOURS) continue;
    const h = (c.history || []).slice().reverse().find(x => x && /^Rangée : (\d+) jours/.test(x.t));
    out.push({ id: c.id, name: c.name, jours: h ? Number(/^Rangée : (\d+)/.exec(h.t)[1]) : RANGER_APRES, le: c.rangeAuto });
  }
  return out.sort((a, b) => String(b.le).localeCompare(String(a.le)) || String(a.name).localeCompare(String(b.name), 'fr'));
}

/* « Annuler » : la piste revient, et le silence repart de zéro. */
export function sortir(c, today){
  c.closedReason = '';
  c.closedAt = '';
  delete c.rangeAuto;
  c.updatedAt = Date.now();
  pushHist(c, 'Rouverte');
  c.history[c.history.length - 1].d = today;
}
/* rangée par l'app, et non clôturée à la main ? */
export const rangeeSeule = c => !!c && c.closedReason === 'dropped' && !!c.rangeAuto;
