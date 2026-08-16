/* ============================================================
   Ce qui vient de se passer se DIT, et ce qui se tape a un NOM.

   Trois exigences, toutes tirées d'une mesure sur l'app réelle :

   ① Tout ce qui répond au doigt ou au clavier porte un nom. Un bouton
     sans nom s'annonce « bouton », point : on ne sait pas ce qu'il fait
     avant de l'avoir tapé, et sur un outil dont le métier est de
     supprimer, partager et envoyer, ça ne se rattrape pas.

   ② Un message d'état est annonçable (WCAG 4.1.3, AA). Deux l'étaient
     — le toast, l'avertissement de sauvegarde. Les deux qui comptent le
     plus ne l'étaient pas : la barre Annuler, c'est-à-dire le filet de
     sécurité de tout le produit (invariant ②), et le compte de pistes
     qui reste après un filtre. Quelqu'un qui n'a pas l'écran
     supprimait une piste et n'apprenait jamais qu'il pouvait la
     reprendre.

   ③ Le focus ne tombe pas par terre (WCAG 2.4.3). Quand l'élément qui
     le porte quitte le document, le navigateur le rend au `<body>` :
     mesuré, supprimer la deuxième ligne d'une liste renvoyait tout en
     haut de la page. Sur quarante lignes à ranger, c'est quarante
     retours en haut.
   ============================================================ */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const PISTE = {
  id: 'cbal', name: 'Balayage SI', city: 'Toulouse', status: 'contacted', domain: 'esn',
  notes: 'Une note.', nextActionText: 'Relancer',
  contacts: [{ id: 'k1', name: 'Nadia Berthier', role: 'RH', email: 'n@exemple.fr' }]
};

async function ouvrir(ctx){
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
}
const semer = (p, liste) => p.evaluate(async d => {
  const { S, saveData } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.companies = d.map(normalizeCompany);
  saveData();
}, liste);
const fermerFeuilles = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js');
  let s, n = 0;
  while ((s = topSheet()) && n++ < 6){ s.close(null, true); await new Promise(r => setTimeout(r, 110)); }
});

/* ---------- ① LE NOM DE CE QUI SE TAPE ----------
   Le nom accessible, calculé comme le fait un lecteur d'écran, dans
   l'ordre : aria-label, aria-labelledby, le `<label>` associé (par
   `for` ou en enveloppe), le texte, le `title`.
   Le `placeholder` n'en fait PAS partie — c'est le piège de ce
   contrôle. Il compte pour un nom dans certains navigateurs, il
   disparaît dès qu'on tape, et il ne survit pas à une saisie
   interrompue. Le champ le plus tapé du produit vivait dessus. */
const SONDE_NOMS = () => {
  const nom = (n) => {
    const al = n.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const lb = n.getAttribute('aria-labelledby');
    if (lb){
      const t = lb.split(/\s+/).map(i => document.getElementById(i)?.textContent || '').join(' ').trim();
      if (t) return t;
    }
    if (n.id){
      const l = document.querySelector(`label[for="${CSS.escape(n.id)}"]`);
      if (l && l.textContent.trim()) return l.textContent.trim();
    }
    const w = n.closest('label');
    if (w && w.textContent.trim()) return w.textContent.trim();
    const t = (n.innerText || n.textContent || '').trim();
    if (t) return t;
    const ti = n.getAttribute('title');
    if (ti && ti.trim()) return ti.trim();
    return '';
  };
  const sel = 'button,a[href],input:not([type="hidden"]),select,textarea,summary,[role="button"],[tabindex="0"]';
  const out = [];
  for (const n of document.querySelectorAll(sel)){
    const r = n.getBoundingClientRect();
    if (!r.width || !r.height) continue;                    /* replié = pas une cible */
    if (n.closest('[aria-hidden="true"],[hidden],[inert]')) continue;
    out.push({ nomme: !!nom(n),
      q: n.id ? '#' + n.id : n.tagName.toLowerCase() + '.' + (String(n.className).split(' ')[0] || '?') });
  }
  return out;
};

