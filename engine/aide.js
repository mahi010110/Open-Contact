/* ============================================================
   OpenContact — moteur · ceux qui aident (lot R7)
   (docs/propositions/R7-ceux-qui-aident.md, validée le 20 octobre 2026)

   La personne la mieux placée pour aider est celle qui vient de
   décrocher : elle est DEDANS. Trois choses ici, et rien d'autre :

   ① ce qu'on peut offrir à ses amis — trois mots FIXES, jamais un texte
     libre : c'est ce qui part dans le profil donné (OCA1 `aide`), et une
     table ne fuit rien qu'on n'y a pas mis ;
   ② le message qui demande cette aide, prêt à partir — les règles de
     l'entretien de réseau de l'APEC : qui je suis, ce que je cherche,
     combien de temps, et jamais un emploi demandé ;
   ③ le merci qui revient quand une piste portée répond — un merci fait
     plus que doubler la probabilité d'aider une deuxième fois (Grant et
     Gino, 2010 : 66 % contre 32 %).

   Et à « Décroché », la piste propose d'aider à son tour : d'abord en
   entrant dans « Mon parcours » (`parcoursADecrocher`, engine/amis.js :
   c'est ce qui fait lire « Karim y est en alternance » chez ses amis),
   puis en cochant ce qu'on offre.

   Les messages sont PROPOSÉS : ils partent du geste de qui écrit, dans
   la conversation avec son ami. Fonctions pures, aucun accès au DOM ni
   au réseau.
   ============================================================ */

/* ---------- ① ce qu'on peut offrir ----------
   `mot` : la case dans Moi (le verbe et son objet) ; `ami` : ce qu'on lit
   chez l'ami, sur sa ligne (« Karim peut relire un CV ») ; `demande` : la
   rangée de « Demander à Karim ». L'ordre est celui du geste le plus
   léger au plus engageant. */
export const AIDES = Object.freeze({
  parler:    Object.freeze({ mot: 'Parler de mon entreprise', ami: 'peut parler de son entreprise' }),
  relire:    Object.freeze({ mot: 'Relire un CV',             ami: 'peut relire un CV' }),
  presenter: Object.freeze({ mot: 'Présenter quelqu’un',      ami: 'peut présenter quelqu’un' })
});
export const ORDRE_AIDES = Object.freeze(['parler', 'relire', 'presenter']);

/* remis aux invariants : des clés de la table, sans doublon, dans
   l'ordre de la table — ce qui n'en est pas tombe, jamais deviné */
export function normaliserAide(x){
  if (!Array.isArray(x)) return [];
  const vus = new Set(x.filter(k => typeof k === 'string'));
  return ORDRE_AIDES.filter(k => vus.has(k));
}
/* un tap sur une case : elle s'ajoute, ou elle part */
export function basculerAide(aide, cle){
  const a = normaliserAide(aide);
  if (!AIDES[cle]) return a;
  return a.includes(cle) ? a.filter(k => k !== cle) : normaliserAide([...a, cle]);
}
/* ce que la ligne d'un ami en dit : la première offre, en mots */
export const direAide = aide => {
  const a = normaliserAide(aide);
  return a.length ? AIDES[a[0]].ami : '';
};

/* ---------- ② demander ----------
   `sorte` : `qui` (à qui écrire — la demande d'avant R7, toujours là),
   ou une clé de AIDES. `tu` est ce que dit l'expérience de l'ami à la
   deuxième personne (« y es en alternance », « y as fait ton stage » —
   VECU ou direExperience). `cherche` : le mot du profil. */
const CHERCHE = { stage: 'un stage', alternance: 'une alternance', emploi: 'un emploi' };
const propre = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
export function demandesPossibles(aide){
  return ['qui', ...normaliserAide(aide)];
}
/* « de Thales », « d’Aztek » : l'élision devant une voyelle — pas devant
   un h, qui peut être aspiré (« de Huawei ») */
