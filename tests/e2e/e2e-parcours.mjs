/* ============================================================
   « Mon parcours » — ce que j'ai déjà fait (docs/reseau.md, lot 1)

   Le profil apprend où l'étudiant est déjà passé : un stage, une
   alternance, un emploi. Ce qui peut se déduire ne se saisit pas
   (§8, règle 2) : une piste où il a déclaré lui-même « J'y suis
   passé » en fait partie d'office ; celle d'un camarade (avec un
   prénom), jamais.

   ① le parcours part rempli de MES « J'y suis passé », pas de ceux du
     groupe ; il se complète d'une entreprise que je ne suis pas ;
   ② une ligne déduite se corrige (des dates) sans se dédoubler ;
   ③ le mail de candidature gagne sa ligne « Expérience », et l'aperçu
     du profil la montre pendant qu'on la règle ;
   ④ rien ne s'enregistre avant « Enregistrer », et quitter avec un
     parcours changé demande confirmation ; après un rechargement, tout
     est là ;
   ⑤ le parcours ne sort dans AUCUN partage (invariant ①), depuis l'état
     réel de l'app ;
   ⑥ pouce et poste, clair et sombre, et à 320 px texte doublé.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS, annuaireMuet } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const PISTES = [
  { id: 'a', name: 'Advens', city: 'Lille', vecu: 'alternance', status: 'todo', updatedAt: 5 },
  { id: 'b', name: 'Wavestone', city: 'Lille', vecu: 'stage', vecuQui: 'Léa', status: 'todo', updatedAt: 4 },
  { id: 'c', name: 'Aztek', city: 'Roubaix', status: 'todo', updatedAt: 3,
    contacts: [{ id: 't', name: 'Julie Marchand', email: 'julie@aztek.test' }] }
];
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO', recherche: 'alternance', email: 'ines@exemple.test' };

async function ecran(vp, touch, o = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, colorScheme: o.sombre ? 'dark' : 'light' });
  await annuaireMuet(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/moi', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [o.pistes || PISTES, o.profil || PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(300);
  return { ctx, p };
}
/* la feuille entre en glissant (§4) : une capture prise avant la fin la
   montre à demi transparente, la page au travers */
const ouvrirProfil = async p => {
  await p.evaluate(async () => (await import('./ui/profil.js')).openProfil());
  await p.waitForSelector('#pfPar');
  await p.waitForTimeout(450);
};
const lignes = p => p.evaluate(() => [...document.querySelectorAll('#pfPar [data-par]')].map(b =>
  b.querySelector('b').textContent.trim() + ' | ' + b.querySelector('.pk-m > span').textContent.trim()));
const apercu = p => p.evaluate(() => [...document.querySelectorAll('#pfAp p')].map(x => x.textContent.trim())
  .find(t => t.startsWith('Expérience')) || '');
/* la feuille du dessus — l'éditeur d'une expérience s'empile sur le profil */
const dessus = p => p.evaluate(() => { const o = [...document.querySelectorAll('.overlay')]; return o[o.length - 1]?.querySelector('.mh-t')?.textContent; });
const enregistrerDessus = p => p.evaluate(() => {
  const o = [...document.querySelectorAll('.overlay')].pop();
  [...o.querySelectorAll('.modal-f button')].find(b => /Enregistrer/.test(b.textContent)).click();
});
const profilStocke = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js');
  return JSON.parse(await st.kvGet(st.PROFILE_KEY) || '{}');
});

