/* ============================================================
   « J'y suis passé » — ce qui vaut quarante candidatures.

   Données de recrutement 2025 : 3 % d'entretiens sur une candidature à
   froid (15 % en 2016), 40 % quand quelqu'un est dedans. Une promo de
   BTS SIO où chacun a déjà fait un stage est assise sur ce réseau — et
   le partage, anonyme par construction, n'en transportait rien.

   Le contrôle N°1 de ce fichier n'est pas la fonctionnalité, c'est
   l'INVARIANT ① : le privé ne sort jamais. On ajoute un champ qui
   voyage ET un prénom : c'est exactement le genre de changement qui
   fait fuir le reste. Il est donc vérifié en premier, sur toutes les
   sorties possibles, et il échoue bruyamment.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base, { waitUntil: 'load' });

/* ---------- 1. l'invariant : rien de privé ne sort, jamais ---------- */
const PRIVE = ['status', 'notes', 'appliedAt', 'nextAction', 'nextActionText',
  'closedAt', 'closedReason', 'nextActionCt', 'history', 'id', 'demo', 'createdAt'];
const sortie = await page.evaluate(async prive => {
  const { normalizeCompany } = await import('./engine/model.js');
  const { sharePayload, communityView } = await import('./engine/exchange.js');
  /* une piste bien sale : tout le suivi privé rempli, plus une déclaration */
  const sale = normalizeCompany({
    name: 'Adrastia Systèmes', city: 'Toulouse', domain: 'esn', vecu: 'stage',
    status: 'reply', notes: 'MON suivi privé', appliedAt: '2026-06-01',
    nextAction: '2026-08-20', nextActionText: 'Relancer Nadia',
    closedAt: '2026-07-01', closedReason: 'won', nextActionCt: 'c1', demo: true,
    history: [{ d: '2026-06-01', t: 'secret' }],
    contacts: [{ id: 'c1', name: 'Nadia', role: 'RH', email: 'n@a.test',
                 activatedAt: '2026-06-02', src: 'promo' }] });
  const froide = normalizeCompany({ name: 'Ostral', status: 'active', notes: 'privé aussi' });
  const p = sharePayload([sale, froide], null, 'Léa');
  const fuites = c => prive.filter(k => c[k] !== undefined)
    .concat(Object.keys(c.extra || {}).filter(k => prive.includes(k)));
  return {
    fuites: p.companies.flatMap(fuites),
    fuitesContact: (p.companies[0].contacts || []).flatMap(t =>
      ['activatedAt', 'src', 'id'].filter(k => t[k] !== undefined)),
    vecu: p.companies[0].vecu, qui: p.companies[0].vecuQui,
    froidVecu: p.companies[1].vecu, froidQui: p.companies[1].vecuQui,
    /* sans prénom fourni, le champ ne s'invente pas */
    sansMoi: communityView(sale).vecuQui
  };
}, PRIVE);
if (sortie.fuites.length)
  fail('LE PRIVÉ FUIT dans un partage : ' + sortie.fuites.join(', '));
else if (sortie.fuitesContact.length)
  fail('champs d’action privés sur un contact partagé : ' + sortie.fuitesContact.join(', '));
else console.log('invariant ① : rien de privé ne sort, contacts compris ✓');
if (sortie.vecu !== 'stage' || sortie.qui !== 'Léa')
  fail(`la déclaration ne voyage pas : ${sortie.vecu} / ${sortie.qui}`);
/* Le point délicat : un partage SANS déclaration doit rester anonyme.
   Sinon on aurait troqué le levier contre la vie privée de l'utilisateur. */
if (sortie.froidVecu !== undefined || sortie.froidQui !== undefined)
  fail('un prénom part sur une piste SANS déclaration — le partage anonyme est cassé');
if (sortie.sansMoi !== undefined)
  fail('un prénom s’invente sans profil : ' + sortie.sansMoi);
else console.log('la déclaration voyage avec son prénom, et seulement là où elle existe ✓');

/* ---------- 1 bis. UNE DÉCLARATION SANS PRÉNOM NE PART PAS ----------
   Trouvé en jouant le parcours à deux : un donneur qui n'a pas rempli
   son prénom envoyait `vecu` tout seul. Chez le receveur, rien ne
   distinguait cette déclaration de la sienne — la fiche lui affichait
   « Tu y es passé » sur une entreprise où il n'a JAMAIS mis les pieds.
   L'app mentait. Corrigé à la source : pas de prénom, pas de
   déclaration qui voyage — une recommandation anonyme ne mène de toute
   façon nulle part. */
