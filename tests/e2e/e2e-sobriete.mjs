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
/* `prospect.js` en est SORTI le 19 août 2026 : la feuille « Prospecter »
   s'ouvre depuis « Mes pistes » (`#piProspect`) sans aucun drapeau — elle
   est donc à l'écran, et elle échappait au compte depuis toujours. Un
   écran entier exempté est exactement le trou par lequel les couches
   reviennent : le garde était vert sans regarder. Seule l'option
   « En campagne » qu'elle contient est masquée, pas la feuille. */
const HORS_ECRAN = new Set(['campagnes.js', 'compagnon.js', 'connexions.js',
  'analyse.js', 'propositions.js', 'perimetre.js']);

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
     quatre.
     64 le 19 août 2026, et ce n'est PAS un toast de plus : c'est
     « Prospecter » qui entre enfin dans le compte. La feuille s'ouvre
     depuis « Mes pistes » sans drapeau, et elle en portait trois que
     personne ne comptait. Deux sont partis dans le même geste — ils
     grondaient (« Coche au moins une piste », « Choisis au moins un
     contact ») sur un bouton que `btn-off` rendait inerte à la souris
     mais pas au clavier : du reproche réservé à ceux qui tabulent. Le
     bouton est vraiment `disabled`, la raison est à l'écran. Reste
     « Série terminée — N pistes traitées », qui dit ce qu'aucun écran
     ne montre : la série est finie. */
  toasts: 64,
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
  motsExplication: 160,
  /* ZÉRO, et c'est le seul plafond qui puisse honnêtement valoir zéro :
     un style sans porteur n'a pas de contrepartie à peser — il ne rend
     service à personne, il ne fait qu'attendre d'être lu par erreur.
     Ce qui reste au kit exprès se nomme dans KIT_GARDE, pas ici.
     Terrain gagné le 25 août 2026 : 20 classes et 1 identifiant, 69
     lignes de style, dont les restes de deux passes récentes. */
  surfaceMorte: 0
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

/* ============================================================
   ④ LA SURFACE MORTE — ce que le style habille et que personne ne pose

   `CLAUDE.md` porte deux règles que rien ne vérifiait : « une mécanique
   qui ne s'enclenche jamais est du code mort » (§6) et « un lot se
   mesure AUSSI en surface ajoutée » (§8). Elles ont déjà coûté cher —
   la carte « À savoir » et son chevron supprimés, le carnet de
   camarades et ses 365 lignes — mais elles se découvraient à l'œil,
   des mois plus tard, une par une.

   Le premier relevé a trouvé 20 classes et 1 identifiant que plus
   personne ne posait : deux dessins abandonnés (les prompts, l'ancienne
   liste de contacts, cette dernière dupliquée mot pour mot sous
   `.ctc-body`) et surtout les restes de MES propres passes — le pli de
   « Donner » et celui de la barre de liste, dissous en descendant
   l'action dans le pied. C'est la leçon : un lot qui retire un
   contrôle laisse son style derrière lui, et personne ne le voit.

   Deux précautions apprises en construisant l'instrument :
   ① les COMMENTAIRES CSS citent des sélecteurs à foison — on les
     retire avant de lire (même piège que le contrôle de survol, §4) ;
   ② l'app pose ses classes conditionnelles avec un ESPACE EN TÊTE
     (`class="tranche ec-fil${vide ? '' : ' ec-vide'}"`). Sans en tenir
     compte, huit classes bien vivantes passaient pour mortes — et
     l'instrument aurait fait supprimer du code utile. Un contrôle qui
     se trompe dans ce sens-là est pire que pas de contrôle.
   ============================================================ */
const STYLES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'styles');
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* Les exceptions se NOMMENT, avec leur raison — comme partout ailleurs. */
const KIT_GARDE = [
  /* `.fset.fs-alert` : le bord ambre d'un cadre dont l'état peut tout
     coûter. Son dernier porteur est parti avec l'état qu'il soulignait,
     mais `CLAUDE.md` §6 le NOMME dans le catalogue des motifs. Le
     supprimer ferait pointer la référence sur du vide — exactement la
     faute qu'on corrige ailleurs. Il reste au kit, déclaré. */
  'fs-alert'
];

