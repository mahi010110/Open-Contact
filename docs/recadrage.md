# Le recadrage

**Ce document dit comment l'app passe de la 6.76 à la 7.0 sans rien
perdre en route.** Le pourquoi est dans les fiches de décision
([`decisions/`](decisions/README.md)) ; les règles d'interface restent dans
`CLAUDE.md`.

*Démarré le 19 octobre 2026. Point de départ : la version 6.76.0.*

---

## En trente secondes

- **Un recadrage, pas une nouvelle app.** Le nouveau pousse autour de
  l'ancien et prend sa place partie par partie (décision 0001).
- **Dix lots, un à la fois.** R0 pose les fondations sans rien changer à
  l'écran. R1 à R9 recadrent l'app dans l'ordre où la valeur arrive.
  Chaque lot a un temps maximal accordé, jamais prolongé.
- **Caché jusqu'à preuve.** Chaque lot arrive dans main derrière un
  drapeau. Le mainteneur et cinq testeurs l'allument par la ligne
  « Préversion » ; il ne devient visible pour tous qu'après le test
  (décision 0004).
- **Mesuré avant, mesuré après.** Six parcours, cinq étudiants, sur l'app
  actuelle d'abord ([`mesure/protocole.md`](mesure/protocole.md)). Chaque
  lot doit faire mieux sur les mêmes parcours.

## Ce qui ne bouge pas

| Garantie | Comment elle est tenue |
|---|---|
| Aucune donnée perdue | Aucune clé renommée ni supprimée (`CLAUDE.md` §10). Un format qui évolue reçoit une clé nouvelle et une lecture de l'ancienne (`CONTRAT.md`). Avant une migration, l'app propose une copie. |
| Le suivi de candidature | Statuts, prochaines actions, relances, « Sans nouvelles », historique : rien n'est retiré. Il devient plus fort (R2). |
| Sans compte, sur tes appareils | Local d'abord, aucune télémétrie, rien ne se charge du réseau au démarrage (invariants ① à ④). |
| Le design « Utilitaire 98 » | Les mêmes jetons, les mêmes polices, les mêmes règles (§4 à §7). |
| Ce qui marche continue de marcher | `?test` et la suite de bout en bout restent verts à chaque fusion ; un test qui change dit pourquoi dans le commit. |
| Les liens existants | Une adresse comme `#/echanger` mène toujours quelque part : à son nouvel emplacement (`engine/destinations.js`). |

## Le cycle d'un lot

1. **Proposition** : le problème, le temps accordé, la solution
   esquissée, les pièges, ce qui est hors champ. *Le mainteneur valide.*
2. **Maquette** : téléphone et ordinateur, clair et sombre, vraies données.
3. **Moteur et tests** : les fonctions pures d'abord, avec leurs tests et
   leurs mutations.
4. **Écrans**, derrière le drapeau du lot, sur les deux appareils.
5. **Porte qualité** : la liste de `CLAUDE.md` §9, plus celle d'en bas.
   Tout vert, captures regardées.
6. **Préversion** : fusion dans main, drapeau allumé chez le mainteneur et
   cinq testeurs, parcours joués.
7. **Décision** : ouvrir à tous, corriger, ou arrêter. *Le mainteneur
   tranche.*

## Ce qui bouge, fonction par fonction

| Fonction | Aujourd'hui | Après le recadrage | Lot |
|---|---|---|---|
| Suivre mes candidatures | Mes pistes | Pistes, avec tes chiffres en tête | R2 |
| À découvrir | Mes pistes › À découvrir | Pistes › À découvrir | — |
| La fiche d'une piste | fenêtre ; les contacts après les notes | les gens d'abord ; au poste, à droite de la liste | R1 |
| Mes amis | Mes pistes › Amis | Réseau › Mes amis | R1 |
| Conversations et groupes | Échanger | Réseau | R1 |
| Mes demandes en cours | Fiche › Contacts ; Amis | Fiche, et Réseau en tête | R1 |
| Donner des pistes | Échanger › Donner | Pistes › Choisir › Donner, et la fiche | R1 |
| Recevoir (QR, fichier, texte) | Échanger › Recevoir | + › Recevoir | R1 |
| Ajouter une piste | + | + › Une piste | R1 |
| Ajouter quelqu'un rencontré | Fiche › Ajouter un contact | + › Un contact, ou la fiche | R1 |
| Historique des échanges | Échanger › Historique | Réseau › Historique, en bas | R1 |
| Écrire à plusieurs | Mes pistes › Prospecter | Aujourd'hui › Écrire les N mails ; Pistes › Choisir › Écrire | R3 |
| Ma semaine | — | Aujourd'hui, en tête ; la revue le vendredi | R4 |
| Profil, copie, appareils, réglages | Moi | Moi, plus « Préversion » (R0) et « Je peux aider » (R7) | R0, R7 |
| Navigation au poste | onglets en haut | barre latérale, recherche Ctrl K | R1, R8 |