const muet = await page.evaluate(async () => {
  const { normalizeCompany } = await import('./engine/model.js');
  const { sharePayload } = await import('./engine/exchange.js');
  const c = normalizeCompany({ name: 'Adrastia', vecu: 'stage' });
  const sans = sharePayload([c], null, '').companies[0];        /* profil sans nom */
  const avec = sharePayload([c], null, 'Maheydine').companies[0];
  return { sansVecu: sans.vecu, sansQui: sans.vecuQui,
           avecVecu: avec.vecu, avecQui: avec.vecuQui };
});
if (muet.sansVecu !== undefined || muet.sansQui !== undefined)
  fail('une déclaration part sans prénom — le receveur lira « Tu y es passé »');
if (muet.avecVecu !== 'stage' || muet.avecQui !== 'Maheydine')
  fail('la déclaration ne part plus quand le prénom existe : ' + JSON.stringify(muet));
else console.log('pas de prénom, pas de déclaration qui voyage — et avec, elle passe ✓');

/* ---------- 2. la fusion garde le plus fort ---------- */
const fus = await page.evaluate(async () => {
  const { normalizeCompany } = await import('./engine/model.js');
  const { mergeIncoming } = await import('./engine/merge.js');
  const mes = [normalizeCompany({ name: 'Adrastia', vecu: 'connait', vecuQui: 'Sam' })];
  mergeIncoming([{ name: 'Adrastia', vecu: 'alternance', vecuQui: 'Léa' }], mes);
  const fort = { v: mes[0].vecu, q: mes[0].vecuQui };
  mergeIncoming([{ name: 'Adrastia', vecu: 'entretien', vecuQui: 'Tom' }], mes);
  return { fort, apres: { v: mes[0].vecu, q: mes[0].vecuQui } };
});
if (fus.fort.v !== 'alternance' || fus.fort.q !== 'Léa')
  fail('la fusion n’a pas pris la déclaration la plus forte : ' + JSON.stringify(fus.fort));
else if (fus.apres.v !== 'alternance')
  fail('une déclaration plus faible a écrasé la plus forte — invariant ② cassé');
else console.log('fusion : « alternance » bat « connaît », et rien de plus faible ne l’écrase ✓');

/* ---------- 3. le receveur le VOIT, et il sait à qui parler ---------- */
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const { normalizeCompany } = await import('./engine/model.js');
  const { sharePayload } = await import('./engine/exchange.js');
  const { mergeIncoming } = await import('./engine/merge.js');
  await st.kvInit();
  const p = sharePayload([
    normalizeCompany({ name: 'Adrastia Systèmes', city: 'Toulouse', domain: 'esn', vecu: 'stage',
      contacts: [{ id: 'c1', name: 'Nadia', role: 'RH', email: 'n@a.test' }] }),
    normalizeCompany({ name: 'Ostral Cyberdéfense', city: 'Toulouse', domain: 'cyber',
      contacts: [{ id: 'c2', name: 'Marc', role: 'CTO', email: 'm@o.test' }] })
  ], null, 'Léa');
  const mes = [];
  mergeIncoming(p.companies, mes);
  await st.kvSet(st.DATA_KEY, JSON.stringify(mes));
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2);
const lu = await page.evaluate(async () => {
  const { openFiche } = await import('./ui/fiche.js');
  const { S } = await import('./ui/state.js');
  const dire = nom => {
    document.querySelector('.overlay .x')?.click();
    openFiche(S.companies.find(c => c.name.startsWith(nom)));
    const v = document.querySelector('.fi-vecu');
    return v ? v.innerText.replace(/\s+/g, ' ').trim() : '';
  };
  return { porteuse: dire('Adrastia'), froide: dire('Ostral') };
});
if (!/Léa/.test(lu.porteuse) || !/stage/.test(lu.porteuse))
  fail('le receveur ne voit pas qui est dedans : « ' + lu.porteuse + ' »');
/* « quelqu'un y a fait son stage » ne mène nulle part : c'est le PRÉNOM
   qui transforme l'information en geste. */
