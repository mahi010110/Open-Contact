/* ============================================================
   OpenContact — e2e : LES CONVERSATIONS, COMME UNE MESSAGERIE (lot F2)
   (retour du mainteneur, 13 octobre 2026 : « exactement comme les
   messageries traditionnelles — mais attention à la sécurité »)

   Un groupe semé sur trois jours, un relais local qui garde ce qu'on y
   publie, un ami avec qui l'on s'écrit :
   ① LA SÉCURITÉ D'ABORD — un lien se tape et ne part que sur un tap :
     rien ne va chercher la page au moment de lire (aucune requête vers
     les hôtes des liens) ; http et https seulement, `noopener
     noreferrer` ; un domaine en lettres non latines se lit en punycode ;
     une adresse qui cache un nom avant @ reste du texte ;
   ② le jour se dit UNE fois, sur sa ligne (« Hier », « Aujourd'hui »),
     chaque message ne porte que son heure ;
   ③ « @Maheydine » : la bulle qui me nomme porte son liseré, le nom se
     marque ; dans la boîte, un groupe dont j'ai coupé le son le dit
     quand même par l'arobase sur sa ligne — aucun onglet ne compte ;
   ④ « @ka » ouvre « @Karim » au-dessus du champ, un tap l'écrit, et le
     mot part scellé avec l'identifiant de Karim — et rien d'autre de
     neuf : la mention ne nomme que des membres ;
   ⑤ les visages : dans la liste des amis, en tête de sa fiche, devant
     chaque membre, devant qui écrit ;
   ⑥ au poste, « Écrire à Inès » mène à SA conversation dans la boîte ;
   ⑦ zéro erreur console.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet, ouvrirMesAmis } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { cleGroupe, ouvrirMessage, nouveauCode } from '../../engine/groupe.js';
import { nouvelleCle } from '../../engine/boite.js';

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

const M = 60000, H = 60 * M, J = 24 * H;
const now = Date.now();
/* des jours francs quelle que soit l'heure du test : aujourd'hui, entre
   minuit et maintenant ; hier, à midi */
const minuit = new Date(); minuit.setHours(0, 0, 0, 0);
const AUJ = Math.max(minuit.getTime() + 2 * M, now - M), AVANT = Math.max(minuit.getTime() + M, now - 2 * H);
const HIER = minuit.getTime() - 12 * H;
const ID = { moi: 'MoiMoiMoiMoiMoi000001', ines: 'InesInesInesInes0001', karim: 'KarimKarimKarim000001', lea: 'LeaLeaLeaLeaLea000001' };
const CODE = nouveauCode();
const mot = (id, de, prenom, texte, at, cite) => ({ t: 'mot', id, de, prenom, texte, at, ...(cite ? { cite } : {}) });
const GROUPE = { [CODE]: { nom: 'BTS SIO Lille', vu: HIER + 2 * H, depuis: 0, presence: now,
  membres: { [ID.karim]: { prenom: 'Karim', at: HIER - J }, [ID.ines]: { prenom: 'Inès', at: HIER - J }, [ID.lea]: { prenom: 'Léa', at: HIER - J } },
  fil: [
    mot('m0000001', ID.lea, 'Léa', 'Quelqu’un a une piste en réseau ?', HIER),
    mot('m0000002', ID.ines, 'Inès', 'Regarde https://advens.fr/carrieres.', HIER + H),
    mot('m0000003', ID.karim, 'Karim', '@Maheydine ton CV ici : https://аpple.com/x et pas https://banque.fr@pirate.test', AVANT, [ID.moi]),
    mot('m0000004', ID.karim, 'Karim', 'Forum jeudi à 14 h', AUJ)] } };
const bI = await nouvelleCle();
const CONV = { v: 1, fils: { [ID.ines]: { vu: now, m: [
  { id: 'c0000001', moi: false, texte: 'Salut !', at: HIER },
  { id: 'c0000002', moi: true, texte: 'Tu connais www.wallix.com ?', at: AUJ }] } } };
const profil = { name: 'Maheydine Test', email: 'moi@prive.test', formation: 'BTS SIO', amiId: ID.moi,
  amis: [{ id: ID.ines, nom: 'Inès Martin', recu: now - 9 * J, parcours: [], cle: bI.pub }],
  groupes: [{ code: CODE, nom: 'BTS SIO Lille', at: now - 9 * J }] };

