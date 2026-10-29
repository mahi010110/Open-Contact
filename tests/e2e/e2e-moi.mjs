/* ============================================================
   « Moi » — et le profil qui sert ailleurs.

   Au pouce : le profil, « Ce que j'envoie », puis la porte « Réglages »
   (#20). Le mainteneur a essayé « Moi » sur un seul écran et l'a refusé
   sur son téléphone : la porte reste. Et TOUT ce qui se règle vit
   derrière elle, « Ma copie » en tête (décision 0009, 29 octobre 2026 :
   « mettre tous les paramètres dans les réglages »). Ce scénario garde
   ce qui se défait en silence :

   ① au pouce, la porte « Réglages » est là, et ses lignes derrière —
     « Moi » ne porte plus aucun réglage (une mutation remet « Ma copie »
     dans « Moi », la garde rougit) ;
   ② l'avertissement « enregistrées seulement sur cet appareil » ne
     parle que sans copie récente ni autre appareil, et se tait dès
     qu'une copie part — il a été retiré une fois pour avoir parlé à
     chaque passage. Sur « Moi », la porte le dit d'un mot, « sans
     copie » ;
   ③ au doigt, la copie passe par la feuille de partage (une copie
     restée sur le téléphone ne rattrape pas un téléphone perdu), et
     renoncer au partage ne compte pas comme une copie ;
   ④ « Effacer cet appareil » efface VRAIMENT — y compris la vieille clé
     `oc_data_v2` qu'une base vide relit au chargement ;
   ⑤ le profil sert là où l'on décide : « Par où commencer » fait monter
     les pistes qui prennent ce que tu cherches, et le composeur montre
     « Compléter mon profil » quand le mail partirait faux.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, ouvrirReglages } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okSi = (cond, msg) => { if (cond) console.log(msg + ' ✓'); else fail(msg); };

const PROFIL = { name: 'Sam Martin', formation: 'BTS SIO', ecole: 'Lycée Eiffel', email: 'sam@lycee.fr',
  recherche: 'alternance', debut: '2027-09-01', fin: '2029-08-31' };
const pistes = n => Array.from({ length: n }, (_, i) => ({
  id: 'p' + i, name: 'Piste ' + String(i + 1).padStart(2, '0'), city: 'Lille', status: 'todo',
  contacts: [], updatedAt: 1000 - i }));

/* une page « Moi » semée par le vrai stockage, puis RECHARGÉE : semer
   sans recharger mesure l'état d'avant (§5, corollaire ②) */
