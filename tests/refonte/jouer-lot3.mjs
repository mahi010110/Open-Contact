/* ============================================================
   OpenContact · la nouvelle interface · rejouer le lot 3
   (Réseau ; docs/refonte-reprendre.md §8)

   Usage : node tests/refonte/jouer-lot3.mjs [dossier des captures]

   Joué à DEUX (Inès et Karim), sur un relais local qui garde les
   événements comme les relais publics (tests/e2e/relais-local.mjs) :
   Réseau vide ; créer la classe, la rejoindre par son code (et les
   erreurs du code) ; s'écrire, en direct ; « 1 nouveau » ; l'onglet qui
   change de couleur ; donner des pistes au groupe, l'aperçu,
   « Annuler » ; « Groupe » chez le chef ; devenir amis (le profil
   collé, l'aperçu, l'amitié réciproque) ; depuis une piste, « Demander
   à Karim », sa réponse dans « On te demande », le contact qui revient
   sur la piste ; une demande dans le groupe, « Présenter Julie », le
   premier mail qui le dit ; s'écrire entre amis ; quitter, retirer, et
   « Annuler » ; au téléphone (390 et 360, clair et sombre) et au
   poste. LA FUITE D'ABORD : le relais ne voit ni un prénom, ni une
   entreprise, ni un mot. Finit par « ÉCHECS 0 · ERREURS 0 ».
   ============================================================ */
import path from 'path';
import { lancer, deborde, petites, texte, lireCle, PROFIL } from './outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';

const evs = [];
const relay = await startLocalRelay({ tls: true, garde: true, filtre: ev => { evs.push(ev); return null; } });
const { OUT, ouvrir, verifier, fermer, etat } = await lancer('lot3');
const img = async (p, nom) => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(OUT, nom + '.png') }); };
const T = '.ecran ';
const attendre = async (p, fn, arg, ms = 15000) => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(250))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  return false;
};
const relever = p => p.evaluate(() => Promise.all([import('/ecrans/boite.js').then(m => m.relever()),
  import('/ecrans/groupes.js').then(m => m.releverGroupes())]));
const tout = p => p.evaluate(() => (document.querySelector('.ecran').innerText || '').replace(/\s+/g, ' '));
const reseau = async p => { if (await p.isVisible('.onglets')) await p.click('.onglets [data-id="reseau"]'); else { await p.goBack(); await p.waitForTimeout(250); } };
const INTERCEPTER = () => {
  window.__ouverts = [];
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && /^(mailto|tel|sms):|^https?:/.test(a.getAttribute('href'))){ e.preventDefault(); window.__ouverts.push(a.href); }
  }, true);
  window.open = u => { window.__ouverts.push(String(u)); return null; };
};

const PISTES_I = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1, history: [{ d: '2026-11-15', t: 'Gardée' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2, notes: 'note privée d’Inès',
    contacts: [{ id: 'c1', name: 'Claire Durand', role: 'RH', email: 'claire@worldline.test' }] },
  { id: 'bef', name: 'Beffroi Sécurité', city: 'Lille', status: 'active', appliedAt: '2026-11-10', createdAt: 3,
    contacts: [{ id: 'c2', name: 'Julie Marchand', role: 'analyste SOC', email: 'j.marchand@beffroi.test' }] }
];
const PISTES_K = [{ id: 'kb', name: 'Beffroi Sécurité', city: 'Lille', status: 'todo', createdAt: 1 }];
const PROFIL_K = { name: 'Karim Benali', email: 'karim@prive.test', recherche: 'alternance', formation: 'BTS SIO SLAM', ville: 'Lille',
  parcours: [{ entreprise: 'Kiabi', quoi: 'alternance', debut: '2025-09' }] };

const I = await ouvrir(390, 844, { mobile: true, profil: PROFIL, pistes: PISTES_I, relais: relay.url, adresse: '#/reseau', presse: true });
const K = await ouvrir(390, 844, { mobile: true, profil: PROFIL_K, pistes: PISTES_K, relais: relay.url, adresse: '#/reseau', presse: true });
const ip = I.p, kp = K.p;
await ip.evaluate(INTERCEPTER); await kp.evaluate(INTERCEPTER);

