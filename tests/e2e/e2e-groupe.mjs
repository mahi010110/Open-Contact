/* ============================================================
   « Mon groupe » — les gens derrière les prénoms.

   POURQUOI CE FICHIER EXISTE. Le partage transportait des entreprises,
   puis (« j'y suis passé ») un prénom. Un prénom seul ne mène nulle
   part : le groupe est ce qui le relie à quelqu'un à qui DEMANDER.
   Mesuré : la même demande faite de vive voix aboutit 34 fois plus
   souvent que par mail (Roghanizad & Bohns, 2017), et on sous-estime
   d'environ moitié la probabilité qu'on nous dise oui (Flynn & Bohns,
   2008). L'app enlève le coût de la demande, elle ne la remplace pas.

   LE CONTRÔLE N°1 N'EST PAS LA FONCTIONNALITÉ. Un membre du groupe est
   la vie privée de QUELQU'UN D'AUTRE — la seule donnée que l'app garde
   sans que l'intéressé voie jamais l'écran. Donner des pistes à Marco
   ne doit JAMAIS lui donner le carnet de Léa. C'est vérifié en
   premier, sur toutes les sorties, et ça échoue bruyamment.
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

/* ---------- 1. l'invariant : le carnet des autres ne sort jamais ---------- */
const fuite = await page.evaluate(async () => {
  const { normalizeCompany } = await import('./engine/model.js');
  const { normalizeMembre, carteDeProfil, CARTE_CHAMPS } = await import('./engine/groupe.js');
  const { sharePayload, cardPayload, fullPayload } = await import('./engine/exchange.js');
  const groupe = [
    normalizeMembre({ prenom: 'Léa', nom: 'Martin', email: 'lea.martin@promo.test', phone: '0639980011' }),
    normalizeMembre({ prenom: 'Marco', email: 'marco@promo.test' })
  ];
  const pistes = [normalizeCompany({ name: 'Adrastia Systèmes', vecu: 'stage', notes: 'privé' })];
  /* toutes les sorties communautaires possibles, avec et sans profil joint */
  const maCarte = carteDeProfil({ name: 'Awa Diallo', email: 'awa@moi.test' }, CARTE_CHAMPS);
  const sorties = {
    'partage nu': JSON.stringify(sharePayload(pistes, null, 'Awa')),
    'partage + mon profil': JSON.stringify(sharePayload(pistes, null, 'Awa', maCarte)),
    'mon profil seul': JSON.stringify(cardPayload(maCarte))
  };
  const traces = ['lea.martin@promo.test', 'marco@promo.test', '0639980011', 'Martin', 'Marco'];
  const fuites = [];
  for (const [ou, txt] of Object.entries(sorties))
    for (const t of traces) if (txt.includes(t)) fuites.push(`${t} dans « ${ou} »`);
  /* MA copie, elle, contient tout : c'est ma sauvegarde personnelle */
  const copie = fullPayload(pistes, {}, [], [], groupe);
  return { fuites, dansMaCopie: (copie.groupe || []).length,
           monProfilPart: JSON.parse(sorties['partage + mon profil']).card.email };
});
if (fuite.fuites.length)
  fail('LE CARNET D’AUTRUI FUIT : ' + fuite.fuites.join(' · '));
else console.log('invariant ① : rien de mon groupe ne sort, sur aucun canal ✓');
if (fuite.dansMaCopie !== 2) fail('mon groupe manque à MA copie : ' + fuite.dansMaCopie);
if (fuite.monProfilPart !== 'awa@moi.test') fail('mon propre profil ne part pas quand je le joins');
else console.log('ma copie garde mon groupe · mon profil ne part que si je le joins ✓');

/* ---------- 1 bis. LA MÊME CHOSE, PAR LE VRAI CHEMIN ----------
   Le contrôle ci-dessus appelle les fonctions du moteur avec un groupe
   fabriqué sur place : il prouve seulement qu'elles n'inventent pas des
   données qu'on ne leur a pas données. C'est faible. Une fuite réelle
   viendrait d'un ÉCRAN qui, lui, a accès à `S.groupe` — et passerait
   sous ce contrôle sans le faire broncher (vérifié : une mutation
   posée là n'a pas été vue).
   Donc : on remplit le vrai groupe, on donne vraiment des pistes par le
   vrai bouton, et on lit les octets qui sortent. */
