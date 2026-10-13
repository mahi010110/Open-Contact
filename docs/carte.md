# La carte d'une entreprise — les sources mêlées, sans lien à toucher

*5 octobre 2026. Demande du mainteneur, après les lots A et B de
[`presentation-recherche.md`](presentation-recherche.md) : « ce qui serait
encore mieux, c'est que les infos soient affichées d'une belle façon sans
devoir appuyer sur un lien », et « ce qui est important est de mixer les
sources afin de donner les meilleures infos, les plus utiles ». Puis :
« pousse au maximum l'optimisation de l'UX, surtout sur smartphone ».*

---

## Ce que chaque source peut dire, mesuré

`tests/e2e/sonde-carte.mjs`, en CI, depuis une vraie page. L'échantillon :
37 entreprises réelles du numérique, dans le Nord et le Rhône, de 10 à
499 salariés et quelques grands groupes.

| Source | Répond à une page, sans clé | Chez combien | Ce qu'elle apporte |
|---|---|---|---|
| **Annuaire des entreprises** | ✓ | 37 / 37 | chiffre d'affaires (30 / 37, presque toujours **une** année ; un « 0 » marque des comptes confidentiels), dirigeants (25 / 37), plusieurs sites (31 / 37), convention collective (33 / 37, Syntec pour 26) |
| **BODACC** | ✓ 1,2 s | 23 / 24 | les annonces légales : dépôts des comptes, modifications, ventes, et les **procédures collectives** (2 sur 24) |
| **Wikidata** (par le SIREN) | ✓ 0,3 s | 8 / 37 | une description, le site, le logo (4), la page LinkedIn (3), la maison mère (2), l'article Wikipédia (5) |
| **Wikipédia** (résumé) | ✓ 50 ms | 5 / 37 | une phrase qui dit ce que fait l'entreprise — 5 résumés sur 5 le disent dans leur première phrase |
| **OpenStreetMap** (Overpass) | ✓, mais 504 et 429 | 0 / 11 | rien : écartée |
| **Index égalité F/H** (data.gouv) | ✓ | — | seulement par département et secteur, pas par entreprise : écarté |

**Ce que la mesure tranche.** L'annuaire porte la carte : il répond
toujours, pour l'entité juridique qu'on regarde. Le BODACC dit la seule
chose qui change la décision d'écrire. Wikidata et Wikipédia complètent
les grandes entreprises, celles dont un étudiant connaît déjà le nom.
Ils ne portent jamais la carte.

## Mêler : une valeur par fait

La carte ne montre jamais deux valeurs pour le même fait (« 100-199
salariés · 1 000 selon Wikidata »). Chaque fait a sa meilleure source :