/* ---------- le premier jour : rien, et trois gestes ---------- */
verifier((await tout(ip)).includes('Ta classe et tes amis apparaissent ici'), 'Réseau vide : il dit ce qui viendra');
verifier(await ip.isVisible(T + '[data-a="r-rejoindre"]') && await ip.isVisible(T + '[data-a="r-ajami"]') && await ip.isVisible(T + '[data-a="r-recevoir"]'),
  'Réseau vide : rejoindre sa classe, ajouter un ami, recevoir');
await img(ip, 't0-vide');

/* ---------- créer la classe ; le code et ses erreurs ---------- */
await kp.click(T + '[data-a="r-rejoindre"]');
await kp.click('.couche-f [data-a="f-rejoindre"]');
verifier((await texte(kp, '.couche-f .r-err-c')).includes('Il manque le code'), 'rejoindre sans code : l’erreur sous le champ');
await kp.fill('.couche-f .r-code', 'abc');
await kp.click('.couche-f [data-a="f-rejoindre"]');
verifier((await texte(kp, '.couche-f .r-err-c')).includes('15 caractères'), 'un code trop court : ce qui ne va pas');
verifier((await texte(kp, '.couche-f')).includes('Le groupe verra ton prénom : Karim'), 'avant d’entrer : le groupe verra ton prénom');
await img(kp, 't1-rejoindre-erreur');
await kp.click('.couche-f .tb .x');

await ip.click(T + '[data-a="r-rejoindre"]');
await ip.click('.couche-f [data-a="f-creer-mode"]');
await ip.fill('.couche-f .r-nomg', 'BTS SIO Lille');
await ip.click('.couche-f [data-a="f-creer"]');
await ip.waitForSelector(T + '.code-g', { timeout: 8000 });
const code = (await texte(ip, T + '.code-g')).trim();
verifier(/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}$/.test(code), 'créer : l’invitation montre le code · ' + code);
verifier(await ip.isVisible(T + '.qr-b svg'), 'créer : et son QR');
await img(ip, 't2-inviter');

/* ---------- Karim rejoint, écrit ; Inès le lit ---------- */
await kp.click(T + '[data-a="r-rejoindre"]');
await kp.fill('.couche-f .r-code', code.toUpperCase());
await kp.click('.couche-f [data-a="f-rejoindre"]');
await kp.waitForSelector('.ecran.conv', { timeout: 8000 });
verifier(await kp.evaluate(() => document.documentElement.classList.contains('plein') && getComputedStyle(document.querySelector('.onglets')).display === 'none'),
  'une conversation prend l’écran : la barre d’onglets s’efface');
verifier((await tout(kp)).includes('Les messages s’effacent au bout de 7 jours'), 'le groupe dit que ses messages s’effacent');
await kp.fill(T + '.m-in', 'Salut la classe ! Forum alternance jeudi à la CCI, on y va ?');
await kp.click(T + '[data-a="r-envoyer"]');
verifier(await attendre(kp, () => !!document.querySelector('.ecran .b.moi')), 'le message de Karim s’affiche à droite');
verifier(await kp.evaluate(() => document.activeElement && document.activeElement.classList.contains('m-in')), 'après l’envoi, le champ reste en main');
await img(kp, 't3-karim-ecrit');

await ip.goBack(); await ip.waitForTimeout(250);
await ip.click('.onglets [data-id="pistes"]');
await relever(ip);
verifier(await attendre(ip, () => { const a = document.querySelector('.onglets [data-id="reseau"]'); return a && a.classList.contains('attend') && /du nouveau/.test(a.getAttribute('aria-label') || ''); }),
  'le calme : l’onglet Réseau change de couleur et dit « du nouveau »');
await img(ip, 't4-onglet-attend');
await ip.click('.onglets [data-id="reseau"]');
verifier(await ip.isVisible(T + '.rang.conv.nonlu'), 'la conversation non lue est en gras, avec son point');
await img(ip, 't5-reseau');
await ip.click(T + '[data-a="r-conv"]');
await ip.waitForSelector('.ecran.conv');
verifier((await tout(ip)).includes('1 nouveau'), 'la conversation s’ouvre sur « 1 nouveau »');
await img(ip, 't6-conv-nouveau');
await ip.fill(T + '.m-in', 'Oui ! On s’y retrouve à 14 h, @Karim');
await ip.click(T + '[data-a="r-envoyer"]');
verifier(await attendre(kp, () => /14 h/.test(document.querySelector('.ecran').innerText)), 'en direct : Karim lit Inès sans rien toucher');
verifier(await kp.evaluate(() => !!document.querySelector('.ecran .b.pour-moi b.cite')), 'la mention « @Karim » se marque chez Karim');

