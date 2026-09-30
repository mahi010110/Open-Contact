# La barre de recherche — le concept

*Version de travail, 30 septembre 2026. Rien n'est encore construit : ce
document dit ce qu'on construit, pourquoi, et comment on saura que c'est
juste. Il se lit avec `CLAUDE.md` (§5 adaptatif, §6 motifs, §8 le lien
humain) et devient une règle de ce fichier au premier lot livré.*

---

## Le but, en une phrase

**Une seule barre répond à « où est-ce que je peux postuler, et par qui
passer ? »** Elle cherche dans tes pistes, dans celles de ton groupe et
dans l'annuaire public des entreprises, et elle comprend ce que tu tapes.

Pas un écran de plus : c'est la barre qui existe déjà en tête de « Mes
pistes » (`#piQ`), qui apprend à comprendre et à regarder plus loin.

## Ce qui existe, et ce qui manque

| Existe déjà | Manque |
|---|---|
| Accents pliés, chaque mot cherché pour lui-même (`filterCompanies`) | La barre **lit** des mots, elle ne les **comprend** pas : « alternance » cherche le texte « alternance » dans les champs, « Lille » aussi |
| « Pourquoi cette ligne ? » (`searchHint`) | Elle ne cherche que dans **mes** pistes : une liste vide reste vide |
| Affiner : familles, étiquettes retirables (`ui/affiner.js`) | Les étiquettes naissent d'une feuille, jamais de ce qu'on tape |
| Trier par proximité, par date… (`ui/sort.js`) | Aucune entreprise n'arrive de l'extérieur, sauf de la main d'un camarade |

---

## Sept principes

Chacun vient d'une source ou d'une règle de la maison, et chacun se garde
par un test (voir « Comment on saura »).

**1. Montrer ce qu'on a compris — et le rendre défaisable.**
C'est le cœur de ce que la recherche appelle la *compréhension de requête*
(Tunkelang : segmenter la phrase, reconnaître les entités, classer) : la
requête devient des **étiquettes**, une par chose comprise, retirables d'un
tap — la forme que Baymard recommande pour les filtres appliqués. Un moteur
qui interprète sans montrer son interprétation est une boîte noire : on ne
sait pas pourquoi un résultat manque. Ici, l'erreur se voit et se corrige
en un geste.

**2. Ce qu'on ne comprend pas reste du texte.** On n'interprète que le
vocabulaire **sans ambiguïté**. « Orange » est une entreprise ou une
couleur, jamais une ville : il reste texte libre. Mieux vaut ne pas
comprendre que mal comprendre — la même règle que `causeLiaison` (§8) :
se tromper coûte plus cher que ne pas savoir.

**3. Local d'abord, instantané, hors ligne.** Tes pistes et celles du
groupe répondent à chaque frappe, sans réseau (invariant ④).

**4. La recherche en ligne part toute seule, mais n'emporte que ce qui
décrit une entreprise** *(décision du mainteneur, 30 septembre 2026 : pas
de geste à faire)*. Elle part après une courte pause dans la frappe, jamais
hors ligne, et au rythme que l'annuaire accepte. Le risque que le geste
couvrait reste réel — la même barre sert à retrouver tes pistes, donc
parfois à taper le nom d'un contact —, il se règle autrement : **un mot
qui correspond à un de tes contacts, ou qui n'existe que dans ton suivi
privé (notes, historique), ne part jamais**. Partent les étiquettes
(métier, ville, taille) et les mots qui peuvent nommer une entreprise ;
jamais une piste, jamais un contact, jamais le profil. Une requête dont il
ne reste rien d'utile après ce tri ne part pas du tout.

**5. Une entreprise = une ligne, quelle que soit sa source.** Trouvée à la
fois dans tes pistes et dans l'annuaire, elle apparaît **une** fois, dans
tes pistes, avec ce que l'annuaire ajoute. Le lien entre sources est le
**SIREN** (9 chiffres, le même partout) ; à défaut, le nom plié et la ville.

