/* E2E : L'ANNEAU DE FOCUS SE VOIT — WCAG 2.2 SC 2.4.11 (AA).

   Rien ne le mesurait. Le jeton portait pourtant un commentaire, « 98,
   lisible partout » : une INTENTION, jamais un relevé. Le premier
   passage sur les 150 contrôles de l'app en a compté 49 sous le
   plancher, dont trois qui coûtaient cher — la ligne du fil ne rendait
   RIEN au doigt (0 % de l'aire exigée, contraste 0), la ligne d'une
   piste un quart, la rangée d'« Aujourd'hui » un huitième. Ce sont les
   trois listes principales du produit : quelqu'un qui tabule ne savait
   pas où il était.

   ON NE LIT PAS LE CSS. On photographie chaque contrôle non focalisé
   puis focalisé, et on compte les pixels qui changent. C'est le seul
   relevé qui survit à un anneau rogné par un ancêtre, ou peint sous un
   enfant opaque — les deux défauts trouvés ici, et aucun des deux ne se
   voit dans une feuille de style.

   Trois critères, et les deux premiers sont ceux du texte :

   ① L'AIRE. Le critère offre deux minimums et retient le plus FACILE :
     l'aire d'un périmètre de 2 px autour du contrôle, ou celle d'un
     trait de 4 px le long de son plus petit côté. Ne mesurer que le
     premier sur-accuse — une rangée de 523×36 exigerait 2 252 px² au
     lieu de 144, et le relevé rendrait « tout est faux », ce qui ne se
     corrige pas. C'est la faute que la sonde des relais a déjà payée :
     neuf relais sains accusés d'un coup.
   ② LE CONTRASTE, ≥ 3:1 entre les pixels focalisés et non focalisés.
   ③ LA FORME, et celle-là vient du produit, pas de WCAG. §4 dit que
     l'anneau est un rectangle pointillé ; le critère ①, lui, se
     satisfait d'un trait. Un anneau posé SOUS l'enveloppe opaque de la
     ligne du fil rendait 103 % — au vert — alors que l'œil ne voyait
     qu'un liseré d'un pixel en bas. On exige donc du changement sur au
     moins trois des quatre bords : c'est ce qui distingue un anneau
     d'une bavure. Sans ce troisième critère, le défaut le plus
     coûteux du lot repassait au vert. */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];

/* Un suivi réaliste : sans lui, la moitié des écrans est vide et le
   balayage ne mesure que le châssis. « Un contrôle ne garde que les
   ÉTATS qu'il met en place » (§5). */
const SEMER = async () => {
  const { S, saveData, saveJournal } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  const J = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const noms = ['Sopra Steria', 'Orange Cyberdefense', 'Thales SIX', 'Capgemini', 'Atos',
    'Airbus Defence', 'Société Générale', 'Docaposte', 'Worldline', 'Sesame IT',
    'Zephyr SI', 'Orano Cyber', 'Niji', 'Younup', 'Cyberprotect'];
  const villes = ['Toulouse', 'Lille', 'Paris', 'Bordeaux', 'Nantes', 'Rennes'];
  const st = ['todo', 'contacted', 'reply', 'todo', 'contacted', 'reply'];
  const verbes = ['Relancer', 'Écrire au RH', 'Appeler', 'Envoyer le CV', 'Répondre'];
  S.companies = noms.map((n, i) => normalizeCompany({
    id: 'c' + i, name: n, city: villes[i % 6], status: st[i % 6], domain: 'esn',
    nextAction: i < 9 ? J(i - 4) : '', nextActionText: i < 9 ? verbes[i % 5] : '',
    notes: i % 3 ? 'Note sur la piste.' : '',
    contacts: i % 2 ? [{ id: 'p' + i, name: 'Nadia Berthier', role: 'RH', email: 'n' + i + '@ex.fr' }] : [],
    updatedAt: 200 - i
  }));
  const j = Date.now();
  S.journal = [
    { t: j - 1 * 36e5, txt: 'Reçu de Léa : +12 piste(s)', ids: ['c0', 'c1', 'c2'] },
    { t: j - 26 * 36e5, txt: 'Donné (QR) : 3 piste(s)', ids: ['c0'] },
    { t: j - 60 * 36e5, txt: 'Reçu du groupe : +7 piste(s)', ids: ['c3'] }
  ];
  saveJournal(); saveData();
};

/* Un représentant par FAMILLE (balise + deux premières classes) : mesurer
   quinze lignes de pistes identiques coûte quinze fois le prix d'une seule
   et ne prouve rien de plus. Le marquage se nettoie à chaque relevé — les
   vues restent dans le DOM, seulement `hidden`, et sans ce nettoyage on
   retrouve d'abord celui de l'écran précédent. */
