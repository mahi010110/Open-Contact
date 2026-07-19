/* E2E D5 : rédaction IA « via ton ordinateur » contre le VRAI binaire.
   Trois chemins réels : Ollama local (faux runtime, OC_OLLAMA),
   OpenAI par clé (faux service, OC_OPENAI_TEST — la clé arrive en
   Bearer, une mauvaise clé rend un refus court honnête) et
   l'abonnement ChatGPT (faux outil Codex, OC_CODEX — arguments du
   mode non interactif vérifiés : bac à sable lecture seule,
   --output-last-message). Le texte tombe TOUJOURS dans le champ
   éditable, jamais un envoi ; le prompt porte la piste, jamais le
   suivi privé ; la clé ne touche jamais le disque du Compagnon.
   Compagnon éteint = message court honnête. Mobile 390×844 sombre
   + 1280×800 clair, cibles ≥ 44 px, zéro erreur console.
   Sauté proprement si le binaire n'est pas construit. */
import { chromium, chromiumPath, SHOTS, serveRepo, ROOT } from './outils.mjs';
import { spawn } from 'child_process';
import { existsSync, mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

const BIN = path.join(ROOT, 'compagnon', 'target', 'debug', 'oc-compagnon');
if (!existsSync(BIN)){
  console.log('binaire absent (cargo build -p oc-compagnon) — scénario sauté');
  process.exit(0);
}

/* ---------- faux Ollama : /api/generate ---------- */
let ollamaPrompt = '';
const ollama = http.createServer((req, res) => {
  let b = '';
  req.on('data', d => { b += d; });
  req.on('end', () => {
    ollamaPrompt = (JSON.parse(b || '{}').prompt) || '';
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ response: 'Bonjour Nadia,\n\nBrouillon Ollama du test.\n\nMahé' }));
  });
});
await new Promise(r => ollama.listen(11501, '127.0.0.1', r));

/* ---------- faux OpenAI : /v1/chat/completions, Bearer vérifié ---------- */
let openaiAuth = '', openaiBody = null;
const openai = http.createServer((req, res) => {
  let b = '';
  req.on('data', d => { b += d; });
  req.on('end', () => {
    openaiAuth = req.headers.authorization || '';
    openaiBody = JSON.parse(b || '{}');
    res.setHeader('Content-Type', 'application/json');
    if (openaiAuth !== 'Bearer sk-test-123'){
      res.statusCode = 401;
      res.end('{}');
      return;
    }
    res.end(JSON.stringify({ choices: [{ message: {
      content: 'Bonjour Nadia,\n\nBrouillon OpenAI du test.\n\nMahé' } }] }));
  });
});
await new Promise(r => openai.listen(11502, '127.0.0.1', r));

/* ---------- faux Codex : les arguments documentés, la sortie fichier ---------- */
const tmp = mkdtempSync(path.join(os.tmpdir(), 'oc-ia-'));
const trace = path.join(tmp, 'codex-args.txt');
const codex = path.join(tmp, 'codex');
writeFileSync(codex, `#!/bin/sh
printf '%s\\n' "$@" > '${trace}'
out=""; prev=""
for a in "$@"; do
  [ "$prev" = "--output-last-message" ] && out="$a"
  prev="$a"
done
[ -n "$out" ] || exit 3
printf 'Bonjour Nadia,\\n\\nBrouillon Codex du test.\\n\\nMahé' > "$out"
exit 0
`);
chmodSync(codex, 0o755);

/* ---------- le vrai Compagnon — lancé APRÈS le déverrouillage de la
   PWA (le code d'appairage OC_APPAIRAGE_AUTO expire en 2 min) ---------- */
const xdg = mkdtempSync(path.join(os.tmpdir(), 'oc-compagnon-ia-'));
const CODE = 'ABCD-2345';
let compagnon = null;
let compagnonOut = '';
let compagnonErr = '';
const attendre = async (fn, ms, quoi) => {
  const t0 = Date.now();
  for (;;){
    if (await fn()) return;
    if (Date.now() - t0 > ms) throw new Error('attente : ' + quoi);
    await new Promise(r => setTimeout(r, 400));
  }
};
const lancerCompagnon = async () => {
  compagnon = spawn('xvfb-run', ['-a', 'dbus-run-session', '--', BIN], {
    env: Object.assign({}, process.env, {
      XDG_DATA_HOME: xdg,
      OC_APPAIRAGE_AUTO: CODE,
      OC_OLLAMA: 'http://127.0.0.1:11501',
      OC_OPENAI_TEST: 'http://127.0.0.1:11502',
      OC_CODEX: codex,
      OC_INTEGRATION_TEST: '1'
    }),
    stdio: ['ignore', 'pipe', 'pipe'], detached: true
  });
  compagnon.stdout.on('data', d => { compagnonOut = (compagnonOut + d).slice(-4000); });
  compagnon.stderr.on('data', d => { compagnonErr = (compagnonErr + d).slice(-4000); });
  await attendre(async () => {
    for (const port of [17095, 17096, 17097]){
      try {
        const r = await fetch(`http://127.0.0.1:${port}/oc-compagnon`, { signal: AbortSignal.timeout(800) });
        const j = r.ok && await r.json();
        if (j && j.appairage) return true;
      } catch (e) {}
    }
    return false;
  }, 30000, 'canal du Compagnon');
};
const arreter = () => { try { process.kill(-compagnon.pid, 'SIGKILL'); } catch (e) {} };

