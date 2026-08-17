# Les trois surfaces — ce qui existe, ce qui dort, ce qui n'existe pas

Ce document a une seule raison d'être : **dire franchement où en est chaque
partie du produit.** Rien ici n'est une promesse.

OpenContact est **un seul produit**. Il vit — ou vivra — sur trois surfaces
qui partagent les mêmes données et le même vocabulaire. Une seule est livrée.

| Surface | État | Ce qu'elle apporte de plus |
|---|---|---|
| **Le web** (navigateur, installable) | ✅ **Livrée** | Tout le quotidien |
| **L'ordinateur** | ⏸ **La prochaine — base écrite, pas livrée** | Ce qu'un navigateur ne peut pas garantir |
| **Le téléphone** (store) | ⬜ **Ensuite — non commencée** | Une meilleure intégration à l'appareil |

**La règle qui ne bouge pas : les surfaces partagent des données, jamais des
dépendances.** Le web reste entier si l'ordinateur n'existe pas.

**Corollaire, et il compte pour toi qui lis :** une capacité absente d'une
surface **n'apparaît pas** dessus. Ni grisée, ni marquée « bientôt » :
absente. Tu ne verras donc jamais, dans l'app web, un bouton qui ne marche
pas.

---

## ✅ Le web — livré

C'est l'application que tu peux ouvrir maintenant. Elle tourne dans un
navigateur, sur téléphone comme sur ordinateur, **sans compte et sans rien
installer**.

| Capacité | |
|---|---|
| Pistes, fiches, suivi, prochaine action, clôture | ✅ |
| Capture rapide, détection des doublons, bac « à rattacher » | ✅ |
| Partage au groupe : QR, fichier `.oc`, coller, en direct | ✅ |
| Synchronisation entre **mes** appareils | ✅ |
| Écrire un e-mail (`mailto:`, copier, marquer « Envoyée ») | ✅ |
| Postuler à plusieurs d'affilée, une par une | ✅ |
| CV et lettres rangés, modèles d'e-mails à variables | ✅ |
| Copie de sauvegarde, restauration, verrouillage facultatif | ✅ |
| « Depuis mes e-mails » : copier la consigne, coller la réponse | ✅ |

### Pourquoi « sans compte » n'est pas un slogan

Il n'y a **aucun serveur OpenContact**. Nulle part. Tes pistes vivent dans le
stockage de ton navigateur ; quand elles circulent, elles vont directement
d'un appareil à l'autre, chiffrées, ou par un fichier que tu transportes.

Deux services extérieurs sont sollicités, tous deux facultatifs et tous deux
sans effet sur tes données s'ils tombent : des relais publics qui aident deux
appareils à **se trouver** (ils ne voient jamais le contenu), et un service de
cartographie pour retrouver la position d'une ville. Le détail est dans
[`NOTICE.md`](../NOTICE.md).

### « Depuis mes e-mails » n'est pas de l'IA côté OpenContact

L'app ne rédige rien et n'appelle personne. Elle te donne une consigne à
copier ; tu la portes à l'assistant de ton choix — celui de ton téléphone, un
onglet déjà ouvert, ce que tu veux — et tu recolles la réponse. Aucune clé,
aucun compte, aucun appel réseau : c'est du texte qui fait l'aller-retour
dans le presse-papier.

---

## ⏸ L'ordinateur — la prochaine, base écrite, pas livrée

**À lire en premier : cette surface n'est pas livrée.** Une release d'essai
de l'ancien « Compagnon » (v0.1.0, juillet 2026) reste téléchargeable sur
GitHub — paquets non signés — mais elle appartient à un concept abandonné :
rien n'y est maintenu, et l'installer n'est pas recommandé aujourd'hui. Le
code, lui, est écrit et testé dans `compagnon/`, et il attend la reprise.

Ses capacités sont **masquées dans l'app web** par quatre drapeaux
(`ui/perimetre.js`). Rien n'a été supprimé, aucune donnée déjà enregistrée
n'est perdue — c'est simplement invisible tant que la surface dort.

| Capacité | Pourquoi elle ne peut pas être sur le web |
|---|---|
| Campagnes : séquence, relances, plafond, fenêtre d'envoi | Un navigateur fermé n'envoie rien |
| Envoi application fermée, détection des réponses (SMTP/IMAP) | Un navigateur ne parle pas ces protocoles |
| Analyse automatique de la boîte mail | Idem, et le volume ne passe pas |
| IA locale (Ollama) ou abonnement installé sur la machine | Le modèle tourne sur la machine, pas dans l'onglet |
| Serveur MCP pour un assistant extérieur | Il faut un processus qui écoute |

### Où en est ce code, exactement

Écrit, testé, et gelé en juillet 2026. L'architecture est hybride Tauri : un
cœur en Rust (missions signées, planificateur, journal scellé), une coquille
native, et **le même moteur `engine/` que l'app web** — c'est la séparation
`engine/` ↔ `ui/` qui rend ça possible sans rien réécrire.