Cette table est un scénario automatique depuis R1
(`tests/e2e/e2e-ce-qui-bouge.mjs`) : il la lit ici même, joue chaque
ligne d'un lot livré depuis son onglet, en trois gestes au plus, au
téléphone et au poste, et rougit si une ligne n'a pas son parcours.
Les mots de la colonne « Après » sont ceux de l'écran.

## Les lots

Les temps sont des maximums accordés, pas des promesses de date.

### R0 · Fondations · 1 semaine · rien ne change à l'écran

- Les fiches de décision, ce plan, `CHANGELOG.md`, la feuille de route.
- Le registre des drapeaux de livraison, avec leurs dates de retrait, et
  le test qui refuse un drapeau périmé (`engine/drapeaux.js`).
- La ligne « Préversion » dans Réglages, et sa clé `oc_preversion_v1`.
- Le registre des destinations, prêt à rediriger les anciennes adresses
  (`engine/destinations.js`).
- Le protocole de la mesure de départ, prêt à être joué.
- *Accepté quand* : la suite est verte, la préversion s'allume et
  s'éteint sans effet visible (`e2e-preversion.mjs`), le protocole est
  écrit. *Retour arrière* : rien à défaire.

### R1 · Cohérence de la navigation · 3 semaines · drapeau `reseau`

- Téléphone : l'onglet Réseau remplace « Échanger » (demandes,
  conversations, amis, groupes, historique). Le + ouvre la feuille
  Ajouter : une piste, quelqu'un rencontré, puis Recevoir. Partager
  depuis Pistes et depuis la fiche. La fiche commence par les gens.
- Ordinateur : la barre latérale à la place des onglets du haut, la
  fiche à droite de la liste (décision 0003).
- Code : `index.html`, `app.js`, `ui/echanger.js` (devient Réseau),
  `ui/pistes.js`, `ui/amis.js`, `ui/capture.js` et `ui/recevoir.js`
  (réunis dans la feuille Ajouter), `ui/donner.js`, `ui/fiche.js`.
- Données : aucune clé ne change.
- *Accepté quand* : sur les six parcours, au moins 4 personnes sur 5
  réussissent seules, et le SEQ moyen dépasse celui de la mesure de
  départ. *Retour arrière* : éteindre le drapeau.
- **Où on en est**, en trois livraisons, toutes derrière le drapeau :
  - **R1-a, livré (6.79.0)** : l'onglet Réseau (mes demandes, la boîte,
    « Mes amis » avec sa recherche, l'historique) ; le + et sa feuille
    Ajouter (une piste, puis Recevoir : QR · Fichier · Texte) ; Pistes
    sans portée « Amis », « Choisir » puis « Donner ». Gardé par
    `e2e-reseau.mjs`, les deux chemins joués.
  - **R1-b, livré (6.80.0)** : la fiche commence par les gens (au poste,
    en colonne de gauche) ; « Donner » depuis la fiche ; « Un contact »
    depuis le +, entreprise facultative. Gardé par `e2e-reseau.mjs` ⑨ ⑩.
  - **R1-c, livré (6.81.0)** : au poste, la barre latérale à la place
    des onglets du haut (décision 0003). Gardé par `e2e-reseau.mjs` ⑪.
  - **R1-d, livré (6.82.0)** : au poste, « Liste · Tableau » ; en
    liste, la fiche posée à droite, ↑ ↓ d'une piste à l'autre, E écrit,
    le garde-fou d'une fiche en cours (décision 0003). Gardé par
    `e2e-reseau.mjs` ⑫.
  - **R1 est complet en préversion.** Reste sa porte : les six parcours
    joués avec cinq personnes (`docs/mesure/protocole.md`), puis la
    décision d'ouvrir le lot à tous.

### R2 · Un suivi qui se remplit seul · 2 semaines

*Proposition validée par le mainteneur le 20 octobre 2026 :*
[`propositions/R2-suivi.md`](propositions/R2-suivi.md).

Un mail envoyé passe la piste « En cours » et propose la relance à
7 jours (déjà tenu). Tes chiffres en une ligne en tête de Pistes :
écrites, réponses, décrochées. Le retour après 7 jours sans un geste :
trois choses à faire, sans compter les jours manqués. Aucune clé
nouvelle : tout se déduit des pistes et du journal.

