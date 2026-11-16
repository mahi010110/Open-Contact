# Les principes de la nouvelle interface

**Dix règles, une page.** Elles valent pour tout écran refait
(`docs/refonte-plan.md`, étape 2). Chacune dit d'où elle vient : une
règle sans source se discute, une règle sourcée se rouvre avec une
source. Le socle de `CLAUDE.md` (§0, §2, §3, §4, §10) reste au-dessus.

*Écrites le 10 novembre 2026, reprises le 12 après la demande du
mainteneur — « que TOUT soit repensé avec les yeux d'un designer UX, sur
base de connaissance et de psychologie ; un PC et un tel n'ont pas les
mêmes contraintes » (fiches 0013, 0014, 0015).*

---

### 1. L'app dit quoi faire — la même chose partout

Une piste a **une prochaine étape**, la même sur « Aujourd'hui », sur sa
fiche, dans « Mes pistes » et dans la barre : un titre, et un geste
nommé qui la fait (`engine/etape.js`). L'écran ne laisse plus déduire le
geste de l'état de la piste.

*Pourquoi* : choisir à la place de l'utilisateur est le service rendu
(`CLAUDE.md` §6) ; un plan concret réduit l'écart entre l'intention et
l'action (Gollwitzer & Sheeran, 2006).

### 2. Un lecteur : la file, et une question à la fois

« Aujourd'hui » se lit comme un lecteur de musique. **La file** est une
liste (À faire, Bientôt, Fait aujourd'hui) ; la ligne choisie est en
navy. **La fenêtre « Maintenant »** est une boîte de dialogue 98 : la
piste, l'étape, ce qui s'est passé en dernier, et deux réponses — le
geste, **seul bouton rempli de l'écran**, ou « Plus tard ». Toucher une
ligne la charge dans la fenêtre ; la retoucher ouvre sa fiche.

*Pourquoi* : plus il y a de choix de même poids, plus on tarde à choisir
(Hick, 1952 ; Iyengar & Lepper, 2000) — trois boutons égaux ne disent
pas « fais ça ». Rempli > contourné > discret, une action remplie par
vue (Material 3). Un modèle que tout le monde connaît déjà (la liste de
lecture et son lecteur) ne s'apprend pas.

### 3. « Plus tard » est un plan, pas un abandon

« Plus tard » demande **quand** : une action datée se reporte, une
proposition prend une date et passe dans « Bientôt ». « Bientôt » dit
aussi le plan d'une piste qui attend — « Relancer si pas de réponse » —
et **une réponse qui arrive fait tomber la relance prévue**.

*Pourquoi* : un plan « si… alors » fait mieux qu'un rappel (Gollwitzer &
Sheeran, 2006 ; Abel et al., 2019 : les rappels n'ajoutent rien au
plan) ; pouvoir remettre sans se justifier garde la main à l'étudiant
(l'autonomie, Deci & Ryan).

### 4. L'app évolue avec la recherche

C'est la fenêtre qui change, pas l'écran. Sans cible, elle la demande
(une question, trois puces) ; sans piste, elle propose d'en trouver ;
rien à faire, elle le dit et montre ce qui vient ; un contrat décroché,
elle porte sa suite — la convention, le dépôt, les 45 premiers jours
(`engine/contrat.js`). Rien de ce qui ne sert pas à cette étape n'est à
l'écran.

*Pourquoi* : aucun outil relevé ne suit un étudiant de la cible au
contrat signé (`reports/Accompagner la recherche de stage.md`) ; ce qui
se fait une fois ne prend pas la place de ce qui se fait tous les jours
(`CLAUDE.md` §6) — la cible tient en une ligne sous le titre.

### 5. Une seule entrée : la barre

Chercher, ouvrir, ajouter, agir : tout passe par la même barre
(`engine/commande.js`, `ui/barre.js`). Elle **montre ce qu'elle a
compris** avant qu'on valide — « Entretien à 14 h », « Aztek · jeudi 19
novembre ». Une table, pas une IA : mieux vaut ne pas comprendre que mal
comprendre. Rien ne change sans un tap, et ce qui change s'annule ; ce
qui est **proposé** est en pointillé, ce qui est posé en plein.

*Pourquoi* : le retour immédiat sur ce qui est compris enseigne la
syntaxe (Fantastical ; Todoist). Le signe doit dire le geste (Norman) :
la barre est dessinée comme ce qu'on y fait — on y tape. Et le prix de
la nouveauté : The Browser Company a arrêté Arc, jugé trop nouveau à
apprendre — la barre vide dit ce qu'on peut y taper.

### 6. Ce que l'app fait seule, elle le dit

Une piste qui se tait depuis 45 jours se range seule
(`engine/rangement.js`). Elle n'est jamais supprimée, l'accueil
l'annonce sept jours, et « Annuler » la rend.

*Pourquoi* : Arc Search archive les onglets inactifs et garde une
archive consultable ; une boucle laissée ouverte occupe l'esprit
(Zeigarnik) — l'app la referme, et le dit (invariant ②).

### 7. Revenir ne coûte rien, et le silence n'est pas un verdict

Ni série, ni compteur, ni volume affiché comme un but. « Fait
aujourd'hui » montre les gestes du jour, cochés, sans les compter. Après
une semaine sans geste, la file s'appelle « Pour reprendre » et ne
compte plus les jours de retard. Une piste qui se tait le dit sans en
faire un jugement.

*Pourquoi* : une série qui casse fait décrocher (Silverman & Barasch,
2023) ; l'intensité de la recherche ne prédit pas la qualité du poste
(van Hooft et al., 2021) ; le bon engagement est celui qui suffit
(Yardley et al., 2016) ; le silence est le moment le plus dur
(`reports/Refonte navigation adaptative et usages.md`, §5).

### 8. Ce qui se lit est à plat, ce qui se fait a du relief

Une collection est **une liste 98 dans un seul cadre** — enfoncée,
blanche, un pointillé entre les lignes : la file, « Mes pistes », les
contacts d'une fiche. Le relief (la boîte, l'ombre dure, la barre de
titre) est gardé à ce qui se fait : la fenêtre « Maintenant », les
boutons. Dans « Mes pistes », au téléphone, la liste est groupée par
état — les colonnes du tableau du poste, empilées.

