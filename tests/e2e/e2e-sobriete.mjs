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
  /* COMBIEN de toasts, et pas seulement leur longueur. Le compte
     manquait, et c'est exactement le trou par lequel ils sont arrivés :
     130 appels, 84 sur les écrans visibles, sans qu'aucun garde ne
     bronche — le mainteneur l'a vu à l'usage (« y'en a trop, et parfois
     pour rien ») avant l'outillage.
     63 le 16 août 2026, après une passe à critère unique : **un toast
     ne se justifie que si son message n'est PAS déjà à l'écran.** Vingt
     et un sont partis — « Fiche enregistrée ✓ » pendant qu'on regarde
     la fiche enregistrée, « Piste restaurée » pendant que la ligne
     revient sous les yeux, et cinq « … annulée » qui confirmaient qu'il
     ne s'était rien passé. Restent les trois familles qui disent ce
     qu'on ne peut PAS voir : une erreur ou un refus, un résultat hors
     de l'écran (presse-papier, fichier, autre appareil), et un geste
     dont la feuille reste ouverte sans que rien d'autre ne bouge.
     Sources : Material 3 (« ne pas utiliser un snackbar pour une
     information déjà affichée »), NN/g (un message transitoire est
     fugace et interrompt — le réserver à ce qui n'est pas perceptible
     autrement). Et depuis août 2026 il y a un coût mesurable de plus :
     chaque toast passe par `role="status"`, donc il est LU à voix
     haute — soixante-trois interruptions valent mieux que quatre-vingt-
     quatre. */
  toasts: 63,
  toastCar: 79,        /* le plus long : « Connexion interrompue — … » */
  confirmations: 8,    /* portes bloquantes dans les écrans visibles */
  /* phrases d'explication dans les feuilles visibles.
     Monté à 219 le 4 août 2026 pour une phrase de « Signaler un
     problème », REDESCENDU à 211 le jour même : le mainteneur l'a
     retirée — le bloc de diagnostic est affiché en entier, il prouve
     déjà ce que la phrase promettait. Le terrain gagné se reverrouille
     ici, sinon il se reperd.
     199 le 5 août : « Mes appareils » décrivait le chemin vers l'écran
     où l'on se trouve déjà (« Moi → Mes appareils → Entrer une
     phrase »). La consigne dit maintenant quoi faire du QR affiché
     juste au-dessus — plus court, et enfin utile.
     193 le même jour : les deux consignes restantes disaient ce que
     l'écran MONTRE — un QR se scanne sans qu'on le dise, des points
     sous un œil barré se comprennent seuls — et « Six chiffres »
     légendait un pavé qui affiche six cases vides. Ce qui se voit ne
     se lit pas.
     180 le 5 août, après un passage sur TOUTE l'app : la fiche redisait
     son bouton « + Ajouter » à quarante pixels de lui, et le champ de
     la phrase de secours portait TROIS textes — libellé, invite, puis
     un rappel. Cette dernière ligne n'existe plus que pour dire
     l'erreur, comme celle de « Vérifions » juste au-dessus.
     116 le 5 août, avec un critère plus dur : une phrase reste seulement
     si l'enlever peut coûter quelque chose d'irréversible. Sept sont
     parties d'un coup — elles décrivaient le bouton d'à côté (« Elle
     reste dans Mes pistes », le champ étant suivi d'un « Rouvrir »),
     répétaient un libellé (« Rapporte ici sa réponse » au-dessus de
     « La réponse de l'IA »), ou légendaient une règle de saisie que le
     champ applique déjà. Ne restent que les phrases qui préviennent
     d'une perte : la phrase de secours sur papier, le plafond
     d'appareils, « Perdu = irrécupérable ».
     126 le 8 août, MONTÉ de dix mots, exprès et une seule fois, pour
     « Demande-lui en vrai : bien plus efficace qu'un message »
     (« Demander à … »). Le critère de la ligne au-dessus était « ce qui
     prévient d'une perte » ; celle-ci n'en prévient pas, elle corrige
     une croyance fausse et mesurée : la même demande faite de vive voix
     aboutit 34 fois plus souvent que par e-mail (Roghanizad & Bohns,
     2017), et celui qui écrit ne sent AUCUNE différence — c'est le seul
     cas où le silence de l'app laisserait l'utilisateur choisir le
     mauvais canal en croyant bien faire. Le critère s'élargit donc
     d'un cran, et d'un seul : préviennent d'une perte, OU d'une erreur
     que l'utilisateur ne peut pas voir venir.
     155 le 16 août 2026, et **ce n'est pas du texte en plus — c'est le
     compteur qui voit enfin.** Il remplaçait toute interpolation par un
     caractère : une phrase écrite dans un ternaire comptait pour UN mot,
     quelle que soit sa longueur. Sept phrases vivaient ainsi hors du
     compte, dont celle que le mainteneur a repérée à l'œil sur « Mes
     appareils » — « Une phrase de liaison, et tes appareils restent à
     jour » — qui décrivait les deux boutons posés juste dessous. Elle
     est partie ; le nombre monte quand même, parce qu'il inclut
     désormais ce qui était déjà là. L'app en dit MOINS qu'hier, pas
     plus. Le critère, lui, ne bouge pas : ne restent que les phrases
     qui préviennent d'une perte ou d'une erreur qu'on ne peut pas voir
     venir — la phrase de secours sur papier, le plafond d'appareils,
     « Perdu = irrécupérable », « Nouvelle phrase = nouveau lien ».

     160 le 18 août 2026 : +5 pour « Aucune piste ne correspond. », le
     vide de la recherche qui arrive dans les trois feuilles à cocher.
     Ce n'est pas une explication, c'est un ÉTAT — et §6 l'exige :
     l'état vide d'un écran enseigne, il ne se tait pas. Sans lui la
     liste disparaît sous les doigts et se lit comme une panne.
     Deux raisons de n'en payer que cinq. La phrase ne redit PAS ce
     qu'on a cherché : le mot tapé est dans le champ juste au-dessus,
     et c'est la règle des toasts (ne rien dire qui soit déjà à
     l'écran) appliquée à un vide ; il est en revanche dit à voix haute
     par `direCombien`, là où il n'y a pas de champ à regarder. Et elle
     est ÉCRITE UNE FOIS, dans `barreListeHTML` : trois feuilles la
     partagent. Avant la barre commune, la même arrivée aurait coûté
     trois phrases. */
  motsExplication: 160
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
if (toasts.length > PLAFOND.toasts)
  fail(`${toasts.length} toasts sur les écrans visibles (plafond ${PLAFOND.toasts}). `
     + `Un toast ne se justifie que si son message n'est PAS déjà à l'écran : une erreur, `
     + `un résultat hors de l'écran, ou un geste dont rien d'autre ne bouge. `
     + `Si celui-là en est un, monte le plafond ICI en disant pourquoi.`);
