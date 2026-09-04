/* ============================================================
   E2E — LES PAGES QUI SE LISENT, MESURÉES

   `aide.html` et `confidentialite.html` sont livrées, visibles, et
   liées depuis les réglages de l'app. Rien ne les mesurait : les treize
   surfaces d'`e2e-ux-audit.mjs` sont des ROUTES, et une page qui n'est
   pas l'app n'en est pas une. Les chiffres écrits en commentaire dans
   `doc.css` — la largeur du lien de pied, le mot qui débordait à 200 % —
   ont donc tous été relevés à la main, une fois, par quelqu'un qui
   savait où regarder. C'est exactement la situation que §9 décrit :
   « un garde sauté ne garde rien », et un garde absent encore moins.

   LA LISTE VIENT DU DISQUE, et son critère est le bon : **une page qui
   charge `doc.css` est une page qui se lit.** Nommer les deux fichiers
   ici, c'est se préparer à en oublier un troisième — ce dépôt l'a payé
   deux fois (`PRECACHE`, les pages du service worker), et une fois de
   plus dans le garde du survol, qui lisait quatre feuilles de style sur
   huit et laissait passer une règle nue depuis des mois.

   Ce qu'on mesure, dans les deux thèmes et les deux ergonomies, de
   320 px à 1280 px, à 100 %, 125 % et 200 % de texte :
   ① rien ne déborde en largeur — une page qui glisse sous le doigt est
     le symptôme le plus déroutant qui soit ;
   ② rien n'est raboté — aucun conteneur ne coupe son contenu ;
   ③ toute cible tient son plancher : 44 px au doigt, 24 px à la souris,
     et l'exemption des liens EN LIGNE dans une phrase se calcule, elle
     ne se liste pas ;
   ④ tout texte tient son contraste AA ;
   ⑤ la PAIRE tient : chaque page nomme sa sœur DANS la barre de titre,
     et le pied est un vrai repère `contentinfo` — hors de `<main>` ;
   ⑥ zéro erreur console, et le thème sombre s'applique VRAIMENT.

   Trois sondes le prouvent, et elles passent par le même chemin que la
   mesure : un bloc trop large, une cible rétrécie, un texte délavé.
   Sans elles, un `overflow:hidden` posé un jour quelque part rendrait
   le compte nul pour toujours — et zéro se lit comme une réussite.
   ============================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, chromiumPath, SHOTS, serveRepo, ROOT } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* ---- les pages qui se lisent : celles qui chargent `doc.css` ---- */
const PAGES = readdirSync(ROOT)
  .filter(n => n.endsWith('.html'))
  .filter(n => /href=["'][^"']*doc\.css["']/.test(readFileSync(path.join(ROOT, n), 'utf8')))
  .sort();
if (PAGES.length < 2)
  fail(`${PAGES.length} page(s) de lecture relevée(s) — le relevé est cassé, pas les pages`);

/* Le petit téléphone décide, et le poste porte des objets que le pouce
   n'a pas : on balaie les deux ergonomies (CLAUDE.md §5). La bande
   intermédiaire — 125 % — est celle que règle vraiment quelqu'un qui
   veut y voir ; les extrêmes seuls sont un angle mort connu. */
const TAILLES = [
  { w: 320, h: 640, doigt: true },
  { w: 360, h: 640, doigt: true },
  { w: 390, h: 844, doigt: true },
  { w: 1280, h: 800, doigt: false }
];
const ZOOMS = [16, 20, 32];        /* 100 % · 125 % · 200 % */