export const deNom = n => /^[aeiouyàâäéèêëîïôöûüœ]/i.test(n) ? `d’${n}` : `de ${n}`;
export function libelleDemande(sorte, entreprise){
  const n = propre(entreprise);
  return sorte === 'parler' ? `20 minutes pour parler ${deNom(n)}`
    : sorte === 'relire' ? 'Relire mon CV'
    : sorte === 'presenter' ? 'Me présenter à quelqu’un'
    : `À qui écrire chez ${n}`;
}
export function messageDemande(sorte, { prenom, tu, entreprise, cherche } = {}){
  /* « tu y es en alternance chez Aztek » dit deux fois le lieu : le « y »
     des tables (VECU, direExperience) tombe devant « chez » */
  const p = propre(prenom), n = propre(entreprise), t = propre(tu).replace(/^y /, '');
  const salut = `Salut ${p}, tu ${t} chez ${n} ?`;
  const quoi = CHERCHE[cherche];
  if (sorte === 'parler')
    return `${salut} ${quoi ? `Je cherche ${quoi} et j’aimerais` : 'J’aimerais'} comprendre comment ça se passe là-bas. `
         + `Tu aurais 20 minutes cette semaine ou la suivante pour m’en parler ?`;
  if (sorte === 'relire')
    return `Salut ${p}, tu pourrais relire mon CV ? Je postule chez ${n}, et ton avis m’aiderait.`;
  if (sorte === 'presenter')
    return `${salut} Je postule là-bas : tu pourrais me présenter à quelqu’un de ton équipe ?`;
  return `${salut} Je postule là-bas — tu peux me dire à qui écrire ?`;
}

/* ---------- ③ le merci ----------
   Une piste « portée » par un ami : un contact qu'il m'a donné (`via`
   porte son prénom), ou lui-même, qui y est passé (`porteurs`). Le merci
   se propose quand elle a RÉPONDU — passée à « Réponse », ou close
   décrochée — et tant qu'on ne l'a pas dit : pas de message à cet ami
   depuis ce jour-là, et quatorze jours au plus. Rien n'est stocké : tout
   se déduit de l'historique de la piste et de la conversation. */
export const MERCI_JOURS = 14;
const RE_REPONSE = /Statut → Réponse/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/* le jour où la piste a répondu (AAAA-MM-JJ), ou '' */
export function jourReponse(c){
  if (!c) return '';
  if (c.closedReason === 'won' && ISO.test(String(c.closedAt || ''))) return c.closedAt;
  if (c.status !== 'reply' && c.closedReason !== 'won') return '';
  const h = (c.history || []).filter(x => x && ISO.test(String(x.d || '')) && RE_REPONSE.test(x.t || ''));
  return h.length ? h.map(x => x.d).sort().pop() : '';
}
/* `amis` : ceux de qui on pourrait dire merci, `{id, prenom}` ; `dernierA`
   (id) → l'instant (ms) de mon dernier message à cet ami ; `today` en
   AAAA-MM-JJ. Rend `{amiId, prenom, jour, decroche}` ou null. */
export function merciAProposer(c, amis, dernierA, today){
  const jour = jourReponse(c);
  if (!jour || !today || c.demo) return null;
  const age = Math.round((Date.parse(today) - Date.parse(jour)) / 864e5);
  if (!(age >= 0 && age <= MERCI_JOURS)) return null;
  const depuis = Date.parse(jour + 'T00:00:00');
  for (const a of amis || []){
    if (!a || !a.id) continue;
    const t = Number(dernierA && dernierA(a.id)) || 0;
    if (t >= depuis) continue;                   /* déjà écrit depuis : c'est dit */
    return { amiId: a.id, prenom: propre(a.prenom), jour, decroche: c.closedReason === 'won' };
  }
  return null;
}
export function messageMerci({ entreprise, decroche } = {}){
  const n = propre(entreprise);
  return decroche ? `J’ai décroché chez ${n}, merci pour ton aide !`
                  : `${n} m’a répondu, merci pour ton aide !`;
}
