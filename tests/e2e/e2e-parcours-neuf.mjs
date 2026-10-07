/* E2E parcours d'un profil NEUF (première ouverture) : ce qu'aucun autre
   scénario ne joue en entier — l'app vide qui enseigne, la toute première
   capture faite à la main, et sa survie au rechargement. Mobile ET bureau.
   (Le hors-ligne réel est couvert par e2e-oauth-sw ; le thème sombre par
   e2e-pistes — ici on ne les redouble pas.) */
import { chromium, chromiumPath, SHOTS, serveRepo, attendre, annuaireMuetPartout } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
/* le nom d'une entreprise tapé dans la capture se propose depuis
   l'annuaire (ui/nom-annuaire.js) : réponse vide ici, sinon la vraie
   requête part et le bac à sable la refuse en erreur console */
annuaireMuetPartout(browser);
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];
const watch = p => {
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push(String(e)));
};
const closeSheets = p => p.evaluate(async () => {
  const { topSheet } = await import('./ui/dom.js');
  let s; let n = 0;
  while ((s = topSheet()) && n++ < 5){ s.close(null, true); await new Promise(r => setTimeout(r, 120)); }
});

/* ---------- mobile : première ouverture, tout est vide ---------- */
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const M = await mob.newPage();
watch(M);
await M.goto(base, { waitUntil: 'load' });
await M.waitForSelector('#view-aujourdhui:not([hidden])');

/* Aujourd'hui vide DOIT enseigner, jamais un « aucune donnée » sec (CLAUDE §6) */
const tdEmpty = await M.textContent('#view-aujourdhui .td-empty').catch(() => '');
if (!/quoi faire|un jour à la fois/i.test(tdEmpty))
  fail('Aujourd’hui vide n’enseigne pas : ' + JSON.stringify(tdEmpty));
else console.log('Aujourd’hui vide : état enseignant ✓');
await M.screenshot({ path: SHOTS + '/parcours-neuf-aujourdhui.png' });

/* Mes pistes vide : même exigence */
await M.click('.bottomnav a[data-r="pistes"]');
await M.waitForSelector('#view-pistes:not([hidden])');
/* l'écran de Mes pistes, pas le premier `.td-empty` du document : les
   deux vues vivent dans la page, et ce contrôle lisait celui
   d'« Aujourd'hui » — il ne passait que parce que ce dernier disait
   « première piste ». Un faux vert, trouvé en changeant un mot. */
const piEmpty = await M.textContent('#view-pistes .td-empty, #view-pistes .empty-list').catch(() => '');
if (!/Aucune piste|Ajoute une piste/i.test(piEmpty))
  fail('Mes pistes vide n’enseigne pas : ' + JSON.stringify(piEmpty));
else console.log('Mes pistes vide : état enseignant ✓');

