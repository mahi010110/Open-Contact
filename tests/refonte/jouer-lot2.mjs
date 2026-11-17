/* ============================================================
   OpenContact · la nouvelle interface · rejouer le lot 2
   (Pistes, une piste, écrire ; docs/refonte-reprendre.md §8)

   Usage : node tests/refonte/jouer-lot2.mjs [dossier des captures]

   Joue Pistes de bout en bout : la liste vide, « À faire » et les
   étapes, la page d'une piste, écrire par les quatre canaux (l'erreur
   d'adresse, le crochet qui bloque), « C'est parti ? », le rappel,
   « Suivante », « On m'a répondu » (un entretien, le merci), « Ils me
   prennent » et le contrat, « C'est non », « Laisser tomber », le
   contact ajouté (le dirigeant proposé), les notes, le glissé, le pire
   jour (« Ranger ») et la recherche, au téléphone (390, 360, clair et
   sombre) et au poste. Ce qui sort de l'app (Mail, LinkedIn, l'agenda)
   est intercepté : rien ne part. Finit par « ÉCHECS 0 · ERREURS 0 ».
   ============================================================ */
import path from 'path';
import { lancer, deborde, petites, glisser, texte, lireCle, PROFIL } from './outils.mjs';

const { OUT, ouvrir, verifier, fermer, etat } = await lancer('lot2');
const img = async (p, nom) => { await p.waitForTimeout(220); await p.screenshot({ path: path.join(OUT, nom + '.png') }); };
const T = '.ecran ';
const J = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
/* ce qui sortirait de l'app : on le note, on ne l'ouvre pas */
const INTERCEPTER = () => {
  window.__ouverts = [];
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && /^(mailto|tel):|^https?:/.test(a.getAttribute('href')) && (a.target === '_blank' || /^(mailto|tel):/.test(a.href))){
      e.preventDefault(); window.__ouverts.push(a.href);
    }
  }, true);
  window.open = u => { window.__ouverts.push(String(u)); return null; };
};
const ouverts = p => p.evaluate(() => window.__ouverts || []);
const piste = async (p, id) => ((await lireCle(p, 'oc_data_v3')) || []).find(c => c.id === id);

