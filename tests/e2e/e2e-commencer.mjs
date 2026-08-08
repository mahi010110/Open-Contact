/* ============================================================
   « Je fais quoi maintenant ? » — l'écran répond-il ?

   C'est la promesse du produit (CLAUDE.md §1), et rien ne la vérifiait.
   Le trou mesuré : on reçoit le fichier d'un camarade, vingt-quatre
   pistes arrivent d'un coup — le geste phare de l'app — et « Aujourd'hui »
   affichait « Rien de planifié », zéro ligne, deux portes. Il tenait
   pourtant la réponse : vingt-quatre pistes.

   Ce fichier fige les trois états réels. Le contrôle qui compte tient en
   une ligne : quand des pistes existent, l'écran en MONTRE — la règle §6
   « un écran montre les affaires de l'utilisateur, pas des portes ».
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

/* huit pistes reçues, aucune planifiée — dont une SANS adresse e-mail
   (une capacité absente doit être absente, pas grisée) */
const RECUES = Array.from({ length: 8 }, (_, i) => ({
  id: 'r' + i,
  name: ['Adrastia Systèmes', 'Ostral Cyberdéfense', 'Groupe Ravenel', 'Halcyon Data',
         'Lombard Négoce', 'Vergne Assurances', 'Atelier sans mail', 'Novaquitaine Réseaux'][i],
  status: 'todo', city: 'Toulouse', domain: 'esn',
  desc: 'Description de démonstration.', website: 'exemple' + i + '.test',
  contacts: i === 6 ? [{ id: 'x' + i, name: 'Sans adresse', role: 'RH', phone: '06 39 98 00 01' }]
                    : Array.from({ length: (i % 3) + 1 }, (_, k) => ({
                        id: 'c' + i + k, name: 'Personne ' + k, role: 'RH',
                        email: `p${k}@exemple${i}.test`, phone: '06 39 98 00 0' + k })),
  updatedAt: 100 - i
}));