*Pourquoi* : sept cartes séparées font sept objets là où il y a une
liste ; une liste se balaie (NN/g, *The Anatomy of a List Entry*). Le
même classement sur les deux appareils : rien à réapprendre.

### 9. Deux dessins

**Au téléphone** (une main, entre deux cours) : la fenêtre
« Maintenant » est **ancrée en bas**, le geste sous le pouce et toujours
au même endroit ; la file défile au-dessus ; une ligne datée se glisse
(Fait, Reporter). En bas, trois places : mes pistes (la pile), **la
barre — un champ**, moi. Touché, le champ **reste en bas**, au-dessus du
clavier, et ce que la barre comprend se lit juste au-dessus. Le coin de
l'écran où l'on est ramène à « Aujourd'hui ».

**À l'ordinateur** (le poste de commandement) : une barre latérale (la
barre, les quatre lieux, « Nouvelle piste », la pile dépliée) ; la file
au centre, **en colonnes** ; la fenêtre « Maintenant » à droite,
**riche** — les contacts, les notes : on agit sans ouvrir une fiche. Le
clavier suffit (↑ ↓, Entrée, Ctrl K, « / »). La barre est une palette,
posée haut. La fiche tient deux colonnes : le suivi, le dossier.

*Pourquoi* : « le PC et le tel sont deux choses différentes » (le
mainteneur). La zone du pouce (Hoober, 2013 ; `CLAUDE.md` §5) ; un
champ qui saute à l'autre bout de l'écran quand on le touche rompt le
geste — Safari, la recherche d'iOS et Arc Search le gardent en bas. Une
barre latérale se justifie quand elle porte ce que l'utilisateur crée
(les onglets d'Arc, les conversations de ChatGPT ; ici, ses pistes).

### 10. Rien ne part sans geste

« Prépare la page » interroge l'annuaire sur le tap, avec les mots qu'on
vient de lire ; rien ne part pendant la frappe. Le clavier ne s'ouvre
pas tout seul au lancement.

*Pourquoi* : la vie privée est le socle (§10) ; Arc Search ouvrait le
clavier au lancement et a dû en faire un réglage.
