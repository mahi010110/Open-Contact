/* ============================================================
   OpenContact — e2e : L'ONGLET RÉSEAU
   (lot R1 en 7.0.0, décision 0002 ; revenu en 8.1.0 — décision 0012,
   le mainteneur, 3 novembre 2026 : « la présentation du réseau et les
   amis, remets-les »)

   Un onglet, une question — qui peut m'aider ? :
   ② la barre dit Aujourd'hui · Pistes · Réseau · Moi, et `#/echanger`
     — l'adresse de la 8.0 et d'avant la 7.0.0 — mène à « Réseau »
     (l'adresse se réécrit, le titre suit) ;
   ③ mes demandes en tête (une ligne chacune dès qu'il y en a deux, le
     contact donné en accent sur sa ligne, la carte au tap), puis les
     conversations, puis « Mes amis » — et, sous le pouce, les deux
     verbes de l'échange, Donner · Recevoir ;
   ④ « Recevoir » ouvre QR · Fichier · Texte ;
   ⑤ Pistes ne porte que des entreprises : pas de portée « Amis » ; et
     « Réseau › Donner » part de toutes les pistes, cochées d'office ;
   ⑥ « Mes amis » cherche comme la barre : « Thales » trouve Karim,
     « cyber Lille » propose de demander ;
   ⑧ au poste : deux colonnes — les gens à gauche, les échanges de
     pistes à droite —, Donner · Recevoir à droite du titre, et une
     conversation s'ouvre en FENÊTRE (la conversation posée à droite de
     la liste n'est pas revenue).
   Zéro erreur console. Quatre mutations à l'appui : l'ancienne adresse
   oubliée, l'écran sans ses demandes, le partage qui quitte « Réseau »,
   la portée « Amis » revenue dans Pistes.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const now = Date.now(), J = 864e5;
const CLE = 'B' + 'x'.repeat(86);
const profil = { name: 'Tom Durand', email: 'tom@prive.test', formation: 'BTS SIO', recherche: 'alternance',
  amis: [{ id: 'KarimKarimKarim000001', nom: 'Karim Benali', recu: now - 9 * J, cle: CLE,
           parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09' }] },
         { id: 'LeaLeaLeaLeaLea000001', nom: 'Léa Martin', recu: now - 4 * J, parcours: [], cle: CLE }],
  groupes: [{ code: 'abcdefghjkmnpqr', nom: 'BTS SIO Lille', at: now - 9 * J }] };
/* `updatedAt` DATÉ, jamais laissé au moteur : sans lui, la normalisation
   pose `Date.now()` à la milliseconde où chaque piste est lue, l'ordre de
   la liste devient un tirage, et ⑫ (↓ depuis Advens) tombait sur une
   liste où Advens était la dernière ligne — rouge une fois sur trois en
   CI (PR #78), vert en local. L'ordre est maintenant écrit ici :
   Aztek, Advens, Thales, Kiabi. */
const pistes = [{ id: 'az', name: 'Aztek', city: 'Roubaix', status: 'todo', updatedAt: now - 1 * J },
                { id: 'adv', name: 'Advens', city: 'Lille', status: 'active', updatedAt: now - 2 * J,
                  contacts: [{ id: 'c1', name: 'Nadia Rahmani', email: 'nadia@advens.test' }] },
                { id: 'th', name: 'Thales', city: 'Lille', status: 'todo', updatedAt: now - 3 * J },
                { id: 'ki', name: 'Kiabi', city: 'Hem', status: 'todo', updatedAt: now - 4 * J }];
const reseau = { v: 1, depuis: 0, recues: [], mercis: [], lus: [], envois: [], entrees: [], attentes: [],
  demandes: [
    { id: 'demandeAz0001', pisteId: 'az', at: now - 2 * J, exp: now + 12 * J, vers: 2, groupes: ['BTS SIO Lille'],
      cherche: 'alternance', entreprise: { nom: 'Aztek' } },
    { id: 'demandeTh0001', pisteId: 'th', at: now - 3 * J, exp: now + 11 * J, vers: 1,
      cherche: 'alternance', entreprise: { nom: 'Thales' }, trouve: { at: now - 2 * J, cercle: 1 } }],
  dons: [{ id: 'donThales0001', demande: 'demandeTh0001', de: { prenom: 'Karim', cle: CLE }, entreprise: { nom: 'Thales' },
           contact: { name: 'Julie Marchand', role: 'RH', email: 'julie@thales.test' }, at: now - 60000, statut: 'nouveau' }] };

/* un échange déjà fait : l'historique a une trace à relire */
const journal = [{ t: now - 2 * J, txt: 'Reçu de Marco : +1 piste(s), 0 complétée(s)', ids: ['ki'] }];

