# Proposition R8 — Le clavier au poste

**Statut** : proposée et validée par le mainteneur le 20 octobre 2026.
C'est l'étape 1 du cycle d'un lot (`docs/recadrage.md`). Les trois
réponses sont en fin de page.

## Le problème

Au poste, l'app se pilote encore surtout à la souris. Le clavier y fait
quelques gestes, chacun trouvé par hasard :

- « / » amène à la recherche, « n » ouvre une piste neuve, depuis
  n'importe quel écran ;
- « E » écrit à la piste choisie, dans la liste-détail seulement ;
- les flèches parcourent le tableau, Entrée ouvre, Échap remonte ;
- Ctrl+Entrée valide la capture et le mail.

Trois choses manquent :

1. **Un endroit qui fait tout.** Pour écrire à Aztek, il faut trouver
   la piste, l'ouvrir, puis toucher « Écrire » : trois gestes là où une
   phrase suffirait.
2. **Les lettres ne se voient pas.** Seules « / » et ↓ s'annoncent, dans
   le champ de recherche. Une touche qu'on ne voit pas n'existe pas.
3. **Les touches d'une lettre ne se coupent pas.** WCAG 2.1.4 (niveau A)
   le demande : quelqu'un qui dicte à la voix, ou dont la main tremble,
   déclenche « n » en parlant ou en frôlant le clavier. Aujourd'hui, l'app
   ne respecte pas ce critère.

## Ce qui existe déjà

- Le moteur de la barre (`chercherPistes`, `engine/requete.js`), qui
  comprend déjà les pistes, les métiers, les villes et les états.
- Les gestes eux-mêmes : écrire (`openMail`), planifier, clôturer, la
  fiche, « Ma semaine », les amis et leurs conversations.
- La règle de §5 : « une touche s'annonce DANS ce qu'elle commande,
  jamais dans un écran d'aide ».

## Le temps accordé

Une semaine au plus, comme le plan. Derrière un drapeau daté (`clavier`),
en préversion d'abord. Rien ne change au pouce : il n'a pas de clavier
physique.

## La solution esquissée

**① Ctrl K (⌘K sur Mac) : chercher et faire.** Une fenêtre, un champ,
une liste. On tape « aztek » : la piste, puis ses gestes —
« Écrire à Aztek », « Planifier Aztek », « Ouvrir la fiche ». On tape
« karim » : « Écrire à Karim ». On tape « semaine » : « Ma semaine ».
↑ ↓ choisissent, Entrée fait, Échap ferme. La recherche est celle de la
barre, rien d'autre ; aucune requête ne part sur le réseau. C'est le
motif de Linear, de GitHub et de VS Code, et le seul raccourci à
modificateur que l'app ajoute.

**② Une lettre par geste fréquent, écrite dans son bouton.** Au poste
seulement, une petite touche dans le bouton qu'elle commande — `E` dans
« Écrire », `P` dans « Planifier », `N` dans « Ajouter ». Rien à
apprendre ailleurs, et aucun écran d'aide. Le lecteur d'écran l'entend
par `aria-keyshortcuts`. Cinq lettres au plus : N (nouvelle piste),
/ (chercher), E (écrire), P (planifier), F (fait, sur une action du
jour).

**③ Les touches d'une lettre se coupent.** Une rangée dans Réglages,
« Touches d'une lettre » : allumées par défaut au poste, éteintes d'un
tap. C'est la réponse de GitHub au même critère. Ctrl K reste toujours :
un modificateur ne se déclenche pas en parlant.

## Les pièges

- **Taper dans un champ** : aucune lettre n'agit tant qu'un champ a le
  curseur, ni quand une feuille est ouverte. C'est déjà la règle de « n ».
- **Les claviers AZERTY** : on lit la lettre produite (`e.key`), jamais
  la position de la touche. « / » se fait en Maj+: sur un AZERTY, et
  c'est bien « / » qui arrive.
- **Ctrl K dans le navigateur** : Chrome et Firefox s'en servent pour la
  barre d'adresse. La page le prend seulement quand elle a le focus,
  comme GitHub le fait.
- **Une palette qui devient un menu caché** : elle ne propose que des
  gestes qui existent déjà à l'écran ; aucune fonction ne vit
  seulement là.

## Hors champ

- Le pouce, qui n'a pas de clavier.
- Des raccourcis qu'on remappe soi-même : couper suffit au critère, et
  le remappage est un écran de réglages de plus.
- Des enchaînements à deux touches (« g » puis « p »), qu'on oublie.

## Les questions au mainteneur, et ses réponses

1. **La fenêtre Ctrl K.** Je recommande qu'elle cherche les pistes, les
   amis et les gestes, au poste seulement. L'autre choix : pas de
   palette, seulement les lettres dans les boutons.
2. **Couper les touches d'une lettre (WCAG 2.1.4).** Je recommande une
   rangée « Touches d'une lettre » dans Réglages, allumée par défaut.
   L'autre choix : les lettres n'agissent que quand le focus est dans la
   liste ou la fiche — rien à régler, mais « n » et « / » ne marchent
   plus depuis n'importe où.
3. **Les lettres.** Je recommande les cinq gestes du jour : N, /, E, P,
   F. L'autre choix : seulement N et / (l'existant), sans lettre neuve.

**Les réponses (20 octobre 2026)** : ① la fenêtre Ctrl K cherche les
pistes, les amis et les gestes, au poste ; ② une rangée « Touches d'une
lettre » dans Réglages, allumée par défaut ; ③ les cinq gestes du jour.
Les trois recommandations, sans changement.

---

*Sources : W3C, WCAG 2.2, critère 2.1.4 « Character Key Shortcuts » ;
GitHub Docs, « Keyboard shortcuts » (désactiver les raccourcis d'une
touche) ; Apple, Human Interface Guidelines, « Keyboards ».*
