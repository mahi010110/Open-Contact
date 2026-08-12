/* ============================================================
   « J'ai perdu mon téléphone » — la durabilité des données.

   `docs/roadmap.md` §1.4 nomme ce scénario et dit pourquoi il passe
   avant le reste : c'est ce qui détruirait la confiance le plus vite.
   Il était nommé, pas REJOUÉ — aucun fichier ne le tenait. Celui-ci le
   tient, dans les quatre combinaisons que la feuille de route énumère :
   avec et sans mot de passe, avec et sans coffre actif.

   Deux exigences, et la seconde est celle qu'on oublie :

   ① La copie se relit sur un appareil qui n'a JAMAIS vu ces données.
      Le suivi PRIVÉ en fait partie — notes, statuts, historique : c'est
      la seule sortie de l'app où il a le droit de voyager (invariant ①,
      `CLAUDE.md` §2 : la sauvegarde est à moi, pas à mon groupe).
   ② Ça survit au RECHARGEMENT. Restaurer en mémoire et perdre au
      redémarrage serait la panne de `e2e-stockage.mjs` déplacée d'un
      cran : l'app dirait « Restauré ✓ » et mentirait.

   Tout passe par les VRAIS boutons — « Télécharger », puis « Restaurer
   une copie » et sa question. Semer par le moteur et relire par le
   moteur ne prouverait que l'aller-retour de `JSON.parse` ; la leçon
   de `e2e-vecu.mjs` (§8) vaut ici mot pour mot.

   Le second volet est l'autre puce du §1.4 : une montée de version
   depuis les données d'une version PUBLIÉE précédente, jamais depuis un
   état neuf — `oc_data_v2` et `ais_stage_targets_v1` doivent encore se
   lire, et un `.oc` de l'ancien format encore se restaurer.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, ouvrirReglages, SHOTS } from './outils.mjs';
import { writeFile, readFile, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const tmp = await mkdtemp(path.join(tmpdir(), 'oc-perte-'));
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const neuf = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
    hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { ctx, p };
};

/* Le suivi d'un étudiant qui a déjà travaillé : du privé partout (notes,
   statut, historique, prochaine action), une déclaration « j'y suis
   passé » avec son prénom, un contact, un orphelin, une pierre tombale.
   Chacun de ces champs est un endroit où une restauration peut perdre
   quelque chose sans le dire. */
const SEME = [
  { id: 'c1', name: 'Capgemini', city: 'Lille', domain: 'esn', status: 'active',
    notes: 'Rappeler Awa — elle connaît le chef de projet',
    appliedAt: '2026-07-02', nextAction: '2026-08-20', nextActionText: 'Relancer Léa',
    updatedAt: 10, history: [{ d: '2026-07-02', t: 'Candidature envoyée' }],
    contacts: [{ id: 'p1', name: 'Léa Martin', role: 'RH', email: 'lea@capgemini.test' }] },
  { id: 'c2', name: 'Orange Cyberdéfense', city: 'Lyon', domain: 'cyber', status: 'todo',
    updatedAt: 11, contacts: [], vecu: 'stage', vecuQui: 'Awa' }
];
const PROFIL = { name: 'Maheydine B.', email: 'mahey@example.test',
  formation: 'BTS SIO SISR', flags: {},
  templates: [{ id: 't1', name: 'Candidature', subject: 'Candidature spontanée',
                body: 'Bonjour {{prenom}}' }] };

/* ---------- l'appareil qu'on va perdre ---------- */
const { p: A } = await neuf();
await A.goto(base + '/#/moi', { waitUntil: 'load' });
await A.evaluate(async ({ semé, profil }) => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  await st.kvSet(st.DATA_KEY, JSON.stringify(semé));
  await st.kvSet(st.PROFILE_KEY, JSON.stringify(profil));
  await st.kvSet(st.ORPHANS_KEY, JSON.stringify([{ id: 'o1', name: 'Sofiane', email: 'sof@x.test' }]));
  await st.kvSet(st.TOMBS_KEY, JSON.stringify([{ id: 'zz', at: 9 }]));
  /* un CV rangé : il ne voyage pas, et c'est ce que le §4 vérifie */
  await st.docPut('cv_perte', { name: 'CV cyber.pdf', size: 4, type: 'application/pdf',
    added: Date.now(), blob: new Blob([new Uint8Array([37, 80, 68, 70])], { type: 'application/pdf' }) });
}, { semé: SEME, profil: PROFIL });
await A.reload({ waitUntil: 'load' });
await A.waitForSelector('#moiBkDo');