/* `mutations` : des fichiers servis modifiés — la preuve que le scénario
   sait encore échouer */
async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, hash = '#/aujourdhui', mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  /* semer APRÈS le démarrage, puis recharger : l'app lit son état à
     l'ouverture (§5) */
  await p.evaluate(async ([pr, ps, rs, jn]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RESEAU_KEY, JSON.stringify(rs));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(jn));
  }, [profil, pistes, reseau, journal]);
  await p.evaluate(h => { location.hash = h; }, hash);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async () => { await (await import('./ui/reseau.js')).chargerReseau(); (await import('./ui/state.js')).bus.refresh(); });
  await p.waitForTimeout(350);
  return { ctx, p };
}
const allerA = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(400); };
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop()?.querySelector('.mh-t')?.textContent.trim() || '');
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};
/* la barre telle qu'on la lit : chaque onglet, son mot et son adresse */
const barre = p => p.evaluate(() => {
  const nav = matchMedia('(min-width:901px)').matches ? '.topnav' : '.bottomnav';
  /* seulement ce qui se voit : au téléphone (9.0), chaque coin porte deux
     liens et n'en montre qu'un — le lieu, ou le retour à « Aujourd'hui » */
  return [...document.querySelectorAll(nav + ' a[data-r]')].filter(a => a.getClientRects().length).map(a => a.innerText.replace(/\s+/g, ' ').trim() + '→' + a.getAttribute('href')).join(' | ');
});
const ici = p => p.evaluate(() => ({
  hash: location.hash, titre: document.title,
  vue: [...document.querySelectorAll('[id^="view-"]')].find(v => !v.hidden)?.id.replace('view-', ''),
  h1: [...document.querySelectorAll('[id^="view-"]')].find(v => !v.hidden)?.querySelector('h1')?.textContent.trim()
}));
const reseauLu = p => p.evaluate(() => {
  const v = document.querySelector('#view-reseau');
  return {
    /* deux demandes : une ligne chacune, l'entreprise en tête (R10) */
    demandes: v ? [...v.querySelectorAll('#rzDemandes .rz-l .rz-m b')].map(t => t.textContent.trim()) : [],
    don: v?.querySelector('#rzDemandes .rz-s-don')?.textContent.trim() || '',
    /* l'ordre de la colonne : la tranche des demandes, puis la boîte */
    ordre: v ? [...v.querySelectorAll('#rzDemandes, .bx-liste')].map(e => e.id || 'boite') : [],
    amis: v?.querySelector('#bxAmis')?.innerText.replace(/\s+/g, ' ').trim() || '',
    /* les deux verbes de l'échange, et où ils tombent : sous la boîte,
       dans le bas de l'écran au pouce (§5) */
    verbes: v ? [...v.querySelectorAll('#rzDonner, #rzRecevoir')].map(b => b.textContent.trim()).join(' · ') : '',
    basVerbes: (() => { const b = v?.querySelector('#rzRecevoir'); return b ? Math.round(b.getBoundingClientRect().top / innerHeight * 100) : -1; })(),
    echangerParti: !document.querySelector('#view-echanger')
  };
});

