/* ============================================================
   OpenContact — interface · ton parcours, en un fichier (lot R9-a)
   (docs/propositions/R9-tous-les-metiers.md)

   « Exporter », dans « Mon parcours » : une feuille qui montre, ligne par
   ligne, ce que le fichier contient (`lignesCv` — rien de caché derrière
   un fichier, comme rien ne l'est derrière « Mon QR »), et un geste qui
   le fait partir. Au doigt la feuille de partage du téléphone, au poste
   le téléchargement : le chemin de « Ma copie » (`ui/fichier.js`).
   Le mot dit ce qui va se passer : « Envoyer » là où le téléphone
   partage, « Télécharger » ailleurs.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { cvDe, lignesCv, nomFichierCv, texteCv } from '../engine/cv.js';
import { S } from './state.js';
import { openSheet, btn, toast } from './dom.js';
import { enregistrerFichier, partagePossible } from './fichier.js';

/* les classes en toutes lettres : le relevé de la surface morte
   (`e2e-sobriete.mjs`) ne lit pas une classe composée à la volée */
const CLASSE = { nom: 'cv-nom', formation: 'cv-formation', experience: 'cv-experience' };

/* `profil` : ce que la feuille du profil montre, enregistré ou non —
   on exporte ce qu'on a sous les yeux */
export function ouvrirExport(profil){
  const cv = cvDe(profil, S.companies);
  const lignes = lignesCv(cv);
  const sh = openSheet({ title: 'Exporter', icon: 'download' });
  sh.body.innerHTML =
    `<ul class="cv-donne" id="cvDonne" aria-label="Ce que contient le fichier">
       ${lignes.map(l => `<li class="${CLASSE[l.sorte] || ''}">${l.sorte === 'nom' ? `<b>${esc(l.texte)}</b>`
         : l.sous ? `<b>${esc(l.texte)}</b><span>${esc(l.sous)}</span>` : `<span>${esc(l.texte)}</span>`}</li>`).join('')}
     </ul>`;
  const partage = partagePossible();
  const go = btn(partage ? 'Envoyer' : 'Télécharger', 'btn-primary', async () => {
    const fait = await enregistrerFichier(texteCv(cv), nomFichierCv(todayISO()), 'Mon parcours');
    if (fait === 'renonce') return;
    sh.close(null, true);
    /* un téléchargement ne se voit pas à l'écran : on le dit ; un
       partage, la feuille du téléphone l'a déjà montré */
    if (fait === 'telechargement') toast('Parcours téléchargé ✓');
  }, partage ? 'share' : 'download');
  go.id = 'cvGo';
  sh.setFoot([go]);
  return sh;
}
