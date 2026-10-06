/* ============================================================
   OpenContact — moteur · le marché autour de toi, et ce qui t'aide

   Deux données publiques, relevées une fois et rangées ici — une table,
   pas un service : hors ligne, à chaque frappe (invariant ④).

   ① LES EMBAUCHES PRÉVUES (décision du mainteneur, 6/10 : « une ligne »).
      L'enquête « Besoins en main-d'œuvre » 2026 de France Travail
      (data.gouv.fr, licence ouverte) : par département, le nombre
      d'embauches que les employeurs prévoient, et la part qu'ils disent
      difficile à pourvoir. Relevée par `tests/e2e/sonde-bmo.py`, pour les
      deux métiers qu'un BTS ou un BUT vise :
        M1X80  techniciens d'étude et de développement en informatique
        M1X81  techniciens de production, d'exploitation, d'installation,
               de maintenance et de support en informatique
      Les petits bassins sont au secret statistique (709 lignes sur la
      France) : un département qui compte moins de 30 embauches cède la
      place à sa RÉGION, plutôt que d'afficher un chiffre faux par défaut.

   ② L'AIDE À L'EMBAUCHE D'UN APPRENTI (décret n° 2026-168 du 6 mars
      2026). Pour un contrat conclu depuis le 8 mars 2026 et qui commence
      avant le 1er janvier 2027, la première année, au plus :
                         moins de 250 salariés   250 et plus (sous conditions)
        niveaux 3-4      5 000 €                 —
        niveau 5 (BTS)   4 500 €                 1 500 €
        niveaux 6-7      2 000 €                 750 €
      C'est un argument que l'étudiant peut écrire dans sa candidature :
      l'entreprise ne le sait pas toujours.
   ============================================================ */
import { REGIONS, DEPARTEMENTS } from './lieux.js';

/* « dept:dev,difficiles,support,difficiles » */
const BRUT = [
  '01:27,7,35,21|02:0,0,0,0|03:0,0,35,0|04:0,0,13,0|05:0,0,0,0|06:255,151,127,87|07:0,0,0,0',
  '08:0,0,0,0|09:0,0,0,0|10:0,0,0,0|11:12,0,8,0|12:27,15,0,0|13:400,143,446,220|14:70,28,44,11',
  '15:0,0,0,0|16:0,0,36,21|17:28,0,44,28|18:5,0,0,0|19:0,0,14,14|21:144,110,32,25|22:13,6,25,20',
  '23:0,0,6,0|24:8,0,0,0|25:43,15,23,0|26:44,0,10,0|27:9,0,6,6|28:33,33,14,7|29:57,7,25,19',
  '2A:7,0,13,8|2B:0,0,0,0|30:77,13,78,22|31:570,228,264,97|32:0,0,25,0|33:172,99,190,112',
  '34:174,12,98,12|35:193,157,213,134|36:0,0,15,10|37:113,27,50,8|38:57,18,76,15|39:7,0,11,0',
  '40:45,5,8,0|41:6,0,0,0|42:55,11,43,29|43:0,0,0,0|44:373,204,233,154|45:129,23,94,27',
  '46:44,8,14,14|47:0,0,0,0|48:0,0,0,0|49:78,41,64,24|50:6,6,10,0|51:41,27,29,0|52:0,0,5,0',
  '53:0,0,45,41|54:57,0,42,31|55:0,0,0,0|56:30,14,0,0|57:14,0,40,30|58:0,0,0,0|59:386,231,380,252',
  '60:35,10,88,65|61:6,0,6,6|62:31,31,33,15|63:109,80,37,0|64:52,9,21,13|65:0,0,0,0|66:5,0,9,9',
  '67:326,237,107,51|68:24,14,6,6|69:551,339,625,390|70:0,0,5,5|71:30,7,0,0|72:36,8,59,11',
  '73:21,14,53,27|74:59,22,58,23|75:1686,686,1101,492|76:65,57,144,63|77:70,9,115,52',
  '78:130,51,200,103|79:28,16,56,25|80:20,0,34,24|81:21,7,24,12|82:0,0,0,0|83:81,54,49,22',
  '84:41,17,36,8|85:7,0,36,6|86:35,21,31,0|87:37,13,8,0|88:0,0,6,0|89:9,0,0,0|90:0,0,10,10',
  '91:73,35,238,165|92:1008,447,820,238|93:284,90,288,192|94:259,37,128,60|95:319,38,87,10',
  '971:17,14,0,0|972:5,0,19,0|973:20,15,11,5|974:22,0,93,19|976:0,0,43,22'
];
export const BMO = new Map(BRUT.join('|').split('|').map(x => {
  const [d, v] = x.split(':');
  return [d, v.split(',').map(Number)];
}));
export const BMO_ANNEE = 2026;
export const BMO_SEUIL = 30;
/* le métier de la barre → les colonnes de la table */
const COLONNES = { dev: [0], data: [0], reseau: [1], support: [1], cloud: [1], cyber: [1] };
export const MOTS_MARCHE = { dev: 'développement', data: 'développement', reseau: 'réseau et support',
  support: 'réseau et support', cloud: 'réseau et support', cyber: 'réseau et support' };
