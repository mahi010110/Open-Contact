/* ============================================================
   La barre COMPREND ce qu'on tape — et le montre (docs/recherche.md, lot 1)

   Le défaut mesuré : « alternance lille » rendait DEUX pistes sur un vrai
   jeu, parce que la barre cherchait des lettres. Le poste visé n'est
   presque jamais renseigné, et « Lille » n'était qu'un mot. Elle en rend
   maintenant quatre, celles qui prennent des alternants d'abord, et
   chaque ligne dit pourquoi.

   Ce fichier joue la barre comme on s'en sert, sur les trois ergonomies
   de §5 — pouce, poste, tablette —, et garde ce que l'écran PROMET :

   ① ce qui est compris se voit (une étiquette par chose comprise) et se
     défait d'un tap — la barre et les étiquettes ne se contredisent
     jamais ;
   ② la raison se lit sur la ligne (« Léa y a été en alternance ») ;
   ③ une recherche n'est jamais une impasse : le vide propose ce qu'on
     retrouverait, une ville propose son département ;
   ④ la barre vide propose des recherches qui ont une réponse ;
   ⑤ au poste, le clavier suffit : « / », ↓ ← →, Échap, Entrée — et la
     touche s'annonce dans ce qu'elle commande ;
   ⑥ un numéro n'est plus un bout de téléphone, un état n'est pas un
     mot écrit dans une note ;
   ⑦ ce qui change s'entend (la région vivante dit ce qui est compris).
   ============================================================ */
import { chromium, chromiumPath, serveRepo, SHOTS } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };

const J = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const P = (o, i) => ({ id: 'p' + i, status: 'todo', domain: 'esn', contacts: [], positions: [],
  updatedAt: 1000 - i, history: [{ d: J(o.vieux || 2), t: 'Ajoutée' }], ...o });
const JEU = [
  { name: 'Advalys Cyber', city: 'Lille', address: '12 rue Nationale\n59000 Lille', domain: 'cyber',
    positions: ['alternance', 'stage'], techs: 'SOC, SIEM', vecu: 'alternance', vecuQui: 'Léa',
    contacts: [{ id: 'c1', name: 'Julie Marchand', role: 'RH', email: 'julie@advalys.test' }] },
  { name: 'Nordsys Réseaux', city: 'Villeneuve-d’Ascq', address: '4 av. de la Créativité\n59650 Villeneuve-d’Ascq',
    positions: ['alternance'], status: 'active', nextAction: J(-2), nextActionText: 'Relancer' },
  { name: 'Lumen Data', city: 'Lille', address: '165 av. de Bretagne\n59000 Lille', domain: 'startup',
    status: 'reply', contacts: [{ id: 'c3', name: 'Léa Fontaine', role: 'CTO', email: 'lea@lumen.test' }] },
  { name: 'Mairie de Lille — DSI', city: 'Lille', address: 'Place Augustin Laurent\n59000 Lille', domain: 'public',
    positions: ['stage', 'alternance'], status: 'active', vieux: 12 },
  /* À LILLE, mais ses postes sont dits et ne comptent pas l'alternance : elle
     ne doit PAS sortir pour « alternance lille » */
  { name: 'Cabinet Stagio', city: 'Lille', address: '3 rue de Paris\n59000 Lille', positions: ['stage'] },
  { name: 'Wavelink Support', city: 'Lille', address: '5 rue Faidherbe\n59000 Lille', techs: 'helpdesk' },
  { name: 'Ostral Cyberdéfense', city: 'Lyon', address: '10 quai Perrache\n69002 Lyon', domain: 'cyber',
    positions: ['stage'], vecu: 'stage', vecuQui: 'Awa' },
  /* un numéro de TÉLÉPHONE qui contient « 59 » : « 59 » ne doit plus le remonter */
  { name: 'Atelier Pixel', city: 'Paris', address: '30 rue Oberkampf\n75011 Paris', domain: 'startup',
    contacts: [{ id: 'c4', name: 'Camille Durand', role: 'Fondatrice', phone: '06 59 12 34 56' }],
    notes: 'attendre la réponse' },
  { name: 'Adrastia Systèmes', city: 'Toulouse', address: '3 allée Jean Jaurès\n31000 Toulouse',
    positions: ['stage', 'cdi'], status: 'active', vieux: 25 },
  { name: 'Orange Business', city: 'Paris', address: '111 quai du Président Roosevelt\n92130 Issy-les-Moulineaux',
    domain: 'dsi', positions: ['alternance', 'cdi'], status: 'reply' },
  { name: 'Sopraxis Conseil', city: 'Nantes', address: '9 quai de la Fosse\n44000 Nantes',
    positions: ['alternance'], status: 'active', closedReason: 'rejected', vieux: 40 }
].map(P);
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', email: 'ines@exemple.test' };

