/* ============================================================
   OpenContact — e2e : MA SEMAINE (lot R4)
   (docs/propositions/R4-ma-semaine.md, validée le 20 octobre 2026)

   Ouvert à tous depuis la 7.0.0, sur l'app réelle,
   l'horloge posée sur un jour connu (un mercredi, puis un vendredi).
   ① LA FUITE D'ABORD : la revue part dans le groupe par le vrai bouton,
     sur un relais local qui garde ; ouverte avec le code, elle ne porte
     QUE la phrase de nombres — ni une piste, ni un contact, ni une
     note — et le message n'a que ses champs de mot ; le profil donné à
     un ami et un partage de pistes ne portent pas la semaine ;
   ② en semaine : « Cette semaine · 2 sur 3 mails », compté des gestes
     datés ; la ligne s'ouvre sur « Ma semaine », « + » règle l'objectif,
     il se garde (rechargement) et la ligne suit ;
   ③ le vendredi : « Ma semaine · 2 mails · 1 réponse · 2 pistes », la
     phrase dans la feuille, « Partager au groupe » au pied — et sans
     groupe, pas de pied ;
   ④ pas de ligne pendant les premiers pas, ni avec l'exemple ;
   pouce clair et sombre, poste ; zéro erreur console.
   Trois mutations : un nom de piste glissé dans la revue, le compte qui
   ne lit plus les mails, l'objectif qui ne se garde pas.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, nouveauCode } from '../../engine/groupe.js';
import { RE_PHRASE_REVUE } from '../../engine/semaine.js';
import { readFile } from 'fs/promises';
import path from 'path';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => {
  const x = (ev.tags || []).find(t => t[0] === 'x');
  if (x && /^oc-groupe-/.test(x[1])) evs.push(ev);
  return null;
} });
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

/* LES JOURS : le vendredi le plus récent à 10 h (jamais plus de sept
   jours en arrière — un message de groupe vit sept jours sur le relais),
   et le mercredi d'avant. Les dates semées en découlent. */
const maintenant = new Date();
const vendredi = new Date(maintenant); vendredi.setHours(10, 0, 0, 0);
while (vendredi.getDay() !== 5 || vendredi > maintenant) vendredi.setDate(vendredi.getDate() - 1);
const mercredi = new Date(vendredi); mercredi.setDate(vendredi.getDate() - 2);
const jour = (base, n) => { const x = new Date(base); x.setDate(x.getDate() + n);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const lundi = jour(vendredi, -4);
const t = n => { const x = new Date(vendredi); x.setDate(x.getDate() + n); return x.getTime(); };

const CODE = nouveauCode();
const PISTES = [
  { id: 'adv', name: 'Advens', city: 'Lille', status: 'active', appliedAt: lundi, createdAt: t(-10), notes: 'NOTE-PRIVEE-ADVENS',
    contacts: [{ id: 'c1', name: 'Claire Dubois', email: 'claire@advens.test' }],
    history: [{ d: jour(vendredi, -3), t: 'Email envoyé — Claire Dubois' }] },
  { id: 'ora', name: 'Orange Cyberdefense', city: 'Lille', status: 'reply', appliedAt: jour(vendredi, -20), createdAt: t(-30),
    history: [{ d: jour(vendredi, -2), t: 'Statut → Réponse' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'active', createdAt: t(-2),
    history: [{ d: jour(vendredi, -2), t: 'Statut → En cours' }] },
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: t(-1) },
  /* hors de la semaine : ne compte pas */
  { id: 'cap', name: 'Capgemini', city: 'Lille', status: 'active', createdAt: t(-40), history: [{ d: jour(vendredi, -6), t: 'Email envoyé' }] }
];
const NOMS = ['Advens', 'Orange', 'Worldline', 'Kiabi', 'Capgemini', 'Claire', 'Dubois', 'NOTE-PRIVEE'];
const PROFIL = { name: 'Inès Martin', email: 'ines@prive.test', formation: 'BTS SIO', recherche: 'alternance', amiId: 'InesInesInesInes0001',
  groupes: [{ code: CODE, nom: 'BTS SIO Lille', at: t(-20) }] };

async function ecran(nom, { quand = mercredi, vp = { width: 390, height: 844 }, sombre = false, 
                            pistes = PISTES, profil = PROFIL, mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, ignoreHTTPSErrors: true, colorScheme: sombre ? 'dark' : 'light' });
  await ctx.clock.setFixedTime(quand);
  await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([ps, pr, url]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
  }, [pistes, profil, relay.url]);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(400);
  return { ctx, p };
}
const ligne = p => p.evaluate(() => document.querySelector('#tdSemaine')?.textContent.replace(/\s+/g, ' ').trim() || null);
const feuille = p => p.evaluate(() => {
  const o = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
  return o ? { titre: o.querySelector('.mh-t')?.textContent.trim(), obj: o.querySelector('#smObj')?.textContent.trim(),
               phrase: o.querySelector('#smPhrase')?.textContent.trim() || '',
               pied: [...o.querySelectorAll('.modal-f button')].map(b => b.textContent.trim()).join('|') } : null;
});
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(250);
};

