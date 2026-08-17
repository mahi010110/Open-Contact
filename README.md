<div align="center">

# OpenContact

**Ta recherche de stage, d'alternance ou d'emploi — et celle de ton groupe.**

Tes données restent sur tes appareils. Pas de compte, pas de serveur, pas de traçage.

[Essayer](https://mahi010110.github.io/Open-Contact/) ·
[Les trois surfaces](docs/surfaces.md) ·
[La suite](docs/feuille-de-route.md) ·
[Développer](docs/developpement.md)

</div>

---

## Le problème

Tu cherches un stage. Tu as vingt entreprises repérées, trois messages
envoyés, deux réponses en attente, et une question qui revient chaque fois
que tu ouvres ton ordinateur : **« je fais quoi maintenant ? »**

Un tableur ne répond pas à ça — il range, il ne pousse pas. Un CRM
professionnel non plus : il est conçu pour des commerciaux qui gèrent des
comptes, pas pour un étudiant qui cherche une place.

Et pendant ce temps, ton voisin de classe a fait son stage exactement là où
tu postules à froid. Il le sait, tu ne le sais pas, et personne n'a d'endroit
où le dire.

## Ce que fait OpenContact

Un outil de **motivation et d'action**, pas une base de données. Chaque écran
pousse vers le prochain geste concret.

| L'écran | Ce qu'il te donne |
|---|---|
| **Aujourd'hui** | Ce qu'il y a à faire, maintenant. Ce qui est planifié, ce qui se tait depuis trop longtemps, et par où commencer quand tu ne sais pas |
| **Mes pistes** | Toutes tes pistes, leur statut, leur prochaine action. Liste au pouce, tableau à l'écran |
| **Échanger** | Donner tes pistes à ton groupe, recevoir les leurs, synchroniser tes propres appareils |
| **Moi** | Ton profil, tes CV et lettres, tes modèles d'e-mails, ta copie de sauvegarde |

Et le geste le plus cher, celui que personne ne peut faire à ta place :
**écrire**. Le composeur pose sous tes yeux ce que tu sais de l'entreprise —
parce qu'une accroche nourrie de recherche fait passer les réponses de ~7 % à
~17 %, et qu'aller la chercher sur un autre écran, personne ne le fait.

## Ce qui le rend différent

**Le lien humain voyage avec la piste.** Une candidature à froid décroche un
entretien dans ~3 % des cas. Une candidature portée par quelqu'un qui est
dedans : ~40 %. Un rapport de 40 pour 1. Quand un camarade déclare « j'y suis
passé », son prénom part avec la piste — et l'app te propose d'aller lui
demander, de vive voix, parce qu'une demande en face aboutit **34 fois** plus
souvent que par e-mail.

**Tes données ne partent nulle part.** Elles vivent dans ton navigateur. Le
partage se fait de pair à pair, chiffré, ou par un fichier `.oc` que tu
passes de la main à la main. Le fichier marche toujours : hors ligne, réseau
d'établissement bloqué, ou simplement par clé USB.

**Ton suivi privé reste privé.** Tes statuts, tes notes, ton journal ne
sortent jamais dans un partage. Seule exception : entre tes propres
appareils. C'est vérifié par des tests automatiques qui lisent réellement les
octets qui sortent, pas la théorie.

**Rien ne s'écrase en silence.** Recevoir des données montre toujours un
aperçu avant, et laisse ~30 secondes pour annuler après.

## Ce qu'OpenContact ne fera jamais

- Aucun serveur, aucun compte, aucune analytique, aucun traçage.
- Aucune publicité, aucune revente ou exploitation de tes données.
- Ton suivi privé ne sort jamais dans un partage avec ton groupe.
- Aucune donnée écrasée sans aperçu et sans possibilité d'annuler.

Ce n'est pas une intention, c'est une contrainte d'architecture : il n'y a
nulle part où envoyer quoi que ce soit.

## L'essayer

Ouvre **[l'application](https://mahi010110.github.io/Open-Contact/)** dans
ton navigateur. Rien à installer, rien à créer, aucune adresse à donner.

Sur téléphone, le navigateur te proposera de l'ajouter à l'écran d'accueil :
elle s'ouvre alors comme une vraie application et marche hors ligne.

## Où en est le projet

OpenContact est **un seul produit sur trois surfaces**, et une seule existe
aujourd'hui :

| Surface | État |
|---|---|
| **Web** (navigateur, installable) | **Livrée** — c'est tout ce qui précède |
| **Ordinateur** | **La prochaine** — base native écrite, pas livrée aujourd'hui |
| **Téléphone** (store) | **Ensuite** — même base native ; en attendant, l'app web s'installe depuis le navigateur |

Le détail, capacité par capacité, est dans **[`docs/surfaces.md`](docs/surfaces.md)**.
Ce document dit franchement ce qui marche et ce qui n'existe pas — c'est sa
seule raison d'être.

## Propriété

**OpenContact n'est pas un logiciel open source.** Son code est visible pour
que chacun puisse le lire, l'auditer et vérifier ce qu'il fait de ses
données — pas pour être réutilisé.

- **Utiliser l'application** publiée : libre et gratuit, pour tout le monde.
- **Lire le code**, l'étudier, en citer un extrait, signaler une faille :
  autorisé.
- **L'exécuter, l'héberger, le modifier, le redistribuer ou l'exploiter** :
  interdit sans accord écrit.

Les termes exacts sont dans **[`LICENSE`](LICENSE)**. Les composants écrits
par d'autres — bibliothèques, polices, icônes — restent sous leurs propres
licences et sont énumérés dans **[`NOTICE.md`](NOTICE.md)**.

Le dépôt n'accepte pas de contributions extérieures.

## Structure du dépôt

| | |
|---|---|
| `index.html`, `app.js` | La coque et le routeur de l'app web |
| `engine/` | Le moteur : modèle, stockage, fusions, chiffrement, filtres. Fonctions pures, aucun accès à l'écran |
| `ui/` | Les écrans, un fichier par écran ou par feuille |
| `styles/` | `app.css` et les `tokens/` — la source unique du design |
| `assets/` | Polices, icônes, bibliothèques copiées localement, avec leurs licences |
| `design/` | Le kit de design « Utilitaire 98 » |
| `compagnon/` | La base native (Rust/Tauri) des futures applications ordinateur et téléphone — chantier en attente |
| `tests.js`, `tests/e2e/` | Les auto-tests du moteur et les scénarios de bout en bout |
| `CONTRAT.md` | Le contrat de données : clés de stockage, format `.oc`, invariants |
| `CLAUDE.md` | La référence produit & UI/UX — toute décision de conception y répond |

Pour lancer le projet et les tests : **[`docs/developpement.md`](docs/developpement.md)**.

---

<div align="center">
<sub>Copyright © 2026 Maheydine Saadi Hamed Ounchiouene. Tous droits réservés.</sub>
</div>
