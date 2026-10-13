/* ============================================================
   OpenContact — interface · le clavier ne couvre pas la feuille
   (retour du mainteneur, 13 octobre 2026 : « quand on écrit, c'est
   horrible »)

   Sur un iPhone, ouvrir le clavier NE RÉTRÉCIT PAS la page : seule la
   zone visible (`visualViewport`) diminue. Une feuille posée en bas de
   l'écran reste donc à sa place, et le clavier se pose dessus — mesuré
   avec un clavier simulé en 390 × 844 : de « Nouvelle piste » il ne
   restait que la barre de titre, ses trois champs et « Ajouter » étaient
   dessous ; dans « Écrire », le message et « Ouvrir dans Mail » aussi.
   Safari fait alors glisser toute la page pour montrer le champ, et la
   feuille saute d'un champ à l'autre.

   Android (Chrome) rétrécit la page lui-même quand on le lui demande —
   `interactive-widget=resizes-content`, dans index.html — mais Safari
   ignore ce réglage (WebKit, bug 259770). Reste la seule mesure que
   tous les moteurs donnent depuis des années : `visualViewport`. Tant
   qu'un clavier couvre le bas de l'écran, la racine porte
   `clavier-ouvert` et deux mesures — où commence la zone visible et sa
   hauteur ; les feuilles s'y logent (styles/app.css), leur pied reste
   au-dessus du clavier, et c'est la FEUILLE qui défile. Sur Android la
   page a déjà rétréci : rien n'est couvert, rien ne bouge.

   Trois gardes, chacune payée ailleurs :
   · un zoom à deux doigts rétrécit aussi la zone visible — ce n'est pas
     un clavier, on ne touche à rien ;
   · une barre d'outils de Safari qui se replie bouge de quelques
     dizaines de pixels — en dessous de 120, ce n'est pas un clavier ;
   · iOS 26 laisse parfois `offsetTop` décalé une fois le clavier rangé
     (forums développeurs d'Apple) : clavier rangé, on ne lit plus rien
     d'autre que « rangé », et la feuille reprend tout l'écran.
   ============================================================ */
const SEUIL = 120;

/* le champ qui a le curseur reste à l'écran, DANS sa feuille : on fait
   défiler la feuille, jamais la page — sur iPhone, faire défiler la page
   sous une feuille fixe est justement ce qui la fait sauter */
export function amenerDansFeuille(el){
  const b = el && el.closest && el.closest('.modal-b');
  if (!b) return;
  const r = el.getBoundingClientRect(), z = b.getBoundingClientRect();
  if (r.bottom > z.bottom - 8) b.scrollTop += Math.min(r.bottom - z.bottom + 8, r.top - z.top - 8);
  else if (r.top < z.top + 8) b.scrollTop -= z.top + 8 - r.top;
}

export function suivreZoneVisible(){
  const vv = window.visualViewport;
  if (!vv) return;
  const racine = document.documentElement;
  let raf = 0, ouvert = false;
  const maj = () => {
    raf = 0;
    const couvert = window.innerHeight - vv.height - vv.offsetTop;
    const etait = ouvert;
    ouvert = vv.scale <= 1.01 && couvert > SEUIL;
    racine.classList.toggle('clavier-ouvert', ouvert);
    if (ouvert){
      racine.style.setProperty('--zone-top', Math.max(0, Math.round(vv.offsetTop)) + 'px');
      racine.style.setProperty('--zone-h', Math.round(vv.height) + 'px');
    } else {
      racine.style.removeProperty('--zone-top');
      racine.style.removeProperty('--zone-h');
    }
    /* la feuille vient de rétrécir : le champ où l'on tape doit rester
       sous les yeux — une image plus tard, une fois la place prise */
    if (ouvert && !etait) requestAnimationFrame(() => amenerDansFeuille(document.activeElement));
  };
  const planifier = () => { if (!raf) raf = requestAnimationFrame(maj); };
  vv.addEventListener('resize', planifier);
  vv.addEventListener('scroll', planifier);
  /* passer d'un champ à l'autre, clavier ouvert, ne demande rien : la
     feuille a déjà sa taille, et le navigateur amène le champ dans la
     feuille de lui-même (mesuré, une mutation à l'appui — un écouteur
     de plus n'y changeait rien) */
  maj();
}