/* ---------- ① la fuite d'abord ---------- */
async function fuite(nom, mutations = {}){
  evs.length = 0;
  const { ctx, p } = await ecran(nom, { quand: vendredi, mutations });
  await p.click('#tdSemaine');
  await p.waitForTimeout(300);
  await p.click('.overlay:not(.ov-out) .modal-f button:has-text("Partager au groupe")');
  for (let i = 0; i < 30 && !evs.length; i++) await p.waitForTimeout(200);
  const k = await cleGroupe(CODE);
  const msgs = [];
  for (const ev of evs){ const m = await ouvrirMessage(k, ev.content).catch(() => null); if (m && m.t === 'mot') msgs.push(m); }
  const autres = await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    const { profilDonne } = await import('./engine/amis.js');
    const { sharePayload } = await import('./engine/exchange.js');
    return { ami: JSON.stringify(profilDonne(S.profile, S.companies)), partage: JSON.stringify(sharePayload(S.companies, null, S.profile.name)),
             garde: JSON.stringify(S.profile.semaine || null) };
  });
  await ctx.close();
  return { msgs, autres };
}
{
  const r = await fuite('fuite');
  const m = r.msgs[0] || {};
  const tout = JSON.stringify(r.msgs);
  const cles = Object.keys(m).sort().join(',');
  ok(r.msgs.length === 1 && RE_PHRASE_REVUE.test(m.texte) && !NOMS.some(n => tout.includes(n))
    && /^(at,de,id,prenom,t,texte)(,j)?$/.test(cles),
    `① la revue part dans le groupe : la seule phrase de nombres, aucun nom de piste, de contact ni de note — ${JSON.stringify(m.texte)} [${cles}]`);
  ok(!r.autres.ami.includes('semaine') && !r.autres.partage.includes('semaine') && !r.autres.partage.includes('objectif'),
    '① la semaine ne sort ni dans le profil donné à un ami, ni dans un partage de pistes');
}

/* ---------- ② en semaine ---------- */
for (const [nom, vp, sombre] of [['pouce', { width: 390, height: 844 }, false], ['pouce-sombre', { width: 390, height: 844 }, true],
                                 ['poste', { width: 1280, height: 800 }, false]]){
  const { ctx, p } = await ecran(nom, { vp, sombre });
  const l = await ligne(p);
  ok(l === 'Cette semaine 2 sur 3 mails', `② ${nom} : en semaine, la ligne compte les mails partis depuis lundi — « ${l} »`);
  await p.screenshot({ path: `${SHOTS}/165-semaine-${nom}.png` });
  if (nom === 'pouce'){
    await p.click('#tdSemaine'); await p.waitForTimeout(300);
    const f0 = await feuille(p);
    await p.click('#smPlus'); await p.click('#smPlus'); await p.waitForTimeout(250);
    const f1 = await feuille(p);
    await p.screenshot({ path: `${SHOTS}/165-semaine-feuille.png` });
    await fermer(p);
    const l1 = await ligne(p);
    await p.reload(); await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent); await p.waitForTimeout(300);
    const l2 = await ligne(p);
    ok(f0.titre === 'Ma semaine' && f0.obj === '3 mails' && f1.obj === '5 mails' && !f0.pied && l1 === 'Cette semaine 2 sur 5 mails' && l2 === l1,
      `② la ligne ouvre « Ma semaine », « + » règle l'objectif, il se garde et la ligne suit — ${JSON.stringify({ f0, f1, l1, l2 })}`);
  }
  await ctx.close();
}