**6. Le classement a une raison, et elle se lit sur la ligne** (§6,
« choisir à la place de l'utilisateur ») :

1. **quelqu'un du groupe peut te porter** (« Léa y a fait son stage ») —
   ~40 % d'entretiens contre ~3 %, aucun autre critère n'en approche ;
2. **tu peux écrire tout de suite** (une adresse connue) ;
3. **elle correspond à ce que tu cherches** (le profil dit stage,
   alternance ou emploi) ;
4. **elle est proche** (distance, si un lieu est compris ou connu) ;
5. **la fiche est la mieux remplie**.

La sous-ligne dit le premier critère qui départage, puis ville, taille,
secteur — elle s'élide par la fin, donc ce qui décide passe devant.

**7. Le vocabulaire est une table, pas une IA.** L'interprétation est une
fonction pure du moteur (`engine/`), nourrie par une table de mots : elle
se lit, se teste phrase par phrase et s'étend sans rien casser. L'IA est
reportée (§0) ; le jour où elle revient, elle remplit **la même structure**
d'étiquettes, et rien d'autre ne change.

---

## L'interprétation

Une requête se découpe en jetons ; chaque jeton trouve **une** famille, ou
reste texte.

| Famille | Ce qu'on tape | Ce que ça devient |
|---|---|---|
| **Ce que tu cherches** | stage · alternance, alternant, apprentissage · emploi, CDI, CDD | le type de recherche (`RECHERCHES`, `POSITIONS`) |
| **Métier** | dev, développeur, web, logiciel · réseau, système, infra, admin · cyber, sécurité, SOC, pentest · cloud, hébergement · support, helpdesk · data | un **domaine** local (`DOMAINS`) + des **codes d'activité** pour l'annuaire (62.01Z programmation, 62.02A conseil, 62.03Z gestion d'infrastructures, 62.09Z autres activités, 63.11Z hébergement) |
| **Lieu** | une ville, un code postal (5 chiffres), un département (2 chiffres) · « près de moi » | une commune, un département, ou la position du téléphone (sur permission) |
| **Taille** | petite, TPE · PME · grande | des tranches d'effectif |
| **Où j'en suis** (tes pistes seulement) | à contacter · en cours · réponse · sans nouvelles | le statut, ou le silence (`SILENCE_RELANCE`) |
| **Le groupe** | un prénom déclaré (`vecuQui`) · « recommandée » | les pistes qu'un camarade peut porter |
| **Texte** | tout le reste : un nom d'entreprise, une techno (« Fortinet ») | la recherche plein texte d'aujourd'hui |

Trois règles de lecture :

- **« cyber » n'a pas de code d'activité** : l'annuaire le range dans le
  conseil informatique. L'étiquette « cyber » élargit donc les codes ET
  garde le mot en texte, pour que les noms qui le portent (« Advens
  Cyber ») remontent en tête. C'est là que le croisement des sources
  rend le résultat juste : ton groupe et tes notes savent ce qu'une
  entreprise fait vraiment, le registre non.
- **Une ville se reconnaît sans réseau** par une courte table des
  communes où étudient les utilisateurs de l'app (les villes universitaires
  et leurs couronnes), et **avec réseau** par le service des communes de
  l'État. Hors table et hors ligne, elle reste texte — et le texte trouve
  déjà la ville dans tes pistes.
- **Le profil propose, il n'impose pas.** Si tu cherches une alternance, la
  barre vide propose « alternance · ta ville » comme première recherche ;
  une étiquette que tu n'as pas tapée est marquée comme proposée et part
  d'un tap.

---

## Les sources

| Source | Ce qu'elle apporte | Accès | Contrainte |
|---|---|---|---|
| **Tes pistes** | tout ton suivi | local | aucune |
| **Le groupe** | les pistes reçues, qui y est passé | local (déjà reçu) | invariant ① : rien de privé n'en vient |
| **Annuaire des entreprises (État)** | nom, adresse, activité, effectif, SIREN, établissements autour d'un point, dirigeant des petites structures | en ligne, gratuit, **sans clé ni compte** | 7 appels par seconde ; rayon de 50 km au plus ; **à vérifier depuis un navigateur** (voir plus bas) |
| **Wikidata** | le site web officiel, par le SIREN (propriété P1616) | en ligne, gratuit, sans clé | surtout les entreprises connues ; un manque n'est pas une erreur |
| **Liens d'un tap** (fiche) | anciens de ton école chez l'entreprise (LinkedIn) · offres en cours (France Travail) · fiche officielle (annuaire) | le navigateur les ouvre | l'app ne lit rien de ces sites : c'est toi qui regardes |

Deux précisions qui décident du dessin :

- **Le bon établissement, pas le siège.** Une grande entreprise a son siège
  à Paris et une agence à Lille : la recherche par lieu garde
  l'**établissement** trouvé près de toi (adresse, distance), jamais le
  siège. Sinon « Orange · Paris » répond à « alternance Lille ».
- **La position vient de l'annuaire.** Il rend des coordonnées : pas besoin
  de géocoder chaque résultat (OpenStreetMap limite à un appel par
  seconde, et l'app s'en sert déjà pour tes adresses).

**Ce qui reste à prouver avant le lot 2** : que l'annuaire et Wikidata
acceptent les appels venant directement d'un navigateur (en-têtes CORS).
L'environnement de développement bloque ces sites. La preuve se fait sur un
vrai navigateur (ton téléphone, une page de test), ou par un job de CI qui a
le réseau. Si une source refuse, elle devient un **lien**, et le concept
tient quand même : la barre locale et les liens ne dépendent d'aucune.

---

## L'écran

**Au pouce** — la barre reste collée en haut de « Mes pistes », comme
aujourd'hui (`collerEnHaut`).

```
[ alternance cyber Lille              ✕ ]
  alternance ✕   cyber ✕   Lille ✕

TES PISTES · 2
  Sopra Steria            Lille · en cours
  Wavestone               Lille · à contacter

À DÉCOUVRIR · 38                              ← arrive seul, après une pause
  ☐ Orange Cyberdefense   Léa y a fait son stage · 4 km
  ☐ Advens                2 km · 100-199 salariés
  …
                              [ Ajouter (3) ]  ← dans le pied, sous le pouce
```

**Au poste** — la même liste, dans la colonne, et le clavier :
« / » ouvre la barre, ↓ descend dans les résultats, Entrée ouvre la fiche
ou coche une ligne à découvrir, Échap vide. L'ajout reste un bouton dans le
pied de la zone. (Une touche s'annonce dans ce qu'elle commande, §5.)

**Tablette** — le dessin du poste, les tailles du doigt (§5 : la largeur
décide du dessin, la main de la taille).

**Les états, un par un** :

| État | Ce qu'on voit |
|---|---|
| Barre vide, focalisée | deux ou trois recherches proposées depuis le profil (« alternance · Lille ») |
| Frappe | les étiquettes se forment sous la barre, tes pistes se filtrent à chaque lettre |
| Aucune de tes pistes ne correspond | « À découvrir » passe en tête |
| Hors ligne | « À découvrir » dit « hors ligne » ; le local marche |
| L'annuaire ne répond pas | une phrase sous « À découvrir », dite avec des mots de tous les jours, et le local reste |
| Aucun résultat en ligne | une proposition d'élargir : retirer l'étiquette la plus étroite, ou agrandir le rayon |
| Ajout | l'aperçu habituel (combien de nouvelles, combien complétées), puis Annuler ~30 s |

Le texte d'invite du champ enseigne sans une phrase de plus : « Métier,
ville, entreprise… » au lieu de « Chercher… ». C'est le seul endroit où
l'on apprend au moment exact du geste, et il part dès qu'on tape (§7).

---

## Ce que le lot ne fait pas

- **Aucun mot privé envoyé** (principe 4), aucune requête gardée
  ailleurs, aucun historique de recherche envoyé nulle part.
- **Aucune personne importée d'office.** La fiche montre **toutes les
  informations utiles** de l'annuaire *(décision du mainteneur)* :
  dirigeant, effectif, date de création, activité, adresse de
  l'établissement proche, site web. Le dirigeant (public, et souvent celui
  qui décide dans une petite entreprise) ne devient un **contact** que si
  tu l'ajoutes, et il ne voyage dans un partage que dans ce cas.
