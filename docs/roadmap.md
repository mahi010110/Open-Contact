# OpenContact — feuille de route officielle

**Document unique de référence pour la suite du projet.** Il remplace
`plan-v7.md` comme feuille de route (celui-ci devient un historique de la
v6.1, à archiver au §11). Les règles produit et UI/UX restent dans
`CLAUDE.md`, le contrat de données dans `CONTRAT.md` : cette feuille de
route dit **quoi faire et dans quel ordre**, jamais **comment concevoir**.

Dernière mise à jour : juillet 2026 — version applicative 6.3.0, cache
`oc-v50`, 97 auto-tests verts (`?test`).

---

## 0. Déjà terminé

- PWA locale, hors-ligne, sans compte ni serveur.
- Coffre (code, phrase de récupération, chiffrement), gestion des appareils.
- Campagnes, Compagnon, IA, analyse d'e-mails, MCP local.
- Partage et sync P2P (Trystero/Nostr vendorisé), fichier `.oc`, QR.
- Refonte UX complète (23 décisions, phases 0 à 4) — fusionnée dans `main`.
- 97 auto-tests verts, parcours principaux rejoués en E2E.

> **Nuance importante.** « Refonte terminée » veut dire : les 23 décisions
> sont livrées. Pas : l'application est sans défaut. L'audit du §1.1 en a
> trouvé 12, capture d'écran à l'appui. C'est normal — c'est exactement le
> rôle du §1.

---

## 1. Stabilisation réelle — maintenant

### 1.1 Corrections d'UX issues de l'audit (préalable à tout le reste)

Audit fonctionnel post-refonte réalisé : app réellement lancée (serveur
statique + Playwright), 1280×900 et 390×844, données de test réalistes,
captures conservées. **12 défauts confirmés**, regroupés en 5 lots. Chaque
lot se termine par une vérification aux deux tailles, thème clair et
sombre, zéro erreur console, `?test` vert (checklist `CLAUDE.md` §9).

> Ces corrections passent **avant** les tests sur vrai matériel : faire
> tester à des camarades une interface dont on sait déjà qu'elle est
> fautive gâche la ressource rare (leur temps, leur attention, leur
> premier avis).

**Lot 1 — l'écran « Moi / Réglages »** (`ui/moi.js`, `ui/docs.js`,
`ui/profil.js`). Cinq défauts sur un seul écran : une seule passe.

- **E — la copie propose directement un mot de passe.** Un seul geste, une
  seule feuille : champ mot de passe présent d'emblée, laissé vide = copie
  en clair, c'est un choix valide. Le lien « avec un mot de passe »
  (`#moiBackupPass`) disparaît.
- **D — plus aucun bouton poubelle permanent.** Suppression au geste :
  glisser (mobile) / poubelle au survol (desktop) via `bindDeleteGesture`,
  doublée d'un `showUndo`. Concerne les documents et les modèles d'emails.
  Les appareils liés gardent leur confirmation (geste lourd, `CLAUDE.md`
  §6) mais perdent eux aussi la poubelle affichée en permanence.
- **#7 — les boutons des Réglages** reprennent la taille de contrôle
  standard (`--ctl` : 44 px mobile, 32 px desktop) et un alignement unique.
- **A — plus de texte descriptif à côté d'un bouton.** Il reste le libellé,
  et un indicateur d'état court quand l'état n'est pas lisible autrement
  (« 4 documents », « protégé », « 2 appareils »). Pas de phrase.
- **C — CV et lettres classés et compactés.** Deux groupes (CV / Lettres),
  une ligne dense par document : nom, taille, « Voir ». Le geste de
  suppression vit sur la ligne.

**Lot 2 — corrections isolées rapides**

- **#4 — icône du Compagnon.** « Le Compagnon » et « Mes appareils »
  partagent aujourd'hui l'icône `switch` (`ui/direct.js`). Le Compagnon
  prend une icône distincte du pack pixelarticons déjà vendorisé.