async function page({ largeur = 390, profil = PROFIL, data = pistes(24), partage = null, route = 'moi',
                      ua = null, installee = false, mutation = null } = {}){
  const doigt = largeur < 901;
  const ctx = await browser.newContext({ viewport: { width: largeur, height: doigt ? 844 : 800 },
    hasTouch: doigt, isMobile: doigt, acceptDownloads: true, ...(ua ? { userAgent: ua } : {}) });
  /* « installée » : le navigateur répondrait `display-mode: standalone` */
  if (installee) await ctx.addInitScript(() => {
    const mm = window.matchMedia.bind(window);
    window.matchMedia = q => /display-mode:\s*standalone/.test(q)
      ? { matches: true, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }
      : mm(q);
  });
  /* La feuille de partage n'existe pas sous Chromium desktop : on la
     simule, et on ENREGISTRE ce qu'elle reçoit. Elle refuse le `.oc` comme
     le fait Chrome (liste fermée d'extensions), pour prouver le repli
     `.oc.txt`. */
  if (partage) await ctx.addInitScript(mode => {
    window.__partages = [];
    navigator.canShare = d => !!(d && d.files && d.files.every(f => /\.txt$/.test(f.name)));
    navigator.share = async d => {
      if (mode === 'renonce'){ const e = new Error('abort'); e.name = 'AbortError'; throw e; }
      window.__partages.push(d.files.map(f => ({ name: f.name, size: f.size })));
    };
  }, partage);
  /* une mutation : un fichier servi modifié, la preuve que la garde sait encore échouer */
  if (mutation) await ctx.route('**/' + mutation.fichier, r => r.fulfill({ contentType: 'text/javascript', body: mutation.corps }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/' + route, { waitUntil: 'load' });
  await p.evaluate(async ([pr, d]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, [profil, data]);
  await p.reload({ waitUntil: 'load' });
  return { ctx, p };
}
const lastBackupAt = p => p.evaluate(async () => (await import('./ui/state.js')).S.profile.flags.lastBackupAt || 0);

/* ---------- ① et ② : la porte, et l'avertissement au bon moment ---------- */
/* ce que « Moi » porte de RÉGLAGES, au pouce : rien (décision 0009) */
const reglagesDansMoi = p => p.evaluate(() => [...document.querySelectorAll(
  '#view-moi #moiBk, #view-moi #moiPhrase, #view-moi #moiVerrou, #view-moi #moiTheme, #view-moi #moiSync')].map(e => e.id).join(','));
{
  const { ctx, p } = await page({ partage: 'accepte' });
  await p.waitForSelector('#moiProfil');
  okSi(!!(await p.$('#moiReglages')) && !(await reglagesDansMoi(p)),
    'au pouce, « Réglages » est une porte : tous ses réglages sont derrière, « Ma copie » comprise');
  await attendre(p, () => !!document.querySelector('#moiFilet'), { message: 'la porte qui dit « sans copie »' });
  okSi((await p.textContent('#moiReglages #moiFilet')).trim() === 'sans copie',
    'sans copie ni autre appareil : la porte des Réglages le dit d’un mot');
  await ouvrirReglages(p);
  await attendre(p, () => /Tes 24 pistes/.test(document.querySelector('#moiFilet')?.textContent || ''), { message: 'l’avertissement sans copie' });
  okSi((await p.textContent('#moiFilet')).includes('Tes 24 pistes sont enregistrées seulement sur cet appareil'),
    'derrière, en tête des Réglages : l’état nomme le fait');
  okSi(await p.$eval('#moiCopie', e => e.classList.contains('fs-alert')), 'et « Ma copie » prend le bord ambre');
  const mots = (await p.textContent('#view-moi')).toLowerCase();
  okSi(!/\babri|\bfilet/.test(mots),'aucune image à la place du fait (§7)');

  /* ③ la copie par la feuille de partage */
  okSi((await p.textContent('#moiBkDo')).trim() === 'Enregistrer', 'au doigt, le bouton dit « Enregistrer »');
  await p.click('#moiBkDo');
  await attendre(p, () => (window.__partages || []).length === 1, { message: 'la feuille de partage reçoit la copie' });
  const [[fichier]] = await p.evaluate(() => window.__partages);
  okSi(/^opencontact-copie-\d{4}-\d{2}-\d{2}\.oc\.txt$/.test(fichier.name) && fichier.size > 100,
    'le `.oc` refusé par le partage repart en `.oc.txt` — même nom, même contenu');
  okSi(await lastBackupAt(p) > 0, 'la copie partagée compte comme une copie');
  await attendre(p, () => !document.querySelector('#moiFilet'), { message: 'l’avertissement se tait après la copie' });
  okSi(!(await p.$eval('#moiCopie', e => e.classList.contains('fs-alert'))), 'et le bord ambre part avec lui');
  await ctx.close();
}
{
  /* peu de pistes : rien ne vaut d'inquiéter */
  const { ctx, p } = await page({ data: pistes(3) });
  await p.waitForSelector('#moiProfil');
  await p.waitForTimeout(400);
  okSi(!(await p.$('#moiFilet')), 'trois pistes : aucun avertissement sur « Moi »');
  await ouvrirReglages(p);
  await p.waitForTimeout(300);
  okSi(!(await p.$('#moiFilet')), 'ni dans les Réglages');
  await ctx.close();
}
{
  /* la mutation : « Ma copie » remise dans « Moi » — la garde du ① rougit */
  const src = await (await fetch(base + '/ui/moi.js')).text();
  const corps = src.replace(': objet + aide + envoi +', ': objet + aide + envoi + copieHTML() +');
  okSi(corps !== src, 'mutation « Ma copie » dans « Moi » : le fichier servi est bien modifié');
  const { ctx, p } = await page({ mutation: { fichier: 'ui/moi.js', corps } });
  await p.waitForSelector('#moiProfil');
  okSi(!!(await reglagesDansMoi(p)), 'mutation : la garde voit un réglage revenu dans « Moi » — ' + await reglagesDansMoi(p));
  await ctx.close();
}
{
  /* ③ renoncer au partage : rien n'est parti, rien ne se compte */
  const { ctx, p } = await page({ partage: 'renonce' });
  await ouvrirReglages(p);
  await p.waitForSelector('#moiBkDo');
  await p.evaluate(() => { const t = document.querySelector('#toast'); if (t) t.textContent = ''; });
  await p.click('#moiBkDo');
  await p.waitForTimeout(500);
  okSi(await lastBackupAt(p) === 0, 'partage abandonné : aucune copie comptée');
  okSi(!!(await p.$('#moiFilet')), 'et l’avertissement reste — il n’y a toujours pas de copie');
  await ctx.close();
}
{
  /* au poste : le téléchargement d'avant, sous son vrai nom */
  const { ctx, p } = await page({ largeur: 1280 });
  await p.waitForSelector('#moiBkDo');
  okSi((await p.textContent('#moiBkDo')).trim() === 'Télécharger', 'au poste, le bouton télécharge');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#moiBkDo')]);
  okSi(/^opencontact-copie-\d{4}-\d{2}-\d{2}\.oc$/.test(dl.suggestedFilename()), 'la copie garde son nom `.oc`');
  await ctx.close();
}

/* ---------- ④ effacer cet appareil ---------- */
{
  const { ctx, p } = await page();
  await ouvrirReglages(p);
  await p.waitForSelector('#moiEfface');
  /* une vieille clé d'avant la v3 : une base vide la relit au chargement */
  await p.evaluate(() => localStorage.setItem('oc_data_v2', JSON.stringify([{ id: 'v2', name: 'Revenante', status: 'todo' }])));
  await p.click('#moiEfface');
  await p.waitForSelector('text=Effacer cet appareil ?');
  const msg = await p.textContent('.modal');
  okSi(msg.includes('24 pistes') && msg.includes('tout sera perdu'),
    'la question montre ce qu’on ne peut pas deviner : combien part, et qu’aucune copie n’existe');
  /* le rechargement, pas une navigation quelconque : les feuilles poussent
     et consomment des entrées d'historique, que `waitForNavigation`
     prendrait pour elle — et l'on mesurerait la page d'AVANT */
  const recharge = p.waitForEvent('load');
  await p.click('.modal .btn-danger');
  await recharge;
  await p.goto(base + '/#/moi', { waitUntil: 'load' });
  await ouvrirReglages(p);
  const apres = await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    return { n: S.companies.length, nom: S.profile.name, v2: localStorage.getItem('oc_data_v2') };
  });
  okSi(apres.n === 0 && !apres.nom, 'effacé : ni piste ni profil au rechargement');
  okSi(apres.v2 === null, 'et la vieille clé `oc_data_v2` ne ressuscite rien');
  okSi(!(await p.$('#moiEfface')), 'rien à effacer : la ligne n’existe plus');
  await ctx.close();
}

/* ---------- ⑤ le profil sert là où l'on décide ---------- */
{
  const qui = [
    { id: 'a', name: 'Aster Stages', status: 'todo', positions: ['stage'], updatedAt: 3,
      contacts: [{ id: 'ca', name: 'Ana', email: 'ana@aster.test' }] },
    { id: 'b', name: 'Borée Alternance', status: 'todo', positions: ['alternance'], updatedAt: 2, contacts: [] },
    { id: 'c', name: 'Cirrus Muet', status: 'todo', updatedAt: 1,
      contacts: [{ id: 'cc', name: 'Céline', email: 'celine@cirrus.test' }] }
  ];
  const { ctx, p } = await page({ route: 'aujourdhui', data: qui });
  await p.waitForSelector('.act-start');
  const ordre = await p.$$eval('.act-start .act-verb', els => els.map(e => e.textContent.trim()));
  okSi(ordre.join(' > ') === 'Borée Alternance > Cirrus Muet > Aster Stages',
    '« Par où commencer » : prend ce que tu cherches > on ne sait pas > ne prend pas (' + ordre.join(' > ') + ')');
  okSi((await p.textContent('.act-start[data-id="b"]')).includes('prend des alternants'),
    'et la raison se lit sur la ligne');
  await ctx.close();
}
{
  /* sans rien choisi, l'ordre d'avant est intact : l'adresse passe devant */
  const qui = [
    { id: 'b', name: 'Borée Alternance', status: 'todo', positions: ['alternance'], updatedAt: 2, contacts: [] },
    { id: 'a', name: 'Aster Stages', status: 'todo', positions: ['stage'], updatedAt: 3,
      contacts: [{ id: 'ca', name: 'Ana', email: 'ana@aster.test' }] }
  ];
  const { ctx, p } = await page({ route: 'aujourdhui', data: qui, profil: { name: 'Sam', formation: 'BTS SIO' } });
  await p.waitForSelector('.act-start');
  const ordre = await p.$$eval('.act-start .act-verb', els => els.map(e => e.textContent.trim()));
  okSi(ordre[0] === 'Aster Stages', 'sans recherche choisie, le critère ne départage rien');

  /* le composeur : « Compléter mon profil » tant que le mail partirait faux */
  await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    (await import('./ui/mail.js')).openMail(S.companies.find(c => c.id === 'a'), { ctId: 'ca' });
  });
  await p.waitForSelector('#mBody');
  okSi(!!(await p.$('#mProfil')), 'recherche non choisie : le composeur propose de compléter le profil');
  await ctx.close();
}