/* ---------- ③ le vendredi ---------- */
{
  const { ctx, p } = await ecran('vendredi', { quand: vendredi });
  const l = await ligne(p);
  await p.click('#tdSemaine'); await p.waitForTimeout(300);
  const f = await feuille(p);
  await p.screenshot({ path: `${SHOTS}/165-semaine-revue.png` });
  ok(l === 'Ma semaine 2 mails · 1 réponse · 2 pistes' && f.phrase === 'Ma semaine : 2 mails, 1 réponse, 2 pistes.' && f.pied === 'Partager au groupe',
    `③ le vendredi, la revue : trois nombres, la phrase, « Partager au groupe » — ${JSON.stringify({ l, f })}`);
  await ctx.close();
}
{
  const { ctx, p } = await ecran('vendredi-sans-groupe', { quand: vendredi, profil: { ...PROFIL, groupes: [] } });
  await p.click('#tdSemaine'); await p.waitForTimeout(300);
  const f = await feuille(p);
  ok(!!f.phrase && !f.pied, `③ sans groupe, la revue se lit, et rien ne se partage — ${JSON.stringify(f)}`);
  await ctx.close();
}

/* ---------- ④ quand la ligne n'existe pas ---------- */
{
  const froides = PISTES.map(c => ({ id: c.id, name: c.name, status: 'todo', createdAt: c.createdAt }));
  const { ctx, p } = await ecran('premiers-pas', { pistes: froides, profil: { name: 'Inès' } });
  ok(await ligne(p) === null, '④ pendant les premiers pas : pas de ligne');
  await ctx.close();
}
{
  const { ctx, p } = await ecran('exemple', { pistes: [...PISTES, { id: 'd1', name: 'Exemple SA', status: 'active', demo: true }] });
  ok(await ligne(p) === null, '④ avec les pistes d’exemple : pas de ligne');
  await ctx.close();
}

/* ---------- les mutations : le scénario sait encore échouer ---------- */
const lire = f => readFile(path.join(ROOT, f), 'utf8');
{
  const ui = await lire('ui/semaine.js');
  const m = ui.replace("() => partager(sh, groupes, phraseRevue(s))", "() => partager(sh, groupes, phraseRevue(s) + ' ' + S.companies.map(c => c.name).join(', '))");
  ok(m !== ui, 'mutation ① un nom de piste glissé dans la revue : le fichier servi est bien modifié');
  const r = await fuite('mutation-fuite', { 'ui/semaine.js': m });
  const tout = JSON.stringify(r.msgs);
  ok(r.msgs.length === 1 && NOMS.some(n => tout.includes(n)), `mutation ① : la garde de la fuite rougit — ${r.msgs.length} message(s)`);
}
{
  const eng = await lire('engine/semaine.js');
  const m = eng.replace('const RE_ENVOI = /^Email envoyé/;', 'const RE_ENVOI = /^Email préparé/;');
  ok(m !== eng, 'mutation ② le compte qui ne lit plus les mails : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-compte', { mutations: { 'engine/semaine.js': m } });
  ok(await ligne(p) !== 'Cette semaine 2 sur 3 mails', `mutation ② : la garde du compte rougit — « ${await ligne(p)} »`);
  await ctx.close();
}
{
  const ui = await lire('ui/semaine.js');
  const m = ui.replace('      saveProfile();\n      rendre();', '      rendre();');
  ok(m !== ui, 'mutation ③ l’objectif qui ne se garde pas : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-garde', { mutations: { 'ui/semaine.js': m } });
  await p.click('#tdSemaine'); await p.waitForTimeout(300);
  await p.click('#smPlus'); await p.click('#smPlus'); await p.waitForTimeout(250);
  await fermer(p);
  await p.reload(); await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent); await p.waitForTimeout(300);
  ok(await ligne(p) !== 'Cette semaine 2 sur 5 mails', `mutation ③ : la garde de l'objectif gardé rougit — « ${await ligne(p)} »`);
  await ctx.close();
}

const vraies = errors.filter(e => !e.startsWith('mutation'));
ok(!vraies.length, 'Zéro erreur console' + (vraies.length ? ' — ' + vraies.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
await relay.close();
console.log(ko ? `\nE2E ma semaine : ${ko} ÉCHEC(S)` : '\nE2E ma semaine : OK');
process.exit(ko ? 1 : 0);
