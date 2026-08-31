/* ============================================================
   OpenContact — tests de bout en bout · outillage commun
   Résout Playwright et le Chromium pré-installé sans chemin en
   dur : OC_PLAYWRIGHT / OC_CHROMIUM priment, sinon les
   emplacements connus, sinon le navigateur par défaut de
   Playwright. Sert aussi le dépôt en HTTP statique local.
   Ces tests sont un outillage de développement : rien ici n'est
   chargé par l'application.
   ============================================================ */
import http from 'http';
import path from 'path';
import { readFile, mkdir } from 'fs/promises';
import { readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'captures');
await mkdir(SHOTS, { recursive: true });

async function loadPlaywright(){
  const cands = [process.env.OC_PLAYWRIGHT,
    '/opt/node22/lib/node_modules/playwright/index.mjs', 'playwright'].filter(Boolean);
  for (const c of cands){ try { return await import(c); } catch (e) {} }
  throw new Error('Playwright introuvable — `npm i -g playwright` ou OC_PLAYWRIGHT=<chemin de index.mjs>');
}
export const { chromium } = await loadPlaywright();

const isFile = p => { try { return statSync(p).isFile(); } catch (e) { return false; } };
export function chromiumPath(){
  if (process.env.OC_CHROMIUM) return process.env.OC_CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (isFile(path.join(base, 'chromium'))) return path.join(base, 'chromium');
  try {
    for (const d of readdirSync(base)){
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (d.startsWith('chromium-') && isFile(p)) return p;
    }
  } catch (e) {}
  return undefined;               /* Playwright choisit alors son navigateur */
}

/* Attendre qu'une condition évaluée DANS la page devienne vraie.
   Piège avéré : `page.waitForFunction(async () => …)` ne déballe pas la
   promesse du prédicat — une promesse en attente est « truthy », l'attente
   « réussit » donc immédiatement sans rien vérifier. Ce helper évalue
   réellement (evaluate attend les fonctions async) et ré-essaie. */
/* Deux défauts corrigés le 16 août 2026, tous deux découverts par une
   suite qui rougissait un tour sur trois sans que rien ne soit cassé :

   ① UN PRÉDICAT QUI JETTE N'EST PAS UN PRÉDICAT FAUX. Presque tous les
     prédicats font `import('./ui/state.js')`, un chemin RELATIF, résolu
     contre l'URL du document. Sondé pendant une navigation — juste après
     `page.reload()` —, le document est momentanément `about:blank` et le
     spécificateur ne résout plus : `evaluate` LÈVE au lieu de rendre
     `false`, l'exception traverse la boucle, et le test meurt sur un
     état parfaitement sain. Une attente doit ré-essayer sur une erreur
     transitoire ; c'est tout l'intérêt d'attendre. La dernière erreur
     part quand même dans le message final, sinon on remplace un échec
     bruyant par un délai muet.
   ② LE MESSAGE ÉTAIT JETÉ. Neuf appels passent une CHAÎNE en troisième
     argument ; la déstructuration d'une chaîne rend `undefined` pour
     `message`, donc le défaut s'appliquait et l'explication écrite par
     l'auteur du test n'apparaissait jamais. On accepte les deux formes. */
export async function attendre(page, fn, opts = {}){
  const { timeout = 15000, pas = 250, message = '' } =
    typeof opts === 'string' ? { message: opts } : opts;
  const fin = Date.now() + timeout;
  let derniere = null;
  for (;;){
    try {
      if (await page.evaluate(fn)) return;
      derniere = null;
    } catch (e) {
      derniere = e;                       /* navigation en cours : on repasse */
    }
    if (Date.now() > fin)
      throw new Error('attendre() : délai dépassé (' + timeout + ' ms)'
        + (message ? ' — ' + message : '')
        + (derniere ? ' — dernière erreur : ' + String(derniere).split('\n')[0] : ''));
    await new Promise(r => setTimeout(r, pas));
  }
}

/* ---------- le canal local de l’ordinateur (binaire natif) ----------
   Il écoute sur l'un de ces trois ports et n'expose `appairage` que
   pendant qu'un appairage attend un code. Attendre en silence puis
   mourir sur « délai dépassé » n'apprend RIEN : c'est ce qui a rendu
   un échec de CI illisible (six scénarios rouges, zéro indice). Ici
   l'échec DIT ce qu'il a vu, port par port, et recrache les dernières
   lignes du binaire. */
export const CANAL_PORTS = [17095, 17096, 17097];