| Le fait | D'abord | Sinon |
|---|---|---|
| ce qu'elle fait | **ta phrase** (« En bref ») | Wikipédia (première phrase, sans parenthèses), puis Wikidata ; le libellé d'activité seulement sans missions connues |
| ses missions | le code d'activité, traduit en mots d'étudiant (`TRAVAIL`) | — |
| la taille | l'annuaire (l'entité, pas le groupe) | — |
| à qui écrire | le dirigeant qui est une personne (PME), sinon le recrutement | — |
| son groupe | Wikidata | — |
| le site | la fiche | Wikidata |
| ce qui réclame quelque chose | fermée (l'annuaire) | une procédure collective de moins de trois ans, non close (le BODACC) |

La ligne de source ne cite **que** les sources qui ont dit quelque chose
sur cette carte. Une source muette ne se dit pas : elles ne connaissent
qu'une entreprise sur cinq, et un manque n'est pas une erreur.

**Ce qui est laissé de côté, exprès.** La convention collective, les
labels (Qualiopi, organisme de formation), le bilan carbone : relevés
par la sonde, présents chez beaucoup, mais ils ne départagent rien pour
un étudiant. Choisir à sa place est le service rendu (§6).

## Le dessin

La même carte dans l'aperçu de « À découvrir » et dans « À savoir ».
*Revue le 6 octobre* ([`utile.md`](utile.md)) : le chiffre d'affaires, la
création et le nombre de sites ne départageaient rien pour un étudiant ;
trois lignes qui aident à choisir les remplacent.

```
[logo] Sopra Steria est une entreprise de services du numérique
       française et une société de conseil en transformation…
MISSIONS     Conseil et intégration informatique  ✓ colle à ta formation
TAILLE       10 000 salariés et plus
COMPTES      5,8 Md€ de chiffre d'affaires en 2024, bénéficiaire
RÉCEMMENT    changement de direction (août 2026) · fusion (avril 2025)
ÉGALITÉ F-H  91/100 en 2024
ÉCRIRE À     Son service recrutement  LinkedIn ↗
Sources : Annuaire des entreprises · BODACC · Egapro · Wikipédia · Wikidata
```

*Revue le 13 octobre* (retour du mainteneur : « "À découvrir" est encore
trop gadget — plus d'infos sur elle » ; choisis : sa santé et sa taille,
ce qu'elle fait vraiment, qui contacter, ses offres). Trois lignes
s'ajoutent, chacune mesurée avant d'être écrite (`sonde-utilite.mjs`,
`sonde-essentiel.mjs`) et chacune muette quand elle n'a rien de sûr :

- **Comptes** — le chiffre d'affaires de l'année la plus récente, en mots
  (« 84 M€ »), et ce qu'il dit : *bénéficiaire* ou *en perte* (46
  entreprises sur 50 ont des comptes publiés, une seule année chacune).
  Le chiffre d'affaires seul était parti le 6 octobre parce qu'il ne
  départageait rien ; à côté de son résultat, il dit la santé. Un
  chiffre nul ne se dit pas, des comptes de plus de trois ans non plus.
- **Récemment** — ce qui a bougé en deux ans au BODACC (22 entreprises
  sur 30) : un établissement ouvert, une activité rachetée, une fusion,
  une direction qui change (peut-être une autre personne à qui écrire),
  un siège déménagé. Les règles sont prudentes : une vente n'est un
  rachat que si l'entreprise n'est pas l'ancien propriétaire ; « le
  capital » et « l'activité » ne se disent pas. Deux au plus, en mois.
- **Égalité** (« 91/100 à l'index femmes-hommes en 2024 ») — la note de l'index égalité (Egapro), demandée
  seulement quand l'annuaire dit l'entreprise déclarée (50 salariés et
  plus), par le SIREN seul ; une forme de réponse qu'on ne reconnaît pas
  ne dit rien.

- **Aucun bouton.** On lit la carte, on ne la manipule pas. Le seul lien
  mène à la personne ; les autres (offres, page LinkedIn, fiche officielle)
  viennent après.
- **Toujours le même ordre**, pour que deux cartes se comparent d'un coup
  d'œil : missions, taille, à qui écrire.
- **Le logo** sur un carreau clair dans les deux thèmes. Un logo sombre
  sur fond transparent disparaît sur l'anthracite.
- **L'alerte en ligne**, à côté du lieu ou du nom : une marque, pas un
  bandeau. Quand le BODACC répond après le reste, rien ne glisse sous le
  doigt.

**Dans la fiche**, « À savoir » est ouvert d'office, au pouce comme au
poste : la carte se voit sans rien toucher. « En bref » devient la phrase
de la carte.

**Au moment d'écrire**, le composeur reçoit ce que fait l'entreprise et
sa taille quand la fiche n'a pas d'« En bref ». « Une équipe de 150 » ne
s'écrit pas comme « un groupe de 50 000 ». Sans email, il nomme à qui
écrire, avec la recherche qui trouve la personne.

## Ce qui part, et quand

- Wikidata, le BODACC et Egapro reçoivent **le SIREN**, neuf chiffres
  publics — Egapro seulement quand l'annuaire dit l'index déclaré.
- Wikipédia reçoit **le titre de l'article** que Wikidata a donné.
- Wikimedia Commons reçoit le nom du logo, **sans référent**.
- Seulement pour l'entreprise qu'on **regarde** (l'aperçu ouvert, la
  fiche ouverte), une fois par session. Rien au démarrage, rien pendant
  la frappe. Au poste, l'aperçu suit le clavier : il attend que la ligne
  soit posée (350 ms) avant de questionner, et ↓ ↓ ↓ ne lance pas trois
  questions.
- Hors ligne, rien ne part : la carte montre ce que l'annuaire a dit.

## Au téléphone : taper derrière un clavier

Mesuré pendant le même lot, clavier ouvert : le premier résultat de « Mes
pistes » commençait à 286 px du haut. On voyait **deux** résultats sur un
390 × 844 et **aucun** sur un 360 × 640.

La réponse est le motif de recherche d'iOS (`UISearchController`) :
pendant la saisie, la barre de navigation et le grand titre s'effacent,
et la barre de recherche prend le haut. Quand le doigt touche le champ,
c'est-à-dire quand un clavier s'ouvre à l'écran :

- la vue défile jusqu'à la barre, et le titre sort par le haut ;
- l'en-tête de l'app s'efface au rythme du clavier ;
- la barre prend son décor de barre collée, qui couvre la bande où le
  titre aurait dépassé ;
- une liste courte reçoit un plancher de hauteur le temps de la frappe ;
- clavier rangé, tout revient.

Le déclencheur est le **tap**, pas le focus. Un focus venu d'un clavier
physique ou du code (« / », le retour d'une feuille) n'a pas de clavier à
contourner, et un écran qui bouge sous un anneau de focus le rend
illisible : `e2e-focus.mjs` l'a vu à la première version.

Résultat : **4 résultats entiers** au-dessus du clavier en 390 × 844, et
**2** en 360 × 640. Les bandes qui restent sont la barre, les étiquettes
et les onglets, chacune à la hauteur minimale du doigt (44 px). Gratter
leurs marges ferait gagner un tiers de ligne.

## Les gardes

- `e2e-carte.mjs` : chaque requête lue, une valeur par fait, l'alerte en
  ligne sans glissement, la fiche ouverte au pouce, hors ligne, 320 px à
  200 %, le carreau du logo en sombre, ↓ ↓ ↓ au poste, le composeur. Deux
  mutations à l'appui.
- `e2e-clavier.mjs` : les résultats au-dessus du clavier, aux deux tailles
  de téléphone ; rien sous la barre collée, l'en-tête qui revient, et
  rien qui bouge au poste.
- `e2e-decouvrir.mjs` et `e2e-enrichir.mjs` lisent aussi les nouvelles
  sources, sous la même règle : rien de privé.

---

*Sources : Apple, `UISearchController` (`hidesNavigationBarDuringPresentation`)
et Human Interface Guidelines, champs de recherche ; Welcome to the Jungle,
guide de la page entreprise (« comprendre qui vous êtes en trois
secondes ») ; Apec et Planète Grandes Écoles, critères de choix d'une
entreprise d'accueil ; mesures du 5 octobre 2026, `sonde-carte.mjs`.*