/* ---------- la sonde unique : tout se lit dans la page ---------- */
const RELEVE = () => {
  const R = { deborde: 0, coupable: '', coupes: [], cibles: [], contrastes: [] };
  const de = document.documentElement;
  R.deborde = Math.max(0, de.scrollWidth - de.clientWidth);
  if (R.deborde > 1){
    /* NOMMER LE COUPABLE, sinon le rapport dit « ça déborde » et laisse
       chercher. Deux causes, et la seconde échappe à la première : une
       BOÎTE plus large que la page (son rectangle dépasse), ou un MOT
       insécable dans une boîte à la bonne largeur — là le rectangle ne
       dit rien, c'est `scrollWidth` qui trahit. La première version ne
       lisait que les rectangles et rendait un coupable vide sur
       exactement le défaut que `doc.css` avait relevé à la main. */
    let pire = 0;
    for (const n of document.querySelectorAll('*')){
      const r = n.getBoundingClientRect();
      const debord = Math.max(r.right - de.clientWidth, n.scrollWidth - n.clientWidth);
      if (debord > pire && n.children.length === 0){
        pire = debord;
        R.coupable = n.tagName.toLowerCase() + (n.className ? '.' + n.className : '')
          + ' « ' + (n.textContent || '').trim().slice(0, 30) + ' »';
      }
    }
  }

  /* ② UN CONTENEUR QUI RABOTE. Le balayage d'élision ne regarde que ce
     qui porte du texte ; un parent qui coupe des enfants ENTIERS lui est
     invisible (§4). On lit donc le débordement réel d'une boîte qui ne
     défile pas. */
  for (const n of document.querySelectorAll('*')){
    const cs = getComputedStyle(n);
    const cache = v => v === 'hidden' || v === 'clip';
    if (!cache(cs.overflowX) && !cache(cs.overflowY)) continue;
    const dy = cache(cs.overflowY) ? n.scrollHeight - n.clientHeight : 0;
    const dx = cache(cs.overflowX) ? n.scrollWidth - n.clientWidth : 0;
    if (dx > 1 || dy > 1)
      R.coupes.push({ sel: n.tagName.toLowerCase() + (n.className ? '.' + n.className : ''),
        dx, dy, txt: (n.textContent || '').trim().slice(0, 44) });
  }

  /* ③ UNE CIBLE SE MESURE SUR CE QUI RÉPOND AU DOIGT — donc sur le plus
     haut ancêtre interactif, `role="button"` et `tabindex="0"` compris.
     L'exemption des liens en ligne se CALCULE : un lien qui coule dans
     une phrase (`display:inline`, et dont le parent porte d'autre texte
     que lui) est exempté par WCAG 2.5.8 elle-même. Une liste d'exceptions
     écrite à la main se serait allongée d'un lien à chaque paragraphe. */
  const INTER = 'a[href],button,summary,[role="button"],[tabindex="0"],input,select,textarea';
  for (const n of document.querySelectorAll(INTER)){
    const r = n.getBoundingClientRect();
    if (!r.width || !r.height) continue;      /* replié = pas une cible */
    const p = n.parentElement;
    const enLigne = getComputedStyle(n).display.startsWith('inline')
      && !!p && (p.textContent || '').trim() !== (n.textContent || '').trim();
    R.cibles.push({ sel: n.tagName.toLowerCase() + (n.className ? '.' + n.className : ''),
      w: Math.round(r.width), h: Math.round(r.height), enLigne,
      txt: (n.textContent || '').trim().slice(0, 26) });
  }

  /* ④ LE CONTRASTE, sur les nœuds qui portent VRAIMENT du texte : un
     élément dont tout le texte vient d'un enfant n'a pas de couleur à
     lui, et le compter deux fois ferait accuser le parent pour l'enfant. */
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const fond = n => {
    for (let e = n; e; e = e.parentElement){
      const c = getComputedStyle(e).backgroundColor;
      const a = (c.match(/[\d.]+/g) || [])[3];
      if (c && c !== 'transparent' && a !== '0') return rgb(c);
    }
    return [255, 255, 255];
  };
  for (const n of document.querySelectorAll('p,li,h1,h2,h3,a,b,em,code,span,footer,main')){
    const propre = [...n.childNodes]
      .filter(c => c.nodeType === 3 && c.textContent.trim())
      .map(c => c.textContent.trim()).join(' ');
    if (!propre) continue;
    const cs = getComputedStyle(n);
    const l1 = lum(rgb(cs.color)), l2 = lum(fond(n));
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(cs.fontSize);
    const grand = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    R.contrastes.push({ sel: n.tagName.toLowerCase() + (n.className ? '.' + n.className : ''),
      ratio: Math.round(ratio * 100) / 100, seuil: grand ? 3 : 4.5,
      px: Math.round(px * 10) / 10, txt: propre.slice(0, 34) });
  }
  return R;
};

