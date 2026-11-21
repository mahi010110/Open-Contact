/* ============================================================
   OpenContact · la nouvelle interface · l'amorce
   (docs/refonte-reprendre.md §8)

   La page `refonte.html` porte la nouvelle interface pendant qu'elle
   grandit, lot par lot, à côté de l'app actuelle (`index.html`), sans
   la toucher. Le jour de la bascule, elle devient `index.html` et ce
   fichier devient `app.js`.

   Ce qu'elle ne fait pas encore, exprès : enregistrer le service worker
   (une page d'essai ne doit pas garder une ancienne version en cache).
   La boîte aux lettres et les groupes sont là depuis le lot 3 (Réseau),
   la liaison de mes appareils et la copie déposée depuis le lot 4 (Moi) :
   ils démarrent avec l'app, comme dans l'app actuelle. Le verrou (lot 5)
   passe AVANT tout : protégée par un code, l'app ne lit rien tant qu'il
   n'est pas tapé.

   Une adresse qui porte des pistes (« 3 pistes pour toi : https://…#OCQ1.… »,
   CONTRAT.md §2) se lit avant que la coque ne réécrive l'adresse, et
   s'ouvre sur leur aperçu une fois l'app prête.
   ============================================================ */
import { APP_VERSION } from './engine/model.js';
import { kvInit } from './engine/storage.js';
import { extraireOCQ } from './engine/exchange.js';
import { charger, choisirTheme, S } from './ecrans/etat.js';
import { C, inscrire, demarrer } from './ecrans/coque.js';
import trouver from './ecrans/trouver.js';
import pistes from './ecrans/pistes.js';
import reseau from './ecrans/reseau.js';
import moi from './ecrans/moi.js';
import { initSyncLive } from './ecrans/liaison.js';
import { demarrerMoi } from './ecrans/phrase.js';
import { ouvrirAuDemarrage, apresChargement } from './ecrans/verrou.js';
import { ouvrirLien } from './ecrans/echange.js';

inscrire('trouver', trouver);
inscrire('pistes', pistes);
inscrire('reseau', reseau);
inscrire('moi', moi);

const lienRecu = extraireOCQ(location.hash);

(async function(){
  console.info('OpenContact', APP_VERSION, '· nouvelle interface');
  await kvInit();
  /* le poste se sait avant le premier écran, même verrouillé : le verrou
     y est une fenêtre (la coque suit ensuite les changements) */
  document.documentElement.classList.toggle('poste', matchMedia('(min-width:901px)').matches);
  /* protégée par un code : rien ne se lit avant lui */
  await ouvrirAuDemarrage();
  try { await charger(); }
  catch (e){
    /* des données scellées sans le coffre qui les ouvre : rien ne s'écrit
       par-dessus, l'écran le dit */
    const m = document.getElementById('main');
    if (m) m.innerHTML = '<div class="panneau"><p><b>Tes données ne s’ouvrent pas ici.</b>'
      + 'Elles sont scellées par un code que cet appareil ne connaît plus.</p></div>';
    document.documentElement.classList.add('pret');
    return;
  }
  apresChargement();
  choisirTheme(S.themeChoix, false);
  /* demander au navigateur de ne jamais purger le stockage (Safari
     efface sinon un site non visité depuis sept jours) */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  demarrer();
  document.documentElement.classList.add('pret');
  if (lienRecu) ouvrirLien(lienRecu);
  /* un lien tapé pendant que l'app est ouverte, dans le même onglet */
  addEventListener('hashchange', () => {
    const o = extraireOCQ(location.hash);
    if (!o) return;
    history.replaceState(history.state, '', location.pathname + location.search + '#/' + C.onglet);
    ouvrirLien(o);
  });
  /* ce qui tourne en arrière-plan pour « Moi › Ma copie », un instant
     après le démarrage : la liaison de mes appareils (si une phrase existe)
     et le dépôt de la copie (si une phrase de secours existe) */
  setTimeout(() => { initSyncLive().catch(() => {}); demarrerMoi(); }, 2000);
})();
