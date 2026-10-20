/* ============================================================
   OpenContact — moteur · ma semaine (lot R4)
   (docs/propositions/R4-ma-semaine.md, validée le 20 octobre 2026)

   Une recherche dure des semaines, et elle se perd dans le flou : on ne
   sait pas si l'on en fait assez. Les chiffres de R2 disent où l'on en
   est depuis le début ; ici, où l'on en est CETTE semaine, et ce qu'on
   s'était promis.

   ① un objectif, un seul nombre : les mails partis. L'app le propose
     (la semaine d'avant plus un, trois au moins), deux boutons le font
     varier — rien à taper ;
   ② il se remplit seul, des gestes déjà datés (« Email envoyé »,
     « Statut → En cours » dans l'historique de chaque piste) ;
   ③ le vendredi, la revue : trois nombres, et une phrase faite des
     seuls nombres et de mots fixes, qu'on peut donner à son groupe.
     JAMAIS un nom d'entreprise ni de personne : la phrase est construite
     ici, à partir de nombres, et le scénario lit ce qui part.

   Rien ne se cumule d'une semaine à l'autre, rien ne rougit : un nombre,
   pas un retard. Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */
import { localISO } from './utils.js';

export const OBJECTIF_MIN = 3;
export const OBJECTIF_MAX = 30;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- les jours ----------
   Des dates AAAA-MM-JJ, calculées en UTC pour qu'aucun changement
   d'heure ne décale un jour. Lundi = 1, dimanche = 7. */
const enDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const versISO = t => new Date(t).toISOString().slice(0, 10);
export const plusJours = (iso, n) => versISO(enDate(iso).getTime() + n * 864e5);
export const jourSemaine = iso => enDate(iso).getUTCDay() || 7;
export const lundiDe = iso => plusJours(iso, 1 - jourSemaine(iso));
const dedans = (d, du, au) => typeof d === 'string' && d >= du && d <= au;

/* ---------- ce qui s'est passé entre deux jours (compris) ---------- */
const RE_ENVOI = /^Email envoyé/;
const RE_ECRIT = /^Statut → En cours/;       /* écrit depuis sa propre messagerie */
const RE_REPONSE = /Statut → Réponse/;
const vivantes = cs => (cs || []).filter(c => c && !c.demo);

/* Les mails partis : chaque « Email envoyé » compte (deux personnes le
   même jour, deux mails) ; un « Statut → En cours » compte pour un mail
   le jour où la piste n'en a pas d'autre — on a écrit d'ailleurs. */
export function mailsEntre(companies, du, au){
  let n = 0;
  for (const c of vivantes(companies)){
    const envois = new Map();
    const ecrits = new Set();
    for (const h of c.history || []){
      if (!h || !dedans(h.d, du, au)) continue;
      if (RE_ENVOI.test(h.t || '')) envois.set(h.d, (envois.get(h.d) || 0) + 1);
      else if (RE_ECRIT.test(h.t || '')) ecrits.add(h.d);
    }
    for (const k of envois.values()) n += k;
    for (const d of ecrits) if (!envois.has(d)) n++;
  }
  return n;
}
/* Les réponses : une piste passée par « Réponse » dans la période, ou
   close décrochée ou refusée dans la période — une piste compte une fois. */
export function reponsesEntre(companies, du, au){
  return vivantes(companies).filter(c =>
    (c.history || []).some(h => h && dedans(h.d, du, au) && RE_REPONSE.test(h.t || ''))
    || ((c.closedReason === 'won' || c.closedReason === 'rejected') && dedans(c.closedAt, du, au))).length;
}
/* Les pistes ajoutées dans la période (leur date de création, en jour local) */
export function pistesEntre(companies, du, au){
  return vivantes(companies).filter(c => Number(c.createdAt) > 0 && dedans(localISO(new Date(Number(c.createdAt))), du, au)).length;
}

/* ---------- ① l'objectif ---------- */
const borne = n => Math.min(OBJECTIF_MAX, Math.max(OBJECTIF_MIN, Math.round(Number(n) || 0)));
/* ce que l'app propose : la semaine d'avant plus un, à portée */
export function objectifPropose(companies, lundi){
  return borne(mailsEntre(companies, plusJours(lundi, -7), plusJours(lundi, -1)) + 1);
}
/* ce que le profil garde : la semaine et son nombre, ou rien */
export function normaliserSemaine(x){
  if (!x || typeof x !== 'object' || !ISO.test(String(x.lundi || '')) || jourSemaine(x.lundi) !== 1) return undefined;
  const o = Number(x.objectif);
  if (!Number.isFinite(o)) return undefined;
  return { lundi: x.lundi, objectif: borne(o) };
}
/* un tap sur − ou + : le nombre de CETTE semaine, borné */
export function reglerObjectif(semaine, lundi, objectif){
  return { lundi, objectif: borne(objectif) };
}

/* ---------- ② ③ la semaine, telle que l'écran la dit ---------- */
export function maSemaine(semaine, companies, today){
  const lundi = lundiDe(today);
  const fin = plusJours(lundi, 6);
  const s = normaliserSemaine(semaine);
  return {
    lundi,
    objectif: s && s.lundi === lundi ? s.objectif : objectifPropose(companies, lundi),
    mails: mailsEntre(companies, lundi, fin),
    /* la revue s'offre dès le vendredi et reste jusqu'au dimanche */
    revue: jourSemaine(today) >= 5,
    reponses: reponsesEntre(companies, lundi, fin),
    pistes: pistesEntre(companies, lundi, fin)
  };
}

/* La phrase de la revue : des NOMBRES et des mots fixes, rien d'autre.
   Aucun champ texte d'une piste, d'un contact ou du profil n'y entre —
   c'est ce qui permet de la donner à un groupe. Le zéro s'accorde au
   singulier, comme on le dit. */
const accorde = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const entier = n => Math.max(0, Math.floor(Number(n) || 0));
export function phraseRevue({ mails, reponses, pistes } = {}){
  return `Ma semaine : ${accorde(entier(mails), 'mail')}, ${accorde(entier(reponses), 'réponse')}, ${accorde(entier(pistes), 'piste')}.`;
}
export const RE_PHRASE_REVUE = /^Ma semaine : \d+ mails?, \d+ réponses?, \d+ pistes?\.$/;