function somme(depts, cols){
  let n = 0, dur = 0;
  for (const d of depts){
    const v = BMO.get(d);
    if (!v) continue;
    for (const c of cols){ n += v[c * 2]; dur += v[c * 2 + 1]; }
  }
  return { n, dur };
}
/* Rend { lieu, n, part, quoi } ou null. `dept` : le département de la
   recherche ; `metier` : la clé de la barre (vide = l'informatique). */
export function marche(dept, metier){
  if (!dept || !BMO.has(dept)) return null;
  const cols = COLONNES[metier] || [0, 1];
  const quoi = MOTS_MARCHE[metier] || 'informatique';
  let lieu = DEPARTEMENTS[dept] || dept, s = somme([dept], cols);
  if (s.n < BMO_SEUIL){
    const reg = Object.values(REGIONS).find(r => r.depts.includes(dept));
    if (!reg) return null;
    s = somme(reg.depts, cols);
    lieu = reg.nom;
    if (s.n < BMO_SEUIL) return null;
  }
  return { lieu, n: s.n, part: Math.round(100 * s.dur / s.n), quoi };
}

/* ---------- ② l'aide à l'embauche d'un apprenti ---------- */
/* le niveau du diplôme préparé, lu dans la formation du profil — rien
   si elle ne le dit pas (mieux vaut ne rien afficher qu'un montant faux) */
const NIVEAUX = [
  [7, /\b(master|mast[eè]re|msc|ing[ée]nieur|bac ?\+ ?5|mba)\b/],
  [6, /\b(but|licence|bachelor|bac ?\+ ?3|cda|ais|cpi|asrbd|concepteur|administrateur d.infrastructures)\b/],
  [5, /\b(bts|dut|bac ?\+ ?2|tssr|tsri|dwwm|technicien sup[ée]rieur|d[ée]veloppeur web)\b/],
  [4, /\b(bac pro|bp|brevet professionnel|bac)\b/],
  [3, /\b(cap|bep)\b/]
];
export function niveauDiplome(formation){
  const f = String(formation || '').toLowerCase().normalize('NFC');
  if (!f.trim()) return 0;
  for (const [n, re] of NIVEAUX) if (re.test(f)) return n;
  return 0;
}
export const AIDE_FIN = '2027-01-01';
const AIDE = { 3: [5000, 0], 4: [5000, 0], 5: [4500, 1500], 6: [2000, 750], 7: [2000, 750] };
const GROSSE = new Set(['32', '41', '42', '51', '52', '53']);
const PETITE = new Set(['00', '01', '02', '03', '11', '12', '21', '22', '31']);
/* `r` : l'entreprise (lireAnnuaire) ; `profile` ; `today` (AAAA-MM-JJ).
   Rend { montant, grande } ou null : pas une alternance, un début de
   contrat après la fin du dispositif, un niveau ou une taille qu'on ne
   connaît pas. */
export function aideEmbauche(r, profile, today){
  if (!profile || profile.recherche !== 'alternance') return null;
  const debut = profile.debut || today || '';
  if (!debut || debut >= AIDE_FIN) return null;
  const niv = niveauDiplome(profile.formation);
  if (!AIDE[niv]) return null;
  const t = String((r && r.tranche) || '');
  const grande = GROSSE.has(t) || (r && (r.categorie === 'GE' || r.categorie === 'ETI')) ? true
    : PETITE.has(t) || (r && r.categorie === 'PME') ? false : null;
  if (grande === null) return null;
  const montant = AIDE[niv][grande ? 1 : 0];
  return montant ? { montant, grande } : null;
}
export const euros = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + '\u00a0€';