/* ---------- donner des pistes au groupe ---------- */
await ip.click(T + '[data-a="r-donner"]');
await ip.waitForSelector(T + '[data-a="r-don-ok"]');
verifier((await tout(ip)).includes('Tes notes et ton suivi restent chez toi'), 'Donner dit ce qui part et ce qui reste');
await ip.click(T + '[data-a="r-don-sel"][data-v="bef"]');
verifier((await texte(ip, T + '[data-a="r-don-ok"]')).includes('Donner 2 pistes à BTS SIO Lille'), 'le geste dit combien et à qui');
await img(ip, 't7-donner');
await ip.click(T + '[data-a="r-don-ok"]');
await ip.waitForSelector('.ecran.conv', { timeout: 8000 });
verifier((await tout(ip)).includes('Tu as donné 2 pistes au groupe'), 'retour dans la conversation : « Tu as donné 2 pistes »');
verifier(await attendre(kp, () => !!document.querySelector('.ecran [data-a="r-voir"]')), 'chez Karim : les pistes données, « Voir »');
await img(kp, 't8-karim-voir');
await kp.click(T + '[data-a="r-voir"]');
await kp.waitForSelector(T + '[data-a="r-prendre"]');
verifier((await tout(kp)).includes('De Inès') && (await tout(kp)).includes('dans BTS SIO Lille'), 'l’aperçu dit de qui et d’où');
await img(kp, 't9-apercu');
await kp.click(T + '[data-a="r-prendre"]');
verifier(((await lireCle(kp, 'oc_data_v3')) || []).length === 3, 'Ajouter : les deux pistes entrent');
verifier(await kp.isVisible('.couche-a [data-a="annuler"]'), 'puis « Annuler »');
await kp.click('.couche-a [data-a="annuler"]');
verifier(((await lireCle(kp, 'oc_data_v3')) || []).length === 1, 'Annuler : elles repartent');
await kp.click(T + '[data-a="r-voir"]');
await kp.waitForSelector(T + '[data-a="r-prendre"]');
await kp.click(T + '[data-a="r-prendre"]');
const recuesK = (await lireCle(kp, 'oc_data_v3')) || [];
verifier(recuesK.length === 3 && !recuesK.some(c => /note privée/.test(c.notes || '')), 'reprises : sans les notes d’Inès (le privé ne part jamais)');

/* ---------- « Groupe », chez le chef ---------- */
await ip.click('.ecran .conv-t');
await ip.waitForSelector(T + '[data-a="r-inviter"]');
/* innerText rend les majuscules que le CSS impose : on compare sans la casse */
const g = (await tout(ip)).toLowerCase();
verifier(g.includes('réglages') && g.includes('qui écrit') && g.includes('karim') && g.includes('chef'), 'Groupe : réglages chez le chef, membres et rôles');
verifier(g.includes('quitter le groupe') && g.includes('supprimer le groupe'), 'Groupe : la sortie, en dernier');
await img(ip, 't10-groupe');
await ip.goBack(); await ip.waitForTimeout(200); await ip.goBack(); await ip.waitForTimeout(250);

