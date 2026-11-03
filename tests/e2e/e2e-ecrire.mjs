/* ============================================================
   Écrire au téléphone — le clavier ne couvre pas la feuille
   (retour du mainteneur, 13 octobre 2026 : « quand on écrit, c'est
   horrible »)

   Sur un iPhone, le clavier ne rétrécit pas la page : seule la zone
   visible (`visualViewport`) diminue, et une feuille posée en bas de
   l'écran reste dessous. Aucun émulateur ne joue ce clavier ; on joue
   donc CE QUE L'APP REÇOIT de lui — une zone visible qui perd 336 px
   (le clavier d'un iPhone en portrait) — et on mesure ce qui reste à
   l'écran. Un bloc gris peint à la place du clavier rend les captures
   lisibles.

   ① CLAVIER OUVERT, sur cinq feuilles où l'on tape (Nouvelle piste,
     Écrire, Mon profil, Modifier, une conversation) : la barre de
     titre, le champ qui a le curseur et le pied restent au-dessus du
     clavier ; passer au champ suivant le garde à l'écran ;
   ② clavier rangé, la feuille reprend tout l'écran — et un zoom à deux
     doigts, qui rétrécit aussi la zone, ne la déplace pas ;
   ③ « Écrire » : le message se lit EN ENTIER (il grandit avec son
     texte, c'est la feuille qui défile) et la ligne qui le suit ne se
     pose jamais dessus — au pouce, sur un petit téléphone, au poste ;
   ④ la touche Entrée : dans une conversation, au doigt elle va à la
     ligne et la flèche envoie ; au poste elle envoie ;
   ⑤ LE BAS RESTE EN BAS (correction de la 7.2, gardée au retour à
     l'interface de la 6.70) : dans une conversation d'ami et dans un
     groupe, vingt-quatre messages, le dernier reste à l'écran quand le
     clavier s'ouvre et quand le champ prend trois lignes d'un coup
     pendant qu'une relecture de défilement attend son image ;
   ⑥ zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const KB = 336;
const CLE = 'BP35lEPwVBJ82cLFVJLajV0p07KeEct3LZ8UBTaoLko1QSPwDzIkAOxf4Y2LirW2imkpzoOA_YXIOYP0eibHoUw';
/* deux modèles à soi : le composeur s'ouvre sur le premier, court ;
   choisir le second, long, fait GRANDIR le message par programme — le
   chemin que la frappe ne joue pas (changer de modèle, un brouillon,
   son annulation) */
const LONG = Array.from({ length: 16 }, (_, i) => `Ligne ${i + 1} du modèle long, assez longue pour se replier sur un téléphone.`).join('\n');
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO', email: 'ines@exemple.test', ecole: 'Lycée Baggio', city: 'Lille',
  templates: [{ name: 'Court', subject: 'Bonjour', body: 'Bonjour,\n\nUn mot.\n\nInès' }, { name: 'Long', subject: 'Bonjour', body: LONG }],
  amis: [{ id: 'KarimKarimKarim01', nom: 'Karim Benali', parcours: [], cle: CLE }] };
const PISTES = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', notes: 'Éditeur de logiciels de sécurité, 40 personnes.',
  techs: 'Python, Docker', updatedAt: 9, contacts: [{ id: 'c1', name: 'Julie Marchand', role: 'RH', email: 'julie@aztek.test' }] }];

