/* ============================================================
   OpenContact · la nouvelle interface · l'amorce
   (docs/refonte-reprendre.md §8)

   La page `refonte.html` porte la nouvelle interface pendant qu'elle
   grandit, lot par lot, à côté de l'app actuelle (`index.html`), sans
   la toucher. Le jour de la bascule, elle devient `index.html` et ce
   fichier devient `app.js`.

   Ce qu'elle ne fait pas encore, exprès : enregistrer le service worker
   (une page d'essai ne doit pas garder une ancienne version en cache),
   la sync de mes appareils, le verrou. Chacun revient avec le lot qui le
   montre. La boîte aux lettres et les groupes sont là depuis le lot 3
   (Réseau) : ils démarrent avec l'app, comme dans l'app actuelle.
   ============================================================ */
import { APP_VERSION } from './engine/model.js';
import { charger, choisirTheme, S } from './ecrans/etat.js';
import { inscrire, demarrer } from './ecrans/coque.js';
import trouver from './ecrans/trouver.js';
import pistes from './ecrans/pistes.js';
import reseau from './ecrans/reseau.js';
import { moi } from './ecrans/bientot.js';

inscrire('trouver', trouver);
inscrire('pistes', pistes);
inscrire('reseau', reseau);
inscrire('moi', moi);

(async function(){
  console.info('OpenContact', APP_VERSION, '· nouvelle interface');
  try { await charger(); }
  catch (e){
    /* un profil protégé par un code : le verrou de la nouvelle interface
       arrive au lot 5 ; d'ici là, rien ne s'ouvre ni ne s'écrit ici */
    const m = document.getElementById('main');
    if (m) m.innerHTML = '<div class="panneau"><p><b>Cette app est protégée par un code.</b>'
      + 'Ouvre l’app actuelle pour la déverrouiller : le verrou de la nouvelle arrive au lot 5.</p></div>';
    document.documentElement.classList.add('pret');
    return;
  }
  choisirTheme(S.themeChoix, false);
  /* demander au navigateur de ne jamais purger le stockage (Safari
     efface sinon un site non visité depuis sept jours) */
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  demarrer();
  document.documentElement.classList.add('pret');
})();