/* ---------- devenir amis ---------- */
await kp.goBack(); await kp.waitForTimeout(250);
await kp.click('.onglets [data-id="reseau"]').catch(() => {});
await kp.click(T + '[data-a="r-ajami"]');
await kp.waitForSelector('.couche-f [data-a="f-envoyer-profil"]', { timeout: 8000 });
await kp.waitForTimeout(400);
verifier((await texte(kp, '.couche-f')).includes('Il contient ton nom, Karim Benali, et où tu es passé : Kiabi'), 'mon QR dit ce qu’il contient');
await img(kp, 't11-mon-qr');
await kp.click('.couche-f [data-a="f-envoyer-profil"]');
const profilK = await kp.evaluate(() => navigator.clipboard.readText());
verifier(/OCA1\./.test(profilK), 'Copier mon profil : le texte à coller');
await kp.click('.couche-f .tb .x');
await ip.click(T + '[data-a="r-recevoir"]');
await ip.click('.couche-f [data-a="rc-coller"]');
await ip.fill('.couche-f .r-texte', 'n’importe quoi');
await ip.click('.couche-f [data-a="rc-lire"]');
verifier((await texte(ip, '.couche-f .r-err')).includes('Ce n’est pas un partage OpenContact'), 'un texte qui n’est rien : l’erreur, la saisie gardée');
await ip.fill('.couche-f .r-texte', profilK);
await ip.click('.couche-f [data-a="rc-lire"]');
await ip.waitForSelector('.couche-f [data-a="f-ajouter-ami"]');
const ap = await texte(ip, '.couche-f');
verifier(ap.includes('Karim aura aussi ton profil') && ap.includes('dans tes pistes'), 'l’aperçu d’un ami : il aura aussi ton profil, et ce qu’il t’ouvre');
await img(ip, 't12-apercu-ami');
await ip.click('.couche-f [data-a="f-ajouter-ami"]');
verifier((await tout(ip)).includes('Karim Benali') && (await tout(ip)).includes('en alternance chez Kiabi'), 'Mes amis : Karim, et ce qu’il t’ouvre');
const tAmi = Date.now();

/* ---------- depuis une piste : « Demander à Karim » ---------- */
await ip.click('.onglets [data-id="pistes"]');
await ip.waitForTimeout(250);
verifier((await tout(ip)).includes('Karim y est en alternance'), 'À faire : Karim y est en alternance');
await img(ip, 't13-afaire-ami');
await ip.click(T + '.s-afaire [data-a="demande"][data-id="kia"]');
await ip.waitForSelector(T + '[data-a="demander"]');
verifier((await tout(ip)).includes('Karim recevra') && (await tout(ip)).includes('Inès cherche quelqu’un chez Kiabi pour une alternance'), 'la phrase exacte qui part, et à qui');
await img(ip, 't14-recevra');
await ip.click(T + '[data-a="demander"]');
verifier(await attendre(ip, () => /Demande envoyée à Karim/.test(document.querySelector('.ecran').innerText)), 'la piste : « Demande envoyée à Karim »');
await img(ip, 't15-envoyee');

await kp.click('.onglets [data-id="pistes"]');
await relever(kp);
verifier(await attendre(kp, () => document.querySelector('.onglets [data-id="reseau"]').classList.contains('attend')), 'chez Karim, Réseau change de couleur');
await kp.click('.onglets [data-id="reseau"]');
verifier((await tout(kp)).includes('On te demande') && (await tout(kp)).includes('tu y es'), '« On te demande » : Quelqu’un chez Kiabi, tu y es');
await img(kp, 't16-on-te-demande');
await kp.click(T + '[data-a="r-recue"]');
await kp.click('.couche-f [data-a="f-rep-donner"]');
await img(kp, 't17-repondre');
await kp.click('.couche-f [data-a="f-donner"]');
verifier(await attendre(kp, () => !document.querySelector('.couche-f .sheet')), 'Karim se donne : la feuille se ferme');

await relever(ip);
verifier(await attendre(ip, () => /Karim te donne son contact/.test(document.querySelector('.ecran').innerText)), 'chez Inès, la piste : « Karim te donne son contact »');
await img(ip, 't18-recu-piste');
await ip.click(T + '.suite-b [data-a="don"]');
verifier(await attendre(ip, () => /Écrire à Karim/.test(document.querySelector('.ecran').innerText)), 'ajouté : la suite propose de lui écrire');
const kia = ((await lireCle(ip, 'oc_data_v3')) || []).find(c => c.id === 'kia');
verifier(kia && kia.contacts.some(c => c.name === 'Karim Benali'), 'le contact est dans la piste');
await ip.click('.onglets [data-id="reseau"]');
verifier((await tout(ip)).includes('Karim Benali est dans tes pistes') && await ip.evaluate(() => document.querySelectorAll('.ecran .colis i.p').length === 3),
  'Mes demandes : le colis est arrivé');
await ip.click(T + '[data-a="r-demande"]');
await img(ip, 't19-demande');
await ip.goBack(); await ip.waitForTimeout(250);

