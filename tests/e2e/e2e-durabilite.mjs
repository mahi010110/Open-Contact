/* ============================================================
   E2E durabilité — la panne qu'on ne peut PAS réparer.

   OpenContact n'a aucun serveur : ce qui est perdu sur l'appareil
   est perdu pour de bon. Il n'y a pas de sauvegarde ailleurs, pas
   de « restaurer depuis le cloud », rien. Une mise à jour qui
   efface des données est donc la panne la plus grave du produit —
   et la seule qu'aucun correctif ultérieur ne rattrape.

   Ce qui existait avant ce fichier, et qui ne suffit pas :
     · e2e-maj.mjs      — prouve que la nouvelle version ARRIVE,
                          et ne regarde aucune donnée ;
     · e2e-stockage.mjs — prouve les rangs de repli en navigation
                          privée, et que `sw.js` ne purge pas
                          `oc-kv-v1` ; mais sur les seules pistes,
                          et sans montée de version.

   Ce que celui-ci prouve, de bout en bout :
     ① un suivi COMPLET (les 20 clés persistantes, coffre scellé et
        anneau d'appareils compris) survit à un déploiement, octet
        pour octet ;
     ② l'app relit réellement ces octets — les pistes reviennent à
        l'écran, pas seulement dans le stockage ;
     ③ le thème, qui vit en localStorage et non dans le magasin,
        survit lui aussi.

   Et le contrôle se vérifie LUI-MÊME : il plante une sonde en
   effaçant une clé, et échoue s'il ne la voit pas disparaître. Un
   contrôle de durabilité qui ne sait plus échouer est pire que pas
   de contrôle — il rassure à tort.
   ============================================================ */
import { chromium, chromiumPath, ROOT } from './outils.mjs';
import http from 'http';
import { readFile, writeFile, cp, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const dir = await mkdtemp(path.join(tmpdir(), 'oc-durabilite-'));
for (const f of ['index.html','app.js','theme.js','sw.js','manifest.webmanifest','icon.svg',
                 'engine','ui','styles','assets','tests.js','tests-c8.js','tests-mcp.js','oauth.html'])
  await cp(path.join(ROOT, f), path.join(dir, f), { recursive:true }).catch(() => {});

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
  '.webmanifest':'application/manifest+json', '.woff2':'font/woff2' };
const srv = http.createServer(async (q, r) => {
  try {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = path.join(dir, p);
    r.writeHead(200, { 'content-type':MIME[path.extname(f)] || 'application/octet-stream',
                       'cache-control':'no-cache' });
    r.end(await readFile(f));
  } catch (e) { r.writeHead(404); r.end(); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port;

let rate = 0;
const fail = m => { console.error('ÉCHEC :', m); rate++; };

/* ---- le suivi d'un étudiant qui s'est vraiment servi de l'app ----
   Des VRAIES valeurs, pas des chaînes vides : une clé absente et une
   clé vide se ressemblent trop pour départager une perte. */
const PISTES = [
  { id:'d1', name:'Adrastia Systèmes', city:'Toulouse', domain:'cyber', status:'active',
    desc:'Sécurité offensive.', notes:'Vu au forum. Relancer Camille.',
    vecu:'stage', vecuQui:'Léa', nextAction:'2026-08-20', nextActionText:'Relancer',
    contacts:[{ id:'k1', name:'Camille Ferrand', role:'RH', email:'c@adrastia.test',
                activatedAt:1755000000000 }],
    history:[{ at:1755000000000, what:'Statut → En cours' }],
    appliedAt:'2026-08-05', updatedAt:1755300000000, createdAt:1754000000000 },
  { id:'d2', name:'Ostral Cyberdéfense', city:'Bordeaux', domain:'cyber', status:'reply',
    desc:'SOC mutualisé.', notes:'Entretien le 22.',
    contacts:[{ id:'k2', name:'Nadia Berthier', role:'Manager', email:'n@ostral.test',
                activatedAt:1755100000000 }],
    updatedAt:1755400000000, createdAt:1754100000000 }
];

/* Les 20 clés persistantes (engine/storage.js). Le coffre, l'anneau et
   les jetons de messagerie sont des valeurs OPAQUES : ce qui se prouve
   ici n'est pas qu'on sait les lire, c'est qu'on ne les PERD pas — sans
   `oc_vault_v1`, un profil protégé devient définitivement illisible. */
const SUIVI = {
  oc_data_v3:      JSON.stringify(PISTES),
  oc_profile_v1:   JSON.stringify({ firstName:'Maheydine', formation:'BTS SIO', email:'m@test' }),
  oc_journal_v1:   JSON.stringify([{ at:1755000000000, txt:'Reçu du groupe : +12 pistes' }]),
  oc_orphans_v1:   JSON.stringify([{ id:'o1', name:'Contact à rattacher', email:'o@test' }]),
  oc_tombs_v1:     JSON.stringify([{ id:'mort1', at:1755000000000 }]),
  oc_sync_v1:      'phrase de liaison de mes appareils',
  oc_relays_v1:    JSON.stringify(['wss://relais.test']),
  oc_turn_v1:      JSON.stringify(['turn:test:3478']),
  oc_device_v1:    JSON.stringify({ id:'dev-1', name:'Mon téléphone' }),
  oc_devices_v1:   JSON.stringify([{ id:'dev-2', name:'Mon ordinateur', seen:1755000000000 }]),
  oc_promo_v1:     'mot-de-passe-de-groupe',
  oc_vault_v1:     'OCV1.enveloppe-de-cle-maitresse-opaque',
  oc_devring_v1:   'OCV1.anneau-signe-opaque',
  oc_campaigns_v1: JSON.stringify([{ id:'c1', name:'Alternance été' }]),
  oc_mail_v1:      'OCV1.jeton-messagerie-scelle',
  oc_ai_v1:        'OCV1.cle-ia-scellee',
  oc_missions_v1:  JSON.stringify([{ id:'m1', signe:true }]),
  oc_companion_v1: 'OCV1.cle-de-canal-scellee',
  oc_analysis_v1:  JSON.stringify({ reste:3 }),
  oc_proposals_v1: JSON.stringify([{ id:'p1' }])
};

const b = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

/* --- 1. installation neuve : l'app s'installe et le SW prend la main --- */
await p.goto(base + '/#/moi', { waitUntil:'load' });
await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout:15000 });
const vAvant = (await p.textContent('.moi-ver').catch(() => '') || '').trim();
console.log('installation neuve :', vAvant, '· service worker actif ✓');

/* --- 2. l'étudiant se sert de l'app : tout le suivi est écrit --- */
await p.evaluate(async d => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  for (const [k, v] of Object.entries(d)) await st.kvSet(k, v);
}, SUIVI);
await p.evaluate(() => localStorage.setItem('oc_theme', 'dark'));
console.log(`suivi écrit        : ${Object.keys(SUIVI).length} clés + le thème`);

