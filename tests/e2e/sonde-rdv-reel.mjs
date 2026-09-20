/* ============================================================
   SONDE — LE RENDEZ-VOUS QR CONTRE LES VRAIS RELAIS

   Panne rapportée à l'usage, et son contraste est tout le sujet :
   le PARTAGE EN GROUPE fonctionne entre deux téléphones, et le
   RENDEZ-VOUS QR reste sur « En attente » indéfiniment — mêmes
   appareils, mêmes relais, même session.

   Ce que ça innocente d'emblée : les relais portent (le groupe le
   prouve), le réseau sort, la liaison directe s'établit, la lecture
   du QR marche (le receveur détecte). Il reste donc une différence
   ENTRE LES DEUX CHEMINS, et aucun scénario ne la voyait : ils sont
   tous joués contre un relais LOCAL, où tout se trouve en un battement.

   La sonde rejoue donc les DEUX chemins, dans la même page, contre
   `RELAIS_DEFAUT` — les vrais. Le groupe sert de TÉMOIN : s'il
   échoue lui aussi, ce n'est pas le rendez-vous qui est en cause mais
   le réseau d'ici, et on ne conclut rien.

   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1.
   ============================================================ */
import { chromium, chromiumPath, serveRepo, attendre } from './outils.mjs';

if (!process.env.OC_SONDE_RELAIS){
  console.log('sonde rendez-vous ignorée (OC_SONDE_RELAIS absent) — réseau sortant requis.');
  process.exit(0);
}

const ATTENTE = Number(process.env.OC_RDV_ATTENTE || 90000);
const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
let sortie = 0;

const mobile = { viewport: { width: 390, height: 844 }, hasTouch: true };
const ouvrir = async () => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, ...mobile });
  const p = await ctx.newPage();
  await p.goto(base, { waitUntil: 'load' });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');
  return p;
};
/* AUCUNE liste de relais n'est semée : on veut ceux que l'app choisit. */
const semer = (p, prefixe, n) => p.evaluate(async ([prefixe, n]) => {
  const st = await import('./engine/storage.js');
  await st.kvInit();
  if (!n) return;
  const rnd = len => Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
    id: prefixe + '-' + i, name: 'Piste ' + prefixe + ' ' + i, city: 'Lille',
    status: 'todo', desc: rnd(120), updatedAt: 1000 + i
  }))));
}, [prefixe, n]);

const etat = p => p.evaluate(async () => {
  const sl = await import('./ui/synclive.js');
  return { relais: sl.relaySnapshot(), echec: sl.echecLiaison() };
});
const dire = (qui, e) => console.log('   ' + qui + ' — ' + JSON.stringify(e.relais)
  + (e.echec ? ' · dernière cause : ' + e.echec : ''));

try {
  /* ---------- ① LE TÉMOIN : le partage en groupe ---------- */
  console.log('① TÉMOIN — partage en groupe contre les vrais relais\n');
  const G1 = await ouvrir(), G2 = await ouvrir();
  await semer(G1, 'grp', 6);
  await G1.reload({ waitUntil: 'load' });
  await G1.waitForSelector('#view-aujourdhui:not([hidden])');
  const motDePasse = 'sonde-' + Math.random().toString(36).slice(2, 10);
  for (const p of [G1, G2]){
    await p.click('.bottomnav a[data-r="echanger"]');
    await p.waitForSelector('#ecPromo');
    await p.click('#ecPromo');
    await p.waitForSelector('#prPass');
    await p.fill('#prPass', motDePasse);
    await p.click('.modal-f .btn-primary');
    await p.waitForSelector('#prStatus');
  }
  let temoin = true;
  try {
    for (const p of [G1, G2])
      await attendre(p, () => /camarade/.test(document.querySelector('#prStatus')?.textContent || ''),
        { timeout: ATTENTE, pas: 1000, message: 'groupe relié' });
  } catch (e) { temoin = false; }
  const eG1 = await etat(G1), eG2 = await etat(G2);
  dire('groupe A', eG1); dire('groupe B', eG2);
  console.log(temoin ? '   → LE GROUPE SE RELIE ✓\n' : '   → le groupe NE se relie PAS ✗\n');
  await G1.context().close(); await G2.context().close();

  if (!temoin && !(eG1.relais.vivants && eG2.relais.vivants)){
    console.log('AUCUNE CONCLUSION : aucun relais ne porte depuis cette machine.');
    console.log('Le rendez-vous n’est accusé de rien — rejoue depuis un réseau ouvert.');
    process.exit(1);
  }

  /* ---------- ② LE CAS RAPPORTÉ : le rendez-vous QR ---------- */
  console.log('② RENDEZ-VOUS QR contre les vrais relais\n');
  const D = await ouvrir(), R = await ouvrir();
  await semer(D, 'rdv', 26);
  await D.reload({ waitUntil: 'load' });
  await D.waitForSelector('#view-aujourdhui:not([hidden])');

  await D.click('.bottomnav a[data-r="echanger"]');
  await D.waitForSelector('#ecGive'); await D.click('#ecGive');
  await D.waitForSelector('#dnQR'); await D.click('#dnQR');
  /* le gros lot doit mener au RENDEZ-VOUS, pas au QR de données :
     sans ça la sonde mesure l'autre chemin sans le savoir */
  await D.waitForSelector('.sy-phrase span', { timeout: 40000 });
  const code = (await D.textContent('.sy-phrase span')).trim();
  console.log('   code de rendez-vous : ' + code);

  /* le temps qu'une vraie personne met à sortir son téléphone */
  await D.waitForTimeout(8000);
  await R.click('.bottomnav a[data-r="echanger"]');
  await R.waitForSelector('#ecRecv'); await R.click('#ecRecv');
  await R.waitForSelector('#rcScan'); await R.click('#rcScan');
  await R.waitForSelector('#rcCode');
  await R.fill('#rcCode', code);
  await R.waitForSelector('#rcCodeGo:not([hidden])');
  await R.click('#rcCodeGo');

  let passe = true;
  try {
    await R.waitForSelector('.rc-big', { timeout: ATTENTE });
  } catch (e) { passe = false; }

  const eD = await etat(D), eR = await etat(R);
  const stD = ((await D.textContent('#dnRdvSt').catch(() => '')) || '').trim();
  const stR = ((await R.textContent('#rcRdvSt').catch(() => '')) || '').trim();
  dire('donneur ', eD); dire('receveur', eR);
  console.log('   écran donneur  : « ' + stD + ' »');
  console.log('   écran receveur : « ' + stR + ' »');

  if (passe){
    console.log('\n   → LE RENDEZ-VOUS PASSE ✓ — la panne ne se reproduit pas ici.');
    console.log('   Elle appartient donc au réseau ou aux appareils du mainteneur,');
    console.log('   et c’est son rapport de diagnostic qui la dira.');
  } else {
    console.log('\n   → LE RENDEZ-VOUS NE PASSE PAS ✗' + (temoin ? ', ALORS QUE LE GROUPE PASSE.' : '.'));
    if (temoin)
      console.log('   Le contraste est reproduit : deux chemins, mêmes relais, un seul aboutit.');
    sortie = 1;
  }
  await D.context().close(); await R.context().close();
} catch (e) {
  console.error('la sonde elle-même a échoué : ' + (e && e.message));
  sortie = 1;
} finally {
  await browser.close();
  server.close();
}
process.exit(sortie);