/* ---------- une demande dans le groupe : « Présenter Julie » ---------- */
await kp.click(T + '[data-a="r-demander"]');
await kp.click('.couche-f [data-a="f-mode"][data-v="entreprise"]');
await kp.click('.couche-f [data-a="f-e"]');
verifier((await texte(kp, '.couche-f')).includes('Karim cherche quelqu’un chez Beffroi Sécurité pour une alternance'), 'Demander : la phrase exacte avant d’envoyer');
await img(kp, 't20-demander');
await kp.click('.couche-f [data-a="f-demander"]');
await kp.waitForSelector(T + '.colis-g', { timeout: 8000 });
await img(kp, 't21-colis');
await relever(ip);
await ip.click(T + '[data-a="r-conv"]');
verifier(await attendre(ip, () => /tu as Julie Marchand/.test(document.querySelector('.ecran').innerText)), 'dans le groupe : la demande de Karim, « tu as Julie Marchand »');
await img(ip, 't22-groupe-demande');
await ip.click(T + '[data-a="r-repondre"]');
await ip.click('.couche-f [data-a="f-rep-donner"]');
await ip.click('.couche-f .ck.accord');
verifier((await texte(ip, '.couche-f [data-a="f-donner"]')).includes('Présenter Julie'), 'Julie est d’accord : le geste devient « Présenter Julie »');
await img(ip, 't23-presenter');
await ip.click('.couche-f [data-a="f-donner"]');
await attendre(ip, () => !document.querySelector('.couche-f .sheet'));
verifier((await tout(ip)).includes('Tu lui as donné Julie Marchand'), 'dans le groupe, la demande dit ce que tu as fait');
await ip.goBack(); await ip.waitForTimeout(250);
await relever(kp);
verifier(await attendre(kp, () => /Julie Marchand/.test(document.querySelector('.ecran').innerText) && !!document.querySelector('.ecran [data-a="r-ajouter-don"]')),
  'chez Karim, sur sa demande : Julie Marchand, « Ajouter à mes pistes »');
await img(kp, 't23b-recu');
await kp.click(T + '[data-a="r-ajouter-don"]');
verifier(await attendre(kp, () => /Écrire à Julie/.test(document.querySelector('.ecran').innerText)), 'ajoutée : « Écrire à Julie »');
await kp.click(T + '[data-a="r-ecrire-don"]');
await kp.waitForSelector(T + '.e-m', { timeout: 8000 });
verifier((await kp.inputValue(T + '.e-m')).includes('Inès vous a parlé de moi'), 'le premier mail le dit : « Inès vous a parlé de moi »');
await img(kp, 't24-mail-via');

/* ---------- l'amitié est réciproque ; s'écrire entre amis ---------- */
const reste = 33000 - (Date.now() - tAmi);
if (reste > 0) await kp.waitForTimeout(reste);
await relever(kp);
/* l'onglet rouvre sa page (la demande) ; le re-taper revient à sa liste */
await kp.click('.onglets [data-id="reseau"]');
await kp.click('.onglets [data-id="reseau"]');
verifier(await attendre(kp, () => /Inès Martin/.test(document.querySelector('.ecran').innerText), null, 20000), 'chez Karim, Inès est arrivée dans ses amis, sans un geste');
await kp.click(T + '[data-a="r-ami"]');
await img(kp, 't25-ami');
await kp.click(T + '[data-a="r-ecrire"]');
await kp.waitForSelector('.ecran.conv');
await kp.fill(T + '.m-in', 'Merci pour Julie !');
await kp.click(T + '[data-a="r-envoyer"]');
await kp.waitForTimeout(800);
await img(kp, 't26-message');
await relever(ip);
verifier(await attendre(ip, () => /Merci pour Julie/.test(document.querySelector('.ecran').innerText)), 'chez Inès, le message de Karim dans la liste');

