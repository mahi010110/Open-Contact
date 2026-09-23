/* ============================================================
   E2E — UNE OFFRE PÉRIMÉE NE DOIT PLUS VIDER LA LIAISON

   Le défaut, trouvé entre deux vraies machines puis isolé au labo
   NAT : Trystero garde une réserve d'offres préparées à l'avance, et
   « relance » celles de plus de 57 s (rollback + restartIce). Annuler
   la PREMIÈRE offre d'une connexion retire son transport : l'offre
   relancée n'a plus aucune section m=, l'autre répond une réponse
   vide, rien ne se relie, et l'écran accuse « vos deux réseaux ».
   Celui qui attend dans une salle depuis plus d'une minute ne pouvait
   donc plus faire une seule offre valable — sur n'importe quel réseau.
   La correction vit dans le bundle vendorisé (assets/vendor/VERSIONS.txt).

   Aucun autre scénario ne pouvait le voir : ils relient tous deux
   pages dans les secondes qui suivent leur ouverture, réserve neuve.

   Le scénario vieillit donc les DEUX réserves (une salle ouverte d'abord,
   61 s d'attente — comme « Mes appareils » au démarrage de l'app), puis
   joue le vrai « Partage en groupe ». Quel que soit celui qui offre, son
   offre est périmée. Et il le joue deux fois EN MÊME TEMPS :
     · avec le bundle livré        → les deux pages doivent se relier ;
     · avec le défaut remis en place → elles ne doivent PAS se relier.
   La seconde moitié est la preuve que la garde sait encore échouer :
   sans elle, un vieillissement qui ne vieillirait plus rien passerait
   au vert sans rien garder.
   ============================================================ */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, chromiumPath, serveRepo, attendre, ROOT } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';

const VIEILLIR_MS = 61000;          /* au-delà des 57 333 ms de la bibliothèque */
const ATTENTE_MS = 30000;

/* les deux corrections, et leur envers — le défaut d'origine */
const CORRECTIONS = [
  ['ve=async C=>{let D=await C.getOffer(Date.now()-C.created>Ge);',
   've=async C=>{if(Date.now()-C.created>Ge)throw N("stale pooled offer");let D=await C.getOffer(!1);'],
  ['e.setHandlers({connect:Z,close:Z,error:Z}),e.getOffer(!0).then(',
   'e.setHandlers({connect:Z,close:Z,error:Z}),Promise.reject(0).then(']
];
const livre = await readFile(path.join(ROOT, 'assets/vendor/trystero-nostr.min.js'), 'utf8');
let fautes = 0;
const fail = m => { fautes++; console.error('✗ ' + m); };
for (const [, apres] of CORRECTIONS)
  if (!livre.includes(apres)) fail('le bundle livré ne porte plus la correction « ' + apres.slice(0, 50) + '… »');
const defaut = CORRECTIONS.reduce((s, [avant, apres]) => s.replace(apres, avant), livre);

const relay = await startLocalRelay({ tls: true });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });

async function page(bundle){
  /* service worker bloqué : la page doit charger le bundle qu'on lui sert */
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: 'block',
    viewport: { width: 390, height: 844 }, hasTouch: true });
  if (bundle) await ctx.route('**/assets/vendor/trystero-nostr.min.js',
    r => r.fulfill({ status: 200, contentType: 'application/javascript', body: bundle }));
  const p = await ctx.newPage();
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(async url => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, relay.url);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  /* la réserve naît à la première salle de la session — on en ouvre une */
  await p.evaluate(async () => {
    const sl = await import('./ui/synclive.js');
    window.__chauffe = await sl.openRoom('promo', 'chauffe-' + Math.random().toString(36).slice(2), {});
  });
  return p;
}
async function groupe(p, mdp){
  await p.click('.bottomnav a[data-r="echanger"]');
  await p.waitForSelector('#ecPromo'); await p.click('#ecPromo');
  await p.waitForSelector('#prPass'); await p.fill('#prPass', mdp);
  await p.click('.modal-f .btn-primary');
  await p.waitForSelector('#prStatus');
}
const relies = ps => Promise.all(ps.map(p => attendre(p,
  () => /camarade/.test(document.querySelector('#prStatus')?.textContent || ''),
  { timeout: ATTENTE_MS, pas: 500 }).then(() => true, () => false)));

try {
  const [c1, c2, d1, d2] = await Promise.all([page(null), page(null), page(defaut), page(defaut)]);
  console.log('quatre pages, réserves ouvertes — ' + VIEILLIR_MS / 1000 + ' s pour qu’elles périment…');
  await c1.waitForTimeout(VIEILLIR_MS);
  await Promise.all([groupe(c1, 'corrige-e2e'), groupe(c2, 'corrige-e2e'),
    groupe(d1, 'defaut-e2e'), groupe(d2, 'defaut-e2e')]);
  const [corrige, avecDefaut] = await Promise.all([relies([c1, c2]), relies([d1, d2])]);

  if (corrige.every(Boolean)) console.log('bundle livré, réserves périmées : les deux pages se relient ✓');
  else fail('OFFRE PÉRIMÉE : avec le bundle livré, des pages dont la réserve a plus de 57 s ne se relient pas '
    + '— l’offre relancée est vide (voir assets/vendor/VERSIONS.txt). Écrans : '
    + (await Promise.all([c1, c2].map(p => p.textContent('#prStatus')))).map(s => '« ' + s.trim() + ' »').join(' / '));

  if (!avecDefaut.some(Boolean)) console.log('défaut d’origine remis en place : aucune liaison — la garde sait encore échouer ✓');
  else fail('la garde ne sait plus échouer : le défaut d’origine remis en place relie quand même — '
    + 'le vieillissement ne vieillit plus rien, et le vert d’en haut ne prouve rien');
} finally {
  await browser.close();
  server.close();
  relay.close();
}
if (fautes){ console.error('\nE2E offre périmée : ' + fautes + ' faute(s)'); process.exit(1); }
console.log('E2E offre périmée : OK');