export async function sonderCanal(pret = info => info && info.appairage){
  const vu = [];
  for (const port of CANAL_PORTS){
    try {
      const r = await fetch(`http://127.0.0.1:${port}/oc-natif`, { signal: AbortSignal.timeout(800) });
      if (!r.ok){ vu.push(port + ' : HTTP ' + r.status); continue; }
      const info = await r.json();
      if (pret(info)){ vu.push(port + ' : prêt'); return { info, port, vu }; }
      vu.push(port + ' : répond, mais pas prêt — ' + JSON.stringify(info).slice(0, 120));
    } catch (e) {
      vu.push(port + ' : ' + (e.name === 'TimeoutError' ? 'pas de réponse'
        : (e.cause && e.cause.code) || e.name));
    }
  }
  return { info: null, port: null, vu };
}

/* `journal()` rend le texte accumulé du binaire (stdout + stderr) —
   sans lui, un binaire qui meurt au démarrage reste muet. */
export async function attendreCanal({ timeout = 30000, pas = 400, journal = null,
                                      pret = info => info && info.appairage } = {}){
  const fin = Date.now() + timeout;
  let vu = [];
  for (;;){
    const r = await sonderCanal(pret);
    if (r.info) return r.info;
    vu = r.vu;
    if (Date.now() > fin) break;
    await new Promise(res => setTimeout(res, pas));
  }
  const lignes = journal ? String(journal() || '').split('\n').filter(Boolean).slice(-25) : [];
  throw new Error('canal de l’ordinateur : rien après ' + Math.round(timeout / 1000) + ' s\n'
    + '  sondes : ' + vu.join(' · ')
    + (lignes.length ? '\n  dernières lignes du binaire :\n' + lignes.map(l => '    ' + l).join('\n')
                     : '\n  (le binaire n’a rien écrit — stdout/stderr vides ou non capturés)'));
}

/* Depuis « Moi » : atteint les lignes de Réglages — porte à ouvrir sur
   mobile (#20), colonne déjà dépliée sur desktop. */
export async function ouvrirReglages(page){
  await page.waitForSelector('#moiReglages, #moiVerrou');
  if (!(await page.$('#moiVerrou'))){
    await page.click('#moiReglages');
    await page.waitForSelector('#moiVerrou');
  }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain' };
export async function serveRepo(){
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const data = await readFile(path.join(ROOT, p));   /* lire AVANT d'écrire l'entête */
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      res.end(data);
    } catch (e) {
      if (!res.headersSent) res.writeHead(404);
      res.end();
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

/* ============================================================
   COPIER UN DÉPLOIEMENT — la liste se DÉDUIT, elle ne se tient pas

   Deux scénarios servent une copie du dépôt pour rejouer une mise à
   jour ou une migration. Leur liste de fichiers était écrite à la
   main : le jour où l'app a précaché trois fichiers de plus, ils ont
   manqué dans la copie, `cache.addAll` a échoué — il est atomique, un
   seul 404 fait tout tomber — le service worker ne s'est jamais
   installé, et les deux scénarios ont échoué SANS dire pourquoi.

   La liste vient donc de `PRECACHE`, dans `sw.js` : ce que l'app
   promet de servir hors ligne est exactement ce qu'une copie doit
   contenir. Elle ne peut plus diverger.
   ============================================================ */
export async function copierDeploiement(dest){
  const { cp } = await import('node:fs/promises');
  const sw = await readFile(path.join(ROOT, 'sw.js'), 'utf8');
  const bloc = sw.match(/PRECACHE\s*=\s*\[([\s\S]*?)\]/);
  if (!bloc) throw new Error('copierDeploiement : PRECACHE introuvable dans sw.js');
  /* les commentaires du bloc citent des chemins : on les retire d'abord */
  const nu = bloc[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
  const cibles = new Set(['sw.js', 'theme.js', 'manifest.webmanifest',
    /* chargés par `?test`, jamais précachés : ils ne servent pas
       l'utilisateur, mais les scénarios en ont besoin */
    'tests.js', 'tests-c8.js', 'tests-mcp.js']);
  for (const m of nu.matchAll(/'([^']+)'/g)){
    const p = m[1].replace(/^\.\//, '').replace(/^\//, '');
    if (!p || /^https?:/.test(p)) continue;
    /* on copie le DOSSIER de tête : `./ui/mail.js` → `ui` */
    cibles.add(p.includes('/') ? p.slice(0, p.indexOf('/')) : p);
  }
  let n = 0;
  for (const f of cibles){
    try { await cp(path.join(ROOT, f), path.join(dest, f), { recursive: true }); n++; }
    catch { /* une entrée absente se verra au 404, pas ici */ }
  }
  return n;
}
