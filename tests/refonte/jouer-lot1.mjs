/* ============================================================
   OpenContact · la nouvelle interface · rejouer le lot 1
   (la coque et Trouver ; docs/refonte-reprendre.md §8)

   Usage : node tests/refonte/jouer-lot1.mjs [dossier des captures]

   Joue Trouver de bout en bout sur l'annuaire fictif, au téléphone
   (390 et 360 px, clair et sombre) et au poste (1280 px, clair et
   sombre) : les trois questions, la liste, la page d'une entreprise,
   Garder, Pas pour moi et « Annuler », la barre (un nom, un lien, une
   entreprise hors de l'annuaire), le hors ligne, la panne, le retour du
   navigateur, le clavier du poste. Écrit ses captures et finit par
   « ÉCHECS 0 · ERREURS 0 ». Une suite verte dit que c'est conforme ;
   les captures, qu'on regarde, disent si c'est bien.
   ============================================================ */
import path from 'path';
import { lancer, deborde, petites, glisser, texte, lireCle, PROFIL } from './outils.mjs';

const { OUT, ouvrir, verifier, fermer, etat } = await lancer('lot1');
const img = async (p, nom) => { await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, nom + '.png') }); };
const T = '.ecran ';

/* ---------- au téléphone, le premier jour ---------- */
{
  const { ctx, p, an } = await ouvrir(390, 844, { mobile: true });
  verifier(await p.isVisible('.s-form'), 'jour 1 : les trois questions');
  verifier(!(await p.isVisible('.fen-tb')), 'au téléphone, pas de barre de titre de fenêtre');
  verifier(an.journal.length === 0, 'rien ne part au démarrage');
  await img(p, 't1-questions');
  await p.click('[data-a="voir"]');
  verifier(/à choisir/i.test(await texte(p, '.s-form')), 'sans réponse : « à choisir » sous ce qui manque');
  await p.click('[data-a="b-quoi"][data-id="alternance"]');
  await p.click('[data-a="b-form"][data-id="BTS SIO SISR"]');
  await p.fill('.f-ville', 'Lile');
  await p.click('[data-a="voir"]');
  verifier((await texte(p, '.s-form')).includes('Je ne trouve pas « Lile »'), 'une ville inconnue se dit sous le champ');
  verifier((await p.inputValue('.f-ville')) === 'Lile', 'la saisie reste');
  await p.fill('.f-ville', 'Lille');
  await p.click('[data-a="voir"]');
  await p.waitForSelector(T + '.s-liste .rang.ent');
  verifier((await texte(p, '.s-tags')).replace(/\s+/g, ' ').includes('Alternance Systèmes et réseaux Lille · 15 km'), 'les trois mots de la recherche');
  verifier(an.journal.some(u => u.includes('/near_point') && u.includes('radius=15')), 'la question part autour de Lille, 15 km');
  verifier(!an.journal.some(u => /Ines|Martin/i.test(decodeURIComponent(u))), 'rien du profil ne part (le nom)');
  const prof = (await lireCle(p, 'oc_profile_v1')) || {};
  verifier(prof.recherche === 'alternance' && prof.formation === 'BTS SIO SISR' && prof.ville === 'Lille' && prof.rayon === 15,
    'les réponses sont dans le profil, sous ses clés');
  await img(p, 't2-liste');
  verifier((await deborde(p)).length === 0, '390 : rien ne déborde · ' + (await deborde(p)).join(', '));
  verifier((await petites(p)).length === 0, '390 : cibles de 44 px · ' + (await petites(p)).join(', '));

  /* la page d'une entreprise */
  await p.click(T + '.s-liste .r-c[data-id="812000001"]');
  await p.waitForSelector(T + '.s-page h4');
  await p.waitForTimeout(300);
  const pg = await texte(p, T + '.s-page');
  verifier(pg.includes('Réseaux et Systèmes du Nord') && pg.includes('Claire Durand'), 'la page dit le nom et à qui écrire');
  verifier(/RÉCEMMENT/i.test(pg) && /nouvel établissement/i.test(pg), 'la page dit ce qui bouge (BODACC)');
  verifier(/COMPTES/i.test(pg) && pg.includes('bénéficiaire'), 'la page dit les comptes');
  verifier(/AIDE/i.test(pg) && pg.includes('4'), 'la page dit l’aide à l’embauche d’un apprenti');
  verifier(await p.evaluate(() => document.title === 'Entreprise — OpenContact'), 'le titre du document suit la page');
  await img(p, 't3-entreprise');
  await p.click(T + '.pied [data-a="garder"]');
  verifier((await texte(p, T + '.pied')).includes('Gardée'), 'gardée : le pied le dit');
  const pistes = (await lireCle(p, 'oc_data_v3')) || [];
  const rsn = pistes.find(c => c.siren === '812000001');
  verifier(!!rsn && rsn.status === 'todo' && !rsn.closedReason, '« Garder » crée une piste à contacter');
  verifier(!!rsn && rsn.contacts.length === 1 && rsn.contacts[0].name === 'Claire Durand' && !rsn.contacts[0].email,
    'la piste porte la personne à qui écrire, sans adresse inventée');
  await img(p, 't4-gardee');
  /* le retour du navigateur referme la page, pas l'écran */
  await p.goBack();
  await p.waitForSelector(T + '.t-corps');
  verifier(await p.isVisible(T + '.pied [data-a="aller"]'), '« Continuer avec ma piste » au pied');
  verifier((await texte(p, T + '.s-liste')).includes('gardée'), 'la ligne reste, « gardée »');
  verifier(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-id') === '812000001'),
    'revenu de la page, la main est sur sa ligne');
  verifier(await p.evaluate(() => /Pistes/.test(document.querySelector('.onglets [data-id="pistes"]').textContent) && /1/.test(document.querySelector('.onglets [data-id="pistes"] b').textContent)),
    'l’onglet Pistes compte la piste');

  /* « Pas pour moi » au glissé, puis « Annuler » */
  await glisser(p, T + '.gl[data-id="812000002"] .rang', -140);
  await p.waitForTimeout(150);
  verifier(!(await p.isVisible(T + '.gl[data-id="812000002"]')), 'glissée : la ligne part');
  verifier((await texte(p, '.couche-a')).includes('Nord Infogérance : pas pour moi'), 'la barre « Annuler » le dit');
  await img(p, 't5-annuler');
  await p.click('.couche-a [data-a="annuler"]');
  verifier(await p.isVisible(T + '.gl[data-id="812000002"]'), '« Annuler » la rend');

  /* la suite de la liste */
  await p.click(T + '[data-a="suite"]');
  verifier(await p.evaluate(() => document.querySelectorAll('.ecran .s-liste .rang.ent').length) >= 12, '« Voir les 6 suivantes »');
  if (!(await p.isVisible(T + '.s-liste .r-c[data-id="812000011"]'))) await p.click(T + '[data-a="suite"]');
  await p.click(T + '.s-liste .r-c[data-id="812000011"]');
  await p.waitForTimeout(300);
  verifier((await texte(p, T + '.s-page')).includes('Redressement judiciaire'), 'une procédure se dit en tête de la page');
  await img(p, 't6-alerte');
  await p.goBack();

  /* la barre : un nom, un lien, une entreprise hors de l'annuaire */
  await p.click(T + '.q');
  verifier(await p.evaluate(() => document.querySelector('.ecran').classList.contains('cherche')), 'la barre prend le haut');
  verifier((await texte(p, T + '.t-corps')).includes('Coller un lien'), 'barre vide : « Coller un lien »');
  await p.fill(T + '.q', 'advens');
  await p.waitForTimeout(900);
  verifier((await texte(p, T + '.t-corps')).includes('Advens'), 'un nom trouve l’entreprise');
  verifier(!(await texte(p, T + '.t-corps')).includes('Garder « advens »'), 'le nom exact ne propose pas « tel quel »');
  verifier(an.journal.some(u => u.includes('q=advens') && !u.includes('departement')), 'un nom se cherche partout, pas seulement autour de Lille');
  await img(p, 't7-recherche');
  await p.fill(T + '.q', 'https://www.linkedin.com/company/septentrion-cloud/');
  await p.waitForTimeout(900);
  verifier((await texte(p, T + '.t-corps')).includes('Lu dans ton lien : Septentrion Cloud'), 'un lien LinkedIn se lit');
  verifier((await texte(p, T + '.t-corps')).includes('Septentrion Cloud'), 'et trouve l’entreprise');
  await p.fill(T + '.q', 'Boulangerie Martin');
  await p.waitForTimeout(900);
  verifier((await texte(p, T + '.t-corps')).includes('Garder « Boulangerie Martin »'), 'hors de l’annuaire : « Garder tel quel »');
  await p.click(T + '[data-a="tel-quel"]');
  await p.waitForSelector(T + '.s-page h4');
  verifier((await texte(p, T + '.s-page')).includes('Pas dans l’annuaire'), 'gardée telle quelle : la page le dit');
  await img(p, 't8-tel-quel');
  await p.goBack();
  await p.waitForSelector(T + '.t-corps');

  /* les trois mots rouvrent les questions, avec le rayon */
  await p.click(T + '.s-tags button');
  verifier(await p.isVisible(T + '.seg [data-id="30"]'), 'les questions se rouvrent, avec « Jusqu’où »');
  await img(p, 't9-editer');
  await p.click(T + '[data-a="voir"]');

  /* ce qui est gardé arrive dans Pistes (le lot 2 le joue en entier) */
  await p.click('.onglets [data-id="pistes"]');
  verifier(await p.evaluate(() => location.hash === '#/pistes'), 'l’adresse dit l’onglet');
  verifier((await texte(p, T)).includes('Boulangerie Martin') && (await texte(p, T)).includes('Réseaux et Systèmes du Nord'), 'Pistes montre ce qui est gardé');
  verifier((await texte(p, T + '.s-afaire')).includes('Claire Durand, présidente'), 'et « À faire » propose d’écrire à la personne gardée');
  await img(p, 't10-pistes');
  await p.goBack();
  verifier(await p.evaluate(() => location.hash === '#/trouver'), 'le retour revient à Trouver');

  /* le hors ligne, puis la panne */
  await ctx.setOffline(true);
  await p.click(T + '.s-tags button');
  await p.click(T + '[data-a="b-rayon"][data-id="30"]');
  await p.click(T + '[data-a="voir"]');
  await p.waitForTimeout(200);
  verifier((await texte(p, T + '.t-corps')).includes('Pas de réseau'), 'hors ligne : la liste le dit');
  await img(p, 't11-hors-ligne');
  an.regler({ statut: 500 });
  await ctx.setOffline(false);
  await p.waitForTimeout(600);
  verifier((await texte(p, T + '.t-corps')).includes('L’annuaire ne répond pas'), 'la panne se dit, avec « Réessayer »');
  await img(p, 't12-panne');
  an.regler({ statut: 200 });
  await p.click(T + '[data-a="reessayer"]');
  await p.waitForSelector(T + '.s-liste .rang.ent');
  verifier(true, 'Réessayer rend la liste');
  await ctx.close();
}