async function ecran(nom, vp){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, ignoreHTTPSErrors: true });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|ERR_/.test(m.text())) errors.push(nom + ' : ' + m.text()); });
  /* les hôtes des liens : rien ne doit partir vers eux sans un tap */
  const fuites = [];
  p.on('request', r => { if (/advens\.fr|xn--pple|apple\.com|pirate\.test|wallix\.com/.test(r.url())) fuites.push(r.url()); });
  await p.goto(base + '/#/reseau');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([pr, g, c, url, code]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
    await st.kvSet(st.GROUPES_KEY, JSON.stringify(g));
    await st.kvSet(st.MESSAGES_KEY, JSON.stringify(c));
    await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
    /* le son du groupe est coupé : seule la mention doit percer */
    await st.kvSet(st.FILS_KEY, JSON.stringify({ v: 1, epingles: [], muets: ['g:' + code] }));
  }, [profil, GROUPE, CONV, relay.url, CODE]);
  await p.reload();
  await p.waitForSelector('.bx-liste');
  await p.waitForTimeout(400);
  return { ctx, p, fuites };
}

/* ---------- ③ la boîte : le son coupé, et la mention qui perce ---------- */
{
  const { ctx, p, fuites } = await ecran('pouce', { width: 390, height: 844 });
  const l = await p.evaluate(code => {
    const r = document.querySelector(`.bx-l[data-groupe="${code}"]`);
    const a = document.querySelector('.bottomnav [data-r="reseau"]');
    return { at: !!r.querySelector('.bx-at'), muet: !!r.querySelector('.bx-i .ic'), aria: r.getAttribute('aria-label'),
             onglet: a.textContent.replace(/\D/g, '') };
  }, CODE);
  ok(l.at && l.muet && !l.onglet && /on t’y nomme/.test(l.aria),
    `③ son coupé, mais on m'y nomme : l’arobase sur la ligne, aucun chiffre sur l’onglet (« ${l.aria} »)`);
  await p.screenshot({ path: `${SHOTS}/150-conv-boite-mention.png` });

  /* ---------- ② ① le fil ---------- */
  await p.click(`.bx-l[data-groupe="${CODE}"]`);
  await p.waitForSelector('#grFil .gr-m');
  await p.waitForTimeout(400);
  const f = await p.evaluate(() => {
    const fil = document.querySelector('#grFil');
    return {
      jours: [...fil.querySelectorAll('.fil-jour')].map(x => x.textContent.trim()),
      heures: [...fil.querySelectorAll('.gr-m .gr-qui time')].map(t => t.textContent.trim()),
      pourMoi: [...fil.querySelectorAll('.gr-pour-moi p')].map(x => x.textContent.trim().slice(0, 12)),
      /* le liseré se VOIT : plus épais que le trait d'une autre bulle */
      lisere: (() => { const a = fil.querySelector('.gr-pour-moi p'), b = fil.querySelector('.gr-m:not(.gr-pour-moi):not(.gr-moi) p');
        return a && b ? parseFloat(getComputedStyle(a).borderLeftWidth) > parseFloat(getComputedStyle(b).borderLeftWidth) : false; })(),
      cite: [...fil.querySelectorAll('.gr-cite')].map(x => x.textContent),
      liens: [...fil.querySelectorAll('a.lien-msg')].map(a => ({ href: a.href, txt: a.textContent, rel: a.rel, cible: a.target })),
      faces: fil.querySelectorAll('.gr-m:not(.gr-moi) .gr-qui .vz').length,
      msgs: fil.querySelectorAll('.gr-m:not(.gr-moi)').length
    };
  });
  ok(JSON.stringify(f.jours) === JSON.stringify(['Hier', 'Aujourd’hui']) && f.heures.every(h => /^\d\d:\d\d$/.test(h)),
    `② le jour une fois par jour (${f.jours.join(' · ')}), l’heure seule sur chaque message`);
  ok(f.pourMoi.length === 1 && f.lisere && f.cite.join() === '@Maheydine', '③ le mot qui me nomme porte son liseré, visible, et « @Maheydine » se marque');
  const hrefs = f.liens.map(x => x.href);
  ok(JSON.stringify(hrefs) === JSON.stringify(['https://advens.fr/carrieres', 'https://xn--pple-43d.com/x'])
     && f.liens.every(x => /noopener/.test(x.rel) && /noreferrer/.test(x.rel) && x.cible === '_blank')
     && f.liens[1].txt === 'https://xn--pple-43d.com/x',
    '① deux liens, la ponctuation à la phrase, noopener noreferrer, le domaine usurpé lu en punycode, l’adresse à « @ » caché reste du texte');
  ok(!fuites.length, '① rien n’est allé chercher les pages des liens au moment de lire' + (fuites.length ? ' : ' + fuites.join(', ') : ''));
  ok(f.faces === f.msgs && f.msgs > 0, '⑤ un visage devant qui écrit');
  await p.screenshot({ path: `${SHOTS}/150-conv-fil-pouce.png` });

  /* ---------- ④ « @ka » → « @Karim », et le mot part avec Karim ---------- */
  await p.click('#grMot');
  await p.keyboard.type('Merci @ka');
  await p.waitForSelector('#grPropose:not([hidden]) [data-nommer]');
  const props = await p.evaluate(() => [...document.querySelectorAll('#grPropose [data-nommer]')].map(b => b.textContent));
  ok(JSON.stringify(props) === JSON.stringify(['@Karim']), '④ « @ka » ouvre « @Karim » au-dessus du champ');
  await p.screenshot({ path: `${SHOTS}/150-conv-nommer-pouce.png` });
  await p.click('#grPropose [data-nommer]');
  ok(await p.evaluate(() => document.querySelector('#grMot').value === 'Merci @Karim ' && document.activeElement?.id === 'grMot'
    && document.querySelector('#grPropose').hidden), '④ un tap l’écrit, le champ garde la main, la liste se referme');
  await p.keyboard.type('pour le lien');
  const avant = evs.length;
  await p.click('#grEnvoyer');
  await p.waitForFunction(() => /Merci @Karim pour le lien/.test(document.querySelector('#grFil').textContent));
  for (let i = 0; i < 30 && evs.length === avant; i++) await p.waitForTimeout(200);
  const k = await cleGroupe(CODE);
  let parti = null;
  for (const ev of evs.slice(avant)){ const m = await ouvrirMessage(k, ev.content); if (m && m.t === 'mot') parti = m; }
  ok(parti && JSON.stringify(parti.cite) === JSON.stringify([ID.karim]) && parti.texte === 'Merci @Karim pour le lien'
     && JSON.stringify(Object.keys(parti).sort()) === JSON.stringify(['at', 'cite', 'de', 'id', 'prenom', 't', 'texte']),
    '④ le mot part scellé avec l’identifiant de Karim, et rien d’autre de neuf');

  /* ---------- ⑤ les membres ---------- */
  await p.click('#grMembres');
  await p.waitForSelector('.gr-noms li');
  ok(await p.evaluate(() => [...document.querySelectorAll('.gr-noms li')].every(li => !!li.querySelector('.vz'))), '⑤ un visage devant chaque membre');
  await ctx.close();
}

