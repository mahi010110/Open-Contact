# 0001 — Recadrer par lots, sans réécrire

**Statut** : acceptée par le mainteneur, 19 octobre 2026.

## Contexte

Le mainteneur a fixé le cap en cinq phrases : une app qui aide, soutient
et accompagne ceux qui cherchent ; la ressource la plus importante, ce
sont les contacts en entreprise ; sociale, mais utile, jamais gadget ;
comprendre quoi faire sans explication ; et garder le suivi de
candidature.

L'app de la 6.76 tient chaque morceau, mais pas l'ensemble. Chaque lot
était juste pris seul ; ensemble, ils ont créé plusieurs chemins pour un
même geste :

- les amis vivent dans « Mes pistes », leurs messages dans « Échanger »,
  leurs demandes sur la fiche ;
- on reçoit dans « Échanger », on scanne depuis trois endroits ;
- il y a cinq façons de donner une piste et cinq de demander quelqu'un ;
- la partie sociale et le transport pèsent environ 9 800 lignes, contre
  6 700 pour le cœur.

Les utilisateurs actuels ont des données sur leurs appareils, et aucune
ne doit se perdre (`CLAUDE.md` §2, §10).

## Décision

On garde l'app, son code et toutes les données. On la remet en ordre
**morceau par morceau** : c'est le « figuier étrangleur » de Martin
Fowler. Le nouveau pousse autour de l'ancien et prend sa place partie
par partie. L'ancien s'en va quand plus rien ne s'en sert.

- **Dix lots, un à la fois** (R0 à R9, détaillés dans `docs/recadrage.md`),
  chacun avec un temps maximal accordé, jamais prolongé (Basecamp,
  *Shape Up*).
- **Élargir, migrer, resserrer** pour toute donnée ou tout chemin qui
  change (Fowler, *Parallel Change*). Jamais les trois d'un coup.
- **Caché jusqu'à preuve** : chaque lot arrive derrière un drapeau
  (décision 0004) et ne s'ouvre à tous qu'après un test avec de vraies
  personnes.
- **Mesuré avant, mesuré après** : six parcours joués par cinq étudiants
  sur l'app actuelle (`docs/mesure/protocole.md`), puis sur chaque lot.

## Conséquences

- Aucune réécriture d'un bloc : chaque fusion dans main reste une app
  qui marche, et chaque lot peut s'éteindre.
- Deux chemins coexistent pendant chaque préversion. C'est le coût, et
  la date de retrait de chaque drapeau le borne.
- Le rythme dépend des tests utilisateurs, pas seulement du code. Un lot
  qui ne passe pas son test est corrigé ou arrêté, jamais ouvert « pour
  voir ».
- Les quatre questions du recadrage — Atteindre, Agir et suivre, Tenir,
  Garder la main — deviennent le filtre de toute fonctionnalité : une
  idée qui ne renforce ni le savoir, ni le pouvoir, ni le vouloir de l'un
  des trois gestes qui comptent (écrire à quelqu'un de l'intérieur,
  relancer, tenir) est un gadget (modèle COM-B, Michie et al., 2011).