/* ---------- au téléphone, sombre, et sur un petit téléphone ---------- */
{
  const { ctx, p } = await ouvrir(390, 844, { mobile: true, sombre: true, profil: PROFIL });
  await p.waitForSelector(T + '.s-liste .rang.ent');
  await img(p, 't2-liste-sombre');
  await p.click(T + '.s-liste .r-c');
  await p.waitForTimeout(300);
  await img(p, 't3-entreprise-sombre');
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir(360, 640, { mobile: true, profil: PROFIL });
  await p.waitForSelector(T + '.s-liste .rang.ent');
  verifier((await deborde(p)).length === 0, '360 : rien ne déborde · ' + (await deborde(p)).join(', '));
  verifier((await petites(p)).length === 0, '360 : cibles de 44 px · ' + (await petites(p)).join(', '));
  await img(p, 's2-liste-360');
  await p.click(T + '.s-liste .r-c');
  await p.waitForTimeout(300);
  verifier((await deborde(p)).length === 0, '360, page : rien ne déborde · ' + (await deborde(p)).join(', '));
  await img(p, 's3-entreprise-360');
  await ctx.close();
}

/* ---------- au poste ---------- */
for (const sombre of [false, true]){
  const suf = sombre ? '-sombre' : '';
  const { ctx, p, an } = await ouvrir(1280, 800, { sombre, profil: sombre ? PROFIL : null });
  if (!sombre){
    verifier(await p.isVisible('.fen-tb'), 'au poste, la fenêtre a sa barre de titre');
    verifier((await texte(p, '.c2')).includes('Tes entreprises apparaissent ici'), 'jour 1 au poste : la colonne de droite attend');
    await img(p, 'p1-questions');
    await p.click('[data-a="b-quoi"][data-id="alternance"]');
    await p.click('[data-a="b-form"][data-id="BUT R&T"]');
    await p.fill('.f-ville', 'lille');
    await p.press('.f-ville', 'Enter');
  }
  await p.waitForSelector('.c1 .s-liste .rang.ent');
  await p.waitForTimeout(400);
  verifier(await p.isVisible('.c1 .rang.ent.on'), 'au poste, la première ligne est ouverte à droite');
  verifier((await texte(p, '.c2 h4')).length > 0, 'la page de l’entreprise est à droite');
  if (!sombre) verifier((await texte(p, '.s-tags')).includes('Réseaux et télécoms'), 'BUT R&T : « Réseaux et télécoms »');
  await img(p, 'p2-liste' + suf);
  /* le clavier : ↓, G, X, « / », les lettres des onglets */
  await p.click('.c1 .rang.ent.on .r-c');
  const avant = await texte(p, '.c2 h4');
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(150);
  const apres = await texte(p, '.c2 h4');
  verifier(avant !== apres, '↓ ouvre l’entreprise suivante');
  await p.keyboard.press('g');
  verifier((await texte(p, '.c2 .pied')).includes('Gardée'), 'G garde');
  await p.keyboard.press('ArrowDown');
  const ecartee = await texte(p, '.c2 h4');
  await p.keyboard.press('x');
  await p.waitForTimeout(150);
  verifier((await texte(p, '.couche-a')).includes(ecartee + ' : pas pour moi'), 'X écarte, avec « Annuler »');
  verifier(await p.evaluate(() => !!document.activeElement.closest('.c1 .rang.on')), 'la main passe à la ligne suivante');
  await img(p, 'p3-clavier' + suf);
  await p.click('.couche-a [data-a="annuler"]');
  await p.keyboard.press('/');
  verifier(await p.evaluate(() => document.activeElement.classList.contains('q')), '« / » met la main dans la barre');
  await p.keyboard.type('ovh');
  await p.waitForTimeout(900);
  verifier(/ovhcloud/i.test(await texte(p, '.c1')), 'la barre trouve au poste');
  await img(p, 'p4-recherche' + suf);
  await p.keyboard.press('Escape');
  verifier(!(await p.evaluate(() => document.querySelector('.ecran').classList.contains('cherche'))), 'Échap ferme la recherche');
  await p.locator('body').click({ position: { x: 5, y: 5 } });
  await p.keyboard.press('p');
  verifier(await p.evaluate(() => location.hash === '#/pistes'), 'P ouvre Pistes');
  await p.keyboard.press('t');
  verifier(await p.evaluate(() => location.hash === '#/trouver'), 'T revient à Trouver');
  verifier(!an.journal.some(u => /Ines|Martin/i.test(decodeURIComponent(u))), 'au poste non plus, rien du profil ne part');
  await ctx.close();
}

await fermer();
console.log(`captures dans ${OUT}`);
console.log(`ÉCHECS ${etat.echecs.length} · ERREURS ${etat.erreurs.length}`);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 10).join('\n'));
if (etat.echecs.length || etat.erreurs.length) process.exitCode = 1;
