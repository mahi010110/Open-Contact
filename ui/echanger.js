/* ============================================================
   OpenContact — interface · « Échanger »
   Le direct d'abord (mes appareils, salle de promo — P2P, sans
   serveur), le fichier .oc et le QR en solution de secours :
   réseau bloqué, hors-ligne, ou de la main à la main.
   ============================================================ */
import { $, ic } from './dom.js';
import { openDonner } from './donner.js';
import { openRecevoir } from './recevoir.js';
import { openAppareils, openPromo } from './direct.js';

export function renderEchanger(){
  const root = $('#view-echanger');
  root.innerHTML =
    `<div class="page-inner">
       <div class="td-head"><h2>Échanger</h2><div class="td-date">de pair à pair, sans serveur</div></div>

       <div class="pcard">
         <h3>${ic('switch', 'ic-14')} Mes appareils</h3>
         <p class="pd">Téléphone + ordinateur, une phrase de liaison : tout se synchronise, suivi compris.</p>
         <button class="btn btn-primary" id="ecSync">${ic('switch', 'ic-14')} Synchroniser</button>
       </div>

       <div class="pcard">
         <h3>${ic('radio', 'ic-14')} Salle de promo <span class="tag-share">jamais le privé</span></h3>
         <p class="pd">Un mot de passe commun, et les fiches circulent en direct — aperçu avant chaque fusion.</p>
         <button class="btn btn-primary" id="ecPromo">${ic('radio', 'ic-14')} Entrer dans la salle</button>
       </div>

       <details class="pcard pcard-details">
         <summary><h3>${ic('file', 'ic-14')} Sans réseau — QR &amp; fichier .oc</h3></summary>
         <p class="pd">Le plan B qui marche toujours : QR en personne, fichier par mail ou clé USB.</p>
         <div class="pc-actions">
           <button class="btn" id="ecGive">${ic('share', 'ic-14')} Donner</button>
           <button class="btn" id="ecRecv">${ic('inbox', 'ic-14')} Recevoir</button>
         </div>
       </details>

       <p class="hint" style="margin-top:2px">${ic('save', 'ic-14')} Ta <a href="#/moi">sauvegarde complète</a> reste dans « Moi ».</p>
     </div>`;
  root.querySelector('#ecSync').addEventListener('click', openAppareils);
  root.querySelector('#ecPromo').addEventListener('click', openPromo);
  root.querySelector('#ecGive').addEventListener('click', openDonner);
  root.querySelector('#ecRecv').addEventListener('click', openRecevoir);
}