await attendre(page, async () => !!(await import('./ui/state.js')).S.profile,
  'le profil n’est jamais chargé');
const reel = await page.evaluate(async () => {
  const { S, saveGroupe, saveData } = await import('./ui/state.js');
  const { normalizeMembre } = await import('./engine/groupe.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.groupe = [normalizeMembre({ prenom: 'Léa', nom: 'Martin',
    email: 'lea.martin@promo.test', phone: '0639980011', note: 'très réactive' })];
  saveGroupe();
  S.companies = [normalizeCompany({ name: 'Adrastia Systèmes', city: 'Toulouse',
    vecu: 'stage', status: 'active', notes: 'mon suivi' })];
  saveData();
  /* on détourne le presse-papier pour lire ce que « Copier » produit */
  let copie = '';
  navigator.clipboard.writeText = t => { copie = t; return Promise.resolve(); };
  const { openDonner } = await import('./ui/donner.js');
  openDonner();
  await new Promise(r => setTimeout(r, 250));
  document.getElementById('dnFile').click();
  await new Promise(r => setTimeout(r, 250));
  document.getElementById('dnCopy').click();
  await new Promise(r => setTimeout(r, 300));
  /* et par le QR, l'autre canal réel */
  const { encodeOCQ, parseInput } = await import('./engine/exchange.js');
  const qr = await parseInput(await encodeOCQ(S.companies, null, 'Moi'));
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  return { copie, qr: JSON.stringify(qr) };
});
for (const [canal, txt] of [['fichier', reel.copie], ['QR', reel.qr]]){
  if (!txt) { fail(`le canal ${canal} n’a rien produit — le contrôle ne prouve rien`); continue; }
  for (const trace of ['lea.martin@promo.test', '0639980011', 'très réactive', 'Martin', 'groupe'])
    if (txt.includes(trace)) fail(`« ${trace} » sort par le canal ${canal} — LE CARNET D’AUTRUI FUIT`);
  if (!txt.includes('Adrastia')) fail(`le canal ${canal} ne contient même pas la piste — test faussé`);
}
if (!process.exitCode)
  console.log('donner pour de vrai (fichier + QR) : la piste part, le groupe reste ✓');

/* ---------- 2. échanger un profil, bout en bout ----------
   `load` ne dit pas que l'app est prête : `loadAll()` est asynchrone.
   Écrire dans S sans attendre marchait une fois sur deux. */
await attendre(page, async () => !!(await import('./ui/state.js')).S.profile,
  'le profil n’est jamais chargé');
await page.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  S.profile.name = 'Awa Diallo';
  S.profile.formation = 'BTS SIO 2ᵉ année';
  S.profile.email = 'awa@moi.test';
  (await import('./ui/state.js')).saveProfile();
});
const echange = await page.evaluate(async () => {
  const { openEchangerProfil } = await import('./ui/groupe.js');
  openEchangerProfil();
  await new Promise(r => setTimeout(r, 200));
  /* ce qui part est écrit à l'écran AVANT le choix du canal */
  const vu = document.querySelector('.gr-carte').innerText.replace(/\s+/g, ' ').trim();
  /* décocher l'e-mail le retire du fichier, tout de suite */
  const chip = [...document.querySelectorAll('.dchip[data-c]')].find(b => b.dataset.c === 'email');
  chip.click();
  await new Promise(r => setTimeout(r, 120));
  const apres = document.querySelector('.gr-carte').innerText.replace(/\s+/g, ' ').trim();
  chip.click();       /* remis : la suite du test veut l'adresse */
  await new Promise(r => setTimeout(r, 120));
  /* et surtout : ce que le FICHIER contient, pas ce que l'écran montre.
     Envoyer `S.profile` au lieu de la carte choisie ferait partir la
     lettre de motivation, les modèles d'emails et les prompts — sans
     que rien ne change à l'écran. */
  let fichier = '';
  navigator.clipboard.writeText = x => { fichier = x; return Promise.resolve(); };
  document.getElementById('grFile').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('grCopy').click();
  await new Promise(r => setTimeout(r, 250));
  document.querySelector('.overlay .x').click();
  return { vu, apres, fichier };
});
if (!/awa@moi\.test/.test(echange.vu)) fail('le profil affiché ne montre pas ce qui part : ' + echange.vu);
if (/awa@moi\.test/.test(echange.apres)) fail('décocher l’e-mail ne le retire pas de ce qui part');
else console.log(`ce qui part est montré et se décoche : « ${echange.vu} » ✓`);
for (const trop of ['letter', 'templates', 'prompts', 'confirmedIds', 'flags', 'cvUrl'])
  if (echange.fichier.includes(trop))
    fail(`« ${trop} » part avec mon profil — c'est le profil de TRAVAIL qui fuit`);
