# Proposition R3 — Prêts à partir

**Statut** : proposée et validée par le mainteneur le 20 octobre 2026.
C'est l'étape 1 du cycle d'un lot (`docs/recadrage.md`). Les trois
réponses sont en fin de page.

## Le problème

Écrire est le geste le plus cher de l'app, et le seul que personne ne
peut faire à la place de l'étudiant (`CLAUDE.md` §7). Aujourd'hui, il
se fait piste par piste, et trois choses le freinent.

- **Les relances du jour ne partent pas ensemble.** Trois relances dues,
  c'est trois fois : ouvrir la ligne, « Écrire », envoyer, revenir,
  « Envoyée ✓ ». La série existe (Pistes › Choisir › Écrire), mais il
  faut cocher soi-même ce que l'app sait déjà.
- **Rien ne dit qu'un mail est prêt.** L'app sait quelles pistes ont
  une adresse et un modèle qui leur va (« Relance » pour une piste en
  cours, « Candidature spontanée » pour une nouvelle). Elle ne le dit
  nulle part.
- **Fermer le composeur perd ce qu'on a écrit.** Une accroche commencée
  dans le bus disparaît si l'on ferme la feuille pour vérifier une
  date.

## Ce qui existe déjà

- La série (`ui/prospect.js`, `run`) : un composeur après l'autre, avec
  « 2/5 », « Passer » qui avance et la croix qui arrête tout.
- Le modèle conseillé selon le statut (`modeleConseille`), le brouillon
  sans trou (`remplirTrous`), « Envoyée ✓ » qui date la candidature et
  propose la relance à 7 jours.

R3 ne refait rien de cela. Il ajoute une entrée, un dessin au poste et
une mémoire.

## Le temps accordé

Deux semaines au plus, comme le plan. Derrière un drapeau daté
(`prets`), en préversion d'abord.

## La solution esquissée

**① « Prêts à partir », sur « Aujourd'hui ».** Quand au moins deux mails
peuvent partir maintenant, un bouton les écrit d'affilée : « Écrire les
3 ». Sont prêts : les relances dues (une prochaine action datée
d'aujourd'hui ou d'avant, une adresse), puis les premiers mails que
« Par où commencer » propose (une adresse). Cinq au plus, dans cet
ordre. En dessous de deux, rien ne s'ajoute : la ligne de la piste porte
déjà son « Écrire ».

**② Au téléphone, un mail par écran.** La série d'aujourd'hui, telle
quelle : le composeur rempli par le bon modèle, « 2/3 » en tête,
« Passer », et « Envoyée ✓ » qui enchaîne la suivante. À la fin, une
ligne dit ce qui est parti.

**③ Au poste, la file, le mail et la fiche** (décision 0003). Une
fenêtre en trois colonnes : à gauche la file (chaque mail et son état :
à écrire, parti, passé), au milieu le composeur, à droite « À savoir »
et l'historique de la piste. ↑ ↓ passent d'un mail à l'autre ; rien ne
part sans le geste d'envoi de chaque mail.

**④ Les brouillons se gardent, sur cet appareil.** Une clé nouvelle,
`oc_brouillons_v1` : pour chaque piste, l'objet, le message et la
personne visée, enregistrés pendant la frappe. Le composeur rouvert sur
cette piste reprend où l'on s'était arrêté. Le brouillon part à l'envoi
(« Envoyée ✓ ») ou au bout de 30 jours. Il ne voyage pas : ni dans un
partage, ni dans la copie, ni vers tes autres appareils. Il se scelle
sous le verrou comme le reste du suivi, et « Effacer cet appareil »
l'emporte.

## Les pièges

- **Le lien mail fait sortir de l'app à chaque mail.** Au téléphone,
  une série de trois, c'est trois allers-retours vers l'application de
  mail. L'envoi direct (R6) les supprimera ; R3 ne doit pas le
  promettre.
- **Une série ne doit pas devenir un envoi de masse.** Cinq au plus, et
  chaque mail se relit et part de son propre geste. Les campagnes (envoi
  programmé, plafond) restent à la surface ordinateur.
- **Un brouillon est du privé.** Il ne sort jamais (invariant ①). Le
  test de fuite s'écrit avant la fonctionnalité, comme pour `vecu`.
- **Un brouillon ne doit pas écraser un modèle plus juste.** Si le
  statut de la piste a changé depuis (une réponse est arrivée), le
  brouillon reste proposé mais ne s'impose pas.

## Hors champ

- L'envoi depuis l'app (R6, décision 0007).
- Les objectifs de la semaine (R4).
- Les campagnes, qui restent à la surface ordinateur.

## Les questions au mainteneur, et ses réponses

1. **Où vit « Écrire les 3 » au téléphone ?** Je recommande le pied
   d'« Aujourd'hui », juste au-dessus de la barre, là où le pouce
   arrive (`CLAUDE.md` §5) : c'est alors l'action principale de
   l'écran, et elle n'existe que quand elle sert. L'autre place serait
   une ligne en tête, sous le titre.
2. **Ce que la série prend.** Je recommande les relances dues, puis les
   premiers mails, cinq au plus. L'autre choix : les relances
   seulement.
3. **Les brouillons.** Je recommande cet appareil seulement, comme le
   plan. L'autre choix : qu'ils voyagent avec la synchronisation de tes
   appareils, ce qui permettrait de commencer au téléphone et de finir
   au poste.

**Les réponses (20 octobre 2026)** : ① au pied d'« Aujourd'hui » ;
② les relances dues, puis les premiers mails, cinq au plus ; ③ cet
appareil seulement. Les trois recommandations, sans changement.
