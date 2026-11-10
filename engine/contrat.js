/* ============================================================
   OpenContact — moteur · du « oui » au contrat qui tient
   (la refonte, la fin du parcours — docs/refonte.md)

   « Décroché » fermait la piste : l'app s'arrêtait au moment où tout
   peut encore tomber. Un stage n'existe pas sans convention signée par
   les trois avant le premier jour ; une alternance se joue encore
   pendant les 45 premiers jours en entreprise, où chacun peut rompre
   librement (reports/Accompagner la recherche de stage.md, « Le
   contexte français »). Aucun outil relevé ne suit ce bout-là.

   La suite d'un « Décroché » est une liste COURTE : trois ou quatre
   étapes, dans l'ordre où elles arrivent, et une seule phrase d'aide
   par étape — seulement là où elle prévient d'une erreur qu'on ne voit
   pas venir (CLAUDE.md §7). Rien n'y est un conseil.

   Le champ `suite` est PRIVÉ (CONTRAT.md §3) : `{ t, f }` — `t` le
   genre de contrat, `f` les étapes faites et leur jour. Il ne part
   jamais dans un partage ; il suit la piste entre mes appareils.

   Fonctions pures.
   ============================================================ */

/* les étapes, par genre de contrat. `note` : la phrase qui prévient. */
export const SUITES = {
  stage: [
    { id: 'convention', label: 'Demander la convention à ton école' },
    { id: 'signee', label: 'Faire signer la convention par toi, l’école et l’entreprise',
      note: 'Avant le premier jour : sans elle, pas de stage.' },
    { id: 'debut', label: 'Premier jour' }
  ],
  alternance: [
    { id: 'contrat', label: 'Signer le contrat' },
    { id: 'debut', label: 'Premier jour dans l’entreprise' },
    { id: 'depot', label: 'Vérifier que l’entreprise a déposé le contrat',
      note: 'À son OPCO, dans les 5 jours ouvrables après le début.' },
    { id: 'essai', label: 'Passer les 45 premiers jours en entreprise',
      note: 'Jusque-là, chacun peut encore rompre librement.' }
  ],
  emploi: [
    { id: 'ecrit', label: 'Recevoir la promesse ou le contrat par écrit' },
    { id: 'signe', label: 'Signer le contrat' },
    { id: 'debut', label: 'Premier jour' }
  ]
};
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/* Quel contrat ? Ce que dit le profil (ce que tu cherches), sinon ce que
   la piste propose, sinon un emploi — la liste la plus courte, qui ne
   promet aucune formalité qu'on n'a pas. */
export function genreDeSuite(c, profile){
  const r = profile && profile.recherche;
  if (SUITES[r]) return r;
  const p = (c && c.positions) || [];
  if (p.includes('alternance')) return 'alternance';
  if (p.includes('stage')) return 'stage';
  return 'emploi';
}

/* `{ t, f }` ou rien : un genre connu, et seulement les étapes de ce genre */
export function normaliserSuite(x){
  if (!x || typeof x !== 'object' || !SUITES[x.t]) return null;
  const f = {};
  const src = (x.f && typeof x.f === 'object' && !Array.isArray(x.f)) ? x.f : {};
  for (const e of SUITES[x.t]) if (JOUR.test(String(src[e.id] || ''))) f[e.id] = src[e.id];
  return { t: x.t, f };
}

/* La suite d'une piste décrochée, prête à montrer. `null` si la piste
   n'est pas décrochée. Sans champ `suite` encore, la liste existe quand
   même, vide : c'est « Décroché » qui l'ouvre, pas un geste de plus. */
export function suiteDe(c, profile){
  if (!c || c.closedReason !== 'won') return null;
  const s = normaliserSuite(c.suite) || { t: genreDeSuite(c, profile), f: {} };
  const etapes = SUITES[s.t].map(e => ({ ...e, fait: s.f[e.id] || '' }));
  const prochaine = etapes.find(e => !e.fait) || null;
  return { t: s.t, etapes, prochaine, finie: !prochaine, faites: etapes.filter(e => e.fait).length };
}

/* Cocher ou décocher une étape : rend la NOUVELLE valeur du champ, sans
   toucher à la piste — l'écran l'écrit, et sait l'annuler. */
export function cocherSuite(c, profile, id, today){
  const s = normaliserSuite(c && c.suite) || { t: genreDeSuite(c, profile), f: {} };
  if (!SUITES[s.t].some(e => e.id === id)) return s;
  const f = { ...s.f };
  if (f[id]) delete f[id];
  else if (JOUR.test(String(today || ''))) f[id] = today;
  return { t: s.t, f };
}
