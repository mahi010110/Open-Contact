/* Deux navigateurs, chacun dans son espace réseau, se relient-ils ?
   usage : node lanceur.mjs <nsA> <nsB>   (ex. oc-ha oc-hb = deux réseaux) */
import { chromium, chromiumPath } from '../outils.mjs';
import { navigateurDans } from './navigateur.mjs';
const [nsA = 'oc-ha', nsB = 'oc-hb'] = process.argv.slice(2);
const BASE = 'http://100.64.9.1:8080';
const STUNS = ['stun.l.google.com', 'stun1.l.google.com', 'stun2.l.google.com', 'stun.cloudflare.com'];
const lancer = async ns => {
  return chromium.launch({ executablePath: navigateurDans(ns, chromiumPath()), args: [
    '--unsafely-treat-insecure-origin-as-secure=' + BASE,
    '--host-resolver-rules=' + STUNS.map(s => 'MAP ' + s + ' 100.64.9.1').join(',')] });
};
const [bA, bB] = await Promise.all([lancer(nsA), lancer(nsB)]);
const salle = 'labo-' + Math.random().toString(36).slice(2, 8), phrase = 'p-' + Math.random().toString(36).slice(2, 8);
const pages = [];
/* LABO_VIEILLIR=<ms> : les DEUX pages ouvrent une autre salle d'abord et
   attendent — leurs réserves d'offres ont vieilli quand elles se
   rencontrent, quel que soit celui qui offre */
const vieillir = Number(process.env.LABO_VIEILLIR || 0);
if (vieillir){
  const chauffe = await Promise.all([bA, bB].map(async b => {
    const p = await (await b.newContext()).newPage();
    await p.goto(BASE + '/'); await p.waitForFunction(() => window.__pret === true);
    await p.evaluate(() => window.__chauffer(['ws://100.64.9.1:7777']));
    return p;
  }));
  await new Promise(r => setTimeout(r, vieillir));
  pages.push(...chauffe);
}
let rang = 0;
for (const b of (vieillir ? [] : [bA, bB])){
  /* LABO_DELAI_B : B arrive plus tard — la réserve d'offres de A vieillit */
  if (rang++ === 1 && process.env.LABO_DELAI_B) await new Promise(r => setTimeout(r, Number(process.env.LABO_DELAI_B)));
  const p = await (await b.newContext()).newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('   [console]', m.text().slice(0, 160)); });
  await p.goto(BASE + '/' + (process.env.LABO_TRICKLE === '0' ? '?trickle=0' : ''));
  await p.waitForFunction(() => window.__pret === true, { timeout: 10000 });
  await p.evaluate(([s, f]) => window.__rejoindre(['ws://100.64.9.1:7777'], s, f), [salle, phrase]);
  pages.push(p);
}
if (vieillir) for (const p of pages)
  await p.evaluate(([s, f]) => window.__rejoindre(['ws://100.64.9.1:7777'], s, f), [salle, phrase]);
const ATTENTE = +(process.env.LABO_ATTENTE || 35000);
const t0 = Date.now(); let relie = false;
while (Date.now() - t0 < ATTENTE){
  await new Promise(r => setTimeout(r, 500));
  const e = await Promise.all(pages.map(p => p.evaluate(() => window.__J.pair)));
  if (e.every(Boolean)){ relie = true; break; }
}
const duree = ((Date.now() - t0) / 1000).toFixed(1);
await new Promise(r => setTimeout(r, 1500));
const [A, B] = await Promise.all(pages.map(p => p.evaluate(() => window.__J)));
const paire = relie ? await pages[0].evaluate(() => window.__paire()) : null;
const bilan = (X, Y, type) => { const recu = new Set(Y.recus.map(r => r.id)); const ack = new Map(X.acks.map(a => [a.id, a]));
  const e = X.envoyes.filter(x => x.type === type);
  return { envoyes: e.length, livres: e.filter(x => recu.has(x.id)).length, refuses: e.filter(x => ack.get(x.id) && !ack.get(x.id).ok).length }; };
console.log(JSON.stringify({ relie, duree, paire,
  candidatsRassembles: { A: A.cands, B: B.cands },
  negociation: {
    'A→B offre': bilan(A, B, 'offre'), 'B→A réponse': bilan(B, A, 'réponse'),
    'A→B candidats': bilan(A, B, 'candidat'), 'B→A candidats': bilan(B, A, 'candidat'),
    'A→B réponse': bilan(A, B, 'réponse'), 'B→A offre': bilan(B, A, 'offre') },
  erreurs: [...new Set([...A.erreurs, ...B.erreurs])], traceA: A.trace, traceB: B.trace, sdpsA: A.sdps, sdpsB: B.sdps }, null, 1));
await bA.close(); await bB.close();
