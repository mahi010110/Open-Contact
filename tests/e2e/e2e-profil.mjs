/* ============================================================
   « Mon profil » — ce que tes mails disent de toi.

   Le profil ne sert qu'à une chose : écrire des mails justes. Ce
   scénario le vérifie par le bout qui compte — le MAIL qui sort du
   composeur —, et non par les champs qui se remplissent. Un champ bien
   rangé qui n'atteint pas le mail ne prouve rien.

   Il garde aussi les trois façons de frustrer quelqu'un qu'on a
   trouvées en le construisant :
   ① perdre ce qu'on a tapé (un glissé fermait la feuille sans un mot) ;
   ② refuser sans dire pourquoi (une date cachée bloquait « Emploi ») ;
   ③ promettre ce qui n'arrive pas (« Ton CV partira avec tes emails »).
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const errors = [];
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const okSi = (cond, msg) => { if (cond) console.log(msg + ' ✓'); else fail(msg); };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/#/moi', { waitUntil: 'load' });
/* une piste avec un contact joignable : le mail final se lit dans le composeur */
await page.evaluate(() => localStorage.setItem('oc_data_v3', JSON.stringify([{
  id: 'w1', name: 'Worldline', city: 'Seclin', status: 'todo', updatedAt: Date.now(),
  contacts: [{ id: 'k1', name: 'Nadia Rahmani', email: 'nadia@worldline.example' }]
}])));
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#moiProfil');

/* ---------- 1. remplir : la recherche décide des champs ---------- */
await page.click('#moiProfil');
await page.waitForSelector('#pfEcole');
okSi(!(await page.$('#pfDebut')), 'rien choisi : aucune date demandée');
await page.fill('#pfName', 'Sam Martin');
await page.fill('#pfFormation', 'BTS SIO SISR 2e année');
await page.fill('#pfEcole', 'Lycée Gustave Eiffel');
await page.click('.dchip[data-r="alternance"]');
await page.waitForSelector('#pfRythme');
await page.fill('#pfDebut', '2027-09-01');
await page.fill('#pfFin', '2029-08-31');
await page.fill('#pfRythme', '3 jours en entreprise, 2 à l’école');
okSi((await page.textContent('#pfDuree')).trim() === '2 ans', 'la durée se déduit des deux dates');
const apercu = await page.textContent('#pfAp');
okSi(apercu.includes('je cherche une alternance de 2 ans à partir du 1er septembre 2027'),
  'l’aperçu montre la phrase du mail pendant qu’on tape');

/* ---------- 2. une erreur se dit au bon moment, sur son champ ---------- */
await page.fill('#pfEmail', 'sam.martin@lycee');
okSi(await page.$eval('#pfEmailErr', e => e.hidden), 'pas de reproche pendant la frappe');
await page.click('#pfPhone');                          /* on quitte le champ */
okSi(!(await page.$eval('#pfEmailErr', e => e.hidden))
  && (await page.getAttribute('#pfEmail', 'aria-invalid')) === 'true',
  'l’adresse incomplète se signale en quittant le champ, et se DIT (aria-invalid)');
await page.click('.modal .btn-primary');
await page.waitForTimeout(250);
okSi(!!(await page.$('#pfEcole')), 'une adresse fausse retient l’enregistrement, la feuille garde tout');
await page.fill('#pfEmail', 'sam.martin@lycee.fr');
okSi(await page.$eval('#pfEmailErr', e => e.hidden), 'corrigée, l’erreur part d’elle-même');
await page.click('.modal .btn-primary');
await attendre(page, () => !document.querySelector('#pfEcole'), { message: 'la feuille se ferme' });

/* ---------- 3. « Moi » dit ce qui est rempli, et rien d'autre ---------- */
const obj = await page.textContent('#view-moi .obj');
okSi(obj.includes('BTS SIO SISR 2e année · Lycée Gustave Eiffel'), 'formation et école sur une ligne');
okSi(obj.includes('Alternance · 2 ans dès le 1er sept. 2027'), 'la recherche se résume sous le nom');
okSi(!(await page.$('#view-moi .obj-creux')), 'profil complet : aucun creux');
okSi((await page.textContent('#moiProfil')).trim() === 'Modifier', 'le verbe passe à « Modifier »');