/* ---------- ②-⑥ au pouce (clair, puis sombre) ---------- */
for (const sombre of [false, true]){
  const nom = sombre ? 'pouce-sombre' : 'pouce';
  const { ctx, p } = await ecran(nom, { sombre, hash: '#/echanger' });
  const a = await ici(p);
  ok(a.vue === 'reseau' && a.hash === '#/reseau' && a.titre === 'Réseau — OpenContact' && a.h1 === 'Réseau',
    `② ${nom} : « #/echanger » mène à « Réseau », l'adresse et le titre suivent — ${JSON.stringify(a)}`);
  /* 9.0 : trois places en bas, « Réseau » vit dans « Moi ». Dans
     « Réseau », le coin de droite ramène à « Aujourd'hui » ; et « Moi »
     porte la ligne qui y mène. */
  ok(await barre(p) === 'Pistes→#/pistes | Aujourd’hui→#/aujourdhui',
    `② ${nom} : dans « Réseau », la barre du bas dit Pistes et le retour — ${await barre(p)}`);
  await p.evaluate(() => { location.hash = '#/moi'; });
  await p.waitForSelector('#moiReseau');
  await p.click('#moiReseau');
  await p.waitForSelector('#view-reseau:not([hidden])');
  ok((await ici(p)).vue === 'reseau', `② ${nom} : « Moi » porte la ligne « Réseau », qui y mène`);
  await p.waitForTimeout(250);
  const r = await reseauLu(p);
  ok(r.demandes.join(' / ') === 'Aztek / Thales'
    && r.don === 'Karim t’a donné Julie Marchand' && r.ordre.join(',') === 'rzDemandes,boite',
    `③ ${nom} : mes demandes en tête, une ligne chacune, la plus récente d'abord, le contact donné sur sa ligne — ${JSON.stringify(r)}`);
  /* la carte entière, au tap */
  await p.click('#rzDemandes .rz-l');
  const carte = await p.waitForSelector('.modal #rzCarte .dmc-t').then(e => e.evaluate(t => t.firstChild.textContent.trim()), () => '');
  ok(carte === 'Tu cherches quelqu’un chez Aztek pour une alternance', `③ ${nom} : la ligne ouvre sa carte (« ${carte} »)`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(350);
  ok(r.amis === 'Mes amis 2' && r.verbes === 'Donner · Recevoir' && r.basVerbes >= 75 && r.echangerParti,
    `③ ${nom} : « Mes amis » dans la liste, Donner · Recevoir sous le pouce, et plus d'écran « Échanger » — ${JSON.stringify(r)}`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-${nom}.png` });
  if (sombre){ await ctx.close(); continue; }

  /* ④ « Recevoir » vit dans Réseau */
  await p.click('#rzRecevoir');
  await p.waitForTimeout(350);
  const rc = await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .pick')].map(b => b.textContent.trim()).join(' · '));
  ok(await dessus(p) === 'Recevoir' && rc === 'QR · Fichier · Texte', `④ « Recevoir » : ${rc}`);
  await fermer(p);

  /* ⑤ Pistes : des entreprises ; « Réseau › Donner » donne */
  await allerA(p, '#/pistes');
  const portees = await p.evaluate(() => [...document.querySelectorAll('#piPortee [data-portee]')].map(b => b.dataset.portee).join(','));
  ok(portees === 'pistes,decouvrir', `⑤ Pistes : plus de portée « Amis » — ${portees}`);
  await allerA(p, '#/reseau');
  await p.click('#rzDonner');
  await p.waitForTimeout(450);
  const dn = await p.evaluate(() => [...document.querySelectorAll('.modal-donner .pk')].map(b => b.dataset.id + (b.classList.contains('on') ? '*' : '')).sort().join(','));
  ok(await dessus(p) === 'Donner' && dn === 'adv*,az*,ki*,th*', `⑤ « Réseau › Donner » part de toutes les pistes, cochées — ${dn}`);
  await fermer(p);

  /* ⑥ Mes amis */
  await allerA(p, '#/reseau');
  await p.click('#bxAmis');
  await p.waitForTimeout(350);
  const amis = () => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .am-row h3')].map(h => h.textContent.trim()).join(', '));
  const tous = await amis();
  await p.fill('#amQ', 'Thales');
  await p.waitForTimeout(250);
  const th = await amis();
  await p.fill('#amQ', 'cyber Lille');
  await p.waitForTimeout(250);
  const dem = await p.evaluate(() => document.querySelector('.overlay:not(.ov-out) #avDemander')?.textContent.trim());
  ok(await dessus(p) === 'Amis' && tous === 'Karim Benali, Léa Martin' && th === 'Karim Benali' && dem === 'Demander à mes amis',
    `⑥ « Mes amis » : ${tous} ; « Thales » → ${th} ; « cyber Lille » → ${dem}`);
  await p.fill('#amQ', '');
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${SHOTS}/161-reseau-amis.png` });
  await fermer(p);

  await ctx.close();
}

