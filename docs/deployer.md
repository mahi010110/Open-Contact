# Déployer OpenContact — la stratégie

**Ce document s'adresse à quelqu'un qui ne connaît ni le projet ni
l'informatique.** Il explique ce que veut dire « déployer », pourquoi les
trois applications se déploient de façons très différentes, ce que ça coûte,
et dans quel ordre s'y prendre.

---

## D'abord : « déployer », ça veut dire quoi ?

Déployer, c'est **mettre l'application entre les mains des gens**. Rien de
plus. Le code peut être parfait sur ton ordinateur : tant que personne ne
peut l'ouvrir, il n'existe pas.

Et voici ce qu'il faut comprendre avant tout le reste :

> **Il y a deux mondes, et ils n'ont rien à voir.**
>
> **Le web** : tu déposes des fichiers sur un serveur, quelqu'un tape une
> adresse, ça s'ouvre. Personne ne te demande la permission. C'est ton
> monde aujourd'hui.
>
> **Les applications installées** (ordinateur, téléphone) : le fichier doit
> voyager jusqu'à la machine de la personne, s'y installer, et **le système
> d'exploitation va se méfier de toi**. Windows, macOS, Android et iOS
> partent tous du principe qu'un programme inconnu est peut-être un virus.
> Pour qu'ils te fassent confiance, il faut leur prouver qui tu es — et
> cette preuve, elle se paie et elle se renouvelle.

Toute la difficulté du déploiement est là. Pas dans le code : dans la
confiance.

---

## 1. Le web — c'est déjà fait, et ça ne coûte rien

**Comment ça marche.** GitHub héberge gratuitement des sites. Tu envoies ton
code sur GitHub, GitHub le publie à une adresse. C'est tout.

**Aujourd'hui** : ton application est en ligne à
<https://mahi010110.github.io/Open-Contact/>. Quand tu pousses une
modification, elle est en ligne une ou deux minutes après. Il n'y a rien à
faire de plus.

**Le bonus que peu de gens connaissent** : ton application web est une
« PWA ». Sur un téléphone, le navigateur propose de l'**ajouter à l'écran
d'accueil**. Elle prend alors une icône, s'ouvre en plein écran, marche hors
ligne — elle ressemble à une application installée. Sans store, sans compte,
sans un centime.

**Ce que ça veut dire pour toi** : tu as déjà une application mobile
utilisable. Pas parfaite, mais réelle, et gratuite.

**Coût : 0 €. Démarche : aucune. Délai : immédiat.**

### Si un jour tu veux un vrai nom de domaine

`opencontact.fr` coûte 10 à 15 € par an chez n'importe quel vendeur de
domaines. Tu le fais pointer vers GitHub Pages en changeant deux réglages.
L'hébergement reste gratuit — tu ne paies que le nom.

Ce n'est pas pressé. Une adresse en `github.io` fonctionne exactement pareil.

---

## 2. L'ordinateur — gratuit, mais Windows et macOS vont râler

**Comment ça marche.** Ton code est transformé en un fichier d'installation,
un par système :

| Système | Le fichier |
|---|---|
| Windows | `.exe` (un installeur classique) |
| macOS | `.dmg` (l'image disque qu'on glisse dans Applications) |
| Linux | `.deb` et `.AppImage` |

**Bonne nouvelle : c'est déjà construit automatiquement.** Le fichier
`.github/workflows/release.yml` fabrique les trois, les installe pour
vérifier qu'ils démarrent vraiment, et les publie dans la section
« Releases » de GitHub. Les gens téléchargent depuis là. C'est gratuit et
illimité.

**Mauvaise nouvelle : les paquets ne sont pas signés.** « Signer », c'est
acheter un certificat qui prouve que le programme vient bien de toi.
Sans ça :

- **Windows** affiche un écran bleu inquiétant : « Windows a protégé votre
  ordinateur ». Il faut cliquer sur « Informations complémentaires » puis
  « Exécuter quand même ». Beaucoup de gens abandonnent là.
- **macOS** refuse carrément le premier lancement. Il faut faire un clic
  droit sur l'application puis « Ouvrir ».
- **Linux** ne dit rien. Linux te fait confiance.

**Combien coûte la signature ?**

| | Prix | Ce que ça règle |
|---|---|---|
| Certificat Windows | ~200 à 400 € / an | L'écran bleu disparaît |
| Compte Apple Developer | 99 € / an | macOS ne bloque plus (« notarisation ») |

**Mon conseil : ne paie rien pour l'instant.** Publie sans signature, et
explique l'avertissement dans une page d'aide, avec des captures. Tes
premiers utilisateurs sont des étudiants de ta promo : tu peux leur dire de
vive voix. Tu paieras la signature le jour où tu auras des gens que tu ne
connais pas — c'est-à-dire le jour où ça vaudra le coup.

**Coût : 0 €. Démarche : aucune. Délai : le temps de rouvrir le chantier.**

---

## 3. Le téléphone — là, ça se complique vraiment

C'est ici que le monde change de nature. Sur un ordinateur, n'importe qui
peut installer n'importe quoi. Sur un téléphone, **Google et Apple tiennent
la porte**.

### Ce que la base actuelle permet

Le code de `compagnon/` utilise **Tauri version 2**, qui sait produire des
applications Android et iOS à partir du même code. Techniquement, la route
existe : une seule base pour l'ordinateur et le téléphone. C'est pour ça que
le concept du « Compagnon » a été abandonné au profit de trois applications
d'un même produit — voir [`surfaces.md`](surfaces.md).

