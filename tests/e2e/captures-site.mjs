/* ============================================================
   LES CAPTURES DU SITE DE PRÉSENTATION

   Une page qui vante un produit sans le montrer demande un acte de
   foi. Ces trois captures sont donc l'app RÉELLE, pas un dessin :
   même code, mêmes tokens, mêmes polices. Elles se refabriquent
   d'une commande — `node tests/e2e/captures-site.mjs` — le jour où
   un écran change, ce qui est la seule façon qu'une image de
   présentation ne devienne pas un mensonge poli.

   Les trois écrans ne sont pas choisis au hasard : ce sont les trois
   arguments de `presentation.html`, dans l'ordre.
     ① « Aujourd'hui »  → « je fais quoi maintenant ? » (CLAUDE.md §1)
     ② la fiche         → le lien humain qui voyage (§8, le 40:1)
     ③ « Écrire »       → le geste le plus cher, et sa matière (§7)

   Les données semées sont INVENTÉES de bout en bout. Aucune
   entreprise réelle : une capture publique qui nomme une vraie boîte
   laisse croire à un partenariat que personne n'a signé.
   ============================================================ */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, chromiumPath, serveRepo, ROOT } from './outils.mjs';

const DEST = path.join(ROOT, 'assets', 'site');
await mkdir(DEST, { recursive: true });

const j = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const GRAINE = async ([auj, il12, il26, il40]) => {
  const { S, saveData, saveJournal } = await import('./ui/state.js');
  const { normalizeCompany } = await import('./engine/model.js');
  S.profile.name = 'Maheydine Oun';
  S.profile.formation = 'BTS SIO SISR';
  S.profile.email = 'maheydine.oun@etu.test';
  S.profile.phone = '06 12 34 56 78';
  S.companies = [
    /* ce qui est PLANIFIÉ : la première tranche, celle qui répond à
       « je fais quoi maintenant ? » */
    { id: 'c1', name: 'Zephyr SI', city: 'Bordeaux', status: 'active', domain: 'cyber',
      website: 'zephyr-si.example', desc: 'ESN de 40 personnes, pôle cybersécurité.',
      techs: 'Wazuh, Suricata, Proxmox', tips: 'Le pôle SOC prend deux alternants par an.',
      vecu: 'stage', vecuQui: 'Léa',
      nextActionText: 'Relancer Camille', nextAction: auj,
      history: [{ d: il12, t: 'Candidature envoyée' }],
      contacts: [{ id: 'p1', name: 'Camille Roussel', role: 'Responsable du SOC',
                   email: 'c.roussel@zephyr-si.example' }] },
    { id: 'c2', name: 'Néorézo', city: 'Mérignac', status: 'active', domain: 'réseau',
      website: 'neorezo.example', desc: 'Intégrateur réseau et téléphonie.',
      techs: 'Cisco, Fortinet',
      nextActionText: 'Envoyer le CV à jour', nextAction: auj,
      history: [{ d: il12, t: 'Appel : rappeler fin du mois' }],
      contacts: [{ id: 'p2', name: 'Sofiane Merabet', role: 'Chef de projet',
                   email: 's.merabet@neorezo.example' }] },
    { id: 'c3', name: 'Atelier Cloud du Sud', city: 'Talence', status: 'reply', domain: 'cloud',
      nextActionText: 'Préparer l’entretien', nextAction: auj,
      history: [{ d: il12, t: 'Réponse : entretien à caler' }],
      contacts: [{ id: 'p3', name: 'Inès Faure', role: 'RH',
                   email: 'ines@atelier-cloud.example' }] },
    /* ce qui SE TAIT : la tranche que l'app est seule à savoir montrer */
    { id: 'c4', name: 'Groupe Vermeil', city: 'Pessac', status: 'reply', domain: 'infogérance',
      website: 'vermeil.example', desc: 'Infogérance pour PME.',
      history: [{ d: il26, t: 'Réponse : « on revient vers vous »' }],
      contacts: [{ id: 'p4', name: 'Awa Diallo', role: 'Alternante infra',
                   email: 'a.diallo@vermeil.example' }] },
    { id: 'c5', name: 'Solaris Data', city: 'Bègles', status: 'active', domain: 'données',
      history: [{ d: il40, t: 'Candidature envoyée' }],
      contacts: [{ id: 'p5', name: 'Yanis Perrot', role: 'Lead data',
                   email: 'y.perrot@solaris-data.example' }] },
    /* et ce qui attend : de quoi nourrir « par où commencer » */
    { id: 'c6', name: 'Maison Delcourt', city: 'Bordeaux', status: 'todo', domain: 'cyber',
      contacts: [{ id: 'p6', name: 'Nour Benali', role: 'DSI', email: 'n.benali@delcourt.example' }] },
    { id: 'c7', name: 'Ostrea Systèmes', city: 'Arcachon', status: 'todo', domain: 'cloud',
      contacts: [] }
  ].map(normalizeCompany);
  S.journal = [
    { t: Date.now() - 2 * 864e5, txt: 'Reçu du groupe : +7 piste(s)', ids: ['c6', 'c7'] },
    { t: Date.now() - 5 * 864e5, txt: 'Donné (QR) : 4 piste(s)', ids: ['c1'] }
  ];
  saveJournal(); saveData();
};

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true
});
const page = await ctx.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(String(e)));

await page.goto(base, { waitUntil: 'load' });
await page.waitForSelector('#view-aujourdhui:not([hidden])');
await page.evaluate(GRAINE, [j(0), j(-12), j(-26), j(-40)]);
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#view-aujourdhui:not([hidden])');
await page.waitForTimeout(600);

const prendre = async (nom, mesure) => {
  await page.screenshot({ path: path.join(DEST, nom) });
  console.log(nom.padEnd(26) + mesure);
};

/* ① « Aujourd'hui » */
await prendre('aujourdhui.png', await page.evaluate(() =>
  document.querySelectorAll('#view-aujourdhui .act-in').length + ' geste(s), '
  + document.querySelectorAll('#view-aujourdhui .mark').length + ' en retard'));

/* ② la fiche, et le bandeau « Léa y a fait son stage » */
await page.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  const { openFiche } = await import('./ui/fiche.js');
  openFiche(S.companies.find(c => c.id === 'c1'));
});
await page.waitForSelector('.fi-vecu', { timeout: 10000 });
await page.waitForTimeout(500);
await prendre('fiche.png', await page.evaluate(() =>
  '« ' + (document.querySelector('.fi-vecu')?.innerText.trim().split('\n')[0] || '?') + ' »'));

/* ③ « Écrire », avec sa matière sous les yeux */
await page.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  const { openMail } = await import('./ui/mail.js');
  openMail(S.companies.find(c => c.id === 'c1'));
});
await page.waitForSelector('.ml-know', { timeout: 10000 });
await page.waitForTimeout(600);
await prendre('ecrire.png', await page.evaluate(() =>
  'carte « À savoir » : ' + (document.querySelector('.ml-know') ? 'présente' : 'ABSENTE')));

await browser.close();
server.close();
console.log(erreurs.length ? 'Erreurs console : ' + erreurs.join(' | ') : 'Zéro erreur console.');
console.log(erreurs.length ? 'Captures site : ÉCHEC' : 'Captures site : OK — ' + DEST);
if (erreurs.length) process.exitCode = 1;