if (lu.froide) fail('une piste sans déclaration affiche quand même un bandeau : ' + lu.froide);
else console.log(`le receveur lit « ${lu.porteuse} », et rien sur la piste froide ✓`);
/* elle se pose AVANT le statut : c'est la seule ligne de la fiche qui
   change l'ordre de grandeur du résultat */
const rang = await page.evaluate(() => {
  const v = document.querySelector('.fi-vecu'), s = document.querySelector('.seg3');
  return v && s ? v.getBoundingClientRect().top < s.getBoundingClientRect().top : null;
});
if (rang === false) fail('la déclaration est passée sous le statut');
await page.screenshot({ path: SHOTS + '/93-vecu-recu.png' });

/* ---------- 3 bis. LE PRÉNOM SUFFIT À AGIR ----------
   Le bandeau n'a besoin d'aucun carnet de camarades. C'est ce qui le
   fait marcher AUSSI de seconde main : mesuré, un carnet ne contient
   que les gens qu'on a déjà joints — jamais celui qui recommande deux
   échanges plus loin. Là, le message se colle où la promo se parle. */
const agir = await page.evaluate(async () => {
  const { openFiche } = await import('./ui/fiche.js');
  const { S } = await import('./ui/state.js');
  document.querySelectorAll('.overlay .x').forEach(x => x.click());
  await new Promise(r => setTimeout(r, 200));
  openFiche(S.companies.find(c => c.name.startsWith('Adrastia')));
  await new Promise(r => setTimeout(r, 250));
  const b = document.querySelector('button.fi-vecu');
  if (!b) return { tapable: false };
  b.click();
  await new Promise(r => setTimeout(r, 250));
  const feuilles = document.querySelectorAll('.overlay:not(.ov-out)').length;
  /* la feuille du DESSUS, pas la fiche qui reste dessous */
  const dessus = [...document.querySelectorAll('.overlay:not(.ov-out)')].pop();
  return { tapable: true, feuilles,
           mot: (document.querySelector('.gr-mot') || {}).innerText || '',
           boutons: [...dessus.querySelectorAll('.modal-f .btn')].map(x => x.innerText.trim()) };
});
if (!agir.tapable) fail('le bandeau ne mène nulle part alors qu’il porte un prénom');
/* la phrase se lit à voix haute : vérifiée mot pour mot. Un `court` en
   3ᵉ personne réutilisé après « tu » donnait « tu y a fait son stage ». */
else if (agir.mot.replace(/\s+/g, ' ').trim() !==
         'Salut Léa, tu y as fait ton stage chez Adrastia Systèmes ? '
         + 'Je postule là-bas — tu peux me dire à qui écrire ?')
  fail('le message tout prêt n’est pas la phrase attendue : ' + agir.mot);
else if (agir.boutons.length !== 1 || !/Copier/.test(agir.boutons[0]))
  fail('la demande devrait tenir en UN bouton : ' + JSON.stringify(agir.boutons));
else console.log(`le prénom seul suffit : « ${agir.mot.slice(0, 40)}… », un bouton ✓`);

/* ---------- 3 ter. RIEN NE STOCKE LES CAMARADES ----------
   `oc_group_v1` a vécu une journée. La clé n'est plus écrite, et une
   valeur restée d'avant est effacée au chargement : ce sont les
   coordonnées de gens qui n'ont jamais vu cet écran. */
const carnet = await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  await st.kvSet(st.GROUP_KEY, JSON.stringify([{ id: 'x', prenom: 'Léa', email: 'l@x.test' }]));
  const { loadAll, S } = await import('./ui/state.js');
  await loadAll();
  await new Promise(r => setTimeout(r, 150));
  return { reste: await st.kvGet(st.GROUP_KEY), dansS: 'groupe' in S };
});
if (carnet.reste != null) fail('une valeur de `oc_group_v1` survit au chargement : ' + carnet.reste);
if (carnet.dansS) fail('S.groupe existe encore — le carnet est censé avoir disparu');
else console.log('aucun carnet de camarades : la clé est effacée, l’état ne la connaît plus ✓');