/* ---------- L'APP NEUVE AU PLUS DUR : 320 px, texte doublé ----------
   C'est le tout premier écran d'un étudiant, et c'était l'angle mort
   de tous les autres balayages : ils SÈMENT des données, donc aucun ne
   voit jamais l'app vide. Le corollaire vaut ici plus qu'ailleurs — un
   contrôle ne garde que les états qu'il met en place.
   Les quatre écrans, sans une seule piste, à 320 × 640 et 200 % : rien
   ne doit se perdre, rien ne doit déborder, et le doigt doit garder ses
   44 px. Mesuré propre avant d'être gardé ; ce qui suit empêche la
   première impression de se dégrader sans qu'on le voie. */
{
  const nCtx = await browser.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true });
  const N = await nCtx.newPage();
  watch(N);
  await N.goto(base, { waitUntil: 'load' });      /* aucune graine : app neuve */
  await N.waitForSelector('#view-aujourdhui:not([hidden])');
  await N.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  /* la barre d'onglets est une limite ASSUMÉE (CLAUDE.md §4, tranchée
     par le mainteneur le 21 août 2026) : son libellé s'élide, et son
     nom entier vit dans l'`aria-label`. Elle ne compte donc pas ici. */
  const EXC = ['bn-l', 'rg-s', 'obj-l', 'pk-s', 'act-do', 'o-sub', 'ri-sub', 'fi-sub',
               'ctc-sub', 'ec-when', 'pk-m', 'mh-t'];
  const durs = []; let sondeVue = null; let ecrans = 0;
  for (const r of ['aujourdhui', 'pistes', 'echanger', 'moi']){
    await N.evaluate(x => { location.hash = '#/' + x; }, r);
    await N.waitForTimeout(500);
    /* LA SONDE SE VÉRIFIE : on plante une boîte trop étroite pour son
       texte et on exige qu'elle soit vue. Sans ça, restreindre le
       balayage le rendrait aveugle sans jamais rougir. */
    if (sondeVue === null){
      await N.evaluate(() => {
        const d = document.createElement('div');
        d.id = 'sondeVide'; d.textContent = 'un texte bien trop long pour cette boîte';
        d.style.cssText = 'position:fixed;left:0;bottom:0;width:30px;height:14px;'
          + 'overflow:hidden;white-space:nowrap;z-index:9999';
        document.body.append(d);
      });
      sondeVue = await N.evaluate(() => {
        const d = document.getElementById('sondeVide');
        return d.scrollWidth > d.clientWidth + 1;
      });
      await N.evaluate(() => { document.getElementById('sondeVide')?.remove(); });
    }
    const m = await N.evaluate(EXC => {
      const perdus = [], petites = [];
      for (const e of document.querySelectorAll('body *')){
        const b = e.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if (e.closest('[hidden], [aria-hidden="true"], .ov-out')) continue;
        if (/^(TEXTAREA|SELECT|INPUT)$/.test(e.tagName)) continue;
        const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/) : [];
        const q = e.id ? '#' + e.id : (cls[0] ? '.' + cls[0] : e.tagName);
        const t = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
        const cs = getComputedStyle(e);
        const propre = [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
        if (propre){
          const x = e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(cs.overflowX);
          const y = e.scrollHeight > e.clientHeight + 1 && /hidden|clip/.test(cs.overflowY);
          if ((x || y) && !EXC.some(k => cls.includes(k)))
            perdus.push(`${q} perd ${x ? e.scrollWidth - e.clientWidth : e.scrollHeight - e.clientHeight}px « ${t} »`);
        } else if (/hidden|clip/.test(cs.overflowY) && e.scrollHeight - e.clientHeight > 1){
          perdus.push(`${q} écrase son contenu de ${e.scrollHeight - e.clientHeight}px « ${t} »`);
        }
      }
      const INTER = 'button, a[href], [role="button"], [tabindex="0"], summary, label';
      for (const n of document.querySelectorAll(INTER)){
        const b = n.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if (n.closest('[hidden], [aria-hidden="true"], .ov-out')) continue;
        if (n.tagName === 'A' && n.closest('p, .hint, .fk-v')) continue;
        if (b.height < 44 || b.width < 44)
          petites.push(`${Math.round(b.width)}×${Math.round(b.height)} `
            + (n.id ? '#' + n.id : (typeof n.className === 'string' && n.className.trim()
               ? '.' + n.className.trim().split(/\s+/)[0] : n.tagName)));
      }
      return { perdus, petites, deborde: Math.round(document.documentElement.scrollWidth - innerWidth),
               enseigne: (document.querySelector('.view:not([hidden])')?.textContent || '')
                 .replace(/\s+/g, ' ').trim().length };
    }, EXC);
    ecrans++;
    if (m.deborde > 1) durs.push(`${r} : la page déborde de ${m.deborde}px`);
    for (const x of m.perdus) durs.push(`${r} · ${x}`);
    for (const x of m.petites) durs.push(`${r} · cible ${x}`);
    /* un écran vide qui n'a RIEN à dire est le défaut que §6 nomme :
       « l'état vide enseigne le produit, jamais un simple aucune donnée » */
    if (m.enseigne < 60) durs.push(`${r} : l'écran vide ne dit presque rien (${m.enseigne} caractères)`);
  }
  if (!sondeVue)
    fail('app neuve : la sonde plantée (un texte trop long dans une boîte de 30px) n’a pas été vue — '
      + 'le balayage ne mesure plus rien');
  else if (ecrans < 4)
    fail(`app neuve : ${ecrans} écrans mesurés au lieu de 4`);
  else if (durs.length)
    fail(`app neuve à 320 px et 200 % : ${durs.length} défaut(s) —\n      ` + durs.join('\n      '));
  else console.log('app neuve à 320 px et 200 % : les 4 écrans vides enseignent, '
    + 'rien ne se perd, le doigt garde ses 44 px ✓');
  await nCtx.close();
}

/* première capture — deux blocs (#7) : l'entreprise + le contact, ensemble.
   Depuis « Aujourd'hui », là où l'app neuve la propose : c'est l'état
   où le toast s'étirait (voir plus bas), et on ne garde que les états
   qu'on met en place. */
await M.click('.bottomnav a[data-r="aujourdhui"]');
await M.waitForSelector('#view-aujourdhui:not([hidden])');
await M.click('#bnAdd');
await M.waitForSelector('#cpName');
/* le bouton dit le GESTE : il enregistre et laisse la feuille ouverte.
   « Suivant » faisait attendre une étape 2 (1er octobre 2026). */
{
  const mot = (await M.textContent('.overlay .modal-f .btn-primary') || '').trim();
  if (mot !== 'Ajouter') fail('au pouce, la capture doit dire « Ajouter » : ' + JSON.stringify(mot));
}
await M.fill('#cpName', 'Boulangerie Cyber SARL');
await M.fill('#cpCtName', 'Sam Roubaix');
await M.fill('#cpCtCoord', 'sam@boulangeriecyber.fr');
await M.click('.overlay .btn-primary');           /* Ajouter (rafale : reste ouvert) */
await attendre(M, async () => (await import('./ui/state.js')).S.companies.length === 1,
  { timeout: 8000, message: 'première capture' });

/* ---------- LE TOAST NE S'ÉTIRE JAMAIS ----------
   Photographié le 30 septembre 2026 en jouant ce parcours-ci : juste
   après la toute première piste, « ✓ … ajoutée » devenait une colonne
   de 641 px, du haut de l'écran jusqu'au pied, POSÉE SUR LES CHAMPS où
   l'on tape la piste suivante. Deux règles se contredisaient : la
   feuille ancre le toast en HAUT (`bottom:auto`), la ligne du pied
   d'« Aujourd'hui » le remontait par le BAS — et son sélecteur, qui
   porte un id, gagnait. Haut et bas posés ensemble, la boîte s'étire
   entre les deux. L'avertissement de sauvegarde faisait la même faute,
   dans l'autre sens.
   On vise la CAUSE : une boîte plus haute que son texte. Et on la
   mesure dans chaque état qui déplace le toast — c'est la combinaison
   de deux états qui cassait, pas l'un ou l'autre. */
