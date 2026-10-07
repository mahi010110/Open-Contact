/* ============================================================
   Les amis — donner son profil, garder ceux qu'on reçoit
   (docs/reseau.md, lot 2)

   Un ami est quelqu'un dont tu as le profil : son nom et son parcours.
   Ce qu'il rapporte se lit sur TES pistes — « Karim y est en
   alternance » —, pas dans un écran à visiter.

   ① LA FUITE D'ABORD, depuis l'état réel de l'app et par les vrais
     boutons : « Mon QR » (son texte copié) ne porte que l'identifiant,
     le nom et le parcours — ni adresse, ni formation, ni pistes, ni
     suivi, et JAMAIS le profil d'un ami ; « Donner » ne fait sortir
     aucun ami ;
   ② LE PARCOURS SE JOUE À TROIS (§8, règle 4) — Karim → Inès → Sofia :
     l'aperçu avant (« dans tes pistes »), « Ajouter Karim », puis
     « Karim y est en alternance » sur la fiche (et le message tout
     prêt), dans la barre, dans « Aujourd'hui » ; le profil d'Inès
     donné à Sofia n'emporte pas Karim ;
   ③ redonner à jour remplace, ne double jamais ; redonner pareil ne
     propose rien ; son propre QR ne s'ajoute pas ;
   ④ une entreprise du parcours d'un ami devient une piste d'un tap ;
   ⑤ retirer un ami : le bandeau part, « Annuler » le rend ; tout
     survit à un rechargement ;
   ⑥ sans nom, « Mon QR » ouvre le profil sur le nom au lieu de
     s'expliquer ;
   ⑦ pouce et poste, clair et sombre, et à 320 px texte doublé : rien
     ne déborde, aucun nom n'est coupé.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* Karim a tout ce qui ne doit PAS partir : une adresse, un téléphone,
   une formation, des pistes avec notes et contacts — et une amie, Léa,
   dont le profil ne se repartage jamais. */
