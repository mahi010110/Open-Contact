# Proposition R4 — Ma semaine

**Statut** : proposée et validée par le mainteneur le 20 octobre 2026.
C'est l'étape 1 du cycle d'un lot (`docs/recadrage.md`). Les trois
réponses sont en fin de page.

## Le problème

Une recherche de stage ou d'alternance dure des semaines, et elle se
perd dans le flou : on ne sait pas si l'on en fait assez. Les chiffres
de R2 disent où l'on en est depuis le début ; rien ne dit où l'on en
est **cette semaine**, ni ce qu'on s'était promis. Et le groupe, qui
pourrait tenir chacun en mouvement, ne voit rien de ce que fait l'autre.

## Ce qui existe déjà

- Les gestes sont datés : « Email envoyé » dans l'historique de chaque
  piste, « Fait : … » au journal, la date de candidature (`appliedAt`).
- Les chiffres de R2 (`engine/suivi.js`), qui se déduisent sans rien
  saisir.
- Les groupes, où l'on s'écrit d'un geste (lot 5).

## Le temps accordé

Deux semaines au plus, comme le plan. Derrière un drapeau daté
(`semaine`), en préversion d'abord.

## La solution esquissée

**① Le lundi, un objectif d'un tap.** En tête d'« Aujourd'hui », une
ligne : « Cette semaine : 5 mails ». L'app propose le nombre (ce que tu
as fait la semaine d'avant, plus un ; trois au moins), et deux boutons
le font varier. Rien à taper.

**② Pendant la semaine, il se remplit seul.** « 2 sur 5 », compté sur
les mails partis depuis lundi (« Envoyée ✓ », ou une piste qui a quitté
« À contacter »). Aucun reproche s'il reste en dessous : la ligne dit
un nombre, pas un retard.

**③ Le vendredi, la revue.** La ligne devient trois nombres — mails
partis, réponses reçues, pistes ajoutées — et un geste : « Partager au
groupe ». Le message ne porte que ces nombres et des mots fixes
(« Ma semaine : 5 mails, 1 réponse, 3 pistes »), **jamais un nom
d'entreprise ni de personne**. Il part de ton geste, dans le groupe
que tu choisis ; rien ne part tout seul.

L'objectif vit dans le profil : il suit tes appareils, il ne sort
jamais dans un partage de pistes ni dans le profil donné à un ami.

## Les pièges

- **Un objectif qui devient une dette.** On ne cumule rien d'une
  semaine à l'autre, on ne rougit jamais. La semaine d'après repart de
  zéro, et l'app propose un nombre à portée.
- **Une fuite par le message de la revue.** Le test de fuite s'écrit
  d'abord : le message est construit par le moteur à partir de
  nombres seulement, et le scénario lit ce qui part réellement dans le
  groupe.
- **Le « lundi » d'un étudiant.** Une semaine commence le lundi pour
  tout le monde ; la revue s'offre dès le vendredi et reste jusqu'au
  dimanche.

## Hors champ

- Toute notification (décision 0006) : la ligne vit dans « Aujourd'hui ».
- Un classement entre membres du groupe : chacun partage le sien, s'il
  veut, et personne n'est comparé.

## Les questions au mainteneur, et ses réponses

1. **Ce que compte l'objectif.** Je recommande un seul nombre, les mails
   partis : c'est le geste qui fait avancer, et un seul chiffre se tient.
   L'autre choix : trois objectifs (mails, relances, pistes).
2. **Comment il se fixe.** Je recommande que l'app propose et que deux
   boutons le fassent varier. L'autre choix : l'étudiant tape son
   nombre.
3. **Le partage de la revue.** Je recommande un geste « Partager au
   groupe » sur la revue du vendredi, des nombres seulement. L'autre
   choix : pas de partage dans R4.

**Les réponses (20 octobre 2026)** : ① un seul nombre, les mails
partis ; ② l'app propose, deux boutons le font varier ; ③ « Partager
au groupe » d'un geste, des nombres seulement. Les trois
recommandations, sans changement.