/* ---------- ⑧ au poste ---------- */
for (const sombre of [false, true]){
  const nom = sombre ? 'poste-sombre' : 'poste';
  const { ctx, p } = await ecran(nom, { vp: { width: 1280, height: 800 }, sombre, hash: '#/reseau' });
  const a = await ici(p);
  const r = await reseauLu(p);
  /* au poste, les deux verbes se posent à droite du titre */
  const tete = await p.evaluate(() => [...document.querySelectorAll('#view-reseau .td-head .btn')].map(b => b.textContent.trim()).join(' · '));
  ok(a.vue === 'reseau' && a.h1 === 'Réseau' && r.ordre.join(',') === 'rzDemandes,boite' && tete === 'Donner · Recevoir'
    && await barre(p) === 'Aujourd’hui→#/aujourdhui | Mes pistes→#/pistes | Réseau→#/reseau | Moi→#/moi',
    `⑧ ${nom} : Réseau, mes demandes en tête, Donner · Recevoir à droite du titre — ${tete} — ${await barre(p)}`);
  /* deux colonnes : les gens (demandes, conversations) à gauche, la plus
     large ; les échanges de pistes (l'historique) à droite */
  const c = await p.evaluate(() => {
    const g = document.querySelector('#view-reseau .bx-gens'), e = document.querySelector('#view-reseau .bx-echanges');
    if (!g || !e) return null;
    const rg = g.getBoundingClientRect(), re = e.getBoundingClientRect();
    return { gens: !!g.querySelector('#rzDemandes') && !!g.querySelector('.bx-liste'), echanges: !!e.querySelector('#ecHisto'),
             cote: rg.right <= re.left && rg.width > re.width };
  });
  ok(c && c.gens && c.echanges && c.cote, `⑧ ${nom} : les gens à gauche, la plus large ; l'historique à droite — ${JSON.stringify(c)}`);
  await p.click('.bx-l[data-fil]');
  await p.waitForSelector('.overlay:not(.ov-out) .modal-conv, .overlay:not(.ov-out) .modal-groupe');
  ok(await p.evaluate(() => !document.querySelector('#bxVolet, .dock')), `⑧ ${nom} : une conversation s'ouvre en fenêtre, rien ne se pose à côté de la liste`);
  await p.screenshot({ path: `${SHOTS}/161-reseau-${nom}.png` });
  await ctx.close();
}

/* ---------- les mutations : le scénario sait encore échouer ---------- */
{
  const dst = await readFile(path.join(ROOT, 'engine', 'destinations.js'), 'utf8');
  const oubli = dst.replace("alias: { echanger: 'reseau' }", 'alias: {}');
  ok(oubli !== dst, 'mutation ① l’ancienne adresse oubliée : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-adresse', { mutations: { 'engine/destinations.js': oubli }, hash: '#/echanger' });
  const a = await ici(p);
  ok(!(a.vue === 'reseau' && a.hash === '#/reseau'), `mutation ① : la garde de l'adresse rougit — ${JSON.stringify(a)}`);
  await ctx.close();
}
{
  const ech = await readFile(path.join(ROOT, 'ui', 'echanger.js'), 'utf8');
  const fige = ech.replace('const gens = `${demandesHTML()}${b.html}`', 'const gens = `${b.html}`');
  ok(fige !== ech, 'mutation ② l’écran sans ses demandes : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-ecran', { mutations: { 'ui/echanger.js': fige }, hash: '#/reseau' });
  const r = await reseauLu(p);
  ok(!(r.ordre.join(',') === 'rzDemandes,boite' && r.verbes === 'Donner · Recevoir'), `mutation ② : la garde de l'écran rougit — ${JSON.stringify(r)}`);
  await ctx.close();
}
{
  /* le partage reparti ailleurs : les deux verbes quittent le pied */
  const ech = await readFile(path.join(ROOT, 'ui', 'echanger.js'), 'utf8');
  const sans = ech.replace('<div class="rz-pied">${verbes}</div>', '');
  ok(sans !== ech, 'mutation ③ le partage qui quitte « Réseau » : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-verbes', { mutations: { 'ui/echanger.js': sans }, hash: '#/reseau' });
  const r = await reseauLu(p);
  ok(!(r.verbes === 'Donner · Recevoir' && r.basVerbes >= 75), `mutation ③ : la garde des verbes rougit — ${JSON.stringify(r)}`);
  await ctx.close();
}
{
  /* la portée « Amis » revenue sous la barre de « Mes pistes » */
  const pi = await readFile(path.join(ROOT, 'ui', 'pistes.js'), 'utf8');
  const avec = pi.replace(`d.texte ? \`<span class="pt-n">\${d.texte}</span>\` : ''}</button>`,
    `d.texte ? \`<span class="pt-n">\${d.texte}</span>\` : ''}</button><button class="pt" data-portee="amis">Amis</button>`);
  ok(avec !== pi, 'mutation ④ la portée « Amis » revenue dans Pistes : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-portee', { mutations: { 'ui/pistes.js': avec }, hash: '#/pistes' });
  const portees = await p.evaluate(() => [...document.querySelectorAll('#piPortee [data-portee]')].map(b => b.dataset.portee).join(','));
  ok(portees !== 'pistes,decouvrir', `mutation ④ : la garde des portées rougit — ${portees}`);
  await ctx.close();
}

/* les mutations jettent des erreurs qui ne sont pas les nôtres */
const vraies = errors.filter(e => !e.startsWith('mutation'));
ok(!vraies.length, 'Zéro erreur console' + (vraies.length ? ' — ' + vraies.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E réseau : ${ko} ÉCHEC(S)` : '\nE2E réseau : OK');
process.exit(ko ? 1 : 0);