/* On relit AVANT la montée de version : sans ça, un test qui écrit mal
   passerait pour un test qui ne perd rien. */
/* On lit les octets BRUTS dans IndexedDB, pas au travers de `kvGet`.
   Deux raisons. La durabilité porte sur ce qui est PERSISTÉ, pas sur ce
   que la couche de coffre accepte de rendre — une valeur scellée
   survivante est une valeur survivante. Et `kvGet` lève `verrou` sur une
   valeur `OCV1.` sans clé attachée (c'est le bon comportement : jamais un
   `null` silencieux qui ferait croire à une base vide), ce qui rendrait
   justement les clés les plus critiques inmesurables ici. */
const lire = () => p.evaluate(ks => new Promise((res, rej) => {
  const rq = indexedDB.open('oc_kv_v1', 1);
  rq.onerror = () => rej(rq.error);
  rq.onsuccess = () => {
    const tx = rq.result.transaction('kv', 'readonly').objectStore('kv');
    const out = {};
    let reste = ks.length;
    if (!reste){ out.__theme = localStorage.getItem('oc_theme'); return res(out); }
    for (const k of ks){
      const g = tx.get(k);
      g.onsuccess = () => { out[k] = g.result ?? null; if (!--reste){
        out.__theme = localStorage.getItem('oc_theme'); res(out); } };
      g.onerror = () => { out[k] = null; if (!--reste){
        out.__theme = localStorage.getItem('oc_theme'); res(out); } };
    }
  };
}), Object.keys(SUIVI));

const avant = await lire();
const malEcrites = Object.keys(SUIVI).filter(k => avant[k] !== SUIVI[k]);
if (malEcrites.length) fail(`le suivi n'a pas été écrit correctement : ${malEcrites.join(', ')}`);
else console.log('relu avant        : les 20 clés sont bien en place ✓');