const toastEtire = async (p, etat) => p.evaluate(async etat => {
  const { toast, showUndo, openSheet, topSheet } = await import('./ui/dom.js');
  const attente = ms => new Promise(r => setTimeout(r, ms));
  const warn = document.getElementById('saveWarn');
  if (etat.undo) showUndo('Sonde retirée', () => {});
  if (etat.warn && warn) warn.hidden = false;
  const sh = etat.feuille && !topSheet() ? openSheet({ title: 'Sonde' }) : null;
  await attente(80);
  toast('Sonde ' + etat.nom);
  await attente(60);
  const t = document.getElementById('toast');
  const r = document.createRange(); r.selectNodeContents(t);
  const mesure = { boite: Math.round(t.getBoundingClientRect().height),
                   texte: Math.round(r.getBoundingClientRect().height) };
  if (sh) sh.close(null, true);
  if (etat.warn && warn) warn.hidden = true;
  document.querySelector('.undo-bar')?.remove();
  await attente(120);
  return mesure;
}, etat);
const etire = m => m.boite > m.texte + 30;   /* 2 × 8 px de marge, 2 px de bord, du jeu */
{
  /* ① l'état d'origine, tel qu'il arrive : la feuille de capture encore
     ouverte, le vrai toast du vrai geste, la ligne du pied posée (elle
     arrive au rendu qui suit l'ajout — on l'attend, sans quoi on
     mesurerait l'écran d'avant) */
  await attendre(M, () => !!document.querySelector('#view-aujourdhui .td-under'),
    { timeout: 3000, message: 'la ligne du pied d’Aujourd’hui' }).catch(() => {});
  const reel = await M.evaluate(() => {
    const t = document.getElementById('toast');
    const r = document.createRange(); r.selectNodeContents(t);
    return { boite: Math.round(t.getBoundingClientRect().height),
             texte: Math.round(r.getBoundingClientRect().height),
             pied: !!document.querySelector('#view-aujourdhui .td-under'),
             on: t.classList.contains('on') };
  });
  const durs = [];
  if (!reel.on || !reel.pied)
    fail(`toast : l'état d'origine n'est plus en place (toast ${reel.on ? 'visible' : 'absent'}, `
      + `pied ${reel.pied ? 'posé' : 'absent'}) — la mesure ne verrait rien`);
  else if (etire(reel)) durs.push(`après la première piste : ${reel.boite}px pour ${reel.texte}px de texte`);
  /* ② chaque état qui déplace le toast, seul puis combiné */
  const ETATS = [
    { nom: 'seul' }, { nom: 'feuille', feuille: true },
    { nom: 'annuler', undo: true }, { nom: 'annuler+feuille', undo: true, feuille: true },
    { nom: 'sauvegarde', warn: true }, { nom: 'sauvegarde+feuille', warn: true, feuille: true }];
  await closeSheets(M);
  for (const e of ETATS){
    const m = await toastEtire(M, e);
    if (etire(m)) durs.push(`pouce · ${e.nom} : ${m.boite}px pour ${m.texte}px de texte`);
  }
  /* ③ la sonde : un toast qu'on étire exprès DOIT être vu, sinon le
     critère ne mesure plus rien et resterait vert pour toujours */
  const sonde = await M.evaluate(async () => {
    const { toast } = await import('./ui/dom.js');
    toast('Sonde étirée');
    const t = document.getElementById('toast');
    t.style.top = '62px'; t.style.bottom = '141px';
    await new Promise(r => setTimeout(r, 60));
    const r = document.createRange(); r.selectNodeContents(t);
    const m = { boite: Math.round(t.getBoundingClientRect().height),
                texte: Math.round(r.getBoundingClientRect().height) };
    t.style.top = ''; t.style.bottom = '';
    return m;
  });
  if (!etire(sonde)) fail('toast : la sonde étirée exprès n’est pas vue — le critère ne mesure plus rien');
  else if (durs.length) fail(`le toast s'étire : ${durs.length} état(s) —\n      ` + durs.join('\n      '));
  else console.log(`toast : jamais plus haut que son texte, dans ${ETATS.length + 1} états au pouce, sonde vue ✓`);
  /* on rouvre la capture pour la suite du parcours, comme on l'avait laissée */
  await M.click('#bnAdd');
  await M.waitForSelector('#cpName');
}
const withCt = await M.evaluate(async () =>
  (await import('./ui/state.js')).S.companies[0].contacts.map(t => t.email));