Ce qui fonctionnait au moment du gel : envoi SMTP avec reprise sans doublon
après coupure, détection des réponses par IMAP, analyse bornée d'e-mails,
missions envoyées depuis le téléphone, serveur MCP local. Paquets `.deb`,
`.dmg` et `.exe` produits par l'intégration continue, **non signés**.

Ce qui ne va pas, et qui devra être corrigé avant toute reprise : l'analyse
d'e-mails ne décode pas le MIME et jette les en-têtes, ce qui donne du
charabia au modèle ; elle appelle Ollama en dur au lieu de passer par
l'assistant configuré ; et la détection des réponses se trompe dans les deux
sens. Ces défauts sont connus et documentés, pas découverts.

### Pourquoi le dossier s'appelle encore `compagnon/`

C'était le nom d'une phase antérieure du projet — « le Compagnon », une
application d'appoint à côté du produit. Ce concept est **abandonné**
(décision du 17 août 2026) : il y a trois applications d'un même produit,
pas un produit et son satellite. Le code, lui, sert la suite — la coquille
native est la fondation des applications ordinateur **et** téléphone.

Le dossier garde ce nom pour une raison purement technique : le crate Rust,
le binaire de la release v0.1.0 et le point d'entrée local
(`127.0.0.1:17095/oc-compagnon`) le portent. Tout se renommera d'un seul
geste à la reprise du chantier, jamais avant. À l'écran et dans cette
documentation, la surface s'appelle **OpenContact pour ordinateur**.

### Quand s'ouvre-t-elle ?

La direction est arrêtée : trois applications, dans une file — le web
d'abord, ses retours ensuite, puis l'ordinateur, puis le téléphone.
L'ordinateur est **la prochaine application** ; il s'ouvre après les
premiers retours du web, en commençant par corriger les défauts connus
listés ci-dessus.

---

## ⬜ Le téléphone — non commencé

Rien n'existe encore — pas de code propre à cette surface, pas de maquette.
Mais son chemin est **décidé** : elle se construira sur la **même coquille
native que l'ordinateur** (la coquille Tauri du dossier `compagnon/` sait
produire les deux), avec le même moteur `engine/` que le web. Un seul code,
trois applications.

**Ce n'est pas bloquant aujourd'hui** : l'app web s'installe déjà depuis le
navigateur d'un téléphone (« Ajouter à l'écran d'accueil ») et fonctionne
hors ligne, en plein écran, comme une application. C'est le chemin actuel, et
il couvre l'essentiel.

Ce que l'application native apportera en plus : caméra, menu de partage du
système, notifications. Une honnêteté à garder dès maintenant : les
capacités « application fermée » (campagnes, détection des réponses)
resteront plus à l'aise sur un ordinateur — un téléphone interrompt le
travail de fond quand il veut. La version téléphone prendra ce que la
plateforme permet, sans le promettre au-delà.

---

## ⏸ Reporté par choix

Deux capacités passent toutes les règles techniques et sont pourtant mises de
côté, pour des raisons différentes :

**Le brouillon par IA avec ta propre clé** (Claude, Gemini, OpenRouter).
Aucune installation, aucune démarche : c'est ta clé qui porte le coût. Mais
ça demande de comprendre ce qu'est une clé d'API avant d'en tirer quoi que ce
soit, et ce n'est pas le public visé. Le jour où ça revient, ça revient sur
**le web**, jamais sur l'ordinateur.

**L'envoi direct par Gmail ou Outlook** (OAuth). Ça engagerait le mainteneur
dans une déclaration permanente chez Google et Microsoft — examen, validation,
renouvellement. Un projet d'étudiant n'a pas à porter ça. `mailto:` reste le
chemin de tout le monde, et il marche partout.

---

## Comment on décide qu'une idée va sur telle surface

Deux questions, dans cet ordre. Elles ne parlent ni de difficulté ni de
niveau d'expertise :

> **① Est-ce que ça marche pour quelqu'un qui ouvre l'app dans son
> navigateur, sur son téléphone, sans compte et sans rien installer ?**
> Oui → c'est du **web**, donc de partout.
> Non → c'est une capacité de la surface **ordinateur**. *L'installation est
> ce qui fait une autre surface* — rien d'autre.

> **② Est-ce que ça engage le mainteneur dans une démarche permanente**
> (déclaration chez un fournisseur, examen, certificat à renouveler) **?**
> Oui → **reporté**, quelle que soit la surface.

C'est tout. Pas « est-ce que c'est avancé », pas « est-ce que c'est pour les
experts » : est-ce que ça marche **tout de suite, pour tout le monde**.

La question ② est aussi ce qui décide de l'ordre de **mise à disposition**
des trois applications — stores, signatures, certificats. Le détail, les
coûts et l'ordre recommandé sont dans [`deployer.md`](deployer.md).