- **Aucune aspiration** de LinkedIn ni d'un autre site : des liens, pas des
  copies. (La CNIL a sanctionné en 2024 la collecte de coordonnées depuis
  LinkedIn contre la volonté des personnes.)
- **Aucun réglage.** Pas de choix de sources, pas de curseur de rayon dans
  un écran d'options : le rayon s'élargit par une proposition quand il ne
  trouve rien (§8 : chaque option est une décision que le concepteur n'a
  pas prise).

---

## Comment on saura que c'est juste

**Le moteur** (`tests.js`, `?test`) :

- une table d'au moins cent phrases réelles → leurs étiquettes attendues ;
- **aucun mot perdu** : chaque jeton finit dans une famille ou en texte,
  jamais nulle part ;
- l'ambiguïté reste texte : « Orange » reste un mot, « Lyon » devient une
  ville, « 59 » un département et « 59000 » un code postal ;
- le classement rend sa **raison** avec son rang.

**Les scénarios** (e2e) :

- **aucun mot privé ne sort** — requêtes interceptées et lues : taper le
  nom d'un contact, un mot de ses notes, n'envoie jamais ce mot ; une
  requête vidée par le tri ne part pas ;
- le local marche hors ligne, « À découvrir » le dit ;
- une entreprise présente des deux côtés n'apparaît qu'une fois ;
- ajouter passe par l'aperçu et se défait ;
- pouce, poste, tablette : tailles de la main, barre collante, clavier ;
- chaque garde se prouve par une mutation (un nom de contact qui part,
  un doublon, une étiquette qui avale un mot).