async function ecran(largeur, seed){
  const ctx = await browser.newContext({ viewport: { width: largeur, height: largeur > 900 ? 800 : 844 },
    hasTouch: largeur < 901 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/aujourdhui', { waitUntil: 'load' });
  await p.evaluate(async d => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
  }, seed);
  await p.reload({ waitUntil: 'load' });
  await attendre(p, async d => (await import('./ui/state.js')).S.companies.length === d,
    { message: 'les pistes chargées' }).catch(() => {});
  await p.waitForFunction(n => document.querySelectorAll('#view-aujourdhui .page-inner').length === 1);
  await p.waitForTimeout(400);
  return { ctx, p };
}
const lire = p => p.evaluate(() => {
  const v = document.querySelector('#view-aujourdhui');
  const cible = n => (n.textContent || n.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  return {
    lignes: v.querySelectorAll('.act-row').length,
    demarrage: v.querySelectorAll('.act-start').length,
    /* les gestes qui n'ouvrent PAS un autre écran : écrire, planifier,
       finir, reporter — ce sont eux qui font avancer la recherche */
    gestes: [...v.querySelectorAll('.act-row [data-a]')].map(n => n.dataset.a),
    cibles: [...v.querySelectorAll('button, a[href], [role="button"]')]
      .filter(n => n.getClientRects().length).map(cible).filter(Boolean),
    pageWide: !!v.querySelector('.page-inner.page-wide'),
    texte: v.innerText.replace(/\s+/g, ' ').trim()
  };
});

/* ---------- A · app neuve : la promesse, et un seul geste ---------- */
{
  const { ctx, p } = await ecran(390, []);
  const a = await lire(p);
  if (a.lignes) fail('app neuve : des lignes de piste alors qu’il n’y en a aucune');
  if (a.cibles.length !== 2)
    fail(`app neuve : ${a.cibles.length} cibles au lieu de 2 — ${a.cibles.join(' · ')}`);
  if (!/première piste/i.test(a.texte)) fail('app neuve : l’état vide n’enseigne plus le produit');
  else console.log(`app neuve : la promesse + 2 gestes (${a.cibles.join(' · ')}) ✓`);
  await ctx.close();
}

/* ---------- B · le cas qui manquait : des pistes, rien de planifié ---------- */
{
  const { ctx, p } = await ecran(390, RECUES);
  const b = await lire(p);
  /* LE contrôle. Une seule ligne, et c'est tout le défaut. */
  if (!b.demarrage)
    fail('des pistes en réserve et l’écran n’en montre AUCUNE — il est redevenu un menu');
  if (b.demarrage > 3)
    fail(`${b.demarrage} pistes proposées : au-delà de trois, ce n’est plus un choix, c’est la liste`);
  /* chaque ligne porte un geste qui fait avancer, pas seulement « ouvrir » */
  if (!b.gestes.includes('plan'))
    fail('aucune ligne ne propose de planifier — le geste manquant est justement celui-là');
  if (!b.gestes.includes('mail'))
    fail('aucune ligne ne propose d’écrire alors que des pistes ont une adresse');
  /* une ligne sans action ne peut être ni « faite » ni « reportée » */
  const faux = b.gestes.filter(g => g === 'done' || g === 'report');
  if (faux.length)
    fail(`une piste non planifiée propose ${faux.join('/')} — il n’y a rien à finir ni à repousser`);
  /* et il reste un chemin vers TOUTES les autres */
  if (!b.cibles.some(t => /sans prochaine action/.test(t)))
    fail('pas de chemin vers les pistes non montrées');
  console.log(`rien de planifié : ${b.demarrage} pistes montrées, gestes ${[...new Set(b.gestes)].join('+')}, `
    + 'et la route vers les autres ✓');

  /* au pouce, toute cible reste tapable */
  const petites = await p.evaluate(() => [...document.querySelectorAll('.act-start [data-a], .act-start .act-main')]
    .map(n => ({ t: n.dataset.a || 'ouvrir', h: Math.round(n.getBoundingClientRect().height),
                 w: Math.round(n.getBoundingClientRect().width) }))
    .filter(x => x.h < 44 || x.w < 44));
  if (petites.length) fail('cibles sous 44 px : ' + JSON.stringify(petites));
  else console.log('   toutes les cibles de la tranche ≥ 44 px ✓');
  await p.screenshot({ path: SHOTS + '/90-commencer-pouce.png' });
  await ctx.close();
}

/* ---------- B bis · aucune piste joignable ----------
   La piste sans adresse ne monte jamais dans les trois quand d'autres
   sont joignables — c'est le tri qui le veut, et c'est bien. Résultat :
   le contrôle « pas d'adresse, pas de bouton Écrire » ne s'exécutait
   jamais. Il lui faut son propre état, où PERSONNE n'a d'adresse. */
{
  const muettes = RECUES.slice(0, 4).map(c => ({ ...c,
    contacts: [{ id: 'z' + c.id, name: 'Sans adresse', role: 'RH', phone: '06 39 98 00 09' }] }));
  const { ctx, p } = await ecran(390, muettes);
  const m = await lire(p);
  if (!m.demarrage) fail('aucune piste joignable : l’écran ne montre plus rien');
  if (m.gestes.includes('mail'))
    fail('aucune piste n’a d’adresse et « Écrire » est pourtant proposé — une capacité absente doit être ABSENTE');
  if (!m.gestes.includes('plan')) fail('aucune piste joignable : « Planifier » a disparu aussi');
  else console.log(`aucune adresse : ${m.demarrage} pistes montrées, `
    + `seul « Planifier » (${[...new Set(m.gestes)].join('+')}) ✓`);
  await ctx.close();
}

/* ---------- B au poste : la pleine largeur appartient au TABLEAU ---------- */
{
  const { ctx, p } = await ecran(1280, RECUES);
  const w = await lire(p);
  if (!w.demarrage) fail('au poste, rien de planifié affiche encore un mur de colonnes vides');
  if (w.pageWide)
    fail('une seule colonne de trois lignes étirée en pleine largeur — les boutons partent à l’autre bout');
  else console.log(`au poste : ${w.demarrage} pistes montrées, en colonne lisible (pas de page-wide) ✓`);
  await p.screenshot({ path: SHOTS + '/91-commencer-poste.png' });
  await ctx.close();
}

/* ---------- C · une fois planifié, l'écran de travail reprend la main ---------- */
{
  const jour = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const planifiees = RECUES.map((c, i) => i < 3
    ? { ...c, nextAction: jour(i - 1), nextActionText: 'Relancer', status: 'contacted' } : c);
  const { ctx, p } = await ecran(390, planifiees);
  const c = await lire(p);
  if (c.demarrage)
    fail('du travail est planifié et l’écran propose encore « par où commencer » — il a volé la place');
  if (!c.lignes) fail('les actions planifiées ne s’affichent plus');
  if (!c.gestes.includes('done') || !c.gestes.includes('report'))
    fail('les lignes planifiées ont perdu « Fait » / « Reporter »');
  else console.log(`travail planifié : ${c.lignes} lignes, gestes ${[...new Set(c.gestes)].join('+')} ✓`);
  await ctx.close();

  /* et au poste, le tableau à trois colonnes revient */
  const { ctx: c2, p: p2 } = await ecran(1280, planifiees);
  const d = await lire(p2);
  if (!d.pageWide) fail('au poste, le tableau du travail planifié a perdu sa pleine largeur');
  else console.log('   au poste, le tableau à trois colonnes reprend sa place ✓');
  await c2.close();
}

console.log(errors.length ? 'Erreurs console : ' + errors.join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E commencer : ÉCHEC' : 'E2E commencer : OK');
