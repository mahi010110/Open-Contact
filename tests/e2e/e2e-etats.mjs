/* E2E : LES DEUX ÉTATS QUE PERSONNE NE MET EN PLACE — vide, et plein.

   §5 le dit en une ligne, et c'est la leçon la plus chère de l'audit
   des cibles : « un contrôle ne garde que les ÉTATS qu'il met en
   place ». Or toutes les gardes de ce dépôt sèment un suivi bien
   rempli, de quinze à trente pistes. Les deux bouts de l'échelle
   n'étaient donc mesurés par personne :

   · L'APP VIDE, c'est-à-dire le PREMIER LANCEMENT — le seul écran que
     100 % des utilisateurs voient. §6 : « l'état vide de chaque écran
     enseigne le produit, jamais un simple aucune donnée ». Et une
     feuille qui suppose `S.companies[0]` plante précisément ici.
   · L'APP PLEINE, c'est-à-dire deux camarades qui partagent leur liste.
     §1 vise un étudiant « sur son téléphone, entre deux cours » : un
     écran qui met six secondes à s'ouvrir sur un téléphone d'entrée de
     gamme n'est pas utilisable, et rien ne le mesurait.

   DEUX PIÈGES D'INSTRUMENT, payés tous les deux en écrivant ce
   fichier, et tous les deux dans le sens du FAUX VERT — celui qui
   rassure :

   ① Le toast dure 3,4 s et une boucle va plus vite. En lisant `#toast`
     sans l'effacer d'abord, on relit celui de la feuille PRÉCÉDENTE :
     trois refus muets passaient pour trois refus expliqués.
   ② Semer les données sans RECHARGER laisse l'app sur l'état chargé à
     l'ouverture. La première version des mesures de charge rendait
     « 0 ligne rendue » avec des temps flatteurs — elle chronométrait
     une liste vide.
   D'où, dans les deux cas, un contrôle qui vérifie qu'il a bien mesuré
   quelque chose avant de conclure. */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];

/* Les feuilles qu'on peut ouvrir sans rien avoir. On appelle la
   fonction, MAIS on vérifie ensuite que le chemin est atteignable :
   une feuille qui refuse en silence n'est un défaut que si l'écran
   offre vraiment le bouton (voir plus bas, `#piProspect`). */
const FEUILLES = {
  capture: p => p.evaluate(async () => (await import('./ui/capture.js')).openCapture()),
  contact: p => p.evaluate(async () => (await import('./ui/contact.js')).openContactEditor(null)),
  donner: p => p.evaluate(async () => (await import('./ui/donner.js')).openDonner(null)),
  recevoir: p => p.evaluate(async () => (await import('./ui/recevoir.js')).openRecevoir())
};
const ECRANS = ['aujourdhui', 'pistes', 'echanger', 'moi'];

const neuf = async (w, semer) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 },
    hasTouch: w < 901, isMobile: w < 901 });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
  p.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 140)));
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(semer.fn, semer.arg);
  /* voir le piège ② : sans rechargement on mesure l'état d'avant */
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return { ctx, p };
};

const VIDE = { fn: async () => { const st = await import('./engine/storage.js');
  await st.kvInit(); await st.kvSet(st.DATA_KEY, '[]'); }, arg: null };

/* ============ 1. L'APP VIDE — le premier lancement ============ */
for (const [w, tag] of [[390, 'pouce'], [1280, 'poste']]){
  const { ctx, p } = await neuf(w, VIDE);
  let muets = 0;
  for (const r of ECRANS){
    await p.evaluate(x => { location.hash = '#/' + x; }, r);
    await p.waitForTimeout(600);
    const t = await p.evaluate(() => {
      const v = [...document.querySelectorAll('section.view')].find(n => !n.hidden);
      return (v ? v.innerText : '').replace(/\s+/g, ' ').trim();
    });
    if (t.length < 40){ muets++; fail(`app vide (${tag}) : « ${r} » est quasi muet (${t.length} caractères) — `
      + 'l’état vide doit enseigner le produit, pas se taire'); }
    else if (/^(aucune donnée|rien|vide)\.?$/i.test(t))
      fail(`app vide (${tag}) : « ${r} » dit « ${t} » — c’est exactement ce que §6 interdit`);
  }
  if (!muets) console.log(`app vide (${tag}) : les ${ECRANS.length} écrans enseignent le produit ✓`);

  for (const [nom, ouvrir] of Object.entries(FEUILLES)){
    await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js');
      let s, n = 0; while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 110)); } });
    /* piège ① : on efface le toast AVANT, sinon on relit le précédent */
    await p.evaluate(() => { const t = document.querySelector('#toast');
      if (t){ t.classList.remove('on'); t.textContent = ''; } });
    await p.waitForTimeout(150);
    try { await ouvrir(p); }
    catch (e){ fail(`app vide (${tag}) : « ${nom} » lève une erreur — ${String(e.message).slice(0, 90)}`); continue; }
    await p.waitForTimeout(700);
    const vu = await p.evaluate(() => ({
      feuille: !!document.querySelector('.modal, .sheet, [role="dialog"]'),
      refus: (document.querySelector('#toast.on')?.textContent || '').trim()
    }));
    /* ne pas s'ouvrir est une réponse légitime ; le SILENCE ne l'est
       pas (§6, famille ① du toast : rien ne s'est produit, dis pourquoi) */
    if (!vu.feuille && !vu.refus)
      fail(`app vide (${tag}) : « ${nom} » ne s’ouvre pas ET ne dit rien — un tap sans réponse`);
  }
  console.log(`app vide (${tag}) : les ${Object.keys(FEUILLES).length} feuilles s’ouvrent ou expliquent leur refus ✓`);

  /* ET LE CONTRE-CONTRÔLE. `openProspect` sort en silence quand il n'y a
     rien à prospecter — ce serait un tap sans réponse SI le bouton
     existait. Il n'existe pas, et c'est ce qui rend le silence correct.
     On fige les deux moitiés : le jour où le bouton s'affiche sur une
     liste vide, ce contrôle le dit. */
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForTimeout(600);
  const prospect = await p.evaluate(() => {
    const b = document.querySelector('#piProspect');
    return b ? (b.offsetParent !== null && b.getBoundingClientRect().width > 4) : false;
  });
  if (prospect)
    fail(`app vide (${tag}) : « Prospecter » est tapable sans aucune piste, et `
      + '`openProspect` sort en SILENCE — le tap ne répondrait rien');
  else console.log(`app vide (${tag}) : « Prospecter » est absent, donc son refus muet reste inatteignable ✓`);
  await ctx.close();
}