---

## Les lots

Chacun se livre dans main et se teste sur le téléphone.

1. **L'interpréteur et les étiquettes**, sur tes pistes et celles du
   groupe. Rien en ligne. Le gain se voit tout de suite : « alternance
   Lille » filtre par ce que ça veut dire, pas par des lettres.
2. **« À découvrir »** : la recherche en ligne qui part seule (avec le
   tri des mots privés), la liste à cocher, l'aperçu, le SIREN (un champ
   de plus dans `CONTRAT.md`, lu en migration douce). Précédé de la preuve
   CORS.
3. **L'enrichissement et les liens** : site web (Wikidata), distance,
   toutes les informations utiles sur la fiche, les trois liens d'un tap.

## Avec le réseau

Le réseau ([`reseau.md`](reseau.md)) s'appuie sur cette barre sans rien
changer à ses lots, qui passent d'abord :

- **La barre mène à la piste d'où part une demande** (« Quelqu'un chez
  Aztek ? »), y compris pour une entreprise trouvée dans « À découvrir »,
  qu'on ajoute d'abord.
- **Le premier critère du classement s'élargit.** Aujourd'hui, c'est
  « quelqu'un du groupe peut te porter » (« Léa y a fait son stage »).
  Avec les amis (lot 2 du réseau), le parcours d'un ami compte pareil
  (« Karim y est en alternance »), et il se lit tout de suite, hors ligne.
  La famille « Le groupe » de l'interprétation reconnaît alors aussi le
  prénom d'un ami.
- **Le principe 4 vaut pour le réseau aussi** : d'une recherche, une
  demande ne dit que le nom de l'entreprise, jamais un mot privé.

## Décisions du mainteneur (30 septembre 2026)

1. **Pas de geste** avant la recherche en ligne : elle part seule. Le
   principe 4 garde la protection autrement — aucun mot privé ne sort.
2. La section en ligne s'appelle **« À découvrir »**.
3. La fiche montre **toutes les informations utiles** de l'annuaire, le
   dirigeant compris.

---

*Sources : D. Tunkelang, travaux sur la compréhension de requête
(segmentation, reconnaissance d'entités, classement de la requête) ;
Baymard Institute, études sur l'autocomplétion et les filtres appliqués ;
API Recherche d'entreprises (data.gouv.fr, dépôt `search-api`) ; CNIL,
sanction KASPR du 5 décembre 2024 ; WAI-ARIA APG, motif combobox.*
