# Le Compagnon — feuille de route

**Second produit du dépôt.** OpenContact et le Compagnon se relient ; ils ne
se mélangent pas. La frontière est posée dans `CLAUDE.md` §0 : ce qui exige
une **installation** appartient ici. Ce qui engage le mainteneur dans une
**démarche permanente** est reporté, ici comme là-bas.

Règle qui ne bouge pas : **OpenContact reste entier si le Compagnon n'existe
pas.** Ce qui traverse la frontière est une donnée, jamais une dépendance.

Statut : **en pause volontaire depuis le 31 juillet 2026.** Le code est
complet et testé ; OpenContact passe d'abord.

---

## 1. Ce que c'est

L'application d'appoint sur l'ordinateur. Elle prend ce qu'un navigateur ne
peut pas garantir — et **rien d'autre** :

- envoyer des e-mails même application fermée ;
- garder les secrets dans le trousseau du système ;
- parler IMAP/SMTP (envoi, détection des réponses, lecture bornée) ;
- faire tourner une IA locale ou un abonnement installé sur la machine ;
- exposer un serveur MCP à un assistant IA extérieur.

Architecture : hybride Tauri (`docs/fable5/ETUDE-COMPAGNON.md`, décisions
D17/D18). `coeur/` = la garde en Rust pur, `src-tauri/` = la coquille et les
capacités natives, `app/` = le cerveau qui exécute les mêmes modules
`engine/` que la PWA. Détail du protocole : `compagnon/README.md`.

---

## 2. Le point de gel — où on en est le jour de la pause

Tout ce qui suit **est livré, testé et fonctionne**. C'est le point de reprise.

### Livré

| | |
|---|---|
| **C1** | Crate `oc-coeur` (mission signée Ed25519, anti-double-envoi, plafond global, fenêtre horaire) + coquille Tauri v2 + moteur partagé copié par `preparer.mjs` |
| **C2** | Canal local 127.0.0.1, tout en enveloppes `OCV1.` ; appairage par code court (PBKDF2, 5 essais, 2 min) ; secrets au trousseau OS (repli fichier 0600) |
| **C3+C4** | Missions confiées et re-vérifiées à chaque lecture ; **planificateur Rust** ; journal scellé écrit AVANT l'envoi ; SMTP `lettre`/rustls ; kill −9 + relance = zéro doublon |
| **C5** | Détection des réponses par IMAP, en-têtes seulement, toutes les 10 min ; arrêt de cible non débrayable |
| **C6** | Analyse d'e-mails bornée (jours, 40 messages, 100 Ko) → Ollama → aperçu de la PWA, jamais d'écriture directe |
| **C7** | États, révocations en file, documentation |
| **C8** | Missions depuis le téléphone : campagnes et bons signés voyagent par la sync privée jusqu'à l'ordinateur associé |
| **P8-2** | Serveur MCP local (`--mcp`, stdio, SDK `rmcp`), coupé par défaut, deux outils : résumé en liste blanche et dépôt de propositions |

### Ce qui arrive d'OpenContact avec le recentrage

Les campagnes en entier — assistant de montage, séquence 1 message + 2
relances, plafond de 15 envois/jour global, fenêtre lun–ven 8 h–19 h, arrêt
sur réponse non débrayable, mention d'opposition imposée, journal idempotent.
Le moteur (`engine/campaign.js`) et les écrans existent et sont testés ; ils
sont simplement masqués côté PWA en attendant leur nouvelle maison.

### Preuves au moment du gel

- `cargo test -p oc-coeur` : 30/30, dont un vecteur croisé signé par le
  moteur JS.
- Six scénarios E2E contre le **vrai binaire** : envoi SMTP + kill/reprise
  sans doublon, réponse IMAP, analyse fermée/reprise + fusion sûre, téléphone
  C8, MCP local (client JSON-RPC réel), rédaction IA via l'ordinateur.
- `.deb` construit, installé et vérifié ; NSIS et `.dmg` produits non signés
  par `paquets.yml` ; `release.yml` publie aux noms stables, chaque paquet
  fumé avant publication.

---

## 3. Les défauts connus, à corriger avant toute reprise

Relevés en juillet 2026, code à l'appui. Aucun n'est corrigé — ils sont
consignés ici pour ne pas être redécouverts.

**① L'analyse d'e-mails donne du charabia au modèle** — `analyse.rs`.
Le corps est pris brut après les en-têtes (`splitn(2, "\r\n\r\n")`), sans
décodage MIME : un message moderne arrive en base64 ou en HTML avec ses
frontières, tronqué à 4 000 caractères. **Et les en-têtes sont jetés** — donc
ni expéditeur, ni objet, ni date, alors que le prompt les réclame
explicitement. *C'est le défaut le plus coûteux : aucun meilleur modèle ne le
rattrape.*

**② L'analyse ignore l'assistant IA choisi** — `analyse.rs`.
Elle appelle Ollama en dur (`127.0.0.1:11434`, modèle `llama3.2` par défaut)
au lieu de passer par `ia.rs::generer`, qui sait parler aux trois runtimes et
connaît le modèle retenu. **C'est aussi le seul modèle codé en dur du dépôt**
— exactement ce que la leçon Gemini 2.0 Flash interdit.

**③ La détection des réponses se trompe dans les deux sens** — `reponses.rs`.
La requête est `FROM "<email>" SINCE <date>` : n'importe quel message de cette
adresse compte comme une réponse (absence automatique, newsletter, fil sans
rapport) → relances coupées et fiche marquée « réponse » à tort. Et une
réponse venue d'une **autre adresse** du même domaine est invisible → on
relance quelqu'un qui a déjà répondu. *Correctifs : élargir au domaine, et
corréler sur `In-Reply-To`/`References` contre le `Message-ID` de l'envoi —
ce qui suppose de garder ce `Message-ID` au journal (ajout additif).*

