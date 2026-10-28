/* ============================================================
   E2E — ton parcours, en un fichier (lot R9-a, ouvert en 7.0.0)
   (docs/propositions/R9-tous-les-metiers.md)

   LA FUITE D'ABORD : le fichier qui sort par le vrai bouton ne porte que
   ce que le profil dit — ni note, ni contact, ni piste que le parcours ne
   porte pas, ni le passage d'un camarade, ni un ami, ni l'état d'une
   candidature. Puis :
   ① « Mon parcours » porte « Exporter » à côté d'« Ajouter » ; la feuille
     montre le fichier ligne par ligne, et TOUT ce qui part s'y lit ;
     « Télécharger » fait partir un JSON Resume valide (schéma v1.0.0,
     dates AAAA-MM) ; on exporte ce qu'on a sous les yeux, enregistré ou
     non ;
   ② sans parcours, pas d'« Exporter » ;
   pouce clair et sombre, poste ; zéro erreur console.
   Deux mutations : une note qui glisse dans le fichier, une ligne qui
   part sans être montrée.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, annuaireMuet, relaisMuets, ROOT, SHOTS } from './outils.mjs';
import { readFile } from 'fs/promises';
import path from 'path';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
let ko = 0;
const ok = (c, msg) => { if (c) console.log(msg + ' ✓'); else { ko++; console.log('ÉCHEC — ' + msg); } };

const PISTES = [
  { id: 'th', name: 'Thales', city: 'Lille', status: 'active', vecu: 'stage', notes: 'note secrète sur Thales',
    contacts: [{ id: 'c1', name: 'Claire Dubois', email: 'claire@thales.test', role: 'RH' }] },
  { id: 'or', name: 'Orange', city: 'Lille', status: 'todo', vecu: 'stage', vecuQui: 'Léa', notes: 'privé' },
  { id: 'ze', name: 'Zephyr SI', city: 'Roubaix', status: 'reply', notes: 'à relancer lundi' }
];
const PROFIL = { name: 'Inès Martin', email: 'ines@exemple.test', phone: '06 12 34 56 78', ville: 'Lille',
  formation: 'BTS SIO SISR', ecole: 'Lycée Gustave Eiffel', portfolio: 'https://www.linkedin.com/in/ines-martin',
  cvUrl: 'https://exemple.test/cv-secret.pdf', recherche: 'alternance', rythme: '2 semaines / 2 semaines',
  parcours: [{ id: 'p1', entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', fin: '' },
             { id: 'p2', entreprise: 'Kiabi', quoi: 'stage', debut: '2025-01', fin: '2025-03' }],
  amiId: 'InesInesInesInesInes01',
  amis: [{ id: 'KarimKarimKarimKarim01', nom: 'Karim Benali', parcours: [{ entreprise: 'Sopra Steria', quoi: 'stage' }], recu: 1 }] };
const INTERDITS = ['note secrète', 'Claire', 'claire@thales.test', 'Orange', 'Léa', 'Zephyr', 'relancer', 'Karim',
  'Sopra', 'cv-secret', '2 semaines', '"active"', '"todo"', '"reply"', 'InesInes'];

async function ecran(nom, { vp = { width: 390, height: 844 }, sombre = false,
                            profil = PROFIL, mutations = {} } = {}){
  const ctx = await browser.newContext({ viewport: vp, hasTouch: vp.width < 901, colorScheme: sombre ? 'dark' : 'light',
                                         acceptDownloads: true,
    /* le module d'export se charge au geste, APRÈS l'installation du
       service worker : sans ce blocage, ses requêtes passent par lui et
       échappent aux mutations servies par `route` */
    serviceWorkers: 'block' });
  await annuaireMuet(ctx); await relaisMuets(ctx);
  for (const [f, body] of Object.entries(mutations))
    await ctx.route('**/' + f, r => r.fulfill({ contentType: 'text/javascript', body }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errors.push(nom + ' : ' + e));
  p.on('console', m => { if (m.type() === 'error') errors.push(nom + ' : ' + m.text()); });
  await p.goto(base + '/#/moi');
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.evaluate(async ([ps, pr]) => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(pr));
  }, [PISTES, profil]);
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
  await p.waitForTimeout(400);
  /* le profil, là où vit « Mon parcours » */
  await p.evaluate(async () => (await import('./ui/profil.js')).openProfil());
  await p.waitForTimeout(450);
  return { ctx, p };
}
const dessus = p => p.evaluate(() => [...document.querySelectorAll('.overlay:not(.ov-out) .mh-t')].pop()?.textContent.trim() || '');

