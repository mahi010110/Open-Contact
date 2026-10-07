# L'audit du téléphone

*6 octobre 2026. Demande du mainteneur : « fais un immense audit UX sur
smartphone, j'ai vu des immondices graphiques », partout : « À
découvrir » et l'aperçu, la fiche d'une piste, « Moi » et le profil.*

## Comment

Toutes les captures du téléphone ont été prises et **regardées**, avec
des données qui ressemblent à la vie : douze pistes, des noms longs, des
relances en retard, des échanges, un profil rempli
(`tests/e2e/audit-captures.mjs`). Cela fait 26 écrans et feuilles et
4 états vides, sur trois jeux de réglages :

- 390 px en thème clair ;
- 390 px en thème sombre ;
- 320 px avec le texte doublé (200 %).

Elles ont été prises deux fois, sous deux moteurs :

- **Chromium**, celui de l'environnement de développement ;
- **WebKit**, celui de l'iPhone, en CI. CLAUDE.md §9 : le moteur de
  l'utilisateur n'avait encore jamais été mesuré.

## Ce qui était faux, et ce qui a changé

| Où | Le défaut | Ce qui a changé |
|---|---|---|
| Mes pistes | Avec une ville au profil, ouvrir l'onglet posait d'office une question à l'annuaire (« À découvrir … »), sans geste | La question ne part qu'avec une recherche ou un tap sur « À découvrir » |
| Toute feuille | La barre « Annuler » se posait sur la feuille ouverte : sur « Mes appareils » elle cachait « Rejoindre », sur le clavier du code elle cachait des touches | Feuille ouverte, elle se pose en haut, au-dessus de la feuille, comme le toast |
| Tout écran | À texte agrandi, une bande d'accent restait collée en haut : c'était le lien « Aller au contenu », caché par un décalage en pixels qui ne suivait pas la police | Il est caché par sa propre hauteur, quelle qu'elle soit |
| Modifier | « Société Générale Global Solution Centre — D… » : le nom se coupait | Le nom se replie et se lit en entier |
| Modifier, contact, modèle, profil | Au doigt, ouvrir la feuille mettait le curseur dans le premier champ : le clavier montait sur un formulaire qu'on venait relire (et WebKit surlignait tout le nom) | Le clavier ne monte que si la feuille sert à écrire (une fiche neuve, un profil vide) |
| Profil | « Formation » et « École » espacés de 22 px, les autres champs de 12 ; « Fin » 4 px plus bas que « Début » ; le texte collé en haut de son champ | Un seul rythme, les deux dates au même bas, le texte centré comme dans un champ voisin |
| Capture | « L'entreprise » et « Le contact » écrits comme une phrase, seule feuille de l'app sans les petites capitales grises | Le libellé de tous les autres champs |
| Prochaine action | Un gros ▼ noir et un agenda noir, dessinés par le navigateur | Le chevron et l'agenda de l'app, qui suivent le thème |
| Prospecter | « ＋ ajoute quelqu'un » sous chaque piste sans adresse : la liste doublait de hauteur, la même phrase huit fois | « sans adresse » dans la sous-ligne ; la ligne d'ajout n'apparaît que sous la piste cochée |
| À découvrir | La dernière étiquette (« Lille · 15 km ») coupée net au bord du contenu, et une barre de défilement dessous sous WebKit | La rangée glisse jusqu'au bord de l'écran, sans barre |
| Aperçu | La ligne « Écrire à » plus haute que ses voisines, son texte décalé | Le lien garde sa cible de 44 px sans pousser la ligne |
| Aperçu (WebKit) | « Saint-Andre-Lez-Lille · 3 » puis « km » à la ligne, et le badge « Procédure collective » qui mordait la ligne du dessus | Le chiffre et « km » ne se séparent plus, et le badge prend sa place |
| Mes pistes, 200 % (WebKit) | Le champ de recherche réduit à « Métie », à côté d'un « Affiner » qui prenait la moitié | « Affiner » passe sous le champ |
| Tout écran | Un cadre pointillé autour du titre après un retour arrière | Le titre reçoit le focus pour être annoncé, sans contour |

Chaque correction est gardée par `tests/e2e/e2e-finitions.mjs` ou
`tests/e2e/e2e-mesure.mjs` (⓪). Les mutations ont été jouées une à une :
chacune fait rougir son garde. Le garde a aussi trouvé un défaut que
l'œil n'avait pas vu : **5 px de plus sous chaque champ de texte** que
sous un champ d'une ligne, la place d'un jambage sous un `<textarea>`
resté en ligne.

## Ce qui a été regardé et laissé tel quel

| Ce qu'on voit | Pourquoi ça reste |
|---|---|
| La sous-ligne d'une piste passe parfois sur deux rangs (« Appeler le standard · En cours · Seclin ») | Elle porte la prochaine action. Deux rangs au plus, c'est voulu (`.row-item .ri-sub`) |
| ~38 px avant « À savoir » dans la fiche | Mesuré : le même écart qu'entre les autres sections |
| À 200 % sur un 320 px, « Ajouter à mes pistes » sur deux lignes | Le mot ne tient pas, il se replie (WCAG 1.4.10) |
| « Lundi » seul sur un second rang de puces | Une puce fait la taille de son mot et le groupe se replie (§6) |
| À 200 %, les onglets du bas s'élident | La limite assumée de §4 (décision du 21 août 2026) |
| Les barres de défilement sous WebKit | Le WebKit de la CI est celui de Linux. L'iPhone n'en dessine pas |

## Ce que l'audit a appris aux outils

- **Une capture doit porter la langue de l'utilisateur** : le champ de
  date affichait « mm/dd/yyyy ». Les captures se prennent maintenant en
  `fr-FR`.
- **Un écran hérite de l'état du précédent** : la capture d'« Affiner »
  tombait en mode « À découvrir », où le bouton n'existe pas. Elle
  remet la barre à zéro d'abord.
- **Un garde qui ne trouve pas ce qu'il mesure reste vert.**
  `.overlay:last-of-type` ne désignait plus la feuille dès que la barre
  « Annuler », un autre `div`, était ajoutée après elle. Le garde refuse
  maintenant de conclure sans avoir mesuré la feuille.
- `planche.mjs` pose plusieurs captures côte à côte sur une image : on
  regarde un écran dans ses deux thèmes et ses tailles d'un coup d'œil.
