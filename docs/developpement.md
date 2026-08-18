# Développement

> **Le dépôt n'accepte pas de contributions extérieures** — voir
> [`LICENSE`](../LICENSE). Ce document existe pour que le code soit
> vérifiable et pour servir de mémoire au projet.

---

## Lancer l'app

Aucune étape de build. Aucune dépendance à installer.

```sh
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>.

Le petit serveur est indispensable : l'app est faite de modules ES, et
ouvrir `index.html` par un chemin de fichier (`file://`) ne fonctionne pas.

## Lancer les tests

**Les auto-tests du moteur**, dans le navigateur : ajouter `?test` à
l'adresse — <http://localhost:8000/?test>. Le résultat s'affiche en console
et en toast. Ils doivent être **100 % verts**, toujours.

**Tout, sans navigateur à piloter à la main** :

```sh
node tests/e2e/unitaires.mjs      # les auto-tests du moteur (122)
node tests/e2e/tous.mjs           # tout : unitaires + 29 scénarios
node tests/e2e/e2e-verrou.mjs     # un seul scénario
```

Prérequis : Node ≥ 20 et Playwright avec un Chromium. La résolution est
automatique ; elle se force par `OC_PLAYWRIGHT` et `OC_CHROMIUM`. Le détail
de chaque scénario — et ce qu'il prouve — est dans
[`tests/e2e/README.md`](../tests/e2e/README.md). « Chaque » est vérifié :
`tous.mjs` refuse de démarrer tant qu'un scénario n'y est pas décrit, avant
même de construire quoi que ce soit.

Le résumé distingue **joués**, **sautés** et **échoués**. Un scénario sauté
n'est pas un scénario vert : les scénarios de la surface ordinateur sont
sautés tant que son binaire n'est pas construit, et ceux des capacités
masquées le sont selon les drapeaux de `ui/perimetre.js`.

---

## L'architecture en dix lignes

**Une règle de sens unique gouverne tout le code :**

```
ui/  ──appelle──▶  engine/
     ◀──jamais───
```

- **`engine/`** — le moteur : modèle, stockage, fusions, chiffrement, score,
  filtres. **Fonctions pures, aucun accès au DOM ni à l'écran.** Toute
  logique métier testable vit ici.
- **`ui/`** — les écrans, un fichier par écran ou par feuille. L'interface
  appelle le moteur ; le moteur ignore qu'une interface existe.

Ce n'est pas de la propreté gratuite : c'est ce qui permet à la surface
ordinateur d'exécuter **le même moteur** que le web sans le réécrire. Cette
séparation reste, quoi qu'il arrive aux surfaces.

## Les fichiers qui font autorité

| | |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | La référence produit & UI/UX. Direction, invariants, design, catalogue des motifs d'interaction. **Aucune décision d'interface ne se prend en dehors de ce cadre.** |
| [`CONTRAT.md`](../CONTRAT.md) | Le contrat de données : clés de stockage, formats `.oc` et OCQ, schémas, invariants de fusion. Vérifié par les auto-tests. |

Deux règles en découlent, et elles ne se négocient pas :

- **On ne renomme jamais une clé de stockage.** Un format qui évolue = une
  clé nouvelle + une migration en lecture. C'est ce qui garantit qu'une mise
  à jour ne fait perdre les données de personne.
- **Toute évolution du contrat se fait dans `CONTRAT.md` ET dans `tests.js`
  dans le même geste.** Un document qui décrit autre chose que le code ne
  protège rien.

## Le service worker

`sw.js` sert l'app hors ligne. **Chaque livraison qui touche un fichier
précaché incrémente `CACHE` (`oc-vN`) et met à jour `PRECACHE`.** Oublier ce
geste, c'est servir l'ancienne version à tous ceux qui ont déjà ouvert l'app.

---

## Avant de livrer

1. Le moteur d'abord (fonctions pures + tests), l'interface ensuite.
2. **Vérifier en lançant réellement** — 390 × 844 **et** 1280 × 800, thème
   clair **et** sombre, zéro erreur console. On ne livre pas sur la foi
   d'une relecture.
3. `?test` : tous les auto-tests verts, y compris les nouveaux.
4. `CONTRAT.md` à jour si une clé, un format ou un invariant a bougé.
5. `sw.js` : `oc-vN` incrémenté si un fichier précaché a changé.
6. Textes relus, thème sombre vérifié, cibles tactiles ≥ 44 px au doigt.
7. `e2e-sobriete.mjs` vert. Une couche de plus — un toast, une
   confirmation, une phrase d'explication — ne passe qu'en montant un
   plafond **dans ce fichier**, exprès. C'est ce qui empêche une passe de
   nettoyage de se défaire toute seule, un « juste un toast » à la fois.
8. Commits en français, descriptifs, focalisés.

## L'intégration continue

`.github/workflows/ci.yml` produit quatre signaux séparés, du plus rapide au
plus complet :

| | |
|---|---|
| **pwa** | Les auto-tests du moteur dans un vrai Chromium |
| **transport** | Les relais publics réellement utilisés par l'app sont-ils joignables — la CI rougit si le transport public meurt, même sans commit |
| **compagnon** | `cargo test` + construction du binaire natif |
| **scenarios** | La suite de bout en bout entière, liaison pair-à-pair jouée avec deux vrais navigateurs et un relais local |

Aucun secret n'est requis : tout tourne contre des doubles locaux, sauf la
sonde de transport, qui parle volontairement au monde réel.