async function ecran(vp, touch){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base + '/#/pistes', { waitUntil: 'load' });
  await p.evaluate(async ([d, pr]) => {
    const st = await import('./engine/storage.js');
    await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(d));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [JEU, PROFIL]);
  await p.reload({ waitUntil: 'load' });
  await p.waitForSelector('#piQ');
  /* un contrôle vérifie qu'il a mesuré quelque chose (§5) : sans pistes
     rendues, tout ce qui suit lirait un écran vide et passerait au vert */
  await p.waitForFunction(n => document.querySelectorAll('#piBody [data-id]').length >= n, 5, { timeout: 5000 })
    .catch(() => fail('les pistes semées ne sont pas rendues'));
  return { ctx, p };
}
/* taper comme au clavier, puis laisser passer l'amorti de la frappe */
const taper = async (p, txt) => {
  await p.fill('#piQ', '');
  await p.click('#piQ');
  await p.keyboard.type(txt, { delay: 8 });
  await p.waitForTimeout(320);
};
const lire = p => p.evaluate(() => {
  const noms = [...document.querySelectorAll('#piBody [data-id]')]
    .filter(n => n.getClientRects().length)
    .map(n => (n.querySelector('h3, b') || n).textContent.trim());
  return {
    q: document.querySelector('#piQ').value,
    etiquettes: [...document.querySelectorAll('#piChips .et-chip')].map(n => n.textContent.trim()),
    /* une proposition : son libellé, et son compte à part — collés dans
       le texte, « Lille 4 » et « Lille 14 » se confondraient */
    props: [...document.querySelectorAll('#piChips .prop-chip')].map(n => ({
      t: [...n.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent).join('').replace(/\s+/g, ' ').trim(),
      n: (n.querySelector('.fl-n') || {}).textContent || '' })),
    noms,
    raisons: Object.fromEntries([...document.querySelectorAll('#piBody [data-id]')]
      .map(n => [(n.querySelector('h3, b') || n).textContent.trim(),
                 (n.querySelector('.ri-why') || {}).textContent || ''])),
    extraits: [...document.querySelectorAll('#piBody .ri-hit')].map(n => n.textContent.trim()),
    compte: document.querySelector('#piCount')?.textContent || '',
    vide: document.querySelector('.empty-list')?.textContent.replace(/\s+/g, ' ').trim() || '',
    alternatives: [...document.querySelectorAll('.el-alt button')].map(n => n.textContent.replace(/\s+/g, ' ').trim()),
    tableau: !!document.querySelector('#piBody .board'),
    clotureesOuvertes: !!document.querySelector('.tr-closed[open]'),
    annonce: document.querySelector('#annonce')?.textContent || ''
  };
});