const SURFACES = [
  ['Aujourd’hui', 'route', 'aujourdhui'], ['Mes pistes', 'route', 'pistes'],
  ['Échanger', 'route', 'echanger'], ['Moi', 'route', 'moi'],
  ['fiche', './ui/fiche.js', 'openFiche', true], ['écrire', './ui/mail.js', 'openMail', true],
  ['modifier', './ui/edit.js', 'openEditPiste', true],
  ['contact', './ui/contact.js', 'openContactEditor', false],
  ['capture', './ui/capture.js', 'openCapture', false],
  ['donner', './ui/donner.js', 'openDonner', false],
  ['prospecter', './ui/prospect.js', 'openProspect', false],
  ['profil', './ui/profil.js', 'openProfil', false],
  ['modèles', './ui/profil.js', 'openTemplates', false]
];

for (const [large, ergo] of [[393, 'au doigt'], [1280, 'à la souris']]){
  const ctx = await browser.newContext({ viewport: { width: large, height: 800 },
    hasTouch: large < 901, isMobile: large < 901 });
  const p = await ouvrir(ctx);
  await semer(p, [PISTE]);
  let vus = 0; const sans = []; let sondeVue = null;
  for (const [nom, mod, fn, avecPiste] of SURFACES){
    await fermerFeuilles(p);
    await p.evaluate(async ([mod, fn, avecPiste]) => {
      if (mod === 'route'){ location.hash = '#/' + fn; return; }
      const { S } = await import('./ui/state.js');
      const m = await import(mod);
      const c = S.companies.find(x => x.id === 'cbal');
      if (avecPiste) m[fn](c, {}); else m[fn](null);
    }, [mod, fn, avecPiste]);
    await p.waitForTimeout(420);
    if (mod !== 'route' && !(await p.$('.overlay:not(.ov-out)'))){
      fail(`noms : la feuille « ${nom} » ne s’ouvre pas — le contrôle ne mesure rien`);
      continue;
    }
    /* LA SONDE SE VÉRIFIE ELLE-MÊME : sans elle, restreindre la liste
       des sélecteurs ferait simplement voir MOINS de choses, et le
       contrôle resterait vert en ne regardant plus rien. */
    if (sondeVue === null){
      await p.evaluate(() => {
        const t = document.createElement('button');
        t.id = 'sondeNom';
        t.style.cssText = 'position:fixed;left:0;top:0;width:12px;height:12px;z-index:9999';
        document.body.append(t);                              /* aucun texte, aucun aria-label */
      });
      sondeVue = (await p.evaluate(SONDE_NOMS)).some(c => c.q === '#sondeNom' && !c.nomme);
      await p.evaluate(() => { document.getElementById('sondeNom')?.remove(); });
    }
    for (const c of await p.evaluate(SONDE_NOMS)){
      vus++;
      if (!c.nomme) sans.push(`${nom} · ${c.q}`);
    }
  }
  if (!sondeVue) fail('noms : la sonde sans nom n’a pas été vue — le balayage ne lit plus rien');
  else if (vus < 120) fail(`noms : ${vus} éléments seulement — le balayage ne lit plus rien`);
  else if (sans.length)
    fail(`noms ${ergo} : ${sans.length} élément(s) sans nom accessible —\n      ` + sans.join('\n      '));
  else console.log(`noms ${ergo} : ${vus} éléments sur ${SURFACES.length} surfaces, tous nommés ✓`);
  await ctx.close();
}