- **Où on en est** : **livré en préversion (6.83.0)**, derrière le
  drapeau `suivi` (`engine/suivi.js`). Gardé par `e2e-reprendre.mjs`,
  les deux chemins joués, quatre mutations à l'appui.
- *Accepté quand* : sur le parcours « je reviens après une semaine »,
  au moins 4 personnes sur 5 font un premier geste depuis « Reprendre »
  sans aide (`docs/mesure/protocole.md`). *Retour arrière* : éteindre
  le drapeau.

### R3 · Prêts à partir · 2 semaines

*Proposition validée par le mainteneur le 20 octobre 2026 :*
[`propositions/R3-prets-a-partir.md`](propositions/R3-prets-a-partir.md).

- **Où on en est** : **R3 est complet en préversion (6.84.0)**, derrière
  le drapeau `prets`, en deux parties :
  - **R3-a** : « Écrire les N mails » au pied d'« Aujourd'hui » (au
    poste, à côté du titre), la série au téléphone, les brouillons
    gardés sur cet appareil (`oc_brouillons_v1`, `engine/prets.js`) ;
  - **R3-b** : au poste, une fenêtre en trois colonnes — la file, le
    mail, ce qui aide à l'écrire (décision 0003, `ui/serie.js`).
  Gardé par `e2e-prets.mjs`, la fuite d'abord.
- *Accepté quand* : sur le parcours « écris tes relances du jour », au
  moins 4 personnes sur 5 font partir la série sans aide. *Retour
  arrière* : éteindre le drapeau.

Les relances et les premiers mails préparés, relus et envoyés en série.
Au téléphone, un mail par écran ; au poste, la file, le mail et la fiche.
Une clé nouvelle pour les brouillons en cours, propre à l'appareil.

### R4 · Ma semaine · 2 semaines

*Proposition validée par le mainteneur le 20 octobre 2026 :*
[`propositions/R4-ma-semaine.md`](propositions/R4-ma-semaine.md).

- **Où on en est** : **livré en préversion (6.85.0)**, derrière le
  drapeau `semaine` (`engine/semaine.js`, `ui/semaine.js`) : la ligne en
  tête d'« Aujourd'hui », « Ma semaine » (− et +), la revue du vendredi
  et « Partager au groupe ». Gardé par `e2e-semaine.mjs`, la fuite
  d'abord. Aucune clé nouvelle : l'objectif vit dans le profil.
