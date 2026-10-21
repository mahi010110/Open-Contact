# Proposition R10 — À grande échelle, et sans notifications

**Statut** : proposée et tranchée le 21 octobre 2026, par délégation du
mainteneur (« tu as l'entière main sur tout »). Sa demande, mot pour
mot : « vérifie avec des données en grand nombre — si j'ai envoyé
plusieurs demandes, comment les présenter ? si j'ai beaucoup de
discussions, beaucoup de groupes, de pistes ou de notifications… —
d'ailleurs j'aime pas les notifs, trouve un autre moyen, et
renseigne-toi ».

## Le problème, mesuré

Les scénarios semaient trois pistes, un ami, un groupe de quatre
messages. Un jeu à grande échelle (`tests/e2e/jeu-massif.mjs`) remplit
l'app jusqu'à ses plafonds réels, lus dans le moteur : 400 pistes,
200 amis, 5 groupes de 30 à 45 membres et 1 480 messages sur sept jours,
120 conversations privées (5 187 messages, jusqu'à 300 avec un même
ami), 28 demandes envoyées en trente jours, 60 reçues, 18 personnes à la
porte d'un groupe. Le relevé (`tests/e2e/releve-echelle.mjs`) mesure
chaque écran au pouce (processeur ralenti 4×, un téléphone moyen) et au
poste.

| ce qui casse | mesuré |
|---|---|
| ouvrir le plus gros groupe (640 messages) | **14,3 s** figé au pouce, une tâche de 6,4 s, 15 939 nœuds |
| une conversation de 300 messages | 2,4 s |
| « Donner » (356 pistes cochées) | 3,3 s |
| « Aujourd'hui » | « Tes amis 37 » : 37 cartes avant le travail du jour, rien d'autre au premier écran |
| les onglets | « Aujourd'hui 36 », « Échanger 40 » en permanence |
| la boîte | « 99+ » sur quatre groupes sur cinq |
| un groupe | « 457 nouveaux », et « ↓ 451 nouveaux » collé sur le fil |

Ce que le jeu ne casse pas, parce que l'app le bornait déjà : **mes
demandes** — trois ouvertes au plus (`DEMANDES_OUVERTES_MAX`), donc trois
cartes au plus ; les groupes — cinq au plus ; les listes de pistes et
d'actions — « Voir les N autres » à chaque tranche.

## Ce que disent les sources

- **Regrouper vaut mieux que couper.** Fitz, Kushlev et al. (2019,
  *Computers in Human Behavior*, 237 personnes, essai randomisé) :
  recevoir ses notifications **trois fois par jour** rend plus attentif,
  de meilleure humeur, moins stressé ; toutes les heures ne change rien ;
  **plus rien du tout rend anxieux** (peur de manquer). Donc pas « aucun
  signal », mais un signal qu'on va chercher, à son heure.
- **Un badge se réserve à ce qui réclame un geste.** W3C, *Badging API* :
  les badges contribuent à la fatigue des notifications, à réserver aux
  états qui méritent vraiment l'attention. PatternFly : un compteur qui
  est là presque tout le temps perd son effet et distrait. Apple : dans
  l'app ouverte, ajouter discrètement à la vue (Mail ajoute le message à
  la liste) plutôt que signaler.
- **On s'interrompt soi-même** presque autant qu'on est interrompu
  (Gloria Mark, UC Irvine : 44 % des interruptions) : un chiffre sur un
  onglet est une invitation à quitter ce qu'on fait.
- **Plus une demande est vue de tous, moins chacun y répond**
  (Barron et Yechiam, 2002) — l'app s'adresse déjà à chacun par son nom
  (décision 29) ; elle ne doit pas noyer ces adresses dans une pile.
- **Une journée tient en trois à cinq choses** (Todoist, « Plan your
  day ») ; une longue liste se charge par morceaux, avec un bouton
  plutôt qu'un défilement sans fin (Baymard, tests d'utilisabilité).

## Ce qui est décidé

### ① La performance, sans drapeau (rien ne change à l'œil)