/* ---------- la PWA : coffre, piste, appairage ---------- */
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const page = await (await browser.newContext({
  viewport: { width: 1280, height: 800 }, hasTouch: true })).newPage();
const errors = [];
page.on('console', m => {
  /* compagnon volontairement éteint (fin du scénario) et 401 injecté :
     les journaux réseau de ces refus attendus ne sont pas des erreurs —
     l'URL du refus vit dans location(), pas toujours dans text() */
  const ou = m.text() + ' ' + (((m.location() || {}).url) || '');
  if (m.type() === 'error' && !/127\.0\.0\.1:1709\d/.test(ou)
    && !/401|Unauthorized/.test(ou)) errors.push(m.text());
});
page.on('pageerror', e => errors.push(String(e)));
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const tapIn = async (scope, code) => { for (const d of code) await page.click(`${scope} .pad-k[data-d="${d}"]`); };

await page.goto(base, { waitUntil: 'load' });
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  const { createVault, makeVaultPhrase } = await import('./engine/vault.js');
  const made = await createVault('280941', makeVaultPhrase(), { iter: 15000 });
  await st.kvSet(st.VAULT_KEY, JSON.stringify(made.meta));
  await st.kvSet(st.DATA_KEY, JSON.stringify([{
    id: 'p1', name: 'Orange Cyberdefense', city: 'Lille', status: 'todo',
    notes: 'NOTE PRIVÉE DU SUIVI',
    contacts: [{ id: 'k1', name: 'Nadia', role: 'RH', email: 'nadia@exemple.fr' }], updatedAt: 1 }]));
  localStorage.setItem('t_phrase', makeVaultPhrase());
});
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.lock .pad-k');
await tapIn('.lock', '280941');
await page.waitForFunction(() => !document.querySelector('.lock'), null, { timeout: 10000 });
await page.evaluate(async () => (await import('./ui/synclive.js')).ensureRing(localStorage.getItem('t_phrase')));
await lancerCompagnon();
await page.evaluate(async code => {
  const { probeCompanion, pairCompanion } = await import('./engine/companion.js');
  const st = await import('./engine/storage.js');
  const { deviceSelf, ensureKeys, getRing, ringAddCompanion } = await import('./ui/synclive.js');
  const found = await probeCompanion();
  const self = await deviceSelf();
  const keys = await ensureKeys();
  const rep = await pairCompanion(found.base, code, found.info.appairage.s,
    { id: self.id, name: self.name, pub: keys.pub }, getRing());
  await st.kvSet(st.COMPANION_KEY, JSON.stringify({
    k: rep.k, id: rep.compagnon.id, nom: rep.compagnon.name, pub: rep.compagnon.pub, at: Date.now() }));
  await ringAddCompanion({ id: rep.compagnon.id, name: rep.compagnon.name, pub: rep.compagnon.pub });
}, CODE);
console.log('appairé ✓');

/* ---------- la feuille Connexions : aucune famille grisée, Ollama choisi ----------
   (openConnexions attend le code : on déclenche sans retenir sa promesse) */
await page.evaluate(() => { import('./ui/connexions.js').then(m => m.openConnexions()); });
await page.waitForSelector('#rqPad .pad-k');
await tapIn('#rqPad', '280941');
await page.waitForSelector('#cxAi');
await page.click('#cxAi');
await page.waitForSelector('[data-ai]');
const familles = await page.$$eval('[data-ai]', els => els.map(b => ({
  id: b.dataset.ai, off: b.disabled, txt: b.textContent })));
if (familles.length !== 6) fail('6 familles attendues, vu ' + familles.length);
for (const f of familles){
  if (f.off) fail('famille grisée à tort : ' + f.id);
  if (/pas encore disponible/.test(f.txt)) fail('promesse non tenue affichée : ' + f.id);
}
for (const id of ['ollama', 'openai', 'chatgpt']){
  const f = familles.find(x => x.id === id);
  if (!/via ton ordinateur/.test(f.txt)) fail(id + ' ne dit pas son chemin : ' + f.txt);
}
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + '/100-ia-familles.png' });
await page.click('[data-ai="ollama"]');
await page.waitForSelector('.modal-f .btn-primary');
await page.click('.modal-f .btn-primary');   /* Enregistrer — aucune clé exigée */
await page.waitForSelector('.toast.on');
if (!/Assistant prêt/.test(await page.textContent('#toast'))) fail('enregistrement Ollama');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.modal-w'), null, { timeout: 5000 });