if (String(withCt) !== 'sam@boulangeriecyber.fr') fail('le contact saisi doit suivre la piste : ' + withCt);
await closeSheets(M);
await M.waitForSelector('.overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
console.log('Première capture : piste + contact créés d’un seul geste ✓');

/* elle s'affiche dans la liste */
await M.click('.bottomnav a[data-r="pistes"]');
await M.waitForSelector('#view-pistes:not([hidden])');
const listed = await M.evaluate(() =>
  [...document.querySelectorAll('#piBody h3, #piBody b')].some(n => /Boulangerie Cyber/.test(n.textContent)));
if (!listed) fail('la piste capturée n’apparaît pas dans Mes pistes');
else console.log('La piste capturée s’affiche dans Mes pistes ✓');

/* persistance : elle survit à un rechargement (IndexedDB, pas la mémoire) */
await M.reload({ waitUntil: 'load' });
await attendre(M, async () => (await import('./ui/state.js')).S.companies.some(c => /Boulangerie Cyber/.test(c.name)),
  { timeout: 8000, message: 'persistance après rechargement' });
console.log('La piste survit au rechargement ✓');

/* ---------- LE PREMIER MAIL NE PART JAMAIS CASSÉ ----------
   Joué le 30 septembre 2026, profil vide, depuis « Aujourd'hui » : le
   brouillon disait « [Une phrase précise…] », « Je suis en et je
   cherche un stage », et n'avait pas de signature. « Ouvrir dans Mail »
   l'envoyait d'un tap. C'est le premier contact de l'étudiant avec un
   recruteur, et aucun scénario ne l'avait joué avec un profil VIDE —
   tous le remplissaient d'abord. On ne garde que les états qu'on met en
   place (§5). Ici : le vrai bouton, le vrai profil vide. */
{
  await M.click('.bottomnav a[data-r="aujourdhui"]');
  await M.waitForSelector('#view-aujourdhui:not([hidden]) .act-start [data-a="mail"]');
  await M.click('#view-aujourdhui .act-start [data-a="mail"]');
  await M.waitForSelector('#mBody');
  /* le mail ne doit pas partir pour de vrai pendant le scénario */
  await M.evaluate(() => document.addEventListener('click', e => {
    if (e.target.closest('a[href^="mailto:"]')) e.preventDefault();
  }, true));
  const lire = () => M.evaluate(async () => {
    const t = document.getElementById('mBody');
    const { S } = await import('./ui/state.js');
    return {
      corps: t.value,
      erreur: !document.getElementById('mTrou').hidden,
      focus: document.activeElement === t,
      choix: t.value.slice(t.selectionStart, t.selectionEnd),
      pied: [...document.querySelectorAll('.overlay .modal-f .btn')].map(b => b.textContent.trim()),
      prepare: (S.companies[0].history || []).some(h => /Email préparé/.test(h.t))
    };
  });
  const avant = await lire();
  const durs = [];
  /* ① les deux manques qui rendent le mail faux se VOIENT, à leur place */
  if (!avant.corps.includes('Je suis en [ta formation] et je cherche'))
    durs.push('la formation manquante ne se voit pas : ' + JSON.stringify(avant.corps.split('\n')[4]));
  if (!/Bien à vous,\n\[ton nom\]$/.test(avant.corps))
    durs.push('la signature manquante ne se voit pas : ' + JSON.stringify(avant.corps.slice(-40)));
  /* ② les deux sorties refusent, sans rien noter au journal. « Copier »
     d'abord : un mail qui partirait à tort ferait basculer le pied, et
     « Copier » n'y serait plus — la faute doit se NOMMER, pas finir en
     délai dépassé (une mutation l'a montré). */
  for (const [nom, sel] of [['Copier', '.overlay .modal-f button.btn'], ['Ouvrir dans Mail', '.overlay .modal-f a.btn']]){
    await M.evaluate(() => { document.getElementById('mBody').blur(); document.getElementById('mTrou').hidden = true; });
    const bouton = M.locator(sel).filter({ hasText: nom });
    if (!(await bouton.count())){
      durs.push(`« ${nom} » a quitté le pied (${JSON.stringify((await lire()).pied)}) — un geste précédent est parti`);
      continue;
    }
    await bouton.click();
    await M.waitForTimeout(250);
    const x = await lire();
    if (!x.erreur) durs.push(`« ${nom} » avec des crochets : aucune erreur sous le message`);
    if (!x.focus || !/^\[Une phrase précise/.test(x.choix))
      durs.push(`« ${nom} » : le premier crochet n'est pas sélectionné (${JSON.stringify(x.choix.slice(0, 30))})`);
    if (x.prepare) durs.push(`« ${nom} » : un mail qui n'est pas parti s'est noté « Email préparé »`);
    if (x.pied.includes('Envoyée ✓')) durs.push(`« ${nom} » : le pied est passé à « Envoyée ✓ » alors que rien n'est parti`);
  }
  /* ③ l'étudiant écrit son accroche SUR la sélection, puis complète son
     profil depuis le composeur : l'accroche doit survivre */
  await M.keyboard.type('Votre SOC pour les boulangeries m’a donné envie d’écrire.');
  await M.click('#mProfil');
  await M.waitForSelector('#pfName');
  await M.fill('#pfName', 'Sam Martin');
  await M.fill('#pfFormation', 'BTS SIO 2e année');
  await M.locator('.overlay .modal-f .btn-primary').filter({ hasText: 'Enregistrer' }).last().click();
  await M.waitForSelector('#pfName', { state: 'detached', timeout: 5000 }).catch(() => {});
  await M.waitForTimeout(300);
  const apres = await lire();
  if (!apres.corps.includes('Votre SOC pour les boulangeries'))
    durs.push('compléter son profil a effacé l’accroche que l’on venait d’écrire');
  if (!apres.corps.includes('Je suis en BTS SIO 2e année et je cherche') || !/Sam Martin$/.test(apres.corps))
    durs.push('les trous ne se sont pas remplis avec le profil : ' + JSON.stringify(apres.corps.slice(-60)));
  if (apres.erreur) durs.push('l’erreur reste affichée alors qu’il n’y a plus aucun crochet');
  /* ④ plus un crochet : le mail part */
  await M.locator('.overlay .modal-f a.btn').filter({ hasText: 'Ouvrir dans Mail' }).click();
  await M.waitForTimeout(300);
  const parti = await lire();
  if (!parti.prepare || !parti.pied.includes('Envoyée ✓'))
    durs.push('sans crochet, « Ouvrir dans Mail » ne part plus : ' + JSON.stringify(parti.pied));
  if (durs.length) fail(`premier mail, profil vide : ${durs.length} défaut(s) —\n      ` + durs.join('\n      '));
  else console.log('premier mail : les manques se voient, rien ne part avec un crochet, '
    + 'le profil complété remplit les trous sans toucher à l’accroche ✓');

  /* ---------- APRÈS L'ENVOI : la relance conseillée, et l'agenda ----------
     Joué le 30 septembre 2026 : on fermait « Envoyé ✓ — et ensuite ? »,
     rien n'était prévu, et la piste revenait dans « Par où commencer »
     avec l'icône mail. La relance à 7 jours tient maintenant le pied, et
     la case « Me le rappeler dans mon agenda » fait sonner le téléphone
     — une app web ne le peut pas seule (§10). */
  const suite = [];
  await M.evaluate(() => { window.__agenda = []; window.open = u => { window.__agenda.push(u); return null; }; });
  await M.locator('.overlay .modal-f .btn').filter({ hasText: 'Envoyée ✓' }).click();
  await M.waitForSelector('#naAgenda');
  const pied = await M.evaluate(() =>
    [...document.querySelectorAll('.overlay:last-of-type .modal-f .btn')].map(b => b.textContent.trim()));
  if (String(pied) !== 'Dans 7 jours') suite.push('le pied ne propose pas la relance conseillée : ' + JSON.stringify(pied));
  await M.check('#naAgenda');
  /* sans la relance conseillée, on prend la puce « +7 jours » : le reste
     se mesure quand même, et la faute du pied reste NOMMÉE au lieu de
     finir en délai dépassé (une mutation l'a montré) */
  if (String(pied) === 'Dans 7 jours') await M.locator('.overlay:last-of-type .modal-f .btn-primary').click();
  else await M.locator('.overlay:last-of-type .dchip-d').filter({ hasText: '+7 jours' }).click();
  await M.waitForTimeout(400);
  const r = await M.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    const c = S.companies[0];
    const j = new Date(); j.setDate(j.getDate() + 7);
    const attendu = j.getFullYear() + '-' + String(j.getMonth() + 1).padStart(2, '0') + '-' + String(j.getDate()).padStart(2, '0');
    return { next: c.nextAction, attendu, txt: c.nextActionText, flag: !!(S.profile.flags || {}).rappelAgenda, agenda: window.__agenda };
  });
  if (r.next !== r.attendu) suite.push(`« Dans 7 jours » a prévu le ${r.next}, pas le ${r.attendu}`);
  if (!/^Relancer/.test(r.txt || '')) suite.push('la relance prévue a perdu son verbe : ' + JSON.stringify(r.txt));
  const lien = r.agenda.length === 1 ? new URL(r.agenda[0]) : null;
  if (!lien || lien.hostname !== 'calendar.google.com'
      || lien.searchParams.get('dates') !== r.attendu.replace(/-/g, '') + 'T090000/' + r.attendu.replace(/-/g, '') + 'T091500'
      || !/Relancer.*Boulangerie Cyber/.test(lien.searchParams.get('text') || ''))
    suite.push('l’agenda ne reçoit pas le bon rappel : ' + JSON.stringify(r.agenda));
  if (!r.flag) suite.push('la case de l’agenda ne se souvient pas d’une fois sur l’autre');
  if (suite.length) fail(`après l'envoi : ${suite.length} défaut(s) —\n      ` + suite.join('\n      '));
  else console.log('après l’envoi : « Dans 7 jours » sous le pouce, le rappel part dans l’agenda, la case s’en souvient ✓');
  await closeSheets(M);
}