/* la copie sort par le VRAI bouton — « Télécharger », serrure fermée
   puis ouverte (c'est `lockRowHTML`, cf. CLAUDE.md §6) */
const MDP = 'colibri-1789';
async function telecharger(pass){
  if (pass){
    await A.click('#moiBkLock');
    await attendre(A, () => !!document.querySelector('#moiBkPass'), { message: 'le champ de la serrure' });
    await A.fill('#moiBkPass', pass);
  }
  const [dl] = await Promise.all([A.waitForEvent('download'), A.click('#moiBkDo')]);
  let txt = '';
  for await (const c of await dl.createReadStream()) txt += c;
  if (pass && !txt.startsWith('OC2.')) fail('la copie protégée n’est pas chiffrée');
  if (!pass && !txt.startsWith('{')) fail('la copie sans mot de passe n’est pas du JSON lisible');
  const f = path.join(tmp, pass ? 'copie-chiffree.oc' : 'copie-claire.oc');
  await writeFile(f, txt);
  return f;
}
const F_CLAIR = await telecharger(null);
const F_CRYPT = await telecharger(MDP);
console.log('la copie sort par « Télécharger », en clair et chiffrée ✓');

/* ---------- l'appareil neuf : il n'a jamais vu ces données ---------- */
const CODE = '280941';
async function restaurer({ nom, fichier, pass, coffre }){
  const { ctx, p: B } = await neuf();
  await B.goto(base + '/#/moi', { waitUntil: 'load' });

  if (coffre){
    /* un coffre DÉJÀ posé sur l'appareil d'accueil : la restauration
       doit écrire scellé, sinon elle rendrait en clair des données que
       l'utilisateur a demandé de protéger */
    await B.evaluate(async code => {
      const v = await import('./engine/vault.js');
      const st = await import('./engine/storage.js');
      await st.kvInit();
      const { meta, key } = await v.createVault(code, v.makeVaultPhrase(), { iter: 15000 });
      await st.kvSet(st.VAULT_KEY, JSON.stringify(meta));
      st.vaultAttach(key);
      await st.vaultSealAll();
    }, CODE);
    await B.reload({ waitUntil: 'load' });
    await deverrouiller(B);
  }

  await B.goto(base + '/#/moi', { waitUntil: 'load' });
  await ouvrirReglages(B);
  await B.click('#moiRestore');
  /* geste sensible : le coffre redemande le code avant d'ouvrir le sélecteur */
  if (coffre){
    await attendre(B, () => !!document.querySelector('.modal-confirm .pad-k'),
      { message: 'la re-preuve du code' });
    await B.focus('.modal-confirm .x').catch(() => {});
    await B.keyboard.type(CODE);
    await attendre(B, () => !document.querySelector('.modal-confirm .pad-k'),
      { message: 'la re-preuve acceptée' });
  }
  await B.setInputFiles('#moiRestoreFile', fichier);

  if (pass){
    await B.waitForSelector('#rsPass', { timeout: 10000 });
    await B.fill('#rsPass', pass);
    await B.click('.modal .btn-primary');
  }
  /* la question dit ce qu'on ne peut PAS deviner : combien dans le
     fichier, combien on en a (CLAUDE.md §6 — « une porte se décide ») */
  await attendre(B, () => !!document.querySelector('.modal-confirm .btn-danger'),
    { message: 'la question de restauration' });
  const q = (await B.evaluate(() => document.querySelector('.cf-msg')?.innerText || ''))
    .replace(/\s+/g, ' ');
  if (!/2 pistes/.test(q) || !/0 piste/.test(q))
    fail(`${nom} : la question ne dit pas les deux comptes — « ${q} »`);
  await B.click('.modal-confirm .btn-danger');

  const lu = async () => B.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    const c1 = S.companies.find(c => c.name === 'Capgemini') || {};
    const c2 = S.companies.find(c => c.name === 'Orange Cyberdéfense') || {};
    return {
      pistes: S.companies.length,
      notes: c1.notes || '', statut: c1.status || '', histoire: (c1.history || []).length,
      prochaine: c1.nextActionText || '', contact: (c1.contacts || [])[0]?.email || '',
      vecu: c2.vecu || '', qui: c2.vecuQui || '',
      profil: (S.profile.name || '') + '/' + (S.profile.email || ''),
      modeles: (S.profile.templates || []).length,
      orphelins: (S.orphans || []).length, tombs: (S.tombs || []).length
    };
  });
  await attendre(B, async () => (await import('./ui/state.js')).S.companies.length === 2,
    { message: 'les pistes restaurées' });

  /* ② ce qui compte : la MÊME lecture après un rechargement complet */
  await B.reload({ waitUntil: 'load' });
  if (coffre) await deverrouiller(B);
  await attendre(B, async () => (await import('./ui/state.js')).S.companies.length > 0,
    { message: 'les pistes relues du disque' });
  const r = await lu();

  const attendu = {
    pistes: 2, notes: 'Rappeler Awa — elle connaît le chef de projet', statut: 'active',
    histoire: 1, prochaine: 'Relancer Léa', contact: 'lea@capgemini.test',
    vecu: 'stage', qui: 'Awa', profil: 'Maheydine B./mahey@example.test',
    modeles: 1, orphelins: 1, tombs: 1
  };
  for (const [k, v] of Object.entries(attendu))
    if (r[k] !== v) fail(`${nom} : « ${k} » perdu au rechargement — ${JSON.stringify(r[k])} au lieu de ${JSON.stringify(v)}`);

  /* et sous coffre, ce qui est sur le disque est SCELLÉ : restaurer ne
     doit pas déshabiller des données protégées */
  if (coffre){
    /* on lit les OCTETS du disque, pas ce que le moteur veut bien rendre :
       `kvGet` déscellerait tout seul et ne prouverait rien */
    const brut = await B.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const o = indexedDB.open('oc_kv_v1', 1);
        o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error);
      });
      const v = await new Promise((res, rej) => {
        const rq = db.transaction('kv').objectStore('kv').get('oc_data_v3');
        rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
      });
      return String(v || '').slice(0, 5);
    });
    if (brut !== 'OCV1.')
      fail(`${nom} : la copie restaurée s’écrit EN CLAIR sous un coffre actif (« ${brut} »)`);
  }
  await ctx.close();
  console.log(`   ${nom} : suivi privé, déclaration, profil et bac relus après rechargement ✓`);
}