/* ---------- ② LES MESSAGES D'ÉTAT S'ANNONCENT ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 },
    hasTouch: true, isMobile: true });
  const p = await ouvrir(ctx);
  await semer(p, ['Alpha SI', 'Beta Cyber', 'Gamma Cloud', 'Delta Réseau']
    .map((n, i) => ({ id: 'p' + i, name: n, city: 'Toulouse', status: 'todo', domain: 'esn' })));
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForTimeout(450);

  /* La région doit être LUE, donc présente dans l'arbre
     d'accessibilité. `display:none` et `visibility:hidden` l'en
     retirent : c'est l'erreur classique de ce motif, et elle rend le
     contrôle muet sans rien casser à l'écran. */
  const region = await p.evaluate(() => {
    const n = document.getElementById('annonce');
    if (!n) return null;
    const st = getComputedStyle(n);
    return { role: n.getAttribute('role'), live: n.getAttribute('aria-live'),
      display: st.display, visibility: st.visibility,
      cache: n.getBoundingClientRect().width <= 2 };
  });
  if (!region) fail('annonce : aucune région vivante dans la coque');
  else if (region.role !== 'status' || region.live !== 'polite')
    fail(`annonce : la région n’est pas un message d’état (role=${region.role}, aria-live=${region.live})`);
  else if (region.display === 'none' || region.visibility === 'hidden')
    fail('annonce : la région est masquée par `display:none` ou `visibility:hidden` — '
      + 'elle sort de l’arbre d’accessibilité et ne sera jamais lue');
  else if (!region.cache)
    fail('annonce : la région se voit à l’écran — elle doit être lue, pas affichée');

  const lire = () => p.evaluate(() => (document.getElementById('annonce')?.textContent || '').trim());

  await p.evaluate(async () => {
    const { showUndo } = await import('./ui/dom.js');
    showUndo('« Alpha SI » supprimée.', () => {});
  });
  await p.waitForTimeout(150);
  const dit = await lire();
  if (!/Alpha SI/.test(dit) || !/[Aa]nnuler/.test(dit))
    fail(`annonce : la barre Annuler ne se dit pas — région « ${dit} ». `
      + 'C’est le filet de sécurité du produit : sans écran, on ne sait pas qu’il existe');

  await p.evaluate(() => { document.querySelector('.undo-bar')?.remove(); });
  await p.evaluate(() => {
    const q = document.querySelector('#piQ');
    q.value = 'alp'; q.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await p.waitForTimeout(900);
  const compte = await lire();
  if (!/1 piste sur 4/.test(compte))
    fail(`annonce : filtrer réorganise l’écran sans le dire — région « ${compte} »`);
  else console.log('annonce : la barre Annuler et le compte filtré se disent ✓');

  /* LE CAS QUI DÉCIDE : un seul geste produit DEUX annonces dans le même
     souffle. Supprimer une piste re-rend la liste (« 3 pistes sur 4 »)
     puis pose la barre Annuler. Les deux partaient ; la seconde arrivait
     parfois en premier, et le compte recouvrait le seul message qui dit
     comment revenir en arrière — un lecteur d'écran entendait le décor
     et pas la conséquence. On exige donc UNE phrase, et que ce soit
     celle de la suppression. */
  await p.evaluate(() => {
    const q = document.querySelector('#piQ');
    q.value = 'a'; q.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await p.waitForTimeout(500);
  const duo = await p.evaluate(async () => {
    const n = document.getElementById('annonce');
    n.textContent = '';
    const vus = [];
    const obs = new MutationObserver(() => { if (n.textContent.trim()) vus.push(n.textContent.trim()); });
    obs.observe(n, { childList: true, characterData: true, subtree: true });
    const { S, saveData, bus } = await import('./ui/state.js');
    const { showUndo } = await import('./ui/dom.js');
    const c = S.companies[0];
    S.companies = S.companies.filter(x => x !== c);
    saveData(); bus.refresh();                       /* → annonce le compte */
    showUndo(`« ${c.name} » supprimée.`, () => {});   /* → annonce le filet */
    await new Promise(r => setTimeout(r, 700));
    obs.disconnect();
    return vus;
  });
  if (!duo.length)
    fail('annonce : le geste double n’a rien dit du tout — le contrôle ne mesure plus rien');
  else if (duo.length > 1)
    fail(`annonce : un seul geste a produit ${duo.length} phrases — ${JSON.stringify(duo)}`);
  else if (!/supprimée/.test(duo[0]))
    fail(`annonce : le compte a recouvert le message de suppression — « ${duo[0]} ». `
      + 'C’est le seul qui dit comment revenir en arrière');
  else console.log('annonce : un geste, une phrase, et c’est la conséquence qui reste ✓');

  /* DEUX FOIS LA MÊME PHRASE se dit deux fois. Un lecteur d'écran ne
     relit pas une région dont le texte n'a pas changé : filtrer sur
     « a », revenir, refiltrer sur « a » donnerait le même compte, et la
     seconde fois personne n'entendrait rien. D'où le passage par le
     vide entre deux annonces — il ne se voit pas, il s'exige. */
  const revide = await p.evaluate(async () => {
    const n = document.getElementById('annonce');
    const { annoncer } = await import('./ui/dom.js');
    const vus = [];
    const obs = new MutationObserver(() => vus.push(n.textContent));
    obs.observe(n, { childList: true, characterData: true, subtree: true });
    annoncer('Deux fois la même phrase.');
    await new Promise(r => setTimeout(r, 250));
    const apres1 = vus.length;
    annoncer('Deux fois la même phrase.');
    await new Promise(r => setTimeout(r, 250));
    obs.disconnect();
    return { suite: vus, videEntre: vus.slice(apres1).some(v => v === '') };
  });
  if (!revide.suite.length)
    fail('annonce : rien n’est écrit — le contrôle ne mesure plus rien');
  else if (!revide.videEntre)
    fail('annonce : deux fois la même phrase ne repasse pas par le vide — '
      + `la seconde ne sera jamais relue (suite ${JSON.stringify(revide.suite)})`);
  else console.log('annonce : deux fois la même phrase repasse par le vide, donc se redit ✓');
  await ctx.close();
}

/* ---------- ③ LE FOCUS NE TOMBE PAS PAR TERRE ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ouvrir(ctx);
  await semer(p, ['Alpha SI', 'Beta Cyber', 'Gamma Cloud', 'Delta Réseau']
    .map((n, i) => ({ id: 'p' + i, name: n, city: 'Toulouse', status: 'todo', domain: 'esn' })));
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForTimeout(450);

  const supprimer = () => p.evaluate(async () => {
    const rows = [...document.querySelectorAll('#piBody [data-id]')];
    const cible = rows[1] || rows[0];
    const del = cible.querySelector('.hov-del');
    if (!del) return { erreur: 'pas de bouton supprimer' };
    del.focus();
    const parti = document.activeElement === del;
    del.click();
    await new Promise(r => setTimeout(r, 450));
    const a = document.activeElement;
    return { parti, body: a === document.body || !a,
      ou: a ? a.tagName + (a.id ? '#' + a.id : '') + '.' + String(a.className).split(' ')[0] : 'null',
      reste: document.querySelectorAll('#piBody [data-id]').length };
  });

  const un = await supprimer();
  if (un.erreur) fail('focus : ' + un.erreur + ' — le contrôle ne mesure rien');
  else if (!un.parti) fail('focus : la poubelle ne prend pas le focus — le contrôle ne mesure rien');
  else if (un.body)
    fail('focus : après une suppression au clavier, le focus retombe sur le `<body>` — '
      + 'on se retrouve en haut de la page, place perdue');
  else console.log(`focus : la suppression rend la main à la ligne voisine (${un.ou}) ✓`);

  /* la liste se vide : il reste à retomber sur le titre de l'écran,
     jamais dans le vide */
  await p.evaluate(async () => {
    const { S, saveData } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.companies = [normalizeCompany({ id: 'seul', name: 'Seule Piste', city: 'Lyon', status: 'todo' })];
    saveData();
    const { bus } = await import('./ui/state.js');
    bus.refresh();
  });
  await p.waitForTimeout(400);
  const vide = await supprimer();
  if (vide.erreur || vide.body)
    fail('focus : la dernière ligne supprimée laisse le focus dans le vide — ' + (vide.ou || vide.erreur));
  else console.log(`focus : la liste vidée rend la main à l’écran (${vide.ou}) ✓`);
  await ctx.close();
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E annonce : ÉCHEC' : 'E2E annonce : OK');