/* ---------- ⑤ LA PAIRE : la structure, lue dans le document ---------- */
const STRUCTURE = () => {
  const soeur = document.querySelector('.dh a.dh-sib');
  const pied = document.querySelector('footer');
  return {
    retour: !!document.querySelector('.dh a.dh-back'),
    soeur: soeur ? soeur.getAttribute('href') : null,
    piedHorsMain: !!pied && !pied.closest('main'),
    piedLiens: pied ? [...pied.querySelectorAll('a')].map(a => a.getAttribute('href')) : [],
    evitement: (() => {
      const s = document.querySelector('a.skip');
      if (!s) return 'absent';
      const cible = document.querySelector(s.getAttribute('href'));
      /* un lien d'évitement qui ne vise pas un élément FOCALISABLE ne
         déplace que le défilement — §5, et c'est invisible à l'œil */
      return !cible ? 'cible absente'
           : (cible.tabIndex < 0 || cible.hasAttribute('tabindex')) ? 'ok' : 'cible non focalisable';
    })(),
    titre: document.title,
    theme: document.documentElement.dataset.theme,
    h1: document.querySelectorAll('h1').length,
    rangs: [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1])
  };
};

/* ---------- le balayage ---------- */
let mesures = 0, cibles = 0, textes = 0;
const durs = [];
for (const theme of ['light', 'dark']){
  for (const nom of PAGES){
    for (const t of TAILLES){
      for (const fs of ZOOMS){
        const ctx = await browser.newContext({ viewport: { width: t.w, height: t.h },
          hasTouch: t.doigt, isMobile: t.doigt, colorScheme: theme });
        const page = await ctx.newPage();
        page.on('console', m => { if (m.type() === 'error') errors.push(`${nom} ${t.w}px ${theme} : ${m.text()}`); });
        page.on('pageerror', e => errors.push(`${nom} ${t.w}px ${theme} : ${e}`));
        await page.goto(base + '/' + nom, { waitUntil: 'load' });
        if (fs !== 16) await page.evaluate(f => { document.documentElement.style.fontSize = f + 'px'; }, fs);
        await page.waitForTimeout(120);

        /* UN CONTRÔLE NE GARDE QUE LES ÉTATS QU'IL MET EN PLACE : si le
           thème sombre n'est pas VRAIMENT posé, la moitié du balayage
           mesure deux fois le thème clair et se croit complète. */
        const vu = await page.evaluate(() => document.documentElement.dataset.theme);
        if (vu !== theme){
          fail(`${nom} : thème « ${vu} » alors que le navigateur demande « ${theme} » — la moitié du balayage ne mesure rien`);
          await ctx.close(); continue;
        }

        const r = await page.evaluate(RELEVE);
        mesures++; cibles += r.cibles.length; textes += r.contrastes.length;
        const ou = `${nom} · ${t.w}px · ${Math.round(fs / 16 * 100)}% · ${theme}`;
        if (r.deborde > 1) durs.push(`${ou} : la page déborde de ${r.deborde}px (${r.coupable})`);
        for (const c of r.coupes)
          durs.push(`${ou} : ${c.sel} rabote son contenu (${c.dx}px × ${c.dy}px) — « ${c.txt} »`);
        const plancher = t.doigt ? 44 : 24;
        for (const c of r.cibles)
          if (!c.enLigne && (c.w < plancher || c.h < plancher))
            durs.push(`${ou} : cible ${c.w}×${c.h} sous le plancher de ${plancher}px — ${c.sel} « ${c.txt} »`);
        for (const c of r.contrastes)
          if (c.ratio < c.seuil)
            durs.push(`${ou} : contraste ${c.ratio}:1 sous ${c.seuil} — ${c.sel} ${c.px}px « ${c.txt} »`);
        await ctx.close();
      }
    }
  }
}
if (durs.length) fail(`pages de lecture — ${durs.length} défaut(s) :\n      ` + durs.join('\n      '));
else console.log(`mise en page : ${mesures} relevés (${PAGES.length} pages × 4 largeurs × 3 tailles de texte × 2 thèmes) — `
  + `rien ne déborde, rien n'est raboté, ${cibles} cibles au plancher, ${textes} textes au contraste ✓`);