async function deverrouiller(p){
  /* Sonder `.lock` l'instant d'après le rechargement rendrait `null` — on
     repartirait sans déverrouiller, et l'échec tomberait plus loin sur une
     tout autre ligne. On LAISSE le temps à l'écran de code de paraître ;
     s'il ne vient pas (pas de coffre), on passe. */
  const vu = await p.waitForSelector('.lock', { timeout: 8000 }).catch(() => null);
  if (!vu) return;
  await p.keyboard.type(CODE);
  await p.waitForSelector('.lock', { state: 'detached', timeout: 15000 });
}

console.log('« j’ai perdu mon téléphone » — quatre reprises :');
await restaurer({ nom: 'en clair, sans coffre', fichier: F_CLAIR, pass: null, coffre: false });
await restaurer({ nom: 'chiffrée, sans coffre', fichier: F_CRYPT, pass: MDP, coffre: false });
await restaurer({ nom: 'en clair, coffre actif', fichier: F_CLAIR, pass: null, coffre: true });
await restaurer({ nom: 'chiffrée, coffre actif', fichier: F_CRYPT, pass: MDP, coffre: true });

/* ---------- 4. ce que la copie n'emporte PAS, et qui doit se savoir ----------
   Les PDF vivent dans `oc_docs_v1` (CONTRAT.md), pas dans le `.oc` :
   `fullPayload` ne les connaît pas. Ce n'est pas un oubli de ce fichier
   — c'est la limite réelle du produit, et elle est ÉPINGLÉE ici pour
   deux raisons. Elle est invisible au moment où elle coûte (on ouvre le
   composeur trois semaines plus tard, le CV n'est pas là), et le jour où
   quelqu'un fera voyager les documents, ce contrôle rougira et forcera
   la décision au lieu de la laisser se prendre toute seule.
   `parseInput` refuse au-delà de 4 Mo (« troplourd ») : y glisser des
   PDF de 8 Mo produirait une copie que l'app ne sait plus relire. */
{
  const { ctx, p: V } = await neuf();
  await V.goto(base + '/#/moi', { waitUntil: 'load' });
  const dans = await V.evaluate(async fichier => {
    const { parseInput } = await import('./engine/exchange.js');
    const obj = await parseInput(fichier);
    return { clefs: Object.keys(obj), docs: obj.docs === undefined ? 'absent' : 'présent' };
  }, await readFile(F_CLAIR, 'utf8'));
  if (dans.docs !== 'absent')
    fail('la copie emporte désormais les documents : décider et mettre à jour CONTRAT.md §.oc');
  console.log('   limite connue : la copie porte ' + dans.clefs.join(', ')
    + ' — le CV reste sur l’appareil ✓');
  await ctx.close();
}

