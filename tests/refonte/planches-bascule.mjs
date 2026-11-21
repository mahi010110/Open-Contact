/* ============================================================
   OpenContact · la bascule · ce qui ne revient pas, en planches
   (docs/bascule.md §1, docs/table-de-passage.md « Ce qui quitte l'écran »)

   Usage : OC_AVANT=<captures de l'app actuelle> node tests/refonte/planches-bascule.mjs [dossier]

   Deux planches, montrées au mainteneur AVANT la bascule, tant que l'app
   actuelle existe encore : les trois gestes sans remplaçant (l'ancien
   geste, et ce qui l'attend dans la nouvelle interface), puis la liste
   de ce qui est remplacé par mieux, en une page.
   ============================================================ */
import path from 'path';
import os from 'os';
import { access, mkdir, writeFile, mkdtemp } from 'fs/promises';
import { lancer } from './outils.mjs';
import { ROOT, chromium, chromiumPath, serveRepo } from '../e2e/outils.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';

const { OUT, ouvrir, fermer, etat } = await lancer('planches-bascule');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('09-modifier--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';

/* l'app ACTUELLE : une piste reçue d'un camarade qui y est passé — le
   bandeau « Léa y a fait son stage » (comme e2e-vecu.mjs) */
const { server, base } = await serveRepo();
const b = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const pg = await ctx.newPage();
await pg.goto(base + '/', { waitUntil: 'load' });
await pg.evaluate(async () => {
  const st = await import('./engine/storage.js');
  const { normalizeCompany } = await import('./engine/model.js');
  const { sharePayload } = await import('./engine/exchange.js');
  const { mergeIncoming } = await import('./engine/merge.js');
  await st.kvInit();
  const p = sharePayload([normalizeCompany({ name: 'Adrastia Systèmes', city: 'Toulouse', domain: 'esn', vecu: 'stage',
    contacts: [{ id: 'c1', name: 'Nadia Benali', role: 'RH', email: 'n@a.test' }] })], null, 'Léa');
  const mes = [];
  mergeIncoming(p.companies, mes);
  await st.kvSet(st.DATA_KEY, JSON.stringify(mes));
  localStorage.setItem('oc_profile_v1', JSON.stringify({ name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance' }));
});
await pg.reload({ waitUntil: 'load' });
await pg.waitForTimeout(900);
await pg.evaluate(async () => {
  const { openFiche } = await import('./ui/fiche.js');
  const { S } = await import('./ui/state.js');
  openFiche(S.companies.find(c => c.name.startsWith('Adrastia')));
});
await pg.waitForTimeout(700);
await pg.screenshot({ path: path.join(P, 'a-vecu-avant.png') });
await b.close();
server.close();

/* la NOUVELLE interface : ce qui attend à la place */
const img = async (p, n) => { await p.waitForTimeout(400); await p.evaluate(() => { const c = document.querySelector('.couche-a'); if (c) c.innerHTML = '';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }); await p.screenshot({ path: path.join(P, n + '.png') }); };
const PROFIL = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15, updatedAt: Date.now() - 864e5 };
const PISTES = [
  { id: 'adr', name: 'Adrastia Systèmes', city: 'Toulouse', status: 'todo', createdAt: 1, vecu: 'stage',
    contacts: [{ id: 'c1', name: 'Nadia Benali', role: 'RH', email: 'n@a.test' }] },
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'active', appliedAt: '2026-11-10', createdAt: 2, contacts: [{ id: 'k1', name: 'Léa Roux', role: 'RH', email: 'lea.roux@kiabi.test' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 3 },
  { id: 'opa', name: 'Opale Systèmes', city: 'Lille', status: 'reply', createdAt: 4 }
];
const tel = { mobile: true, echelle: 2, calme: true, profil: PROFIL, pistes: PISTES };
const A = await ouvrir(390, 844, { ...tel, adresse: '#/pistes' });
await img(A.p, 'c-pistes-apres');
await A.p.click(T + '.r-c[data-a="piste"][data-id="adr"]'); await A.p.waitForTimeout(450);
await A.p.click(T + 'details.pli[data-p="ent"] summary').catch(() => {});
await A.p.evaluate(() => { const d = document.querySelector('.ecran .plis'); if (d) d.scrollIntoView({ block: 'center' }); });
await img(A.p, 'a-piste-apres');
await A.ctx.close();
const M = await ouvrir(390, 844, { ...tel, adresse: '#/moi' });
await M.p.click(T + '[data-a="m-ouvrir"][data-id="profil"]'); await M.p.waitForTimeout(450);
await M.p.evaluate(() => { const d = document.querySelector('.ecran .m-parcours'); if (d) d.scrollIntoView({ block: 'center' }); });
await img(M.p, 'b-parcours-apres');
await M.ctx.close();
await fermer();

const X = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'bascule-sans-remplacant.png'), reelle: true,
  titre: 'Avant la bascule : trois gestes qui ne reviennent pas',
  sousTitre: 'En haut l’app d’aujourd’hui ; en bas, ce qui les attend dans la nouvelle. Rien ne remplace les deux premiers : à toi de choisir.',
  avant: [[avant('09-modifier--390'), '1. Modifier une piste (nom, ville, site, technos)'], [X('a-vecu-avant'), '2. « J’y suis passé » sur une piste : « Léa y a fait son stage »'],
    [avant('20-affiner--390'), '3. « Affiner » et trier Pistes']],
  apres: [[X('a-piste-apres'), '1. Rien : la page d’une piste ne se modifie pas'], [X('b-parcours-apres'), '2. « Mon parcours » le dit aux amis, pas au groupe'],
    [X('c-pistes-apres'), '3. « À faire » et les étapes font le tri']] });

/* la liste de ce qui est remplacé par mieux, en une page */
const REMPLACE = [
  ['L’onglet « Aujourd’hui »', '« À faire », en tête de Pistes'],
  ['Le « + » et « Nouvelle piste »', 'la barre de Trouver'],
  ['Les feuilles empilées', 'une entreprise, une piste : des pages'],
  ['« Mes pistes · À découvrir »', 'les onglets Pistes et Trouver'],
  ['« Voir un exemple »', 'de vraies entreprises dès la première minute'],
  ['Le tableau à trois colonnes', 'au poste : la liste, la piste, son message'],
  ['La touche « n »', '« / » dans Trouver, ou Ctrl V une offre'],
  ['« Prochaine action ? » à la main', 'la suite de chaque piste, et l’agenda'],
  ['La marque « nouveau »', 'rien (elle ne marquait presque rien)'],
  ['Les filtres des conversations', 'le non-lu en gras, en haut'],
  ['« → qui » dans Donner', 'une piste part avec ses contacts'],
  ['Chiffrer un fichier de pistes', 'la copie de Moi garde son mot de passe'],
  ['Le rendez-vous en direct', 'le QR qui défile, sans réseau'],
  ['« Écrire à un ami » en bas', 'la page de l’ami'],
  ['« Ignorer » un contact donné', '« Mes demandes »'],
  ['Trier et chercher ses amis', 'la liste, rangée par nom'],
  ['« Nouveau modèle », « Supprimer »', 'les trois messages types'],
  ['Le champ « LinkedIn ou portfolio »', 'rien (la donnée reste)'],
  ['« Connexion avancée »', 'rien (les réglages faits restent lus)'],
  ['L’appareil principal', 'le code, propre à chaque appareil'],
  ['« Changer mon code », l’empreinte', 'retirer le code, en choisir un'],
  ['La copie exigée en protégeant', 'la phrase de secours dépose la copie'],
  ['Restaurer qui remplace tout', 'restaurer qui ramène, avec « Annuler »']
];
/* les guillemets ne se séparent jamais de leur mot */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»');
const html = `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#CBC8BB;color:#1D242C;font:16px/1.4 system-ui,sans-serif;padding:28px;width:1200px}
h1{margin:0 0 4px;font-size:26px}p.s{margin:0 0 18px;color:#5C6672}
.l{display:grid;grid-template-columns:1fr 1fr;gap:0 28px;background:#F7F6F1;border:1px solid #1D242C;box-shadow:4px 4px 0 rgba(29,36,44,.16);padding:10px 18px}
.r{display:flex;gap:10px;padding:8px 0;border-bottom:1px dashed #b9b6a8}.r b{flex:0 0 260px;font-weight:600}.r span{color:#0B7268}</style>
<h1>Avant la bascule : le reste de ce qui quitte l’écran</h1><p class="s">À gauche ce qui part, à droite ce qui le fait à sa place, ou rien. Aucune donnée ne se perd.</p>
<div class="l">${REMPLACE.map(([a, b]) => `<div class="r"><b>${esc(a)}</b><span>→ ${esc(b)}</span></div>`).join('')}</div>`;
const dir = await mkdtemp(path.join(os.tmpdir(), 'oc-planche-'));
await writeFile(path.join(dir, 'l.html'), html);
const b2 = await chromium.launch({ executablePath: chromiumPath() });
const p2 = await b2.newPage({ viewport: { width: 1256, height: 700 }, deviceScaleFactor: 2 });
await p2.goto('file://' + path.join(dir, 'l.html')); await p2.waitForTimeout(300);
await p2.screenshot({ path: path.join(OUT, 'bascule-remplace.png'), fullPage: true });
await b2.close();
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 5).join('\n'));