const RAMASSE = () => {
  document.querySelectorAll('[data-oc-focus]').forEach(n => delete n.dataset.ocFocus);
  const SEL = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"]),[role="button"]';
  const vus = new Map();
  for (const n of document.querySelectorAll(SEL)){
    if (n.disabled || n.offsetParent === null) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
    const sig = n.tagName.toLowerCase() + (n.className && typeof n.className === 'string'
      ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    if (vus.has(sig)) continue;
    n.dataset.ocFocus = 'f' + vus.size;
    vus.set(sig, 'f' + vus.size);
  }
  return [...vus].map(([sig, id]) => ({ sig, id }));
};

/* Le décodage PNG se fait DANS la page (canvas) : aucune dépendance à
   installer. Pas de `fetch('data:…')` — la CSP de l'app coupe
   `connect-src`, et l'erreur ne dit pas pourquoi. */
const DIFF = (p, a, b, bande) => p.evaluate(async ([a, b, bande]) => {
  const px = async d => {
    const bin = atob(d); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const bm = await createImageBitmap(new Blob([u8], { type: 'image/png' }));
    const c = new OffscreenCanvas(bm.width, bm.height);
    c.getContext('2d').drawImage(bm, 0, 0);
    return { d: c.getContext('2d').getImageData(0, 0, bm.width, bm.height).data, w: bm.width, h: bm.height };
  };
  const [A, B] = [await px(a), await px(b)];
  const lum = (r, g, bl) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(bl); };
  let n = 0, max = 0;
  const bords = { haut: 0, bas: 0, gauche: 0, droite: 0 };
  for (let i = 0; i < A.d.length; i += 4){
    if (A.d[i] === B.d[i] && A.d[i+1] === B.d[i+1] && A.d[i+2] === B.d[i+2]) continue;
    n++;
    const [x, y] = [lum(A.d[i], A.d[i+1], A.d[i+2]), lum(B.d[i], B.d[i+1], B.d[i+2])].sort((p, q) => q - p);
    const c = (x + .05) / (y + .05);
    if (c > max) max = c;
    /* Dans quel bord de la BOÎTE DU CONTRÔLE ce pixel tombe-t-il ?
       On EXCLUT les coins — sinon un simple trait horizontal en bas
       compte aussi pour « gauche » et « droite » (ses deux extrémités
       sont à portée des bords verticaux), et la sonde du liseré passait
       au vert avec trois côtés sur quatre. Chaque bord ne compte donc
       que le MILIEU de sa propre longueur. */
    const px_ = (i / 4) % A.w, py = Math.floor((i / 4) / A.w);
    const mx = px_ > bande.x + bande.w * .2 && px_ < bande.x + bande.w * .8;
    const my = py > bande.y + bande.h * .2 && py < bande.y + bande.h * .8;
    if (mx && py >= bande.y - bande.e && py <= bande.y + bande.e) bords.haut++;
    if (mx && py >= bande.y + bande.h - bande.e && py <= bande.y + bande.h + bande.e) bords.bas++;
    if (my && px_ >= bande.x - bande.e && px_ <= bande.x + bande.e) bords.gauche++;
    if (my && px_ >= bande.x + bande.w - bande.e && px_ <= bande.x + bande.w + bande.e) bords.droite++;
  }
  return { n, max: +max.toFixed(2), bords };
}, [a, b, bande]);

