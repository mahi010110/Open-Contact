/* Le scénario qui nous a fait perdre deux jours : une app DÉJÀ installée,
   avec son service worker actif, puis une nouvelle version publiée.
   Voit-elle le changement à la première ouverture ?
   On sert une copie du dépôt qu'on modifie EN COURS DE ROUTE, comme un
   déploiement réel. */
import { chromium, chromiumPath, ROOT, copierDeploiement } from './outils.mjs';
import http from 'http';
import { readFile, cp, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const SRC = ROOT;
const dir = await mkdtemp(path.join(tmpdir(), 'oc-maj-'));
await copierDeploiement(dir);

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.webmanifest':'application/manifest+json', '.woff2':'font/woff2' };
const srv = http.createServer(async (q, r) => {
  try {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(dir, p);
    /* LIRE AVANT D'ÉCRIRE L'ENTÊTE. Écrit d'abord, un 200 est déjà parti
       quand la lecture échoue : le `catch` tente alors un 404 sur des
       entêtes envoyés, Node jette `ERR_HTTP_HEADERS_SENT`, et c'est le
       PROCESSUS DE TEST qui meurt — un fichier manquant se signalait
       donc comme un scénario en échec, sans dire lequel ni pourquoi.
       `serveRepo` (outils.mjs) fait déjà dans le bon ordre. */
    const data = await readFile(f);
    r.writeHead(200, { 'content-type':MIME[path.extname(f)] || 'application/octet-stream',
                       'cache-control':'no-cache' });
    r.end(data);
  } catch (e) {
    if (!r.headersSent) r.writeHead(404);
    r.end();
  }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port;

const b = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));

/* --- 1. première visite : le SW s'installe --- */
await p.goto(base + '/#/moi', { waitUntil:'load' });
await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout:15000 });
const v1 = await p.textContent('.moi-ver');
console.log('1ʳᵉ visite       :', v1.trim(), '· SW actif :', await p.evaluate(() => !!navigator.serviceWorker.controller));

/* --- 2. on « déploie » une version neuve pendant que l'app est ouverte --- */
const modele = path.join(dir, 'engine/model.js');
let m = await readFile(modele, 'utf8');
m = m.replace(/APP_VERSION = '[^']+'/, "APP_VERSION = '9.9.9'");
await (await import('fs/promises')).writeFile(modele, m);
let sw = await readFile(path.join(dir, 'sw.js'), 'utf8');
sw = sw.replace(/const CACHE = '[^']+'/, "const CACHE = 'oc-TEST'");
await (await import('fs/promises')).writeFile(path.join(dir, 'sw.js'), sw);
console.log('   (version 9.9.9 publiée, cache oc-TEST)');

/* --- 3. combien d'ouvertures faut-il ? --- */
let arrivee = 0;
for (let n = 1; n <= 4 && !arrivee; n++){
  await p.reload({ waitUntil:'load' });
  let vu = '';
  for (let i = 0; i < 25; i++){
    vu = (await p.textContent('.moi-ver').catch(() => '')) || '';
    if (vu.includes('9.9.9')){ arrivee = n; break; }
    await new Promise(r => setTimeout(r, 350));
  }
  console.log(`ouverture ${n}      : ${vu.trim() || '(rien)'}`);
}
const ok = arrivee === 1;
console.log(arrivee ? `→ la mise à jour arrive à l'ouverture ${arrivee}`
                    : '→ elle n’arrive pas du tout');
if (!ok) console.error('ÉCHEC : une version neuve doit arriver en UNE ouverture');
console.log(ok && !errs.length ? 'E2E mise à jour : OK' : 'E2E mise à jour : ÉCHEC');
if (errs.length) console.error('ERREURS :', errs.join(' | '));
await b.close(); srv.close(); await rm(dir, { recursive:true, force:true });
process.exit(ok && !errs.length ? 0 : 1);
