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
export function visage(graine){
  const g = String(graine == null ? '' : graine);
  const h = fnv(g);
  let bits = fnv(g + '·') & 0x7fff;
  for (let k = 1; k < 12 && (compte(bits) < 6 || compte(bits) > 19); k++) bits = fnv(g + '·' + k) & 0x7fff;
  const cases = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++){
    if (!((bits >> (y * 3 + x)) & 1)) continue;
    cases.push([x, y]);
    if (x < 2) cases.push([4 - x, y]);
  }
  cases.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return { teinte: h % TEINTES, cases };
}

/* les initiales d'un groupe : deux lettres, celles des deux premiers
   mots qui en ont (« BTS SIO Lille » → BS, « Club » → CL) */
export function initiales(nom){
  const mots = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!mots.length) return '?';
  const s = mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2);
  return s.toUpperCase();
}