/* ---------- installer l'app : au doigt, tant qu'elle ne l'est pas ---------- */
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
{
  const { ctx, p } = await page({ ua: UA_IPHONE });
  await ouvrirReglages(p);
  await p.waitForSelector('#moiInstall');
  okSi(true, 'iPhone dans Safari : la ligne « Installer l’app » est dans Réglages');
  await p.click('#moiInstall');
  await p.waitForSelector('.inst-pas');
  const txt = await p.textContent('.modal');
  okSi(txt.includes('Partager') && txt.includes('Sur l’écran d’accueil') && txt.includes('⋯'),
    'sur iPhone, les deux gestes — et le menu ⋯ si Partager n’est pas visible');
  okSi(txt.includes('garde tes pistes') && !txt.includes('iOS 26') && !(await p.$('.modal .hint.warn')),
    'et la raison, dite comme un bénéfice, sans numéro de version ni alerte orange');
  await ctx.close();
}
{
  /* Android : l'invite du système, rejouée au moment où on la demande */
  const { ctx, p } = await page({ ua: UA_ANDROID });
  await ouvrirReglages(p);
  await p.waitForSelector('#moiInstall');
  await p.evaluate(() => {
    const e = new Event('beforeinstallprompt');
    e.prompt = async () => { window.__invite = 'jouée'; };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await p.click('#moiInstall');
  await attendre(p, () => window.__invite === 'jouée', { message: 'l’invite du système est rejouée' });
  await attendre(p, () => !document.querySelector('#moiInstall'), { message: 'installée, la ligne part' });
  okSi(!(await p.$('.inst-pas')), 'Android : l’invite du système, sans feuille — puis la ligne part');
  await ctx.close();
}
{
  const { ctx, p } = await page({ installee: true });
  await ouvrirReglages(p);
  okSi(!(await p.$('#moiInstall')), 'déjà installée : aucune ligne');
  await ctx.close();
}
{
  const { ctx, p } = await page({ largeur: 1280 });
  await ouvrirReglages(p);
  okSi(!(await p.$('#moiInstall')), 'au poste : aucune ligne');
  await ctx.close();
}

/* ---------- le composeur ouvre le modèle qui convient ---------- */
{
  const qui = [{ id: 'r', name: 'Relancée SA', status: 'active', updatedAt: 1,
    contacts: [{ id: 'cr', name: 'Rémi', email: 'remi@relancee.test' }] }];
  const { ctx, p } = await page({ data: qui });
  await p.waitForSelector('#moiProfil');
  const choisi = await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    (await import('./ui/mail.js')).openMail(S.companies[0], { ctId: 'cr' });
    await new Promise(r => setTimeout(r, 300));
    const sel = document.querySelector('#mTpl');
    return { nom: sel.options[sel.selectedIndex].text, corps: document.querySelector('#mBody').value };
  });
  okSi(choisi.nom === 'Relance' && choisi.corps.includes('Je reviens vers vous'),
    'piste « en cours » : le composeur s’ouvre sur la relance, pas sur une seconde candidature');
  await ctx.close();
}

