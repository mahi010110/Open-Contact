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
export async function attendre(page, fn, { timeout = 15000, pas = 250, message = '' } = {}){
  const fin = Date.now() + timeout;
  for (;;){
    if (await page.evaluate(fn)) return;
    if (Date.now() > fin)
      throw new Error('attendre() : délai dépassé (' + timeout + ' ms)' + (message ? ' — ' + message : ''));
    await new Promise(r => setTimeout(r, pas));
  }
}

/* ---------- le canal local du Compagnon (binaire natif) ----------
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
      const r = await fetch(`http://127.0.0.1:${port}/oc-compagnon`, { signal: AbortSignal.timeout(800) });
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
  throw new Error('canal du Compagnon : rien après ' + Math.round(timeout / 1000) + ' s\n'
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
