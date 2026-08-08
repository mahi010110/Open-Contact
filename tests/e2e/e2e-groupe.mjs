/* ============================================================
   « Mon groupe » — la trace, pas la liste.

   CE QUE CE FICHIER GARDE, ET POURQUOI IL A MAIGRI. Première version
   du lot : quatre feuilles neuves et une porte de plus sur
   « Échanger ». Le garde vérifiait consciencieusement chacune — donc
   il verrouillait la complexité au lieu de la contester. Un test vert
   sur un écran qui n'aurait pas dû exister ne prouve rien.

   La règle qui en sort et qui vaut pour la suite : un lot se mesure
   AUSSI en surface ajoutée. Ce fichier compte donc les feuilles et les
   portes, et échoue si elles reviennent — c'est le seul contrôle qui
   protège l'écran d'accueil d'un « juste une porte de plus ».

   LE CONTRÔLE N°1 RESTE L'INVARIANT. Un membre du groupe est la vie
   privée de QUELQU'UN D'AUTRE : donner des pistes à Marco ne doit
   jamais lui donner le carnet de Léa.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base, { waitUntil: 'load' });
await attendre(page, async () => !!(await import('./ui/state.js')).S.profile,
  'le profil n’est jamais chargé');

/* ---------- 0. LA SURFACE : ce lot n'a le droit qu'à un écran ----------
   Le budget est tenu à la main, comme les plafonds de sobriété. Le
   monter demande de dire ici pourquoi — c'est ce qui empêche une
   fonctionnalité de reprendre du terrain une feuille à la fois. */