const KARIM = {
  name: 'Karim Benali', email: 'karim@prive.test', phone: '0611223344', formation: 'BTS SIO', ecole: 'Lycée Baggio',
  ville: 'Lille', recherche: 'alternance',
  parcours: [{ id: 'k1', entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', fin: '' },
             { id: 'k2', entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '2024-08' }],
  amis: [{ id: 'LeaLeaLeaLeaLeaLea01', nom: 'Léa Durand', parcours: [{ entreprise: 'Wavestone', quoi: 'stage', debut: '', fin: '' }] }]
};
const PISTES_KARIM = [
  { id: 'kp', name: 'Secret Corp', city: 'Lille', status: 'reply', notes: 'note très privée',
    contacts: [{ id: 'kc', name: 'Julie Privée', email: 'julie@secret.test' }], updatedAt: 2 }];
const INES = { name: 'Inès Martin', formation: 'BTS SIO', recherche: 'alternance', email: 'ines@exemple.test' };
const PISTES_INES = [
  { id: 'a', name: 'Advens', city: 'Lille', status: 'todo', updatedAt: 5 },
  { id: 'c', name: 'AZTEK SAS', city: 'Roubaix', status: 'todo', updatedAt: 3,
    contacts: [{ id: 't', name: 'Julie Marchand', email: 'julie@aztek.test' }] }
];

async function ecran(vp, touch, profil, pistes, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  /* ce qui sort par « Copier » / « Texte » : on le lit à la sortie du vrai bouton */
  await ctx.addInitScript(() => {
    window.__copie = [];
    const garder = async t => { window.__copie.push(String(t)); };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: garder }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(6000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/echanger', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [pistes, profil]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(350);
  return { ctx, p };
}
const dessus = p => p.evaluate(() => { const o = [...document.querySelectorAll('.overlay')]; return o[o.length - 1]?.querySelector('.mh-t')?.textContent || ''; });
const fermerTout = async p => {
  for (let i = 0; i < 6; i++){
    const n = await p.evaluate(() => document.querySelectorAll('.overlay').length);
    if (!n) break;
    await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-h button.x').click());
    await p.waitForTimeout(250);
  }
};
/* « Mon QR » par le vrai chemin : Échanger → Amis → Mon QR → Copier */
/* la barre « Annuler » d'un geste précédent couvre le bas de l'écran
   trente secondes : on la referme comme on le ferait, par sa croix */
const sansAnnuler = async p => {
  if (await p.evaluate(() => { const x = document.querySelector('.undo-bar .bar-x'); if (x) x.click(); return !!x; }))
    await p.waitForTimeout(320);
};
async function monProfilCopie(p){
  await fermerTout(p);
  await sansAnnuler(p);
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForSelector('#ecAmis');
  await p.click('#ecAmis');
  await p.waitForSelector('#amMonQR');
  await p.click('#amMonQR');
  await p.waitForSelector('#mqCopier');
  await p.waitForSelector('.qr-wrap svg');
  await p.evaluate(() => { window.__copie = []; });
  await p.click('#mqCopier');
  await p.waitForTimeout(150);
  const txt = await p.evaluate(() => window.__copie.at(-1) || '');
  const bouton = await p.evaluate(() => document.querySelector('#mqCopier').textContent.trim());
  return { txt, bouton };
}
/* recevoir un profil par le vrai chemin : Amis → Scanner → Texte → Lire */
async function recevoirProfil(p, txt){
  await fermerTout(p);
  await sansAnnuler(p);
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForSelector('#ecAmis');
  await p.click('#ecAmis');
  await p.waitForSelector('#amScan');
  await p.click('#amScan');
  await p.waitForSelector('#rcTexte');
  if (await p.evaluate(() => !!document.querySelector('#rcCode')))
    fail('le scanner ouvert depuis « Amis » propose un code de rendez-vous — un QR de profil n’en affiche aucun');
  await p.click('#rcTexte');
  await p.waitForSelector('#rcTxt');
  await p.fill('#rcTxt', txt);
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-f .btn-primary').click());
  await p.waitForTimeout(400);
}
const decoder = (p, txt) => p.evaluate(async t => {
  const { decodeOCA, extraireOCA } = await import('./engine/exchange.js');
  return decodeOCA(extraireOCA(t));
}, txt);
const amisStockes = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return (JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}').amis || []).map(a => a.nom);
});
const bandeaux = p => p.evaluate(() => [...document.querySelectorAll('.overlay .fi-vecu')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
const ouvrirFiche = async (p, id) => {
  await fermerTout(p);
  await p.evaluate(async i => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === i || c.name === i)); }, id);
  await p.waitForTimeout(450);
};

/* ---------- ① la fuite d'abord ---------- */
const K = await ecran({ width: 390, height: 844 }, true, KARIM, PISTES_KARIM);
const { txt: profilKarim, bouton } = await monProfilCopie(K.p);
if (!profilKarim.includes('OCA1.')) fail('« Copier » ne donne pas le profil : ' + profilKarim.slice(0, 80));
if (!/Recevoir › Texte/.test(profilKarim)) fail('le texte copié ne dit pas où le coller');
if (!/Copié/.test(bouton)) fail('« Copier » ne dit pas qu’il a copié, là où l’on a touché : ' + bouton);
await K.p.screenshot({ path: `${SHOTS}/99-amis-mon-qr-pouce.png` });
{
  const d = await decoder(K.p, profilKarim);
  const cles = Object.keys(d).sort().join(',');
  /* depuis le lot 3, la clé PUBLIQUE de sa boîte aux lettres (où ses amis
     pourront lui demander quelqu'un) — jamais la privée */
  if (cles !== 'cle,id,kind,nom,parcours,v') fail('le profil donné porte d’autres champs : ' + cles);
  const brut = JSON.stringify(d);
  const boite = await K.p.evaluate(async () => {
    const st = await import('./engine/storage.js');
    return JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}').boite || null;
  });
  if (!boite || d.cle !== boite.pub) fail('le QR ne porte pas la clé de la boîte née avec lui');
  if (boite && brut.includes(boite.priv)) fail('la clé PRIVÉE de la boîte sort dans le QR');
  for (const x of ['karim@prive.test', '0611223344', 'BTS SIO', 'Baggio', 'Lille', 'Secret Corp', 'note très privée',
                   'Julie', 'Léa', 'Wavestone', 'LeaLeaLea', 'reply', 'alternance"', 'k1'])
    if (x !== 'alternance"' && brut.includes(x)) fail(`le profil donné laisse sortir « ${x} »`);
  if (d.parcours.map(e => e.entreprise).join() !== 'Aztek,Quick') fail('parcours donné : ' + JSON.stringify(d.parcours));
  /* ce qui s'affiche sous le QR est exactement ce qui part */
  const dit = await K.p.evaluate(() => document.querySelector('#mqDonne').textContent.replace(/\s+/g, ' ').trim());
  if (dit !== 'Karim Benali Alternance chez Aztek · Emploi chez Quick') fail('sous le QR : « ' + dit + ' »');
}
console.log('① « Mon QR » ne porte que l’identifiant, le nom, le parcours et la clé publique — ni suivi, ni ami ✓');
/* « Donner » (texte), depuis l'état réel : aucun ami ne sort */
await fermerTout(K.p);
await K.p.click('#ecGive');
await K.p.waitForSelector('#dnText');
await K.p.evaluate(() => { window.__copie = []; });
await K.p.click('#dnText');
await K.p.waitForTimeout(250);
{
  const sortie = await K.p.evaluate(() => window.__copie.join('\n'));
  if (!sortie.includes('Secret Corp')) fail('« Donner → Texte » n’a rien produit : la mesure ne mesure rien');
  if (/Léa|Wavestone|amis|amiId|LeaLea|Aztek|Quick/.test(sortie)) fail('un partage de pistes laisse sortir les amis ou le parcours : ' + sortie.slice(0, 200));
}
console.log('① « Donner » ne fait sortir aucun ami ✓');

