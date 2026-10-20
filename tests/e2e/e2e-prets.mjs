/* ============================================================
   OpenContact — e2e : PRÊTS À PARTIR (lot R3-a)
   (docs/propositions/R3-prets-a-partir.md, validée le 20 octobre 2026)

   Derrière le drapeau `prets`, préversion allumée, sur l'app réelle.
   Le contrôle N°1 n'est pas la fonctionnalité, c'est l'INVARIANT ① :
   un brouillon est du privé de CET appareil. On l'écrit par le vrai
   composeur, puis on lit les octets qui sortent par les vraies portes.
   ① la fuite : le brouillon est gardé (la clé le porte), et il n'est ni
     dans les pistes, ni dans le profil, ni dans le journal, ni dans la
     copie téléchargée, ni dans un partage, ni dans ce que la
     synchronisation envoie ;
   ② « Écrire les 3 mails » : au pouce dans le pied, au-dessus de la
     barre (la zone du pouce) ; au poste, à côté du titre ;
   ③ la série : les relances dues, puis le premier mail — pas
     l'entretien, qui n'est pas un mail —, « 1/3 », « Passer » avance ;
   ④ le brouillon revient à la réouverture ; « Envoyée ✓ » l'emporte ;
     une piste qui a changé de statut le propose sans l'imposer ;
   ⑤ moins de deux mails prêts, les premiers pas, la préversion
     éteinte : pas de bouton — et éteinte, rien ne se garde ;
   ⑥ au poste (R3-b), une fenêtre en trois colonnes : la file (où l'on
     est, ce qui est parti ou passé ; un clic, ↓ y mènent), le mail
     posé dans sa colonne, et ce qui aide à l'écrire — absent quand il
     n'y a rien ;
   pouce clair et sombre, petit téléphone, poste ; zéro erreur console.
   Cinq mutations : le brouillon qui fuit dans les notes, le brouillon
   qui ne revient pas, l'entretien pris pour un mail, le bouton monté en
   tête au pouce, le mail qui ne se pose pas dans sa colonne.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const J = 864e5, now = Date.now();
const iso = d => new Date(now + d * J).toISOString().slice(0, 10);
const PISTES = [
  { id: 'adv', name: 'Advens', city: 'Lille', status: 'active', appliedAt: iso(-9), nextAction: iso(-2), nextActionText: 'Relancer Claire', nextActionCt: 'c1',
    desc: 'Cybersécurité, SOC à Lille.', notes: 'Claire a dit de relancer après le salon.',
    contacts: [{ id: 'c1', name: 'Claire Dubois', email: 'claire@advens.test' }], history: [{ d: iso(-9), t: 'Email envoyé' }] },
  { id: 'ora', name: 'Orange Cyberdefense', city: 'Lille', status: 'active', appliedAt: iso(-8), nextAction: iso(0), nextActionText: 'Relancer',
    contacts: [{ id: 'c2', name: 'Nadia Rahmani', email: 'nadia@orange.test' }] },
  { id: 'azt', name: 'Aztek', city: 'Lille', status: 'active', nextAction: iso(0), nextActionText: 'Entretien à 14 h',
    contacts: [{ id: 'c3', name: 'Marc Lefèvre', email: 'marc@aztek.test' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', contacts: [{ id: 'c4', name: 'Service RH', email: 'rh@worldline.test' }] },
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo' }
];
const PROFIL = { name: 'Inès Martin', email: 'ines@prive.test', formation: 'BTS SIO', recherche: 'alternance' };
const SECRET = 'BROUILLON-SECRET-7731';

async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false, preversion = true,
                            pistes = PISTES, profil = PROFIL, mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light', acceptDownloads: true });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/aujourdhui');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  /* semer APRÈS le démarrage, puis recharger : l'app lit son état à
     l'ouverture (§5) */
  await p.evaluate(async ([ps, pr, pv]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvDel(st.BROUILLONS_KEY);
    if (pv) await st.kvSet(st.PREVERSION_KEY, '1'); else await st.kvDel(st.PREVERSION_KEY);
  }, [pistes, profil, preversion]);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(350);
  return { ctx, p };
}
const bouton = p => p.evaluate(() => {
  const b = document.querySelector('#tdPartir');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  const nav = document.querySelector('.bottomnav, .bnav, nav.bottom, #bottomNav');
  return { texte: b.textContent.trim(), pied: !!b.closest('.td-pret'), tete: !!b.closest('.td-head'),
           haut: r.top / innerHeight, bas: r.bottom, nav: nav ? nav.getBoundingClientRect().top : innerHeight };
});
const pour = p => p.evaluate(() => {
  const m = document.querySelector('#mPour');
  return m ? [m.querySelector('b')?.textContent, m.querySelector('.ml-n')?.textContent].filter(Boolean).join(' ') : '';
});
const fermer = async p => {
  await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js'); let s, n = 0;
    while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(300);
};
const cle = p => p.evaluate(async () => { const st = await import('./engine/storage.js'); return await st.kvGet(st.BROUILLONS_KEY) || ''; });
/* écrire dans le vrai composeur : un message entier, sans le crochet du
   modèle — tant qu'un crochet reste, l'app refuse d'ouvrir Mail, et
   c'est voulu (CLAUDE.md §7). `fill` passe par l'événement de saisie. */