const BUDGET = {
  /* DEUX, et le second n'est pas une fonctionnalité :
     ① « Demander à … » — le seul écran neuf du quotidien, et le seul
        qui paie : il transforme « Léa y a fait son stage » en geste.
     ② « Réglages · Mon groupe » — une obligation, pas une envie. L'app
        stocke les coordonnées de camarades qui n'ont jamais vu son
        écran ; pouvoir les regarder et les effacer n'est pas
        négociable. Elle vit avec « Protection » et « Mes appareils »,
        loin du flux quotidien, et disparaît quand le groupe est vide.
     Toute TROISIÈME feuille devra se justifier ici, en toutes lettres. */
  feuilles: 2,
  /* « Échanger » garde ses deux verbes et sa porte « Partage en
     groupe » — exactement ce qu'il avait avant ce lot. */
  portesEchanger: 1
};
const surface = await page.evaluate(async () => {
  const src = await (await fetch('./ui/groupe.js')).text();
  const ech = await (await fetch('./ui/echanger.js')).text();
  return {
    feuilles: (src.match(/openSheet\(\{/g) || []).length,
    portes: (ech.match(/class="pcard moi-door"/g) || []).length
  };
});
if (surface.feuilles > BUDGET.feuilles)
  fail(`${surface.feuilles} feuilles dans ui/groupe.js (budget ${BUDGET.feuilles}) — ` +
       `la fonctionnalité reprend du terrain. Fondre dans un écran existant, ` +
       `ou monter le budget ICI en disant pourquoi.`);
if (surface.portes > BUDGET.portesEchanger)
  fail(`${surface.portes} portes sur « Échanger » (budget ${BUDGET.portesEchanger}) — ` +
       `l'écran d'accueil de l'échange n'est pas un menu.`);
if (!process.exitCode)
  console.log(`surface : ${surface.feuilles} feuille · ${surface.portes} porte sur Échanger ✓`);

/* ---------- 1. l'invariant, par le VRAI chemin ----------
   Appeler le moteur avec un groupe fabriqué sur place ne prouverait
   que son innocence. Une fuite viendrait d'un ÉCRAN, qui a `S.groupe`
   sous la main : on remplit le vrai groupe, on donne vraiment, et on
   lit les octets qui sortent. */
const reel = await page.evaluate(async () => {
  const { S, saveGroupe, saveData, saveProfile } = await import('./ui/state.js');
  const { normalizeMembre } = await import('./engine/groupe.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.profile.name = 'Awa Diallo';
  S.profile.formation = 'BTS SIO 2ᵉ année';
  S.profile.email = 'awa@moi.test';
  S.profile.phone = '06 39 98 12 34';
  S.profile.letter = 'ma lettre de motivation';
  saveProfile();
  S.groupe = [normalizeMembre({ prenom: 'Léa', nom: 'Martin',
    email: 'lea.martin@promo.test', phone: '0639980011', note: 'très réactive' })];
  saveGroupe();
  S.companies = [normalizeCompany({ name: 'Adrastia Systèmes', city: 'Toulouse',
    vecu: 'stage', status: 'active', notes: 'mon suivi' })];
  saveData();
  const donnerEtCopier = async () => {
    let txt = '';
    navigator.clipboard.writeText = t => { txt = t; return Promise.resolve(); };
    const { openDonner } = await import('./ui/donner.js');
    openDonner();
    await new Promise(r => setTimeout(r, 250));
    const etat = document.getElementById('dnMoi').getAttribute('aria-pressed');
    const dit = document.getElementById('dnMoiQ').textContent;
    const cache = document.getElementById('dnMoiQ').hidden;
    document.getElementById('dnFile').click();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('dnCopy').click();
    await new Promise(r => setTimeout(r, 250));
    document.querySelectorAll('.overlay .x').forEach(x => x.click());
    await new Promise(r => setTimeout(r, 200));
    return { txt, etat, dit, cache };
  };
  const nu = await donnerEtCopier();
  S.profile.flags.joindreProfil = true;
  const avec = await donnerEtCopier();
  return { nu, avec };
});
/* le carnet d'autrui ne sort par aucun des deux */
for (const [quoi, r] of [['sans mon profil', reel.nu], ['avec mon profil', reel.avec]])
  for (const trace of ['lea.martin@promo.test', '0639980011', 'très réactive', 'Martin', 'groupe'])
    if (r.txt.includes(trace)) fail(`« ${trace} » sort ${quoi} — LE CARNET D’AUTRUI FUIT`);
if (!reel.nu.txt.includes('Adrastia')) fail('le fichier ne contient même pas la piste — test faussé');
if (!process.exitCode) console.log('donner pour de vrai : la piste part, le groupe reste ✓');

/* ---------- 2. la case : décochée par défaut, et elle dit ce qu'elle emporte ---------- */
if (reel.nu.etat !== 'false' || !reel.nu.cache)
  fail('« Joindre mon profil » est coché d’office — un partage reste anonyme par défaut');
if (JSON.parse(reel.nu.txt).card) fail('mon profil part alors que la case est décochée');
const carte = JSON.parse(reel.avec.txt).card;
if (!carte) fail('cocher « Joindre mon profil » ne joint rien — la capacité est morte');
else if (carte.prenom !== 'Awa') fail('le profil joint n’est pas le mien : ' + JSON.stringify(carte));
/* trois champs, fixés par le produit : ni le téléphone, ni la lettre */
else if (Object.keys(carte).sort().join() !== 'email,formation,prenom')
  fail('ce qui part de moi n’est pas le jeu fixe : ' + Object.keys(carte).join());
else if (!reel.avec.dit.includes('Awa') || !reel.avec.dit.includes('awa@moi.test'))
  fail('la ligne n’annonce pas ce qui part : « ' + reel.avec.dit + ' »');
else console.log(`la case dit « ${reel.avec.dit} » et n’emporte que ça ✓`);

/* ---------- 3. le camarade entre tout seul, dans l'aperçu qui existe déjà ---------- */
const recu = await page.evaluate(async raw => {
  const { S, saveGroupe } = await import('./ui/state.js');
  const { parseInput } = await import('./engine/exchange.js');
  const { mergePreviewInto } = await import('./ui/recevoir.js');
  const { openSheet } = await import('./ui/dom.js');
  S.companies = [];
  S.groupe = []; saveGroupe();
  const sh = openSheet({ title: 'x' });
  mergePreviewInto(sh, await parseInput(raw), {});
  await new Promise(r => setTimeout(r, 200));
  const avant = S.groupe.length;              /* l'aperçu n'écrit rien */
  const vu = document.querySelector('.rc-lines').innerText.replace(/\s+/g, ' ').trim();
  const feuilles = document.querySelectorAll('.overlay:not(.ov-out)').length;
  [...document.querySelectorAll('.modal-f .btn')].pop().click();
  await new Promise(r => setTimeout(r, 300));
  const annulable = !!document.querySelector('.undo-bar, [class*="undo"]');
  return { avant, vu, feuilles, annulable, entre: S.groupe.map(m => m.prenom).join() };
}, reel.avec.txt);
if (recu.avant !== 0) fail('l’aperçu a écrit dans le groupe avant validation — invariant ② cassé');
if (recu.feuilles !== 1) fail(`recevoir un profil ouvre ${recu.feuilles} feuilles — une seule porte d’entrée`);
if (!/Awa/.test(recu.vu)) fail('l’aperçu n’annonce pas le profil joint : ' + recu.vu);
if (recu.entre !== 'Awa') fail('fusionner n’ajoute pas la personne au groupe : ' + recu.entre);
if (!recu.annulable) fail('aucune barre « Annuler » après avoir rangé quelqu’un');
else console.log('reçu : une feuille, l’aperçu annonce Awa, la fusion la range, Annuler derrière ✓');

/* ---------- 4. LE PAIEMENT : le prénom mène à la personne ---------- */
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const { normalizeCompany } = await import('./engine/model.js');
  const { normalizeMembre } = await import('./engine/groupe.js');
  const { S, saveGroupe } = await import('./ui/state.js');
  S.groupe = [normalizeMembre({ prenom: 'Léa', email: 'lea@promo.test' })];
  saveGroupe();
  /* la piste portée est volontairement la MOINS bien classée par les
     autres critères : sans e-mail, sans ville, dernière alphabétiquement */
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    normalizeCompany({ name: 'Aalto Cloud', city: 'Lyon', status: 'todo',
      contacts: [{ name: 'RH', email: 'rh@aalto.test' }] }),
    normalizeCompany({ name: 'Zephyr SI', status: 'todo', vecu: 'stage', vecuQui: 'Léa' })
  ]));
  location.hash = '#aujourdhui';
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2,
  'les pistes ne sont pas chargées');
