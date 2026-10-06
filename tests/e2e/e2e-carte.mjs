/* ============================================================
   La carte d'une entreprise — les sources mêlées, sans un lien à toucher
   (engine/carte.js, ui/carte.js ; docs/carte.md)

   Demande du mainteneur, 5 octobre 2026 : « que les infos soient
   affichées d'une belle façon sans devoir appuyer sur un lien », et
   « mixer les sources afin de donner les meilleures infos ». Ce fichier
   garde les deux moitiés de la promesse, en partant de l'état RÉEL de
   l'app et en lisant CHAQUE requête qui sort (§8) :

   ① rien ne part au démarrage, ni pendant la frappe — les sources de la
     carte ne sont interrogées que pour une entreprise qu'on REGARDE ;
   ② ce qui part : Wikidata et le BODACC reçoivent le SIREN, Wikipédia le
     titre que Wikidata a donné, Wikimedia le nom du logo — jamais un mot
     de note, un contact, un prénom, le profil ;
   ③ une valeur par fait : la phrase de Wikipédia passe devant tout
     libellé, ta phrase (« En bref ») passe devant tout ; puis les trois
     lignes qui aident à CHOISIR (retour du mainteneur, 6 octobre) — les
     missions et si elles collent à ta formation, la taille en mots, à
     qui écrire ; plus de chiffre d'affaires, de création, de sites ; les
     sources citées sont celles qui ont DIT quelque chose ;
   ④ ce qui réclame quelque chose (une procédure collective) se pose EN
     LIGNE, et rien ne glisse sous le doigt quand la réponse arrive en
     retard ;
   ⑤ dans la fiche, « À savoir » est ouvert au pouce : la carte se voit
     sans rien toucher ; « à qui écrire » vit avec les contacts tant que
     la piste n'a pas d'adresse ;
   ⑥ hors ligne : rien ne part, la carte montre ce que l'annuaire a dit,
     zéro erreur ;
   ⑦ 320 px à 200 % : rien ne déborde, aucune ligne rognée ; en sombre, le
     logo garde un carreau clair ;
   ⑧ au poste, ↓ ↓ ↓ dans la liste ne lance pas trois questions ;
   ⑨ le composeur reçoit ce que fait l'entreprise, et sa taille ; sans
     adresse, il nomme la personne à qui écrire.

   Les sources sont REMPLACÉES par des réponses à leur forme relevée
   (`sonde-carte.mjs`, en CI). La CSP de l'app est la vraie : si elle
   bloquait un appel, le navigateur le refuserait avant l'interception.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ENT = (siren, nom, ville, cp, tranche, o = {}) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, activite_principale: '62.02A', tranche_effectif_salarie: tranche,
  date_creation: o.creation || '2009-03-12', nombre_etablissements_ouverts: o.sites ?? 4, etat_administratif: 'A',
  nature_juridique: '5710', complements: { liste_idcc: ['1486'], est_entrepreneur_individuel: false },
  finances: o.finances || { 2024: { ca: 51128553, resultat_net: 1200000 } },
  siege: { est_siege: true, numero_voie: '38', type_voie: 'RUE', libelle_voie: 'DE LA BASSEE', code_postal: cp,
           libelle_commune: ville, latitude: '50.637', longitude: '3.06', etat_administratif: 'A', caractere_employeur: 'O' },
  matching_etablissements: [],
  dirigeants: [{ nom: 'LEROY', prenoms: 'THOMAS', qualite: 'Président', type_dirigeant: 'personne physique' }]
});
const SOPRA = '326820065', DATAFLOW = '834567890', ADVENS = '812345678';
const RES = [
  ENT(SOPRA, 'SOPRA STERIA GROUP', 'LILLE', '59000', '53', { finances: { 2024: { ca: 5800000000 } }, sites: 120, creation: '1985-01-01' }),
  ENT(DATAFLOW, 'DATAFLOW NORD', 'ROUBAIX', '59100', '11', { finances: { 2025: { ca: 0 } }, sites: 1, creation: '2021-06-01' }),
  ENT(ADVENS, 'ADVENS', 'LILLE', '59000', '22')
];
const RESUME = 'Sopra Steria est une entreprise de services du numérique (ESN) française et une société de conseil en transformation numérique. Elle emploie 50 000 personnes.';

const PISTES = [
  { id: 'a', name: 'Advalys Cyber', city: 'Lille', status: 'active', updatedAt: 5, notes: 'rappeler Bertrand lundi',
    contacts: [{ id: 'c1', name: 'Julie Marchand', role: 'RH', email: 'julie@advalys.test' }] },
  { id: 'b', name: 'Lumen Data', city: 'Lille', status: 'todo', updatedAt: 4 },
  { id: 'adv', name: 'Advens', siren: ADVENS, city: 'Lille', status: 'todo', updatedAt: 3, desc: 'SOC à Lille, trois alternants',
    contacts: [] },
  { id: 'df', name: 'Dataflow Nord', siren: DATAFLOW, city: 'Roubaix', status: 'todo', updatedAt: 2, contacts: [] }
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR', ecole: 'Lycée Baggio', recherche: 'alternance', email: 'ines@exemple.test' };
const PRIVES = ['bertrand', 'rappeler', 'julie', 'marchand', 'ines', 'martin', 'baggio', 'alternants', 'soc a lille'];
const pliees = s => decodeURIComponent(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* toutes les sources, fabriquées ; CHAQUE requête est notée */
function sources(ctx, o = {}){
  const journal = [];
  const cors = { 'access-control-allow-origin': '*' };
  const note = (route) => { journal.push(route.request().url()); };
  ctx.route('https://recherche-entreprises.api.gouv.fr/**', r => { note(r);
    const q = new URL(r.request().url()).searchParams.get('q') || '';
    const res = /^\d{9}$/.test(q) ? RES.filter(x => x.siren === q) : RES;
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: res, total_results: res.length }) }); });
  ctx.route('https://query.wikidata.org/**', r => { note(r);
    const q = decodeURIComponent(r.request().url());
    const b = q.includes(SOPRA) ? [{ site: { value: 'https://www.soprasteria.com/' }, desc: { value: 'société de services en ingénierie informatique' },
        logo: { value: 'http://commons.wikimedia.org/wiki/Special:FilePath/Sopra%20Steria%20logo.svg' }, li: { value: 'soprasteria' },
        article: { value: 'https://fr.wikipedia.org/wiki/Sopra_Steria' } }]
      : q.includes(ADVENS) ? [{ desc: { value: 'entreprise de cybersécurité' } }] : [];
    return r.fulfill({ status: 200, contentType: 'application/sparql-results+json', headers: cors, body: JSON.stringify({ results: { bindings: b } }) }); });
  ctx.route('https://fr.wikipedia.org/**', r => { note(r);
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ type: 'standard', extract: RESUME }) }); });
  ctx.route('https://bodacc-datadila.opendatasoft.com/**', async r => { note(r);
    if (o.retardBodacc) await new Promise(ok => setTimeout(ok, o.retardBodacc));
    const u = decodeURIComponent(r.request().url());
    const res = u.includes(DATAFLOW) ? [{ familleavis: 'collective', familleavis_lib: 'Procédures collectives', dateparution: '2026-08-12',
      jugement: JSON.stringify({ nature: 'Jugement d\'ouverture d\'une procédure de redressement judiciaire', date: '2026-08-05' }) }] : [];
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ results: res }) }); });
  ctx.route(/^https:\/\/(commons|upload)\.wikimedia\.org\//, r => { note(r);
    return r.fulfill({ status: 200, contentType: 'image/svg+xml', headers: cors,
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#1d1d1b"/></svg>' }); });
  return journal;
}
const hors = (journal, h) => journal.filter(u => !u.startsWith(h));
const carteSort = j => j.filter(u => !u.startsWith('https://recherche-entreprises'));

async function ecran(vp, touch, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  const journal = sources(ctx, o);
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED/.test(m.text())) errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [o.pistes || PISTES.filter(c => !c.siren), PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  if (o.zoom) await p.evaluate(z => { document.documentElement.style.fontSize = z; }, o.zoom);
  return { ctx, p, journal };
}
const versDecouvrir = async p => {
  await p.fill('#piQ', 'informatique Lille');
  await p.waitForTimeout(1200);
  await p.click('#piPortee [data-portee="decouvrir"]');
  await p.waitForSelector('#piDec .dc-row', { timeout: 4000 });
};
/* l'aperçu ouvert, une fois ses sources répondues */
const lireCarte = (p, sel) => p.evaluate(sel => {
  const b = document.querySelector(sel);
  if (!b) return null;
  return {
    faits: b.querySelector('.ap-faits')?.textContent.replace(/\s+/g, ' ').trim() || '',
    alerte: b.querySelector('.ap-faits .mark, .fa-etat-nom .mark')?.textContent.trim() || '',
    quoi: b.querySelector('.ct-quoi p')?.textContent.trim() || '',
    ton: b.querySelector('.ct-ton')?.textContent.trim() || '',
    lignes: [...b.querySelectorAll('.ct .fk')].map(f => f.querySelector('.fk-l')?.textContent.trim() + ': ' + f.querySelector('.fk-v')?.textContent.replace(/\s+/g, ' ').trim()),
    sources: b.querySelector('.ct-src')?.textContent.replace(/\s+/g, ' ').trim() || '',
    logo: (() => { const i = b.querySelector('img.ct-logo'); return i ? { src: i.src, ref: i.referrerPolicy } : null; })(),
    liens: [...b.querySelectorAll('.ap-liens a')].map(a => a.textContent.trim()),
    boutons: b.querySelectorAll('.ct .btn, .ct button').length
  };
}, sel);

/* ---------- au pouce ---------- */
{
  const { ctx, p, journal } = await ecran({ width: 390, height: 844 }, true);
  /* ① rien au démarrage, rien d'autre que l'annuaire pendant la frappe */
  if (journal.length) fail('une requête est partie au DÉMARRAGE : ' + journal[0]);
  await versDecouvrir(p);
  if (carteSort(journal).length) fail('la frappe a interrogé une source de la carte : ' + carteSort(journal)[0]);
  else console.log('pouce · ① rien au démarrage ; la frappe n’interroge que l’annuaire ✓');

  /* ③ Sopra : Wikipédia, Wikidata, le logo, la page LinkedIn */
  await p.click('#piDec .dc-row:has-text("Sopra") .dc-main');
  await p.waitForSelector('.overlay .ct-quoi', { timeout: 3000 });
  await p.waitForFunction(() => /Wikipédia/.test(document.querySelector('.overlay .ct-src')?.textContent || ''), null, { timeout: 3000 }).catch(() => {});
  const s = await lireCarte(p, '.overlay .modal-b');
  if (s.quoi !== 'Sopra Steria est une entreprise de services du numérique française et une société de conseil en transformation numérique.')
    fail('ce qu’elle fait ne vient pas de Wikipédia, en une phrase sans parenthèses : ' + s.quoi);
  /* les trois lignes qui aident à choisir, dans l'ordre ; une grande : on écrit au recrutement */
  const attendu = ['Missions: Conseil et intégration informatique colle à ta formation', 'Taille: 10 000 salariés et plus',
                   'Écrire à: Son service recrutement LinkedIn', 'Site: soprasteria.com'];
  if (s.lignes.join(' | ') !== attendu.join(' | ')) fail('les lignes de la carte : ' + s.lignes.join(' | '));
  if (s.ton !== 'colle à ta formation') fail('BTS SIO SISR et des missions de réseau : « colle à ta formation » manque');
  if (/Md€|CA 20|création|sites/.test(JSON.stringify(s))) fail('le chiffre d’affaires, la création ou les sites reviennent : ' + JSON.stringify(s));
  if (s.sources !== 'Sources : Annuaire des entreprises · Wikipédia · Wikidata') fail('sources : ' + s.sources);
  if (!s.logo || s.logo.ref !== 'no-referrer' || !/Special:FilePath\/Sopra%20Steria%20logo\.svg\?width=96$/.test(s.logo.src)) fail('le logo : ' + JSON.stringify(s.logo));
  if (!s.liens.includes('Page LinkedIn')) fail('la page LinkedIn de l’entreprise n’est pas proposée : ' + s.liens);
  if (s.boutons) fail(`la carte porte ${s.boutons} bouton(s) — on la lit, on ne la manipule pas`);
  else console.log('pouce · ③ Wikipédia dit ce qu’elle fait ; missions (colle à ta formation), taille, à qui écrire, dans l’ordre ; la page LinkedIn, trois sources citées ✓');
  /* ② ce qui est parti pour cette carte */
  const partis = carteSort(journal);
  const wd = partis.filter(u => u.startsWith('https://query.wikidata.org'));
  const wp = partis.filter(u => u.startsWith('https://fr.wikipedia.org'));
  const bo = partis.filter(u => u.startsWith('https://bodacc'));
  if (!wd.length || wd.some(u => !pliees(u).includes(SOPRA))) fail('Wikidata n’a pas reçu le SIREN : ' + wd);
  if (wp.length !== 1 || !/\/page\/summary\/Sopra_Steria$/.test(wp[0])) fail('Wikipédia a reçu autre chose que le titre de l’article : ' + wp);
  if (!bo.length || new URL(bo[0]).searchParams.get('where') !== `registre like "${SOPRA}"`) fail('le BODACC n’a pas reçu le SIREN seul : ' + bo);
  for (const u of journal){ const w = PRIVES.find(m => pliees(u).includes(m)); if (w) fail(`« ${w} » est sorti : ${u}`); }
  console.log('pouce · ② Wikidata et le BODACC reçoivent le SIREN, Wikipédia le titre, rien de privé ✓');
  await p.screenshot({ path: `${SHOTS}/99-carte-pouce.png` });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await ctx.close();
}

/* ---------- ④ l'alerte en ligne, et rien ne glisse sous le doigt ---------- */
{
  const { ctx, p } = await ecran({ width: 390, height: 844 }, true, { retardBodacc: 700 });
  await versDecouvrir(p);
  await p.click('#piDec .dc-row:has-text("Dataflow") .dc-main');
  await p.waitForSelector('.overlay .modal-f button', { timeout: 3000 });
  await p.waitForTimeout(350);
  const pos = () => p.evaluate(() => {
    const r = document.querySelector('.overlay .modal-f button:last-child').getBoundingClientRect();
    const l = document.querySelector('.overlay .ap-liens a')?.getBoundingClientRect();
    return { pied: Math.round(r.top), lien: l ? Math.round(l.top) : null };
  });
  const avant = await pos();
  await p.waitForFunction(() => !!document.querySelector('.overlay .ap-faits .mark'), null, { timeout: 3000 }).catch(() => {});
  const apres = await pos();
  const d = await lireCarte(p, '.overlay .modal-b');
  if (d.alerte !== 'Redressement judiciaire' || !/depuis le 05\/08\/2026/.test(d.faits)) fail('la procédure collective ne se dit pas en ligne : ' + JSON.stringify(d));
  if (!/BODACC/.test(d.sources)) fail('le BODACC n’est pas cité : ' + d.sources);
  if (avant.pied !== apres.pied) fail(`le geste plein a glissé sous le doigt quand le BODACC a répondu (${avant.pied} → ${apres.pied})`);
  if (avant.lien != null && Math.abs(avant.lien - apres.lien) > 1) fail(`les liens ont glissé quand le BODACC a répondu (${avant.lien} → ${apres.lien})`);
  if (!process.exitCode) console.log('pouce · ④ « Redressement judiciaire » en ligne, cité au BODACC, et rien n’a glissé sous le doigt ✓');
  await p.screenshot({ path: `${SHOTS}/99-carte-alerte-pouce.png` });
  await ctx.close();
}

/* ---------- ⑤ la fiche : « À savoir » ouvert, ta phrase devant tout ---------- */
{
  const { ctx, p, journal } = await ecran({ width: 390, height: 844 }, true, { pistes: PISTES });
  await p.evaluate(async () => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === 'adv')); });
  await p.waitForSelector('#faCarte .fk', { timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(400);
  const f = await p.evaluate(() => ({
    ouvert: !!document.querySelector('#fiKnow')?.open,
    visible: (() => { const x = document.querySelector('#faCarte .fk'); return !!x && x.getClientRects().length > 0; })(),
    quoi: document.querySelector('#faCarte .ct-quoi p')?.textContent.trim() || '',
    enBref: [...document.querySelectorAll('#fiKnow .fk-l')].some(l => /en bref/i.test(l.textContent)),
    lignes: [...document.querySelectorAll('#faCarte .fk-l')].map(l => l.textContent.trim()),
    qui: (() => { const q = document.querySelector('#faCts .fa-qui'); return q ? q.querySelector('.fk-l').textContent.trim() + ' '
      + q.querySelector('.fk-v').textContent.replace(/\s+/g, ' ').trim() : ''; })()
  }));
  if (!f.ouvert || !f.visible) fail('au pouce, la carte de la fiche ne se voit pas sans toucher : ' + JSON.stringify(f));
  if (f.quoi !== 'SOC à Lille, trois alternants') fail('ta phrase ne passe pas devant Wikidata : ' + f.quoi);
  if (f.enBref) fail('« En bref » se redit à côté de la carte');
  if (f.lignes.join(',') !== 'Missions,Taille') fail('la carte de la fiche : ' + f.lignes);
  /* la piste n'a personne : à qui écrire vit avec les contacts, pas dans la carte */
  if (f.qui !== 'Écrire à Thomas Leroy, président LinkedIn') fail('la fiche ne dit pas à qui écrire, avec les contacts : ' + f.qui);
  for (const u of journal){ const w = PRIVES.find(m => pliees(u).includes(m)); if (w) fail(`fiche : « ${w} » est sorti : ${u}`); }
  if (!process.exitCode) console.log('pouce · ⑤ la fiche : « À savoir » ouvert, la carte se voit, ta phrase passe devant Wikidata ; « Écrire à Thomas Leroy » avec les contacts ✓');
  await p.evaluate(() => document.querySelector('#fiKnow').scrollIntoView({ block: 'start' }));
  await p.screenshot({ path: `${SHOTS}/99-carte-fiche-pouce.png` });
  /* ⑨ le composeur reçoit la matière : ici « En bref » existe, il parle seul */
  await p.evaluate(() => document.querySelector('.modal-fiche button.x')?.click());
  await p.waitForTimeout(400);
  /* Dataflow : pas d'« En bref » — la carte prête son activité et sa taille */
  await p.evaluate(async () => { const { S } = await import('./ui/state.js');
    (await import('./ui/fiche.js')).openFiche(S.companies.find(c => c.id === 'df')); });
  await p.waitForFunction(() => !!document.querySelector('.fa-etat-nom .mark'), null, { timeout: 4000 }).catch(() => {});
  const tete = await p.evaluate(() => document.querySelector('.fa-etat-nom')?.textContent.replace(/\s+/g, ' ').trim() || '');
  if (!/^Redressement judiciaire/.test(tete)) fail('la fiche ne dit pas la procédure sous le nom : ' + tete);
  await p.evaluate(async () => { const { S } = await import('./ui/state.js');
    (await import('./ui/mail.js')).openMail(S.companies.find(c => c.id === 'df')); });
  await p.waitForSelector('.ml-know', { timeout: 3000 }).catch(() => {});
  const know = await p.evaluate(() => [...document.querySelectorAll('.ml-know .fk')].map(f => f.querySelector('.fk-l').textContent + ': ' + f.querySelector('.fk-v').textContent.trim()));
  if (!know.includes('Activité: Conseil et intégration informatique') || !know.includes('Taille: 10 à 19 salariés'))
    fail('le composeur ne reçoit pas ce que fait l’entreprise et sa taille : ' + JSON.stringify(know));
  /* sans adresse, le composeur nomme la personne et ouvre la recherche qui la trouve */
  const hint = await p.evaluate(() => { const a = document.querySelector('#mHint a'); return a ? { t: a.textContent.trim(), h: a.href } : null; });
  if (!hint || hint.t !== 'Thomas Leroy sur LinkedIn' || new URL(hint.h).searchParams.get('keywords') !== 'Thomas Leroy Dataflow Nord')
    fail('sans email, le composeur ne nomme pas à qui écrire : ' + JSON.stringify(hint));
  if (!process.exitCode) console.log('pouce · ⑨ la procédure sous le nom de la fiche ; le composeur reçoit l’activité et la taille, et nomme à qui écrire ✓');
  await ctx.close();
}

/* ---------- ⑥ hors ligne ---------- */
{
  const { ctx, p, journal } = await ecran({ width: 390, height: 844 }, true);
  await versDecouvrir(p);
  const n0 = journal.length;
  await ctx.setOffline(true);
  await p.evaluate(() => dispatchEvent(new Event('offline')));
  await p.click('#piDec .dc-row:has-text("Advens") .dc-main');
  await p.waitForSelector('.overlay .ct .fk', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(500);
  const h = await lireCarte(p, '.overlay .modal-b');
  if (journal.length !== n0) fail('hors ligne, une source de la carte a été interrogée : ' + journal.slice(n0));
  if (!h || h.lignes.join(' | ') !== 'Missions: Conseil et intégration informatique colle à ta formation | Taille: 100 à 199 salariés | Écrire à: Thomas Leroy, président LinkedIn')
    fail('hors ligne, la carte ne montre pas ce que l’annuaire a dit : ' + JSON.stringify(h));
  else console.log('pouce · ⑥ hors ligne : rien ne part, la carte montre ce que l’annuaire a dit ✓');
  await ctx.setOffline(false);
  await ctx.close();
}

/* ---------- ⑦ au plus étroit, texte doublé ; en sombre ---------- */
for (const [nom, o] of [['320-200', { zoom: '200%' }], ['sombre', { sombre: true }]]){
  const vp = nom === 'sombre' ? { width: 390, height: 844 } : { width: 320, height: 640 };
  const { ctx, p } = await ecran(vp, true, o);
  await versDecouvrir(p);
  await p.click('#piDec .dc-row:has-text("Sopra") .dc-main');
  await p.waitForSelector('.overlay img.ct-logo', { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(500);
  const g = await p.evaluate(() => {
    const m = document.querySelector('.overlay .modal-b');
    const mr = m.getBoundingClientRect().right;
    const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const logo = document.querySelector('.overlay img.ct-logo');
    return {
      deborde: [...m.querySelectorAll('.ct *, .ap-liens *')].filter(x => x.getBoundingClientRect().right > mr + 1).map(x => x.className || x.tagName).slice(0, 3),
      rognes: [...m.querySelectorAll('.ct .fk-v, .ct .fk-l, .ct-quoi p')].filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent),
      lateral: m.scrollWidth > m.clientWidth + 1,
      carreau: logo ? lum(rgb(getComputedStyle(logo).backgroundColor)) : null
    };
  });
  if (g.deborde.length || g.lateral) fail(`${nom} : la carte déborde de la feuille — ${g.deborde}`);
  if (g.rognes.length) fail(`${nom} : ligne ou phrase rognées — ${g.rognes}`);
  if (nom === 'sombre' && !(g.carreau > 0.8)) fail(`sombre : le carreau du logo n’est pas clair (${g.carreau}) — un logo sombre y disparaîtrait`);
  await p.screenshot({ path: `${SHOTS}/99-carte-${nom}.png` });
  console.log(`⑦ ${nom} : rien ne déborde, aucune ligne rognée${nom === 'sombre' ? ', le logo garde un carreau clair' : ''} ✓`);
  await ctx.close();
}

/* ---------- ⑧ au poste : la liste se parcourt sans lancer une question par ligne ---------- */
for (const sombre of [false, true]){
  const { ctx, p, journal } = await ecran({ width: 1280, height: 800 }, false, { sombre });
  await versDecouvrir(p);
  await p.waitForTimeout(800);
  const n0 = carteSort(journal).length;
  await p.click('#piQ');
  for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(900);
  const wd = carteSort(journal).slice(n0).filter(u => u.startsWith('https://query.wikidata.org'));
  const sirens = new Set(wd.map(u => (pliees(u).match(/"(\d{9})"/) || [])[1]));
  if (sirens.size > 1) fail(`au poste, ↓ ↓ ↓ a interrogé Wikidata pour ${sirens.size} entreprises : il faut attendre que la ligne soit posée`);
  const choisie = await p.evaluate(() => document.querySelector('#piDec .dc-detail .ap-nom')?.textContent.trim());
  await p.click('#piDec .dc-row:has-text("Sopra") .dc-main');
  await p.waitForFunction(() => /Wikipédia/.test(document.querySelector('#piDec .dc-detail .ct-src')?.textContent || ''), null, { timeout: 3000 }).catch(() => {});
  const c = await lireCarte(p, '#piDec .dc-detail');
  if (!c || !/^Sopra Steria est/.test(c.quoi)) fail('au poste, le panneau ne montre pas la carte complète : ' + JSON.stringify(c));
  await p.evaluate(() => document.activeElement.blur());
  await p.screenshot({ path: `${SHOTS}/99-carte-poste${sombre ? '-sombre' : ''}.png` });
  console.log(`poste ${sombre ? 'sombre' : 'clair'} · ⑧ ↓ ↓ ↓ : une question au plus (« ${choisie} »), et le panneau montre la carte complète ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E carte : ÉCHEC' : 'E2E carte : OK');