/* ---------- ② ① la conversation d'un ami ---------- */
{
  const { ctx, p, fuites } = await ecran('pouce-ami', { width: 390, height: 844 });
  await p.click(`.bx-l[data-ami="${ID.ines}"]`);
  await p.waitForSelector('#msFil');
  const c = await p.evaluate(() => ({
    jours: [...document.querySelectorAll('#msFil .fil-jour')].map(x => x.textContent.trim()),
    lien: [...document.querySelectorAll('#msFil a.lien-msg')].map(a => a.href + '|' + a.textContent)
  }));
  ok(JSON.stringify(c.jours) === JSON.stringify(['Hier', 'Aujourd’hui']) && c.lien.join() === 'https://www.wallix.com/|www.wallix.com',
    '② ① entre amis aussi : les jours, et « www. » devient un lien https');
  ok(!fuites.length, '① toujours aucune requête vers un lien');
  await ctx.close();
}

/* ---------- ⑤ ⑥ au poste : les amis, et « Écrire à Inès » mène à la boîte ---------- */
{
  const { ctx, p } = await ecran('poste', { width: 1280, height: 800 });
  await ouvrirMesAmis(p);
  await p.waitForSelector('#piAmis .am-row');
  await p.click(`#piAmis .am-row[data-ami="${ID.ines}"] .ri-main`);
  await p.waitForSelector('.overlay #amEcrire');
  ok(await p.evaluate(() => !!document.querySelector('#piAmis .am-row .vz') && !!document.querySelector('.overlay .am-nom .vz')),
    '⑤ un visage sur la ligne de l’ami, et en tête de sa fiche');
  await p.screenshot({ path: `${SHOTS}/150-conv-amis-poste.png` });
  await p.click('.overlay #amEcrire');
  await p.waitForFunction(id => location.hash.startsWith('#/reseau')
    && document.querySelector('#bxVolet .mh-t')?.textContent === 'Inès Martin'
    && document.querySelector(`.bx-l[data-ami="${id}"]`)?.getAttribute('aria-current') === 'true', ID.ines);
  ok(!(await p.evaluate(() => !!document.querySelector('.overlay:not(.ov-out)'))),
    '⑥ au poste, « Écrire à Inès » mène à SA conversation, posée dans la boîte — pas une seconde fenêtre');
  await p.screenshot({ path: `${SHOTS}/150-conv-ecrire-poste.png` });
  await ctx.close();
}

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
server.close();
relay.close?.();
console.log(ko ? `E2E conversations : ÉCHEC (${ko})` : 'E2E conversations : OK');
process.exit(ko ? 1 : 0);
