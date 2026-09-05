/* ============================================================
   Le mouvement, geste par geste — et dans les DEUX sens.

   « Plus d'animation » est un mauvais objectif : le mouvement est
   pré-attentif, l'œil y va avant la conscience. C'est donc le signal le
   plus fort de l'interface, et le plus cher — l'équivalent, un cran plus
   haut, de la pastille sur chaque ligne qui devient du papier peint.

   Le mouvement répond à une question, jamais à un manque de vie :
     ① d'où ça vient ?   ② où est-ce parti ?
     ③ qu'est-ce qui a changé pendant que je ne regardais pas ?

   Ce fichier fige la réponse pour chaque geste. Il échoue si un geste
   qui doit glisser saute — ET si un geste qui doit rester net se met à
   glisser. C'est ce second sens qui empêche l'animation de proliférer
   un « juste un petit fondu » à la fois.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* Des dates RELATIVES à aujourd'hui. Elles étaient écrites en dur
   (« 2026-08-1 » + i) : le jour où le calendrier les a dépassées,
   toutes sont tombées dans le passé, la tranche « Bientôt » a cessé
   d'exister, et le contrôle du dépliement a échoué sur un écran qui
   n'avait rien de cassé. Deuxième bombe de ce genre dans la série. */
const JOUR = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const PISTES = Array.from({ length: 7 }, (_, i) => ({
  id: 'p' + i,
  name: ['Sopra Steria', 'Airbus Defence', 'Cyberprotect', 'Capgemini', 'Thales SIX', 'Atos', 'Niji'][i],
  status: ['todo', 'contacted', 'reply'][i % 3], city: 'Toulouse', domain: 'esn',
  /* de −3 à +3 jours : en retard, aujourd'hui ET bientôt, toujours */
  nextAction: JOUR(i - 3), nextActionText: 'Relancer', notes: 'Note.',
  contacts: [{ id: 'c' + i, name: 'Nadia Berthier', role: 'RH', email: 'n@exemple.fr' }],
  updatedAt: 100 - i }));

/* Le film : on échantillonne image par image et on compte les états
   DIFFÉRENTS du départ et de l'arrivée. Le geste part APRÈS la première
   image — sinon il s'exécute de façon synchrone avant le premier rAF, le
   « départ » mesuré vaut déjà l'arrivée, et tout a l'air de sauter. */
const FILM = () => {
  window.__film = (sel, lire, go, ms = 560) => new Promise(res => {
    const vus = []; let t0 = 0, parti = false;
    const tick = () => {
      const n = typeof sel === 'function' ? sel() : document.querySelector(sel);
      vus.push(n ? String(lire(n)) : '∅');
      if (!parti){ parti = true; t0 = performance.now(); if (go) go(); }
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
      else res({ deb: vus[0], fin: vus[vus.length - 1],
                 inter: new Set(vus.filter(v => v !== vus[0] && v !== vus[vus.length - 1])).size });
    };
    requestAnimationFrame(tick);
  });
};

async function prepare(ctx){
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit(); await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    /* de quoi remplir le fil d'« Échanger » : dix échanges, donc deux
       de plus que le plafond de huit — sans eux « Voir les 2 autres »
       n'existe pas et le geste ne se joue pas */
    const j = Date.now();
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(
      Array.from({ length: 10 }, (_, i) => ({
        t: j - (i + 1) * 26e5,
        txt: i % 2 ? 'Donné (QR) : ' + (i + 1) + ' piste(s)'
                   : 'Reçu de Léa : +' + (i + 1) + ' piste(s)',
        ids: ['p0', 'p1']
      }))));
  }, PISTES);
  await p.reload({ waitUntil: 'load' });
  await attendre(p, async () => (await import('./ui/state.js')).S.companies.length === 7);
  await p.evaluate(FILM);
  return p;
}
const fermerTout = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js');
  let s; while ((s = topSheet())) s.close(null, true);
  await new Promise(r => setTimeout(r, 400));
});
const ouvrirFiche = async p => {
  await p.evaluate(async () => {
    const { openFiche } = await import('./ui/fiche.js');
    const { S } = await import('./ui/state.js');
    openFiche(S.companies[0]);
  });
  await p.waitForSelector('#fiNotes');
  await p.waitForTimeout(350);
};

