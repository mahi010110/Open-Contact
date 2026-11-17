# Les outils de la maquette

Pour vérifier et montrer la maquette de la refonte (`../index.html`).
Ils servent Chromium, celui de `tests/e2e/outils.mjs` ; rien ne part sur
le réseau. Le reste de la méthode est dans `docs/refonte-reprendre.md`.

| Fichier | À quoi il sert |
|---|---|
| `maquette.mjs` | ouvre la maquette comme un téléphone ou un ordinateur : `lancer()` puis `ouvrir(largeur, hauteur, sombre, téléphone, { calme })` |
| `jouer-lot1.mjs` … `jouer-lot4.mjs` | rejouent les gestes d'un lot, écrivent leurs captures, finissent par « ERREURS 0 » |
| `planche.mjs` | pose l'avant au-dessus de l'après, la planche montrée au mainteneur |
| `planches-lot4.mjs` | les planches du lot 4 : le modèle à copier pour un lot suivant |

```sh
# après chaque changement de la maquette : les quatre, pas seulement le dernier
for n in 1 2 3 4; do node design/maquettes/app/outils/jouer-lot$n.mjs; done

# les captures de l'app actuelle (l'avant des planches), puis les planches
OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs
node design/maquettes/app/outils/planches-lot4.mjs /tmp/planches
```

Les captures vont dans un dossier temporaire (`/tmp/oc-maquette/lotN`)
si on n'en donne pas. Une capture se **regarde** : la suite verte ne dit
pas qu'un écran est bien.
