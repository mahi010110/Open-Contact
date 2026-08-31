/* Lance la suite complète : auto-tests unitaires (?test) puis chaque
   scénario de bout en bout, en série. Sortie non nulle si un seul
   rougit. Usage : node tests/e2e/tous.mjs */
import { spawn, spawnSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const scripts = ['unitaires.mjs',
  ...readdirSync(DIR).filter(f => f.startsWith('e2e-') && f.endsWith('.mjs')).sort()];
/* `docs/developpement.md` promet que le détail de CHAQUE scénario est dans
   README.md. La promesse s'était défaite toute seule : 15 lignes pour 29
   fichiers, et les gardes les plus récentes manquaient — celles qu'on
   relit justement pour savoir ce qui est déjà couvert. Un document qui
   décrit la moitié du code est pire qu'un document absent : on le croit.
   Le contrôle est ici, dans le lanceur, et il ARRÊTE — la mise à jour du
   README fait partie du geste qui ajoute un scénario, pas d'un rangement
   ultérieur qui n'arrive jamais. */
const readme = readFileSync(path.join(DIR, 'README.md'), 'utf8');
const nonDecrits = scripts.filter(s => !readme.includes('`' + s + '`'));
if (nonDecrits.length){
  console.error(`\nScénario(s) absent(s) de tests/e2e/README.md : ${nonDecrits.join(', ')}`);
  console.error('Ajoute sa ligne — ce que le scénario PROUVE, pas ce qu\'il fait — puis relance.');
  process.exit(1);
}

const natifs = new Set(['e2e-c8-telephone.mjs', 'e2e-ordinateur-envoi.mjs',
  'e2e-ordinateur-ia.mjs', 'e2e-ordinateur-reponses.mjs', 'e2e-ordinateur-scan.mjs',
  'e2e-mcp.mjs']);

/* Le recentrage (CLAUDE.md §0) masque des capacités à l'écran sans rien
   supprimer : leur code et leurs scénarios restent valides, mais le parcours
   n'existe plus dans l'interface. On les saute EXPLICITEMENT, et on lit le
   verdict dans `ui/perimetre.js` — repasser un drapeau à `true` remet donc
   ses scénarios dans la suite, sans toucher à ce fichier. */
const perim = await import(path.resolve(DIR, '..', '..', 'ui', 'perimetre.js'));
const exigences = new Map([
  ['e2e-campagne.mjs', 'CAMPAGNES'],
  ['e2e-envoi.mjs', 'ENVOI_DIRECT'],
  ['e2e-ia.mjs', 'IA'],
  ['e2e-analyse.mjs', 'ORDINATEUR'],
  ['e2e-ordinateur.mjs', 'ORDINATEUR'],
  ...[...natifs].map(f => [f, 'ORDINATEUR'])
]);
const horsPerimetre = s => {
  const flag = exigences.get(s);
  return (flag && !perim[flag]) ? flag : '';
};
const compDir = path.resolve(DIR, '..', '..', 'ordinateur');
const bin = path.join(compDir, 'target', 'debug', 'oc-natif');

/* Les scénarios natifs lancent target/debug/oc-natif. `cargo test` ne
   régénère PAS cet exécutable — on testerait sinon un binaire périmé (piège
   avéré : un correctif ou un nouveau handler absent du binaire fait échouer
   ou passer à tort). On le reconstruit donc ICI, avant les scénarios, dès que
   Cargo est là. Sans Cargo mais avec un binaire déjà présent, on l'utilise
   tel quel ; sans xvfb, on saute proprement. */
const hasXvfb = !spawnSync('xvfb-run', ['--help'], { stdio: 'ignore' }).error;
const hasCargo = !spawnSync('cargo', ['--version'], { stdio: 'ignore' }).error;
let nativeReason = '';
if (!hasXvfb){
  nativeReason = 'xvfb-run absent';
} else if (hasCargo){
  console.log('⚙  cargo build -p oc-natif (binaire natif à jour avant les scénarios)…');
  const b = spawnSync('cargo', ['build', '-p', 'oc-natif'], { cwd: compDir, stdio: 'inherit' });
  if (b.status !== 0) nativeReason = 'échec de la construction du binaire Ordinateur';
} else if (!existsSync(bin)){
  nativeReason = 'binaire Ordinateur absent (ni Cargo pour le construire)';
} else {
  console.log('⚠  Cargo absent : scénarios natifs joués contre le binaire EXISTANT (peut être ancien).');
}

/* Un scénario qui meurt en route peut laisser SON Ordinateur vivant sur le
   canal local (17095) : le suivant hérite alors d'un pair inconnu et tout
   rougit en cascade — un seul flake devient six échecs illisibles. On
   moissonne donc les survivants de CE dépôt (chemin exact du binaire)
   avant la suite et après chaque scénario. */
let pkillDit = false;
function balayer(){
  const r = spawnSync('pkill', ['-9', '-f', bin], { stdio: 'ignore' });
  /* pkill absent = le moissonnage ne fait RIEN, et il le faisait en
     silence : un survivant tenait alors le canal pour tous les
     scénarios suivants sans qu'aucun message ne le dise. */
  if (r.error){
    if (!pkillDit){
      pkillDit = true;
      console.log('⚠  pkill introuvable : les Ordinateurs survivants ne seront pas moissonnés ' +
                  '— un scénario natif qui meurt peut faire rougir les suivants.');
    }
    return;
  }
  if (r.status === 0)
    console.log('⚠  processus Ordinateur survivant moissonné (isolation des scénarios)');
}

balayer();
let ko = 0, joues = 0, sautes = 0;
for (const s of scripts){
  console.log('\n━━━ ' + s + ' ━━━');
  const hp = horsPerimetre(s);
  if (hp){
    sautes++;
    console.log(`↷ sauté — hors périmètre : ${hp} est masqué à l'écran (CLAUDE.md §0). ` +
      `Le code et ce scénario restent valides ; repasser ${hp} à true dans ui/perimetre.js les rejoue.`);
    continue;
  }
  if (natifs.has(s) && nativeReason){
    sautes++;
    console.log('↷ sauté — ' + nativeReason + ' (construire avec Cargo puis relancer)');
    continue;
  }
  joues++;
  const code = await new Promise(res =>
    spawn(process.execPath, [path.join(DIR, s)], { stdio: 'inherit' }).on('close', res));
  if (code) ko++;
  console.log((code ? '✗ ' : '✓ ') + s);
  balayer();
}
console.log('\n' + `${joues - ko}/${joues} joués avec succès · ${sautes} sauté(s) · ${ko} échec(s)`);
process.exit(ko ? 1 : 0);