/* ---------- au pouce : la barre comprend, montre, se défait ---------- */
for (const [nom, vp, touch] of [['pouce', { width: 390, height: 844 }, true],
                                ['tablette', { width: 1024, height: 768 }, true]]){
  const { ctx, p } = await ecran(vp, touch);
  /* ④ vide et focalisée, elle propose — et seulement ce qui a une réponse */
  await p.click('#piQ');
  await p.waitForTimeout(250);
  const v = await lire(p);
  if (!v.props.length) fail(`${nom} : la barre vide et focalisée ne propose rien`);
  else if (v.props[0].t !== 'Alternance · Lille' || !/^\d+$/.test(v.props[0].n))
    fail(`${nom} : la première proposition ne vient pas du profil : ${JSON.stringify(v.props)}`);
  else if (v.props.some(x => !(Number(x.n) > 0))) fail(`${nom} : une proposition sans réponse : ${JSON.stringify(v.props)}`);
  else console.log(`${nom} · barre vide : ${v.props.map(x => x.t + ' ' + x.n).join(' | ')} ✓`);
  /* taper une proposition la pose dans le champ, et range le clavier */
  await p.click('#piChips .prop-chip');
  await p.waitForTimeout(300);
  const pr = await lire(p);
  const focus = await p.evaluate(() => document.activeElement && document.activeElement.id);
  if (pr.q !== 'alternance Lille') fail(`${nom} : la proposition ne se pose pas dans le champ (« ${pr.q} »)`);
  if (focus === 'piQ') fail(`${nom} : au doigt, le clavier reste ouvert après une proposition`);

  /* ① « alternance à Lille » : deux étiquettes, quatre pistes, la bonne exclue */
  await taper(p, 'alternance à Lille');
  if (touch) await p.evaluate(() => document.activeElement.blur());
  await p.waitForTimeout(200);
  const a = await lire(p);
  if (a.etiquettes.join('|') !== 'Alternance|Lille')
    fail(`${nom} : étiquettes ${JSON.stringify(a.etiquettes)} au lieu de Alternance|Lille`);
  const attendus = ['Advalys Cyber', 'Mairie de Lille — DSI', 'Lumen Data', 'Wavelink Support'];
  if (a.noms.slice().sort().join('|') !== attendus.slice().sort().join('|'))
    fail(`${nom} : « alternance à Lille » rend ${JSON.stringify(a.noms)}`);
  if (a.noms.includes('Cabinet Stagio'))
    fail(`${nom} : une piste qui DIT ne prendre que des stagiaires sort pour « alternance »`);
  /* celles qui prennent passent devant celles qui ne disent rien (le tableau
     range par colonne : on compare l'ordre là où il est une liste) */
  if (!touch || vp.width < 901){
    if (a.noms.indexOf('Lumen Data') < a.noms.indexOf('Mairie de Lille — DSI'))
      fail(`${nom} : une piste muette passe devant une qui prend des alternants : ${JSON.stringify(a.noms)}`);
  }
  /* ② la raison se lit — la plus forte d'abord */
  if (a.raisons['Advalys Cyber'] !== 'Léa y a été en alternance')
    fail(`${nom} : la raison d'Advalys est « ${a.raisons['Advalys Cyber']} »`);
  if (a.raisons['Mairie de Lille — DSI'] !== 'prend des alternants')
    fail(`${nom} : la raison de la Mairie est « ${a.raisons['Mairie de Lille — DSI']} »`);
  if (a.raisons['Lumen Data']) fail(`${nom} : une piste muette se donne une raison (« ${a.raisons['Lumen Data']} »)`);
  /* ⑦ ce qui est compris s'entend */
  if (!/4 pistes sur 11 — Alternance, Lille/.test(a.annonce))
    fail(`${nom} : l'annonce ne dit pas ce qui est compris : « ${a.annonce} »`);
  console.log(`${nom} · « alternance à Lille » : ${a.etiquettes.join(' + ')} → ${a.noms.length} pistes, raisons lues ✓`);
  await p.screenshot({ path: `${SHOTS}/95-recherche-${nom}.png` });

  /* ③ une ville propose son département quand ça trouve plus */
  const elargir = a.props.find(x => x.t === 'Nord (59)' && x.n === '+1');
  if (!elargir) fail(`${nom} : « Lille » ne propose pas le Nord (59) : ${JSON.stringify(a.props)}`);
  else {
    await p.click('#piChips .prop-chip');
    await p.waitForTimeout(300);
    const n = await lire(p);
    if (n.q !== 'alternance 59' || !n.noms.includes('Nordsys Réseaux'))
      fail(`${nom} : élargir rend « ${n.q} » et ${JSON.stringify(n.noms)}`);
    else console.log(`${nom} · élargir : « alternance 59 », Villeneuve-d’Ascq retrouvée ✓`);
  }
  /* ① taper une étiquette retire SES mots du champ, et rien d'autre */
  await taper(p, 'alternance à Lille');
  await p.click('#piChips .et-chip >> nth=1');
  await p.waitForTimeout(300);
  const r = await lire(p);
  if (r.q !== 'alternance' || r.etiquettes.join('|') !== 'Alternance')
    fail(`${nom} : retirer « Lille » laisse « ${r.q} » et ${JSON.stringify(r.etiquettes)}`);
  else console.log(`${nom} · retirer « Lille » : le champ dit « alternance », plus « à » ✓`);

  /* ③ le vide n'est jamais une impasse */
  await taper(p, 'orange lille');
  if (touch) await p.evaluate(() => document.activeElement.blur());
  await p.waitForTimeout(150);
  const o = await lire(p);
  if (!/^Aucune piste ne correspond\./.test(o.vide)) fail(`${nom} : le vide dit « ${o.vide} »`);
  if (!o.alternatives.some(t => /^Sans « Lille » ?1$/.test(t)))
    fail(`${nom} : le vide ne propose pas « Sans « Lille » » : ${JSON.stringify(o.alternatives)}`);
  else {
    await p.click('.el-alt button:has-text("Lille")');
    await p.waitForTimeout(300);
    const s = await lire(p);
    if (s.q !== 'orange' || !s.noms.includes('Orange Business'))
      fail(`${nom} : « Sans Lille » rend « ${s.q} » et ${JSON.stringify(s.noms)}`);
    else console.log(`${nom} · « orange lille » vide → « Sans Lille » retrouve Orange Business ✓`);
  }
  /* ⑥ un numéro n'est pas un téléphone, un état n'est pas un mot de note */
  await taper(p, '59');
  const d = await lire(p);
  if (d.etiquettes.join() !== 'Nord (59)') fail(`${nom} : « 59 » donne ${JSON.stringify(d.etiquettes)}`);
  if (d.noms.includes('Atelier Pixel')) fail(`${nom} : « 59 » remonte une piste de Paris par son numéro de téléphone`);
  await taper(p, 'réponse');
  const rep = await lire(p);
  if (rep.noms.includes('Atelier Pixel')) fail(`${nom} : « réponse » remonte une note, pas un état`);
  if (rep.noms.slice().sort().join('|') !== 'Lumen Data|Orange Business')
    fail(`${nom} : « réponse » rend ${JSON.stringify(rep.noms)}`);
  /* les mots de l'écran se cherchent : « sans nouvelles » */
  await taper(p, 'sans nouvelles');
  const sn = await lire(p);
  if (sn.noms.slice().sort().join('|') !== 'Adrastia Systèmes|Mairie de Lille — DSI')
    fail(`${nom} : « sans nouvelles » rend ${JSON.stringify(sn.noms)}`);
  else console.log(`${nom} · « 59 », « réponse », « sans nouvelles » : des sens, pas des lettres ✓`);
  /* une piste clôturée trouvée : la tranche s'ouvre — un `<details>` replié
     cacherait exactement ce qu'on cherchait */
  await taper(p, 'refusé');
  const cl = await lire(p);
  if (!cl.clotureesOuvertes || !cl.noms.includes('Sopraxis Conseil'))
    fail(`${nom} : « refusé » ne montre pas la piste clôturée`);
  if (vp.width >= 901 && cl.tableau) fail(`${nom} : un tableau vide reste posé au-dessus de la seule piste trouvée`);
  /* rien ne déborde : la feuille ne glisse jamais sous le doigt */
  const large = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (large) fail(`${nom} : la page défile latéralement`);
  await ctx.close();
}