async function ecran(vp, tactile){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: tactile });
  await annuaireMuet(ctx);
  /* ce que l'app reçoit d'un clavier d'iPhone : la zone visible rétrécit,
     la page non. `scale` joue un zoom à deux doigts. */
  await ctx.addInitScript(kb => {
    const vv = new EventTarget();
    let h = innerHeight, top = 0, sc = 1;
    Object.defineProperties(vv, { height: { get: () => h }, width: { get: () => innerWidth }, offsetTop: { get: () => top },
      offsetLeft: { get: () => 0 }, scale: { get: () => sc }, pageTop: { get: () => scrollY + top }, pageLeft: { get: () => 0 } });
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    window.__zone = (o = {}) => {
      const ouvert = !!o.clavier;
      h = o.hauteur || (ouvert ? innerHeight - kb : innerHeight);
      sc = o.scale || 1;
      let k = document.getElementById('__kb');
      if (ouvert && !k){
        k = document.createElement('div'); k.id = '__kb';
        k.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${kb}px;background:#9aa0a6;z-index:99999;pointer-events:none`;
        document.documentElement.append(k);
      }
      if (!ouvert && k) k.remove();
      vv.dispatchEvent(new Event('resize'));
    };
  }, KB);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify(['wss://127.0.0.1:9']));
  }, [PISTES, PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return { ctx, p };
}
const fermer = async p => {
  await p.evaluate(() => window.__zone());
  for (let i = 0; i < 4; i++){
    const n = await p.evaluate(() => document.querySelectorAll('.overlay:not(.ov-out)').length);
    if (!n) break;
    await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop().querySelector('.modal-h .x').click());
    await p.waitForTimeout(250);
  }
};
const OUVRIR = {
  'nouvelle piste': async () => (await import('./ui/capture.js')).openCapture(),
  'écrire': async () => { const { S } = await import('./ui/state.js'); (await import('./ui/mail.js')).openMail(S.companies[0], { ctId: 'c1' }); },
  'mon profil': async () => (await import('./ui/profil.js')).openProfil(() => {}),
  'modifier': async () => { const { S } = await import('./ui/state.js'); (await import('./ui/edit.js')).openEditPiste(S.companies[0], () => {}); },
  'conversation': async () => { const { S } = await import('./ui/state.js'); (await import('./ui/messages.js')).ouvrirConversation(S.profile.amis[0]); }
};
/* le champ où l'on tape d'abord, et un champ plus bas pour le passage
   au suivant (null : la feuille n'en a qu'un) */
const CHAMPS = {
  'nouvelle piste': ['.overlay:last-child input, .overlay:last-child textarea', null],
  'écrire': ['#mBody', null],
  'mon profil': ['#pfName', '.overlay .modal-b input:not([type=checkbox]):not([type=radio]):last-of-type'],
  'modifier': ['#edName', null],
  'conversation': ['#msChamp', null]
};
/* ce qui reste sous les yeux, clavier ouvert : la barre, le champ, le pied */
const mesurer = (p, sel) => p.evaluate(([s, kb]) => {
  const visible = innerHeight - kb;
  const ov = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
  const t = ov.querySelector('.modal-h').getBoundingClientRect();
  const f = ov.querySelector('.modal-f:not([hidden])');
  const pied = f ? f.getBoundingClientRect() : null;
  const el = ov.querySelector(s) || document.activeElement;
  const champ = el.getBoundingClientRect();
  /* un champ qui vit DANS le pied (une conversation) se mesure contre le
     clavier ; les autres, contre le pied */
  const bas = pied && !f.contains(el) ? pied.top : visible;
  const fautes = [];
  if (!document.documentElement.classList.contains('clavier-ouvert')) fautes.push('la racine ne sait pas que le clavier est ouvert');
  if (t.top < -1 || t.bottom > visible + 1) fautes.push(`la barre de titre est hors de la zone (${Math.round(t.top)}–${Math.round(t.bottom)} / ${visible})`);
  if (pied && pied.bottom > visible + 1) fautes.push(`le pied passe sous le clavier (${Math.round(pied.bottom)} > ${visible})`);
  /* au moins 40 px du champ sous les yeux, entre la barre et le pied */
  const vu = Math.min(champ.bottom, bas) - Math.max(champ.top, t.bottom);
  if (vu < Math.min(40, champ.height - 1)) fautes.push(`le champ n'est pas à l'écran (${Math.round(champ.top)}–${Math.round(champ.bottom)}, ${Math.round(vu)} px visibles)`);
  return fautes;
}, [sel, KB]);

