/* ============================================================
   OpenContact — moteur · un visage en pixels
   (décision du mainteneur, 13 octobre 2026 : « des visages en pixels,
   partout »)

   Une personne de l'app n'avait que son nom : dans une liste de
   conversations, on lit chaque ligne au lieu de reconnaître d'un coup
   d'œil. Toutes les messageries mettent un visage à gauche ; ici, pas de
   photo — rien à demander, rien à télécharger, rien qui sorte. Un motif
   de 5 × 5 cases, symétrique comme un visage, tiré de l'IDENTIFIANT de
   l'ami : le même sur tous les téléphones, Karim a la même tête chez toi
   et chez Léa. C'est l'idée des icônes générées de GitHub, dessinée à la
   grille de l'app (« Utilitaire 98 »).

   Ce n'est PAS une preuve d'identité : un œil ne distingue pas assez de
   motifs pour ça (Livsey et al., 2021). C'est un repère, rien de plus,
   et l'app ne le présente jamais autrement.
   ============================================================ */

/* FNV-1a 32 bits : court, sans dépendance, assez bien réparti pour
   cinq bits de couleur et quinze de motif */
function fnv(s){
  let h = 2166136261;
  for (const c of String(s)){ h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* six couleurs, celles des jetons de l'app (ui/visage.js les nomme) —
   jamais une couleur en dur */
export const TEINTES = 6;

/* le motif : 15 bits pour les trois colonnes de gauche, recopiées en
   miroir. Moins de six cases ou plus de dix-neuf, et le visage ne se lit
   plus (une croix maigre, un bloc plein) : on tire le suivant, toujours
   de la même graine — le même nom rend toujours le même visage. */
const compte = b => { let n = 0; for (let i = 0; i < 15; i++) if ((b >> i) & 1) n += i % 3 < 2 ? 2 : 1; return n; };
/* les cases d'un motif : le bit (y·3 + x) allume la case (x, y) des
   trois colonnes de gauche, et sa jumelle en miroir */
function casesDe(bits){
  const cases = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++){
    if (!((bits >> (y * 3 + x)) & 1)) continue;
    cases.push([x, y]);
    if (x < 2) cases.push([4 - x, y]);
  }
  return cases.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
/* le motif tiré d'une graine, et sa teinte — le visage qu'on a sans
   l'avoir dessiné */
export function motifDe(graine){
  const g = String(graine == null ? '' : graine);
  let bits = fnv(g + '·') & 0x7fff;
  for (let k = 1; k < 12 && (compte(bits) < 6 || compte(bits) > 19); k++) bits = fnv(g + '·' + k) & 0x7fff;
  return { m: bits, t: fnv(g) % TEINTES };
}
export function visage(graine){
  const { m, t } = motifDe(graine);
  return { teinte: t, cases: casesDe(m) };
}

/* MON VISAGE, DESSINÉ (le mainteneur, 28 octobre 2026 : « j'aimerais
   pouvoir dessiner mon propre dessin »). Le même objet que le visage
   tiré — quinze cases recopiées en miroir, une des six teintes —, donc
   le même dessin partout, et rien de plus lourd à porter : `{m, t}`, un
   motif de 15 bits et une teinte. Il part avec le profil donné à un ami
   (OCA1, `profilDonne`) et seulement là ; un dessin vide n'en est pas un
   (le visage tiré reprend sa place). Tout ce qui arrive d'ailleurs est
   remis à ces bornes, ou refusé. */
export const MOTIF_MAX = 0x7fff;
export function normaliserVisage(v){
  if (!v || typeof v !== 'object') return null;
  const m = Number(v.m), t = Number(v.t);
  if (!Number.isInteger(m) || m < 1 || m > MOTIF_MAX) return null;
  if (!Number.isInteger(t) || t < 0 || t >= TEINTES) return null;
  return { m, t };
}
export function visageDessine(v){
  const d = normaliserVisage(v);
  return d ? { teinte: d.t, cases: casesDe(d.m) } : null;
}
/* une case de la grille 5 × 5, touchée : elle bascule avec sa jumelle */
export function basculerCase(m, x, y){
  const col = x <= 2 ? x : 4 - x;
  if (!Number.isInteger(col) || col < 0 || !Number.isInteger(y) || y < 0 || y > 4) return m;
  return (m ^ (1 << (y * 3 + col))) & MOTIF_MAX;
}
export const caseAllumee = (m, x, y) => !!((m >> (y * 3 + (x <= 2 ? x : 4 - x))) & 1);

/* les initiales d'un groupe : deux lettres, celles des deux premiers
   mots qui en ont (« BTS SIO Lille » → BS, « Club » → CL) */
export function initiales(nom){
  const mots = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!mots.length) return '?';
  const s = mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2);
  return s.toUpperCase();
}