- **#6 — copie du code de groupe au geste.** Le bouton « copier le code »
  (`#prCopy`) disparaît ; le code se copie par appui long (mobile) / clic
  maintenu (desktop) sur le code lui-même, retour par `toast()`.
  *Prérequis : une capture en salle réellement connectée — cet écran
  n'existe qu'une fois le groupe rejoint, impossible à voir hors réseau.*

**Lot 3 — mise en page desktop**

- **#5 — le panneau latéral recouvre le contenu.** `openPanel()`
  (`ui/dom.js`) pose `.spanel` en absolu sans réserver de place : la
  colonne « Réponse » de Mes pistes est entièrement masquée, même
  problème sur Aujourd'hui. Le panneau doit réserver sa largeur et le
  contenu se recomposer à côté.

**Lot 4 — décision assumée**

- **B — la sauvegarde n'est plus imposée à la première protection.** Dans
  `openProtectFlow` (`ui/verrou.js`), « Terminer » n'est plus grisé tant
  que la sauvegarde n'est pas téléchargée. Elle reste proposée en premier,
  et un rappel discret persiste tant qu'elle n'est pas faite. **En
  récupération (« Code oublié ») et en rotation de phrase, elle reste
  obligatoire** : c'est là que la perte devient définitive.

**Lot 5 — corrections structurelles** (moteur d'abord, tests, puis UI)

- **#3 — saisie complète sur desktop.** `openCapture()` sert le même
  mini-formulaire à 390 px et à 1280 px. Sur desktop, formulaire complet
  entreprise + contact d'emblée (« adaptatif, pas responsive »,
  `CLAUDE.md` §5).
- **#2 — choisir quels contacts partir.** Le partage envoie aujourd'hui
  tous les contacts d'une piste, ou aucun. `communityView`
  (`engine/exchange.js`) gagne un paramètre facultatif de contacts retenus
  — rétrocompatible, format `.oc` inchangé — et « Donner » permet de
  choisir les personnes, pas seulement les pistes.
