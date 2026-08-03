/* ============================================================
   Sobriété des couches — le garde-fou qui tient dans le temps

   Une passe de nettoyage se défait toute seule : chaque nouvelle
   fonctionnalité ajoute « juste un toast », « juste une confirmation »,
   et six mois plus tard l'app en est couverte. C'est ce qui venait
   d'arriver — mesuré le 3 août 2026 : 20 toasts de plus de deux
   membres de phrase, et des confirmations posées sur des gestes qui ne
   coûtaient rien.

   Ce fichier ne juge pas le goût. Il tient trois comptes que
   `CLAUDE.md` §6-§7 fixent déjà en mots, et qui ne peuvent monter que
   si quelqu'un vient les monter ICI, exprès :

     ① un toast dit UNE chose — jamais deux phrases, un tiret cadratin
       au maximum, et jamais un point au milieu (§7) ;
     ② les confirmations sont comptées : `confirmSheet` bloque
       l'utilisateur, c'est une porte, et une porte se décide (§6) ;
     ③ les phrases d'explication posées dans les feuilles sont comptées
       aussi — c'est par là que la longueur revient.

   Un chiffre qui BAISSE ne fait pas échouer : il rappelle juste de
   descendre le plafond, pour que le terrain gagné reste gagné.
   ============================================================ */
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'ui');

/* Le recentrage (CLAUDE.md §0) masque des écrans entiers : on ne
   travaille pas — et on ne compte pas — une phrase que personne ne peut
   lire aujourd'hui. Ces fichiers reviendront au compte avec leur
   surface. */
const HORS_ECRAN = new Set(['campagnes.js', 'compagnon.js', 'connexions.js',
  'analyse.js', 'propositions.js', 'prospect.js', 'perimetre.js']);

/* ---- les plafonds, tenus à la main et à la baisse ---- */
const PLAFOND = {
  toastCar: 79,        /* le plus long : « Connexion interrompue — … » */
  confirmations: 8,    /* portes bloquantes dans les écrans visibles */
  motsExplication: 211 /* phrases d'explication dans les feuilles visibles */
};

const fichiers = readdirSync(UI).filter(f => f.endsWith('.js') && !HORS_ECRAN.has(f));
const lire = f => readFileSync(path.join(UI, f), 'utf8');
const ligneDe = (src, i) => src.slice(0, i).split('\n').length;

let ko = 0;
const fail = m => { console.error('ÉCHEC :', m); ko = 1; };

/* ---------- ① un toast dit UNE chose ---------- */
const toasts = [];
for (const f of fichiers){
  const src = lire(f);
  const re = /\btoast\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(src))){
    /* une interpolation vaut un mot : on mesure la phrase, pas la donnée */
    const txt = m[2].replace(/\\'/g, "'").replace(/\$\{[^}]*\}/g, '…');
    toasts.push({ f, ligne: ligneDe(src, m.index), txt });
  }
}
for (const t of toasts){
  const ou = `${t.f}:${t.ligne}  « ${t.txt} »`;
  if (t.txt.length > PLAFOND.toastCar)
    fail(`toast de ${t.txt.length} car. (plafond ${PLAFOND.toastCar}) — ${ou}`);
  if ((t.txt.match(/—/g) || []).length > 1)
    fail(`deux tirets cadratins dans un toast (§7 : un par phrase) — ${ou}`);
  /* un point suivi d'un mot = deux phrases. « 1. » d'une énumération et
     les décimales ne comptent pas : on exige une majuscule derrière. */
  if (/[.!?]\s+[A-ZÀ-Þ]/.test(t.txt))
    fail(`deux phrases dans un toast (§6 : « court, ponctuel, jamais deux phrases ») — ${ou}`);
}
const plusLong = toasts.reduce((a, t) => Math.max(a, t.txt.length), 0);
console.log(`① toasts : ${toasts.length} à l'écran · le plus long ${plusLong} car. (plafond ${PLAFOND.toastCar})`);

/* ---------- ② les portes bloquantes se comptent ---------- */
let confirmations = 0;
const ouSont = [];
for (const f of fichiers){
  const src = lire(f);
  const re = /\bconfirmSheet\(/g;
  let m;
  while ((m = re.exec(src))){
    if (f === 'dom.js') continue;             /* la définition, pas un appel */
    confirmations++;
    ouSont.push(`${f}:${ligneDe(src, m.index)}`);
  }
}
if (confirmations > PLAFOND.confirmations)
  fail(`${confirmations} confirmations bloquantes (plafond ${PLAFOND.confirmations}). ` +
       `Un geste réversible se fait au geste + showUndo, sans question (CLAUDE.md §6). ` +
       `Si la porte est justifiée, monte le plafond ICI en disant pourquoi. — ${ouSont.join(', ')}`);
console.log(`② confirmations bloquantes : ${confirmations} (plafond ${PLAFOND.confirmations})`);

/* ---------- ③ les explications posées dans les feuilles ---------- */
let mots = 0, phrases = 0;
for (const f of fichiers){
  const src = lire(f);
  const re = /class="(?:hint|lk-why)[^"]*"[^>]*>([\s\S]{0,400}?)<\/(?:p|div|span)>/g;
  let m;
  while ((m = re.exec(src))){
    const txt = m[1].replace(/\$\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '…')
      .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (txt.length < 12) continue;
    phrases++;
    mots += (txt.match(/\S+/g) || []).length;
  }
}
if (mots > PLAFOND.motsExplication)
  fail(`${mots} mots d'explication dans les feuilles (plafond ${PLAFOND.motsExplication}). ` +
       `Une explication ne se déguise pas en interface : si le mot est nécessaire, ` +
       `monte le plafond ICI — sinon coupe (CLAUDE.md §6-§7).`);
console.log(`③ explications dans les feuilles : ${phrases} phrases, ${mots} mots (plafond ${PLAFOND.motsExplication})`);

/* Le rappel qui fait descendre les plafonds : ce qui est gagné se garde. */
const marge = [
  ['toastCar', PLAFOND.toastCar - plusLong],
  ['confirmations', PLAFOND.confirmations - confirmations],
  ['motsExplication', PLAFOND.motsExplication - mots]
].filter(([, d]) => d > 0);
if (marge.length)
  console.log('↓ terrain gagné, à verrouiller dans PLAFOND : ' +
    marge.map(([k, d]) => `${k} −${d}`).join(' · '));

console.log(ko ? 'E2E sobriété : ÉCHEC' : 'E2E sobriété : OK');
process.exit(ko);