/* ---------- quitter, retirer, et « Annuler » ---------- */
await kp.goBack(); await kp.waitForTimeout(200); await kp.goBack(); await kp.waitForTimeout(250);
await kp.click(T + '.rang.conv[data-id^="g:"]');
await kp.click('.ecran .conv-t');
await kp.click(T + '[data-a="r-quitter"]');
verifier(!(await tout(kp)).includes('BTS SIO Lille') && await kp.isVisible('.couche-a [data-a="annuler"]'), 'Quitter le groupe : il part, « Annuler » reste');
await kp.click('.couche-a [data-a="annuler"]');
verifier((await tout(kp)).includes('BTS SIO Lille'), 'Annuler : le groupe revient');
await ip.click(T + '[data-a="r-ami"]');
await ip.click(T + '[data-a="r-retirer"]');
verifier(!(await tout(ip)).includes('Karim Benali') || !(await tout(ip)).includes('en alternance chez Kiabi'), 'Retirer de mes amis : il part');
await ip.click('.couche-a [data-a="annuler"]');
verifier((await tout(ip)).includes('en alternance chez Kiabi'), 'Annuler : il revient');

/* ---------- au plus étroit, et en sombre ---------- */
for (const [w, h, sombre] of [[360, 640, false], [390, 844, true], [360, 640, true]]){
  await ip.setViewportSize({ width: w, height: h });
  await ip.emulateMedia({ colorScheme: sombre ? 'dark' : 'light' });
  await ip.waitForTimeout(250);
  const suf = `-${w}${sombre ? '-sombre' : ''}`;
  verifier((await deborde(ip)).length === 0, `Réseau ${suf} : rien ne déborde · ${(await deborde(ip)).join(', ')}`);
  verifier((await petites(ip)).length === 0, `Réseau ${suf} : les cibles font 44 px · ${(await petites(ip)).join(', ')}`);
  await img(ip, 's1-reseau' + suf);
  await ip.click(T + '.rang.conv[data-id^="g:"]');
  await ip.waitForSelector('.ecran.conv');
  /* la page entre en glissant : on mesure une fois posée */
  await ip.waitForTimeout(450);
  verifier((await deborde(ip)).length === 0, `conversation ${suf} : rien ne déborde · ${(await deborde(ip)).join(', ')}`);
  verifier((await petites(ip)).length === 0, `conversation ${suf} : les cibles font 44 px · ${(await petites(ip)).join(', ')}`);
  await img(ip, 's2-conv' + suf);
  await ip.goBack(); await ip.waitForTimeout(250);
}
await I.ctx.close();

/* ---------- au poste : les gens à gauche, la conversation en fenêtre ---------- */
for (const sombre of [false, true]){
  await kp.setViewportSize({ width: 1440, height: 900 });
  await kp.emulateMedia({ colorScheme: sombre ? 'dark' : 'light' });
  await kp.waitForTimeout(300);
  verifier(await kp.isVisible('.ecran .rc1') && await kp.isVisible('.ecran .rc2'), 'au poste : deux colonnes');
  await kp.click('.ecran .rc1 [data-a="r-ami"]');
  verifier((await texte(kp, '.ecran .rc2')).includes('Ce que Inès t’ouvre') || (await texte(kp, '.ecran .rc2')).includes('Inès Martin'), 'à droite : l’ami ouvert');
  await kp.click('.ecran .rc1 .rang.conv[data-id^="g:"]');
  await kp.waitForSelector('.ecran .conv-w');
  verifier(await kp.evaluate(() => document.activeElement && document.activeElement.classList.contains('m-in')), 'la fenêtre s’ouvre, le champ en main');
  await img(kp, 'p1-poste' + (sombre ? '-sombre' : ''));
  await kp.keyboard.press('Escape');
  verifier(!(await kp.isVisible('.ecran .conv-w')), 'Échap ferme la fenêtre');
}
await K.ctx.close();

/* ---------- la fuite : le relais ne voit rien de lisible ---------- */
const brut = JSON.stringify(evs);
const fuites = ['Inès', 'Ines', 'Karim', 'Kiabi', 'Beffroi', 'Julie', 'BTS SIO', 'Salut', 'Merci', 'Worldline', 'note privée']
  .filter(m => brut.includes(m));
verifier(evs.length > 10, 'le relais a bien reçu des lettres · ' + evs.length);
verifier(!fuites.length, 'la fuite d’abord : le relais ne voit ni prénom, ni entreprise, ni mot · ' + fuites.join(', '));

await fermer();
relay.close();
console.log(`captures dans ${OUT}`);
console.log(`ÉCHECS ${etat.echecs.length} · ERREURS ${etat.erreurs.length}`);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 10).join('\n'));
if (etat.echecs.length || etat.erreurs.length) process.exitCode = 1;
