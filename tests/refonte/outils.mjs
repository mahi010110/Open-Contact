/* ============================================================
   OpenContact · tests de la nouvelle interface · l'outillage
   (docs/refonte-reprendre.md §8)

   Ouvrir `refonte.html` au téléphone ou au poste, en clair ou en
   sombre, sur un annuaire fictif ; compter les erreurs de la page ;
   mesurer ce qui déborde et les cibles trop petites ; glisser une
   ligne au doigt. Chaque scénario `jouer-lotN.mjs` s'en sert.
   ============================================================ */
import path from 'path';
import os from 'os';
import { mkdir } from 'fs/promises';
import { chromium, chromiumPath, serveRepo } from '../e2e/outils.mjs';
import { brancherAnnuaire } from './annuaire-fictif.mjs';

export async function lancer(nom){
  const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-refonte', nom);
  await mkdir(OUT, { recursive: true });
  const { server, base } = await serveRepo();
  const browser = await chromium.launch({ executablePath: chromiumPath() });
  const etat = { erreurs: [], echecs: [] };
  /* `o.sombre`, `o.mobile` (le doigt), `o.calme` (sans mouvement),
     `o.profil` : un profil déjà rempli (les trois réponses) ; `o.relais` :
     l'adresse d'un relais local (tests/e2e/relais-local.mjs), le seul que
     l'app connaîtra ; `o.cles` : d'autres clés à semer ; `o.presse` : le
     presse-papier ouvert au scénario */
  async function ouvrir(w, h, o = {}){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!o.mobile, isMobile: !!o.mobile,
      deviceScaleFactor: o.echelle || 1, colorScheme: o.sombre ? 'dark' : 'light', reducedMotion: o.calme ? 'reduce' : 'no-preference',
      ignoreHTTPSErrors: !!o.relais });
    if (o.presse) await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    const an = brancherAnnuaire(ctx, o);
    if (o.profil || o.pistes || o.relais || o.cles) await ctx.addInitScript(([profil, pistes, relais, cles]) => {
      if (profil) localStorage.setItem('oc_profile_v1', JSON.stringify(profil));
      if (pistes) localStorage.setItem('oc_data_v3', JSON.stringify(pistes));
      if (relais) localStorage.setItem('oc_relays_v1', JSON.stringify([relais]));
      for (const [k, v] of Object.entries(cles || {})) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }, [o.profil || null, o.pistes || null, o.relais || null, o.cles || null]);
    const p = await ctx.newPage();
    const ici = `${w}${o.sombre ? ' sombre' : ''}`;
    p.on('pageerror', e => etat.erreurs.push(ici + ' · ' + String(e)));
    /* les refus que le scénario provoque exprès (500, 429, le réseau
       coupé) s'affichent en console : ce ne sont pas des fautes de l'app.
       Même chose de notre propre fermeture, en pleine négociation d'une
       liaison entre appareils (la bibliothèque la dit en console) */
    p.on('console', m => { if (m.type() === 'error' && !/status of (500|429)|ERR_INTERNET_DISCONNECTED|User-Initiated Abort|reason=Close called/.test(m.text())) etat.erreurs.push(ici + ' · ' + m.text()); });
    await p.goto(base + '/refonte.html' + (o.adresse || ''));
    await p.waitForFunction(() => document.documentElement.classList.contains('pret'));
    await p.waitForTimeout(120);
    return { ctx, p, an };
  }
  const verifier = (vrai, quoi) => { if (!vrai){ etat.echecs.push(quoi); console.error('ÉCHEC :', quoi); } };
  async function fermer(){ await browser.close(); server.close(); }
  return { OUT, ouvrir, verifier, fermer, etat, base };
}

/* ce qui dépasse le bord droit de l'écran (la page ne glisse jamais
   de côté), hors de ce qui défile ou coupe exprès */
export const deborde = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, out = [];
  if (document.documentElement.scrollWidth > W + 1) out.push('page ' + document.documentElement.scrollWidth);
  for (const el of document.querySelectorAll('.fen *')){
    const r = el.getBoundingClientRect();
    if (!r.width || r.right <= W + 1) continue;
    if (el.closest('.gl .rang.tire')) continue;
    let coupe = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement){
      const cs = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && a.getBoundingClientRect().right <= W + 1){ coupe = true; break; }
    }
    if (!coupe) out.push((el.className || el.tagName) + ' ' + Math.round(r.right));
  }
  return out.slice(0, 6);
});
/* au doigt, ce qui se touche fait 44 px de haut au moins (CLAUDE.md §5) */
export const petites = p => p.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.fen button, .fen a[href], .fen [role="button"], .fen input, .couche-a button')){
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    /* un champ se touche par son cadre (le <label> qui l'entoure) */
    const cadre = el.tagName === 'INPUT' && el.closest('label');
    if (cadre && cadre.getBoundingClientRect().height >= 43.5) continue;
    if (r.height < 43.5) out.push((el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 30) + ' ' + Math.round(r.height));
  }
  return out.slice(0, 8);
});
/* glisser une ligne au doigt, de `dx` pixels */
export async function glisser(p, sel, dx){
  await p.evaluate(([sel, dx]) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect(), x = r.left + r.width * 0.7, y = r.top + r.height / 2;
    const t = (cx) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(x)], changedTouches: [t(x)], bubbles: true }));
    for (let i = 1; i <= 6; i++) el.dispatchEvent(new TouchEvent('touchmove', { touches: [t(x + dx * i / 6)], changedTouches: [t(x + dx * i / 6)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(x + dx)], bubbles: true }));
  }, [sel, dx]);
}
/* ce que l'app a écrit sous une clé (IndexedDB d'abord, CONTRAT.md §1) */
export const lireCle = (p, cle) => p.evaluate(async k => {
  const m = await import('/engine/storage.js');
  await m.kvInit();
  try { return JSON.parse(await m.kvGet(k)); } catch (e) { return null; }
}, cle);
/* le texte lu, espaces insécables comprises comme des espaces */
export const texte = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\u00a0/g, ' ') : ''; }, sel);
export const PROFIL = { recherche: 'alternance', formation: 'BTS SIO SISR', ville: 'Lille', rayon: 15, name: 'Inès Martin' };
