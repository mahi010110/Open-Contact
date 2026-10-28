/* ============================================================
   OpenContact — e2e : LA BOÎTE de « Réseau »
   (retour du mainteneur, 13 octobre 2026 : « une boîte de réception, le
   suivi des nouveaux messages dans les groupes, les conversations comme
   Discord — exactement comme les messageries traditionnelles »)

   Ce que ça prouve, sur un appareil semé de deux groupes et de deux
   conversations d'amis, sans réseau :
   ① UNE liste : groupes et amis mêlés, la plus récente en haut ; ce qui
     n'est pas lu en gras avec un point, jamais un chiffre ; aucun
     onglet ne compte (R10, « le calme ») — mais, ailleurs, « Réseau »
     CHANGE DE COULEUR tant que quelque chose y attend : l'accent et un
     point carré, et son nom le dit (28 octobre 2026) ; tout lu ou
     coupé, il revient à son encre ;
   ② un groupe s'ouvre sur la ligne « 3 nouveaux », posée avant le premier
     message arrivé depuis la dernière visite ; refermé, il est lu ;
   ③ avec beaucoup de neuf, le bouton « ↓ N nouveaux » y descend, et
     disparaît une fois en bas ;
   ④ appui long : couper le son (la cloche barrée sur la ligne, le
     point reste), épingler (elle passe en tête) ;
   ⑤ les filtres : une liste fermée — « Non lus » reste, éteint, quand
     tout est lu ; « Groupes » ne montre que les groupes ;
   ⑥ au poste, DEUX VOLETS : la conversation choisie se pose à droite,
     une autre la remplace, ↓ passe à la suivante — et un nouveau rendu
     de la liste ne la rouvre pas (le même élément reste) ; une
     conversation neuve (« Écrire à un ami ») s'ouvre en feuille ;
   ⑦ l'historique vit derrière une ligne, dans sa feuille ;
   ⑧ « Mes amis » ne compte pas les messages ;
   ⑨ zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, relaisMuets, annuaireMuet, SHOTS } from './outils.mjs';
import { nouvelleCle } from '../../engine/boite.js';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const now = Date.now(), M = 60000, H = 60 * M, J = 24 * H;
const ID = { moi: 'MoiMoiMoiMoiMoi000001', ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', lea: 'LeaLeaLeaLeaLea000001', sofia: 'SofiaSofiaSofia000001' };
const G1 = 'abcdefghjkmnpqr', G2 = 'bcdefghjkmnpqrs';
const mot = (id, de, prenom, texte, at) => ({ t: 'mot', id, de, prenom, texte, at });
function etatGroupes(beaucoup){
  const bavard = beaucoup ? Array.from({ length: 30 }, (_, i) =>
    mot('b' + String(i).padStart(7, '0'), ID.karim, 'Karim', 'Message numéro ' + (i + 1), now - 40 * M + i * M)) : [];
  return {
    [G1]: { nom: 'BTS SIO Lille', vu: now - 3 * H,
      membres: { [ID.ines]: { prenom: 'Inès', at: now - 5 * H }, [ID.karim]: { prenom: 'Karim', at: now - 5 * H }, [ID.lea]: { prenom: 'Léa', at: now - 5 * H } },
      fil: [mot('m0000001', ID.lea, 'Léa', 'Quelqu’un a une piste en réseau ?', now - 26 * H),
            mot('m0000002', ID.moi, 'Moi', 'Je t’en donne deux ce soir', now - 25 * H),
            mot('m0000003', ID.ines, 'Inès', 'Forum des entreprises jeudi à 14 h, salle B12', now - 2 * H),
            mot('m0000004', ID.karim, 'Karim', 'J’y serai, quelqu’un a la liste des exposants ?', now - 90 * M),
            mot('m0000005', ID.karim, 'Karim', 'Qui va au forum jeudi ?', now - 20 * M), ...bavard] },
    [G2]: { nom: 'Club Cyber', vu: now, membres: { [ID.sofia]: { prenom: 'Sofia', at: now - 30 * H } },
      fil: [mot('m0000010', ID.sofia, 'Sofia', 'Rendez-vous salle B12 à 13 h pour le CTF', now - 50 * H)] }
  };
}
const conv = { v: 1, fils: {
  [ID.ines]: { vu: now - 5 * H, m: [{ id: 'c0000001', moi: true, texte: 'Salut Inès !', at: now - 6 * H },
    { id: 'c0000002', moi: false, texte: 'Tu as un contact chez Thales ?', at: now - 3 * H },
    { id: 'c0000003', moi: false, texte: 'Pour une alternance en cyber', at: now - 3 * H + M }] },
  [ID.lea]: { vu: now, m: [{ id: 'c0000010', moi: true, texte: 'Merci pour Advens !', at: now - 28 * H }] }
} };
const profil = { name: 'Maheydine Test', email: 'moi@prive.test', formation: 'BTS SIO', amiId: ID.moi,
  amis: [{ id: ID.ines, nom: 'Inès Martin', recu: now - 9 * J, parcours: [] }, { id: ID.karim, nom: 'Karim Benali', recu: now - 9 * J, parcours: [], cle: (await nouvelleCle()).pub },
         { id: ID.lea, nom: 'Léa Dupont', recu: now - 9 * J, parcours: [] }],
  groupes: [{ code: G1, nom: 'BTS SIO Lille', at: now - 9 * J }, { code: G2, nom: 'Club Cyber', at: now - 9 * J }] };
const aujourdhui = new Date(now - new Date().getTimezoneOffset() * M).toISOString().slice(0, 10);
const pistes = [{ id: 'p1', name: 'Advens', city: 'Lille', status: 'todo', nextAction: aujourdhui },
                { id: 'p2', name: 'Thales', city: 'Lille', status: 'todo' }];
const journal = [{ t: now - 2 * J, txt: 'Reçu de Marco : +1 piste(s), 0 complétée(s)', ids: ['p2'] }];

async function ecran(nom, { vp, sombre = false, beaucoup = false } = {}){
  const touch = vp.width < 901;
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, colorScheme: sombre ? 'dark' : 'light' });
  await relaisMuets(ctx); await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/reseau');
  /* semer APRÈS le démarrage : l'app qui démarre range ses conversations
     (un ami absent emporte la sienne) et réécrirait par-dessus la graine */
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([pr, eg, cv, ps, jn]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.GROUPES_KEY, JSON.stringify(eg));
    await st.kvSet(st.MESSAGES_KEY, JSON.stringify(cv));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(jn));
  }, [profil, etatGroupes(beaucoup), conv, pistes, journal]);
  await p.reload();
  await p.waitForSelector('.bx-liste');
  await p.waitForTimeout(300);
  return { ctx, p };
}
const noms = p => p.evaluate(() => [...document.querySelectorAll('.bx-l[data-fil] .bx-n')].map(n => n.textContent.trim()));
/* L'ONGLET QUI ATTEND (28 octobre 2026) : ce qu'il montre, mesuré — sa
   classe, son nom, le point carré après le mot, sa couleur comparée à
   l'accent, et le contraste du mot sur la barre (WCAG 1.4.3 : 4,5:1
   pour un mot de 11 px) */
