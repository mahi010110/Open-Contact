/* ============================================================
   OpenContact — moteur · diagnostic
   Sans compte ni serveur, une bêta ne renvoie RIEN par défaut :
   le seul chemin de retour est un texte que l'étudiant copie et
   colle lui-même dans une issue (docs/roadmap.md §3). Ce module
   fabrique ce texte.

   Sa règle tient en une ligne : **il ne reçoit des données que
   pour les COMPTER**. Aucun nom d'entreprise, aucun contact,
   aucune adresse, aucune ligne de journal ne peut ressortir —
   `diagnosticData` n'émet que des nombres, des booléens et des
   étiquettes fixes, et `tests.js` le vérifie en lui passant des
   données pleines de noms.

   Fonctions pures, aucun accès au DOM.
   ============================================================ */
import { fmtSize } from './utils.js';

/* Le navigateur en deux mots, jamais la chaîne d'agent brute : elle
   est illisible, et c'est une empreinte. Le numéro majeur suffit à
   savoir sur quoi on reproduit. L'ordre compte — Edge et Opera se
   déclarent aussi « Chrome », Chrome sur iOS se déclare « Safari ». */
const NAVIGATEURS = [
  [/\bedg(?:e|a|ios)?\/(\d+)/i, 'Edge'],
  [/\bopr\/(\d+)/i, 'Opera'],
  [/\bsamsungbrowser\/(\d+)/i, 'Samsung Internet'],
  [/\b(?:firefox|fxios)\/(\d+)/i, 'Firefox'],
  [/\b(?:chrome|crios)\/(\d+)/i, 'Chrome'],
  [/\bversion\/(\d+)[\d.]*\s+(?:mobile\/\S+\s+)?safari/i, 'Safari']
];
export function browserFromUA(ua){
  const s = String(ua || '');
  for (const [re, nom] of NAVIGATEURS){
    const m = s.match(re);
    if (m) return { nom, version: m[1] };
  }
  return { nom: 'inconnu', version: '' };
}

/* Le système, au grain qui sert à reproduire : Android et iOS
   d'abord — un iPad récent se déclare « Macintosh », on ne cherche
   pas à le démasquer, il se lira « macOS » et c'est sans gravité. */
const SYSTEMES = [
  [/\bandroid\b/i, 'Android'],
  [/\b(?:iphone|ipad|ipod)\b/i, 'iOS'],
  [/\bwindows nt\b/i, 'Windows'],
  [/\bmac os x\b/i, 'macOS'],
  [/\bcros\b/i, 'ChromeOS'],
  [/\b(?:linux|x11)\b/i, 'Linux']
];
export function systemFromUA(ua){
  const s = String(ua || '');
  for (const [re, nom] of SYSTEMES) if (re.test(s)) return nom;
  return 'inconnu';
}

/* les rangs de stockage (engine/storage.js) dits en clair : « idb »
   ne veut rien dire pour qui lit l'issue, « mémoire » si */
const STOCKAGE = {
  claude: 'stockage hôte',
  idb: 'IndexedDB',
  local: 'localStorage',
  cache: 'Cache API',
  memory: 'mémoire (rien ne survit)'
};

const n = v => Number(v) || 0;
const compte = a => (Array.isArray(a) ? a.length : 0);

/* le poids réel de ce que l'app garde — c'est le chiffre qui
   explique une lenteur ou une écriture qui échoue */
function poids(x){
  let o = 0;
  for (const part of [x.companies, x.orphans, x.tombs, x.journal, x.profile]){
    if (part == null) continue;
    try { o += JSON.stringify(part).length; } catch (e) {}
  }
  return o;
}

/* Les faits, et rien d'autre. Tout ce qui entre ici sort en nombre. */
export function diagnosticData(x){
  x = x || {};
  const nav = browserFromUA(x.ua);
  const companies = Array.isArray(x.companies) ? x.companies : [];
  const documents = Array.isArray(x.documents) ? x.documents : [];
  const profile = x.profile || {};
  return {
    navigateur: nav.nom + (nav.version ? ' ' + nav.version : ''),
    systeme: systemFromUA(x.ua),
    /* la langue de l'interface du navigateur — deux lettres suffisent
       à savoir quel format de date ou quel clavier était en jeu */
    langue: String(x.langue || '').slice(0, 5),
    largeur: n(x.largeur),
    hauteur: n(x.hauteur),
    installee: !!x.installee,
    theme: x.theme === 'dark' ? 'sombre' : 'clair',
    enLigne: x.enLigne !== false,
    stockage: STOCKAGE[x.backend] || STOCKAGE.memory,
    octets: poids(x),
    pistes: companies.length,
    contacts: companies.reduce((t, c) => t + compte(c && c.contacts), 0),
    arattacher: compte(x.orphans),
    suppressions: compte(x.tombs),
    documents: documents.length,
    octetsDocs: documents.reduce((t, d) => t + n(d && d.size), 0),
    modeles: compte(profile.templates),
    journal: compte(x.journal),
    protection: !!x.protection,
    relie: !!x.relie
  };
}

/* Le texte à coller. Format STABLE — une ligne par groupe, toujours
   les mêmes, même quand la valeur est zéro : c'est ce qui permet de
   comparer deux rapports d'un coup d'œil.

   PAS de numéro de version : OpenContact en ligne, c'est une seule
   app à une seule adresse, pas un parc de versions à identifier.
   L'écrire ne servirait qu'à faire lire une ligne de plus. */
export function diagnosticText(d){
  d = d || {};
  const ecran = d.largeur + '×' + d.hauteur;
  /* `fmtSize` arrondit à 1 Ko minimum — juste à l'écran (un fichier
     existe), faux ici : « 1 Ko » de documents quand il n'y en a aucun
     enverrait chercher un poids qui n'est pas là */
  const taille = o => (o ? fmtSize(o) : '0 Ko');
  return [
    `Appareil : ${d.navigateur} · ${d.systeme} · ${ecran} · ${d.langue}`,
    `Affichage : ${d.installee ? 'installée' : 'onglet'} · thème ${d.theme} · ` +
      (d.enLigne ? 'en ligne' : 'hors ligne'),
    `Stockage : ${d.stockage} · ${taille(d.octets)} · ` +
      (d.protection ? 'protection activée' : 'sans protection') + ' · ' +
      (d.relie ? 'appareils reliés' : 'appareils non reliés'),
    `Suivi : ${d.pistes} piste(s) · ${d.contacts} contact(s) · ` +
      `${d.arattacher} à rattacher · ${d.suppressions} suppression(s)`,
    `Documents : ${d.documents} (${taille(d.octetsDocs)}) · ` +
      `${d.modeles} modèle(s) · journal ${d.journal} ligne(s)`
  ].join('\n');
}
