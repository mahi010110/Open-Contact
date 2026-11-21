/* ============================================================
   OpenContact · la nouvelle interface · un regard sous WebKit
   (le moteur de l'iPhone ; CLAUDE.md §9, docs/refonte-reprendre.md §8)

   Usage : OC_NAVIGATEUR=webkit node tests/refonte/regard-webkit.mjs [dossier]
   (sans OC_NAVIGATEUR : Chromium, pour vérifier le script lui-même)

   L'environnement de développement n'a que Chromium : la CI installe
   WebKit et joue ce script (.github/workflows/refonte-webkit.yml). Il
   ouvre chaque écran au téléphone (390 et 360 px) et au poste, en clair
   et en sombre, et relève ce qu'une mise en page cassée laisse voir :
   les erreurs de la page, ce qui dépasse le bord, les cibles de moins
   de 44 px au doigt, et une ligne ou un bouton raboté (son contenu plus
   haut que lui, coupé) — la forme exacte du défaut du fil, vu sur
   l'iPhone du mainteneur et jamais en émulation. Les captures vont dans
   le dossier (l'artefact de la CI). Informatif : il finit toujours par
   « REGARD … : N relevé(s) », sans faire échouer.
   ============================================================ */
import path from 'path';
import os from 'os';
import { mkdir } from 'fs/promises';
import { serveRepo, chromiumPath } from '../e2e/outils.mjs';
import { brancherAnnuaire } from './annuaire-fictif.mjs';
import { deborde, petites } from './outils.mjs';
import { nouvelleCle } from '../../engine/boite.js';
import { createVault, sealValue } from '../../engine/vault.js';

const WEBKIT = process.env.OC_NAVIGATEUR === 'webkit';
const pw = await (async () => {
  for (const c of [process.env.OC_PLAYWRIGHT, '/opt/node22/lib/node_modules/playwright/index.mjs', 'playwright'].filter(Boolean))
    try { return await import(c); } catch (e) {}
  throw new Error('Playwright introuvable');
})();
const MOTEUR = WEBKIT ? 'webkit' : 'chromium';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-refonte', 'regard-' + MOTEUR);
await mkdir(OUT, { recursive: true });
const { server, base } = await serveRepo();
const browser = WEBKIT ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: chromiumPath() });
const releves = [], erreurs = [];

/* les feuilles et l'écran verrouillé vivent hors de la fenêtre : ce qui y
   dépasse le bord, et les touches de moins de 44 px au doigt */
const debordeCouches = p => p.evaluate(() => { const W = document.documentElement.clientWidth;
  return [...document.querySelectorAll('.couche-f *, .couche-v *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1; })
    .map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().right)).slice(0, 4); });
const petitesCouches = p => p.evaluate(() => [...document.querySelectorAll('.couche-f button, .couche-f [role="button"], .couche-v button')]
  .filter(b => b.offsetParent && b.getBoundingClientRect().height < 43.5).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 24) + ' ' + Math.round(b.getBoundingClientRect().height)).slice(0, 6));
/* une ligne, un bouton raboté : son contenu dépasse et il le coupe */
const ecrase = p => p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.fen .rang, .fen .btn, .fen .pers, .fen .r-c, .couche-f .rang, .couche-f .btn, .couche-v .touche')){
    const r = el.getBoundingClientRect();
    if (!r.height || r.bottom < 0 || r.top > innerHeight) continue;
    if (!/(hidden|clip)/.test(getComputedStyle(el).overflowY)) continue;
    if (el.scrollHeight > el.clientHeight + 3) out.push((el.textContent || '').trim().slice(0, 30) + ` ${el.clientHeight}/${el.scrollHeight}`);
  }
  return out.slice(0, 6);
});

