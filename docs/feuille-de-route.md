# Feuille de route

**Ce document dit quoi faire et dans quel ordre.** Il ne dit jamais comment
concevoir — ça, c'est `CLAUDE.md`. Et il ne redit pas l'état des surfaces —
ça, c'est [`surfaces.md`](surfaces.md).

*Dernière mise à jour : 16 août 2026.*

---

## Là où on en est

La surface web est **fonctionnellement complète** et n'attend plus de
fonctionnalité pour être montrée. 119 auto-tests verts, 28 scénarios de bout
en bout joués dans un vrai navigateur, en deux tailles d'écran et deux
thèmes.

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
- [ ] **Durabilité des données** — prouver qu'une installation neuve, puis
      une montée de version, ne perdent rien. C'est l'invariant qui coûte le
      plus cher s'il casse.
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
2. **Trancher le sort du code en sommeil** — celui de la surface ordinateur
   et des capacités reportées. Suppression franche, ou réveil. La décision
   ne se prend pas avant d'avoir des utilisateurs : aujourd'hui elle serait
   prise à l'aveugle.
3. **Ramener le brouillon par IA** avec ta propre clé, si les retours
   montrent que la rédaction est bien le point de blocage.
4. **Import de données publiques** pour amorcer une liste de pistes sans
   partir de zéro.

---

## 4. Les surfaces suivantes

**L'ordinateur** ne se rouvre pas sur une envie mais sur une preuve d'usage
de la surface web — par exemple : dix étudiants l'utilisent encore un mois
après l'avoir installée. Tant que le seuil n'est pas atteint, elle dort. Ses
défauts connus sont listés dans [`surfaces.md`](surfaces.md) et devront être
corrigés avant toute reprise.

**Le téléphone** vient après, et seulement si l'app installée depuis le
navigateur montre ses limites à l'usage. Aujourd'hui elle ne les montre pas.

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