/* ---------- ① et ② au pouce, et sur un petit téléphone ---------- */
for (const [nom, vp] of [['pouce', { width: 390, height: 844 }], ['petit', { width: 360, height: 640 }]]){
  const { ctx, p } = await ecran(vp, true);
  for (const [feuille, ouvrir] of Object.entries(OUVRIR)){
    await fermer(p);
    await p.evaluate(ouvrir);
    await p.waitForTimeout(500);
    const [sel, suivant] = CHAMPS[feuille];
    await p.focus(sel);
    await p.evaluate(() => window.__zone({ clavier: true }));
    await p.waitForTimeout(300);
    const f = await mesurer(p, sel);
    if (f.length) fail(`${nom}, « ${feuille} », clavier ouvert : ${f.join(' ; ')}`);
    await p.screenshot({ path: `${SHOTS}/135-ecrire-clavier-${feuille.replace(/\s+/g, '-')}-${nom}.png` });
    if (suivant){
      /* passer au champ suivant, clavier ouvert : il vient à l'écran */
      await p.focus(suivant);
      await p.waitForTimeout(300);
      const g = await mesurer(p, suivant);
      if (g.length) fail(`${nom}, « ${feuille} », champ suivant : ${g.join(' ; ')}`);
    }
    /* ② clavier rangé : la feuille reprend tout l'écran */
    await p.evaluate(() => window.__zone());
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({ cls: document.documentElement.classList.contains('clavier-ouvert'),
      top: getComputedStyle([...document.querySelectorAll('.overlay:not(.ov-out)')].pop()).top,
      h: Math.round([...document.querySelectorAll('.overlay:not(.ov-out)')].pop().getBoundingClientRect().height) }));
    if (r.cls || r.top !== '0px' || r.h !== vp.height) fail(`${nom}, « ${feuille} », clavier rangé : la feuille ne reprend pas l'écran (${JSON.stringify(r)})`);
  }
  /* un ZOOM rétrécit aussi la zone visible : ce n'est pas un clavier */
  await fermer(p);
  await p.evaluate(OUVRIR['nouvelle piste']);
  await p.waitForTimeout(400);
  await p.evaluate(h => window.__zone({ hauteur: h, scale: 2 }), Math.round(vp.height / 2));
  await p.waitForTimeout(250);
  if (await p.evaluate(() => document.documentElement.classList.contains('clavier-ouvert'))) fail(nom + ' : un zoom à deux doigts est pris pour un clavier');
  /* une barre d'outils de Safari qui se replie : quelques dizaines de pixels */
  await p.evaluate(h => window.__zone({ hauteur: h }), vp.height - 60);
  await p.waitForTimeout(250);
  if (await p.evaluate(() => document.documentElement.classList.contains('clavier-ouvert'))) fail(nom + ' : une barre d’outils qui se replie est prise pour un clavier');
  await fermer(p);
  console.log(`①② ${nom} : cinq feuilles, la barre, le champ et le pied au-dessus du clavier ; rangé, l'écran entier ; un zoom ne déplace rien ✓`);

  /* ④ la touche Entrée, au doigt : elle va à la ligne, la flèche envoie */
  await p.evaluate(OUVRIR.conversation);
  await p.waitForSelector('#msChamp');
  await p.click('#msChamp');
  await p.keyboard.type('Salut');
  await p.keyboard.press('Enter');
  await p.keyboard.type('ça va ?');
  const v = await p.inputValue('#msChamp');
  if (v !== 'Salut\nça va ?') fail(`${nom} : au doigt, Entrée n'a pas été à la ligne (${JSON.stringify(v)})`);
  await fermer(p);
  await ctx.close();
}
console.log('④ au doigt, Entrée va à la ligne dans une conversation ✓');