const ecrire = async (p, texte) => {
  await p.fill('#mBody', 'Bonjour,\n\n' + texte + '\n\nInès Martin');
  await p.waitForTimeout(700);
};

/* ---------- ① la fuite d'abord ---------- */
async function fuite(nom, mutations = {}){
  const { ctx, p } = await ecran(nom, { vp: { width: 1280, height: 800 }, mutations });
  await p.click('#tdPartir');
  await p.waitForTimeout(500);
  await ecrire(p, SECRET);
  await fermer(p);
  const garde = (await cle(p)).includes(SECRET);
  const dedans = await p.evaluate(async secret => {
    const { S } = await import('./ui/state.js');
    const { sharePayload, fullPayload } = await import('./engine/exchange.js');
    const st = await import('./engine/storage.js');
    /* ce que la synchronisation envoie : la copie complète, plus le rail privé */
    const prive = { campaigns: await st.kvGet(st.CAMPAIGNS_KEY), missions: await st.kvGet(st.MISSIONS_KEY) };
    const sync = JSON.stringify(Object.assign(fullPayload(S.companies, S.profile, S.orphans, S.tombs), prive));
    return {
      pistes: JSON.stringify(S.companies).includes(secret),
      profil: JSON.stringify(S.profile).includes(secret),
      journal: JSON.stringify(S.journal).includes(secret),
      partage: JSON.stringify(sharePayload(S.companies, null, S.profile.name)).includes(secret),
      sync: sync.includes(secret)
    };
  }, SECRET);
  /* la copie, par le VRAI chemin de « Télécharger » */
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 8000 }),
    p.evaluate(async () => (await import('./ui/moi.js')).downloadBackup(''))
  ]);
  const copie = await readFile(await dl.path(), 'utf8');
  dedans.copie = copie.includes(SECRET);
  dedans.copieLue = copie.length > 100 && copie.includes('Advens');   /* la copie n'est pas vide : on a lu quelque chose */
  await ctx.close();
  return { garde, dedans };
}
{
  const r = await fuite('fuite');
  const fuites = Object.entries(r.dedans).filter(([k, v]) => k !== 'copieLue' && v).map(([k]) => k);
  ok(r.garde && r.dedans.copieLue && !fuites.length,
    `① le brouillon est gardé sur cet appareil, et ne sort ni dans les pistes, le profil, le journal, la copie, un partage, ni la synchronisation — ${JSON.stringify(r)}`);
}