/* nom · verdict attendu (« glisse » ou « net ») · le geste */
const GESTES = [
  ['Ouvrir une feuille', 'glisse', async p => {
    await p.evaluate(async () => {
      const { openFiche } = await import('./ui/fiche.js');
      const { S } = await import('./ui/state.js');
      openFiche(S.companies[0]);
    });
    return p.evaluate(() => window.__film('.overlay .modal',
      n => getComputedStyle(n).opacity.slice(0, 4) + '|' + getComputedStyle(n).translate));
  }],
  /* ② où est-ce parti ? Une expérience se retient par sa FIN, et la fin
     d'une feuille c'est sa fermeture — répétée des dizaines de fois par
     session. Elle s'évaporait. */
  ['Fermer une feuille', 'glisse', async p => {
    await ouvrirFiche(p);
    const m = await p.evaluateHandle(() => import('./ui/dom.js'));
    return p.evaluate(mod => window.__film('.overlay .modal',
      n => getComputedStyle(n).opacity.slice(0, 4) + '|' + getComputedStyle(n).translate,
      () => mod.topSheet().close(null, true)), m);
  }],
  ['Déplier une section', 'glisse', async p => {
    await p.evaluate(() => { location.hash = '#/aujourdhui'; });
    await p.waitForTimeout(500);
    return p.evaluate(() => {
      const d = document.querySelector('details.tr-soon') || document.querySelector('details');
      if (!d) return { deb: 'absent', fin: 'absent', inter: -1 };
      return window.__film(() => d, n => Math.round(n.getBoundingClientRect().height),
        () => d.querySelector('summary').click());
    });
  }],
  /* Le geste qui réorganise le plus la liste. Le mécanisme existait, le
     champ de recherche ne passait simplement pas par lui. */
  ['Chercher (les lignes se replacent)', 'glisse', async p => {
    await p.evaluate(() => { location.hash = '#/pistes'; });
    await p.waitForTimeout(500);
    return p.evaluate(() => window.__film(
      /* une ligne qui BOUGE vraiment : le FLIP ne pose une transformée
         que là où la place change. Viser « la première ligne » mesurait
         souvent une ligne immobile. */
      () => [...document.querySelectorAll('#piBody [data-id]')]
              .find(n => getComputedStyle(n).transform !== 'none')
            || document.querySelector('#piBody [data-id]'),
      n => getComputedStyle(n).transform,
      () => { const q = document.querySelector('#piQ');
              q.value = 'a'; q.dispatchEvent(new Event('input', { bubbles: true })); }));
  }],
  ['Le champ de notes qui grandit', 'glisse', async p => {
    await ouvrirFiche(p);
    return p.evaluate(() => window.__film('#fiNotes',
      n => Math.round(n.getBoundingClientRect().height), () => {
        const n = document.querySelector('#fiNotes');
        n.value = 'Une note assez longue pour tenir sur quatre lignes dans un champ de '
                + '352 px de large, histoire de voir la hauteur bouger pour de bon.';
        n.dispatchEvent(new Event('input', { bubbles: true }));
      }));
  }],
  /* ③ ce qui a changé pendant que la feuille le couvrait */
  ['La ligne modifiée se montre', 'glisse', async p => {
    await p.evaluate(() => { location.hash = '#/pistes'; });
    await p.waitForTimeout(500);
    await ouvrirFiche(p);
    /* changer le statut, confirmer, puis refermer */
    await p.evaluate(() => {
      document.querySelector('.seg3 .seg:not(.on)').click();
      [...document.querySelectorAll('.modal-f button')].find(b => /Confirmer/.test(b.textContent)).click();
    });
    await p.waitForTimeout(300);
    const m = await p.evaluateHandle(() => import('./ui/dom.js'));
    return p.evaluate(mod => window.__film('#piBody [data-id="p0"]',
      n => { const a = getComputedStyle(n, '::after');
             return a.animationName + '|' + Math.round(parseFloat(a.opacity) * 50); },
      () => mod.topSheet().close(null, true), 900), m);
  }],
  /* ② La barre Annuler est le seul objet du produit qui apparaît SANS
     qu'on l'ait demandé, et qui repart tout seul. Elle se posait en
     douceur puis s'évaporait d'un coup : une expérience se retient par
     sa fin, et la sienne n'existait pas. */
  ['Fermer la barre Annuler', 'glisse', async p => {
    await p.evaluate(async () => {
      const { showUndo } = await import('./ui/dom.js');
      showUndo('Test.', () => {});
      await new Promise(r => setTimeout(r, 300));
    });
    return p.evaluate(() => window.__film('.undo-bar',
      n => getComputedStyle(n).opacity.slice(0, 4) + '|' + getComputedStyle(n).transform.slice(-9),
      () => document.querySelector('.undo-bar .bar-x').click(), 400));
  }],

  /* ---- et ce qui doit RESTER NET ---- */
  /* Les objets gardent leur netteté « 98 » : un thème qui se fond serait
     une page entière en mouvement pour un réglage qu'on prend une fois. */
  /* ---- LE FIL DES ÉCHANGES ----
     Deux gestes, deux fois la même question : ① d'où ça vient ?
     Rien d'autre ne bouge sur cet écran, et le troisième cas ci-dessous
     est là pour le prouver — c'est le sens « net » qui empêche
     l'animation de proliférer un « juste un petit fondu » à la fois. */
  ['Déplier le fil des échanges', 'glisse', async p => {
    await p.evaluate(() => { location.hash = '#/echanger'; });
    await p.waitForSelector('#ecMore', { timeout: 8000 });
    await p.waitForTimeout(300);
    return p.evaluate(() => window.__film(
      /* la 9ᵉ ligne : elle n'existait pas avant le tap */
      () => document.querySelectorAll('.ec-l')[8] || null,
      n => Math.round(getComputedStyle(n).opacity * 100) + '|' + getComputedStyle(n).transform,
      () => document.querySelector('#ecMore').click()));
  }],
  /* Au poste seulement : tout le côté droit change d'un coup, à 500 px
     du doigt qui l'a causé. Sans mouvement, le changement n'est pas VU —
     et le lecteur d'écran était mieux servi que l'œil, puisque
     `annoncer()` le disait déjà. */
  ['Le panneau lu arrive (poste)', 'glisse', async p => {
    await p.setViewportSize({ width: 1280, height: 850 });
    await p.evaluate(() => { location.hash = '#/echanger'; });
    await p.waitForSelector('.ec-detail', { timeout: 8000 });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => window.__film('.ec-detail',
      n => Math.round(getComputedStyle(n).opacity * 100) + '|' + getComputedStyle(n).transform,
      () => document.querySelectorAll('.ec-row[data-fil]')[3].click()));
    await p.setViewportSize({ width: 390, height: 850 });
    return r;
  }],
  /* ET LA CONTRE-ÉPREUVE : la ligne retenue prend le navy du châssis
     D'UN COUP. C'est un OBJET, pas un déplacement — §4 les veut nets et
     instantanés. Si elle se met à fondre un jour, c'est ici que ça
     rougit. */
  ['La ligne retenue se peint (poste)', 'net', async p => {
    await p.setViewportSize({ width: 1280, height: 850 });
    await p.evaluate(() => { location.hash = '#/echanger'; });
    await p.waitForSelector('.ec-detail', { timeout: 8000 });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => window.__film(
      () => document.querySelectorAll('.ec-row[data-fil]')[2],
      n => getComputedStyle(n).backgroundColor,
      () => document.querySelectorAll('.ec-row[data-fil]')[2].click(), 400));
    await p.setViewportSize({ width: 390, height: 850 });
    return r;
  }],
  ['Basculer clair / sombre', 'net', async p => {
    const r = await p.evaluate(() => window.__film('body',
      n => getComputedStyle(n).backgroundColor,
      () => document.querySelector('#btnTheme').click(), 320));
    await p.evaluate(() => document.querySelector('#btnTheme').click());
    await p.waitForTimeout(200);
    return r;
  }],
  ['Un bouton qu’on enfonce', 'net', async p => {
    await p.evaluate(() => { location.hash = '#/pistes'; });
    await p.waitForTimeout(400);
    return p.evaluate(() => window.__film('#piBody [data-id] .ri-main',
      n => getComputedStyle(n.closest('[data-id]')).boxShadow.slice(0, 30),
      () => { const b = document.querySelector('#piBody [data-id]');
              b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, 300));
  }]
];

