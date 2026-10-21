# Proposition R9 — Tous les métiers, et ton parcours exportable

**Statut** : proposée et validée le 20 octobre 2026. Le mainteneur a
laissé les choix à l'assistant (« tu as l'entière main sur tout, je te
fais confiance pour faire les bons choix ») : les trois réponses, en fin
de page, sont celles de l'assistant, et elles tranchent aussi la
décision 0005.

**Livré en préversion** : R9-a en 6.88.0 (drapeau `export`), R9-b en
6.89.0 (drapeau `metiers`). L'ouverture à tous attend le critère
d'acceptation de `docs/recadrage.md`.

## Le problème

R9 réunit deux choses qui n'ont pas le même poids.

1. **Ton parcours ne sort pas de l'app.** « Mon parcours » (profil) tient
   tes stages, tes alternances, tes emplois, et la ligne « Expérience »
   du mail s'en sert. Mais pour ton CV, ta page LinkedIn ou un site de
   CV, tu le retapes à la main. Une donnée qui peut se déduire ne se
   saisit pas (§8, règle 2) ; une donnée déjà saisie ne se resaisit pas
   non plus.
2. **L'app ne comprend que l'informatique.** La barre de recherche, les
   codes d'activité envoyés à l'annuaire, les liens d'offres (La bonne
   alternance, HelloWork), la carte de l'entreprise (« ce que tu y
   ferais ») et le métier lu dans ta formation sont écrits pour le
   BTS SIO, le BUT informatique et la cyber. Un étudiant en BTS MCO ou
   en CAP cuisine tape « vendeur Lille » : la barre ne comprend pas le
   métier, et sans métier l'app cherche… dans le numérique
   (`NAF_NUMERIQUE`). Elle se trompe pour lui, sans le dire.

## Ce qui existe déjà

- **Le parcours** : `engine/parcours.js` — l'entreprise, stage,
  alternance ou emploi, les dates au mois ; ce que tu as déclaré sur tes
  pistes s'y ajoute tout seul (`parcoursDe`).
- **Le profil** : nom, formation, école, ville, e-mail, téléphone.
- **Les tables de métier**, toutes écrites à la main et toutes IT :
  - `METIER` (`engine/requete.js`) : 13 entrées, dont 6 métiers de
    l'informatique et 7 secteurs, chacune avec ses mots et ses racines ;
    cent phrases de `tests.js` les tiennent ;
  - `NAF_METIER`, `NAF_NUMERIQUE`, `SECTION_METIER`
    (`engine/annuaire.js`) : du métier aux codes d'activité de
    l'annuaire ;
  - `ROMES` (`engine/annuaire.js`) : du métier aux codes ROME, pour
    La bonne alternance, qui les prend déjà ;
  - `TRAVAIL` (`engine/annuaire.js`) : du code d'activité aux missions,
    en mots simples, sur la carte ;
  - le métier lu dans la formation (`metierDuProfil`,
    `engine/requete.js`) : « SISR », « SLAM », « cyber ».
- **Le ROME 4.0** : le répertoire des métiers de France Travail, en
  données ouvertes sur data.gouv.fr, mis à jour au moins deux fois par
  an. Chaque métier a un code (une lettre, quatre chiffres) et des
  appellations, c'est-à-dire les noms qu'on lui donne.
- **Le RNCP** : les certifications (BTS, BUT, CAP…) de France
  Compétences, en données ouvertes. Une fiche RNCP peut porter les codes
  ROME les plus proches : c'est le lien entre « ta formation » et « tes
  métiers ». Il reste à **mesurer** si l'export ouvert porte ces codes,
  et pour combien de diplômes.

## Le temps accordé

Trois semaines au plus, comme le plan. Deux drapeaux de livraison datés,
un par moitié, en préversion d'abord.

## La solution esquissée

### ① Ton parcours, en un fichier (une semaine)

Dans « Mon parcours », un geste : **Exporter**. Il produit un fichier
**JSON Resume** (`opencontact-parcours.json`), le format ouvert de CV le
plus repris. Reactive Resume, un éditeur de CV libre, l'importe tel
quel. Le fichier part comme la copie : la feuille de partage au doigt,
le téléchargement au poste (`ui/fichier.js`).

Ce que le fichier contient — ce que tu as écrit dans ton profil, rien
d'autre :

- `basics` : ton nom, ton e-mail, ton téléphone, ta ville ;
- `education` : ta formation et ton école ;
- `work` : ton parcours — l'entreprise, « Stage », « Alternance » ou
  « Emploi », les mois de début et de fin.

Jamais une piste, une note, un contact, un ami. Le fichier se lit avant
de partir : la feuille montre ce qu'il contient, ligne par ligne,
comme « Mon QR » montre ce qu'il donne.

### ② Tous les métiers (deux semaines, après une mesure)