/* ---------- ③ « Écrire » : le message se lit en entier ---------- */
for (const [nom, vp, tactile] of [['pouce', { width: 390, height: 844 }, true], ['petit', { width: 360, height: 640 }, true],
                                  ['poste', { width: 1280, height: 800 }, false]]){
  const { ctx, p } = await ecran(vp, tactile);
  await p.evaluate(OUVRIR['écrire']);
  await p.waitForSelector('#mBody');
  await p.waitForTimeout(400);
  for (const etape of ['gabarit', 'modèle changé', 'texte ajouté']){
    if (etape === 'modèle changé'){
      const avant = await p.evaluate(() => document.getElementById('mBody').getBoundingClientRect().height);
      await p.selectOption('#mTpl', { label: 'Long' });
      await p.waitForTimeout(200);
      const apres = await p.evaluate(() => document.getElementById('mBody').scrollHeight);
      if (apres <= avant + 40) fail(`${nom} : le modèle long ne réclame pas plus de place (${Math.round(avant)} → ${apres}) — la mesure ne mesure rien`);
    }
    if (etape === 'texte ajouté'){
      await p.click('#mBody');
      await p.keyboard.press('Control+End');
      for (let i = 0; i < 6; i++) await p.keyboard.type('\nUne ligne de plus pour voir si le champ suit.');
      await p.waitForTimeout(200);
    }
    const m = await p.evaluate(() => {
      const t = document.getElementById('mBody');
      /* ce qui suit le message et se voit : la ligne des pièces jointes,
         celle de l'adresse et de « Compléter mon profil » */
      const apres = ['mAttach', 'mHint'].map(id => document.getElementById(id).getBoundingClientRect()).filter(r => r.height > 0);
      return { cache: t.scrollHeight - t.clientHeight, bas: Math.round(t.getBoundingClientRect().bottom),
               suivant: apres.length ? Math.round(Math.min(...apres.map(r => r.top))) : null };
    });
    if (m.cache > 1) fail(`${nom}, ${etape} : le message défile dans son cadre (${m.cache} px cachés)`);
    if (m.suivant === null) fail(`${nom}, ${etape} : aucune ligne ne suit le message — la mesure ne mesure rien`);
    else if (m.suivant < m.bas - 1) fail(`${nom}, ${etape} : la ligne qui suit le message se pose dessus (${m.suivant} < ${m.bas})`);
  }
  await p.screenshot({ path: `${SHOTS}/135-ecrire-message-${nom}.png` });
  /* ④ au poste, Entrée envoie dans une conversation (rien à envoyer
     au relais muet : le message reste « pas encore parti ») */
  if (!tactile){
    await fermer(p);
    await p.evaluate(OUVRIR.conversation);
    await p.waitForSelector('#msChamp');
    await p.click('#msChamp');
    await p.keyboard.type('Bonjour');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ champ: document.getElementById('msChamp').value,
      n: document.querySelectorAll('#msFil .ms-m').length }));
    if (r.champ !== '' || r.n !== 1) fail('au poste, Entrée n’envoie pas : ' + JSON.stringify(r));
    else console.log('④ au poste, Entrée envoie ✓');
  }
  await ctx.close();
}
console.log('③ « Écrire » : le message se lit en entier et rien ne se pose dessus, au pouce, petit et au poste ✓');

/* ---------- ⑤ le bas d'une conversation reste en bas ---------- */
const N_FIL = 24;
const FIL = Array.from({ length: N_FIL }, (_, i) => ({ id: 'cv' + String(i).padStart(6, '0'), moi: i % 3 === 0,
  texte: i % 3 === 0 ? 'Message numéro ' + (i + 1) : 'Réponse de Karim, numéro ' + (i + 1) + ', un peu plus longue pour plier.',
  at: Date.now() - (N_FIL - i) * 600000 }));
const CODE_GR = 'bts2sxe3kmw4ka7';
const GROUPE = { [CODE_GR]: { nom: 'BTS SIO Lille', depuis: 0, vu: Date.now(), presence: Date.now(),
  membres: { KarimKarimKarim00001: { prenom: 'Karim', at: Date.now() - 5e8 }, SofiaSofiaSofia00001: { prenom: 'Sofia', at: Date.now() - 4e8 } },
  fil: Array.from({ length: N_FIL }, (_, i) => ({ t: 'mot', id: 'mot' + String(i).padStart(10, '0'),
    de: i % 2 ? 'KarimKarimKarim00001' : 'SofiaSofiaSofia00001', prenom: i % 2 ? 'Karim' : 'Sofia',
    texte: 'Message du groupe numéro ' + (i + 1) + ', assez long pour plier sur un téléphone.', at: Date.now() - (N_FIL - i) * 600000 })) } };
const CONVS = {
  ami: { ouvrir: OUVRIR.conversation, champ: '#msChamp', bulle: '.ms-m' },
  groupe: { ouvrir: async () => { const m = await import('./ui/groupes.js'); await m.chargerGroupes(); m.ouvrirGroupe('bts2sxe3kmw4ka7'); },
            champ: '#grMot', bulle: '#grFil .gr-m' }
};
/* la FIN du dernier message est-elle à l'écran, au-dessus du champ ?
   Sur un petit téléphone, clavier ouvert et champ de trois lignes, la
   zone du fil ne fait plus que quelques dizaines de pixels : le message
   entier n'y tient pas toujours, sa fin doit y être — c'est le bas du fil */
const dernierVu = (p, bulle) => p.evaluate(sel => {
  const b = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop();
  const l = [...b.querySelectorAll(sel)].pop();
  if (!l) return null;
  const r = l.getBoundingClientRect(), z = b.getBoundingClientRect();
  return { vu: r.bottom > z.top + 4 && r.bottom <= z.bottom + 1, texte: l.textContent.replace(/\s+/g, ' ').trim().slice(-30),
           bas: Math.round(r.bottom), zone: [Math.round(z.top), Math.round(z.bottom)] };
}, bulle);
const distBas = p => p.evaluate(() => { const b = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop();
  return Math.round(b.scrollHeight - b.scrollTop - b.clientHeight); });