/* ---------- SUR IPHONE, LE RAPPEL EST UN FICHIER .ics ----------
   L'agenda d'Apple ouvre un .ics, celui d'Android non : la forme se
   décide d'après l'appareil, pas par une question. On joue la même
   case avec l'identité d'un iPhone et on lit le fichier téléchargé. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const I = await ctx.newPage();
  watch(I);
  await I.goto(base, { waitUntil: 'load' });
  await I.waitForSelector('#view-aujourdhui:not([hidden])');
  await I.evaluate(async () => {
    const { S, saveData } = await import('./ui/state.js');
    const { normalizeCompany } = await import('./engine/model.js');
    S.companies = [normalizeCompany({ name: 'Aztek', nextAction: '2026-12-01', nextActionText: 'Relancer Marc' })];
    saveData();
    (await import('./ui/actions.js')).reportAction(S.companies[0]);
  });
  await I.waitForSelector('#rpAgenda');
  await I.check('#rpAgenda');
  const dl = I.waitForEvent('download', { timeout: 6000 }).catch(() => null);
  await I.locator('.overlay .dchip-d').first().click();
  const d = await dl;
  const ics = d ? (await import('fs')).readFileSync(await d.path(), 'utf8') : '';
  if (!d) fail('sur iPhone, « Reporter » avec la case cochée ne donne aucun fichier .ics');
  else if (!/^BEGIN:VCALENDAR\r\n/.test(ics) || !/SUMMARY:Relancer Marc — Aztek/.test(ics) || !/TRIGGER:PT0M/.test(ics)
           || !/\.ics$/.test(d.suggestedFilename()))
    fail('le fichier .ics de l’iPhone n’est pas le bon rappel : ' + JSON.stringify(ics.slice(0, 200)));
  else console.log(`sur iPhone : « Reporter » donne ${d.suggestedFilename()}, avec son alarme ✓`);
  await ctx.close();
}

/* ---------- bureau neuf : l'exemple enseigne aussi ---------- */
const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const D = await desk.newPage();
watch(D);
await D.goto(base, { waitUntil: 'load' });
await D.waitForSelector('#view-aujourdhui:not([hidden])');
/* « Voir un exemple » pose de vraies pistes de démo, supprimables */
await D.evaluate(async () => {
  const { addDemo } = await import('./ui/state.js');
  addDemo();
  (await import('./ui/state.js')).bus.refresh?.();
});
await attendre(D, async () => (await import('./ui/state.js')).S.companies.some(c => c.demo),
  { timeout: 6000, message: 'pistes d’exemple' });