/* --- 3. on déploie une version neuve pendant que l'app est installée --- */
const modele = path.join(dir, 'engine/model.js');
await writeFile(modele,
  (await readFile(modele, 'utf8')).replace(/APP_VERSION = '[^']+'/, "APP_VERSION = '9.9.9'"));
const swf = path.join(dir, 'sw.js');
await writeFile(swf,
  (await readFile(swf, 'utf8')).replace(/const CACHE = '[^']+'/, "const CACHE = 'oc-DURABILITE'"));
console.log('version publiée   : 9.9.9 (cache oc-DURABILITE)');

/* --- 4. l'utilisateur rouvre : la nouvelle version doit arriver ---
   On lit la version DANS LE MODULE, pas à l'écran. Ici le suivi contient
   un coffre scellé sans clé attachée : l'écran « Moi » ne se rend donc
   pas, et l'attendre ferait patienter le contrôle 30 s par tour pour
   rien. Ce qu'on veut savoir est de toute façon « le code neuf est-il
   arrivé », pas « le DOM l'affiche-t-il ». */
const versionVue = () => p.evaluate(async () => {
  try { return (await import('./engine/model.js?v=' + Date.now())).APP_VERSION; }
  catch (e) { return '?'; }
});
let arrivee = 0, vue = '';
for (let n = 1; n <= 4 && !arrivee; n++){
  await p.reload({ waitUntil:'load' });
  for (let i = 0; i < 12; i++){
    vue = await versionVue();
    if (vue === '9.9.9'){ arrivee = n; break; }
    await new Promise(r => setTimeout(r, 400));
  }
}
if (!arrivee) fail(`la version neuve n’arrive pas (vue : ${vue}) — le reste ne prouverait rien`);
else console.log(`montée de version : 9.9.9 arrivée à l'ouverture ${arrivee} ✓`);

/* --- 5. LE contrôle : rien n'a bougé --- */
const apres = await lire();
const perdues = [], changees = [];
for (const [k, v] of Object.entries(SUIVI)){
  if (apres[k] == null) perdues.push(k);
  else if (apres[k] !== v) changees.push(k);
}
if (perdues.length)  fail(`${perdues.length} clé(s) PERDUE(S) à la mise à jour : ${perdues.join(', ')}`);
if (changees.length) fail(`${changees.length} clé(s) ALTÉRÉE(S) : ${changees.join(', ')}`);
if (!perdues.length && !changees.length)
  console.log(`après la montée   : les ${Object.keys(SUIVI).length} clés intactes, octet pour octet ✓`);

if (apres.__theme !== 'dark') fail(`le thème n'a pas survécu (« ${apres.__theme} » au lieu de « dark »)`);
else console.log('                    le thème aussi ✓');

/* --- 6. les octets ne suffisent pas : l'app les relit-elle ? ---
   On retire d'abord la métadonnée de coffre : sans elle, le profil
   redevient non protégé et l'app doit rouvrir son suivi normalement.
   C'est le parcours de l'immense majorité — et si les pistes ne
   revenaient pas à l'écran, prouver que les octets sont là ne
   consolerait personne. */
await p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  for (const k of ['oc_vault_v1','oc_devring_v1','oc_mail_v1','oc_ai_v1','oc_companion_v1'])
    await st.kvDel(k);
});
/* Un `goto` qui ne change que le hash NE RECHARGE PAS la page : l'app
   resterait sur l'état chargé avant la suppression, et le contrôle
   mesurerait sa propre mémoire au lieu du disque. Il faut un vrai
   rechargement. */
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(1800);
const vues = await p.evaluate(async () =>
  (await import('./ui/state.js')).S.companies.map(c => c.name)).catch(() => []);
const attendues = PISTES.map(c => c.name);
const manquantes = attendues.filter(n => !vues.includes(n));
if (manquantes.length) fail(`pistes stockées mais PAS RELUES par l'app : ${manquantes.join(', ')}`);
else console.log(`à l'écran         : ${vues.length} pistes relues (${vues.join(', ')}) ✓`);

/* --- 7. la sonde : ce contrôle sait-il encore échouer ? --- */
await p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvDel('oc_profile_v1');
});
const sonde = await lire();
const vueParLaSonde = sonde.oc_profile_v1 !== SUIVI.oc_profile_v1;
if (!vueParLaSonde) fail('le contrôle est AVEUGLE : une clé effacée ne le fait pas broncher');
else console.log('sonde             : une clé effacée est bien détectée ✓');

/* `verrou` est ATTENDU ici, et c'est même la bonne conduite : ce
   scénario pose une métadonnée de coffre synthétique, sans clé
   correspondante. L'app refuse alors de rendre une valeur scellée
   plutôt que de rendre `null` — un `null` silencieux ferait croire à
   une base vide, c'est-à-dire à la perte qu'on teste ici. On ne compte
   donc que le reste. */
const vrais = errs.filter(e => !/verrou/.test(e));
if (vrais.length) fail(`${vrais.length} erreur(s) console : ${vrais.slice(0, 3).join(' | ')}`);
else console.log(`Zéro erreur console (hors « verrou », attendu : ${errs.length - vrais.length}).`);

console.log(rate ? `E2E durabilité : ÉCHEC (${rate})` : 'E2E durabilité : OK');
await b.close(); srv.close(); await rm(dir, { recursive:true, force:true });
process.exit(rate ? 1 : 0);
