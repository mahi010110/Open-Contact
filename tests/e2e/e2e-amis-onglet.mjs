/* ============================================================
   L'onglet « Amis » de « Mes pistes » (docs/reseau.md, lot 4a)

   Les amis se lisent comme les pistes : une ligne par ami, ce qu'il
   T'OUVRE en sous-ligne, triés comme les pistes, retirés au geste.
   L'onglet vit à côté de « À découvrir » — des onglets voisins montrent
   des choses de même nature (NN/g, Tabs Used Right) : une entreprise
   où entrer.

   ① LA FUITE D'ABORD : taper le nom d'un ami dans la barre — là où on
     le tape justement pour le retrouver — ne fait partir NI son nom NI
     son prénom vers l'annuaire public ; une question qui ne contenait
     que lui ne part pas du tout ;
   ② trois portées, et celle des amis compte PENDANT la frappe ;
   ③ la ligne dit ce que l'ami t'ouvre — tes pistes d'abord, en accent ;
     une piste close ne compte pas ; « aucune entreprise » se dit ;
   ④ « Pour toi » d'abord, puis « Trier » (le bouton de la barre devient
     ce geste ici), la puce de tri retire le tri, « Affiner » revient
     dans « Mes pistes » ;
   ⑤ retirer au geste (le glissé au doigt avec SON mot, la croix au
     survol au poste), « Annuler » le rend ;
   ⑥ au poste, liste-détail : la fiche de l'ami à côté, et elle suit le
     clavier (↓ depuis la barre, ↓ ↑, Échap remonte) ;
   ⑦ sans ami, l'état vide enseigne : les deux gestes qui remplissent
     la liste, « Mon QR » en premier ; avec des amis, « Ajouter un ami »
     ferme la liste et ouvre « Mon QR » ; « Échanger » ne porte plus
     aucun geste d'ami ;
   ⑧ « À découvrir » réchauffé : l'entreprise où un ami est passé
     remonte en tête, et dit qui — dans la ligne et dans l'aperçu ;
   ⑨ 320 px texte doublé, sombre : rien ne déborde, aucun nom coupé.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, relaisMuets, sourcesCarteMuettes } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* l'annuaire, fabriqué à sa forme réelle (comme e2e-decouvrir) */
const E = (siren, nom, ville, cp, lat, naf, tranche) => ({
  siren, nom_complet: nom, nom_raison_sociale: nom, sigle: null, activite_principale: naf,
  categorie_entreprise: 'PME', tranche_effectif_salarie: tranche, date_creation: '2009-03-12',
  nombre_etablissements_ouverts: 1,
  siege: { est_siege: true, numero_voie: '2', type_voie: 'RUE', libelle_voie: 'NATIONALE', code_postal: cp,
           libelle_commune: ville, latitude: String(lat), longitude: '3.06', etat_administratif: 'A' },
  matching_etablissements: [{ adresse: `2 RUE NATIONALE ${cp} ${ville}`, code_postal: cp, libelle_commune: ville,
           latitude: String(lat), longitude: '3.06', etat_administratif: 'A' }],
  dirigeants: []
});
const REPONSE = { total_results: 3, page: 1, per_page: 10, results: [
  E('812345678', 'DATAFLOW NORD', 'LILLE', '59000', 50.637, '62.02A', '12'),
  E('823456789', 'NOVALINK SOLUTIONS', 'LILLE', '59000', 50.63, '62.01Z', '12'),
  E('834567890', 'PIXEL CONSEIL', 'LILLE', '59000', 50.64, '62.02A', '11')
]};

/* Inès a trois pistes, dont une CLOSE (Thales) ; quatre amis aux
   parcours choisis pour départager chaque tri :
   · Karim — y est en alternance chez Aztek (dans ses pistes) : Pour toi n°1
   · Léa   — a fait son stage chez Advens (dans ses pistes), et chez
             Novalink (inconnue d'Inès, l'annuaire la connaît) ; la plus récente
   · Tom   — Thales (piste CLOSE : ne compte pas) et Sopra
   · Awa   — aucune entreprise */