const signe = (p, r = 'reseau') => p.evaluate(r => {
  const a = document.querySelector(`.bottomnav [data-r="${r}"]`) || document.querySelector(`.topnav [data-r="${r}"]`);
  const l = a.querySelector('.bn-l') || a;
  const pt = getComputedStyle(l, '::after');
  const sonde = document.createElement('span');
  sonde.style.color = 'var(--accent)'; document.body.append(sonde);
  const accent = getComputedStyle(sonde).color; sonde.remove();
  const lum = c => { const [x, y, z] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * x + 0.7152 * y + 0.0722 * z; };
  const fond = getComputedStyle(a.closest('nav')).backgroundColor;
  const [h, b] = [lum(getComputedStyle(l).color), lum(fond)].sort((m, n) => n - m);
  return { attend: a.classList.contains('attend'), aria: a.getAttribute('aria-label') || '', n: a.textContent.replace(/\D/g, ''),
           point: pt.content !== 'none' && parseFloat(pt.width) > 0, couleur: getComputedStyle(l).color, accent,
           contraste: Math.round((h + 0.05) / (b + 0.05) * 100) / 100 };
}, r);
const aller = async (p, route) => {
  await p.evaluate(r => { location.hash = '#/' + r; }, route);
  await p.waitForSelector(`#view-${route}:not([hidden])`);
  await p.waitForTimeout(200);
};
const onglet = (p, r) => p.evaluate(r => {
  const a = document.querySelector(`.bottomnav [data-r="${r}"]`) || document.querySelector(`.topnav [data-r="${r}"]`);
  /* un chiffre où qu'il se pose dans l'onglet, quelle que soit sa classe */
  return { n: (a?.textContent || '').replace(/\D/g, ''), aria: a ? a.getAttribute('aria-label') : '' };
}, r);
const ligne = (p, debut) => p.evaluate(d => {
  const b = document.querySelector(`.bx-l[data-fil^="${d}"]`);
  return b ? { gras: b.classList.contains('bx-nonlu'), point: !!b.querySelector('.bx-pt'),
    chiffre: (b.querySelector('.bx-i')?.textContent || '').replace(/\D/g, ''),
    muet: !!b.querySelector('.bx-i .ic'), apercu: b.querySelector('.bx-p')?.textContent || '' } : null;
}, debut);
const appuiLong = async (p, sel) => {
  const b = await p.$(sel);
  const r = await b.boundingBox();
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  await p.evaluate(([s, x, y]) => {
    const n = document.querySelector(s);
    const t = new Touch({ identifier: 1, target: n, clientX: x, clientY: y });
    n.dispatchEvent(new TouchEvent('touchstart', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
  }, [sel, x, y]);
  await p.waitForTimeout(650);
  await p.evaluate(([s, x, y]) => {
    const n = document.querySelector(s);
    const t = new Touch({ identifier: 1, target: n, clientX: x, clientY: y });
    n.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [t], bubbles: true, cancelable: true }));
  }, [sel, x, y]);
  await p.waitForTimeout(300);
};
const fermer = async p => {
  await p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out)')].pop()?.querySelector('.modal-h .x')?.click());
  await p.waitForTimeout(400);
};