const PISTES = [
  { id: 'hdf', name: 'Hauts-de-France Télécom', city: 'Wasquehal', siren: '812000009', status: 'reply', nextAction: J(1), nextActionText: 'Entretien',
    contacts: [{ id: 'k1', name: 'Élodie Carpentier', role: 'présidente', email: 'e.carpentier@hdf-telecom.fr' }],
    history: [{ d: J(7), t: 'Gardée' }, { d: J(7), t: 'Écrit à Élodie Carpentier, par mail' }, { d: J(5), t: 'Réponse : un entretien' }] },
  { id: 'sep', name: 'Septentrion Cloud', city: 'Marcq-en-Barœul', siren: '812000004', status: 'active', appliedAt: J(7),
    contacts: [{ id: 'k2', name: 'Hugo Vasseur', role: 'directeur général', email: 'h.vasseur@septentrion-cloud.fr' }],
    history: [{ d: J(7), t: 'Gardée' }, { d: J(7), t: 'Écrit à Hugo Vasseur, par mail' }] },
  { id: 'nor', name: 'Nord Infogérance', city: 'Lambersart', siren: '812000002', status: 'todo', createdAt: 1,
    contacts: [{ id: 'k3', name: 'Marc Delattre', role: 'gérant' }], history: [{ d: J(2), t: 'Gardée' }] },
  { id: 'rsn', name: 'Réseaux et Systèmes du Nord', city: 'Lille', siren: '812000001', status: 'todo', createdAt: 2, history: [{ d: J(1), t: 'Gardée' }] },
  { id: 'dat', name: 'Datagora', city: 'Roubaix', siren: '812000006', status: 'active', appliedAt: J(3),
    contacts: [{ id: 'k4', name: 'Sophie Marchal', role: 'gérante' }], history: [{ d: J(3), t: 'Écrit à Sophie Marchal, sur LinkedIn' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'reply', closedReason: 'rejected', history: [{ d: J(2), t: 'Refus' }] }
];

/* ---------- au téléphone : le premier jour, puis la journée ---------- */
{
  const { ctx, p } = await ouvrir(390, 844, { mobile: true, adresse: '#/pistes' });
  verifier((await texte(p, T)).includes('Les entreprises que tu gardes arrivent ici'), 'Pistes vide : il dit ce qui viendra');
  await img(p, 't0-vide');
  await p.click(T + '[data-a="aller"][data-id="trouver"]');
  verifier(await p.evaluate(() => location.hash === '#/trouver'), 'vide : « Trouver des entreprises » mène à Trouver');
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir(390, 844, { mobile: true, profil: PROFIL, pistes: PISTES, adresse: '#/pistes' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await p.evaluate(INTERCEPTER);
  const af = await texte(p, T + '.s-afaire');
  verifier(af.includes('entretien hier : un merci') && af.includes('7 jours sans réponse') && af.includes('Marc Delattre, gérant'),
    '« À faire » : le merci, la relance, une piste à contacter');
  verifier(await p.evaluate(() => document.querySelectorAll('.ecran .s-afaire .rang').length) === 3, '« À faire » : trois lignes au plus');
  verifier((await texte(p, T)).includes('EN ATTENTE · 1') || /en attente · 1/i.test(await texte(p, T)), 'les étapes, avec leur compte');
  await img(p, 't1-pistes');
  verifier((await deborde(p)).length === 0, '390 : rien ne déborde · ' + (await deborde(p)).join(', '));
  verifier((await petites(p)).length === 0, '390 : cibles de 44 px · ' + (await petites(p)).join(', '));

  /* écrire à Marc Delattre : pas d'adresse, LinkedIn s'ouvre de lui-même */
  await p.click(T + '.s-afaire [data-a="ecrire"][data-id="nor"]');
  await p.waitForSelector(T + '.ecr');
  verifier(await p.evaluate(() => location.hash === '#/pistes'), 'écrire reste dans Pistes');
  verifier(await p.evaluate(() => document.querySelector('.ecran .canaux .on').textContent === 'LinkedIn'), 'sans adresse, LinkedIn s’ouvre de lui-même');
  verifier(/\/200/.test(await texte(p, T + '.ecr')), 'LinkedIn : le compteur sur 200');
  await img(p, 't2-linkedin');
  await p.click(T + '.canaux [data-v="mail"]');
  verifier(await p.isVisible(T + '.e-a'), 'Mail : À, objet, message');
  await p.click(T + '.pied [data-a="envoyer"]');
  verifier((await texte(p, T + '.e-err-a')).includes('Il manque son adresse'), 'sans adresse : l’erreur sous le champ');
  await p.fill(T + '.e-a', 'm.delattre@nord-info');
  await p.click(T + '.pied [data-a="envoyer"]');
  verifier((await texte(p, T + '.e-err-a')).includes('Adresse incomplète'), 'une adresse incomplète se dit');
  await p.fill(T + '.e-a', 'm.delattre@nord-infogerance.fr');
  await p.click(T + '.pied [data-a="envoyer"]');
  verifier((await texte(p, T + '.e-err')).includes('Remplace ce qui est entre crochets'), 'un crochet bloque l’envoi');
  const sel = await p.evaluate(() => { const t = document.activeElement; return t.value.slice(t.selectionStart, t.selectionEnd); });
  verifier(/^\[/.test(sel), 'le crochet est sélectionné : on tape pour le remplacer');
  await img(p, 't3-crochet');
  await p.keyboard.type('Vous dépannez les PME de Lambersart depuis quinze ans.');
  await p.click(T + '.pied [data-a="envoyer"]');
  await p.waitForSelector(T + '.suite-b');
  const sortis = await ouverts(p);
  verifier(sortis.some(u => u.startsWith('mailto:m.delattre@nord-infogerance.fr') && u.includes('quinze')), 'Mail s’ouvre avec le message écrit');
  verifier((await texte(p, T + '.suite-b')).includes('C’est parti ?'), 'au retour : « C’est parti ? »');
  await img(p, 't4-parti');
  await p.click(T + '[data-a="envoye"]');
  const nor = await piste(p, 'nor');
  verifier(nor.status === 'active' && !!nor.appliedAt && nor.history.some(h => h.t === 'Écrit à Marc Delattre, par mail'), '« Oui, envoyé » : en attente, l’historique le dit');
  verifier(nor.contacts[0].email === 'm.delattre@nord-infogerance.fr', 'l’adresse tapée reste sur la personne');
  verifier((await texte(p, T + '.suite-b')).includes('Écrit aujourd’hui'), 'la suite : « Écrit aujourd’hui »');
  verifier(await p.isVisible(T + '[data-a="rappel"]') && (await texte(p, T + '.suite-b')).includes('Suivante : Réseaux et Systèmes du Nord'),
    'puis le rappel et « Suivante »');
  await img(p, 't5-suivante');
  await p.click(T + '[data-a="rappel"]');
  verifier((await ouverts(p)).some(u => /calendar\.google\.com|\.ics|blob:/.test(u)), 'le rappel ouvre l’agenda');
  verifier((await texte(p, T + '.suite-b')).includes('Rappel le'), 'puis le dit');

  /* « Suivante » : écrire à la piste suivante, sans personne à qui écrire */
  await p.click(T + '.suivante');
  await p.waitForSelector(T + '.ecr');
  verifier(await p.evaluate(() => document.querySelector('.ecran .canaux .on').textContent === 'Site'), 'sans personne : le texte pour leur site');
  await p.goBack(); await p.waitForTimeout(150);
  /* le contact : le dirigeant de l'annuaire proposé d'un tap */
  await p.click(T + '[data-a="contact"][data-v="-1"]');
  await p.waitForSelector('.sheet');
  await p.waitForTimeout(400);
  if (!(await p.isVisible('.sheet .prop-b'))){ await p.click('.sheet [data-a="fermer-f"]'); await p.waitForTimeout(300); await p.click(T + '[data-a="contact"][data-v="-1"]'); await p.waitForSelector('.sheet'); }
  verifier((await texte(p, '.sheet')).includes('Claire Durand') && (await texte(p, '.sheet')).includes('d’après l’annuaire'), 'le dirigeant est proposé');
  await img(p, 't6-contact');
  await p.click('.sheet .prop-b');
  verifier((await p.inputValue('.sheet .c-n')) === 'Claire Durand', 'un tap remplit le nom');
  await p.fill('.sheet .c-m', 'claire@');
  await p.click('.sheet [data-a="garder-ct"]');
  verifier((await texte(p, '.sheet .c-err')).includes('Adresse incomplète'), 'une adresse fausse se dit dans la feuille');
  await p.fill('.sheet .c-m', 'c.durand@rsn-lille.fr');
  await p.click('.sheet [data-a="garder-ct"]');
  await p.waitForTimeout(200);
  verifier(!(await p.isVisible('.sheet')), 'Enregistrer ferme la feuille');
  verifier((await texte(p, T + '.gb')).includes('Claire Durand'), 'la personne est dans « Les gens »');
  verifier((await texte(p, T + '.suite-b')).includes('À contacter : Claire Durand'), 'et la suite le dit');
  /* le retour du téléphone ferme une feuille, pas l'écran */
  await p.click(T + '[data-a="contact"][data-v="0"]');
  await p.waitForSelector('.sheet');
  await p.goBack(); await p.waitForTimeout(250);
  verifier(!(await p.isVisible('.sheet')) && (await texte(p, T + '.s-page h4')) === 'Réseaux et Systèmes du Nord', 'le retour ferme la feuille, la page reste');
  /* les notes s'écrivent sans bouton */
  await p.click(T + 'details[data-p="notes"] summary');
  await p.fill(T + '.n-notes', 'Rappeler après le salon.');
  await p.waitForTimeout(700);
  verifier((await piste(p, 'rsn')).notes === 'Rappeler après le salon.', 'les notes sont gardées sans bouton');
  /* « Laisser tomber », puis « Annuler » */
  await p.click(T + '[data-a="lacher"]');
  await p.waitForTimeout(250);
  verifier((await texte(p, '.couche-a')).includes('laissée de côté') && (await texte(p, T + '.suite-b')).includes('Rangée.'), '« Laisser tomber » : rangée, et ça se rattrape');
  await p.click('.couche-a [data-a="annuler"]');
  verifier(!(await piste(p, 'rsn')).closedReason, '« Annuler » la rend');
  /* re-taper l'onglet revient à sa racine */
  await p.click('.onglets [data-id="pistes"]');
  await p.waitForSelector(T + '.p-liste-c');

  /* l'entretien : « On m'a répondu » › « Un entretien » › demain */
  await p.click(T + '.r-c[data-id="sep"]');
  await p.click(T + '[data-a="pm"][data-v="quoi"]');
  await p.click(T + '[data-a="pm"][data-v="quand"]');
  await img(p, 't7-quand');
  await p.click(T + '[data-a="quand"]');
  const sep = await piste(p, 'sep');
  verifier(sep.status === 'reply' && sep.nextActionText === 'Entretien', 'un entretien : la piste répond, le jour est noté');
  verifier((await texte(p, T + '.suite-b')).includes('Entretien') && await p.isVisible(T + '.questions'), 'la suite : préparer, et trois questions');
  await img(p, 't8-entretien');
  /* le merci d'un entretien passé */
  await p.goBack(); await p.waitForTimeout(150);
  await p.click(T + '.s-afaire [data-a="ecrire"][data-id="hdf"]');
  await p.waitForSelector(T + '.ecr');
  verifier((await p.inputValue(T + '.e-o')).startsWith('Merci pour notre échange'), 'le merci : son objet');
  await p.click(T + '.pied [data-a="envoyer"]');
  verifier((await texte(p, T + '.e-err')).includes('crochets'), 'le merci aussi attend sa phrase');
  await p.keyboard.type('Merci pour la visite du centre de supervision.');
  await p.click(T + '.pied [data-a="envoyer"]');
  await p.waitForSelector(T + '.suite-b');
  verifier((await texte(p, T + '.suite-b')).includes('Ton merci est parti ?'), '« Ton merci est parti ? »');
  await p.click(T + '[data-a="envoye"]');
  verifier((await texte(p, T + '.suite-b')).includes('Merci envoyé'), 'puis « Merci envoyé », on attend');
  /* « Ils me prennent » : le contrat, étape par étape */
  await p.click(T + '[data-a="ev"][data-v="oui"]');
  verifier((await texte(p, T + '.suite-b')).includes('C’est oui !') && (await texte(p, T + '.suite-b')).includes('Signer le contrat'), 'c’est oui : les étapes du contrat');
  await p.click(T + '.ck[data-v="contrat"]');
  verifier((await piste(p, 'hdf')).suite.f.contrat, 'une étape se coche, et se garde');
  await img(p, 't9-oui');
  await p.goBack(); await p.waitForTimeout(150);
  verifier((await texte(p, T + '.s-afaire')).includes('C’est oui : premier jour'), '« À faire » : la suite du contrat');

  /* le glissé supprime, « Annuler » rend */
  await glisser(p, T + '.gl[data-id="dat"] .rang', -150);
  verifier(!(await p.isVisible(T + '.gl[data-id="dat"]')) && (await texte(p, '.couche-a')).includes('Datagora supprimée'), 'glissée : supprimée, avec « Annuler »');
  await p.click('.couche-a [data-a="annuler"]');
  verifier(await p.isVisible(T + '.gl[data-id="dat"]'), '« Annuler » la rend');
  await ctx.close();
}

/* ---------- de Trouver au premier message ---------- */
{
  const { ctx, p } = await ouvrir(390, 844, { mobile: true, profil: PROFIL });
  await p.waitForSelector(T + '.s-liste .rang.ent');
  await p.click(T + '.s-liste .r-c[data-id="812000001"]');
  await p.click(T + '.pied [data-a="garder"]');
  verifier(await p.isVisible(T + '.pied [data-a="ecrire-p"]'), 'gardée : « Préparer mon message »');
  await p.click(T + '.pied [data-a="ecrire-p"]');
  await p.waitForSelector(T + '.ecr');
  verifier(await p.evaluate(() => location.hash === '#/pistes') && (await texte(p, T + '.a-qui')).includes('Claire Durand'),
    'Trouver › une entreprise gardée › le message, à la personne de l’annuaire');
  await p.goBack(); await p.waitForTimeout(150);
  verifier((await texte(p, T + '.suite-b')).includes('À contacter : Claire Durand'), 'le retour passe par la piste');
  await p.goBack(); await p.goBack(); await p.waitForTimeout(200);
  verifier(await p.evaluate(() => location.hash === '#/trouver') && (await texte(p, T + '.s-page h4')) === 'Réseaux et Systèmes du Nord',
    'puis revient à l’entreprise, dans Trouver');
  await ctx.close();
}

/* ---------- le pire jour : vingt-cinq pistes, onze muettes ---------- */
{
  const noms = ['Lys Informatique', 'Opale Systèmes', 'Escaut Data', 'Beffroi Sécurité', 'Deûle Réseaux', 'Vauban Infra', 'Gayant Logiciels',
    'Wazemmes Web', 'Artois Numérique', 'Marquette Télécom', 'Hainaut Infogérance', 'Scarpe IT', 'Flandres Support', 'Lomme Systèmes',
    'Beaulieu Cloud', 'Citadelle Réseaux', 'Ronchin Informatique', 'Loos Numérique', 'Faches Systèmes', 'Tourcoing Data', 'Kiabi', 'Worldline',
    'Datagora', 'Septentrion Cloud', 'Nord Infogérance'];
  const jours = [8, 23, 2, 3, 4, 6, 47, 52, 58, 61, 49, 66, 72, 55, 80, 46, 63, 0, 0, 30, 41, 70, 75, 60, 50];
  const L = noms.map((n, i) => i >= 17 && i < 19 ? { id: 'p' + i, name: n, city: 'Lille', status: 'todo', history: [{ d: J(1), t: 'Gardée' }] }
    : i >= 19 ? { id: 'p' + i, name: n, city: 'Lille', status: 'reply', closedReason: 'rejected', history: [{ d: J(jours[i]), t: 'Refus' }] }
    : { id: 'p' + i, name: n, city: 'Lille', status: 'active', appliedAt: J(jours[i]), history: [{ d: J(jours[i]), t: 'Écrit, sur leur site' }] });
  const { ctx, p } = await ouvrir(390, 844, { mobile: true, profil: PROFIL, pistes: L, adresse: '#/pistes' });
  const af = await texte(p, T + '.s-afaire');
  verifier(/\d+ pistes sans réponse/.test(af) && af.includes('depuis plus de 45 jours'), 'le pire jour : les muettes se rangent d’un geste');
  verifier(await p.isVisible(T + '.qp'), 'à partir de dix pistes, une barre de recherche');
  await img(p, 't10-pire-jour');
  const n = Number((af.match(/(\d+) pistes sans réponse/) || [])[1]);
  await p.click(T + '[data-a="ranger"]');
  verifier((await texte(p, '.couche-a')).includes(n + ' pistes rangées'), '« Ranger » : toutes, avec « Annuler »');
  verifier((await texte(p, T)).includes('Terminées · ' + (6 + n)) || new RegExp('terminées · ' + (6 + n), 'i').test(await texte(p, T)), 'elles passent dans « Terminées »');
  await p.click('.couche-a [data-a="annuler"]');
  verifier(/\d+ pistes sans réponse/.test(await texte(p, T + '.s-afaire')), '« Annuler » les rend');
  await p.fill(T + '.qp', 'vauban');
  verifier((await texte(p, T + '.p-liste-c')).includes('Vauban Infra') && !(await texte(p, T + '.p-liste-c')).includes('Kiabi'), 'la recherche trouve une piste par son nom');
  await ctx.close();
}

/* ---------- petit téléphone, sombre ---------- */
{
  const { ctx, p } = await ouvrir(360, 640, { mobile: true, sombre: true, profil: PROFIL, pistes: PISTES, adresse: '#/pistes' });
  verifier((await deborde(p)).length === 0, '360 : rien ne déborde · ' + (await deborde(p)).join(', '));
  verifier((await petites(p)).length === 0, '360 : cibles de 44 px · ' + (await petites(p)).join(', '));
  await img(p, 's1-pistes-sombre');
  await p.click(T + '.r-c[data-id="hdf"]');
  await p.waitForTimeout(250);
  verifier((await deborde(p)).length === 0, '360, une piste : rien ne déborde · ' + (await deborde(p)).join(', '));
  await img(p, 's2-piste-sombre');
  await p.click(T + '.suite-b [data-a="ecrire"]');
  await p.waitForTimeout(250);
  verifier((await deborde(p)).length === 0, '360, écrire : rien ne déborde · ' + (await deborde(p)).join(', '));
  await img(p, 's3-ecrire-sombre');
  await ctx.close();
}

/* ---------- au poste : la liste, la piste, le message ---------- */
for (const sombre of [false, true]){
  const { ctx, p } = await ouvrir(1280, 800, { sombre, profil: PROFIL, pistes: PISTES, adresse: '#/pistes' });
  await p.evaluate(INTERCEPTER);
  verifier(await p.isVisible('.pc1') && await p.isVisible('.pc2') && await p.isVisible('.pc3'), 'au poste : trois colonnes');
  verifier((await texte(p, '.pc3')).includes('Écrire un merci'), 'à droite, le message de la suite');
  await img(p, 'p1-pistes' + (sombre ? '-sombre' : ''));
  await p.click('.pc1 .r-c[data-id="hdf"]');
  await p.keyboard.press('ArrowDown');
  verifier((await texte(p, '.pc2 h4')) === 'Septentrion Cloud', '↓ ouvre la piste suivante');
  verifier((await texte(p, '.pc3')).includes('Relancer'), 'et son message : la relance');
  if (!sombre){
    await p.click('.pc3 .canaux [data-v="site"]');
    verifier(await p.evaluate(() => document.querySelector('.pc3 .canaux .on').textContent === 'Site'), 'le canal se change au poste');
    await img(p, 'p2-relance');
  }
  await ctx.close();
}

await fermer();
console.log(`captures dans ${OUT}`);
console.log(`ÉCHECS ${etat.echecs.length} · ERREURS ${etat.erreurs.length}`);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 10).join('\n'));
if (etat.echecs.length || etat.erreurs.length) process.exitCode = 1;
