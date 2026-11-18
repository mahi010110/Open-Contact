/* ============================================================
   OpenContact · la nouvelle interface · enregistrer, envoyer un texte
   (repris de ui/fichier.js : la nouvelle interface n'importe rien de ui/)

   Au doigt, la feuille de partage du téléphone : on y choisit la
   conversation (le salon de la classe, un message), et c'est parti en un
   geste. Au poste, ou quand le navigateur ne sait pas partager, le
   téléchargement et le presse-papier.
   ============================================================ */
export function partagePossible(){
  return matchMedia('(pointer:coarse)').matches && typeof navigator.canShare === 'function'
    && typeof navigator.share === 'function';
}
/* Chrome ne partage qu'une liste fermée d'extensions : un `.oc` y est
   refusé en silence. On essaie le vrai nom, puis le même en `.oc.txt`
   — que « Recevoir » lit pareil. */
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
/* rend 'partage', 'telechargement' ou 'renonce' (rien n'est parti) */
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
/* un texte qu'on tend à quelqu'un : la feuille de partage au doigt, le
   presse-papier sinon. Rend 'partage', 'copie', 'renonce' ou 'echec'. */
export async function envoyerTexte(texte){
  if (partagePossible()){
    try { await navigator.share({ text: texte }); return 'partage'; }
    catch (e) { if (e && e.name === 'AbortError') return 'renonce'; }
  }
  try { await navigator.clipboard.writeText(texte); return 'copie'; }
  catch (e) { return 'echec'; }
}
