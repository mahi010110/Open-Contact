/* Les services de « l'Internet » du labo, lancés DANS oc-inet :
   STUN (19302, 3478), relais Nostr (ws 7777 ; wss 7443, et un second
   plus lent en 7444), page de sonde (8080), la vraie app (8081).
   Mode du relais : LABO_RELAIS = sain | perd | perd-reponse | banni-b
   | limite:<n>:<ms> (voir relais-local.mjs). */
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startLocalRelay } from '../relais-local.mjs';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const IP = '100.64.9.1';
const mode = process.env.LABO_RELAIS || 'sain';
const opts = { hote: IP, port: 7777 };
if (mode === 'perd') opts.perdCandidats = true;
if (mode === 'perd-reponse') opts.filtre = ev => /"answer"\s*:/.test(String(ev.content || '')) ? 'rate-limited: slow down' : null;
if (mode.startsWith('limite:')){ const [, n, ms] = mode.split(':'); opts.limite = { n: +n, ms: +ms }; }
const relais = await startLocalRelay(opts);
/* la vraie app n'accepte que wss: (sa CSP) — le même relais, en TLS */
if (mode === 'banni-b')
  /* relay.damus.io tel que mesuré : il laisse LIRE et refuse d'écrire à
     une IP bannie. Ici : la box B. Il est rapide, il gagne la course. */
  opts.filtre = (ev, ip) => /100\.64\.2\.2$/.test(ip) ? 'banned: too many rate-limit violations, try again later' : null;
const relaisTls = await startLocalRelay({ ...opts, port: 7443, tls: true });
/* un second relais, SAIN mais plus lent : celui qui aurait pu tout porter */
const relaisLent = await startLocalRelay({ hote: IP, port: 7444, tls: true, delai: 400 });
spawn(process.execPath, [new URL('./stun.mjs', import.meta.url).pathname], { stdio: 'ignore' });
const bundle = await readFile(REPO + '/assets/vendor/trystero-nostr.min.js', 'utf8');
const sonde = await readFile(new URL('./page-sonde.js', import.meta.url), 'utf8');
http.createServer((req, res) => {
  if (req.url === '/trystero.js' || req.url === '/sonde.js'){
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(req.url === '/trystero.js' ? bundle : sonde);
  }
  if (req.url === '/stats'){ res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(relais.stats)); }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!DOCTYPE html><meta charset="utf-8"><script type="module" src="/sonde.js"></script>');
}).listen(8080, IP, () => console.log('PRÊT relais=' + relais.url + ' mode=' + mode));

/* LA VRAIE APP, servie depuis « l'Internet » du labo */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    let data = await readFile(path.join(REPO, p));
    /* VARIANTE « on laisse réessayer » : le rendez-vous ne quitte plus la
       salle au premier échec de liaison — seulement si aucun relais ne
       porte. Tout le reste est le code livré, octet pour octet. */
    if (process.env.LABO_VARIANTE === 'reessaie' && (p === '/ui/donner.js' || p === '/ui/recevoir.js')){
      const avant = data.toString();
      const apres = avant.replace("stage === 'norelay' || (stage === 'rtcfail' && cause !== 'motdepasse')", "stage === 'norelay'");
      if (apres === avant) throw new Error('variante introuvable dans ' + p);
      data = Buffer.from(apres);
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) { if (!res.headersSent) res.writeHead(404); res.end(); }
}).listen(8081, IP, () => console.log('APP http://' + IP + ':8081 relais TLS ' + relaisTls.url));