/* ---------- ② ③ ④ le bouton, la série, le brouillon ---------- */
for (const [nom, vp, sombre] of [['pouce', { width: 390, height: 844 }, false], ['pouce-sombre', { width: 390, height: 844 }, true],
                                 ['petit', { width: 320, height: 640 }, false], ['poste', { width: 1280, height: 800 }, false]]){
  const { ctx, p } = await ecran(nom, { vp, sombre });
  const b = await bouton(p);
  const poste = vp.width >= 901;
  ok(!!b && b.texte === 'Écrire les 3 mails' && (poste ? b.tete : (b.pied && b.haut > 0.6 && b.bas <= b.nav)),
    `② ${nom} : « Écrire les 3 mails », ${poste ? 'à côté du titre' : 'au pied, au-dessus de la barre'} — ${JSON.stringify(b)}`);
  await p.screenshot({ path: `${SHOTS}/164-prets-${nom}.png` });
  if (nom === 'pouce' || nom === 'poste'){
    await p.click('#tdPartir');
    await p.waitForTimeout(500);
    const serie = [await pour(p)];
    await p.screenshot({ path: `${SHOTS}/164-prets-serie-${nom}.png` });
    for (let i = 0; i < 2; i++){
      await p.click('.overlay:not(.ov-out) .modal-f button:has-text("Passer")');
      await p.waitForTimeout(450);
      serie.push(await pour(p));
    }
    ok(serie.join(' | ') === 'Advens 1/3 | Orange Cyberdefense 2/3 | Worldline 3/3',
      `③ ${nom} : les relances dues, puis le premier mail, sans l'entretien — ${serie.join(' | ')}`);
    await fermer(p);
  }
  await ctx.close();
}
{
  const { ctx, p } = await ecran('brouillon');
  await p.click('#tdPartir');
  await p.waitForTimeout(500);
  await ecrire(p, 'Je reste très motivée.');
  await fermer(p);
  await p.click('#tdPartir');
  await p.waitForTimeout(500);
  const repris = await p.evaluate(() => document.querySelector('#mBody').value);
  ok(repris.includes('Je reste très motivée.'), `④ le brouillon revient à la réouverture — « ${repris.replace(/\n/g, ' ').slice(0, 50)} »`);
  /* « Envoyée ✓ » l'emporte : on fait partir (Mail), on revient, on confirme */
  await p.evaluate(() => { const a = [...document.querySelectorAll('.overlay:not(.ov-out) .modal-f a')].find(x => /Mail/.test(x.textContent));
    a.addEventListener('click', e => e.preventDefault(), { once: true, capture: true }); a.click(); });
  await p.waitForTimeout(300);
  await p.click('.overlay:not(.ov-out) .modal-f button:has-text("Envoyée")');
  await p.waitForTimeout(600);
  ok(!(await cle(p)).includes('motivée'), '④ « Envoyée ✓ » emporte le brouillon');
  await fermer(p);
  await ctx.close();
}
{
  /* une piste qui a changé de statut depuis : le brouillon se propose */
  const { ctx, p } = await ecran('perime');
  await p.click('#tdPartir');
  await p.waitForTimeout(500);
  await ecrire(p, 'Texte d’avant la réponse.');
  await fermer(p);
  await p.evaluate(async () => { const { S, saveData, bus } = await import('./ui/state.js');
    S.companies.find(c => c.id === 'adv').status = 'reply'; saveData(); bus.refresh(); });
  await p.waitForTimeout(300);
  await p.click('#tdPartir');
  await p.waitForTimeout(500);
  const avant = await p.evaluate(() => ({ corps: document.querySelector('#mBody').value, lien: !document.querySelector('#mBrouillon').hidden }));
  await p.click('#mBrouillon');
  await p.waitForTimeout(200);
  const apres = await p.evaluate(() => document.querySelector('#mBody').value);
  ok(!avant.corps.includes('avant la réponse') && avant.lien && apres.includes('avant la réponse'),
    `④ statut changé : le modèle d'aujourd'hui, et « Reprendre mon brouillon » le rend — ${JSON.stringify({ ...avant, corps: avant.corps.slice(0, 30), apres: apres.slice(-26) })}`);
  await p.screenshot({ path: `${SHOTS}/164-prets-perime.png` });
  await fermer(p);
  await ctx.close();
}