- **#1 — viser plusieurs personnes dans la même entreprise.** La
  prospection ne retient qu'une personne par piste (`who: Map pisteId →
  contactId`, `ui/prospect.js`). Passage au multi-destinataires avec le
  motif `.pk` existant (chaque tap bascule, aucun écran de validation
  ajouté). Côté campagne : une réponse arrête les relances **de cette
  personne** seulement (`markReplied` s'arrête aujourd'hui à l'entreprise,
  `engine/campaign.js`), les autres continuent, notification « Nadia a
  répondu chez Orange », bouton « arrêter toute l'entreprise » dans la
  carte de campagne, plafond de 15 envois/jour inchangé (global).

**Écarté après vérification.** L'écran « Donner » quand il n'y a que des
pistes d'exemple : signalé comme muet, il ne l'est pas — un toast dit
« Rien à donner pour l'instant — ajoute d'abord une piste. » Capture à
l'appui. Ce n'était pas un défaut.

### 1.2 Tests sur vrai matériel

- Vrais téléphones et vrais ordinateurs, pas seulement l'émulation.
- Sync et partage sur Wi-Fi domestique, 4G croisée, **réseau d'école**, et
  en groupe à 5+ (protocole détaillé conservé dans `plan-v7.md`).
- Fermer l'**issue P2P n°14** seulement après preuve multi-réseaux, pas
  sur un succès isolé.
- Si le réseau d'école bloque WebRTC : vérifier que le repli QR / fichier
  `.oc` est réellement fluide, et documenter les relais personnalisables
  (`oc_relays_v1`).

### 1.3 Le Compagnon sur les trois systèmes

Windows, macOS, Linux : trousseaux, démarrage automatique, biométrie,
Ollama, Codex, et un **vrai client MCP** — pas seulement les tests maison.

### 1.4 Durabilité des données *(ajouté — absent de la version initiale)*

C'est ce qui détruirait la confiance le plus vite, et rien ne le couvre
explicitement aujourd'hui.

- À chaque livraison : rejouer une montée de version depuis les données
  d'une version **publiée précédente**, pas depuis un état neuf.
- Scénario nommé et rejoué : *« j'ai perdu mon téléphone »* — restauration
  complète depuis un `.oc` sur un appareil qui n'a jamais vu ces données,
  avec et sans mot de passe, avec et sans coffre actif.
- Aucune clé de stockage renommée, aucun format `.oc` cassé (`CONTRAT.md`).

---

## 2. Préparation à la publication

Séparée en deux, parce que la moitié dépend de tiers et ne doit pas
retenir l'autre moitié.

### 2.A — Ce qui ne dépend que du projet

- Domaine et hébergement officiel.
- Pages confidentialité, sécurité, aide, CGU.
- Vérifier les installations vierges et les montées de version sans perte.
- Préparer le canal de mise à jour du Compagnon.

### 2.B — Ce qui dépend de tiers (bloqué, à lancer tôt car les délais sont longs)

- OAuth Google et Microsoft déclarés, vrais envois Gmail / Outlook.
  *Identifiants encore vides : blocage externe.*
- Signature du Compagnon Windows ; signature **et** notarisation macOS.

> **Recommandation.** La bêta du §3 peut partir **sans** 2.B. Fichier
> `.oc`, `mailto:`, copier-coller et QR suffisent à un parcours complet —
> et une bêta qui fonctionne sans aucun compte tiers démontre la promesse
> du produit mieux qu'une page d'accueil. Ne pas laisser OAuth devenir la
> raison pour laquelle rien ne sort.

---

## 3. Bêta publique

Dépôt déjà public. Conditions d'entrée :

- Aucun problème critique ouvert.
- Sauvegardes et restaurations prouvées (§1.4).
- Tests réels mobile + ordinateur terminés (§1.2).
- Domaine et documents prêts (§2.A).
- **Un chemin de retour d'expérience sans serveur** *(ajouté)* : sans
  compte ni analytics, une bêta ne renvoie rien par défaut. Prévoir un
  « Signaler un problème » qui produit un texte de diagnostic copiable
  (version, backend de stockage, navigateur, taille des données — **aucune
  donnée personnelle**) à coller dans une issue. Sans ça, la bêta revient
  silencieuse ou coûte un entretien par étudiant.

Démarrer par un petit groupe d'étudiants, puis ouvrir.

---

## 4. Version publique stable

- Retours de bêta corrigés.
- Gmail / Outlook fonctionnels (le §2.B a abouti).
- Installateurs signés, trois systèmes testés sur vrai matériel.
- CI et scénarios E2E verts.

---

## 5. Import de données publiques

« Importer depuis une page » : coller une URL ou du texte, en extraire
entreprise / personne / poste / coordonnées **publiques**, conserver la
source et la date, aperçu avant création (jamais d'écriture directe —
invariant `CLAUDE.md` §2).

**LinkedIn** : pas de scraping de compte, pas de contournement de
protection. Uniquement du texte copié par l'utilisateur, une page fournie
volontairement, ou une API autorisée. Cette limite est un choix, pas une
contrainte technique : elle protège le projet autant que ses utilisateurs.

---

## 6. Extensions produit prioritaires *(après la V1)*

Dans l'ordre :

1. Campagnes avancées « Cadrées ».
2. Plusieurs profils.
3. Biométrie / passkeys sur vrai matériel.
4. SMTP / IMAP générique.
5. Yahoo, iCloud, Zoho.
6. Proton, si une intégration locale fiable existe.

> À ne pas confondre : viser plusieurs personnes dans une même entreprise
> (#1) n'est **pas** une campagne avancée, c'est un défaut actuel. Il reste
> au §1.1.

---

## 7. Application mobile native

Capacitor : adapter stockage, partage, caméra QR. Android d'abord, iOS
ensuite. Stores après validation. Application de bureau complète
seulement si Compagnon + PWA se révèlent insuffisants.

> **Déclencheur honnête** : la PWA couvre déjà bien Android. Ce qui
> justifie le natif, c'est iOS (installation, éviction du stockage,
> caméra). Partir quand un étudiant est réellement bloqué là-dessus — pas
> à une date.

---

## 8. Fonctions communautaires

- Confirmations signées : « vérifié par N camarades » (WebCrypto, clés
  locales, attestations rétrocompatibles).
- Boîte de réception asynchrone chiffrée.
- Annuaire de promo **seulement** s'il est réellement demandé.

---

## 9. MCP distant et relais

Facultatif, auto-hébergeable, chiffré de bout en bout, autorisation et
révocation visibles, aucune écriture directe, aucun stockage permanent.
Le MCP local reste la base de sécurité.

---

## 10. Expérimentales et faibles priorités — à trancher

Ces points restent tels que décidés par le mainteneur. Deux réserves sont
consignées ici, en toute franchise, avant décision :

- **Suivi facultatif des ouvertures d'e-mails.** Réserve : côté
  destinataire, un pixel de suivi *est* la surveillance que l'application
  refuse partout ailleurs — « transparent et respectueux » ne change pas
  ce que vit le recruteur. Alternative qui rend le même service sans
  espionner : un signal « pas de réponse depuis N jours », que
  l'application calcule déjà localement et qui répond exactement à la
  question « je fais quoi maintenant ? ».
- **Soutien financier direct.** Sans réserve — un lien de don ne coûte
  rien à la crédibilité du projet.
- **Étude d'un soutien par calcul Monero** (module séparé, volontaire,
  visible, jamais par défaut). Réserve forte : c'est la seule ligne du
  document qu'un professeur, un administrateur réseau d'établissement ou
  un validateur de store retiendra, et elle contredit frontalement
  l'argument « rien ne tourne derrière ton dos ». Rapport coût / bénéfice
  défavorable : revenu quasi nul, dommage réel sur ce qui fait la
  crédibilité. Le don direct rend le même service sans le risque.
- **Nouvelles IA et fournisseurs** selon les demandes réelles.

---

## 11. Nettoyage de la documentation

**Une partie passe devant** *(recommandation)* : `README.md:26` et
`CLAUDE.md:14` désignent encore `plan-v7.md` comme la feuille de route,
alors que ce document en est une autre. Deux cartes contradictoires = la
prochaine session repart sur la mauvaise. Corriger ces deux références
tout de suite ; le reste peut attendre la fin.

Le reste, en fin de parcours :

- Fusionner les anciens plans, audits et fichiers Fable5 utiles
  (`audit-ux-2026.md`, `audit-ux-2026-nouveautes.md`, `inspection-ux.md`,
  `refonte-calibrage.md`, `refonte-chantier.md`, `revue-2026-07.md`,
  `degraissage-v6.3.md`) — dix fichiers qui se recouvrent en partie.
- Mettre à jour README, installation, sécurité, architecture,
  contribution.
- Nettoyer les fichiers destinés aux assistants IA **sans supprimer les
  décisions importantes** : une décision de conception se déplace, elle ne
  se jette pas.
- Ne garder qu'une feuille de route officielle maintenue : celle-ci.

---

## Ce qu'OpenContact ne fera jamais *(ajouté — à publier)*

Cette liste existe déjà dans `CLAUDE.md` §10 à usage interne. La rendre
publique est une fonctionnalité : c'est ce qui permet à un établissement
de faire confiance à l'outil.

- Aucun serveur, aucun compte, aucune analytique, aucun traçage.
- Aucune publicité, aucune revente ou exploitation des données.
- Le suivi privé ne sort jamais dans un partage communautaire.
- Aucune donnée écrasée sans aperçu préalable et sans possibilité
  d'annuler.

---

## Ordre général

Stabiliser (corrections UX → vrai matériel → durabilité) → préparer la
publication → bêta publique → version stable → import public →
fonctions avancées → mobile → communauté → MCP distant → expérimentations
→ documentation finale.