- *Accepté quand* : au bout de deux semaines de préversion, la majorité
  des testeurs a gardé l'objectif proposé ou l'a réglé, sans l'avoir
  vécu comme un reproche (question posée à la fin d'une séance).
  *Retour arrière* : éteindre le drapeau.

Des objectifs de gestes le lundi, la revue le vendredi, partagée au
groupe si tu veux. Le résumé ne porte que des nombres, jamais un nom
d'entreprise : un test de fuite le vérifie avant la fonctionnalité.

### R5 · Un seul « moi » · 3 semaines · le lot le plus délicat

*Proposition validée par le mainteneur le 20 octobre 2026, avec son
analyse des menaces :* [`propositions/R5-un-seul-moi.md`](propositions/R5-un-seul-moi.md).

Une identité et une phrase de secours qui ramènent appareils, amis et
groupes. Une analyse des menaces écrite avant le code ; les anciennes
clés intactes, lues au moins une version entière.

### R6 · Envoi direct · 2 semaines de code · selon la décision 0007

*Reporté par le mainteneur le 20 octobre 2026* (décision 0007) : la
vérification Google n'est pas lancée, le lien mail reste le chemin de
tout le monde. Le lot passe après les autres.

Le mail part de l'app, avec « Annuler » pendant 10 secondes. Le lien
mail reste le chemin de secours.

### R7 · Ceux qui aident · 3 semaines

*Proposition validée par le mainteneur le 20 octobre 2026 :*
[`propositions/R7-ceux-qui-aident.md`](propositions/R7-ceux-qui-aident.md).

- **Où on en est** : **livré en préversion (6.86.0)**, derrière le
  drapeau `aide` (`engine/aide.js`, `ui/aide.js`) : « Je peux aider »
  dans Moi, la feuille « Décroché », « Demander à Karim » et ce qu'il
  offre, « Le dire à Karim ». Le profil donné gagne un champ facultatif,
  `aide`, des mots d'une table. Gardé par `e2e-aide.mjs`, la fuite
  d'abord.
- *Accepté quand* : au bout de deux semaines de préversion, un testeur
  sur deux qui a décroché a coché au moins une case, et les demandes
  « 20 minutes » partent sans qu'on ait à expliquer à quoi elles servent.

« Je peux aider » dans Moi ; une piste close « Décroché » propose d'aider
à son tour ; les messages du café-conseil, de la présentation, du merci.
Un champ facultatif de plus dans le profil donné, testé contre la fuite
d'abord.

### R8 · Le clavier au poste · 1 semaine

Ctrl K cherche et fait tout. Une lettre par geste fréquent, écrite dans
le bouton qu'elle commande.

### R9 · Tous les métiers, et ton parcours exportable · 3 semaines

Le ROME 4.0 réduit à ce qui sert, embarqué hors ligne (décision 0005).
L'export de ton parcours dans un format standard.

## La porte qualité de chaque lot

La liste de `CLAUDE.md` §9 reste. S'y ajoutent :

| Domaine | Ce qui est vérifié | Référence |
|---|---|---|
| Utilisabilité | six parcours, cinq personnes ; 3 sur 5 au moins réussissent seules ; SEQ moyen d'au moins 6 sur 7 ; SUS au-dessus de 80 à la bascule | NN/g ; MeasuringU |
| Accessibilité | les gardes existants, plus un passage au lecteur d'écran (VoiceOver, TalkBack) sur chaque écran touché | WCAG 2.2 AA ; RGAA 4.1.2 |
| Performance | téléphone moyen simulé : affichage principal sous 2,5 s, réponse à un geste sous 200 ms, décalage sous 0,1 | Core Web Vitals |
| Sécurité | les exigences de base pour tout lot ; une analyse des menaces écrite pour R5 et R6 | OWASP ASVS 5.0, niveau 1 |
| Vie privée | tout champ qui voyage est testé contre la fuite avant la fonctionnalité | CNIL ; invariant ① |
| Compatibilité | captures WebKit (le moteur de l'iPhone) regardées pour chaque écran touché | `CLAUDE.md` §9 |
| Données | migrations jouées sur des données de versions anciennes ; aucune clé renommée | `CONTRAT.md` |
| Documentation | fiche de décision si besoin, `CLAUDE.md`, `CONTRAT.md`, `CHANGELOG.md`, version et service worker | Nygard ; Keep a Changelog |

## Les risques

| Risque | Gravité | Ce qui le contient |
|---|---|---|
| Perdre des données | haute | aucune clé renommée, élargir avant de resserrer, copie proposée avant toute migration, tests sur données anciennes |
| Les utilisateurs actuels ne retrouvent plus leurs gestes | moyenne | préversion d'abord, anciennes adresses redirigées, la table « Ce qui bouge » testée, une ligne « Nouveau » une seule fois |
| Le périmètre gonfle | moyenne | temps accordé par lot, sans prolongation |
| La vérification Google tarde ou échoue | moyenne | R6 ne bloque rien : le lien mail reste |
| L'identité unique ouvre une faille | haute | analyse des menaces avant le code, préversion longue, anciennes clés intactes |
| Un défaut n'existe que sur iPhone | moyenne | captures WebKit en CI, un vrai iPhone chez les testeurs |
| Un mainteneur seul | moyenne | un lot à la fois, tout écrit, pour qu'un autre puisse reprendre |

## Qui fait quoi

- **Le mainteneur** tranche les décisions, valide chaque proposition de
  lot, allume la préversion, recrute cinq étudiants par tour de test et
  ouvre ou non chaque lot à tous.
- **L'assistant** fait la recherche, les propositions, les maquettes,
  les fiches, le moteur, les écrans, les tests, les captures et la
  documentation, et prépare puis dépouille les tests utilisateurs.
- **Les testeurs** : cinq étudiants par tour, renouvelés en partie, une
  séance au téléphone et une à l'ordinateur, 30 minutes chacune. Rien
  n'est collecté par l'app : on observe et on note.

## Sources

Fowler, *Strangler Fig Application* et *Parallel Change* · Hodgson,
*Feature Toggles* · Nygard (2011), *Documenting Architecture Decisions* ·
Basecamp, *Shape Up* · GOV.UK Service Manual, les phases d'un service ·
beta.gouv.fr · W3C, *Design Tokens Format Module* · RGAA 4.1.2 · web.dev,
Core Web Vitals · OWASP ASVS 5.0 · CNIL, guide RGPD du développeur ·
MeasuringU (SEQ, SUS) · Nielsen, tester avec cinq personnes · Semantic
Versioning 2.0 · Keep a Changelog.
