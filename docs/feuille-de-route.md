# Feuille de route

**Ce document dit quoi faire et dans quel ordre.** Il ne dit jamais comment
concevoir — ça, c'est `CLAUDE.md`. Et il ne redit pas l'état des surfaces —
ça, c'est [`surfaces.md`](surfaces.md).

*Dernière mise à jour : 17 août 2026.*

---

## Là où on en est

La surface web est **fonctionnellement complète** et n'attend plus de
fonctionnalité pour être montrée. 122 auto-tests verts, et 17 scénarios de
bout en bout joués dans un vrai navigateur, en deux tailles d'écran et deux
thèmes.

La suite en compte 29 : les 12 autres sont **sautés, pas verts** — ils
appartiennent aux capacités masquées (`ui/perimetre.js`) et à la surface
ordinateur, dont le binaire n'est pas construit ici. Compter un scénario
sauté comme réussi est exactement ce que `developpement.md` interdit ; ce
chiffre-là est celui qu'on relit pour décider qu'on est prêt.

Ce qui reste avant de la mettre entre les mains d'étudiants tient en peu de
choses, et aucune ne dépend de quelqu'un d'extérieur.

---

## 1. Avant la première bêta

- [x] **Licence et propriété** — le dépôt dit à qui appartient le produit,
      et les composants tiers sont attribués. *(août 2026)*
- [x] **Documentation publique** — un dépôt lisible par quelqu'un qui
      découvre le projet. *(août 2026)*
- [ ] **Site de présentation** — une page qui explique le produit à
      quelqu'un qui n'ouvrira pas l'app tout de suite.
- [ ] **Essais sur vrai matériel** — un vrai téléphone d'entrée de gamme, un
      vrai réseau d'établissement. Les scénarios automatiques passent à côté
      de tout ce qui relève du doigt, de la lenteur et du wifi filtré.
      En particulier : **prouver que les neuf relais épinglés répondent**
      (`RELAIS_DEFAUT`, `engine/transport.js`) — le bac à sable de
      développement refuse toute connexion sortante, leur choix repose donc
      sur la réputation, pas sur une mesure. À rejouer à deux téléphones.
- [x] **Durabilité des données** — prouver qu'une installation neuve, puis
      une montée de version, ne perdent rien. C'est l'invariant qui coûte le
      plus cher s'il casse : sans serveur, ce qui disparaît ici a disparu
      pour de bon. `e2e-durabilite.mjs` écrit un suivi complet — les 20 clés
      persistantes **et les CV et lettres**, qui vivent dans une base à part
      (`oc_docs_v1`) — déploie une version neuve, attend que le service
      worker neuf prenne réellement la main, et vérifie que tout survit
      octet pour octet, puis que l'app le **relit** vraiment.
      *(août 2026)*
- [x] **`tests/e2e/README.md` décrit les 29 scénarios** — il en décrivait 15,
      alors que `developpement.md` promet « le détail de **chaque** scénario ».
      Manquaient les gardes les plus récentes, celles qu'on relit justement
      pour savoir ce qui est déjà couvert. Le tableau est désormais rangé par
      intention (le socle, protéger, faire circuler, les écrans, la surface
      ordinateur, les gardes transverses) et chaque ligne dit **pourquoi** un
      scénario peut être sauté. `tous.mjs` refuse maintenant de démarrer si un
      fichier n'y figure pas : la promesse ne peut plus se défaire seule.
      *(août 2026)*
- [ ] **Pages confidentialité et aide** — courtes, honnêtes. La liste « ce
      qu'OpenContact ne fera jamais » y a sa place : c'est ce qui permet à un
      établissement de faire confiance à l'outil.

**Le chemin de retour existe déjà.** Réglages → « Signaler un problème »
produit un rapport de cinq lignes (navigateur, système, écran, poids des
données…) et le copie. Aucun envoi automatique : ce serait de la télémétrie,
et c'est interdit. L'étudiant colle où il veut. Le rapport ne contient aucune
donnée personnelle, et il s'affiche en entier avant d'être copié — la
promesse se vérifie en lisant, pas en croyant.

---

## 2. La bêta

Conditions d'entrée : rien de critique ouvert, durabilité prouvée, essais
matériels faits, site en ligne.

Démarrer par **un petit groupe d'étudiants**, puis ouvrir. Le produit vit ou
meurt sur un point : est-ce qu'ils l'utilisent encore un mois après. Tout le
reste en découle.

---

## 3. Après les premiers retours

Dans cet ordre, et seulement si les retours le justifient :

1. **Corriger ce que la bêta remonte.** Rien d'autre ne passe avant.
2. **Rouvrir le chantier de l'application ordinateur** — le sort du code
   n'est plus en question : il devient la fondation des applications
   installées (§4). Ce qui reste à trancher après la bêta, c'est le
   périmètre exact de la première version, et le sort des capacités
   reportées par choix (brouillon IA, envoi direct).

3. **Ramener le brouillon par IA** avec ta propre clé, si les retours
   montrent que la rédaction est bien le point de blocage.
4. **Import de données publiques** pour amorcer une liste de pistes sans
   partir de zéro.

---

## 4. Les surfaces suivantes

**La direction est arrêtée** *(17 août 2026)* : OpenContact sera **trois
applications** — web, ordinateur, téléphone — construites sur la même base.
Le concept du « Ordinateur », application d'appoint à côté du produit, est
abandonné ; son code n'est pas perdu, il devient la fondation des
applications installées. La coquille native exécute le même moteur que le
web, et elle sait produire l’ordinateur **et** le téléphone.

La file ne change pas : le web d'abord, ses retours ensuite, puis
**l’ordinateur** (le code en est le plus proche — corriger d'abord ses
défauts connus, listés dans [`surfaces.md`](surfaces.md)), puis **le
téléphone** sur la même base. En attendant, l'app web installée depuis le
navigateur reste le chemin du téléphone.

---

## Ce qui n'est pas au programme

Pas par manque de temps — par choix, et le choix ne se rediscute pas sans
raison nouvelle :

- **Aucun serveur, aucun compte, aucune analytique, aucun traçage.**
- **Aucune publicité**, aucune revente ou exploitation des données.
- **Le suivi privé ne sort jamais** dans un partage avec le groupe.
- **Aucune donnée écrasée** sans aperçu préalable et sans possibilité
  d'annuler.
- **Aucun suivi d'ouverture des e-mails.** Un pixel de suivi est exactement
  la surveillance que le projet refuse partout ailleurs. « Pas de réponse
  depuis N jours » rend le même service sans espionner personne.