/* ---------- ⑥ au poste, la file, le mail et ce qui aide ---------- */
const fenetre = p => p.evaluate(() => {
  const w = document.querySelector('.modal-serie');
  if (!w) return null;
  return {
    file: [...w.querySelectorAll('.se-l')].map(b => b.querySelector('.se-n').textContent + ':' + b.querySelector('.se-e').textContent.trim()
      + (b.getAttribute('aria-current') ? '*' : '')).join(' | '),
    pose: !!w.querySelector('.se-mail #mPour'),
    mail: w.querySelector('.se-mail #mPour b')?.textContent || '',
    aide: [...w.querySelectorAll('.se-aide .ml-know-h, .se-aide .se-h')].map(h => h.textContent.trim()).join(','),
    aideVue: !!w.querySelector('.se-aide') && getComputedStyle(w.querySelector('.se-aide')).display !== 'none'
  };
});
async function poste(nom, mutations = {}){
  const { ctx, p } = await ecran(nom, { vp: { width: 1280, height: 800 }, mutations });
  await p.click('#tdPartir');
  await p.waitForTimeout(500);
  const r = { debut: await fenetre(p) };
  await p.screenshot({ path: `${SHOTS}/164-prets-poste-fenetre.png` });
  await p.click('.modal-serie .se-mail .modal-f button:has-text("Passer")').catch(() => {});
  await p.waitForTimeout(450);
  r.passe = await fenetre(p);
  await p.click('.modal-serie .se-l[data-k="2"]').catch(() => {});
  await p.waitForTimeout(400);
  r.clic = await fenetre(p);
  await p.focus('.modal-serie .se-l[data-k="2"]').catch(() => {});
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(400);
  r.fleche = await fenetre(p);
  await ctx.close();
  return r;
}
const posteOk = r => !!r.debut && r.debut.file === 'Advens:à écrire* | Orange Cyberdefense:à écrire | Worldline:à écrire'
  && r.debut.pose && r.debut.mail === 'Advens' && r.debut.aide === 'À savoir,Mes notes,Historique'
  && r.passe.file === 'Advens:passé | Orange Cyberdefense:à écrire* | Worldline:à écrire' && r.passe.mail === 'Orange Cyberdefense' && !r.passe.aideVue
  && r.clic.mail === 'Worldline' && r.fleche.mail === 'Orange Cyberdefense';
{
  const r = await poste('poste-fenetre');
  ok(posteOk(r), `⑥ au poste : la file, le mail posé dans sa colonne, ce qui aide (absent quand rien) ; « Passer », un clic, ↑ — ${JSON.stringify(r)}`);
}

/* ---------- ⑤ quand il n'y a pas de bouton ---------- */
{
  const { ctx, p } = await ecran('un-seul', { pistes: PISTES.filter(c => c.id === 'adv' || c.id === 'kia') });
  ok(await bouton(p) === null, '⑤ un seul mail prêt : pas de série, la ligne porte son « Écrire »');
  await ctx.close();
}
{
  const froides = PISTES.map(c => ({ id: c.id, name: c.name, city: c.city, status: 'todo', contacts: c.contacts }));
  const { ctx, p } = await ecran('premiers-pas', { pistes: froides, profil: { name: 'Inès' } });
  ok(await bouton(p) === null && await p.evaluate(() => !!document.querySelector('#tdPas')),
    '⑤ les premiers pas sont là : pas de série');
  await ctx.close();
}
{
  const { ctx, p } = await ecran('eteinte', { preversion: false });
  ok(await bouton(p) === null, '⑤ éteinte : pas de bouton');
  await p.click('.act-row[data-id="adv"] [data-a="mail"]');
  await p.waitForTimeout(500);
  await ecrire(p, 'rien ne se garde');
  await fermer(p);
  ok(!(await cle(p)), '⑤ éteinte : rien ne se garde');
  await ctx.close();
}