/* ---------- ② Karim → Inès ---------- */
const I = await ecran({ width: 390, height: 844 }, true, INES, PISTES_INES);
await recevoirProfil(I.p, profilKarim);
if (await dessus(I.p) !== 'Karim Benali') fail('l’aperçu ne dit pas qui : ' + await dessus(I.p));
{
  const lignes = await I.p.evaluate(() => [...document.querySelectorAll('.am-par .pick')].map(x =>
    x.querySelector('b').textContent.trim() + ' | ' + x.querySelector('.pk-s').textContent.replace(/\s+/g, ' ').trim()));
  if (lignes[0] !== 'Aztek | dans tes pistes · Alternance · depuis 2025') fail('l’aperçu ne montre pas ce que Karim rapporte : ' + JSON.stringify(lignes));
  if (lignes[1] !== 'Quick | Emploi · 2024') fail('ligne Quick : ' + lignes[1]);
  if ((await amisStockes(I.p)).length) fail('l’ami est enregistré AVANT « Ajouter » (invariant ②)');
}
await I.p.screenshot({ path: `${SHOTS}/99-amis-apercu-pouce.png` });
const ajout = await I.p.evaluate(() => document.querySelector('#amAjouter')?.textContent.trim());
if (ajout !== 'Ajouter Karim') fail('le geste : ' + ajout);
await I.p.click('#amAjouter');
await I.p.waitForTimeout(400);
if ((await amisStockes(I.p)).join() !== 'Karim Benali') fail('Karim n’est pas dans les amis : ' + await amisStockes(I.p));
if (!await I.p.evaluate(() => !!document.querySelector('.undo-bar'))) fail('pas d’« Annuler » après l’ajout');
await I.p.waitForSelector('#amListe [data-ami]');
console.log('② l’aperçu passe avant, montre « dans tes pistes », puis « Ajouter Karim » ✓');

/* la fiche AZTEK SAS dit Karim, et le message est prêt */
await ouvrirFiche(I.p, 'c');
if ((await bandeaux(I.p))[0] !== 'Karim y est en alternance') fail('fiche AZTEK SAS : ' + JSON.stringify(await bandeaux(I.p)));
await I.p.screenshot({ path: `${SHOTS}/99-amis-fiche-pouce.png` });
await I.p.click('#fiVecu');
await I.p.waitForTimeout(350);
if (await dessus(I.p) !== 'Demander à Karim') fail('le bandeau n’ouvre pas « Demander à Karim » : ' + await dessus(I.p));
{
  const mot = await I.p.evaluate(() => document.querySelector('.overlay:last-child .gr-mot')?.textContent || '');
  if (!mot.startsWith('Salut Karim, tu y es en alternance chez AZTEK SAS ?')) fail('message : ' + mot);
}
/* une piste sans rapport ne dit rien */
await ouvrirFiche(I.p, 'a');
if ((await bandeaux(I.p)).length) fail('Advens parle de Karim : ' + await bandeaux(I.p));
console.log('② la fiche dit « Karim y est en alternance » et le message est prêt ✓');