const plusLong = toasts.reduce((a, t) => Math.max(a, t.txt.length), 0);
console.log(`① toasts : ${toasts.length} à l'écran (plafond ${PLAFOND.toasts})`
  + ` · le plus long ${plusLong} car. (plafond ${PLAFOND.toastCar})`);

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

/* ---------- ③ les explications posées dans les feuilles ----------
   VOIR À TRAVERS UNE INTERPOLATION. Le compteur remplaçait tout `${…}`
   par un seul caractère : une phrase entière écrite dans un ternaire
   comptait donc pour UN mot, quelle que soit sa longueur. C'est ainsi
   qu'une phrase d'accueil de onze mots a vécu invisible au compte
   jusqu'à ce que le mainteneur la voie à l'écran et demande qu'elle
   parte. On extrait maintenant les littéraux de l'interpolation, et on
   garde le PLUS LONG : une seule branche d'un ternaire s'affiche à la
   fois, donc c'est le pire cas qui fait foi.
   Limite connue, non corrigée : les blocs gardés par un drapeau de
   périmètre (Compagnon dans `recevoir.js`) sont comptés bien qu'ils
   soient masqués — le fichier n'est pas dans `HORS_ECRAN`, seulement
   ses blocs le sont. */
const auTravers = t => t.replace(/\$\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, bloc => {
  const lits = [...bloc.matchAll(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g)]
    .map(x => x[1] || x[2] || '').filter(s => s.length > 11);
  return lits.length ? lits.sort((a, b) => b.length - a.length)[0] : '…';
});
let mots = 0, phrases = 0;
for (const f of fichiers){
  const src = lire(f);
  const re = /class="(?:hint|lk-why)[^"]*"[^>]*>([\s\S]{0,400}?)<\/(?:p|div|span)>/g;
  let m;
  while ((m = re.exec(src))){
    const txt = auTravers(m[1])
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