console.log('Bureau neuf : les pistes d’exemple se posent ✓');
await D.screenshot({ path: SHOTS + '/parcours-neuf-bureau-demo.png' });
{
  /* le toast, au poste aussi : ses règles d'ancrage ne sont pas les
     mêmes qu'au pouce, et c'est la combinaison qui casse */
  const durs = [];
  for (const e of [{ nom: 'seul' }, { nom: 'feuille', feuille: true },
    { nom: 'annuler+feuille', undo: true, feuille: true },
    { nom: 'sauvegarde', warn: true }, { nom: 'sauvegarde+feuille', warn: true, feuille: true }]){
    const m = await toastEtire(D, e);
    if (etire(m)) durs.push(`poste · ${e.nom} : ${m.boite}px pour ${m.texte}px de texte`);
  }
  if (durs.length) fail(`le toast s'étire au poste —\n      ` + durs.join('\n      '));
  else console.log('toast : jamais plus haut que son texte au poste non plus ✓');
}

/* ---------- capture au bureau : le formulaire complet (#3) ---------- */
await D.click('#btnAddTop');
await D.waitForSelector('#edName');
if (await D.$('#cpName')) fail('le bureau ne sert plus le mini-formulaire du pouce');
const pied = await D.evaluate(() =>
  [...document.querySelectorAll('.overlay .modal-f .btn')].map(b => b.textContent.trim()));
if (String(pied) !== 'Terminer') fail('un seul bouton attendu au bureau : ' + JSON.stringify(pied));
for (const [sel, val] of [['#edName', 'Boulangerie Cyber SARL'], ['#edCity', 'Roubaix'],
  ['#edTechs', 'SOC, Linux'], ['#cpCtName', 'Sam Roubaix'], ['#cpCtCoord', 'sam@boulangeriecyber.fr']])
  await D.fill(sel, val);
await D.selectOption('#edDomain', 'cyber');
await D.click('.overlay .dchip');                 /* un poste recherché */
await D.screenshot({ path: SHOTS + '/parcours-neuf-capture-bureau.png' });
await D.click('.overlay .modal-f .btn-primary');
await attendre(D, async () =>
  (await import('./ui/state.js')).S.companies.some(c => c.name === 'Boulangerie Cyber SARL'),
  { timeout: 6000, message: 'capture au bureau' });
const neuve = await D.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  const c = S.companies.find(x => x.name === 'Boulangerie Cyber SARL') || {};
  return { city: c.city, domain: c.domain, techs: c.techs, pos: c.positions,
           ct: (c.contacts || []).map(t => t.email), reste: !!document.querySelector('.overlay:not(.ov-out)') };
});
if (neuve.city !== 'Roubaix' || neuve.domain !== 'cyber' || neuve.techs !== 'SOC, Linux')
  fail('les champs complets ne suivent pas la piste : ' + JSON.stringify(neuve));
if (!(neuve.pos || []).length) fail('les postes recherchés ne suivent pas : ' + JSON.stringify(neuve.pos));
if (String(neuve.ct) !== 'sam@boulangeriecyber.fr') fail('le contact ne suit pas : ' + neuve.ct);
if (neuve.reste) fail('au bureau, « Terminer » ferme — pas de rafale');
console.log('Capture au bureau : formulaire complet, un seul bouton, tout est retenu ✓');

/* ---------- écrire : l'accroche d'abord, la matière sous les yeux ----------
   Mesuré avant : l'accroche personnalisée était en 3ᵉ position sur 5,
   derrière « l'activité de X a retenu toute mon attention » — l'accroche
   générique que l'APEC et JobTeaser citent comme à éviter. Et la matière
   pour l'écrire vivait sur la FICHE, derrière cette feuille.
   Les deux chiffres qui justifient le lot : un corps personnalisé répond
   ~33 % plus, une accroche nourrie de recherche fait passer les réponses
   de ~7 % à ~17 %. */