/* ---------- les mutations : le scénario sait encore échouer ---------- */
const lire = f => readFile(path.join(ROOT, f), 'utf8');
{
  const mail = await lire('ui/mail.js');
  const m = mail.replace("else garderBrouillon(c, { objet, corps, ctId: (currentCt() || {}).id, statut: c.status });",
    "else { c.notes = corps; saveData(); garderBrouillon(c, { objet, corps, ctId: (currentCt() || {}).id, statut: c.status }); }");
  ok(m !== mail, 'mutation ① le brouillon qui fuit dans les notes : le fichier servi est bien modifié');
  const r = await fuite('mutation-fuite', { 'ui/mail.js': m });
  ok(r.dedans.pistes && r.dedans.copie, `mutation ① : la garde de la fuite rougit — ${JSON.stringify(r.dedans)}`);
}
{
  const mail = await lire('ui/mail.js');
  const m = mail.replace('if (!br.perime) poser();', 'if (false) poser();');
  ok(m !== mail, 'mutation ② le brouillon qui ne revient pas : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-retour', { mutations: { 'ui/mail.js': m } });
  await p.click('#tdPartir'); await p.waitForTimeout(500);
  await ecrire(p, 'Je reste très motivée.');
  await fermer(p);
  await p.click('#tdPartir'); await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.querySelector('#mBody').value)).includes('motivée.'), 'mutation ② : la garde du retour rougit');
  await ctx.close();
}
{
  const prets = await lire('engine/prets.js');
  const m = prets.replace('if (!v) return true;', 'return true;');
  ok(m !== prets, 'mutation ③ l’entretien pris pour un mail : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-entretien', { mutations: { 'engine/prets.js': m } });
  const b = await bouton(p);
  ok(!b || b.texte !== 'Écrire les 3 mails', `mutation ③ : la garde de la série rougit — ${b && b.texte}`);
  await ctx.close();
}
{
  const today = await lire('ui/today.js');
  const m = today.replace("${partir && wide ? partirHTML(prets.length) : ''}", "${partir ? partirHTML(prets.length) : ''}")
                 .replace("if (partir && !wide) html +=", "if (false) html +=");
  ok(m !== today, 'mutation ④ le bouton monté en tête au pouce : le fichier servi est bien modifié');
  const { ctx, p } = await ecran('mutation-tete', { mutations: { 'ui/today.js': m } });
  const b = await bouton(p);
  ok(!!b && !(b.pied && b.haut > 0.6), `mutation ④ : la garde de la zone du pouce rougit — ${JSON.stringify(b)}`);
  await ctx.close();
}

{
  const serie = await lire('ui/serie.js');
  const m = serie.replace('dans: zone, sansSavoir: true,', 'dans: null, sansSavoir: true,');
  ok(m !== serie, 'mutation ⑤ le mail qui ne se pose pas dans sa colonne : le fichier servi est bien modifié');
  const r = await poste('mutation-colonne', { 'ui/serie.js': m });
  ok(!posteOk(r), `mutation ⑤ : la garde de la fenêtre rougit — ${JSON.stringify(r.debut)}`);
}

/* les mutations jettent des erreurs qui ne sont pas les nôtres */
const vraies = errors.filter(e => !e.startsWith('mutation'));
ok(!vraies.length, 'Zéro erreur console' + (vraies.length ? ' — ' + vraies.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E prêts à partir : ${ko} ÉCHEC(S)` : '\nE2E prêts à partir : OK');
process.exit(ko ? 1 : 0);