const OFFRE = 'Alternance – Technicien·ne systèmes et réseaux (H/F)\nRéseaux et Systèmes du Nord · Lille\n\nAlternance de 2 ans, à partir de septembre 2027.\nRythme : 3 semaines en entreprise, 1 semaine à l’école.\n\nTes missions\n- Installer et suivre les serveurs de nos clients (Linux, Windows Server)\n- Gérer leurs réseaux : pare-feu, VLAN, wifi\n- Répondre à leurs demandes d’assistance\n\nCandidatures avant le 15 décembre 2026, auprès de Thomas Leroy, responsable technique : t.leroy@rsn-lille.fr';
const REPONSE = 'Nord Infogérance ; Marc Delattre ; m.delattre@nord-infogerance.fr ; écrit ; 12/11/2026\n'
  + ' ; Paul Girard ; paul.girard@worldline.test ; écrit ; 03/11/2026\nLys Informatique ; ; ; refus ; 14/11/2026';
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15 };
/* un ami : Réseau a sa liste, sa page, Donner et Recevoir */
const AMI = { id: 'KarimKarimKarim01', nom: 'Karim Benali', cle: (await nouvelleCle()).pub,
  parcours: [{ entreprise: 'Kiabi', quoi: 'alternance', debut: '2025-09', fin: '' }] };
/* un coffre : l'écran verrouillé, au pavé */
const COFFRE = await (async () => {
  const { meta, key } = await createVault('280941', 'abri ballon cadre domino ecole fumer gazon hiver invite jardin kayak lampe', { iter: 20000 });
  return { oc_vault_v1: JSON.stringify(meta), oc_profile_v1: await sealValue(key, 'oc_profile_v1', JSON.stringify(PROFIL)) };
})();
const PISTES = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1, contacts: [{ id: 'k1', name: 'Léa Roux', role: 'RH', email: 'lea.roux@kiabi.test' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'active', appliedAt: '2026-11-10', createdAt: 2,
    contacts: [{ id: 'w1', name: 'Claire Durand', role: 'RH', email: 'claire@worldline.test' }] },
  { id: 'sog', name: 'Société Générale Global Solution Centre — Direction des systèmes d’information', city: 'Villeneuve-d’Ascq', status: 'todo', createdAt: 3 },
  { id: 'opa', name: 'Opale Systèmes', city: 'Lille', siren: '812000013', status: 'reply', createdAt: 4,
    contacts: [{ id: 'o1', name: 'Sandrine Lefebvre', role: 'présidente', email: 's.lefebvre@opale.test' }] }
];