const ecrire = await D.evaluate(async () => {
  const { S, saveData, saveProfile } = await import('./ui/state.js');
  const { normalizeCompany, defaultTemplates } = await import('./engine/model.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  S.profile.name = 'Maheydine Oun';
  S.profile.formation = 'BTS SIO';
  S.profile.email = 'm@x.test';
  /* le profil doit être COMPLET : une ligne « Étiquette : {{jeton}} »
     dont le jeton est vide disparaît (c'est voulu), et un profil creux
     amputerait le gabarit — le compte de mots ne mesurerait alors plus
     le gabarit mais le trou. Une mutation l'a montré. */
  S.profile.phone = '06 39 98 12 34';
  S.profile.cvUrl = 'https://cv.test/moi.pdf';
  S.profile.templates = defaultTemplates();
  saveProfile();
  const lire = async piste => {
    document.querySelectorAll('.overlay .x').forEach(x => x.click());
    await new Promise(r => setTimeout(r, 200));
    S.companies = [normalizeCompany(piste)];
    saveData();
    const { openMail } = await import('./ui/mail.js');
    openMail(S.companies[0], { ctId: S.companies[0].contacts[0].id });
    await new Promise(r => setTimeout(r, 350));
    const corps = document.getElementById('mBody');
    const sav = document.querySelector('.ml-know');
    const msg = document.querySelector('.fld-body');
    return {
      objet: document.getElementById('mSubj').value,
      corps: corps.value,
      savoir: sav ? sav.innerText.replace(/\s+/g, ' ').trim() : '',
      /* la matière doit être AU-DESSUS du champ où l'on écrit, et les
         deux visibles ensemble : lire ailleurs et retenir, c'est le
         travail qu'on essaie justement d'épargner */
      avant: sav ? sav.getBoundingClientRect().bottom <= msg.getBoundingClientRect().top + 1 : null,
      ecart: sav ? Math.round(msg.getBoundingClientRect().top - sav.getBoundingClientRect().bottom) : null
    };
  };
  return {
    riche: await lire({ name: 'Adrastia Systèmes', city: 'Toulouse',
      desc: 'SOC managé pour les PME', techs: 'Fortinet, Linux',
      tips: 'passer par le forum', website: 'adrastia.example',
      process: 'CV → RH → test', contacts: [{ name: 'Nadia', email: 'n@a.test' }] }),
    siteSeul: await lire({ name: 'Velmont', website: 'velmont.example',
      contacts: [{ name: 'Marc', email: 'm@v.test' }] }),
    rien: await lire({ name: 'Ostral', contacts: [{ name: 'X', email: 'x@o.test' }] })
  };
});

/* ① l'accroche est le PREMIER bloc après le bonjour */
const blocs = ecrire.riche.corps.split(/\n\n+/);
if (!/^\[/.test((blocs[1] || '').trim()))
  fail('l’accroche personnalisée n’est pas le premier bloc : ' + JSON.stringify(blocs.slice(0, 2)));
/* ② et le modèle ne souffle plus l'accroche générique à éviter */
else if (/retenu toute mon attention|votre entreprise m['’]intéresse/i.test(
           ecrire.riche.corps.replace(/\[[^\]]*\]/g, '')))
  fail('le modèle contient l’accroche générique que les recruteurs voient dix fois par jour');
/* ③ court : hors accroche, le corps tient sous 50 mots */
else {
  const mots = ecrire.riche.corps.replace(/\[[^\]]*\]/g, '').split(/\s+/).filter(Boolean).length;
  if (mots > 50) fail(`${mots} mots hors accroche — sous 100 les réponses montent, on vise bien plus court`);
  else if (ecrire.riche.objet.length < 30 || ecrire.riche.objet.length > 60)
    fail(`objet de ${ecrire.riche.objet.length} car. — hors de la fenêtre 40-60 qui s’affiche en entier au mobile`);
  else console.log(`écrire : accroche en 1ᵉʳ bloc, ${mots} mots, objet ${ecrire.riche.objet.length} car. ✓`);
}
/* ④ la matière est là, au-dessus du champ, et seulement quand elle existe */
if (!/SOC managé/.test(ecrire.riche.savoir) || !/Fortinet/.test(ecrire.riche.savoir)
    || !/forum/.test(ecrire.riche.savoir))
  fail('« À savoir » n’apporte pas la matière de la fiche : ' + ecrire.riche.savoir);
else if (/CV → RH/.test(ecrire.riche.savoir))
  fail('le process est remonté dans le composeur — il n’aide pas à écrire la première phrase');
else if (!ecrire.riche.avant)
  fail(`la matière est SOUS le champ message (${ecrire.riche.ecart}px) — on écrit après avoir lu`);
else if (!/velmont\.example/.test(ecrire.siteSeul.savoir))
  fail('sans notes, le site devrait être la matière : ' + ecrire.siteSeul.savoir);
else if (ecrire.rien.savoir)
  fail('un cadre « À savoir » vide s’affiche alors qu’il n’y a rien à savoir');
else console.log('« À savoir » : les notes au-dessus du champ, le site en repli, absent si rien ✓');

/* ---------- écrire AU POUCE : le composeur respire ----------
   Trois défauts mesurés au téléphone, tous invisibles à la relecture.
   ① L'objet se coupait : un champ d'une ligne montre ~41 caractères sur
   350 px, le gabarit de relance en produit 71. C'est la seule phrase
   qui décide si le reste sera lu, et on n'en voyait pas la moitié.
   ② La zone d'écriture avait une hauteur FIXE de 170 px pendant que la
   feuille s'arrêtait à 612 px sur 776 disponibles : 289 px de brouillon
   dont 168 visibles (58 %), 388 px dont 168 pour la relance (43 %).
   ③ Sa taille dépendait de ce qu'on savait de l'entreprise — une fiche
   bien remplie rétrécissait le champ où l'on écrit.
   Le quatrième contrôle ne vient d'aucun défaut de conception mais d'un
   accident de flex : en donnant `min-height:0` au préambule, le champ
   Message est venu se poser PAR-DESSUS l'objet, en 360×640 seulement.
   Rien dans le code ne le disait. On mesure donc le recouvrement. */
