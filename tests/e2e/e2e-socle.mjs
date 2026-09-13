/* CONTRÔLE DE SOURCE : LA MISE EN PAGE TIENT AU SOCLE COMMUN.

   Ce fichier existe à cause d'un désastre daté. Le fil d'« Échanger »
   a été rendu ILLISIBLE sur l'iPhone du mainteneur — rangées rabotées à
   quelques pixels d'encre, trait pointillé à travers les lettres — par
   une mise en page bâtie sur `subgrid` + `container-type` + `@container`,
   trois fonctionnalités récentes empilées sur trois niveaux
   d'imbrication. La suite entière était verte.

   LA CAUSE DE LA CAUSE : cet environnement n'a que Chromium. WebKit —
   le moteur de l'utilisateur type de §1, un étudiant sur son téléphone —
   n'y est mesuré par RIEN, et ne peut pas l'être : le CDN de Playwright
   répond 403 à travers le proxy, `npx playwright install webkit`
   échoue. Le trou est structurel, pas une question d'effort. Une garde
   est donc la seule parade qui survive à l'oubli.

   LE CRITÈRE, ET IL N'EST PAS « RÉCENT = INTERDIT ».
   Ce qui distingue les deux familles, c'est ce que coûte l'ABSENCE :
   · `text-wrap:balance`, `color-mix()` — non supportés, la déclaration
     tombe et le texte est juste un peu moins bien réparti. Aucune
     structure ne bouge. Rien à garder.
   · `subgrid`, `container-type`, `@container` — la mise en page DÉPEND
     d'eux. Là où ils manquent ou se comportent autrement, ce n'est pas
     un rendu plus sobre, c'est un AUTRE dessin. Et `@supports` ne
     protège de rien dans ce cas précis : WebKit supporte `subgrid`, il
     prenait donc la branche — et la rendait mal.
   D'où la règle de §9 : ce qui ne peut pas être mesuré sur le moteur de
   l'utilisateur se tient au socle que tout moteur rend depuis des
   années.

   DEUX SONDES, DANS LES DEUX SENS (§7 : une exemption se sonde des deux
   côtés, sinon elle rend zéro et zéro se lit comme une réussite) :
   ① une déclaration plantée doit être PRISE ;
   ② un COMMENTAIRE qui cite le mot ne doit PAS l'être — ce fichier-ci
     en contient, et `app.css` en contient quatre qui expliquent
     justement pourquoi le mécanisme a été retiré. Un contrôle qui les
     compte rend « quatre fautes » sur du code sain, et un rapport
     pareil ne se corrige pas. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = new URL('../../styles/', import.meta.url).pathname;
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* Ce qui fait DÉPENDRE la mise en page d'un moteur qu'on ne mesure pas.
   Chaque entrée dit ce qu'on perd quand le moteur ne suit pas. */
const STRUCTURANTES = [
  { motif: /\bsubgrid\b/, nom: 'subgrid',
    perte: 'sans lui il reste un `display:grid` SANS pistes, soit une colonne unique' },
  { motif: /\bcontainer-type\s*:/, nom: 'container-type',
    perte: 'le seuil de mise en page disparaît, la rangée ne se replie plus' },
  { motif: /@container\b/, nom: '@container',
    perte: 'idem — et la règle qu’il garde s’applique alors partout, ou nulle part' },
  { motif: /\b\d[\d.]*cq[whibm]\b/, nom: 'unités cq*',
    perte: 'les tailles deviennent nulles, donc invisibles' }
];

/* AUCUNE DÉROGATION AUJOURD'HUI. Le jour où l'une se justifie, elle se
   nomme ici avec son fichier, sa fonctionnalité et la RAISON — et §9
   demande qu'elle ait d'abord été vue sur un vrai appareil. */
const DEROGATIONS = [];

/* Les commentaires partent, LES SAUTS DE LIGNE RESTENT : sans ça le
   contrôle désigne la mauvaise ligne, on cherche là où il n'y a rien,
   et on finit par ne plus le croire (§7, piège payé deux fois). */
const sansCommentaires = css =>
  css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));

const fichiers = [];
const balayer = d => {
  for (const e of readdirSync(d, { withFileTypes: true })){
    const p = join(d, e.name);
    if (e.isDirectory()) balayer(p);
    else if (e.name.endsWith('.css')) fichiers.push(p);
  }
};
balayer(RACINE);

const analyse = (chemin) => {
  const brut = readFileSync(chemin, 'utf8');
  const net = sansCommentaires(brut);
  const trouves = [];
  net.split('\n').forEach((ligne, i) => {
    for (const s of STRUCTURANTES)
      if (s.motif.test(ligne)) trouves.push({ nom: s.nom, perte: s.perte, ligne: i + 1,
        texte: ligne.trim().slice(0, 70) });
  });
  return trouves;
};

let total = 0, pris = [];
for (const f of fichiers){
  const court = f.slice(f.indexOf('/styles/') + 1);
  total++;
  for (const t of analyse(f)){
    if (DEROGATIONS.some(d => d.fichier === court && d.nom === t.nom)) continue;
    pris.push(`${court}:${t.ligne} — ${t.nom} : ${t.perte}\n        « ${t.texte} »`);
  }
}

/* ---------- LES DEUX SONDES ---------- */
const sonder = (css) => {
  const net = sansCommentaires(css);
  return STRUCTURANTES.some(s => net.split('\n').some(l => s.motif.test(l)));
};
const sondeDeclaration = sonder('.x{grid-template-columns:subgrid}');
const sondeCommentaire = sonder('/* on a essayé subgrid et @container, puis retiré */\n.x{display:flex}');

if (!sondeDeclaration)
  fail('socle : une déclaration `subgrid` plantée n’est PAS vue — le contrôle ne mesure rien');
if (sondeCommentaire)
  fail('socle : un COMMENTAIRE citant subgrid est compté comme une faute — '
    + 'le contrôle accuserait `app.css`, qui explique justement pourquoi le mécanisme a été retiré');
if (!total)
  fail('socle : aucune feuille de style lue — le balayage ne voit plus rien');

if (pris.length)
  fail(`socle : ${pris.length} mise(s) en page qui dépend(ent) d’un moteur que rien ne mesure ici —\n      `
    + pris.join('\n      ')
    + '\n      WebKit n’est pas installable dans cet environnement (CDN 403). §9 : ce qui ne peut pas'
    + '\n      être mesuré sur le moteur de l’utilisateur se tient au socle commun, ou se déroge ICI'
    + '\n      avec sa raison, après avoir été vu sur un vrai appareil.');
else if (!process.exitCode)
  console.log(`socle : ${total} feuille(s) de style, aucune mise en page suspendue à `
    + `${STRUCTURANTES.length} fonctionnalités non mesurables ici ✓ `
    + '(commentaires ignorés, sondes dans les deux sens)');

console.log(process.exitCode ? 'E2E socle : ÉCHEC' : 'E2E socle : OK');