- **Le fil se rend par fenêtre** : les 60 derniers messages, ou depuis
  un peu avant le premier non-lu (120 au plus), et « Voir les N messages
  d'avant » en tête, qui ouvre le morceau suivant sans rien déplacer
  sous les yeux (`ui/fil.js`). Groupes et conversations privées.
- **Un visage, un nœud** : un seul tracé SVG au lieu d'un `<rect>` par
  case (`ui/visage.js`).
- **Les formateurs de date se créent une fois** (`ui/dates.js`).
- **« Tes amis » montre trois lignes**, comme toute tranche, et « Voir
  les N autres » : les contacts qu'on t'a donnés d'abord, puis ce qu'on
  te demande et dont tu es toi-même le contact, puis ce qui s'éteint le
  plus tôt.

Après : le gros groupe s'ouvre en ~0,45 s sans ralentissement (1 s
avant), « Échanger » en 0,5 s au pouce (1,3 s avant), et le fil passe de
15 939 nœuds à moins de 2 000. Au pouce ralenti, il ne coûte plus
qu'environ une demi-seconde de plus qu'un groupe de vingt messages : le
reste est le prix d'ouvrir une feuille, petit groupe compris (1,9 s
mesuré à 4× dans le bac à sable), un chantier à part qui ne dépend pas
du nombre.

### ② Le calme, derrière le drapeau `calme` (préversion)

L'app ne sonne déjà pas (aucun serveur, décision 0006). Ce qui se
comporte comme une notification, c'est ce qui **compte** à ta place
pendant que tu fais autre chose. Il part ; l'information reste, là où
tu vas la chercher :

1. **Plus aucun chiffre sur les onglets.** « Aujourd'hui » dit déjà ce
   qui attend : c'est l'écran qu'on ouvre en premier, à son heure — le
   regroupement de Fitz, sans sonnerie.
2. **Plus de compteur sur une conversation.** Une conversation non lue
   s'écrit en gras, avec un point d'accent ; « @ » reste quand on t'y
   nomme — c'est le seul cas où quelqu'un t'attend toi.
3. **« Aujourd'hui » porte une ligne pour tes messages** : « Karim et
   Léa t'ont écrit » — seulement les messages d'amis et les mentions,
   jamais le bavardage d'un groupe ; un tap ouvre la boîte sur « Non
   lus ».
4. **Ce qui arrive des autres ne surgit plus** : plus de toast quand un
   ami t'ajoute, quand un ami a trouvé quelqu'un, quand tu entres dans
   un groupe — la liste, la carte ou la boîte le montrent déjà. Le
   **merci** d'un ami entre dans « Tes amis » pendant deux jours, au lieu
   d'un toast qu'on rate. Restent les pertes (groupe supprimé, retiré
   d'un groupe) : elles préviennent d'une perte qu'on ne peut pas voir
   venir.

## Hors champ

- Une sonnette quand l'app est fermée : c'est la décision 0006, qui
  attend la mesure de la bêta.
- Un résumé automatique d'un groupe (« ce qui te concerne ») : à
  rouvrir si la fenêtre ne suffit pas aux testeurs.

## Accepté quand

Les gardes `e2e-echelle.mjs` (le jeu massif : nœuds du fil, trois
lignes dans « Tes amis », aucun chiffre sur les onglets sous `calme`)
sont verts ; et un testeur avec un vrai groupe de classe dit que l'app
ne lui « crie » plus rien sans qu'il ait l'impression de rater quelque
chose.

---

*Sources : Fitz N., Kushlev K., Jagannathan R., Lewis T., Paliwal D.,
Ariely D., « Batching smartphone notifications can improve well-being »,
Computers in Human Behavior 101 (2019) ; W3C, « Badging API » (Working
Draft, 2025) ; PatternFly, « Notification badge — design guidelines » ;
Apple, Human Interface Guidelines, « Notifications » ; G. Mark, entretien
Gallup Business Journal et UC Irvine ISR ; Barron G. et Yechiam E.
(2002), « Private e-mail requests and the diffusion of responsibility »,
Computers in Human Behavior ; Todoist, « How to plan your day » ;
Baymard Institute, via Smashing Magazine, « Infinite scrolling,
pagination or load more buttons? » (2016).*