/* ---------- ①-⑤ au pouce ---------- */
{
  const { ctx, p } = await ecran('pouce', { vp: { width: 390, height: 844 } });
  const n = await noms(p);
  ok(JSON.stringify(n) === JSON.stringify(['BTS SIO Lille', 'Inès Martin', 'Léa Dupont', 'Club Cyber']),
    '① une liste — groupes et amis mêlés, la plus récente en haut : ' + n.join(' · '));
  const g = await ligne(p, 'g:' + G1), i = await ligne(p, 'a:' + ID.ines), l = await ligne(p, 'a:' + ID.lea);
  ok(g.gras && g.point && !g.chiffre && i.gras && i.point && !i.chiffre && !l.gras && !l.point,
    '① ce qui n’est pas lu en gras, avec un point et sans chiffre ; le reste se tait');
  ok(g.apercu === 'Karim : Qui va au forum jeudi ?' && l.apercu === 'Toi : Merci pour Advens !', '① le dernier message se lit sans ouvrir');
  const e = await onglet(p, 'reseau'), a = await onglet(p, 'aujourdhui');
  ok(!e.n && e.aria === 'Réseau' && !a.n && !/\d/.test(a.aria), `① aucun onglet ne compte (« ${e.aria} », « ${a.aria} »)`);
  await p.screenshot({ path: `${SHOTS}/140-boite-pouce.png` });
  /* ① bis ailleurs, « Réseau » CHANGE DE COULEUR quand quelque chose y
     attend — l'accent et le point carré, jamais un chiffre — et son nom
     le dit ; là où l'on est, il se tait (la liste le montre) */
  ok(!(await signe(p)).attend, '① bis dans « Réseau », l’onglet allumé ne se double pas d’un signe');
  await aller(p, 'aujourdhui');
  const s1 = await signe(p);
  ok(s1.attend && s1.aria === 'Réseau, du nouveau' && s1.point && !s1.n && s1.couleur === s1.accent && s1.contraste >= 4.5,
    '① bis ailleurs, « Réseau » prend l’accent et le point carré, sans chiffre, et se dit « du nouveau » — ' + JSON.stringify(s1));
  await p.screenshot({ path: `${SHOTS}/140-onglet-attend-pouce.png` });
  await aller(p, 'reseau');
  await p.waitForSelector('.bx-liste');

  /* ② un groupe s'ouvre sur la ligne « 3 nouveaux » */
  await p.click(`[data-fil="g:${G1}"]`);
  await p.waitForSelector('.modal-groupe .fil-nouv');
  const nv = await p.evaluate(() => {
    const ligne = document.querySelector('.fil-nouv');
    const suivant = ligne.nextElementSibling;
    const body = ligne.closest('.modal-b');
    const r = ligne.getBoundingClientRect(), z = body.getBoundingClientRect();
    return { texte: ligne.textContent.trim(), avant: suivant && suivant.textContent.includes('Forum des entreprises'),
             visible: r.top >= z.top && r.bottom <= z.bottom };
  });
  ok(nv.texte === '3 nouveaux' && nv.avant && nv.visible, '② le groupe s’ouvre sur « 3 nouveaux », posée avant le premier message neuf, à l’écran');
  await p.screenshot({ path: `${SHOTS}/140-boite-groupe-pouce.png` });
  await fermer(p);
  const g2 = await ligne(p, 'g:' + G1);
  ok(!g2.gras && !g2.point, '② refermé, le groupe est lu');

  /* ④ appui long : couper le son d'Inès, épingler Club Cyber */
  await appuiLong(p, `[data-fil="a:${ID.ines}"]`);
  ok(await p.evaluate(() => !!document.querySelector('#bxSon')), '④ l’appui long ouvre le menu de la conversation');
  await p.click('#bxSon');
  await p.waitForTimeout(400);
  const i2 = await ligne(p, 'a:' + ID.ines);
  ok(i2.muet && i2.point && i2.gras, '④ son coupé : la cloche barrée sur la ligne, la conversation garde son point');
  await appuiLong(p, `[data-fil="g:${G2}"]`);
  await p.click('#bxEpingler');
  await p.waitForTimeout(400);
  ok((await noms(p))[0] === 'Club Cyber', '④ épinglée, Club Cyber passe en tête');
  await p.screenshot({ path: `${SHOTS}/140-boite-reglee-pouce.png` });
  /* ④ bis le groupe lu, Inès au son coupé : plus rien n'attend — l'onglet
     revient à son encre, et son nom aussi */
  await aller(p, 'aujourdhui');
  const s2 = await signe(p);
  ok(!s2.attend && s2.aria === 'Réseau' && !s2.point, '④ bis tout lu ou coupé : « Réseau » revient à son encre — ' + JSON.stringify(s2));
  await aller(p, 'reseau');
  await p.waitForSelector('.bx-liste');

  /* ⑤ les filtres : une liste fermée */
  const f = await p.evaluate(() => [...document.querySelectorAll('.bx-filtres .dchip')].map(b => ({ mot: b.textContent.trim(), eteint: b.disabled })));
  ok(f.length === 4 && f.find(x => x.mot === 'Non lus') && !f.find(x => x.mot === 'Non lus').eteint, '⑤ quatre filtres — « Non lus » allumé tant qu’il reste du neuf');
  await p.click('.bx-filtres [data-filtre="groupes"]');
  await p.waitForTimeout(200);
  ok(JSON.stringify(await noms(p)) === JSON.stringify(['Club Cyber', 'BTS SIO Lille']), '⑤ « Groupes » ne montre que les groupes');
  await p.click('.bx-filtres [data-filtre="tout"]');
  /* tout lire : « Non lus » reste à sa place, éteint */
  await p.click(`[data-fil="a:${ID.ines}"]`);
  await p.waitForSelector('.modal-conv');
  await fermer(p);
  const f2 = await p.evaluate(() => [...document.querySelectorAll('.bx-filtres .dchip')].map(b => ({ mot: b.textContent.trim(), eteint: b.disabled })));
  ok(f2.length === 4 && f2.find(x => x.mot === 'Non lus').eteint, '⑤ tout lu : « Non lus » reste, éteint — la rangée ne change pas de forme');

  await ctx.close();
}