async function mesurer(p, id, dpr){
  const s = `[data-oc-focus="${id}"]`;
  const box = await p.evaluate(sel => {
    const n = document.querySelector(sel);
    if (!n) return { perdu: 'l’élément n’est plus dans le document' };
    document.activeElement?.blur?.();
    const r = n.getBoundingClientRect();
    if (r.width < 6 || r.height < 6)
      return { perdu: `réduit à ${Math.round(r.width)}×${Math.round(r.height)}` };
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, s);
  if (box.perdu) return { perdu: box.perdu };
  /* large : l'anneau d'une rangée vit plus loin que celui du contrôle */
  const M = 24;
  const gx = Math.max(0, box.x - M), gy = Math.max(0, box.y - M);
  const clip = { x: gx, y: gy, width: box.w + 2 * M, height: box.h + 2 * M };
  const avant = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(sel => document.querySelector(sel).focus({ preventScroll: true }), s);
  await p.waitForTimeout(60);
  /* QUELLE BOÎTE porte l'anneau ? Pas toujours celle du contrôle : quand
     il remplit une rangée rognée, c'est la rangée qui le porte (voir
     `app.css`, motif `sw-cible`). Mesurer la FORME autour du contrôle
     accusait alors à tort — l'anneau d'une ligne de piste est bien un
     rectangle, simplement plus large que `.ri-main`. On cherche donc la
     première boîte, du contrôle vers le haut, qui a réellement un
     contour. L'AIRE, elle, reste rapportée au contrôle : c'est ce que
     dit le critère (« un périmètre de 2 px DU COMPOSANT »). */
  const porteur = await p.evaluate(sel => {
    for (let e = document.querySelector(sel), i = 0; e && i < 4; e = e.parentElement, i++){
      const cs = getComputedStyle(e);
      if (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none'){
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }
    }
    return null;
  }, s);
  const apres = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(sel => document.querySelector(sel).blur(), s);
  /* la boîte porteuse, dans le repère de l'image (donc en dpr) */
  const b0 = porteur || box;
  const bande = { x: (b0.x - gx) * dpr, y: (b0.y - gy) * dpr,
                  w: b0.w * dpr, h: b0.h * dpr, e: 6 * dpr };
  const d = await DIFF(p, avant, apres, bande);
  const perimetre2 = (box.w + 4) * (box.h + 4) - box.w * box.h;
  const trait4 = 4 * Math.min(box.w, box.h);
  const exige = Math.min(perimetre2, trait4) * dpr * dpr;
  const cotes = ['haut', 'bas', 'gauche', 'droite'].filter(k => d.bords[k] > 0);
  return { w: Math.round(box.w), h: Math.round(box.h),
           pct: Math.round(100 * d.n / exige), contraste: d.max, cotes };
}

async function balayer(){
  const bilan = { n: 0, ko: [], minAire: Infinity, minContraste: Infinity, perdus: 0 };
  for (const theme of ['light', 'dark']){
    for (const [w, tag] of [[390, 'pouce'], [1280, 'poste']]){
      const dpr = 2;
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 },
        deviceScaleFactor: dpr, hasTouch: w < 901, isMobile: w < 901 });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(String(e)));
      p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await p.goto(base, { waitUntil: 'load' });
      await p.waitForSelector('#view-aujourdhui:not([hidden])');
      await p.evaluate(SEMER);
      await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
      for (const route of ['aujourdhui', 'pistes', 'echanger', 'moi']){
        await p.evaluate(r => { location.hash = '#/' + r; }, route);
        await p.waitForTimeout(500);
        for (const f of await p.evaluate(RAMASSE)){
          const r = await mesurer(p, f.id, dpr);
          const ou = `${theme}/${tag}/${route} ${f.sig}`;
          if (r.perdu){ bilan.perdus++; continue; }
          bilan.n++;
          bilan.minAire = Math.min(bilan.minAire, r.pct);
          bilan.minContraste = Math.min(bilan.minContraste, r.contraste);
          if (r.pct < 100)
            bilan.ko.push(`${ou} (${r.w}×${r.h}) : ${r.pct} % de l’aire exigée`);
          else if (r.contraste < 3)
            bilan.ko.push(`${ou} : contraste ${r.contraste}:1 entre focalisé et non focalisé`);
          else if (r.cotes.length < 3)
            bilan.ko.push(`${ou} : l’anneau ne touche que ${r.cotes.length} bord(s) `
              + `(${r.cotes.join(', ') || 'aucun'}) — ce n’est pas un rectangle, c’est une bavure`);
        }
      }
      await ctx.close();
    }
  }
  return bilan;
}

const bilan = await balayer();
if (bilan.n < 100)
  fail(`seulement ${bilan.n} contrôle(s) mesuré(s) — le balayage est cassé, pas l’app`);
if (bilan.perdus > 4)
  fail(`${bilan.perdus} contrôle(s) disparus en cours de mesure — le balayage ne tient pas ses écrans`);
if (bilan.ko.length)
  fail(`focus : ${bilan.ko.length} contrôle(s) sous le plancher WCAG 2.2 SC 2.4.11 —\n      `
    + bilan.ko.join('\n      '));
else
  console.log(`focus : ${bilan.n} contrôles balayés (4 écrans × 2 ergonomies × 2 thèmes), `
    + `aire ≥ ${bilan.minAire} %, contraste ≥ ${bilan.minContraste}:1, anneau entier partout ✓`);

/* ---- LES SONDES ----
   Un contrôle qui rend zéro pour toujours se lit comme une réussite. On
   remet donc les trois défauts d'origine, un par un, et le relevé DOIT
   rougir sur chacun — sinon c'est lui qui est cassé, pas l'app.
   Le style est injecté dans la page : rien n'est écrit sur le disque,
   donc rien à défaire si le scénario meurt en route. */
const SONDES = [
  ['le trait de 1 px d’avant',
   ':root{--focus-outline:1px dotted var(--focus-ring)}'],
  ['l’anneau de la ligne du fil repoussé DEHORS, là où le panneau le rogne',
   '.ec-l:has(.sw-cible:focus-visible)>.sw-in{outline-offset:2px}'],
  ['l’anneau de la ligne du fil rendu à la rangée, sous l’enveloppe opaque',
   '.ec-l:has(.sw-cible:focus-visible)>.sw-in{outline:none}'
   + '.ec-l:has(.sw-cible:focus-visible){outline:var(--focus-outline);outline-offset:-2px}']
];
for (const [quoi, css] of SONDES){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 },
    deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  await p.evaluate(SEMER);
  await p.addStyleTag({ content: css });
  await p.evaluate(() => { location.hash = '#/echanger'; });
  await p.waitForTimeout(500);
  let vu = false;
  for (const f of await p.evaluate(RAMASSE)){
    const r = await mesurer(p, f.id, 2);
    if (r.perdu) continue;
    if (r.pct < 100 || r.contraste < 3 || r.cotes.length < 3) vu = true;
  }
  if (!vu) fail(`sonde : « ${quoi} » n’a pas fait rougir le relevé — il ne mesure rien`);
  else console.log(`sonde : ${quoi} → rougit ✓`);
  await ctx.close();
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E focus : ÉCHEC' : 'E2E focus : OK');