/* ---------- 4. on la déclare en un tap, et une seule ---------- */
const decl = await page.evaluate(async () => {
  document.querySelector('.overlay .x')?.click();
  const { openEditPiste } = await import('./ui/edit.js');
  const { S } = await import('./ui/state.js');
  openEditPiste(S.companies.find(c => c.name.startsWith('Ostral')));
  await new Promise(r => setTimeout(r, 250));
  const chips = [...document.querySelectorAll('.dchip[data-v]')];
  chips[1].click();                                   /* stage */
  const un = chips.filter(b => b.classList.contains('on')).map(b => b.dataset.v);
  chips[0].click();                                   /* alternance : exclusif */
  const deux = chips.filter(b => b.classList.contains('on')).map(b => b.dataset.v);
  chips[0].click();                                   /* re-taper = retirer */
  const zero = chips.filter(b => b.classList.contains('on')).length;
  /* les postes, eux, se cumulent — même composant, deux comportements */
  const postes = [...document.querySelectorAll('.dchip[data-p]')];
  postes[0].click(); postes[1].click();
  const cumul = postes.filter(b => b.classList.contains('on')).length;
  return { un, deux, zero, cumul, n: chips.length };
});
if (decl.n !== 4) fail(`${decl.n} choix « j’y suis passé » au lieu de 4`);
if (decl.un.join() !== 'stage' || decl.deux.join() !== 'alternance')
  fail('« j’y suis passé » n’est pas exclusif : ' + JSON.stringify(decl));
if (decl.zero !== 0) fail('re-taper la puce active ne la retire pas — aucun retour en arrière');
if (decl.cumul !== 2) fail('les postes recherchés ont perdu leur cumul : ' + decl.cumul);
else console.log('déclaration : 4 choix, exclusifs, re-tap pour retirer — et les postes cumulent toujours ✓');

/* ---------- 5. LA PISTE PORTÉE PASSE EN TÊTE ----------
   ~40 % d'entretiens contre ~3 % : le critère le plus fort de l'écran.
   Et la raison doit se LIRE sur la ligne — un tri qu'on ne comprend
   pas ne pousse personne (§6). Ce contrôle vivait dans un fichier
   supprimé avec le carnet ; une mutation l'a montré. */
await page.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const { normalizeCompany } = await import('./engine/model.js');
  /* Fermer par la CROIX rend une entrée d'historique, et ce retour est
     DIFFÉRÉ d'une micro-tâche (voir CLAUDE.md §5 : c'est ce qui empêche
     l'app de sortir sur `about:blank` en enchaînant deux feuilles).
     Suivi d'un `reload()` immédiat, ce retour partait APRÈS le
     rechargement et emmenait la page hors du document : plus aucun
     `import('./ui/state.js')` ne résolvait, et le test mourait sur un
     code parfaitement sain, un tour sur cinq. On ferme donc par la voie
     silencieuse, celle qui ne touche pas à l'historique. */
  const { topSheet } = await import('./ui/dom.js');
  let s, n = 0;
  while ((s = topSheet()) && n++ < 6) s.close(null, true);
  /* la piste portée est volontairement la MOINS bien classée par les
     autres critères : sans e-mail, sans ville, dernière alphabétiquement */
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    normalizeCompany({ name: 'Aalto Cloud', city: 'Lyon', status: 'todo',
      contacts: [{ name: 'RH', email: 'rh@aalto.test' }] }),
    normalizeCompany({ name: 'Zephyr SI', status: 'todo', vecu: 'stage', vecuQui: 'Léa' })
  ]));
  location.hash = '#aujourdhui';
});
await page.reload({ waitUntil: 'load' });
await attendre(page, async () => (await import('./ui/state.js')).S.companies.length === 2,
  'les pistes ne sont pas chargées');
await page.waitForTimeout(400);
const debut = await page.evaluate(() =>
  [...document.querySelectorAll('.act-start')].map(r => ({
    nom: r.querySelector('.act-verb').textContent.trim(),
    pourquoi: (r.querySelector('.act-vecu') || {}).textContent || ''
  })));
if (!debut.length) fail('« Par où commencer » n’affiche rien');
else if (debut[0].nom !== 'Zephyr SI')
  fail('la piste portée n’est pas en tête : ' + debut.map(d => d.nom).join(' · '));
else if (!/Léa/.test(debut[0].pourquoi))
  fail('la ligne ne dit pas POURQUOI elle est première : « ' + debut[0].pourquoi + ' »');
else console.log(`en tête : ${debut[0].nom}, parce que « ${debut[0].pourquoi} » ✓`);
await page.screenshot({ path: SHOTS + '/94-portee-en-tete.png' });

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E vécu : ÉCHEC' : 'E2E vécu : OK');