/* ---------- Mes appareils : deux gestes, sans note ----------
   « sur le premier appareil », « sur l'appareil à ajouter » sont partis
   le 30 septembre 2026 : les verbes le disent (on CRÉE ce qu'on n'a pas,
   on ENTRE ce qu'un autre écran affiche), et l'écran suivant le montre. */
{
  const { ctx, p } = await page();
  await ouvrirReglages(p);
  await p.click('#moiSync');
  await p.waitForSelector('#syNew');
  const deux = await p.evaluate(() => ['#syNew', '#syJoin'].map(s => document.querySelector(s).textContent.replace(/\s+/g, ' ').trim()));
  /* le BUT, pas le mécanisme : « Créer une phrase » côtoyait « Créer
     ma phrase » de la phrase de secours, un autre secret (§7) */
  okSi(deux[0] === 'Relier un autre appareil' && deux[1] === 'Relier cet appareil',
    'deux gestes, rien d’autre sur le bouton (lu : ' + deux.join(' | ') + ')');
  await ctx.close();
}

/* ---------- au poste, « Moi » et ses Réglages sur un écran : chaque
   identifiant n'y vit qu'une fois (audit du 28 octobre 2026) ----------
   « Je peux aider » et « Aide et confidentialité » portaient le même :
   toucher le premier ouvrait AUSSI la page d'aide dans un onglet, et le
   second ne faisait rien. Un identifiant en double ne se voit pas — il
   se joue. */
{
  const { ctx, p } = await page({ largeur: 1280, profil: { ...PROFIL, amiId: 'MoiMoiMoiMoiMoi000001' } });
  await p.waitForSelector('#moiReglagesCols, .moi-cols');
  await p.waitForTimeout(300);
  const doubles = await p.evaluate(() => { const vus = new Map();
    for (const e of document.querySelectorAll('#view-moi [id]')) vus.set(e.id, (vus.get(e.id) || 0) + 1);
    return [...vus].filter(([, n]) => n > 1).map(([id]) => id); });
  okSi(!doubles.length, 'au poste, aucun identifiant en double dans « Moi » (' + (doubles.join(', ') || 'aucun') + ')');
  const onglets = [];
  ctx.on('page', np => onglets.push(np.url()));
  await p.click('#moiAide');
  await p.waitForTimeout(500);
  const feuille = await p.evaluate(() => document.querySelector('.overlay:not(.ov-out) .mh-t')?.textContent || '');
  okSi(feuille === 'Je peux aider' && !onglets.length, '« Je peux aider » ouvre sa feuille, et elle seule (' + feuille + ', ' + onglets.length + ' onglet)');
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].forEach(o => o.querySelector('.modal-h .x')?.click()));
  await p.waitForTimeout(300);
  await p.click('#moiAidePage');
  await p.waitForTimeout(600);
  okSi(onglets.some(u => /aide\.html$/.test(u)), '« Aide et confidentialité » ouvre la page d’aide');
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E moi : ÉCHEC' : 'E2E moi : OK');
await browser.close();
server.close();