/* ---------- 4. le MAIL, par le vrai composeur ---------- */
const mail = await page.evaluate(async () => {
  const { S } = await import('./ui/state.js');
  const { openMail } = await import('./ui/mail.js');
  openMail(S.companies[0], { ctId: 'k1' });
  await new Promise(r => setTimeout(r, 400));
  const out = { objet: document.querySelector('#mSubj').value, corps: document.querySelector('#mBody').value };
  document.querySelector('.modal .x')?.click();
  return out;
});
okSi(mail.objet === 'Candidature alternance BTS SIO SISR 2e année — Sam Martin', 'l’objet dit « alternance »');
okSi(mail.corps.includes('Je suis en BTS SIO SISR 2e année et je cherche une alternance de 2 ans à partir du 1er septembre 2027.'),
  'le corps dit la formation, le type, la durée et la date');
okSi(mail.corps.includes('\nRythme : 3 jours en entreprise, 2 à l’école\n'), 'le rythme suit l’alternance');
okSi(mail.corps.includes('Sam Martin\nLycée Gustave Eiffel\nsam.martin@lycee.fr'), 'l’école signe le mail');
/* le défaut d'origine : sans lien de CV, la ligne de présentation sautait */
okSi(!mail.corps.includes('Mon CV'), 'sans lien de CV, pas de « Mon CV : » vide — et la présentation reste');
await page.waitForTimeout(300);

/* ---------- 5. ① ne rien perdre : le garde-fou, seulement s'il y a lieu ---------- */
await page.click('#moiProfil');
await page.waitForSelector('#pfEcole');
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
okSi(!(await page.$('#pfEcole')) && !(await page.$('text=Quitter sans enregistrer ?')),
  'rien changé : la feuille se ferme sans question');
await page.click('#moiProfil');
await page.waitForSelector('#pfEcole');
await page.fill('#pfEcole', 'IUT de Lille');
await page.keyboard.press('Escape');
await page.waitForSelector('text=Quitter sans enregistrer ?');
okSi(true, 'un changement non enregistré demande avant de partir');
await page.click('.modal .btn-danger');
await page.waitForTimeout(350);
okSi((await page.textContent('#view-moi .obj')).includes('Lycée Gustave Eiffel'), 'quitter n’enregistre rien');

/* ---------- 6. ② jamais de refus muet : « Emploi » et la vieille date ---------- */
await page.click('#moiProfil');
await page.waitForSelector('#pfEcole');
await page.click('.dchip[data-r="stage"]');
await page.fill('#pfDebut', '2027-03-01');
await page.fill('#pfFin', '2027-01-15');               /* la fin avant le début */
await page.click('.modal .btn-primary');
await page.waitForTimeout(250);
okSi(!(await page.$eval('#pfPerErr', e => e.hidden)), 'une période à l’envers retient, et dit pourquoi');
await page.click('.dchip[data-r="emploi"]');           /* la fin n'est plus affichée */
okSi(!(await page.$('#pfFin')), 'l’emploi ne demande qu’une date');
await page.click('.modal .btn-primary');
await attendre(page, () => !document.querySelector('#pfEcole'),
  { message: 'une date cachée ne doit pas retenir l’enregistrement' });
okSi((await page.textContent('#view-moi .obj')).includes('Emploi · dès le 1er mars 2027'), 'l’emploi s’enregistre');

/* ---------- 7. ③ le CV : la feuille dit ce qui part vraiment ---------- */
await page.click('#moiDocs [data-kind="cv"]');
await page.waitForSelector('#docLien');
const cvTxt = await page.textContent('.modal');
okSi(!cvTxt.includes('partira avec tes emails'), 'plus de promesse de pièce jointe sur le web');
okSi(cvTxt.includes('L’app ne peut pas joindre ton CV à un email')
  && cvTxt.includes('Ajouter le lien de mon CV'), 'la feuille dit ce qui part vraiment, et le geste qui le règle');
await page.click('#docLien');
await page.waitForSelector('#pfCv');
await page.waitForTimeout(300);
okSi(await page.evaluate(() => document.activeElement?.id === 'pfCv'), '« Mettre le lien » ouvre le profil SUR le champ');
await page.fill('#pfCv', 'https://cv.example/sam');
await page.click('.modal .btn-primary');
await attendre(page, () => !document.querySelector('#pfCv'), { message: 'le lien s’enregistre' });
await attendre(page, () => /lien/.test(document.querySelector('#moiDocs [data-kind="cv"]')?.textContent || ''),
  { message: 'la ligne CV dit « lien »' });
okSi(true, 'la ligne CV compte le lien, pas seulement les PDF');

if (errors.length) fail('erreurs console : ' + errors.join(' | '));
else console.log('Zéro erreur console.');
console.log(process.exitCode ? 'E2E profil : ÉCHEC' : 'E2E profil : OK');
await browser.close();
server.close();