const pad = (s, n) => String(s).padEnd(n);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await prepare(ctx);
console.log(pad('GESTE', 36), pad('ATTENDU', 9), pad('MESURÉ', 14), 'DÉPART → ARRIVÉE');
for (const [nom, attendu, fn] of GESTES){
  let r;
  try { r = await fn(p); } catch (e) { fail(`${nom} : ${String(e).split('\n')[0].slice(0, 70)}`); continue; }
  const glisse = r.inter >= 3;
  const dit = r.inter < 0 ? 'introuvable' : (glisse ? 'glisse (' + r.inter + ')' : 'net (' + r.inter + ')');
  console.log(pad(nom, 36), pad(attendu, 9), pad(dit, 14),
    String(r.deb).slice(0, 22) + ' → ' + String(r.fin).slice(0, 22));
  if (attendu === 'glisse' && !glisse)
    fail(`« ${nom} » saute : ${r.inter} état(s) intermédiaire(s), ${r.deb} → ${r.fin}`);
  if (attendu === 'net' && r.inter > 1)
    fail(`« ${nom} » s'est mis à glisser (${r.inter} états) — le mouvement doit rester rare`);
  await fermerTout(p);
  await p.waitForTimeout(200);
}

/* ---- une sortie part DANS LE SENS du geste qui la cause ----
   Un mouvement n'est perçu comme CAUSÉ que s'il part sans délai et dans
   la même direction que le geste. Une barre poussée vers la droite qui
   s'en irait vers le bas se lit comme deux évènements sans rapport. */
{
  const sens = await p.evaluate(async () => {
    const { showUndo } = await import('./ui/dom.js');
    showUndo('Test.', () => {});
    await new Promise(r => setTimeout(r, 300));
    const bar = document.querySelector('.undo-bar');
    const b = bar.getBoundingClientRect();
    const y = b.top + b.height / 2;
    const jeter = (type, cx) => {
      const t = new Touch({ identifier: 3, target: bar, clientX: cx, clientY: y });
      const fini = type === 'touchend' || type === 'touchcancel';
      bar.dispatchEvent(new TouchEvent(type,
        { touches: fini ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }));
    };
    const x = b.left + b.width / 2;
    jeter('touchstart', x); jeter('touchmove', x + 40); jeter('touchmove', x + 90);
    jeter('touchend', x + 90);
    await new Promise(r => setTimeout(r, 60));
    /* le style EN LIGNE : le calculé rend encore l'ancienne valeur */
    return bar.style.transform;
  });
  const versLaDroite = /calc\(-50% \+ (\d+)px\)/.test(sens);
  if (!versLaDroite)
    fail(`la barre balayée vers la droite ne part pas vers la droite (transform « ${sens} ») — `
      + 'une sortie qui ignore le geste ne se lit pas comme causée par lui');
  else console.log(`Barre balayée à droite            sens      droite         ${sens}`);
  await p.evaluate(() => document.querySelector('.undo-bar')?.remove());
}
await ctx.close();

/* ---- mouvement réduit : TOUT devient net ---- */
/* Une préférence système, pas un confort : les animations déclenchent
   nausées et vertiges chez les personnes sensibles au mouvement. */
const rCtx = await browser.newContext({ viewport: { width: 390, height: 844 },
  hasTouch: true, reducedMotion: 'reduce' });
const rp = await prepare(rCtx);
await ouvrirFiche(rp);
const mr = await rp.evaluateHandle(() => import('./ui/dom.js'));
const sortie = await rp.evaluate(mod => window.__film('.overlay .modal',
  n => getComputedStyle(n).opacity.slice(0, 4) + '|' + getComputedStyle(n).translate,
  () => mod.topSheet().close(null, true), 400), mr);
if (sortie.inter > 1) fail(`mouvement réduit : la feuille glisse quand même (${sortie.inter} états)`);
/* et elle doit VRAIMENT partir, pas rester collée */
await rp.waitForTimeout(300);
const reste = await rp.$('.overlay');
if (reste) fail('mouvement réduit : la feuille n’a pas quitté le document');
else console.log('mouvement réduit : la feuille part net, et elle part vraiment ✓');
await rCtx.close();

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E mouvement : ÉCHEC' : 'E2E mouvement : OK');