/* la barre comprend « Karim » */
await fermerTout(I.p);
await I.p.evaluate(() => { location.hash = '#/pistes'; });
await I.p.waitForSelector('#piQ');
await I.p.fill('#piQ', 'Karim');
await I.p.waitForTimeout(500);
{
  const r = await I.p.evaluate(() => [...document.querySelectorAll('#view-pistes .row-item')]
    .filter(x => x.offsetParent).map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  if (r.length !== 1 || !/AZTEK SAS/.test(r[0]) || !/Karim y est en alternance/.test(r[0])) fail('barre « Karim » : ' + JSON.stringify(r));
}
await I.p.fill('#piQ', '');
console.log('② la barre trouve AZTEK SAS par « Karim » et dit pourquoi ✓');

/* « Aujourd'hui » : la piste que Karim peut porter passe devant */
await I.p.evaluate(() => { location.hash = '#/aujourdhui'; });
await I.p.waitForTimeout(500);
{
  const premiere = await I.p.evaluate(() => document.querySelector('#view-aujourdhui .act-start')?.textContent.replace(/\s+/g, ' ').trim() || '');
  if (!/^AZTEK SAS Karim y est en alternance/.test(premiere)) fail('« Par où commencer » : ' + premiere);
}
console.log('② « Par où commencer » met AZTEK SAS en tête, « Karim y est en alternance » ✓');

/* Inès → Sofia : le profil d'Inès n'emporte pas Karim */
const { txt: profilInes } = await monProfilCopie(I.p);
{
  const d = await decoder(I.p, profilInes);
  if (/Karim|Aztek|Quick/.test(JSON.stringify(d))) fail('le profil d’Inès emporte celui de Karim : ' + JSON.stringify(d));
}
const So = await ecran({ width: 390, height: 844 }, true, { name: 'Sofia Ait' }, []);
await recevoirProfil(So.p, profilInes);
await So.p.click('#amAjouter');
await So.p.waitForTimeout(300);
if ((await amisStockes(So.p)).join() !== 'Inès Martin') fail('Sofia : ' + await amisStockes(So.p));
console.log('② Inès → Sofia : un profil ne se repartage jamais, Karim ne suit pas ✓');

/* ---------- ③ redonner : à jour, pareil, soi-même ---------- */
await recevoirProfil(I.p, profilKarim);
if (!await I.p.evaluate(() => /Déjà dans tes amis/.test(document.querySelector('#amEtat')?.textContent || ''))
    || await I.p.evaluate(() => !!document.querySelector('#amAjouter')))
  fail('redonner le même profil propose encore d’ajouter');
await K.p.evaluate(async () => {
  const { S, saveProfile } = await import('./ui/state.js');
  S.profile.parcours.push({ id: 'k3', entreprise: 'Advens', quoi: 'stage', debut: '2023-04', fin: '2023-06' });
  saveProfile();
});
const { txt: profilKarim2 } = await monProfilCopie(K.p);
await recevoirProfil(I.p, profilKarim2);
if (await I.p.evaluate(() => document.querySelector('#amAjouter')?.textContent.trim()) !== 'Mettre à jour') fail('un profil changé ne propose pas « Mettre à jour »');
await I.p.click('#amAjouter');
await I.p.waitForTimeout(300);
if ((await amisStockes(I.p)).length !== 1) fail('mettre à jour a doublé l’ami : ' + await amisStockes(I.p));
await ouvrirFiche(I.p, 'a');
if ((await bandeaux(I.p))[0] !== 'Karim y a fait son stage') fail('la mise à jour ne se lit pas sur Advens : ' + await bandeaux(I.p));
await recevoirProfil(K.p, profilKarim2);
if (!await K.p.evaluate(() => /C’est ton profil/.test(document.querySelector('#amEtat')?.textContent || ''))
    || await K.p.evaluate(() => !!document.querySelector('#amAjouter')))
  fail('son propre QR propose de s’ajouter');
console.log('③ à jour remplace, pareil ne propose rien, soi-même ne s’ajoute pas ✓');

/* ---------- ④ une entreprise du parcours d'un ami devient une piste ---------- */
await fermerTout(I.p);
await sansAnnuler(I.p);
await I.p.evaluate(() => { location.hash = '#/echanger'; });
await I.p.click('#ecAmis');
await I.p.waitForSelector('#amListe [data-ami]');
await I.p.click('#amListe [data-ami]');
await I.p.waitForSelector('#amRetirer');
await I.p.screenshot({ path: `${SHOTS}/99-amis-ami-pouce.png` });
{
  const avant = await I.p.evaluate(async () => (await import('./ui/state.js')).S.companies.length);
  await I.p.click('[data-ajout]');
  await I.p.waitForTimeout(300);
  const quick = await I.p.evaluate(async () => (await import('./ui/state.js')).S.companies.find(c => c.name === 'Quick'));
  if (!quick || await I.p.evaluate(async () => (await import('./ui/state.js')).S.companies.length) !== avant + 1)
    fail('« + Piste » n’a pas ajouté Quick');
  if (await I.p.evaluate(() => !!document.querySelector('[data-ajout]'))) fail('Quick propose encore « + Piste » une fois ajoutée');
  await ouvrirFiche(I.p, 'Quick');
  if ((await bandeaux(I.p))[0] !== 'Karim y a travaillé') fail('la piste ajoutée ne dit pas Karim : ' + await bandeaux(I.p));
}
console.log('④ « + Piste » : Quick entre dans les pistes, et dit « Karim y a travaillé » ✓');

/* ---------- ⑤ retirer, annuler, recharger ---------- */
await fermerTout(I.p);
await sansAnnuler(I.p);
await I.p.waitForTimeout(300);
await I.p.click('#ecAmis');
await I.p.waitForSelector('#amListe [data-ami]');
await I.p.click('#amListe [data-ami]');
await I.p.waitForSelector('#amRetirer');
await I.p.click('#amRetirer');
await I.p.waitForTimeout(300);
if ((await amisStockes(I.p)).length) fail('retirer n’a pas retiré');
if (!await I.p.evaluate(() => !!document.querySelector('#amVide'))) fail('la liste vide ne s’affiche pas après le retrait');
await ouvrirFiche(I.p, 'c');
if ((await bandeaux(I.p)).length) fail('Karim retiré parle encore sur AZTEK SAS');
await I.p.evaluate(() => [...document.querySelectorAll('.undo-bar button')].find(b => /Annuler/.test(b.textContent)).click());
await I.p.waitForTimeout(250);
if ((await amisStockes(I.p)).join() !== 'Karim Benali') fail('« Annuler » ne rend pas Karim');
await I.p.reload({ waitUntil: 'load' });
await I.p.waitForTimeout(350);
await ouvrirFiche(I.p, 'c');
if ((await bandeaux(I.p))[0] !== 'Karim y est en alternance') fail('après rechargement, Karim ne parle plus : ' + await bandeaux(I.p));
console.log('⑤ retirer, « Annuler », recharger : tout tient ✓');

/* ---------- ⑥ sans nom, « Mon QR » ouvre le profil sur le nom ---------- */
await fermerTout(So.p);
await sansAnnuler(So.p);
await So.p.evaluate(async () => { const { S, saveProfile } = await import('./ui/state.js'); S.profile.name = ''; saveProfile(); });
await So.p.evaluate(() => { location.hash = '#/echanger'; });
await So.p.click('#ecAmis');
await So.p.waitForSelector('#amMonQR');
await So.p.click('#amMonQR');
await So.p.waitForTimeout(500);
if (await dessus(So.p) !== 'Mon profil') fail('sans nom, « Mon QR » ouvre : ' + await dessus(So.p));
if (await So.p.evaluate(() => document.activeElement?.id) !== 'pfName') fail('le curseur n’est pas sur le nom');
console.log('⑥ sans nom, « Mon QR » ouvre le profil, le curseur sur le nom ✓');
await So.ctx.close();
await K.ctx.close();
await I.ctx.close();

/* ---------- ⑦ pouce et poste, clair et sombre, 320 px texte doublé ---------- */
const INES_AMIS = { ...INES, amis: [
  { id: 'KarimKarimKarim00001', nom: 'Karim Benali', parcours: [{ entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', fin: '' },
    { entreprise: 'Société Générale Global Solution Centre', quoi: 'stage', debut: '2024-04', fin: '2024-06' }] },
  { id: 'AwaAwaAwaAwaAwaAwa01', nom: 'Awa Diallo-Fernandes de la Tour', parcours: [] }] };
for (const [vp, touch, sombre, nom] of [[{ width: 1280, height: 800 }, false, false, 'poste'],
                                        [{ width: 1280, height: 800 }, false, true, 'poste-sombre'],
                                        [{ width: 390, height: 844 }, true, true, 'pouce-sombre'],
                                        [{ width: 320, height: 640 }, true, false, '320-200']]){
  const { ctx, p } = await ecran(vp, touch, INES_AMIS, PISTES_INES, { sombre });
  if (nom === '320-200') await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await p.waitForSelector('#ecAmis');
  await p.click('#ecAmis');
  await p.waitForSelector('#amListe');
  await p.waitForTimeout(450);
  const mesure = sel => p.evaluate(s => {
    const m = [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-b');
    const mr = m.getBoundingClientRect().right;
    return {
      deborde: [...m.querySelectorAll(s + ' *')].filter(x => x.getBoundingClientRect().right > mr + 1).length,
      coupes: [...m.querySelectorAll(s + ' .pk-m > b, .mq-donne b')]
        .filter(b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1).length,
      lateral: m.scrollWidth > m.clientWidth + 1
    };
  }, sel);
  let r = await mesure('#amListe');
  if (r.deborde || r.lateral) fail(`${nom} : la liste des amis déborde (${r.deborde})`);
  if (r.coupes) fail(`${nom} : un nom d’ami est coupé`);
  await p.screenshot({ path: `${SHOTS}/99-amis-liste-${nom}.png` });
  /* Karim, pas le premier de la liste : c'est LUI qui a un parcours, et
     le nom le plus long. Un contrôle ne serre que ce qu'il remplit —
     ouvert sur Awa, sans parcours, il ne mesurait rien. */
  await p.click('#amListe [data-ami="KarimKarimKarim00001"]');
  await p.waitForSelector('.am-par [data-ajout]');
  await p.waitForTimeout(450);
  r = await mesure('.am-par');
  if (touch){
    /* au doigt, ce qu'on voit est ce qu'on touche : 44 px (§5) */
    const petits = await p.evaluate(() => [...[...document.querySelectorAll('.overlay')].pop().querySelectorAll('button')]
      .filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => b.textContent.trim() || b.getAttribute('aria-label')));
    if (petits.length) fail(`${nom} : cible sous 44 px dans la fiche d'un ami — ${petits.join(', ')}`);
  }
  if (r.deborde || r.lateral) fail(`${nom} : le parcours d’un ami déborde (${r.deborde})`);
  if (r.coupes) fail(`${nom} : une entreprise du parcours d’un ami est coupée`);
  await p.screenshot({ path: `${SHOTS}/99-amis-ami-${nom}.png` });
  await fermerTout(p);
  await p.click('#ecAmis');
  await p.waitForSelector('#amMonQR');
  await p.click('#amMonQR');
  await p.waitForSelector('#mqDonne');
  await p.waitForTimeout(450);
  r = await mesure('#mqDonne');
  if (r.deborde || r.lateral) fail(`${nom} : « Mon QR » déborde`);
  await p.screenshot({ path: `${SHOTS}/99-amis-mon-qr-${nom}.png` });
  console.log(`⑦ ${nom} : liste, ami, « Mon QR » — rien ne déborde, aucun nom coupé ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E amis : ÉCHEC' : 'E2E amis : OK');