if (!echange.fichier.includes('awa@moi.test'))
  fail('le fichier de profil ne contient pas ce qu’il annonce : ' + echange.fichier.slice(0, 120));
else if (!process.exitCode)
  console.log('le fichier de profil ne porte QUE les champs cochés ✓');

/* ---------- 2 bis. l'aller-retour complet du QR ----------
   Un QR qui S'AFFICHE n'est pas un QR qui MARCHE : la capture d'écran
   ne dit rien du contenu. On repasse par la chaîne réelle — compression,
   base64url, décompression, lecture — et on regarde qui ressort. */
const tour = await page.evaluate(async () => {
  const { encodeOCQPayload, cardPayload, parseInput } = await import('./engine/exchange.js');
  const { carteDeProfil, CARTE_CHAMPS, normalizeMembre } = await import('./engine/groupe.js');
  const envoye = carteDeProfil({ name: 'Léa Martin', formation: 'BTS SIO',
    email: 'lea@promo.test', phone: '0755530022', portfolio: 'lea.dev' }, CARTE_CHAMPS);
  const compact = await encodeOCQPayload(cardPayload(envoye));
  const relu = await parseInput(compact);
  const m = normalizeMembre(relu.card);
  return { taille: compact.length, kind: relu.kind, pistes: relu.companies.length,
           prenom: m.prenom, nom: m.nom, email: m.email, link: m.link };
});
/* un profil doit tenir dans UN QR (le seuil du partage de pistes est
   1800) : sinon il faudrait un QR animé pour deux lignes de texte */
if (tour.taille > 400) fail(`le QR d’un profil pèse ${tour.taille} car. — trop pour un seul code`);
if (tour.kind !== 'card' || tour.pistes !== 0) fail('l’enveloppe du profil a changé de forme');
if (tour.prenom !== 'Léa' || tour.nom !== 'Martin' || tour.email !== 'lea@promo.test'
    || tour.link !== 'https://lea.dev')
  fail('le profil ne survit pas à l’aller-retour QR : ' + JSON.stringify(tour));
else console.log(`aller-retour QR : ${tour.taille} car., Léa Martin ressort entière ✓`);

/* ---------- 3. recevoir un profil : aperçu AVANT, puis Annuler ---------- */
const recu = await page.evaluate(async () => {
  const { cardPayload } = await import('./engine/exchange.js');
  const { carteDeProfil, CARTE_CHAMPS } = await import('./engine/groupe.js');
  const { mergePreviewInto } = await import('./ui/recevoir.js');
  const { openSheet } = await import('./ui/dom.js');
  const { S } = await import('./ui/state.js');
  S.groupe.length = 0;                                 /* on part d'un groupe connu */
  const p = cardPayload(carteDeProfil({ name: 'Léa Martin', formation: 'BTS SIO',
    email: 'lea@promo.test' }, CARTE_CHAMPS));
  const sh = openSheet({ title: 'x' });
  const depart = S.groupe.length;
  mergePreviewInto(sh, p, {});
  await new Promise(r => setTimeout(r, 150));
  const avant = S.groupe.length - depart;              /* l'aperçu n'écrit rien */
  const titre = document.querySelector('.modal-h b, .modal-h').innerText.trim();
  const vu = document.querySelector('.rc-recap').innerText.replace(/\s+/g, ' ').trim();
  [...document.querySelectorAll('.modal-f .btn')].pop().click();
  await new Promise(r => setTimeout(r, 250));
  const annulable = !!document.querySelector('.undo-bar, [class*="undo"]');
  return { avant, apres: S.groupe.length - depart, titre, vu, annulable,
           qui: (S.groupe[0] || {}).prenom };
});
if (recu.avant !== 0) fail('l’aperçu a écrit dans le groupe avant qu’on valide — invariant ② cassé');
if (!/Léa Martin/.test(recu.vu) || !/lea@promo\.test/.test(recu.vu))
  fail('l’aperçu ne montre pas ce qui va entrer : ' + recu.vu);