/* ============ 2. L'APP PLEINE — deux camarades ont partagé ============ */
/* Le plafond : ce qui fait que l'app tient. On le prouve AVEC son
   échappatoire — 60 lignes rendues sans « Voir les N autres » serait
   940 pistes injoignables. */
const CHARGE = k => ({ fn: async k => {
  const st = await import('./engine/storage.js'); await st.kvInit();
  const J = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: k }, (x, i) => ({
    id: 'p' + i, name: 'Entreprise Numéro ' + i, city: ['Lille', 'Paris', 'Lyon'][i % 3],
    status: ['todo', 'contacted', 'reply'][i % 3], domain: 'esn',
    nextAction: i % 3 ? J(i % 14 - 7) : '', nextActionText: 'Relancer',
    notes: 'Note '.repeat(8), updatedAt: 1000 + i,
    contacts: i % 2 ? [{ id: 'c' + i, name: 'Nadia', role: 'RH', email: 'n' + i + '@ex.fr' }] : []
  }))));
}, arg: k });

{
  const N = 1000;
  const { ctx, p } = await neuf(390, CHARGE(N));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });   /* téléphone d'entrée de gamme */
  const t = {};
  for (const r of ['aujourdhui', 'pistes', 'echanger']){
    const t0 = Date.now();
    await p.evaluate(x => { location.hash = '#/' + x; }, r);
    await p.waitForFunction(x => { const v = document.querySelector('#view-' + x);
      return v && !v.hidden && v.innerText.length > 20; }, r, { timeout: 60000 })
      .catch(() => fail(`${N} pistes : « ${r} » ne s’affiche pas en 60 s sur un processeur bridé ×8`));
    t[r] = Date.now() - t0;
  }
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForTimeout(600);
  const vu = await p.evaluate(() => ({
    lignes: document.querySelectorAll('.row-item, .bcard').length,
    /* L'ÉCHAPPATOIRE DE CETTE LISTE-CI, pas n'importe laquelle.
       `.tr-more` est aussi le « Voir les autres » d'autres tranches de
       l'écran : en le visant large, la mutation qui retire les trois
       vrais boutons restait AU VERT. On vise donc la clé que
       `moreBtn('list', …)` pose, et rien d'autre. */
    suite: !!document.querySelector('[data-more="list"]')
  }));
  /* le piège ② en garde : sans lignes, les temps ne valent rien */
  if (!vu.lignes) fail(`${N} pistes : aucune ligne rendue — la mesure ne vaut rien, pas l’app`);
  else if (!vu.suite && vu.lignes < N)
    fail(`${N} pistes : ${vu.lignes} lignes rendues et AUCUN « Voir les autres » — `
      + `${N - vu.lignes} pistes seraient injoignables`);
  const pire = Math.max(...Object.values(t));
  /* 3 s est le seuil au-delà duquel on croit l'app cassée (NN/g). On
     mesurait 618 ms au pire à l'écriture, bridé ×8 : le plafond laisse
     de la marge sans excuser une régression d'un ordre de grandeur. */
  if (pire > 3000)
    fail(`${N} pistes : l’écran le plus lent met ${pire} ms sur un téléphone bridé ×8 — `
      + JSON.stringify(t));
  else console.log(`${N} pistes, processeur bridé ×8 : aujourd’hui ${t.aujourdhui} ms · `
    + `mes pistes ${t.pistes} ms · échanger ${t.echanger} ms · ${vu.lignes} lignes rendues `
    + `et le reste atteignable ✓`);
  await ctx.close();
}

console.log(errors.length ? 'Erreurs console : ' + errors.slice(0, 4).join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E états : ÉCHEC' : 'E2E états : OK');