/* ---------- 5. la montée de version, depuis des données PUBLIÉES ----------
   L'autre puce du §1.4 : on ne repart jamais d'un état neuf. Un appareil
   qui tourne encore sur `oc_data_v2` (ou sur `ais_stage_targets_v1`, la
   toute première clé) doit retrouver ses pistes sans un geste, et la
   migration doit ÉCRIRE en v3 pour ne pas se rejouer à chaque ouverture. */
for (const [nom, cle] of [['oc_data_v2', 'OLD_V2'], ['ais_stage_targets_v1', 'OLD_V1']]){
  const { ctx, p: L } = await neuf();
  await L.goto(base, { waitUntil: 'load' });
  await L.evaluate(async ({ cle }) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvDel(st.DATA_KEY);
    await st.kvSet(st[cle], JSON.stringify([
      { id: 'v', name: 'Ancienne Piste', city: 'Roubaix', notes: 'note d’avant' }]));
  }, { cle });
  await L.reload({ waitUntil: 'load' });
  await attendre(L, async () => (await import('./ui/state.js')).S.companies.length === 1,
    { message: 'la piste migrée depuis ' + nom });
  const migre = await L.evaluate(async () => {
    const st = await import('./engine/storage.js');
    const { S } = await import('./ui/state.js');
    return { nom: S.companies[0].name, notes: S.companies[0].notes || '',
             ecrit: !!(await st.kvGet(st.DATA_KEY)) };
  });
  if (migre.nom !== 'Ancienne Piste') fail(`${nom} : la piste ne remonte pas — ${migre.nom}`);
  if (migre.notes !== 'note d’avant') fail(`${nom} : la note d’avant est perdue`);
  if (!migre.ecrit) fail(`${nom} : la migration ne s’écrit pas en v3, elle se rejouera`);
  await ctx.close();
  console.log(`   montée depuis ${nom} : la piste et sa note remontent, et s’écrivent en v3 ✓`);
}

/* un `.oc` du format le plus ancien qu'on ait publié — un simple tableau,
   sans enveloppe : `parseInput` doit encore le prendre (CONTRAT.md) */
{
  const legacy = path.join(tmp, 'copie-ancienne.oc');
  await writeFile(legacy, JSON.stringify([{ id: 'a', name: 'Piste Héritée', city: 'Lens' }]));
  const { ctx, p: L } = await neuf();
  await L.goto(base + '/#/moi', { waitUntil: 'load' });
  await ouvrirReglages(L);
  await L.click('#moiRestore');
  await L.setInputFiles('#moiRestoreFile', legacy);
  await attendre(L, () => !!document.querySelector('.modal-confirm .btn-danger'),
    { message: 'la question sur un .oc hérité' });
  await L.click('.modal-confirm .btn-danger');
  await attendre(L, async () => (await import('./ui/state.js')).S.companies.length === 1,
    { message: 'la piste héritée' });
  const n = await L.evaluate(async () => (await import('./ui/state.js')).S.companies[0].name);
  if (n !== 'Piste Héritée') fail('un .oc du format d’origine ne se restaure plus : ' + n);
  await L.screenshot({ path: SHOTS + '/90-perte-heritee.png' });
  await ctx.close();
  console.log('   un .oc du format d’origine (tableau nu) se restaure encore ✓');
}

if (errors.length){
  console.log('Erreurs console :');
  errors.slice(0, 8).forEach(e => console.log('  ' + e.slice(0, 240)));
  process.exitCode = 1;
} else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E perte : ÉCHEC' : 'E2E perte : OK');