if (recu.apres !== 1 || recu.qui !== 'Léa') fail('le profil reçu n’est pas entré dans le groupe');
if (!recu.annulable) fail('aucune barre « Annuler » après avoir ajouté quelqu’un');
else console.log('profil reçu : aperçu avant, écriture après, Annuler derrière ✓');

/* ---------- 4. LE PAIEMENT : le prénom mène à la personne ---------- */
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const { normalizeCompany } = await import('./engine/model.js');
  /* une piste reçue d'un camarade, avec sa déclaration */
  await st.kvSet(st.DATA_KEY, JSON.stringify([normalizeCompany({
    name: 'Adrastia Systèmes', city: 'Toulouse', domain: 'esn',
    vecu: 'stage', vecuQui: 'Léa', status: 'todo' })]));
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 1,
  'la piste reçue n’est pas chargée');
const geste = await page.evaluate(async () => {
  const { openFiche } = await import('./ui/fiche.js');
  const { S } = await import('./ui/state.js');
  openFiche(S.companies[0]);
  await new Promise(r => setTimeout(r, 200));
  const b = document.querySelector('button.fi-vecu');
  if (!b) return { tapable: false, lu: (document.querySelector('.fi-vecu') || {}).innerText || '' };
  const lu = b.innerText.replace(/\s+/g, ' ').trim();
  b.click();
  await new Promise(r => setTimeout(r, 200));
  const mot = (document.querySelector('.gr-mot') || {}).innerText || '';
  const boutons = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f .btn')]
    .map(x => x.innerText.trim());
  return { tapable: true, lu, mot, boutons, groupe: S.groupe.length };
});
if (!geste.tapable)
  fail('le bandeau ne mène nulle part alors que Léa est dans le groupe : « ' + geste.lu + ' »');
/* La phrase se lit à voix haute : elle est vérifiée MOT POUR MOT.
   Un `court` en 3ᵉ personne réutilisé après « tu » donnait « tu y a fait
   son stage » — une faute que le nom de la personne et de l'entreprise
   ne suffisaient pas à faire remarquer. */
else if (geste.mot.replace(/\s+/g, ' ').trim() !==
         'Salut Léa, tu y as fait ton stage chez Adrastia Systèmes ? '
         + 'Je postule là-bas — tu peux me dire à qui écrire ?')
  fail('le message tout prêt n’est pas la phrase attendue : ' + geste.mot);
/* « Écrire » n'est pas le premier bouton : la recherche dit qu'une
   demande de vive voix aboutit 34× plus souvent, et une promo se croise
   en cours. Le primaire est donc ce qui sert dans les deux cas. */
else if (!/Copier/.test(geste.boutons[geste.boutons.length - 1] || ''))
  fail('le bouton principal n’est pas « Copier » : ' + JSON.stringify(geste.boutons));
else console.log(`le bandeau mène à « ${geste.mot.slice(0, 46)}… » ✓`);
await page.screenshot({ path: SHOTS + '/94-groupe-demander.png' });

