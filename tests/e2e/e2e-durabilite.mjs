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
     ② les CV et les lettres survivent aussi. Ils ne vivent PAS avec
        le reste : `oc_docs_v1` est une base à PART, exprès, pour
        qu'un PDF lourd ne puisse jamais bloquer ni faire perdre les
        pistes (engine/storage.js). Un contrôle qui ne regarde que
        `oc_kv_v1` conclut donc « rien n'est perdu » sans avoir
        ouvert le fichier le plus lourd et le moins remplaçable de
        l'app — un suivi se refait, un CV et trois lettres relues
        trois fois, non ;
     ③ l'app relit réellement ces octets — les pistes ET les
        documents reviennent, pas seulement dans le stockage. Pour
        les documents ça compte double : `listDocs()` attrape ses
        erreurs et rend `[]`, donc une base perdue s'afficherait
        « aucun document » sans un mot ;
     ④ le thème, qui vit en localStorage et non dans le magasin,
        survit lui aussi.

   Et le contrôle se vérifie LUI-MÊME : il plante une sonde en
   effaçant une clé ET un PDF, et échoue s'il ne les voit pas
   disparaître. Un contrôle de durabilité qui ne sait plus échouer
   est pire que pas de contrôle — il rassure à tort.

   Éprouvé à la mutation « le service worker purge `oc_docs_v1` à
   l'activation ». Résultat instructif, et c'est pourquoi les deux
   couches restent : la comparaison d'octets a conclu « les 3
   documents intacts ✓ » — la suppression était encore en vol — et
   c'est le chemin de l'app, un rechargement plus tard, qui l'a
   attrapée. Vérifier le stockage NE remplace pas vérifier ce que
   l'app retrouve.
   ============================================================ */