/* ---------- au pouce : ①②③④ ---------- */
{
  const { ctx, p } = await ecran({ width: 390, height: 844 }, true);
  await ouvrirProfil(p);
  let l = await lignes(p);
  if (l.join('/') !== 'Advens | Alternance') fail('le parcours ne part pas de MES « J’y suis passé » : ' + JSON.stringify(l));
  if (l.some(x => x.includes('Wavestone'))) fail('la déclaration de Léa est entrée dans MON parcours');
  if (await apercu(p) !== 'Expérience : alternance chez Advens') fail('aperçu : « ' + await apercu(p) + ' »');
  console.log('pouce · le parcours part rempli de mes « J’y suis passé », pas de ceux de Léa ✓');

  /* ① ajouter une entreprise que je ne suis pas — et d'abord, sans nom */
  await p.click('#pfParAdd');
  await p.waitForSelector('#exNom');
  if (await dessus(p) !== 'Ajouter à mon parcours') fail('titre de l’éditeur : ' + await dessus(p));
  await enregistrerDessus(p);
  if (await p.evaluate(() => document.querySelector('#exNomErr').hidden)) fail('un nom vide passe sans erreur sous le champ');
  await p.fill('#exNom', 'Quick');
  await p.click('.dchip[data-q="emploi"]');
  await p.fill('#exDebut', '2024-06');
  await p.fill('#exFin', '2024-08');
  const per = await p.evaluate(() => document.querySelector('#exPer').textContent);
  if (per !== '2024') fail('la période ne se lit pas pendant qu’on la choisit : ' + per);
  await p.fill('#exFin', '2024-02');
  await enregistrerDessus(p);
  if (await p.evaluate(() => document.querySelector('#exFinErr').hidden)) fail('une fin avant le début passe sans erreur');
  await p.fill('#exFin', '');
  if (await p.evaluate(() => document.querySelector('#exPer').textContent) !== 'depuis 2024') fail('« en cours » ne se lit pas');
  await p.fill('#exFin', '2024-08');
  await p.screenshot({ path: `${SHOTS}/99-parcours-ajout-pouce.png` });
  await enregistrerDessus(p);
  await p.waitForTimeout(250);
  l = await lignes(p);
  /* une ligne datée passe devant une ligne sans date */
  if (l.join('/') !== 'Quick | Emploi · 2024/Advens | Alternance') fail('après ajout : ' + JSON.stringify(l));
  console.log('pouce · ajouter : erreur sous le champ, période lue en direct, ligne rangée ✓');

  /* ② la ligne déduite se corrige sans se dédoubler */
  await p.click('#pfPar [data-par="piste:a"]');
  await p.waitForSelector('#exDebut');
  if (await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop().querySelector('.btn-danger')))
    fail('une ligne déduite d’une piste propose « Retirer » — c’est la piste qui la porte');
  await p.fill('#exDebut', '2025-09');
  await enregistrerDessus(p);
  await p.waitForTimeout(250);
  l = await lignes(p);
  if (l.join('/') !== 'Advens | Alternance · depuis 2025/Quick | Emploi · 2024') fail('après correction : ' + JSON.stringify(l));
  const ap = await apercu(p);
  if (ap !== 'Expérience : alternance chez Advens (depuis 2025), emploi chez Quick (2024)') fail('aperçu : « ' + ap + ' »');
  console.log('pouce · la ligne déduite se corrige sans se dédoubler, l’aperçu suit ✓');

  /* ④ rien n'est enregistré avant « Enregistrer » ; quitter demande */
  if ((await profilStocke(p)).parcours?.length) fail('le parcours s’est enregistré avant « Enregistrer »');
  await p.evaluate(() => document.querySelector('.overlay .modal-h button.x').click());
  await p.waitForTimeout(300);
  const garde = await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop()?.querySelector('.mh-t')?.textContent);
  if (garde !== 'Quitter sans enregistrer ?') fail('quitter avec un parcours changé ne demande rien : ' + garde);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
  await p.evaluate(() => { document.querySelector('#pfPar').closest('.modal-b').scrollTop = 0; });
  await p.screenshot({ path: `${SHOTS}/99-parcours-pouce.png` });
  await p.evaluate(() => [...document.querySelectorAll('.overlay')].pop()
    .querySelector('.modal-f .btn-primary').click());
  await p.waitForTimeout(300);
  const st = await profilStocke(p);
  if ((st.parcours || []).map(e => e.entreprise).join() !== 'Quick,Advens' || st.parcours[1].pisteId !== 'a')
    fail('profil enregistré : ' + JSON.stringify(st.parcours));
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(300);
  await ouvrirProfil(p);
  if ((await lignes(p)).length !== 2) fail('après rechargement, le parcours n’est plus là');
  console.log('pouce · rien avant « Enregistrer », la garde demande, tout revient au rechargement ✓');

  /* ③ le vrai composeur : la ligne « Expérience » dans le brouillon */
  await p.evaluate(() => document.querySelector('.overlay .modal-h button.x').click());
  await p.waitForTimeout(200);
  await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    (await import('./ui/mail.js')).openMail(S.companies.find(c => c.id === 'c'));
  });
  await p.waitForSelector('#mBody');
  const corps = await p.evaluate(() => document.querySelector('#mBody').value);
  if (!corps.includes('Expérience : alternance chez Advens (depuis 2025), emploi chez Quick (2024)'))
    fail('le brouillon ne porte pas la ligne « Expérience » : ' + corps);
  console.log('pouce · le brouillon de candidature dit l’expérience ✓');

  /* ⑤ le parcours ne sort dans aucun partage — depuis l'état réel */
  const fuite = await p.evaluate(async () => {
    const { S } = await import('./ui/state.js');
    const { sharePayload } = await import('./engine/exchange.js');
    const prenom = (S.profile.name || '').split(/\s+/)[0];
    return JSON.stringify(sharePayload(S.companies, null, prenom));
  });
  if (/Quick|parcours|2024-06/.test(fuite)) fail('le parcours est sorti dans un partage : ' + fuite.slice(0, 300));
  console.log('pouce · le parcours ne sort dans aucun partage ✓');
  await ctx.close();
}