const CORPS_MIN = 200;        /* ~7 lignes : le plancher sous lequel on n'écrit plus */
async function composeur(P, piste){
  return P.evaluate(async (piste) => {
    const { S, saveData, saveProfile } = await import('./ui/state.js');
    const { normalizeCompany, defaultTemplates } = await import('./engine/model.js');
    const { topSheet } = await import('./ui/dom.js');
    let t; let n = 0;
    while ((t = topSheet()) && n++ < 5){ t.close(null, true); await new Promise(r => setTimeout(r, 120)); }
    S.profile.name = 'Maheydine Oun'; S.profile.formation = 'BTS SIO SISR';
    S.profile.email = 'm@x.test'; S.profile.phone = '06 39 98 12 34';
    S.profile.templates = defaultTemplates();
    saveProfile();
    S.companies = [normalizeCompany(piste)];
    saveData();
    const { openMail } = await import('./ui/mail.js');
    openMail(S.companies[0], {});
    await new Promise(r => setTimeout(r, 400));
    /* le gabarit le plus long des trois : c'est lui qui décide */
    const sel = document.querySelector('#mTpl');
    sel.value = '1'; sel.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 250));
    const o = document.querySelector('#mSubj'), b = document.querySelector('#mBody');
    const k = document.querySelector('.ml-know');
    const bo = o.getBoundingClientRect(), bb = b.getBoundingClientRect();
    /* et il doit grandir PENDANT qu'on tape, pas seulement au
       remplissage du gabarit : c'est là qu'on allonge un objet */
    const avant = Math.round(bo.height);
    o.value = o.value + ' — candidature spontanée pour la rentrée de septembre';
    o.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    const enTapant = { h: Math.round(o.getBoundingClientRect().height),
      coupe: o.scrollHeight > o.clientHeight + 1,
      compteur: (document.querySelector('#mSubjN') || {}).textContent || '' };
    o.value = o.value.replace(' — candidature spontanée pour la rentrée de septembre', '');
    o.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      avant, enTapant,
      objetLen: o.value.length,
      objetCoupe: o.scrollHeight > o.clientHeight + 1 || o.scrollWidth > o.clientWidth + 1,
      compteur: (document.querySelector('#mSubjN') || {}).textContent || '',
      corpsH: Math.round(bb.height),
      feuilleH: Math.round(document.querySelector('.modal').getBoundingClientRect().height),
      /* deux champs ne se chevauchent jamais, à un pixel d'arrondi près */
      recouvre: bo.bottom > bb.top + 1 && bb.bottom > bo.top + 1,
      carteEntiere: k ? k.scrollHeight <= k.clientHeight + 1 : null,
      menu: !!document.querySelector('#mTo')
    };
  }, piste);
}
const RICHE = { name: 'Cyberprotect Solutions Aquitaine', city: 'Bordeaux',
  website: 'cyberprotect.example', desc: 'ESN de 40 personnes, SOC ouvert à Mérignac en 2025.',
  techs: 'Wazuh, Suricata, Debian', tips: 'Léa répond vite le matin — passer par elle.',
  contacts: [{ name: 'Léa Barbaste', role: 'Responsable du SOC', email: 'lea@cyberprotect.example' }] };
const NUE = { name: 'Alpha', contacts: [{ name: 'Jo', email: 'jo@alpha.example' }] };

const cRiche = await composeur(M, RICHE);
const cNue = await composeur(M, NUE);
if (cRiche.objetLen < 60)
  fail(`le gabarit de relance ne fait plus que ${cRiche.objetLen} caractères — le contrôle ne mesure plus rien`);
else if (cRiche.objetCoupe || cNue.objetCoupe)
  fail('l’objet se coupe encore au pouce — c’est la phrase qui décide si le reste est lu');
else if (!/^\d+\/60$/.test(cRiche.compteur))
  fail('le compteur de l’objet ne dit plus la fenêtre visée : ' + JSON.stringify(cRiche.compteur));
else if (cNue.feuilleH < 0.88 * 844)
  fail(`sur une piste peu renseignée, le composeur laisse ${844 - cNue.feuilleH}px de feuille inutilisés`);
else if (cRiche.corpsH < CORPS_MIN || cNue.corpsH < CORPS_MIN)
  fail(`zone d’écriture de ${Math.min(cRiche.corpsH, cNue.corpsH)}px — sous ${CORPS_MIN} on n’écrit plus, on devine`);
else if (cNue.corpsH < cRiche.corpsH)
  fail('une fiche mieux remplie devrait donner PLUS de place, jamais moins');
else if (cRiche.enTapant.h <= cRiche.avant || cRiche.enTapant.coupe)
  fail(`l’objet ne grandit pas pendant qu’on tape (${cRiche.avant}px → ${cRiche.enTapant.h}px)`)
else if (cRiche.enTapant.compteur === cRiche.compteur)
  fail('le compteur de l’objet ne suit pas la frappe : ' + cRiche.enTapant.compteur);
else if (cRiche.carteEntiere === false)
  fail('« À savoir » est coupée : une carte tranchée au milieu d’une ligne se lit comme un défaut');
else if (cRiche.menu)
  fail('un menu « Destinataire » à une seule option — un choix à une option n’est pas un choix');
else console.log(`écrire au pouce : objet ${cRiche.objetLen} car. entier (${cRiche.compteur}), `
  + `message ${cRiche.corpsH}px sur fiche pleine / ${cNue.corpsH}px sur fiche nue ✓`);

/* le recouvrement se joue sur le PETIT téléphone : c'est lui qui décide */
const petit = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true });
const Pt = await petit.newPage();
watch(Pt);
await Pt.goto(base, { waitUntil: 'load' });
await Pt.waitForSelector('#view-aujourdhui:not([hidden])');
const cPetit = await composeur(Pt, RICHE);
if (cPetit.recouvre || cRiche.recouvre)
  fail('l’objet et le message se recouvrent — un enfant de flex est passé sous son propre plancher');
else if (cPetit.objetCoupe)
  fail('l’objet se coupe en 360×640');
else console.log(`360×640 : objet entier, message ${cPetit.corpsH}px, rien ne se recouvre ✓`);
await petit.close();

if (errors.length) fail('erreurs console : ' + JSON.stringify(errors.slice(0, 6)));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E parcours neuf : ÉCHEC' : 'E2E parcours neuf : OK');
await browser.close();
server.close();
process.exit(process.exitCode || 0);