{
  let css = readFileSync(path.join(STYLES, 'app.css'), 'utf8');
  for (const f of readdirSync(path.join(STYLES, 'tokens')))
    css += '\n' + readFileSync(path.join(STYLES, 'tokens', f), 'utf8');
  const nu = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const classes = new Map(); const ids = new Map();
  for (const bloc of nu.split('}')) {
    const i = bloc.indexOf('{');
    if (i === -1) continue;
    const sel = bloc.slice(0, i);
    if (/^\s*@/.test(sel)) continue;
    for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g))
      classes.set(m[1], (classes.get(m[1]) || 0) + 1);
    for (const m of sel.matchAll(/#(-?[_a-zA-Z][\w-]*)/g))
      ids.set(m[1], (ids.get(m[1]) || 0) + 1);
  }

  /* tout ce que l'app, la coque et les scénarios peuvent poser */
  let code = '';
  for (const d of ['ui', 'engine']) {
    for (const f of readdirSync(path.join(RACINE, d)))
      if (f.endsWith('.js')) code += '\n' + readFileSync(path.join(RACINE, d, f), 'utf8');
  }
  for (const f of ['index.html', 'app.js', 'sw.js', 'tests.js'])
    { try { code += '\n' + readFileSync(path.join(RACINE, f), 'utf8'); } catch {} }
  for (const f of readdirSync(path.join(RACINE, 'tests', 'e2e')))
    if (f.endsWith('.mjs')) code += '\n' + readFileSync(path.join(RACINE, 'tests', 'e2e', f), 'utf8');

  const posees = new Set();
  for (const m of code.matchAll(/class\s*=\s*["'`]([^"'`]*)["'`]/g))
    for (const c of m[1].split(/[\s${}()?:+'"`]+/)) if (c) posees.add(c);
  for (const m of code.matchAll(/classList\.\w+\(([^)]*)\)/g))
    for (const c of m[1].matchAll(/['"`]([\w- ]+)['"`]/g))
      for (const x of c[1].split(/\s+/)) if (x) posees.add(x);
  for (const m of code.matchAll(/className\s*\+?=\s*["'`]([^"'`]*)["'`]/g))
    for (const c of m[1].split(/\s+/)) if (c) posees.add(c);
  for (const m of code.matchAll(/\.(?:querySelector|querySelectorAll|closest|matches)\(\s*["'`]([^"'`]+)["'`]/g))
    for (const c of m[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) posees.add(c[1]);
  /* l'espace en tête compte — voir ② plus haut */
  for (const m of code.matchAll(/['"`]\s*([a-z][\w-]*(?:\s+[a-z][\w-]*)*)\s*['"`]/g))
    for (const c of m[1].split(/\s+/)) if (/^[a-z][\w-]*$/.test(c)) posees.add(c);

  /* LA SONDE PASSE PAR LE MÊME CHEMIN QUE LA MESURE, sinon elle ne
     prouve rien : une première version se contentait de vérifier
     qu'une chaîne inventée n'était pas dans le collecteur — vrai
     presque toujours, donc muet. Un collecteur trop gourmand (qui
     « voit » tout ce que le style définit) la passait au vert alors
     qu'il rendait le compte nul pour toujours. Mesuré, mutation à
     l'appui. La sonde est donc une classe SEULEMENT stylée : elle doit
     ressortir du filtre, exactement comme une vraie classe morte. */
  /* le nom se COMPOSE : écrit d'un bloc, il apparaîtrait littéralement
     dans ce fichier — que le collecteur lit — et se verrait lui-même. */
  const sonde = 'zz' + '-sonde' + '-morte';
  classes.set(sonde, 1);

  const mortes = [...classes.keys()].filter(c => !posees.has(c) && !KIT_GARDE.includes(c));
  const idsMorts = [...ids.keys()].filter(i => !new RegExp(`\\b${i}\\b`).test(code));

  const sondeVue = mortes.includes(sonde);
  const i = mortes.indexOf(sonde);
  if (i !== -1) mortes.splice(i, 1);
  classes.delete(sonde);

  const total = mortes.length + idsMorts.length;
  if (!sondeVue)
    fail('surface morte : la sonde (une classe que rien ne pose) n’est pas ressortie — ' +
         'le collecteur ratisse trop large, et le compte vaudra zéro quoi qu’il arrive');
  else if (total > PLAFOND.surfaceMorte)
    fail(`surface morte : ${total} sélecteur(s) que personne ne pose ` +
         `(plafond ${PLAFOND.surfaceMorte}) — ` +
         [...mortes.map(c => '.' + c), ...idsMorts.map(i => '#' + i)].join(', ') +
         '. Retire le style avec le dessin qu\'il habillait, ou nomme-le dans ' +
         'KIT_GARDE en disant pourquoi il reste.');
  else console.log(`④ surface morte : ${total} sélecteur(s) sans porteur ` +
    `(plafond ${PLAFOND.surfaceMorte}) · ${classes.size} classes et ${ids.size} ids stylés`);
  globalThis.__surfaceMorte = total;
}

/* Le rappel qui fait descendre les plafonds : ce qui est gagné se garde. */
const marge = [
  ['toastCar', PLAFOND.toastCar - plusLong],
  ['confirmations', PLAFOND.confirmations - confirmations],
  ['motsExplication', PLAFOND.motsExplication - mots],
  ['surfaceMorte', PLAFOND.surfaceMorte - globalThis.__surfaceMorte]
].filter(([, d]) => d > 0);
if (marge.length)
  console.log('↓ terrain gagné, à verrouiller dans PLAFOND : ' +
    marge.map(([k, d]) => `${k} −${d}`).join(' · '));

console.log(ko ? 'E2E sobriété : ÉCHEC' : 'E2E sobriété : OK');
process.exit(ko);
