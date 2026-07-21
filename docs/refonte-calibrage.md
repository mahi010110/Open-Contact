# Refonte OpenContact — journal de calibrage (à deux)

> Décisions de conception **prises ensemble** (mainteneur + assistant) avant
> d'ouvrir le chantier de refonte. Un fork à la fois : position tranchée →
> discussion → décision verrouillée. On ne re-décide pas ce qui est verrouillé.
> S'appuie sur les diagnostics `docs/audit-ux-2026.md` et
> `docs/audit-ux-2026-nouveautes.md`. Rien ici n'est encore codé.

Statut : **en cours de calibrage.**

---

## Décision 1 — Positionnement : deux personnalités selon le contexte (option C)

**Le fork.** OpenContact, c'est un outil simple à puissance cachée (A), une
plateforme riche assumée (B), ou un entre-deux explicite mobile/desktop (C) ?

**Décidé : C.** Deux personnalités selon le contexte — et ce n'est pas une
invention : c'est finir ce que `CLAUDE.md §5` pose déjà (« adaptatif, PAS
responsive »), aujourd'hui à moitié construit (seul « Mes pistes » a une vraie
personnalité desktop ; le reste est la colonne mobile centrée à 640 px).

**La loi de C — « un seul cerveau, deux cockpits ».**
Même moteur, mêmes données, même peau « 98 », **même vocabulaire**. Ce qui
change entre mobile et desktop, ce n'est ni les fonctions ni les mots — c'est
**la surface par défaut** et **ce que chaque contexte met en avant**.

- **Mobile = A = le terrain.** Optimisé pour la boucle de 30 s : capturer,
  « je fais quoi maintenant », agir, échanger en personne (QR). La puissance
  existe mais elle est **atteignable, pas promue**.
- **Desktop = B = le poste de commandement.** Optimisé pour les sessions
  posées : tableau, campagnes, IA, multi-appareils, Compagnon, écriture longue.
  La puissance y est **de premier plan et assumée** — on a la place et le temps.

**Le garde-fou (à ne jamais franchir).** On joue sur **promouvoir vs
atteindre**, **jamais sur amputer**. Tout reste **faisable** depuis le mobile ;
rien n'est « desktop only » **par choix de design**. Seule exception légitime :
quand la **plateforme** l'impose (un téléphone ne peut pas installer une app de
bureau → le Compagnon s'*installe* sur l'ordinateur ; c'est de l'honnêteté, pas
une amputation).

**Bascule.** Personnalité qui change à **901 px, d'un coup** — un seul
breakpoint, pas de zone tiède (plus simple, déjà en place). Cas tablette : non
traité séparément, il tombe d'un côté ou de l'autre du breakpoint.

**Ce que ça résout d'un coup :** C1 (fourre-tout « Moi »), C2 (adaptatif
inachevé), C5 (expertise exposée trop tôt), et une partie des N (nouveautés).

---

## Décision 2 — Navigation : même squelette, découpage *faire / régler* (option A)

Un seul squelette de nav, **identique sur les deux cockpits** (mêmes entrées,
mêmes mots) — sinon on ré-apprend en changeant d'appareil. Découpage de haut
niveau : **faire** vs **régler**.

- **Faire :** Aujourd'hui · Mes pistes · Échanger.
- **Régler : « Moi »**, une seule porte. En haut **Profil & données** (léger,
  pour tous) ; en dessous **Réglages** (verrou, appareils, connexions, IA,
  Compagnon) — replié sur mobile, déployé en colonnes sur desktop.

**4 entrées, pas 5** (option A) : le « régler » reste plié dans « Moi ». Le
split *faire/régler* est le principe d'organisation, pas deux onglets de plus.
La capture **(+)** reste le héros central du mobile.

---

## Décision 3 — Loi de sobriété : l'explication n'a pas sa place

**La règle du regard.** Si un écran a besoin d'une *phrase* pour être compris,
c'est le **design** qui a raté : on **redessine**, on n'**annote** pas.
« Un regard, on comprend. » Cette loi **prime sur tout le reste** et se vérifie
écran par écran.

- **Banni :** tout ce qui *explique comment ou pourquoi* — section « Comment ça
  marche », hints pédagogiques, paragraphes de rassurance, sous-titres qui
  décrivent un bouton.
- **Gardé :** le texte qui *est* l'information — un libellé, un état, un retour.
  **Un mot, jamais une phrase.**
- **Concepts à conséquence** (privé vs partagé, fusion, phrase de liaison) : pas
  de texte non plus — on les règle en **montrant** (état visuel, aperçu qui
  montre au lieu de dire, distinction visuelle nette). Plus fort qu'un
  avertissement.
- Le « c'est quoi / pourquoi / guide complet » part sur un **site séparé**,
  hors application.

---

## Décision 4 — Contenu de « Profil & données »

- **« Comment ça marche » → retiré** de l'app (vers le site séparé). L'aide
  devient du *design*, pas du texte (Décision 3).
- **« Coup de pouce IA » → assistant d'import d'e-mails**, uniquement. La
  bibliothèque de prompts (créer/éditer/supprimer, 8 max, réinitialiser) est
  retirée. Placement final au fork #3.
- **Sauvegarde scindée en deux :**
  - **« Garder une copie »** = geste **ambiant, 1 tap, promu** sur le terrain,
    déclenché par l'état (« N pistes depuis ta dernière copie »), jamais
    culpabilisant, sans jargon « .oc ». Se calme si les appareils sont reliés
    (données déjà en double).
  - **« Restaurer »** = rare + sensible → dans **Réglages**, derrière le verrou.
- **CV & LM → dans « Profil & données », en variantes nommées optionnelles.**
  - Le profil range **0..n documents nommés** (« CV cyber », « LM générale »…).
  - À l'écriture / au montage de campagne : deux sélecteurs indépendants
    **CV : `Aucun ▾`** / **LM : `Aucun ▾`**. « Aucun » est un choix de premier
    rang ; le cas simple reste `Aucun / Mon CV`.
  - **Campagne :** CV/LM au **J0 seulement**, pas aux relances (surchargeable).
    *(appel délégué)*
  - **Vraie pièce jointe PDF** (pas un lien dans le corps) — touche
    `engine/mailer.js`, à cadrer au build. *(appel délégué)*

---

## Prochains forks

3. **Où atterrissent l'IA et les campagnes** — les orphelins. *(en cours)*
4. **Doctrine de l'avancé** — progressive disclosure (prolonge la Décision 3).
5. **Le fil du nouvel arrivant** — les 4 premiers gestes.