import { chromium, chromiumPath, ROOT, copierDeploiement } from './outils.mjs';
import http from 'http';
import { readFile, writeFile, cp, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const dir = await mkdtemp(path.join(tmpdir(), 'oc-durabilite-'));
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

/* Les CV et les lettres vivent dans la base SÉPARÉE `oc_docs_v1`
   (engine/storage.js) : lire les 20 clés de `oc_kv_v1` ne dit RIEN de
   leur sort. Un contenu DISTINCT par document — deux blobs identiques
   ne départageraient pas un mélange de clés d'une conservation
   correcte. La clé héritée `cv` est là pour elle-même : le code la
   traite comme une variante parmi les autres, donc elle se perd
   comme les autres. */
const DOCS = [
  { key:'cv_durab1', name:'CV-Maheydine-cyber.pdf', added:1755000000000,
    octets:'%PDF-1.4 CV cyber — la version que je ne peux pas refaire ce soir' },
  { key:'lm_durab1', name:'LM-Adrastia.pdf', added:1755100000000,
    octets:'%PDF-1.4 Lettre pour Adrastia — relue trois fois' },
  { key:'cv', name:'Mon ancien CV.pdf', added:1754000000000,
    octets:'%PDF-1.4 clé héritée : elle doit survivre comme les autres' }
];

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
/* `docPut` et pas un accès direct : c'est le chemin que prend l'app
   quand l'étudiant dépose son PDF (ui/docs.js). */
await p.evaluate(async ds => {
  const st = await import('./engine/storage.js');
  for (const d of ds){
    const f = new File([d.octets], d.name, { type:'application/pdf' });
    await st.docPut(d.key, { name:d.name, size:f.size, type:f.type, added:d.added, blob:f });
  }
}, DOCS);
console.log(`suivi écrit        : ${Object.keys(SUIVI).length} clés + ${DOCS.length} documents + le thème`);

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

/* Même principe que `lire()` : la base BRUTE, pas `listDocs()`. On
   compare les octets du PDF eux-mêmes — un nom et une taille intacts
   au-dessus d'un blob vide se liraient comme une réussite. */
const lireDocs = () => p.evaluate(() => new Promise((res, rej) => {
  const rq = indexedDB.open('oc_docs_v1', 1);
  rq.onupgradeneeded = () => { rq.result.createObjectStore('docs'); };
  rq.onerror = () => rej(rq.error);
  rq.onsuccess = () => {
    const db = rq.result;
    let keys = null, vals = null;
    const fini = async () => {
      if (!keys || !vals) return;
      const out = {};
      for (let i = 0; i < keys.length; i++){
        const d = vals[i] || {};
        out[String(keys[i])] = { name:d.name, type:d.type, added:d.added,
          octets: d.blob ? await d.blob.text() : null };
      }
      db.close(); res(out);
    };
    try {
      const st = db.transaction('docs', 'readonly').objectStore('docs');
      const kq = st.getAllKeys(), vq = st.getAll();
      kq.onsuccess = () => { keys = kq.result; fini(); };
      vq.onsuccess = () => { vals = vq.result; fini(); };
      kq.onerror = vq.onerror = () => { db.close(); rej(new Error('idb')); };
    } catch (e) { db.close(); rej(e); }
  };
}));

const avant = await lire();
const malEcrites = Object.keys(SUIVI).filter(k => avant[k] !== SUIVI[k]);
if (malEcrites.length) fail(`le suivi n'a pas été écrit correctement : ${malEcrites.join(', ')}`);
else console.log('relu avant        : les 20 clés sont bien en place ✓');

const docsAvant = await lireDocs();
const docsMal = DOCS.filter(d => !docsAvant[d.key] || docsAvant[d.key].octets !== d.octets);
if (docsMal.length) fail(`les documents n’ont pas été écrits : ${docsMal.map(d => d.key).join(', ')}`);
else console.log(`                    et les ${DOCS.length} documents (oc_docs_v1) ✓`);

/* --- 3. on déploie une version neuve pendant que l'app est installée --- */
const modele = path.join(dir, 'engine/model.js');
await writeFile(modele,
  (await readFile(modele, 'utf8')).replace(/APP_VERSION = '[^']+'/, "APP_VERSION = '9.9.9'"));
const CACHE_NEUF = 'oc-DURABILITE';
const swf = path.join(dir, 'sw.js');
await writeFile(swf,
  (await readFile(swf, 'utf8')).replace(/const CACHE = '[^']+'/, `const CACHE = '${CACHE_NEUF}'`));
console.log(`version publiée   : 9.9.9 (cache ${CACHE_NEUF})`);

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
/* Le module neuf ne suffit PAS à dire qu'une mise à jour a eu lieu.
   `import('./engine/model.js?v=' + Date.now())` porte une chaîne de
   requête : elle rate le cache et part au réseau. Elle rendait donc
   9.9.9 pendant que l'ANCIEN service worker tenait toujours la
   boutique — mesuré, cache resté « oc-v170 ». Or le worker est
   précisément ce qui peut détruire des données pendant une montée de
   version (son `activate` purge). Sans lui, l'étape ⑤ ne prouvait
   qu'une chose : les données survivent à un rechargement.
   On attend donc les DEUX : le module neuf ET le cache neuf. */
const cacheNeuf = () => p.evaluate(c => caches.keys().then(k => k.includes(c)), CACHE_NEUF);
let arrivee = 0, vue = '', neuf = false;
for (let n = 1; n <= 6 && !arrivee; n++){
  await p.evaluate(() => navigator.serviceWorker.getRegistration()
    .then(r => r && r.update()).catch(() => {}));
  await p.reload({ waitUntil:'load' });
  for (let i = 0; i < 20; i++){
    vue = await versionVue();
    neuf = await cacheNeuf();
    if (vue === '9.9.9' && neuf){ arrivee = n; break; }
    await new Promise(r => setTimeout(r, 400));
  }
}
if (!arrivee)
  fail(`la mise à jour n’a pas eu lieu (module : ${vue}, worker neuf : ${neuf ? 'oui' : 'NON'})`
     + ' — le reste ne prouverait rien');
else console.log(`montée de version : 9.9.9 + worker neuf actifs à l'ouverture ${arrivee} ✓`);

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

const docsApres = await lireDocs();
const docsPerdus = [], docsChanges = [];
for (const d of DOCS){
  const a = docsApres[d.key];
  if (!a || a.octets == null) docsPerdus.push(d.key);
  else if (a.octets !== d.octets || a.name !== d.name || a.added !== d.added)
    docsChanges.push(d.key);
}
if (docsPerdus.length)
  fail(`${docsPerdus.length} document(s) PERDU(S) à la mise à jour : ${docsPerdus.join(', ')}`);
if (docsChanges.length)
  fail(`${docsChanges.length} document(s) ALTÉRÉ(S) : ${docsChanges.join(', ')}`);
if (!docsPerdus.length && !docsChanges.length)
  console.log(`                    les ${DOCS.length} documents aussi, octets du PDF compris ✓`);

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
/* Une attente FIXE est une course déguisée : 1800 ms suffisaient tant
   que le worker neuf ne s'installait pas, et plus une fois qu'il le
   fait vraiment. On attend donc l'ÉVÉNEMENT — le suivi relu — pas une
   durée. Le `catch` rend `[]` : un module pas encore chargé n'est pas
   une perte, c'est un tour de boucle. */
let vues = [];
for (let i = 0; i < 40; i++){
  vues = await p.evaluate(async () =>
    (await import('./ui/state.js')).S.companies.map(c => c.name)).catch(() => []);
  if (vues.length >= PISTES.length) break;
  await new Promise(r => setTimeout(r, 400));
}
const attendues = PISTES.map(c => c.name);
const manquantes = attendues.filter(n => !vues.includes(n));
if (manquantes.length) fail(`pistes stockées mais PAS RELUES par l'app : ${manquantes.join(', ')}`);
else console.log(`à l'écran         : ${vues.length} pistes relues (${vues.join(', ')}) ✓`);

/* Les documents par le chemin de l'app. Ça compte double ici :
   `listDocs()` attrape ses erreurs et rend `[]` — une base perdue
   s'afficherait « aucun document » sans un mot, et prouver que les
   octets sont là ne consolerait personne. */
const docsVus = await p.evaluate(async () =>
  (await import('./ui/docs.js')).listDocs().then(l => l.map(d => d.key))).catch(() => []);
const docsAbsents = DOCS.map(d => d.key).filter(k => !docsVus.includes(k));
if (docsAbsents.length)
  fail(`documents stockés mais PAS RELUS par l’app : ${docsAbsents.join(', ')}`);
else console.log(`                    ${docsVus.length} documents relus par listDocs() ✓`);

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

/* La sonde de `oc_kv_v1` ne prouve rien de `oc_docs_v1` : ce sont deux
   lecteurs différents, et c'est justement le second qui manquait. */
await p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.docDel('cv_durab1');
});
const sondeDocs = await lireDocs();
if (sondeDocs.cv_durab1 && sondeDocs.cv_durab1.octets === DOCS[0].octets)
  fail('le contrôle est AVEUGLE aux documents : un PDF effacé ne le fait pas broncher');
else console.log('                    un PDF effacé aussi ✓');

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
