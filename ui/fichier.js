/* ============================================================
   OpenContact — interface · enregistrer un fichier
   UNE COPIE VAUT PAR L'ENDROIT OÙ ELLE EST. Téléchargée sur un
   téléphone, elle reste sur ce téléphone : elle rattrape un navigateur
   vidé, pas un téléphone perdu, volé ou changé — et c'est le cas
   courant. Au doigt, le fichier passe donc par la feuille de partage du
   système (Web Share, niveau 2) : Drive, Fichiers iCloud, un mail à
   soi-même — l'étudiant choisit, rien ne passe par nous (§10). Au poste,
   ou quand le navigateur ne sait pas partager un fichier, c'est le
   téléchargement d'avant, sans rien perdre.

   Deux copies passent par ici, et c'était tout le problème : celle de
   « Moi » partageait déjà, celle que la protection EXIGE avant de finir
   se contentait de télécharger — la plus importante des deux restait
   sur le téléphone qu'elle devait remplacer.
   ============================================================ */

export function partagePossible(){
  return matchMedia('(pointer:coarse)').matches && typeof navigator.canShare === 'function'
    && typeof navigator.share === 'function';
}

/* Chrome n'accepte de partager qu'une liste fermée d'extensions (.txt,
   .json, .pdf, images…) : un `.oc` y est refusé en silence. On essaie
   le vrai nom d'abord, puis le même fichier en `.oc.txt` — que
   « Restaurer » et « Recevoir » lisent pareil. */
function fichierPartageable(txt, nom){
  for (const [n, type] of [[nom, 'application/octet-stream'], [nom + '.txt', 'text/plain']]){
    const f = new File([txt], n, { type });
    try { if (navigator.canShare({ files: [f] })) return f; } catch (e) {}
  }
  return null;
}

export function telecharger(txt, nom){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* Rend ce qui s'est passé : 'partage' (la feuille du système a pris le
   fichier), 'telechargement', ou 'renonce' — renoncer n'est pas une
   panne : rien n'est parti, et l'appelant ne doit rien compter. */
export async function enregistrerFichier(txt, nom, titre){
  const f = partagePossible() ? fichierPartageable(txt, nom) : null;
  if (!f){ telecharger(txt, nom); return 'telechargement'; }
  try {
    await navigator.share({ files: [f], title: titre });
    return 'partage';
  } catch (e) {
    if (e && e.name === 'AbortError') return 'renonce';
    telecharger(txt, nom);
    return 'telechargement';
  }
}
