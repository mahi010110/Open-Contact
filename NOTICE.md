# Composants tiers

OpenContact est un logiciel propriétaire (voir [`LICENSE`](LICENSE)), mais il
ne part pas de rien : il incorpore du travail écrit par d'autres.

**Ces composants ne sont pas couverts par la licence d'OpenContact.** Chacun
reste la propriété de son auteur et demeure régi par ses propres termes. Ces
termes exigent que l'attribution soit conservée — c'est l'objet de ce fichier.

Rien n'est chargé depuis un réseau : tout est copié dans le dépôt, avec sa
licence (invariant ④ — l'app démarre hors ligne).

---

## Bibliothèques — `assets/vendor/`

| Composant | Version | Licence | Auteur | Rôle |
|---|---|---|---|---|
| [Trystero](https://github.com/dmotz/trystero) | 0.25.3 (canal Nostr) | MIT | Dan Motzenbecker | Le transport pair-à-pair : sync entre mes appareils, partage en groupe |
| [jsQR](https://github.com/cozmo/jsQR) | — | **Apache 2.0** | Cosmo Wolfe | Lire un QR code avec la caméra |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) | 1.5.0 | MIT | Kazuhiko Arase | Afficher une piste en QR code |

Texte intégral des licences : `assets/vendor/LICENSE-trystero.txt`,
`LICENSE-jsQR.txt`, `LICENSE-qrcode-generator.txt`.

Empreintes SHA-256 de chaque fichier : `assets/vendor/VERSIONS.txt`. Une
empreinte qui change sans mise à jour volontaire signale un fichier altéré.

Aucun de ces trois composants n'a été modifié. Trystero est reconstruit depuis
la source npm avec esbuild ; la commande exacte est consignée dans
`VERSIONS.txt`, ce qui rend la construction reproductible.

## Icônes — `assets/icons/`

| Composant | Licence | Auteur |
|---|---|---|
| [pixelarticons](https://github.com/halfmage/pixelarticons) | MIT | Gerrit Halfmann |

Texte intégral : `assets/icons/LICENSE-pixelarticons.txt`.

C'est le seul jeu d'icônes de l'app. Il n'y a pas d'emoji dans l'interface.

## Polices — `assets/fonts/`

Les trois sont sous **SIL Open Font License 1.1**.

| Police | Auteur | Rôle |
|---|---|---|
| [Silkscreen](https://github.com/googlefonts/silkscreen) | The Silkscreen Project Authors | Les titres pixel |
| [IBM Plex Mono](https://github.com/IBM/plex) | IBM Corp. (nom réservé « Plex ») | Les données, dates, compteurs |
| [Public Sans](https://github.com/uswds/public-sans) | The Public Sans Project Authors | Le texte courant |

Textes intégraux : `assets/fonts/OFL-Silkscreen.txt`,
`OFL-IBMPlexMono.txt`, `OFL-PublicSans.txt`.

L'OFL impose deux choses qui valent d'être dites : ces polices ne peuvent pas
être vendues seules, et un dérivé ne peut pas reprendre leur nom réservé.

## Surface ordinateur — `compagnon/`

L'application de bureau est écrite en Rust (Tauri). Ses dépendances sont
déclarées dans `compagnon/Cargo.toml` et verrouillées dans
`compagnon/Cargo.lock` ; elles sont récupérées à la compilation, pas copiées
ici. Leurs licences respectives s'appliquent.

Cette surface n'est pas livrée aujourd'hui — voir [`docs/surfaces.md`](docs/surfaces.md).

---

## Services extérieurs

OpenContact n'a **aucun serveur**. Deux services publics sont toutefois
sollicités, tous deux facultatifs et tous deux dégradant proprement s'ils sont
injoignables :

- **Relais Nostr publics** — ils servent uniquement à ce que deux appareils se
  trouvent. Les données passent ensuite de pair à pair, chiffrées : le relais
  ne les voit jamais. Ils sont remplaçables par les tiens (`oc_relays_v1`).
- **Nominatim (OpenStreetMap)** — pour retrouver les coordonnées d'une ville.
  Sans lui, la ville reste du texte et rien d'autre ne change. Données sous
  [ODbL](https://www.openstreetmap.org/copyright), © les contributeurs
  OpenStreetMap.

---

*Un composant manquant à cette liste est une erreur, pas une permission.
Signale-la.*