const INES = { name: 'Inès Martin', formation: 'BTS SIO', recherche: 'alternance', email: 'ines@exemple.test',
  amis: [
    { id: 'KarimKarimKarim00001', nom: 'Karim Benali', recu: 3000,
      parcours: [{ entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', fin: '' },
                 { entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '2024-08' }] },
    { id: 'LeaLeaLeaLeaLeaLea01', nom: 'Léa Durand', recu: 5000,
      parcours: [{ entreprise: 'Advens', quoi: 'stage', debut: '2024-04', fin: '2024-06' },
                 { entreprise: 'Novalink Solutions', quoi: 'stage', debut: '2023-04', fin: '2023-06' }] },
    { id: 'TomTomTomTomTomTom01', nom: 'Tom Petit', recu: 4000,
      parcours: [{ entreprise: 'Thales', quoi: 'stage', debut: '2024-01', fin: '2024-03' },
                 { entreprise: 'Sopra Steria', quoi: 'emploi', debut: '2023-07', fin: '2023-08' }] },
    { id: 'AwaAwaAwaAwaAwaAwa01', nom: 'Awa Diallo', recu: 1000, parcours: [] }
  ] };
const PISTES = [
  { id: 'a', name: 'Advens', city: 'Lille', status: 'todo', updatedAt: 5 },
  { id: 'c', name: 'AZTEK SAS', city: 'Roubaix', status: 'todo', updatedAt: 3 },
  { id: 't', name: 'Thales', city: 'Lille', status: 'closed', closedReason: 'rejected', updatedAt: 2 }
];
const POUR_TOI = ['Karim Benali', 'Léa Durand', 'Tom Petit', 'Awa Diallo'];
const RECENTS = ['Léa Durand', 'Tom Petit', 'Karim Benali', 'Awa Diallo'];

async function ecran(vp, touch, profil, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  const journal = [];
  await ctx.route('https://recherche-entreprises.api.gouv.fr/**', route => {
    journal.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(REPONSE) });
  });
  await sourcesCarteMuettes(ctx);
  await relaisMuets(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(6000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [PISTES, profil]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  if (o.zoom) await p.evaluate(z => { document.documentElement.style.fontSize = z; }, o.zoom);
  await p.waitForTimeout(300);
  return { ctx, p, journal };
}
const portee = async (p, quoi) => {
  await p.click(`#piPortee [data-portee="${quoi}"]`);
  await p.waitForTimeout(250);
};
const lignes = p => p.evaluate(() => [...document.querySelectorAll('#piAmis .am-row')].map(r => ({
  id: r.dataset.ami, nom: r.querySelector('h3').textContent.trim(),
  sous: r.querySelector('.ri-sub').textContent.replace(/\s+/g, ' ').trim(),
  accent: r.querySelector('.ri-sub .am-tienne')?.textContent.trim() || '' })));
const noms = async p => (await lignes(p)).map(l => l.nom);
const amisStockes = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return (JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}').amis || []).map(a => a.nom);
});
const pliees = s => decodeURIComponent(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const taper = async (p, txt) => {
  await p.fill('#piQ', '');
  await p.click('#piQ');
  await p.keyboard.type(txt, { delay: 6 });
};

/* ================= au pouce ================= */
{
  const { ctx, p, journal } = await ecran({ width: 390, height: 844 }, true, INES);

  /* ---------- ② trois portées ---------- */
  const portees = await p.evaluate(() => [...document.querySelectorAll('#piPortee [data-portee]')].map(b => b.dataset.portee + ':' + b.textContent.trim()));
  if (portees.join() !== 'pistes:Mes pistes,decouvrir:À découvrir,amis:Amis')
    fail('les portées sous la barre : ' + JSON.stringify(portees));
  if (journal.length) fail('une requête est partie au DÉMARRAGE (invariant ④)');

  /* ---------- ① la fuite d'abord ---------- */
  await portee(p, 'amis');
  await taper(p, 'Benali');
  await p.waitForTimeout(1600);
  {
    const fuite = journal.filter(u => /benali|karim/.test(pliees(u)));
    if (fuite.length) fail('le nom d’un ami part vers l’annuaire : ' + fuite[0]);
    if (journal.length) fail('une question qui ne contenait QUE le nom d’un ami est partie : ' + journal[0]);
    const r = await noms(p);
    if (r.join() !== 'Karim Benali') fail('« Benali » ne trouve pas Karim : ' + JSON.stringify(r));
  }
  await taper(p, 'Léa Durand');
  await p.waitForTimeout(1600);
  if (journal.some(u => /durand|\blea\b/.test(pliees(u)))) fail('le nom de Léa part vers l’annuaire');
  /* depuis « Mes pistes » aussi — c'est là que la question part d'habitude */
  await portee(p, 'pistes');
  await taper(p, 'Benali');
  await p.waitForTimeout(1600);
  if (journal.some(u => /benali|karim/.test(pliees(u)))) fail('depuis « Mes pistes », le nom d’un ami part vers l’annuaire');
  /* … et la portée « Amis » le compte pendant la frappe */
  {
    const n = await p.evaluate(() => document.querySelector('#piPortee [data-portee="amis"] .pt-n')?.textContent);
    if (n !== '1') fail('la portée « Amis » ne compte pas Karim pendant la frappe : ' + n);
  }
  /* une entreprise du parcours d'un ami, elle, se cherche : « Thales »
     trouve Tom (le mot décrit une entreprise, pas une personne) */
  await taper(p, 'Sopra');
  await p.waitForTimeout(500);
  {
    const n = await p.evaluate(() => document.querySelector('#piPortee [data-portee="amis"] .pt-n')?.textContent);
    if (n !== '1') fail('« Sopra » ne trouve pas Tom dans la portée « Amis » : ' + n);
  }
  await p.fill('#piQ', '');
  await p.waitForTimeout(300);
  {
    const n = await p.evaluate(() => document.querySelector('#piPortee [data-portee="amis"] .pt-n'));
    if (n) fail('barre vide, la portée « Amis » garde un compte : le titre de la vue le dit déjà');
  }
  console.log('① le nom d’un ami ne part jamais vers l’annuaire, depuis aucune portée ✓');
  console.log('② trois portées, « Amis » compte pendant la frappe, rien barre vide ✓');

  /* ---------- ③ la ligne dit ce que l'ami t'ouvre ---------- */
  await portee(p, 'amis');
  {
    const l = await lignes(p);
    const k = l.find(x => x.nom === 'Karim Benali'), le = l.find(x => x.nom === 'Léa Durand'),
          t = l.find(x => x.nom === 'Tom Petit'), a = l.find(x => x.nom === 'Awa Diallo');
    if (!k || k.sous !== 'Aztek, dans tes pistes · Quick' || k.accent !== 'Aztek, dans tes pistes') fail('ligne de Karim : ' + JSON.stringify(k));
    if (!le || le.accent !== 'Advens, dans tes pistes' || !/Novalink Solutions/.test(le.sous)) fail('ligne de Léa : ' + JSON.stringify(le));
    /* Thales est CLOSE chez Inès : Tom ne la lui ouvre pas */
    if (!t || t.accent || !/Thales/.test(t.sous)) fail('une piste close compte comme « dans tes pistes » : ' + JSON.stringify(t));
    if (!a || a.sous !== 'aucune entreprise') fail('ligne d’Awa : ' + JSON.stringify(a));
    /* ce qui vit AU-DESSUS des onglets ne change pas avec eux (NN/g) :
       le titre « Mes pistes » compte toujours les pistes */
    const cnt = await p.evaluate(() => document.querySelector('#piCount')?.textContent.trim());
    if (cnt !== '3 pistes') fail('le titre change avec l’onglet : ' + cnt);
    /* une ligne = un geste, pas de bouton à l'intérieur (§6) — la croix
       du retrait au survol n'existe pas au doigt */
    const boutons = await p.evaluate(() => [...document.querySelectorAll('#piAmis .am-row button')]
      .filter(b => getComputedStyle(b).display !== 'none').length);
    if (boutons) fail(`${boutons} bouton(s) visibles dans les lignes au doigt`);
  }
  /* « Ajouter un ami » ferme la liste — après la dernière ligne, jamais
     entre deux — et ouvre « Mon QR » ; pendant une recherche il se tait */
  {
    const a = await p.evaluate(() => {
      const b = document.querySelector('#piAmis #avAjout'), rows = [...document.querySelectorAll('#piAmis .am-row')];
      return b ? { mot: b.textContent.trim(), apres: !!rows.length && b.getBoundingClientRect().top >= rows.at(-1).getBoundingClientRect().bottom } : null;
    });
    if (!a || a.mot !== 'Ajouter un ami' || !a.apres) fail('« Ajouter un ami » absent ou mal placé : ' + JSON.stringify(a));
    await p.click('#avAjout');
    await p.waitForSelector('.overlay #mqDonne');
    await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-h button.x').click());
    await p.waitForTimeout(300);
    await taper(p, 'Karim');
    await p.waitForTimeout(300);
    if (await p.$('#piAmis #avAjout')) fail('pendant une recherche, « Ajouter un ami » reste en bout de liste');
    await p.fill('#piQ', '');
    await p.waitForTimeout(300);
  }
  await p.screenshot({ path: `${SHOTS}/99-onglet-amis-pouce.png` });
  console.log('③ la ligne dit ce que l’ami t’ouvre, tes pistes en accent, une piste close ne compte pas ; « Ajouter un ami » ferme la liste et ouvre Mon QR ✓');

  /* ---------- ④ Pour toi, puis Trier ---------- */
  if ((await noms(p)).join() !== POUR_TOI.join()) fail('« Pour toi » : ' + JSON.stringify(await noms(p)));
  {
    const b = await p.evaluate(() => document.querySelector('#piAffiner').textContent.trim());
    if (b !== 'Trier') fail('dans « Amis », le bouton de la barre ne dit pas « Trier » : ' + b);
  }
  await p.click('#piAffiner');
  await p.waitForSelector('.overlay [data-sort-set="recent"]');
  {
    const crit = await p.evaluate(() => [...document.querySelectorAll('.overlay [data-sort-set]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
    if (!/^Pour toi/.test(crit[0]) || !/^Récents/.test(crit[1]) || !/^A → Z/.test(crit[2]) || crit.length !== 3)
      fail('les critères de tri des amis : ' + JSON.stringify(crit));
  }
  await p.click('.overlay [data-sort-set="recent"]');
  await p.waitForTimeout(250);
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-h button.x').click());
  await p.waitForTimeout(350);
  if ((await noms(p)).join() !== RECENTS.join()) fail('« Récents » : ' + JSON.stringify(await noms(p)));
  {
    const puce = await p.evaluate(() => document.querySelector('#piChips [data-sort-clear]')?.textContent.trim() || '');
    if (!/^Récents/.test(puce)) fail('la puce de tri ne dit pas « Récents » : ' + puce);
  }
  await p.screenshot({ path: `${SHOTS}/99-onglet-amis-recents-pouce.png` });
  await p.click('#piChips [data-sort-clear]');
  await p.waitForTimeout(300);
  if ((await noms(p)).join() !== POUR_TOI.join()) fail('la puce n’a pas rendu « Pour toi » : ' + JSON.stringify(await noms(p)));
  await portee(p, 'pistes');
  {
    const b = await p.evaluate(() => document.querySelector('#piAffiner').textContent.trim());
    if (!/^Affiner/.test(b)) fail('de retour dans « Mes pistes », le bouton reste « ' + b + ' »');
  }
  console.log('④ « Pour toi » d’abord, « Trier » → « Récents », la puce le retire, « Affiner » revient ✓');

  /* ---------- ⑤ retirer au glissé, « Annuler » ---------- */
  await portee(p, 'amis');
  {
    const sous = await p.evaluate(() => document.querySelector('#piAmis .am-row[data-ami="TomTomTomTomTomTom01"] .sw-under')?.textContent.trim());
    if (sous !== 'Retirer') fail('le glissé ne dit pas son mot : ' + sous);
  }
  await p.evaluate(() => {
    const node = document.querySelector('#piAmis .am-row[data-ami="TomTomTomTomTomTom01"]');
    const b = node.getBoundingClientRect();
    const y = b.top + b.height / 2, x = b.left + b.width - 24;
    const jeter = (type, cx) => {
      const t = new Touch({ identifier: 3, target: node, clientX: cx, clientY: y });
      const fini = type === 'touchend';
      node.dispatchEvent(new TouchEvent(type, { touches: fini ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    };
    jeter('touchstart', x); jeter('touchmove', x - 40); jeter('touchmove', x - 100); jeter('touchend', x - 100);
  });
  await p.waitForTimeout(500);
  if ((await amisStockes(p)).includes('Tom Petit')) fail('le glissé n’a pas retiré Tom');
  if ((await noms(p)).includes('Tom Petit')) fail('Tom retiré reste dans la liste');
  if (!await p.evaluate(() => /Annuler/.test(document.querySelector('.undo-bar')?.textContent || ''))) fail('pas d’« Annuler » après le retrait');
  await p.evaluate(() => [...document.querySelectorAll('.undo-bar button')].find(b => /Annuler/.test(b.textContent)).click());
  await p.waitForTimeout(350);
  if (!(await amisStockes(p)).includes('Tom Petit')) fail('« Annuler » ne rend pas Tom');
  if ((await noms(p)).join() !== POUR_TOI.join()) fail('Tom rendu n’est pas à sa place : ' + JSON.stringify(await noms(p)));
  console.log('⑤ au doigt, le glissé dit « Retirer », retire, et « Annuler » rend Tom à sa place ✓');

  /* ---------- ⑧ « À découvrir » réchauffé ---------- */
  await portee(p, 'pistes');
  await taper(p, 'informatique Lille');
  await p.waitForTimeout(900);
  await portee(p, 'decouvrir');
  await p.waitForSelector('#piDec .dc-row', { timeout: 4000 }).catch(() => {});
  {
    const r = await p.evaluate(() => [...document.querySelectorAll('#piDec .dc-row')].map(x => ({
      nom: x.querySelector('.dc-nom')?.textContent.trim(), ami: x.querySelector('.dc-ami')?.textContent.trim() || '' })));
    if (!r.length) fail('« À découvrir » n’a rien rendu : la mesure ne mesure rien');
    else {
      if (!/novalink/i.test(r[0].nom) || r[0].ami !== 'Léa y a fait son stage')
        fail('l’entreprise où Léa est passée ne remonte pas en tête, ou ne dit pas qui : ' + JSON.stringify(r));
      if (r.slice(1).some(x => x.ami)) fail('une entreprise sans ami dit un ami : ' + JSON.stringify(r));
    }
  }
  await p.screenshot({ path: `${SHOTS}/99-onglet-decouvrir-ami-pouce.png` });
  await p.click('#piDec .dc-row:has-text("Novalink") .dc-main');
  await p.waitForSelector('.overlay .ap-ami');
  {
    const dit = await p.evaluate(() => document.querySelector('.overlay .ap-ami').textContent.trim());
    if (dit !== 'Léa y a fait son stage') fail('l’aperçu ne dit pas qui : ' + dit);
  }
  console.log('⑧ « À découvrir » : Novalink remonte en tête et dit « Léa y a fait son stage », ligne et aperçu ✓');
  await ctx.close();
}

/* ================= au poste ================= */
{
  const { ctx, p, journal } = await ecran({ width: 1280, height: 800 }, false, INES);
  await portee(p, 'amis');
  await p.waitForSelector('#piAmis .am-detail');
  const detail = () => p.evaluate(() => {
    const d = document.querySelector('#piAmis .am-detail');
    return d ? { id: d.dataset.ami, nom: d.querySelector('.ap-nom')?.textContent.trim(),
                 sel: document.querySelector('#piAmis .am-row.am-sel')?.dataset.ami,
                 focus: document.activeElement?.closest('.am-row')?.dataset.ami || document.activeElement?.id || '' } : null;
  });
  {
    const d = await detail();
    if (!d || d.nom !== 'Karim Benali' || d.sel !== 'KarimKarimKarim00001') fail('au poste, la fiche du premier ami n’est pas à côté : ' + JSON.stringify(d));
    if (await p.evaluate(() => document.querySelectorAll('.overlay').length)) fail('au poste, une feuille s’ouvre au lieu de la liste-détail');
  }
  await p.screenshot({ path: `${SHOTS}/99-onglet-amis-poste.png` });
  /* ⑥ au clavier : ↓ depuis la barre, ↓, ↑, Échap remonte */
  await p.click('#piQ');
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(250);
  if ((await detail()).focus !== 'KarimKarimKarim00001') fail('↓ depuis la barre ne descend pas sur le premier ami : ' + JSON.stringify(await detail()));
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(300);
  {
    const d = await detail();
    if (d.nom !== 'Léa Durand' || d.focus !== 'LeaLeaLeaLeaLeaLea01') fail('↓ : la fiche ne suit pas le clavier : ' + JSON.stringify(d));
  }
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(300);
  if ((await detail()).nom !== 'Karim Benali') fail('↑ : la fiche ne revient pas sur Karim');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  if ((await detail()).focus !== 'piQ') fail('Échap ne remonte pas dans la barre : ' + (await detail()).focus);
  console.log('⑥ au poste, liste-détail : la fiche suit ↓ ↑, Échap remonte dans la barre ✓');

  /* ⑤ au poste, la croix au survol, avec SON mot */
  const row = '#piAmis .am-row[data-ami="TomTomTomTomTomTom01"]';
  await p.hover(row + ' .ri-main');
  {
    const lbl = await p.evaluate(s => document.querySelector(s + ' .hov-del')?.getAttribute('aria-label'), row);
    if (lbl !== 'Retirer : Tom Petit') fail('la croix au survol ne dit pas son geste : ' + lbl);
  }
  await p.click(row + ' .hov-del');
  await p.waitForTimeout(450);
  if ((await amisStockes(p)).includes('Tom Petit')) fail('la croix n’a pas retiré Tom');
  await p.evaluate(() => [...document.querySelectorAll('.undo-bar button')].find(b => /Annuler/.test(b.textContent)).click());
  await p.waitForTimeout(350);
  if (!(await amisStockes(p)).includes('Tom Petit')) fail('« Annuler » ne rend pas Tom au poste');
  console.log('⑤ au poste, la croix au survol dit « Retirer : Tom Petit », « Annuler » le rend ✓');

  /* la fiche à côté : « + Piste » ajoute sans quitter la liste */
  await p.click('#piAmis .am-row[data-ami="KarimKarimKarim00001"] .ri-main');
  await p.waitForTimeout(300);
  await p.click('#piAmis .am-detail [data-ajout]');
  await p.waitForTimeout(400);
  {
    const quick = await p.evaluate(async () => !!(await import('./ui/state.js')).S.companies.find(c => c.name === 'Quick'));
    if (!quick) fail('« + Piste » depuis la fiche à côté n’a pas ajouté Quick');
    const l = (await lignes(p)).find(x => x.nom === 'Karim Benali');
    if (!l || l.accent !== 'Aztek, Quick, dans tes pistes') fail('la ligne de Karim ne suit pas l’ajout : ' + JSON.stringify(l));
    if ((await detail())?.nom !== 'Karim Benali') fail('après « + Piste », la fiche à côté a changé d’ami');
  }
  console.log('⑥ « + Piste » depuis la fiche à côté : Quick entre, la ligne suit, la fiche reste ✓');
  if (journal.some(u => /benali|karim|durand|petit|diallo/.test(pliees(u)))) fail('un nom d’ami est parti vers l’annuaire au poste');
  await ctx.close();
}

/* ================= ⑦ sans ami ================= */
for (const [vp, touch, nom] of [[{ width: 390, height: 844 }, true, 'pouce'], [{ width: 1280, height: 800 }, false, 'poste']]){
  const { ctx, p } = await ecran(vp, touch, { name: 'Sofia Ait', formation: 'BTS SIO' });
  await portee(p, 'amis');
  {
    const v = await p.evaluate(() => {
      const b = document.querySelector('#piAmis #avVide');
      return b ? { titre: b.querySelector('h2')?.textContent.trim(),
                   gestes: [...b.querySelectorAll('button')].map(x => x.id + (x.classList.contains('btn-primary') ? '*' : '')) } : null;
    });
    if (!v || v.titre !== 'Tes amis t’ouvrent leurs entreprises' || v.gestes.join() !== 'avMonQR*,avScan')
      fail(`${nom} : l’état vide n’enseigne pas (titre + Mon QR rempli + Scanner) : ` + JSON.stringify(v));
    const cnt = await p.evaluate(() => document.querySelector('#piCount')?.textContent.trim());
    if (cnt !== '3 pistes') fail(`${nom} : le titre change avec l’onglet : ` + cnt);
  }
  await p.screenshot({ path: `${SHOTS}/99-onglet-amis-vide-${nom}.png` });
  await p.click('#avMonQR');
  await p.waitForSelector('.overlay #mqDonne');
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-h button.x').click());
  await p.waitForTimeout(300);
  await p.click('#avScan');
  await p.waitForSelector('.overlay #rcTexte');
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.modal-h button.x').click());
  await p.waitForTimeout(300);
  /* « Échanger » ne porte plus aucun geste des amis (12 octobre 2026) :
     leur liste et « Ajouter un ami » vivent ici, leur QR se scanne par
     « Recevoir » comme tout ce qu'on te tend */
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForSelector('#ecRecv');
  {
    const e = await p.evaluate(() => ({ porte: !!document.querySelector('#ecAmis'),
      gestes: [...document.querySelectorAll('#view-echanger button')].map(b => b.textContent.trim())
        .filter(t => /Scanner|Mon QR|ami/i.test(t)) }));
    if (e.porte) fail(`${nom} : « Échanger » garde une porte « Amis » — la liste vit dans « Mes pistes »`);
    if (e.gestes.length) fail(`${nom} : « Échanger » porte encore des gestes d’amis : ` + JSON.stringify(e.gestes));
  }
  await p.screenshot({ path: `${SHOTS}/99-onglet-echanger-${nom}.png` });
  console.log(`⑦ ${nom} : l’état vide enseigne, ses gestes ouvrent Mon QR et le scanner ; « Échanger » ne porte plus de geste d’ami ✓`);
  await ctx.close();
}

/* ================= ⑨ 320 px texte doublé, sombre ================= */
for (const [vp, touch, o, nom] of [[{ width: 320, height: 640 }, true, { zoom: '200%' }, '320-200'],
                                   [{ width: 390, height: 844 }, true, { sombre: true }, 'pouce-sombre'],
                                   [{ width: 1280, height: 800 }, false, { sombre: true }, 'poste-sombre']]){
  const { ctx, p } = await ecran(vp, touch, INES, o);
  await portee(p, 'amis');
  await p.waitForSelector('#piAmis .am-row');
  const r = await p.evaluate(() => {
    const m = document.querySelector('#piBody');
    const mr = m.getBoundingClientRect().right;
    return {
      deborde: [...m.querySelectorAll('#piAmis *')].filter(x => x.getBoundingClientRect().right > mr + 1).length,
      coupes: [...m.querySelectorAll('#piAmis h3')].filter(b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1).length,
      lateral: m.scrollWidth > m.clientWidth + 1,
      /* la portée tient sur la largeur, quitte à passer à la ligne */
      portee: (() => { const b = document.querySelector('#piPortee'); const pr = b.getBoundingClientRect().right;
        return [...b.querySelectorAll('button')].filter(x => x.getBoundingClientRect().right > pr + 1).length; })(),
      petits: [...document.querySelectorAll('#piPortee button, #piAmis .ri-main')]
        .filter(x => x.getBoundingClientRect().height < 43.5).length
    };
  });
  if (r.deborde || r.lateral) fail(`${nom} : la liste des amis déborde (${r.deborde})`);
  if (r.coupes) fail(`${nom} : un nom d’ami est coupé`);
  if (r.portee) fail(`${nom} : une portée sort de la largeur`);
  if (touch && r.petits) fail(`${nom} : ${r.petits} cible(s) sous 44 px au doigt`);
  await p.screenshot({ path: `${SHOTS}/99-onglet-amis-${nom}.png` });
  console.log(`⑨ ${nom} : rien ne déborde, aucun nom coupé${touch ? ', 44 px au doigt' : ''} ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E onglet amis : ÉCHEC' : 'E2E onglet amis : OK');