/* ---------- au poste : le clavier suffit ---------- */
{
  const { ctx, p } = await ecran({ width: 1280, height: 800 }, false);
  await p.click('#view-pistes h1');
  await p.keyboard.press('/');
  await p.keyboard.type('alternance lille', { delay: 8 });
  await p.waitForTimeout(320);
  const k = await p.evaluate(() => {
    const c = document.querySelector('.est-premier');
    const vu = s => { const n = document.querySelector(s); return !!n && getComputedStyle(n).display !== 'none'; };
    return { premier: c && (c.querySelector('b') || c).textContent.trim(),
             entree: !!c && getComputedStyle(c.querySelector('.kbd-enter')).display !== 'none',
             bas: vu('.kbd-bas'), slash: vu('.kbd-hint:not(.kbd-bas)') };
  });
  /* ⑤ la touche s'annonce dans ce qu'elle commande */
  if (k.premier !== 'Advalys Cyber') fail(`poste : la première piste (↵) est « ${k.premier} »`);
  if (!k.entree) fail('poste : ↵ ne s’annonce pas sur la carte qu’Entrée ouvrirait');
  if (!k.bas || k.slash) fail(`poste : la barre n'annonce pas ↓ à la place de « / » (↓ ${k.bas}, / ${k.slash})`);
  const ou = () => p.evaluate(() => {
    const a = document.activeElement;
    return a.id === 'piQ' ? 'barre' : (a.closest('[data-id]')?.querySelector('h3, b')?.textContent.trim() || a.tagName);
  });
  const chemin = [];
  for (const t of ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowUp']){
    await p.keyboard.press(t);
    chemin.push(await ou());
  }
  /* ↓ → la carte ↵, ↓ → la suivante dans sa colonne, → → la colonne voisine
     à la même hauteur, ↑ en tête → la barre */
  const attendu = ['Advalys Cyber', 'Wavelink Support', 'Mairie de Lille — DSI', 'Lumen Data',
                   'Mairie de Lille — DSI', 'barre', 'barre'];
  if (chemin.join('|') !== attendu.join('|')) fail(`poste : flèches → ${chemin.join(' › ')}`);
  else console.log(`poste · flèches : ${chemin.join(' › ')} ✓`);
  /* Échap depuis une carte rend la barre, recherche intacte */
  await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Escape');
  const e = await p.evaluate(() => [document.activeElement.id, document.querySelector('#piQ').value]);
  if (e[0] !== 'piQ' || e[1] !== 'alternance lille') fail(`poste : Échap depuis une carte → ${JSON.stringify(e)}`);
  /* Entrée ouvre la carte ↵ */
  await p.keyboard.press('Enter');
  await p.waitForSelector('.overlay .modal', { timeout: 4000 }).catch(() => {});
  const titre = await p.evaluate(() => document.querySelector('.overlay .mh-t')?.textContent || '');
  if (!/Advalys Cyber/.test(titre)) fail(`poste : Entrée n'ouvre pas la première piste (« ${titre} »)`);
  else console.log('poste · « / » + frappe + Entrée = la fiche, sans quitter le clavier ✓');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  /* Le focus ne tombe pas par terre (§6) : une étiquette retirée AU CLAVIER
     rend la main à sa voisine, sinon à la barre */
  await p.click('#piQ');
  await p.keyboard.press('ArrowDown');
  await p.evaluate(() => document.querySelector('#piChips .et-chip').focus());
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  const apres = await p.evaluate(() => [document.activeElement.className, document.querySelector('#piQ').value]);
  if (apres[1] !== 'lille' || !/et-chip|search/.test(apres[0]))
    fail(`poste : retirer une étiquette au clavier → focus « ${apres[0]} », champ « ${apres[1]} »`);
  await p.screenshot({ path: `${SHOTS}/95-recherche-poste.png` });
  await ctx.close();
}

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E recherche : ÉCHEC' : 'E2E recherche : OK');