/* le parcours d'export joué en entier : la feuille, puis le fichier */
async function exporter(o = {}){
  const { ctx, p } = await ecran(o.nom || 'export', o);
  const bouton = await p.$('#pfParExp');
  if (!bouton){ await ctx.close(); return { bouton: false }; }
  /* ce qu'on a sous les yeux part, enregistré ou non */
  if (o.renomme){ await p.fill('#pfName', o.renomme); await p.waitForTimeout(100); }
  const gestes = await p.evaluate(() => [...document.querySelectorAll('.pf-par-gestes button')].map(b => b.textContent.trim()));
  await bouton.scrollIntoViewIfNeeded();
  if (o.shot) await p.screenshot({ path: `${SHOTS}/r9-parcours-${o.shot}.png` });
  await bouton.click();
  await p.waitForTimeout(450);
  const titre = await dessus(p);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('#cvDonne li')].map(li => [...li.children].map(x => x.textContent.trim()).join(' ').replace(/\s+/g, ' ')));
  const go = await p.evaluate(() => document.querySelector('#cvGo')?.textContent.trim());
  if (o.shot) await p.screenshot({ path: `${SHOTS}/r9-export-${o.shot}.png` });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#cvGo')]);
  const brut = await readFile(await dl.path(), 'utf8');
  await p.waitForTimeout(300);
  const apres = await dessus(p);
  await ctx.close();
  let cv = null;
  try { cv = JSON.parse(brut); } catch (e) {}
  return { bouton: true, gestes, titre, lignes, go, nomFichier: dl.suggestedFilename(), brut, cv, apres };
}

/* ---------- la fuite d'abord, puis ① ---------- */
const DATE = /^\d{4}-(0[1-9]|1[0-2])$/;
const fuite = r => INTERDITS.filter(x => r.brut.includes(x));
/* tout ce qui part se lit dans la feuille : chaque valeur du fichier
   apparaît dans une de ses lignes */
const montre = r => {
  if (!r.cv) return ['pas un JSON'];
  const vals = [];
  const b = r.cv.basics || {};
  vals.push(b.name, b.email, b.phone, b.url, b.location && b.location.city, ...(b.profiles || []).map(x => x.url));
  for (const e of r.cv.education || []) vals.push(e.institution, e.studyType, e.area);
  for (const w of r.cv.work || []) vals.push(w.name, w.position);
  const tout = r.lignes.join(' | ');
  return vals.filter(Boolean).filter(v => !tout.includes(v));
};
{
  const r = await exporter({ shot: 'pouce', renomme: 'Inès Martin-Leroy' });
  ok(r.bouton && r.gestes.join(' · ') === 'Ajouter · Exporter', '① « Mon parcours » : Ajouter · Exporter — ' + (r.gestes || []).join(' · '));
  ok(!fuite(r).length, 'LA FUITE D’ABORD : ni note, ni contact, ni piste hors parcours, ni camarade, ni ami, ni suivi — ' + fuite(r).join(', '));
  ok(r.titre === 'Exporter' && r.go === 'Télécharger', `① la feuille « Exporter », et « Télécharger » au pied — « ${r.titre} » / « ${r.go} »`);
  ok(!montre(r).length, '① tout ce qui part se lit dans la feuille — manquent : ' + montre(r).join(', '));
  ok(r.lignes.join(' | ') === 'Inès Martin-Leroy | ines@exemple.test · 06 12 34 56 78 · Lille | https://www.linkedin.com/in/ines-martin'
     + ' | BTS SIO SISR · Lycée Gustave Eiffel | Aztek Alternance · depuis 2025 | Kiabi Stage · 2025 | Thales Stage',
     '① la feuille, ligne par ligne — ' + r.lignes.join(' | '));
  const cv = r.cv || {};
  ok(r.nomFichier === `opencontact-parcours-${new Date().toISOString().slice(0, 10)}.json` || /^opencontact-parcours-\d{4}-\d{2}-\d{2}\.json$/.test(r.nomFichier),
     '① le fichier s’appelle « opencontact-parcours-… .json » — ' + r.nomFichier);
  ok(cv.$schema && cv.$schema.includes('jsonresume') && cv.meta && cv.meta.version === 'v1.0.0'
     && cv.basics.name === 'Inès Martin-Leroy'
     && (cv.work || []).map(w => w.name + '/' + w.position).join(',') === 'Aztek/Alternance,Kiabi/Stage,Thales/Stage'
     && (cv.work || []).every(w => (!w.startDate || DATE.test(w.startDate)) && (!w.endDate || DATE.test(w.endDate)))
     && cv.education[0].studyType === 'BTS' && cv.education[0].area === 'SIO SISR',
     '① un JSON Resume v1.0.0 : toi, ta formation, ton parcours, dates AAAA-MM — ce qu’on a sous les yeux, même pas enregistré');
  ok(!r.apres || r.apres === 'Mon profil', '① parti : la feuille d’export se ferme, le profil reste — « ' + r.apres + ' »');
}
{
  const r = await exporter({ nom: 'export-sombre', sombre: true, shot: 'pouce-sombre' });
  ok(r.bouton && !fuite(r).length, '① pouce sombre : la même feuille, le même fichier');
}
{
  const r = await exporter({ nom: 'export-poste', vp: { width: 1280, height: 800 }, shot: 'poste' });
  ok(r.bouton && r.go === 'Télécharger' && !fuite(r).length, '① poste : « Télécharger », le même fichier');
}