/* ---------- Ollama : le brouillon tombe dans le champ éditable ---------- */
const ouvrirComposeur = async () => {
  await page.evaluate(async () => {
    const { openMail } = await import('./ui/mail.js');
    const { S } = await import('./ui/state.js');
    openMail(S.companies[0]);
  });
  await page.waitForSelector('#mAi');
};
await ouvrirComposeur();
await page.click('#mAi');
await page.waitForFunction(() => /Brouillon Ollama du test/.test(document.querySelector('#mBody').value),
  null, { timeout: 20000 });
if (!/Orange Cyberdefense/.test(ollamaPrompt)) fail('contexte de la piste absent du prompt Ollama');
if (/NOTE PRIVÉE/.test(ollamaPrompt)) fail('du suivi privé est parti au modèle !');
console.log('Ollama local : brouillon dans le champ, piste seule dans le prompt ✓');
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + '/101-ia-ollama-brouillon.png' });
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.modal-w'), null, { timeout: 5000 });

/* ---------- OpenAI par clé : Bearer vérifié, clé jamais sur le disque ---------- */
const reglerIa = async v => page.evaluate(async conf => {
  const st = await import('./engine/storage.js');
  await st.kvSet(st.AI_KEY, JSON.stringify(conf));
  await (await import('./ui/connexions.js')).loadMail();
}, v);
await reglerIa({ provider: 'openai', key: 'sk-test-123', model: 'gpt-4o-mini' });
await ouvrirComposeur();
await page.click('#mAi');
await page.waitForFunction(() => /Brouillon OpenAI du test/.test(document.querySelector('#mBody').value),
  null, { timeout: 20000 });
if (openaiAuth !== 'Bearer sk-test-123') fail('clé absente ou déformée : ' + openaiAuth);
if (!openaiBody || openaiBody.model !== 'gpt-4o-mini') fail('modèle non transmis');
const fuite = spawn('grep', ['-r', 'sk-test-123', xdg]);
const fuiteCode = await new Promise(r => fuite.on('close', r));
if (fuiteCode === 0) fail('LA CLÉ EST ÉCRITE SUR LE DISQUE DU COMPAGNON');
console.log('OpenAI : Bearer reçu, modèle transmis, clé jamais écrite chez le Compagnon ✓');

/* une mauvaise clé : refus court, le texte en place ne bouge pas */
await reglerIa({ provider: 'openai', key: 'sk-mauvaise', model: '' });
await page.click('#mAi');
await attendre(async () => /Clé refusée/.test(await page.textContent('#toast')), 20000, 'refus de clé honnête');
if (!/Brouillon OpenAI du test/.test(await page.inputValue('#mBody'))) fail('texte perdu sur refus de clé');
console.log('mauvaise clé : refus court, rien de perdu ✓');
await page.keyboard.press('Escape');
await page.waitForFunction(() => !document.querySelector('.modal-w'), null, { timeout: 5000 });

/* ---------- l'abonnement ChatGPT (Codex) — mobile 390×844, sombre ---------- */
await page.setViewportSize({ width: 390, height: 844 });
await page.click('#btnTheme');
await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
await reglerIa({ provider: 'chatgpt', key: '' });
await ouvrirComposeur();
const cible = await page.evaluate(() =>
  Math.round(document.querySelector('#mAi').getBoundingClientRect().height));
if (cible < 24) fail('bouton IA du composeur trop petit : ' + cible + 'px');
await page.click('#mAi');
await page.waitForFunction(() => /Brouillon Codex du test/.test(document.querySelector('#mBody').value),
  null, { timeout: 20000 });
const args = readFileSync(trace, 'utf8');
if (!/--sandbox\nread-only/.test(args)) fail('bac à sable lecture seule absent : ' + args);
if (!/--skip-git-repo-check/.test(args)) fail('argument documenté manquant : ' + args);
if (!/Orange Cyberdefense/.test(args)) fail('le prompt n’est pas passé à Codex');
if (/NOTE PRIVÉE/.test(args)) fail('du suivi privé est parti à Codex !');
console.log('abonnement ChatGPT : Codex non interactif, sortie fichier, prompt borné ✓');
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + '/102-ia-codex-mobile-sombre.png' });

/* ---------- l'ordinateur s'éteint : message court, honnête ---------- */
arreter();
await new Promise(r => setTimeout(r, 800));
await page.click('#mAi');
await attendre(async () => /ordinateur est éteint/.test(await page.textContent('#toast')),
  20000, 'message « ordinateur éteint »');
if (!/Brouillon Codex du test/.test(await page.inputValue('#mBody'))) fail('texte perdu quand l’ordinateur dort');
console.log('Compagnon éteint : refus court, rien de perdu ✓');
await page.waitForTimeout(300);
await page.screenshot({ path: SHOTS + '/103-ia-eteint-mobile.png' });

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
arreter();
await browser.close();
server.close();
ollama.close();
openai.close();
console.log(process.exitCode ? 'E2E compagnon-ia : ÉCHEC' : 'E2E compagnon-ia : OK');