/* ---------- 5. on ne devine jamais entre deux homonymes ---------- */
const doute = await page.evaluate(async () => {
  const { S, saveGroupe } = await import('./ui/state.js');
  const { normalizeMembre } = await import('./engine/groupe.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  S.groupe.push(normalizeMembre({ prenom: 'Léa', nom: 'Bonnet', email: 'lea.b@promo.test' }));
  saveGroupe();
  await new Promise(r => setTimeout(r, 120));
  const { openFiche } = await import('./ui/fiche.js');
  openFiche(S.companies[0]);
  await new Promise(r => setTimeout(r, 200));
  return { tapable: !!document.querySelector('button.fi-vecu'),
           lu: (document.querySelector('.fi-vecu') || {}).innerText || '' };
});
if (doute.tapable)
  fail('deux « Léa » dans le groupe et l’app en choisit une — elle enverrait au mauvais camarade');
else if (!/Léa/.test(doute.lu)) fail('le bandeau a disparu au lieu de rester du texte : ' + doute.lu);
else console.log('deux homonymes : le bandeau redevient du texte, personne n’est deviné ✓');

/* ---------- 6. la porte de « Échanger » porte une donnée ---------- */
const porte = await page.evaluate(async () => {
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  location.hash = '#echanger';
  await new Promise(r => setTimeout(r, 350));
  const b = document.getElementById('ecGroupe');
  return b ? b.innerText.replace(/\s+/g, ' ').trim() : null;
});
if (!porte) fail('« Mon groupe » n’est pas sur l’écran Échanger');
else if (!/\d/.test(porte))
  fail('la porte n’affiche aucune donnée — c’est un menu, pas un écran : ' + porte);
else console.log(`la porte dit ce qu’il y a derrière : « ${porte} » ✓`);

/* ---------- 7. les cibles restent au doigt ---------- */
const petites = await page.evaluate(async () => {
  const { openGroupe } = await import('./ui/groupe.js');
  openGroupe();
  await new Promise(r => setTimeout(r, 250));
  return [...document.querySelectorAll('.overlay:not(.ov-out) .gr-row, .overlay:not(.ov-out) .modal-f .btn')]
    .map(e => ({ t: e.innerText.trim().slice(0, 22), h: Math.round(e.getBoundingClientRect().height) }))
    .filter(x => x.h < 44);
});
if (petites.length)
  fail('cibles sous 44 px au doigt : ' + petites.map(x => `${x.t} (${x.h})`).join(', '));
else console.log('toutes les cibles du groupe tiennent 44 px au doigt ✓');
await page.screenshot({ path: SHOTS + '/95-groupe-liste.png' });

/* ---------- 8. joindre MON profil à un partage de pistes ----------
   Le champ `card` était documenté et testé côté moteur, mais AUCUN
   écran ne le produisait : une capacité injoignable. Ce contrôle part
   du bouton et lit le fichier — c'est la seule façon de savoir qu'un
   chemin existe vraiment. */
const joint = await page.evaluate(async () => {
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  const { S } = await import('./ui/state.js');
  const lire = async () => {
    let txt = '';
    navigator.clipboard.writeText = t => { txt = t; return Promise.resolve(); };
    const { openDonner } = await import('./ui/donner.js');
    openDonner();
    await new Promise(r => setTimeout(r, 250));
    const etat = document.getElementById('dnMoi').getAttribute('aria-pressed');
    const dit = (document.getElementById('dnMoiQ') || {}).textContent || '';
    const cache = document.getElementById('dnMoiQ').hidden;
    document.getElementById('dnFile').click();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('dnCopy').click();
    await new Promise(r => setTimeout(r, 250));
    document.querySelectorAll('.overlay .x').forEach(x => x.click());
    await new Promise(r => setTimeout(r, 200));
    return { txt, etat, dit, cache };
  };
  const avant = await lire();                       /* décoché par défaut */
  S.profile.flags.joindreProfil = true;
  const apres = await lire();                       /* coché : ça part */
  return { avant, apres, nom: S.profile.name };
});
if (joint.avant.etat !== 'false' || !joint.avant.cache)
  fail('« Joindre mon profil » est coché d’office — un partage doit rester anonyme par défaut');
if (JSON.parse(joint.avant.txt).card)
  fail('mon profil part alors que la case est décochée');
const carteEnvoyee = JSON.parse(joint.apres.txt).card;
if (!carteEnvoyee) fail('cocher « Joindre mon profil » ne joint rien — la capacité reste morte');
else if (carteEnvoyee.prenom !== 'Awa')
  fail('le profil joint n’est pas le mien : ' + JSON.stringify(carteEnvoyee));
/* et la ligne DIT ce qu'elle emporte, mot pour mot */
else if (!joint.apres.dit.includes('Awa') || !joint.apres.dit.includes('awa@moi.test'))
  fail('la ligne n’annonce pas ce qui part : « ' + joint.apres.dit + ' »');
else console.log(`joindre mon profil : décoché par défaut, et cochée la ligne dit « ${joint.apres.dit} » ✓`);
/* le receveur le voit dans l'aperçu, et il entre au même geste */
const cote = await page.evaluate(async raw => {
  const { S, saveGroupe } = await import('./ui/state.js');
  const { parseInput } = await import('./engine/exchange.js');
  const { mergePreviewInto } = await import('./ui/recevoir.js');
  const { openSheet } = await import('./ui/dom.js');
  S.groupe = []; saveGroupe();
  const sh = openSheet({ title: 'x' });
  mergePreviewInto(sh, await parseInput(raw), {});
  await new Promise(r => setTimeout(r, 200));
  const vu = document.querySelector('.rc-lines').innerText.replace(/\s+/g, ' ').trim();
  [...document.querySelectorAll('.modal-f .btn')].pop().click();
  await new Promise(r => setTimeout(r, 300));
  return { vu, entre: S.groupe.map(m => m.prenom).join() };
}, joint.apres.txt);
if (!/Awa/.test(cote.vu)) fail('l’aperçu ne dit pas qu’un profil est joint : ' + cote.vu);
if (cote.entre !== 'Awa') fail('fusionner les pistes n’ajoute pas la personne au groupe : ' + cote.entre);
else console.log('reçu : l’aperçu annonce le profil, la fusion le range dans le groupe ✓');

/* la cible et son voisinage : rater « Choisir » coûte un tap, rater
   « Joindre mon profil » envoie son e-mail — ils ne se touchent pas */
const voisin = await page.evaluate(async () => {
  const { openDonner } = await import('./ui/donner.js');
  openDonner();
  await new Promise(r => setTimeout(r, 250));
  const m = document.getElementById('dnMoi').getBoundingClientRect();
  const c = document.getElementById('dnPick').getBoundingClientRect();
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  return { h: Math.round(m.height), ecart: Math.round(m.top - c.bottom) };
});
if (voisin.h < 44) fail(`« Joindre mon profil » fait ${voisin.h} px sous le doigt`);
if (voisin.ecart < 8) fail(`${voisin.ecart} px entre « Choisir » et « Joindre mon profil » — deux gestes aux conséquences différentes`);
else console.log(`la case fait ${voisin.h} px et garde ${voisin.ecart} px de « Choisir » ✓`);

/* ---------- 9. une piste PORTÉE passe en tête de « Par où commencer » ----------
   ~40 % d'entretiens contre ~3 % : c'est le critère le plus fort de
   l'écran. Et la raison doit se LIRE sur la ligne — un tri qu'on ne
   comprend pas ne pousse personne (§6). */
const tete = await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const { normalizeCompany } = await import('./engine/model.js');
  const { normalizeMembre } = await import('./engine/groupe.js');
  const { S, saveGroupe } = await import('./ui/state.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  S.groupe = [normalizeMembre({ prenom: 'Léa', email: 'lea@promo.test' })];
  saveGroupe();
  /* la piste portée est VOLONTAIREMENT la moins bien classée par les
     autres critères : sans email, sans ville, dernière alphabétiquement */
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    normalizeCompany({ name: 'Aalto Cloud', city: 'Lyon', status: 'todo',
      contacts: [{ name: 'RH', email: 'rh@aalto.test' }] }),
    normalizeCompany({ name: 'Baltique Réseaux', city: 'Lille', status: 'todo',
      contacts: [{ name: 'RH', email: 'rh@baltique.test' }] }),
    normalizeCompany({ name: 'Zephyr SI', status: 'todo', vecu: 'stage', vecuQui: 'Léa' })
  ]));
  location.hash = '#aujourdhui';    /* le test précédent nous a laissés sur Échanger */
  return true;
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 3,
  'les trois pistes ne sont pas chargées');
await page.waitForTimeout(400);
const debut = await page.evaluate(() =>
  [...document.querySelectorAll('.act-start')].map(r => ({
    nom: r.querySelector('.act-verb').textContent.trim(),
    pourquoi: (r.querySelector('.act-vecu') || {}).textContent || ''
  })));
if (!debut.length) fail('« Par où commencer » n’affiche rien');
else if (debut[0].nom !== 'Zephyr SI')
  fail('la piste portée par quelqu’un du groupe n’est pas en tête : ' +
       debut.map(d => d.nom).join(' · '));
else if (!/Léa/.test(debut[0].pourquoi))
  fail('la ligne ne dit pas POURQUOI elle est première : « ' + debut[0].pourquoi + ' »');
else console.log(`en tête : ${debut[0].nom}, parce que « ${debut[0].pourquoi} » ✓`);
await page.screenshot({ path: SHOTS + '/96-portee-en-tete.png' });

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E groupe : ÉCHEC' : 'E2E groupe : OK');