/* ---------- ⑤ la paire, et les repères ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  const vues = {};
  for (const nom of PAGES){
    await page.goto(base + '/' + nom, { waitUntil: 'load' });
    vues[nom] = await page.evaluate(STRUCTURE);
  }
  for (const [nom, s] of Object.entries(vues)){
    if (!s.retour) fail(`${nom} : pas de retour vers l'app dans la barre de titre`);
    if (s.evitement !== 'ok') fail(`${nom} : lien d'évitement — ${s.evitement}`);
    if (!s.piedHorsMain)
      fail(`${nom} : le pied vit DANS <main> — ce n'est donc pas un repère \`contentinfo\`, `
        + 'et qui navigue par repères ne le trouve pas');
    if (s.h1 !== 1) fail(`${nom} : ${s.h1} <h1> — il en faut exactement un`);
    let prec = 0;
    for (const r of s.rangs){
      if (prec && r > prec + 1) fail(`${nom} : rang de titre sauté (h${prec} → h${r})`);
      prec = r;
    }
    /* LA PAIRE. Les réglages de l'app n'ont qu'UNE ligne pour les deux
       pages — « Aide et confidentialité » — et elle ouvre l'aide. Si la
       sœur n'est nommée qu'au pied, qui vient pour l'autre traverse la
       page entière avant de la trouver : le lien existe, et il est
       enterré. On exige donc les DEUX, la barre de titre et le pied. */
    const soeurs = PAGES.filter(p => p !== nom);
    if (!s.soeur || !soeurs.includes(s.soeur))
      fail(`${nom} : la barre de titre ne nomme aucune page sœur (vu : ${s.soeur || 'rien'}) — `
        + `attendu l'une de ${soeurs.join(', ')}`);
    if (!soeurs.some(p => s.piedLiens.includes(p)))
      fail(`${nom} : le pied ne renvoie à aucune page sœur`);
    if (!s.piedLiens.some(h => h === './' || h === 'index.html'))
      fail(`${nom} : le pied ne ramène pas à l'app`);
    if (!/OpenContact/.test(s.titre)) fail(`${nom} : titre sans le produit — « ${s.titre} »`);
  }
  console.log(`la paire : ${PAGES.length} pages, chacune nomme sa sœur dans la barre de titre ET au pied, `
    + 'pied hors de `<main>`, lien d\'évitement focalisable, rangs de titre continus ✓');
  await ctx.close();
}

/* ---------- LES SONDES : la mesure doit pouvoir ÉCHOUER ----------
   Un contrôle qui ne peut pas rougir est pire que pas de contrôle : il
   rend zéro, et zéro se lit comme une réussite. Chaque sonde emprunte
   EXACTEMENT le chemin de la mesure — le même `RELEVE`, la même page —
   et on exige qu'elle soit vue. */
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(base + '/' + PAGES[0], { waitUntil: 'load' });

  const large = await page.evaluate(async (R) => {
    const d = document.createElement('div');
    d.style.cssText = 'width:9999px;height:2px'; d.id = 'sondeLarge';
    document.querySelector('main').append(d);
    const vu = (new Function('return (' + R + ')()'))().deborde;
    d.remove();
    return vu;
  }, RELEVE.toString());
  if (large <= 1) fail('sonde : un bloc de 9999px n’a pas fait déborder la page — la mesure de largeur ne mesure rien');

  const petite = await page.evaluate(async (R) => {
    const a = document.querySelector('.dh a.dh-sib');
    const av = a.style.cssText;
    a.style.cssText = 'min-width:0;min-height:0;height:12px;width:12px;overflow:hidden;display:inline-flex';
    const vu = (new Function('return (' + R + ')()'))().cibles
      .some(c => !c.enLigne && (c.w < 44 || c.h < 44));
    a.style.cssText = av;
    return vu;
  }, RELEVE.toString());
  if (!petite) fail('sonde : une cible de 12px n’est pas ressortie — le plancher des cibles ne garde rien');

  const delave = await page.evaluate(async (R) => {
    const p = document.querySelector('main p');
    const av = p.style.color;
    p.style.color = getComputedStyle(document.querySelector('.dw')).backgroundColor;
    const vu = (new Function('return (' + R + ')()'))().contrastes.some(c => c.ratio < c.seuil);
    p.style.color = av;
    return vu;
  }, RELEVE.toString());
  if (!delave) fail('sonde : un texte de la couleur du fond n’est pas ressorti — le contraste ne mesure rien');

  if (large > 1 && petite && delave)
    console.log('sondes : bloc trop large, cible rétrécie, texte délavé — les trois mesures rougissent quand il faut ✓');
  await ctx.close();
}

/* ---------- la capture, pour l'œil ---------- */
{
  for (const theme of ['light', 'dark']){
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto(base + '/' + PAGES[0], { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.screenshot({ path: SHOTS + `/61-page-lecture-${theme}.png` });
    await ctx.close();
  }
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E pages de lecture : ÉCHEC' : 'E2E pages de lecture : OK');
