# Les principes de la nouvelle interface

**Dix règles, une page.** Elles valent pour tout écran refait
(`docs/refonte-plan.md`, étape 2). Chacune dit d'où elle vient : une
règle sans source se discute, une règle sourcée se rouvre avec une
source. Le socle de `CLAUDE.md` (§0, §2, §3, §4, §10) reste au-dessus.

*Écrites le 10 novembre 2026, avec la refonte (fiches 0013, 0014, 0015).*

---

### 1. L'app dit quoi faire

Une piste a **une prochaine étape**, la même partout : un titre, et un
seul bouton, nommé, qui la fait (`engine/etape.js`). L'écran ne laisse
plus déduire le geste de l'état de la piste.

*Pourquoi* : choisir à la place de l'utilisateur est le service rendu
(`CLAUDE.md` §6) ; un plan concret réduit l'écart entre l'intention et
l'action (Gollwitzer & Sheeran, 2006).

### 2. Une seule emphase par écran

Le seul bouton rempli est la réponse à la question de l'écran : la
première ligne d'« Aujourd'hui », le pied d'une fiche, la première ligne
de la barre. Tout le reste est une boîte 98 claire.

*Pourquoi* : rempli > contourné > discret, une action remplie par vue
(Material 3 ; `CLAUDE.md` §6).

### 3. Une seule entrée : la barre

Chercher, ouvrir, ajouter, agir : tout passe par la même barre
(`engine/commande.js`, `ui/barre.js`). Elle **montre ce qu'elle a
compris** avant qu'on valide, en clair — « Entretien à 14 h », « Aztek ·
jeudi 12 novembre » — et la première ligne est la réponse.

*Pourquoi* : le retour immédiat sur ce qui est compris enseigne la
syntaxe (les commentaires sur Fantastical ; Todoist surligne la date
pendant la frappe). Une table, pas une IA : mieux vaut ne pas comprendre
que mal comprendre.

### 4. La barre propose, le doigt décide

Rien ne change sans un tap, et ce qui change s'annule (~30 s). Ce qui
est **proposé** est en pointillé (les phrases à essayer, une piste
devinée malgré une faute) ; ce qui est posé, en plein.

*Pourquoi* : l'invariant ② ; et le prix de la nouveauté — The Browser
Company a arrêté Arc en 2025, jugé trop nouveau à apprendre : la barre
vide dit ce qu'on peut y taper au lieu de le laisser deviner.

### 5. Ce que l'app fait seule, elle le dit

Une piste qui se tait depuis 45 jours se range seule
(`engine/rangement.js`). Elle n'est jamais supprimée, l'accueil
l'annonce sept jours, et « Annuler » la rend.

*Pourquoi* : Arc Search archive les onglets inactifs (un jour par
défaut) et garde une archive consultable ; passé 45 jours, relancer ne
paie plus (`CLAUDE.md` §6, « Le silence n'est pas une dette »).

### 6. Le plan est contingent, le silence a une sortie

« Bientôt » dit aussi le plan d'une piste qui attend : « Relancer si pas
de réponse », au jour où la relance viendra. Une réponse qui arrive fait
tomber la relance prévue. Une piste qui se tait le dit sans en faire un
verdict.

*Pourquoi* : un plan « si… alors » fait mieux qu'un rappel (Gollwitzer &
Sheeran, 2006 ; Abel et al., 2019 : les rappels n'ajoutent rien au
plan) ; le silence est le moment le plus dur de la recherche
(`reports/Refonte navigation adaptative et usages.md`, §5).

### 7. Revenir ne coûte rien

Ni série, ni compteur, ni volume affiché comme un but. Après une semaine
sans geste, la file s'appelle « Pour reprendre », tient en trois lignes
et ne compte plus les jours de retard.

*Pourquoi* : une série qui casse fait décrocher (Silverman & Barasch,
2023) ; l'intensité de la recherche ne prédit pas la qualité du poste
(van Hooft et al., 2021) ; le bon engagement est celui qui suffit
(Yardley et al., 2016).

### 8. Du début à la fin

La cible ouvre l'écran (ce que je cherche, où, pour quand). « Décroché »
n'est pas la fin : la suite va jusqu'au contrat qui tient — la
convention avant le premier jour, le dépôt sous cinq jours ouvrables,
les 45 premiers jours (`engine/contrat.js`).

*Pourquoi* : aucun outil relevé ne suit un étudiant de la cible au
contrat signé (`reports/Accompagner la recherche de stage.md`).

### 9. Deux dessins

**Au téléphone**, trois places en bas : mes pistes (la dernière ouverte
posée sur la pile), le +, moi. Le coin de l'écran où l'on est ramène à
« Aujourd'hui ». **À l'ordinateur**, une barre latérale qui porte les
lieux et la pile dépliée, une palette (Ctrl K, « / »), et deux zones :
le travail, le contexte.

*Pourquoi* : « le PC et le tel sont deux choses différentes » (le
mainteneur, 9 novembre 2026). Une barre latérale se justifie quand elle
porte ce que l'utilisateur crée — les pages de Notion, les onglets
d'Arc, les conversations de ChatGPT ; ici, ses pistes.

### 10. Rien ne part sans geste

« Prépare la page » interroge l'annuaire sur le tap, avec les mots qu'on
vient de lire ; rien ne part pendant la frappe. Le clavier ne s'ouvre
pas tout seul au lancement.

*Pourquoi* : la vie privée est le socle (§10) ; Arc Search ouvrait le
clavier au lancement et a dû en faire un réglage.