async function ouvrir(w, h, o = {}){
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!o.mobile, isMobile: !!o.mobile,
    colorScheme: o.sombre ? 'dark' : 'light', reducedMotion: 'reduce' });
  brancherAnnuaire(ctx, {});
  await ctx.addInitScript(([profil, pistes, cles]) => {
    if (profil) localStorage.setItem('oc_profile_v1', JSON.stringify(profil));
    if (pistes) localStorage.setItem('oc_data_v3', JSON.stringify(pistes));
    for (const [k, v] of Object.entries(cles || {})) localStorage.setItem(k, v);
    localStorage.setItem('oc_relays_v1', JSON.stringify(['wss://127.0.0.1:9/']));
  }, [o.profil || null, o.pistes || null, o.cles || null]);
  const p = await ctx.newPage();
  const ici = `${MOTEUR} ${w}${o.sombre ? ' sombre' : ''}`;
  p.on('pageerror', e => erreurs.push(ici + ' · ' + String(e)));
  /* `interactive-widget` règle le clavier d'Android ; Safari l'ignore et le
     dit en console (CLAUDE.md §5, WebKit bug 259770) : ce n'est pas une
     faute de l'app */
  p.on('console', m => { if (m.type() === 'error' && !/WebSocket|wss:|ERR_|Failed to load resource|net::|interactive-widget/i.test(m.text())) erreurs.push(ici + ' · ' + m.text()); });
  await p.goto(base + '/refonte.html' + (o.adresse || ''));
  if (o.cles && o.cles.oc_vault_v1) await p.waitForSelector('.couche-v .verrou', { timeout: 20000 }).catch(() => erreurs.push(ici + ' · l’écran verrouillé ne vient pas'));
  else await p.waitForFunction(() => document.documentElement.classList.contains('pret'), null, { timeout: 20000 }).catch(() => erreurs.push(ici + ' · l’app ne s’ouvre pas'));
  await p.waitForTimeout(400);
  return { ctx, p, ici };
}
async function regarder(x, nom, { mobile } = {}){
  const { p, ici } = x;
  await p.waitForTimeout(450);
  const d = [...await deborde(p), ...await debordeCouches(p)], e = await ecrase(p), s = mobile ? [...await petites(p), ...await petitesCouches(p)] : [];
  if (d.length) releves.push(`${ici} · ${nom} · déborde : ${d.join(' | ')}`);
  if (e.length) releves.push(`${ici} · ${nom} · raboté : ${e.join(' | ')}`);
  if (s.length) releves.push(`${ici} · ${nom} · cibles < 44 px : ${s.join(' | ')}`);
  await p.screenshot({ path: path.join(OUT, `${nom}-${ici.replace(/\s+/g, '-')}.png`) }).catch(() => {});
}
const clic = (p, sel) => p.click(sel, { timeout: 8000 }).then(() => p.waitForTimeout(350)).catch(e => erreurs.push('clic ' + sel + ' · ' + String(e).split('\n')[0]));
const coller = (p, sel, texte) => p.evaluate(([sel, texte]) => {
  const el = sel ? document.querySelector(sel) : document.body;
  const dt = new DataTransfer(); dt.setData('text/plain', texte);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, [sel, texte]).catch(e => erreurs.push('coller · ' + String(e).split('\n')[0]));
const attendreTexte = (p, re) => p.waitForFunction(r => new RegExp(r, 'i').test(document.querySelector('.ecran').innerText), re.source, { timeout: 10000 }).then(() => true, () => false);
/* ce qu'un geste devait montrer : s'il manque, le regard le dit (un
   collage simulé que le moteur refuse n'est pas une page cassée, mais
   les écrans d'après ne montrent plus ce qu'on croit) */
const doitVoir = async (x, re, quoi) => { if (!(await attendreTexte(x.p, re))) erreurs.push(`${x.ici} · ${quoi} : « ${re.source} » n’est pas venu`); };

/* ---------- au téléphone ---------- */
for (const [w, h, sombre] of [[390, 844, false], [360, 640, true]]){
  const tel = { mobile: true, sombre };
  /* verrouillée : le pavé, puis « Code oublié ? » */
  let x = await ouvrir(w, h, { ...tel, cles: COFFRE });
  await regarder(x, '00-verrou', tel);
  await clic(x.p, '.couche-v [data-a="v-oublie"]');
  await regarder(x, '00-code-oublie', tel);
  await x.ctx.close();
  /* le premier jour */
  x = await ouvrir(w, h, tel);
  await regarder(x, '01-premier-jour', tel);
  /* LA SONDE : un regard qui rend zéro doit prouver qu'il voit. Une
     ligne rabotée, un bloc trop large et un bouton de 30 px, posés
     exprès, doivent ressortir — puis ils partent */
  if (w === 390){
    await x.p.evaluate(() => document.querySelector('.fen .ecran').insertAdjacentHTML('afterbegin',
      '<div id="zz-sonde"><div class="rang" style="height:20px;overflow:hidden"><div style="height:60px">sonde</div></div>'
      + '<div style="width:2000px;height:4px"></div><button style="height:30px">sonde</button></div>'));
    const vu = [(await ecrase(x.p)).length > 0, (await deborde(x.p)).length > 0, (await petites(x.p)).some(t => /sonde/.test(t))];
    if (vu.includes(false)) erreurs.push(`la sonde ne ressort pas (raboté, déborde, cible) : ${vu.join(' ')} — le regard ne voit plus`);
    await x.p.evaluate(() => document.getElementById('zz-sonde').remove());
  }
  await x.ctx.close();
  /* Trouver, une entreprise, une offre */
  x = await ouvrir(w, h, { ...tel, profil: PROFIL, pistes: PISTES, adresse: '#/trouver' });
  await doitVoir(x, /salariés/, 'la liste de Trouver');
  await regarder(x, '02-trouver', tel);
  await clic(x.p, '.ecran .q');
  await coller(x.p, '.ecran .q', OFFRE);
  await doitVoir(x, /Lu dans l’offre/, 'l’offre collée');
  await regarder(x, '03-offre-collee', tel);
  await clic(x.p, '.ecran .r-c[data-a="ent"]');
  await regarder(x, '04-entreprise-offre', tel);
  await clic(x.p, '.ecran .pied [data-a="garder"]');
  /* Pistes, une piste, écrire */
  await clic(x.p, '.onglets [data-id="pistes"]');
  await regarder(x, '05-pistes', tel);
  await clic(x.p, '.ecran .r-c[data-a="piste"][data-id="sog"]');
  await regarder(x, '06-piste-longue', tel);
  await clic(x.p, '.ecran [data-a="ecrire"]');
  await regarder(x, '07-ecrire', tel);
  await x.p.goBack().catch(() => {}); await x.p.waitForTimeout(300);
  await x.p.goBack().catch(() => {}); await x.p.waitForTimeout(300);
  /* Depuis mes e-mails, puis le bac */
  await clic(x.p, '.ecran [data-a="x-mails"]');
  await x.p.fill('.couche-f .x-rep', REPONSE).catch(e => erreurs.push('fill · ' + String(e).split('\n')[0]));
  await clic(x.p, '.couche-f [data-a="x-lire"]');
  await regarder(x, '08-emails-apercu', tel);
  await clic(x.p, '.couche-f [data-a="x-ajouter"]');
  await clic(x.p, '.ecran details.bac summary');
  await regarder(x, '09-bac', tel);
  /* Réseau vide, puis Moi */
  await clic(x.p, '.onglets [data-id="reseau"]');
  await regarder(x, '10-reseau', tel);
  await clic(x.p, '.onglets [data-id="moi"]');
  await regarder(x, '11-moi', tel);
  for (const id of ['profil', 'docs', 'modeles', 'copie', 'reglages']){
    await clic(x.p, `.ecran [data-a="m-ouvrir"][data-id="${id}"]`);
    await regarder(x, '12-moi-' + id, tel);
    await x.p.goBack().catch(() => {}); await x.p.waitForTimeout(300);
  }
  await x.ctx.close();
  /* Réseau avec un ami : la liste, sa page, Donner, Recevoir */
  x = await ouvrir(w, h, { ...tel, profil: { ...PROFIL, amis: [AMI] }, pistes: PISTES, adresse: '#/reseau' });
  await regarder(x, '13-reseau-ami', tel);
  await clic(x.p, '.ecran [data-a="r-ami"]');
  await regarder(x, '14-ami', tel);
  await x.p.goBack().catch(() => {}); await x.p.waitForTimeout(300);
  await clic(x.p, '.ecran [data-a="r-donner"]');
  await regarder(x, '15-donner', tel);
  await x.p.goBack().catch(() => {}); await x.p.waitForTimeout(300);
  await clic(x.p, '.ecran [data-a="r-recevoir"]');
  await regarder(x, '16-recevoir', tel);
  await x.ctx.close();
}

/* ---------- au poste ---------- */
for (const sombre of [false, true]){
  const x = await ouvrir(1280, 800, { sombre, profil: PROFIL, pistes: PISTES, adresse: '#/trouver' });
  await doitVoir(x, /salariés/, 'la liste de Trouver');
  await regarder(x, '20-poste-trouver');
  await coller(x.p, null, OFFRE);
  await doitVoir(x, /Lu dans l’offre/, 'Ctrl V au poste');
  await regarder(x, '21-poste-offre');
  await x.p.keyboard.press('g'); await x.p.waitForTimeout(300);
  await x.p.keyboard.press('p'); await x.p.waitForTimeout(400);
  await regarder(x, '22-poste-pistes');
  await x.p.keyboard.press('Enter'); await x.p.waitForTimeout(400);
  await regarder(x, '23-poste-ecrire');
  await x.p.keyboard.press('r'); await x.p.waitForTimeout(400);
  await regarder(x, '24-poste-reseau');
  await x.p.keyboard.press('m'); await x.p.waitForTimeout(400);
  await regarder(x, '25-poste-moi');
  await x.ctx.close();
}

await browser.close();
server.close();
console.log(`\n${releves.length ? releves.join('\n') : 'Rien qui déborde, rien de raboté, aucune cible trop petite.'}`);
if (erreurs.length) console.log('\nErreurs :\n' + erreurs.slice(0, 20).join('\n'));
console.log(`\nREGARD ${MOTEUR} : ${releves.length} relevé(s) · ${erreurs.length} erreur(s) · captures dans ${OUT}`);
