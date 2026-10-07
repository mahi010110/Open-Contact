# Le minimum, au bon moment

*7 octobre 2026. Retour du mainteneur, avec cinq captures de son
téléphone : « Les mises à jour sont très bien. Le problème c'est qu'elles
sont très mal intégrées. Au final c'est juste un bouton en plus ou un
lien en plus. Je veux la facilité, la compréhension instinctive rien
qu'en regardant, et surtout du minimalisme. »*

La règle est écrite dans CLAUDE.md §6 (« Le minimum, au bon moment »).
Avant d'ajouter un élément, on se pose trois questions :

1. **Sert-il maintenant ?** S'il ne sert pas, il n'est pas là. Il
   apparaît au moment où il sert.
2. **Est-ce une information, ou une porte vers ailleurs ?** Un lien n'est
   pas une information.
3. **Peut-il être implicite ?** Un bouton qui « complète » ou « cherche »
   correspond à un geste que l'app peut faire elle-même, au bon moment.

## Ce qui part, ce qui bouge

| Où | Avant | Maintenant |
|---|---|---|
| Fiche, piste sans SIREN | « À savoir » ne contenait que quatre liens et une ligne de source | « À savoir » n'existe que s'il a quelque chose à dire |
| Fiche | « Trouver dans l'annuaire », puis « C'est laquelle ? » avec un code par ligne (« 70.10Z ») | **L'entreprise se reconnaît pendant qu'on tape son nom**, dans la capture et dans « Modifier ». La liste dit la ville et la taille. Un tap remplit ce qui manque, et les champs remplis s'éclairent un instant |
| Fiche | « Compléter ma fiche » | Parti : ce qui manque se remplit au moment où l'on choisit l'entreprise |
| Fiche, sous les contacts | « Personne pour l'instant. », « Anciens de mon école » / « Qui y travaille », « Écrire à … » | Rien. « + Ajouter » suffit |
| Ajouter un contact | La liste des dirigeants seulement | Les dirigeants, plus « Trouver sur LinkedIn » à côté du nom |
| Ajouter un contact | Profil, Note et « J'ai vérifié » toujours visibles | Repliés sous « Plus », ouverts d'office s'ils sont remplis |
| Fiche et aperçu | « Offres d'emploi », « Fiche officielle », SIREN, adresse du siège | Partis |
| Fiche | « Je cherche dans l'annuaire… », « L'annuaire ne répond pas. Réessayer » | Rien. La carte arrive quand elle peut |
| À découvrir | La ligne du marché (« Nord : 380 embauches prévues… ») | Partie : elle n'aidait à choisir aucune entreprise |
| À découvrir | « Offres d'alternance autour de … » en tête de liste | Après la liste : on regarde d'abord les entreprises |
| À découvrir, barre vide | « Tape un métier et une ville. », la source, « En retard 2 » | Rien |
| Mes pistes | « à planifier · À contacter » sur presque chaque ligne | « à planifier » seulement sur une piste engagée |
| Profil | Les puces 5 / 15 / 30 km sous un champ de ville vide | Elles apparaissent une fois la ville reconnue |
| Mon parcours | « Fin » sortait de la feuille sur iPhone ; « 2026 » seul à côté de « Fin » | Dates alignées ; la période ne s'affiche qu'avec un début |

## Ce qui reste, et pourquoi

- **La carte de l'entreprise** : missions, taille, à qui écrire, aide.
  C'est de l'information, rangée dans l'ordre qui aide à choisir.
- **Une ligne grise de source** sous la carte : la licence de l'annuaire
  demande de citer la source. Elle n'apparaît que si une source a parlé.
- **« Trouver sur LinkedIn »** et **« Offres d'alternance »** : ce sont
  les deux seuls endroits où l'on va justement quitter l'app.

## Ce que disent les sources

On a vérifié le lot auprès de trois références avant de le livrer.

- **Baymard Institute** (autocomplétion) recommande au plus 8
  propositions sur un téléphone, des lignes assez hautes et espacées pour
  le doigt, et une différence visible entre ce qu'on a tapé et ce qui est
  proposé. La liste du nom en montre 5, à 44 px chacune. Le nom est en
  gras, la ville et la taille en dessous.
- **GOV.UK**, avec son composant d'autocomplétion accessible : un lecteur
  d'écran entend combien de propositions sont arrivées. C'est ajouté
  (« 3 entreprises proposées »). Pour la même raison, les champs que le
  choix vient de remplir se disent (« Rempli : domaine, adresse »).
- **Nielsen Norman Group** (divulgation progressive) : on montre d'abord
  l'essentiel, le reste sur demande, derrière un repli bien visible.
  Ce qui est à l'écran dès l'ouverture dit ce qui compte. C'est le cas de
  « Plus » dans « Ajouter un contact », ouvert d'office quand il est
  rempli. Ce qui change sans qu'on regarde doit se voir, sinon on ne le
  remarque pas (CLAUDE.md §4, question ③). D'où le lavis bref sur les
  champs remplis.

## Ce qui part vers l'annuaire

Une seule chose change. Quand tu écris le nom d'une entreprise (dans la
capture ou dans « Modifier »), l'annuaire reçoit ce que tu as tapé dans ce
champ, plus le département de la ville si tu l'as écrite. Cela se produit
après une pause, à partir de trois lettres, et rien d'autre ne part. La
page de confidentialité le dit.

---

*Gardé par `e2e-enrichir.mjs`, `e2e-carte.mjs`, `e2e-decouvrir.mjs`,
`e2e-mesure.mjs` et `e2e-utile.mjs`. Chacun refuse le retour d'un geste
retiré.*