for (const [nom, vp] of [['pouce', { width: 390, height: 844 }], ['petit', { width: 360, height: 640 }]]){
  let ok5 = true;
  const f5 = m => { ok5 = false; fail(m); };
  const { ctx, p } = await ecran(vp, true);
  await p.evaluate(async ([id, m, g, pr]) => { const st = await import('./engine/storage.js');
    await st.kvSet(st.MESSAGES_KEY, JSON.stringify({ v: 1, fils: { [id]: { vu: Date.now(), m } } }));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.GROUPES_KEY, JSON.stringify(g)); },
  ['KarimKarimKarim01', FIL, GROUPE, { ...PROFIL, amiId: 'InesInesInesInes0001', groupes: [{ code: CODE_GR, nom: 'BTS SIO Lille', at: Date.now() - 6e8 }] }]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  for (const [quoi, c] of Object.entries(CONVS)){
    await fermer(p);
    await p.evaluate(c.ouvrir);
    await p.waitForSelector(c.champ);
    await p.waitForTimeout(500);
    const d0 = await dernierVu(p, c.bulle);
    if (!d0 || !d0.vu) f5(`${nom}, ${quoi} : la conversation ne s'ouvre pas sur son dernier message (${JSON.stringify(d0)})`);
    /* le clavier s'ouvre : le dernier message reste à l'écran */
    await p.focus(c.champ);
    await p.evaluate(() => window.__zone({ clavier: true }));
    await p.waitForTimeout(350);
    const d1 = await dernierVu(p, c.bulle);
    if (!d1 || !d1.vu) f5(`${nom}, ${quoi} : clavier ouvert, le dernier message passe sous le champ (${JSON.stringify(d1)})`);
    await p.screenshot({ path: `${SHOTS}/135-conversation-clavier-${quoi}-${nom}.png` });
    /* plusieurs lignes D'UN COUP pendant qu'une relecture de défilement
       attend son image (un téléphone lent tape plus vite qu'il ne
       dessine) : le dernier message reste à l'écran quand même */
    await p.evaluate(async sel => {
      const t = document.querySelector(sel);
      const b = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop();
      const image = () => new Promise(r => requestAnimationFrame(() => r()));
      t.value = 'Trois lignes d’un coup, pour voir si le fil garde son bas. '.repeat(4);
      b.dispatchEvent(new Event('scroll'));
      t.dispatchEvent(new Event('input'));
      for (let i = 0; i < 4; i++) await image();
    }, c.champ);
    const d2 = await dernierVu(p, c.bulle);
    if (!d2 || !d2.vu) f5(`${nom}, ${quoi} : trois lignes d’un coup, et le dernier message passe sous le champ (${JSON.stringify(d2)})`);
    await p.evaluate(sel => { const t = document.querySelector(sel); t.value = ''; t.dispatchEvent(new Event('input')); }, c.champ);
    /* remonter dans le fil, PUIS ouvrir le clavier : on lisait plus
       haut, on y reste — ce qui touchait le bas de la zone y reste (la
       distance au bas se garde), et rien ne ramène au dernier message */
    await p.evaluate(() => window.__zone());
    await p.waitForTimeout(250);
    await p.evaluate(() => { const b = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-b')].pop(); b.scrollTop = 0; });
    await p.waitForTimeout(150);
    const avant = await distBas(p);
    await p.evaluate(() => window.__zone({ clavier: true }));
    await p.waitForTimeout(350);
    const apres = await distBas(p);
    if (avant < 40 || Math.abs(apres - avant) > 6)
      f5(`${nom}, ${quoi} : on lisait plus haut, le clavier a déplacé la lecture (au bas : ${avant} px avant, ${apres} après)`);
  }
  await fermer(p);
  await ctx.close();
  if (ok5) console.log(`⑤ ${nom} : ami et groupe, le dernier message reste au-dessus du clavier et du champ qui grandit ; qui lit plus haut y reste ✓`);
}

const vraies = errors.filter(e => !/net::ERR|Failed to load resource|WebSocket/.test(e));
if (vraies.length) fail('erreurs console : ' + vraies.join(' | '));
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E écrire : ÉCHEC' : 'E2E écrire : OK');
process.exit(process.exitCode || 0);