await page.waitForTimeout(400);
const debut = await page.evaluate(() =>
  [...document.querySelectorAll('.act-start')].map(r => ({
    nom: r.querySelector('.act-verb').textContent.trim(),
    pourquoi: (r.querySelector('.act-vecu') || {}).textContent || ''
  })));
if (!debut.length) fail('« Par où commencer » n’affiche rien');
else if (debut[0].nom !== 'Zephyr SI')
  fail('la piste portée n’est pas en tête : ' + debut.map(d => d.nom).join(' · '));
else if (!/Léa/.test(debut[0].pourquoi))
  fail('la ligne ne dit pas POURQUOI elle est première : « ' + debut[0].pourquoi + ' »');
else console.log(`en tête : ${debut[0].nom}, parce que « ${debut[0].pourquoi} » ✓`);

const geste = await page.evaluate(async () => {
  const { openFiche } = await import('./ui/fiche.js');
  const { S } = await import('./ui/state.js');
  openFiche(S.companies.find(c => c.name.startsWith('Zephyr')));
  await new Promise(r => setTimeout(r, 250));
  const b = document.querySelector('button.fi-vecu');
  if (!b) return { tapable: false, lu: (document.querySelector('.fi-vecu') || {}).innerText || '' };
  b.click();
  await new Promise(r => setTimeout(r, 250));
  return { tapable: true, mot: (document.querySelector('.gr-mot') || {}).innerText || '',
           boutons: [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f .btn')]
             .map(x => x.innerText.trim()) };
});
if (!geste.tapable)
  fail('le bandeau ne mène nulle part alors que Léa est dans le groupe : « ' + geste.lu + ' »');
/* La phrase se lit à voix haute : vérifiée mot pour mot. Un `court` en
   3ᵉ personne réutilisé après « tu » donnait « tu y a fait son stage ». */
else if (geste.mot.replace(/\s+/g, ' ').trim() !==
         'Salut Léa, tu y as fait ton stage chez Zephyr SI ? '
         + 'Je postule là-bas — tu peux me dire à qui écrire ?')
  fail('le message tout prêt n’est pas la phrase attendue : ' + geste.mot);
/* « Écrire » n'est pas le bouton principal : une demande de vive voix
   aboutit 34× plus souvent, et une promo se croise en cours. */
else if (!/Copier/.test(geste.boutons[geste.boutons.length - 1] || ''))
  fail('le bouton principal n’est pas « Copier » : ' + JSON.stringify(geste.boutons));
else console.log(`le bandeau mène à « ${geste.mot.slice(0, 42)}… » ✓`);
await page.screenshot({ path: SHOTS + '/94-groupe-demander.png' });

/* ---------- 5. on ne devine jamais entre deux homonymes ---------- */
const doute = await page.evaluate(async () => {
  const { S, saveGroupe } = await import('./ui/state.js');
  const { normalizeMembre } = await import('./engine/groupe.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  S.groupe.push(normalizeMembre({ prenom: 'Léa', nom: 'Bonnet', email: 'lea.b@promo.test' }));
  saveGroupe();
  await new Promise(r => setTimeout(r, 150));
  const { openFiche } = await import('./ui/fiche.js');
  openFiche(S.companies.find(c => c.name.startsWith('Zephyr')));
  await new Promise(r => setTimeout(r, 250));
  return { tapable: !!document.querySelector('button.fi-vecu'),
           lu: (document.querySelector('.fi-vecu') || {}).innerText || '' };
});
if (doute.tapable)
  fail('deux « Léa » et l’app en choisit une — elle écrirait au mauvais camarade');
else if (!/Léa/.test(doute.lu)) fail('le bandeau a disparu au lieu de rester du texte : ' + doute.lu);
else console.log('deux homonymes : le bandeau redevient du texte, personne n’est deviné ✓');

/* ---------- 6. « Échanger » est rendu tel qu'on l'avait laissé ---------- */
const echanger = await page.evaluate(async () => {
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  location.hash = '#echanger';
  await new Promise(r => setTimeout(r, 400));
  const v = document.getElementById('view-echanger');
  return { portes: [...v.querySelectorAll('.moi-door')].map(b => b.innerText.trim()),
           heros: [...v.querySelectorAll('.hero')].map(b => b.innerText.trim()) };
});
if (echanger.portes.length !== 1 || !/Partage en groupe/.test(echanger.portes[0]))
  fail('« Échanger » a gagné une porte : ' + JSON.stringify(echanger.portes));
else console.log(`« Échanger » : ${echanger.heros.join(' · ')} + ${echanger.portes[0]} ✓`);

/* ---------- 7. voir et effacer les données d'autrui, dans les Réglages ---------- */
const reglages = await page.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  const avant = S.groupe.length;
  const { openGroupeReglages } = await import('./ui/groupe.js');
  openGroupeReglages();
  await new Promise(r => setTimeout(r, 300));
  const lignes = [...document.querySelectorAll('.gr-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim());
  const petites = [...document.querySelectorAll('.gr-row')]
    .map(e => Math.round(e.getBoundingClientRect().height)).filter(h => h < 44);
  /* la poubelle au survol existe aussi au doigt : on efface par elle */
  document.querySelector('.gr-w .hov-del').click();
  await new Promise(r => setTimeout(r, 400));
  return { avant, apres: S.groupe.length, lignes, petites,
           annulable: !!document.querySelector('.undo-bar, [class*="undo"]') };
});
if (reglages.lignes.length !== reglages.avant)
  fail(`${reglages.lignes.length} lignes pour ${reglages.avant} personnes`);
if (reglages.petites.length) fail('lignes sous 44 px au doigt : ' + reglages.petites.join(', '));
if (reglages.apres !== reglages.avant - 1) fail('effacer quelqu’un ne l’efface pas');
if (!reglages.annulable) fail('effacer quelqu’un n’offre pas d’annuler');
else console.log(`Réglages : ${reglages.lignes[0]} · effaçable et annulable ✓`);
await page.screenshot({ path: SHOTS + '/95-groupe-reglages.png' });

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E groupe : ÉCHEC' : 'E2E groupe : OK');