/* ---------- ③ beaucoup de neuf : « ↓ N nouveaux » ---------- */
{
  const { ctx, p } = await ecran('pouce-bavard', { vp: { width: 360, height: 640 }, beaucoup: true });
  await p.click(`[data-fil="g:${G1}"]`);
  await p.waitForSelector('.modal-groupe .fil-nouv');
  await p.waitForTimeout(300);
  const b = await p.evaluate(() => { const x = document.querySelector('.fil-bas'); return x ? x.textContent.trim() : ''; });
  ok(/^\d+ nouveaux$/.test(b), `③ du neuf sous le bord : le bouton le dit (« ${b} »)`);
  await p.screenshot({ path: `${SHOTS}/140-boite-bas-pouce.png` });
  await p.click('.fil-bas');
  await p.waitForTimeout(900);
  const fin = await p.evaluate(() => { const body = document.querySelector('.modal-groupe .modal-b');
    return { bas: body.scrollHeight - body.scrollTop - body.clientHeight < 40, bouton: !!document.querySelector('.fil-bas') }; });
  ok(fin.bas && !fin.bouton, '③ un tap descend en bas, et le bouton s’en va');
  await ctx.close();
}

/* ---------- ⑥ ⑦ au poste : deux volets ---------- */
for (const sombre of [false, true]){
  const { ctx, p } = await ecran('poste' + (sombre ? '-sombre' : ''), { vp: { width: 1280, height: 800 }, sombre });
  await p.waitForSelector('#bxVolet .dock .modal');
  const d = await p.evaluate(() => ({ titre: document.querySelector('#bxVolet .mh-t')?.textContent,
    sel: document.querySelector('.bx-sel .bx-n')?.textContent, voile: !!document.querySelector('.overlay') }));
  ok(d.titre === 'BTS SIO Lille' && d.sel === 'BTS SIO Lille' && !d.voile, `⑥ ${sombre ? 'sombre' : 'clair'} · la conversation choisie se pose à droite, sans fenêtre par-dessus`);
  /* marquer l'élément : un nouveau rendu de la liste doit garder le MÊME */
  await p.evaluate(() => { document.querySelector('#bxVolet .dock').__marque = 1; });
  await p.evaluate(async () => (await import('./ui/state.js')).bus.refresh());
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#bxVolet .dock')?.__marque === 1), '⑥ la boîte se redessine, la conversation ouverte reste la même (son champ, son fil)');
  /* on écrit à droite, un message arrive ailleurs et la boîte se
     redessine : le champ garde le focus et le texte. Sortie du document
     puis remise, la conversation les perdait sans que l'élément change. */
  await p.click('#bxVolet #grMot');
  await p.keyboard.type('Je viens');
  await p.evaluate(async () => (await import('./ui/state.js')).bus.refresh());
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement?.id === 'grMot' && document.activeElement.value === 'Je viens'),
    '⑥ on écrivait à droite : un nouveau rendu ne vole ni le focus ni le texte');
  await p.fill('#bxVolet #grMot', '');
  /* ailleurs, la conversation de droite se ferme — cachée, elle
     marquerait lu ce qui arrive ; au retour, elle revient à sa place */
  await p.evaluate(() => { location.hash = '#/pistes'; });
  await p.waitForTimeout(300);
  /* « Mes pistes » pose aussi SA fiche à droite (R1-d) : on cherche la
     conversation, pas n'importe quel volet */
  ok(await p.evaluate(() => ![...document.querySelectorAll('.dock .mh-t')].some(t => t.textContent === 'BTS SIO Lille')),
    '⑥ hors de « Réseau », la conversation de droite est fermée');
  await p.evaluate(() => { location.hash = '#/reseau'; });
  await p.waitForFunction(() => document.querySelector('#bxVolet .mh-t')?.textContent === 'BTS SIO Lille');
  ok(true, '⑥ au retour, elle revient à sa place');
  await p.click(`[data-fil="a:${ID.ines}"]`);
  await p.waitForFunction(() => document.querySelector('#bxVolet .mh-t')?.textContent === 'Inès Martin');
  ok(await p.evaluate(() => document.querySelectorAll('#bxVolet .dock').length === 1 && !!document.querySelector('#bxVolet .fil-nouv')),
    '⑥ une autre conversation la remplace, ouverte sur son « 2 nouveaux »');
  await p.focus(`[data-fil="a:${ID.ines}"]`);
  await p.keyboard.press('ArrowDown');
  await p.waitForFunction(() => document.querySelector('#bxVolet .mh-t')?.textContent === 'Léa Dupont');
  ok(await p.evaluate(() => document.activeElement?.dataset?.fil?.startsWith('a:Lea') && document.querySelector('.bx-sel .bx-n')?.textContent === 'Léa Dupont'),
    '⑥ ↓ passe à la conversation suivante, et le focus suit');
  await p.screenshot({ path: `${SHOTS}/140-boite-poste${sombre ? '-sombre' : ''}.png` });
  /* « Écrire à un ami » vers un ami sans conversation : elle s'ouvre en
     feuille — sans ligne dans la liste, le volet la perdrait au rendu
     suivant */
  await p.click('#bxEcrire');
  await p.waitForSelector(`.overlay [data-ami="${ID.karim}"]`);
  await p.click(`.overlay [data-ami="${ID.karim}"]`);
  await p.waitForFunction(() => [...document.querySelectorAll('.overlay:not(.ov-out) .mh-t')].pop()?.textContent === 'Karim Benali');
  ok(await p.evaluate(() => document.querySelector('#bxVolet .mh-t')?.textContent === 'Léa Dupont'),
    '⑥ « Écrire à un ami » sans conversation : une feuille, le volet garde la sienne');
  await fermer(p);
  /* ⑦ l'historique */
  await p.click('#ecHisto');
  await p.waitForSelector('.modal .ec-l');
  const h = await p.evaluate(() => ({ titre: [...document.querySelectorAll('.overlay .mh-t')].pop()?.textContent, lignes: document.querySelectorAll('.overlay .ec-l').length }));
  ok(h.titre === 'Historique' && h.lignes === 1, '⑦ l’historique vit derrière une ligne, dans sa feuille');
  await p.click('.overlay .ec-row[data-fil]');
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => [...document.querySelectorAll('.overlay .mh-t')].pop()?.textContent === 'Ce que tu as reçu'), '⑦ une ligne mène encore à ses pistes');
  await ctx.close();
}

/* ---------- ⑧ « Mes amis » ne compte pas les messages ---------- */
{
  const { ctx, p } = await ecran('amis', { vp: { width: 390, height: 844 } });
  await p.click('#bxAmis');
  await p.waitForSelector('#piAmis .am-row');
  ok(await p.evaluate(() => document.querySelectorAll('.am-row').length >= 3 && !document.querySelector('.am-row .am-n')),
    '⑧ « Mes amis » : plus de chiffre sur les lignes');
  await ctx.close();
}

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `E2E boîte : ÉCHEC (${ko})` : 'E2E boîte : OK');
process.exit(ko ? 1 : 0);