**D'abord une sonde en CI**, comme pour chaque source : elle télécharge
le ROME 4.0 et l'export RNCP, et relève le format, la licence, le
nombre de métiers et d'appellations, la taille une fois réduite à ce
qui sert, et la part des diplômes courants (BTS, BUT, CAP, bac pro) qui
portent des codes ROME. Elle compte aussi les appellations qui
heurteraient la barre : un nom d'entreprise, une ville, un mot qui ne
désigne pas un métier. Rien ne se code avant ce relevé.

**Puis, si la mesure le permet**, derrière un drapeau `metiers` :

- une table `engine/metiers.js`, réduite à ce qui sert — le code, le
  nom du métier, son grand domaine, ses appellations — embarquée hors
  ligne (invariant ④), produite par un script à partir du fichier
  ouvert, jamais à la main ;
- **la barre** reconnaît une appellation **entière** (« aide-soignant »,
  « vendeur en boulangerie »), jamais un bout de mot. La règle ① de la
  barre tient : mieux vaut ne pas comprendre que mal comprendre ;
- **la formation** dit ses métiers par le RNCP (« BTS MCO » →
  ses codes ROME), là où `metierDuProfil` ne sait lire que l'informatique ;
- **les liens d'offres** prennent le code ROME du métier compris
  (La bonne alternance le prend déjà) ;
- **l'annuaire** reçoit la section d'activité du grand domaine du métier
  (commerce, santé, BTP…). Les tables IT d'aujourd'hui restent : elles
  sont plus fines pour l'informatique, et c'est le public des testeurs.

## Les pièges

- **Une table de 10 000 noms comprend trop.** « Conseil », « vente »,
  « accueil » sont des appellations et des mots de tous les jours. La
  sonde les compte ; la barre ne prend que l'appellation entière et
  passe les cent phrases de `tests.js` sans en changer une.
- **Le poids au démarrage.** La table est précachée (`sw.js`), donc
  téléchargée une fois. Elle n'entre que si la sonde la mesure petite ;
  sinon elle se charge à la première recherche qui en a besoin, jamais
  au démarrage.
- **Le ROME n'a pas les codes d'activité.** Aucune table officielle ne
  relie un métier à des codes NAF. Le grand domaine vers une section du
  registre est une table de quatorze lignes, écrite à la main et
  mesurée dans l'annuaire ; une ligne qui ne rend rien de juste se tait.
- **Un public qu'aucun testeur ne représente.** Les premiers testeurs
  sont en BTS SIO. Une ouverture à tous les métiers ne peut être
  éprouvée que par quelqu'un d'une autre formation : il en faut au
  moins un avant d'ouvrir le lot.
- **Le fichier exporté sort de l'app.** C'est ton fichier, comme la
  copie ; il ne contient que ce que la feuille montre avant le geste.

## Hors champ

- Importer un CV (JSON Resume, LinkedIn) dans le parcours.
- Europass : son format XML est lourd et son éditeur ne le relit plus
  directement. JSON Resume suffit.
- Les fiches métier détaillées du ROME (compétences, conditions
  d'exercice) : la barre et la carte n'en ont pas besoin.
- Revoir `TRAVAIL` (les missions de la carte) pour tous les métiers.

## Les questions au mainteneur

1. **La décision 0005 : quand ouvrir à tous les métiers ?** Je
   recommande de faire la sonde maintenant et d'ouvrir après la bêta,
   quand un testeur d'une autre formation existe : aujourd'hui, personne
   ne pourrait dire si l'app comprend bien « aide-soignant ». L'autre
   choix : ouvrir en R9, comme prévu, derrière son drapeau.
2. **Le format du parcours exporté.** Je recommande JSON Resume (ouvert,
   relu par des éditeurs de CV). L'autre choix : du texte à copier,
   pour coller dans un CV ou sur LinkedIn.
3. **Ce que contient le fichier.** Je recommande le profil et le
   parcours (nom, e-mail, téléphone, ville, formation, école,
   expériences). L'autre choix : le parcours seul, sans coordonnées.

**Les réponses (20 octobre 2026, par délégation)** :

1. R9 se code **maintenant**, derrière deux drapeaux, `export` puis
   `metiers` ; la sonde passe avant tout code de R9-b. L'**ouverture à
   tous** de R9-b attend qu'un testeur d'une autre formation que
   l'informatique l'ait jouée : c'est le critère d'acceptation du lot.
   La décision 0005 est acceptée sous cette forme.
2. **JSON Resume.** Un éditeur de CV libre le relit tel quel ; un texte
   à coller ne se relit nulle part.
3. **Le profil et le parcours** : un CV sans nom ni moyen de te joindre
   ne sert à rien. Le lien de ton CV n'en fait pas partie (c'est un
   autre CV) ; ton lien LinkedIn ou ton portfolio, si.

---

*Sources : France Travail, « Répertoire Opérationnel des Métiers et des
Emplois (ROME) », data.gouv.fr ; France Compétences, « Répertoire
national des certifications professionnelles et répertoire spécifique »,
data.gouv.fr ; JSON Resume, schéma `resume-schema` ; Reactive Resume,
« Importing resumes » (docs.rxresu.me).*