### Android — deux chemins très différents

**Chemin A — le fichier direct (gratuit).** Tu produis un fichier `.apk`, tu
le mets dans les Releases GitHub, les gens le téléchargent et l'installent.
Android demandera d'autoriser « les sources inconnues », une fois.

- Coût : **0 €**. Aucune démarche, aucune validation, aucune attente.
- Limite : ça fait peur à beaucoup de gens, et il n'y a pas de mise à jour
  automatique.

**Chemin B — le Play Store (payant).**

- **25 €, une seule fois** (pas par an).
- **Mais** : depuis fin 2023, un compte personnel doit d'abord faire tester
  l'application par **au moins 12 personnes pendant 14 jours d'affilée**
  avant de pouvoir la publier au grand public. Ce n'est pas une formalité.
  *(Les règles de Google changent souvent — à revérifier le jour venu.)*
- Il faut aussi remplir une déclaration de confidentialité, décrire ce que
  l'application fait des données, etc. Dans ton cas c'est facile : elle
  n'envoie rien nulle part.

### iOS (iPhone) — le plus cher et le plus fermé

- **99 € par an**, sans exception. Si tu arrêtes de payer, ton application
  disparaît du store.
- **Il faut un Mac** pour construire l'application. Pas d'alternative
  légale.
- Chaque version passe par une **revue humaine** chez Apple, qui peut
  refuser. Compte quelques jours.
- Il n'existe **aucun équivalent du fichier direct** : hors du store, on ne
  peut pas installer sur un iPhone. C'est le store ou rien.

> **Le piège irréversible, et il n'y en a qu'un : la clé Android.**
> Pour publier une application Android, tu la signes avec une clé que tu
> génères toi-même (c'est gratuit). **Garde ce fichier et son mot de passe
> pour toujours**, sauvegardés à deux endroits. Si tu les perds, tu ne peux
> plus jamais mettre à jour ton application — il faut en republier une
> nouvelle, et tous tes utilisateurs sont perdus. Ça n'arrive qu'une fois,
> et ça ne se répare pas.

---

## 4. L'ordre que je recommande

C'est du moins cher et du plus rapide vers le plus engageant. **Chaque étape
ne se déclenche que si la précédente a trouvé des utilisateurs.**

### Étape 1 — maintenant : le web, et rien d'autre

Il est déjà en ligne. Montre-le à ta promo, en leur disant d'ajouter
l'application à leur écran d'accueil. **Coût : 0 €.**

Ce que tu cherches à savoir, et rien d'autre : *est-ce qu'ils l'utilisent
encore deux semaines après ?* Tant que tu n'as pas la réponse, construire
autre chose est un pari.

### Étape 2 — l'application ordinateur, non signée

Rouvre le chantier, corrige les défauts connus, publie les fichiers dans les
Releases GitHub avec une page d'aide qui explique l'avertissement.
**Coût : 0 €.**

### Étape 3 — Android en fichier direct

Le même code produit un `.apk`. Tu le mets dans les Releases. Tu crées ta
clé de signature **et tu la sauvegardes immédiatement**. **Coût : 0 €.**

### Étape 4 — le Play Store, si la demande est là

25 € une fois, plus les 12 testeurs pendant 14 jours. À ce stade tu as déjà
des utilisateurs : trouver 12 testeurs n'est plus un problème, c'est même la
preuve que l'étape valait le coup.

### Étape 5 — iOS et les signatures, en dernier

99 € par an pour Apple, plus éventuellement le certificat Windows. **Ne
paie ça que quand quelqu'un que tu ne connais pas te demande l'application.**
Avant, c'est de l'argent dépensé pour du confort que personne ne réclame.

---

## 5. Le principe qui décide, et il existe déjà

Ce document ne fait qu'appliquer une règle que le projet s'est déjà donnée
(`CLAUDE.md` §0) :

> **Est-ce que ça engage le mainteneur dans une démarche permanente** —
> une déclaration chez un fournisseur, un examen, un certificat à
> renouveler ? Si oui : **reporté.**

Un abonnement Apple à 99 € par an est exactement ça. Un certificat Windows
aussi. Le Play Store un peu moins (25 € une fois). Le fichier direct et le
web, pas du tout.

D'où l'ordre ci-dessus : **on avance tant que c'est gratuit et réversible,
on s'arrête dès que ça devient un engagement.** Et on ne franchit un
engagement que quand des utilisateurs réels le réclament.

---

## En un tableau

| | Coût | Démarche permanente | Prêt quand ? |
|---|---|---|---|
| **Web** (GitHub Pages) | 0 € | aucune | ✅ déjà en ligne |
| Nom de domaine | ~12 € / an | renouvellement | quand tu veux |
| **Ordinateur** non signé | 0 € | aucune | chantier à rouvrir |
| Signature Windows | ~300 € / an | renouvellement | plus tard |
| Signature macOS | 99 € / an | compte Apple | plus tard |
| **Android** fichier direct | 0 € | aucune | après l'ordinateur |
| **Android** Play Store | 25 € une fois | 12 testeurs, 14 jours | si la demande est là |
| **iOS** App Store | 99 € / an | revue Apple + un Mac | en dernier |

**Ce qu'il faut retenir :** tu peux aller très loin à 0 €, et tu es déjà
plus avancé que tu ne le crois — ton application est en ligne et
installable sur un téléphone dès aujourd'hui.