/* ---------- ② sans parcours ---------- */
{
  const { ctx, p } = await ecran('sans-parcours', { profil: { ...PROFIL, parcours: [] } });
  /* Thales reste « J'y suis passé » chez moi : il y a donc un parcours */
  const avec = !!(await p.$('#pfParExp'));
  await ctx.close();
  const pistes = PISTES.map(c => ({ ...c, vecu: c.vecuQui ? c.vecu : '' }));
  const { ctx: c2, p: p2 } = await (async () => {
    const r = await ecran('sans-rien', { profil: { ...PROFIL, parcours: [] } });
    await r.p.evaluate(async ps => {
      const st = await import('./engine/storage.js');
      await st.kvSet(st.DATA_KEY, JSON.stringify(ps));
    }, pistes);
    await r.p.reload();
    await r.p.waitForFunction(() => !!document.querySelector('#sbVer')?.textContent);
    await r.p.evaluate(async () => (await import('./ui/profil.js')).openProfil());
    await r.p.waitForTimeout(450);
    return { ctx: r.ctx, p: r.p };
  })();
  const sans = !!(await p2.$('#pfParExp'));
  const ajouter = !!(await p2.$('#pfParAdd'));
  await c2.close();
  ok(avec && !sans && ajouter, '② sans parcours, pas d’« Exporter » — « Ajouter » reste ; une piste « J’y suis passé » suffit à en faire un');
}

/* ---------- les mutations : chaque garde doit rougir ---------- */
async function muter(nom, f, avant, apres, rejouer, rougit){
  const src = await readFile(path.join(ROOT, f), 'utf8');
  if (!src.includes(avant)){ ko++; console.log(`ÉCHEC — mutation ${nom} : le texte visé n’existe plus dans ${f}`); return; }
  console.log(`mutation ${nom} : le fichier servi est bien modifié ✓`);
  const r = await rejouer({ [f]: src.replace(avant, apres) });
  ok(rougit(r), `mutation ${nom} : la garde rougit`);
}
await muter('① une note qui glisse dans le fichier', 'engine/cv.js',
  'name: e.entreprise,', 'name: e.entreprise, summary: (companies || []).map(c => c.notes).join(" "),',
  m => exporter({ nom: 'mut-fuite', mutations: m }), r => fuite(r).length > 0);
await muter('② une ligne qui part sans être montrée', 'engine/cv.js',
  'for (const w of (cv && cv.work) || []){', 'for (const w of ((cv && cv.work) || []).slice(1)){',
  m => exporter({ nom: 'mut-montre', mutations: m }), r => montre(r).length > 0);

ok(!errors.length, 'Zéro erreur console' + (errors.length ? ' — ' + errors.slice(0, 4).join(' | ') : ''));
await browser.close();
server.close();
console.log(ko ? `\nE2E export : ${ko} ÉCHEC(S)` : '\nE2E export : OK');
process.exit(ko ? 1 : 0);