**④ Un 4xx SMTP est traité comme un refus définitif** — `envoi.rs`,
`planif.rs`. `is_transient()` produit un `Echec::Refus`, que le planificateur
transforme en `Etat::Erreur` + `garde.bloquer`. Or greylisting et limitation
temporaire sont les transitoires les plus courants, et dans ces cas le message
**n'est pas parti**. L'intention (ne jamais renvoyer ce qui a peut-être
abouti) est juste pour l'*incertain*, pas pour un 4xx.

**⑤ Un envoi raté disparaît de l'écran** — `engine/campaign.js`, `ui/campagnes.js`.
`campaignStats` calcule bien `error`, mais **aucun écran ne l'affiche**, et il
n'existe **aucun chemin de reprise** : une cible en erreur est morte en
silence.

**⑥ Aucune pièce jointe sur les campagnes.** La décision #4 prévoyait le CV au
J0 seulement. Ni `ui/campagnes.js` ni `envoi.rs` (corps `TEXT_PLAIN`) ne le
font.

**⑦ Le résumé MCP est trop pauvre pour être utile.** Nom, ville, domaine,
postes, date de mise à jour et trois compteurs — sans prochaine action ni
contact, un assistant ne peut pas répondre à « qui je relance ? », qui est
pourtant la question du produit. *Piste : ajouter le verbe et la date de la
prochaine action, et le nombre de contacts — jamais les noms ni les notes.*

---

## 4. Blocages externes

Ils vivent ici, et ils ne bloquent plus OpenContact.

1. **Apps OAuth Google / Microsoft à déclarer** — `MAIL_CLIENTS` dans
   `engine/mailer.js` est vide. Nécessaire pour l'envoi direct servi à tous.
   *Note : le Compagnon envoie déjà en SMTP avec un mot de passe
   d'application, sans aucune déclaration — l'OAuth n'est utile que pour la
   PWA.*
2. **Signature** : certificat Windows, programme Apple + notarisation. Ce
   n'est pas une tâche mais un abonnement à vie, à décider comme tel.
3. **Validation matérielle** : trousseaux des trois OS, démarrage
   automatique, zone de notification, verrou PRF, un vrai client MCP de
   bureau, Ollama et Codex réellement installés.

---

## 5. La direction produit

**Un « agent de recherche d'emploi », dans l'esprit d'Hermes Agent** (Nous
Research) — mais étroit et local, là où Hermes est généraliste et connecté.

Ce qui manque pour y ressembler :

- **la mémoire** — se souvenir d'une session sur l'autre de ce qui est
  cherché, tenté, obtenu ;
- **la conversation** — parler à l'outil, au lieu de lui donner des ordres
  précis ;
- **les automatismes qu'il fabrique lui-même** (les « compétences » d'Hermes).

### Trois routes, et celle que je retiens

| | |
|---|---|
| **Forker Hermes** (MIT, donc juridiquement libre) | Tout d'un coup — mais c'est du Python/Node quand le Compagnon est en Rust, il faudrait tout jeter, et maintenir un fork d'un projet à 219 000 étoiles qui bouge vite |
| **Construire ces trois briques dans le Compagnon** | Plus lent, mais rien n'est jeté et le produit reste le sien |
| **Utiliser Hermes tel quel, MCP du Compagnon branché dessus** | Zéro développement — les deux côtés parlent déjà MCP |

**Retenu : la troisième d'abord, la deuxième ensuite.** Se servir d'Hermes
pour sa propre recherche pendant quelques semaines, avec le MCP branché,
apprend en un mois lesquelles de ces trois briques servent vraiment. On ne
construit ensuite que celles-là.

> **Contrainte à décider tôt :** un agent doit tourner en permanence. Un
> portable qui se ferme le soir ne suffit pas. Soit on assume que le travail
> n'avance que machine allumée (ce que fait le Compagnon aujourd'hui), soit il
> faut une machine qui reste allumée — et ça change ce qu'on construit.

---

## 6. Reste à faire, dans l'ordre

1. **Corriger les défauts du §3** — ① et ③ d'abord : l'un rend l'analyse
   inutilisable, l'autre casse la promesse « s'arrête sur réponse ».
2. **Donner une maison aux campagnes** dans le Compagnon (elles arrivent
   d'OpenContact).
3. **Enrichir le MCP** (défaut ⑦) — c'est aussi le prérequis de la route
   « Hermes branché dessus ».
4. **Essai grandeur nature** : Hermes + MCP du Compagnon, quelques semaines.
5. **Décider la mémoire / la conversation / les compétences** à la lumière du 4.
6. Validation matérielle, puis signature et distribution (§4).

*(Reportés, inchangés : modèle de campagne « Cadré » visible, SMTP/IMAP
générique, Yahoo/iCloud/Zoho/Proton, MCP distant et relais, suivi des
ouvertures d'e-mails — avec sa réserve : côté destinataire, un pixel de suivi
**est** la surveillance que le projet refuse partout ailleurs ; l'alternative
« pas de réponse depuis N jours » rend le même service sans espionner.)*

---

## Références

- `CLAUDE.md` §0 — la frontière entre les deux produits.
- `compagnon/README.md` — architecture, protocole du canal, crochets de
  développement.
- `docs/fable5/` — le chantier connecté : contexte, spécifications, plan UX,
  études. **À déplacer ici** lors du nettoyage de la documentation.
- `CONTRAT.md` §1, §5.7, §5.8 — clés, missions, anneau, sync privée.
