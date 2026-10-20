# Proposition R7 — Ceux qui aident

**Statut** : proposée et validée par le mainteneur le 20 octobre 2026.
C'est l'étape 1 du cycle d'un lot (`docs/recadrage.md`). Les trois
réponses sont en fin de page.

## Le problème

Tout le réseau de l'app repose sur des gens qui sont DEDANS : « Karim y
est en alternance » vaut un entretien sur quarante candidatures portées
contre trois à froid (`CLAUDE.md` §8). Or la personne la mieux placée
pour aider est celle qui vient de décrocher, et c'est précisément là que
l'app la lâche :

- une piste close « Décroché » se tait — un toast, et c'est tout ;
- l'entreprise où l'on vient d'entrer n'entre pas dans « Mon parcours »
  si l'on n'a pas pensé à cocher « J'y suis passé » : les amis ne voient
  donc jamais « Karim y est » là où ça compte ;
- qui veut aider ne peut rien dire de ce qu'il offre, et qui demande ne
  sait demander qu'une chose — un contact.

De l'autre côté, demander coûte : on surestime le refus. Flynn et Lake
(2008, *Journal of Personality and Social Psychology*) mesurent qu'on
sous-estime d'environ moitié la probabilité qu'on nous dise oui à une
demande d'aide directe. Et l'aide se tarit faute de retour : un simple
merci fait plus que doubler la probabilité d'aider une deuxième fois
(Grant et Gino, 2010 : 66 % contre 32 %).

## Ce qui existe déjà

- « Mon parcours » et « J'y suis passé » (`parcoursDe`), le profil donné
  à un ami (OCA1), le bandeau « Karim y est en alternance » sur la fiche
  et « Demander à Karim ».
- La conversation avec un ami (6.68), scellée pour lui seul.
- La demande à ses amis et son merci, qui part tout seul (lot 3).
- Le prénom de qui a donné un contact, gardé sur le contact (`via`).

## Le temps accordé

Trois semaines au plus, comme le plan. Derrière un drapeau daté
(`aide`), en préversion d'abord.

## La solution esquissée

**① « Je peux aider », dans Moi.** Trois cases, des mots fixes, aucune
cochée au départ :

- **Parler de mon entreprise** — vingt minutes, l'« entretien de
  réseau » de l'APEC : on y apprend le métier et l'équipe, on n'y
  demande pas d'emploi ;
- **Relire un CV** ;
- **Présenter quelqu'un** — le double accord que la fiche sait déjà
  faire (« Julie est d'accord », lot F3b).

Ce qui est coché part dans le profil donné à un ami, en un champ
facultatif `aide` : des mots de cette table, **jamais un texte libre**.
Décoché, il disparaît chez les amis à la mise à jour suivante du profil
(lot 4a).

**② À « Décroché », la piste propose d'aider à son tour.** Après le
geste, au lieu du seul toast : une feuille « Décroché », un but — aider
ceux qui suivent. Deux choses, et seulement si elles manquent :
« Ajouter Aztek à mon parcours » (le mot du profil — alternance, stage,
emploi —, depuis ce mois-ci), et les trois cases de ①. Une croix pour
ne rien faire ; la feuille ne revient jamais pour cette piste.

**③ Chez l'ami, la demande dit ce qu'on peut demander.** Sur la fiche,
le bandeau « Karim y est en alternance » ouvre « Demander à Karim » ; si
Karim a dit qu'il peut parler de son entreprise, la feuille propose
« Lui demander 20 minutes », un message prêt selon les règles de l'APEC
— qui je suis, ce que je cherche, combien de temps, pas d'emploi
demandé —, posé dans la conversation avec lui, **pas envoyé** : il part
de mon geste. La ligne de Karim dans « Amis » dit la même chose en un
mot. Sans case cochée, rien ne change.

**④ Le merci qui revient.** Quand une piste qu'un ami a portée (un
contact donné, `via`, ou une demande à cet ami) passe à « Réponse » ou
à « Décroché », la fiche propose une fois « Le dire à Karim » : un
message prêt (« Aztek m'a répondu, merci pour ton aide. »), dans la
conversation, envoyé d'un tap. C'est ce qui fait revenir celui qui aide.

## Les pièges

- **Une fuite par le profil donné.** Le scénario de fuite s'écrit
  d'abord, comme pour les amis : `aide` ne porte que des mots de la
  table, et rien d'autre du profil ne suit (`e2e-amis.mjs` ①).
- **Un annuaire de gens serviables.** L'app ne liste jamais « qui peut
  aider » : l'offre se lit sur une piste où l'ami est passé, ou sur sa
  ligne dans « Amis » — un chemin vers ses entreprises, jamais un
  annuaire (§8).
- **La pression sur qui aide.** Rien ne dit à Karim combien de fois on
  le lui a demandé, rien ne relance à sa place, et une case se décoche
  à tout moment. « Demandes de mes amis » coupée dans Réglages, l'offre
  se tait aussi.
- **Un message qui part tout seul.** Aucun : ③ et ④ préparent, le geste
  envoie.
- **Le toast de « Décroché »** porte aujourd'hui un emoji, que §4
  interdit : il part avec ce lot, puisque la feuille le remplace.

## Hors champ

- Prendre rendez-vous, un agenda partagé : on se met d'accord dans la
  conversation.
- Une note, un classement, un compte de « personnes aidées ».
- Aider quelqu'un qui n'est pas son ami : l'offre ne voyage que dans le
  profil donné.

## Les questions au mainteneur, et ses réponses

1. **Ce qu'on peut offrir.** Je recommande trois cases aux mots fixes —
   parler de mon entreprise, relire un CV, présenter quelqu'un. L'autre
   choix : une seule case, « Je peux aider », sans dire comment.
2. **Quand l'app le propose.** Je recommande au moment de « Décroché »,
   une fois, et toujours dans Moi. L'autre choix : dans Moi seulement.
3. **Le merci.** Je recommande que la fiche propose « Le dire à Karim »
   quand une piste qu'il a portée répond ou se décroche, un message
   prêt, envoyé d'un tap. L'autre choix : pas de merci de plus que celui
   des demandes d'aujourd'hui.

**Les réponses (20 octobre 2026)** : ① trois cases aux mots fixes ;
② à « Décroché », une fois, et dans Moi ; ③ « Le dire à Karim » sur la
fiche. Les trois recommandations, sans changement.

---

*Sources : F. Flynn et V. Lake, « If you need help, just ask:
Underestimating compliance with direct requests for help », JPSP 95(1),
2008 ; A. Grant et F. Gino, « A little thanks goes a long way », JPSP
98(6), 2010 ; APEC, « Les codes de l'entretien de réseau : do et
don't ».*
