/* ============================================================
   OpenContact — interface · « Ajouter » (R1, décision 0002)

   Le + fait TOUT entrer : une piste qu'on vient de croiser, et ce qu'un
   camarade te tend — son QR, son fichier, son texte. Avant, la piste
   vivait derrière le +, et ce qu'on reçoit derrière « Échanger ›
   Recevoir » : deux portes pour une seule question, « qu'est-ce que
   j'ajoute ? ».

   Une feuille, un but (§2 ③) : ajouter. L'action la plus probable — une
   piste — tient le pied, sous le pouce (§5) ; ce qu'on reçoit se range
   dessous du mot que l'app emploie déjà, « Recevoir », avec les trois
   mots de « Donner » de l'autre côté (§7). Le titre porte le verbe :
   les gestes disent le nom seul (§6, « La taille dit le rang »).
   ============================================================ */
import { openSheet, btn, ic } from './dom.js';
import { openCapture } from './capture.js';
import { openRecevoir } from './recevoir.js';

export function openAjouter(){
  const sh = openSheet({ title: 'Ajouter', icon: 'plus', className: 'modal-ajouter' });
  sh.body.innerHTML =
    `<section class="tranche aj-recv">
       <h2 class="tr-h">${ic('inbox', 'ic-14')} Recevoir</h2>
       <div class="pick-list">
         <button class="pick" data-mode="qr"><b>${ic('grid-3x3', 'ic-14')} QR</b></button>
         <button class="pick" data-mode="fichier"><b>${ic('folder', 'ic-14')} Fichier</b></button>
         <button class="pick" data-mode="texte"><b>${ic('clipboard', 'ic-14')} Texte</b></button>
       </div>
     </section>`;
  /* le choix est fait : la feuille cède la place au geste, dans le MÊME
     tap — un sélecteur de fichier ne s'ouvre que pendant un geste */
  sh.body.querySelectorAll('[data-mode]').forEach(b =>
    b.addEventListener('click', () => { sh.close(); openRecevoir({ mode: b.dataset.mode }); }));
  const piste = btn('Une piste', 'btn-primary', () => { sh.close(); openCapture(); }, 'briefcase');
  piste.id = 'ajPiste';
  sh.setFoot([piste]);
}
