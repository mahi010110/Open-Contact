# Proposition R2 — Un suivi qui se remplit seul

**Statut** : proposée et validée par le mainteneur le 20 octobre 2026.
C'est l'étape 1 du cycle d'un lot (`docs/recadrage.md`). Les trois
réponses sont en fin de page.

## Le problème

Le suivi demande d'être tenu à la main, et c'est là qu'on abandonne
les outils de suivi : on cesse de les remplir, puis de les ouvrir. Deux
moments le montrent.

- **Pendant la recherche**, rien ne dit où l'on en est en un coup
  d'œil. Le compte de pistes (« 9 pistes ») ne dit ni combien ont été
  écrites, ni combien ont répondu.
- **Au retour après une pause**, « Aujourd'hui » empile les retards :
  « En retard » liste tout ce qui a glissé, et chaque ligne porte ses
  jours manqués. On rouvre l'app pour se remettre en route, et on tombe
  sur une dette.

## Ce qui existe déjà

Le premier point du plan est déjà tenu : un mail marqué « Envoyée ✓ »
passe la piste « En cours », date la candidature et propose la relance
à 7 jours (`ui/mail.js`, `markSentAndFollow`). R2 ne le refait pas.

## Le temps accordé

Deux semaines au plus, comme le plan. Derrière un drapeau daté
(`suivi`), en préversion d'abord.

## La solution esquissée

**① Tes chiffres, en une ligne en tête de Pistes.** Trois nombres, à la
place du compte de pistes. Ils se déduisent tous de ce que l'app tient
déjà, sans clé nouvelle :

| chiffre | se déduit de |
|---|---|
| **écrites** | les pistes qui ont une date de candidature (`appliedAt`) |
| **réponses** | les pistes passées par « Réponse » (le statut, ou « Statut → Réponse » dans leur historique) |
| **décrochées** | les pistes closes en « Décroché » (`closedReason`) |

Au téléphone, une ligne de données sous le titre (police mono, comme le
compte d'aujourd'hui). Au poste, la même ligne. Rien ne se tape : c'est
un état, pas un bouton.

**② Le retour après une pause : trois choses à faire.** Si rien n'a été
fait depuis 7 jours (le journal date chaque geste), « Aujourd'hui »
s'ouvre sur une tranche « Reprendre ». Elle propose trois choses,
choisies par l'app :

1. d'abord ce qui a une date dépassée ;
2. puis ce qui se tait ;
3. puis par où commencer.

Ni le nombre de jours de retard ni le compte de ce qui a glissé ne
s'affichent ; le reste de l'écran est replié dessous. Le premier geste
fait referme la tranche, puisque le journal note ce geste. La règle
d'une seule tranche de suggestion à la fois (§6) est tenue.

## Les pièges

- **« Entretiens » ne se déduit pas exactement.** L'app n'a pas d'état
  « Entretien » : « Réponse » couvre la réponse et l'entretien (la barre
  comprend d'ailleurs « entretien » comme « Réponse »). Le compter
  demanderait soit un statut de plus, soit de lire le mot « entretien »
  dans le texte des actions faites, ce qui est fragile.
- **« Une pause » se mesure aux gestes, pas aux visites.** L'app n'écrit
  pas quand on l'ouvre, et ne doit pas commencer à le faire. Quelqu'un
  qui ouvre l'app tous les jours sans rien y faire verra « Reprendre ».
  C'est juste : il n'a rien repris.
- **Ne pas cacher une urgence.** Une relance du jour reste dans les
  trois choses proposées ; seul le chiffre du retard disparaît.

## Hors champ

- Les relances préparées et envoyées en série : c'est R3.
- Les objectifs de la semaine : c'est R4.
- Toute notification : la décision 0006 n'est pas tranchée.

## Les questions au mainteneur, et ses réponses

1. **Le troisième chiffre.** Je recommande « décrochées » (les pistes
   closes en « Décroché »), qui se déduit exactement. Alternatives :
   - « entretiens », en ajoutant un statut « Entretien » entre
     « Réponse » et la clôture. C'est un changement de modèle, avec une
     migration en lecture et un contrat qui bouge ;
   - « entretiens », lus dans le texte des actions faites. C'est
     approximatif.
2. **Le seuil de la pause.** Je propose 7 jours, le seuil de la relance
   (`SILENCE_RELANCE`), pour ne pas ajouter un chiffre à défendre.
3. **Où vivent les chiffres.** En tête de Pistes, comme le plan, ou
   aussi sur « Aujourd'hui » ? Je recommande Pistes seulement : une
   seule place par chose.

**Les réponses (20 octobre 2026)** : ① « décrochées » ; ② 7 jours ;
③ Pistes seulement. Les trois recommandations, sans changement.

## Livrée en préversion (6.83.0)

Derrière le drapeau `suivi`, le moteur dans `engine/suivi.js`, gardé par
`e2e-reprendre.mjs`. Trois choix faits en construisant, à relire avec
toi :

- **Ce qui compte comme un geste** : une piste qui change (`updatedAt`,
  qui voyage avec la synchronisation : un soir sur l'ordinateur compte
  aussi sur le téléphone), ou une ligne du journal qui nomme une piste
  (donner, recevoir, demander). Un merci, un ami qui t'ajoute, la
  synchronisation qui se raconte ne referment pas une pause.
- **« Réponses » compte aussi les refus** : « ils m'ont dit non » est
  une réponse. L'entonnoir ne remonte jamais : écrites ≥ réponses ≥
  décrochées.
- **Un repère en tête des lignes sans case** : dans « Reprendre », une
  action prévue garde sa case « Fait » ; ce qui se tait prend l'horloge
  de « Sans nouvelles », par où commencer l'éclair. Le nom garde ainsi
  un seul bord, et la ligne dit pourquoi elle est là.

Pas de reprise tant que les premiers pas sont là (on ne reprend que ce
qu'on a commencé), ni avec les pistes d'exemple. Le reste de l'écran se
replie sous « Tout le reste ».