/* ---------- au poste, clair et sombre ; au plus étroit, texte doublé ---------- */
const PROFIL_PLEIN = { ...PROFIL, parcours: [
  { id: 'q', entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '2024-08' },
  { id: 'v', entreprise: 'Société Générale Global Solution Centre', quoi: 'stage', debut: '2025-04', fin: '2025-06' }] };
for (const [vp, touch, sombre, nom] of [[{ width: 1280, height: 800 }, false, false, 'poste'],
                                        [{ width: 1280, height: 800 }, false, true, 'poste-sombre'],
                                        [{ width: 320, height: 640 }, true, false, '320-200']]){
  const { ctx, p } = await ecran(vp, touch, { sombre, profil: PROFIL_PLEIN });
  if (nom === '320-200') await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await ouvrirProfil(p);
  const r = await p.evaluate(() => {
    const m = document.querySelector('#pfPar').closest('.modal-b');
    const mr = m.getBoundingClientRect().right;
    return {
      deborde: [...m.querySelectorAll('#pfPar *')].filter(x => x.getBoundingClientRect().right > mr + 1).length,
      /* en LARGEUR aussi : un nom forcé sur un rang garde sa hauteur et
         déborde de côté (le défaut de `<span class="pk-m">`, attrapé par
         `.pick>span`) */
      coupes: [...document.querySelectorAll('#pfPar .pk-m > b')]
        .filter(b => b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1).length
    };
  });
  if (r.deborde) fail(`${nom} : ${r.deborde} élément(s) du parcours dépassent la feuille`);
  if (r.coupes) fail(`${nom} : un nom d’entreprise du parcours est coupé`);
  await p.evaluate(() => document.querySelector('#pfPar').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${SHOTS}/99-parcours-${nom}.png` });
  console.log(`${nom} · rien ne dépasse, aucun nom coupé ✓`);
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.slice(0, 5).join(' | '));
await browser.close();
server.close();
if (!process.exitCode) console.log('\nOK — mon parcours se remplit de mes pistes, se complète, nourrit le mail, et ne sort jamais.');
