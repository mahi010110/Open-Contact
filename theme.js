/* ============================================================
   OpenContact — le thème AVANT le premier pixel
   `<html data-theme="light">` est le repli écrit en dur ; le vrai
   thème vit dans IndexedDB, dont l'ouverture est asynchrone. Un
   utilisateur en sombre recevait donc du clair en pleine figure à
   chaque lancement : mesuré à 24 ms sur une machine de bureau (rien),
   mais 70 ms avec un processeur bridé ×4 et 95 ms ×8 — soit le
   téléphone d'un étudiant, et à CHAQUE ouverture.

   Ce fichier est chargé de façon bloquante dans le <head> : il
   s'exécute avant le premier rendu. Il ne peut pas lire IndexedDB
   (asynchrone), il lit donc le miroir synchrone que `applyTheme`
   entretient dans localStorage — la même clé, une valeur qui n'a rien
   de privé. À défaut, la préférence du système, qui vaut toujours
   mieux que « clair » écrit en dur.

   Pourquoi un FICHIER et pas un script en ligne : la CSP de la page
   est `script-src 'self'`, elle refuse l'inline — et on ne l'affaiblit
   pas pour trois lignes. Il est précaché par sw.js, donc local.

   `app.js` reste la source de vérité et corrige au besoin ; ceci n'est
   qu'une avance sur le premier pixel.
   ============================================================ */
(function(){
  try {
    var t = null;
    try { t = localStorage.getItem('oc_theme'); } catch (e) {}
    if (t !== 'light' && t !== 'dark')
      t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    var m = document.querySelector('#metaTheme');
    if (m) m.content = (t === 'dark') ? '#1E232B' : '#F7F6F1';
  } catch (e) {}
})();
