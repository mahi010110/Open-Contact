# Table de passage : de l'interface actuelle à l'app simple

*16 novembre 2026. Demandée par `docs/brief-refonte.md` §9, avant le
premier lot de maquettes. Chaque capacité marquée `WEB` dans `CLAUDE.md`
§0 et dans `docs/surfaces.md` a ici sa nouvelle place. Ce qui quitte
l'écran est dit, avec sa raison. Rien ne disparaît en silence.*

La nouvelle app a quatre onglets fixes : **Trouver · Pistes · Réseau ·
Moi**. Une entreprise et une piste sont des **pages**, poussées depuis
leur liste, avec un retour.

Le « lot » dit dans quelle maquette la place se dessine
(`docs/brief-refonte.md` §9). Une place est **proposée** tant que son lot
n'a pas été montré au mainteneur.

## Les capacités du web

| Capacité (`CLAUDE.md` §0) | Sa place dans l'app simple | Lot |
|---|---|---|
| « À découvrir » : l'annuaire public depuis la barre | **Trouver**, l'onglet d'ouverture : une phrase (ma formation, ce que je cherche, ma ville), une barre, une liste | 1 |
| La carte de l'entreprise (annuaire, BODACC, Wikidata, Wikipédia) | **La page d'une entreprise**, depuis Trouver ; la même carte, repliée, dans la page d'une piste | 1, 2 |
| « À qui écrire » | La page d'une entreprise, bloc « À qui écrire » ; puis « Les gens » de la piste | 1, 2 |
| Offres d'alternance (La bonne alternance), offres de stage (HelloWork) | Un lien à la fin de la liste de Trouver | 1 |
| « Autour de » : ma ville, mon rayon | Le troisième trou de la phrase de Trouver ; la même phrase dans Moi | 1, 4 |
| « Pas pour moi » | Le pied de la page d'une entreprise ; au glissé sur une ligne ; « Annuler » après | 1 |
| L'aide à l'embauche d'un apprenti | La page d'une entreprise, ligne « Aide » | 1 |
| Capture, anti-doublon | **La barre de Trouver** : taper un nom, l'annuaire le reconnaît, « Garder » ; sinon « Garder tel quel ». Une entreprise déjà gardée se dit « dans tes pistes » et ouvre sa piste | 1 |
| Pistes, fiches, suivi, prochaine action, clôture | **Pistes** : « À faire » en tête, puis les pistes par étape. **La page d'une piste** : la suite, « Il s'est passé quelque chose ? », les gens, l'entreprise, l'historique, mes notes | 2 |
| Rappel par l'agenda du téléphone | La page d'une piste, au moment où une date se pose | 2 |
| Écrire un mail (`mailto:`, copier, « Envoyée ✓ ») | La page d'une piste, « Écrire » : quatre canaux (mail, LinkedIn, appel, site) | 2 |
| Postuler à plusieurs d'affilée | Pistes, « À contacter » : écrire aux N, une par une | 2 |
| « Mon parcours », la ligne « Expérience » du mail | Moi › Mon profil ; le message | 4, 2 |
| Bac « à rattacher » | Pistes, en bas, seulement s'il contient quelque chose | 2 |
| « Depuis mes e-mails » | Pistes, en bas, à côté du bac | 2 |
| Donner et recevoir (QR, fichier `.oc`, coller) | **Réseau** : Donner · Recevoir | 3 |
| Les groupes | Réseau : une conversation parmi les autres ; « Groupe » pour ses réglages | 3 |
| Amis, « Mes amis », s'écrire | Réseau. Ce qu'un ami ouvre se lit aussi sur la ligne et la page d'une entreprise, et sur la piste | 1, 2, 3 |
| « Je peux aider » ; « Décroché » qui propose d'aider | Moi ; la clôture « Signé » d'une piste | 4, 2 |
| Demander à ses amis et à ses groupes ; la suivre comme un colis ; présenter | « Les gens » d'une piste pour demander ; Réseau, « Mes demandes », pour suivre | 2, 3 |
| Demander un métier et une ville | Réseau, « Demander » | 3 |
| Sync entre mes appareils | Moi › Mes appareils | 4 |
| La phrase de secours | Moi › Ma copie | 4 |
| CV et lettres, modèles d'e-mails | Moi | 4 |
| Copie, restauration, verrouillage | Moi › Ma copie ; Moi › Réglages | 4 |

## Ce que l'interface actuelle porte en plus

| Aujourd'hui | Sa place | Lot |
|---|---|---|
| Chercher dans mes pistes (barre, étiquettes, « Affiner », tri) | La barre de Pistes | 2 |
| « Par où commencer », « Sans nouvelles », « Tes amis » | « À faire », en tête de Pistes : trois lignes au plus | 2 |
| « Karim et Léa t'ont écrit » | L'onglet Réseau, qui change de couleur ; la liste des conversations | 3 |
| « Reçues, jamais reprises », l'historique des échanges | Pistes, « À contacter », avec qui les a données ; l'historique dans Réseau | 2, 3 |
| « J'y suis passé » | La page d'une piste ; Moi › Mon parcours | 2, 4 |
| Thème, installer l'app, effacer cet appareil, aide et confidentialité, diagnostic | Moi › Réglages | 4 |
| L'écran verrouillé, le premier jour, le hors ligne, les erreurs | Leurs propres maquettes | 5 |
| Le tableau à trois colonnes, les raccourcis clavier | Le poste, pensé comme un établi | 6 |

## Ce qui quitte l'écran

| Quoi | Pourquoi |
|---|---|
| L'onglet « Aujourd'hui » | Son travail (dire quoi faire) passe en tête de Pistes. Un seul endroit répond à « je fais quoi maintenant » |
| Le bouton « + » et la feuille « Nouvelle piste » | La barre de Trouver fait la même chose : un nom tapé devient une piste. Une entrée au lieu de deux |
| Les feuilles empilées (fiche sur liste, feuille sur fiche) | Une entreprise et une piste sont des pages. Les feuilles restent pour une question courte |
| L'onglet de texte « Mes pistes · À découvrir » | Deux onglets fixes le remplacent : Pistes et Trouver |
| La marque « nouveau » sur une entreprise | Elle ne marque presque jamais rien. Le moteur garde `oc_vus_v1` ; elle revient si une liste change vraiment |

Aucune clé de stockage ne bouge, aucun module du moteur n'est retiré.
Les capacités marquées `PC` ou `⏸` restent masquées, comme aujourd'hui.

*Tranché par l'assistant, à valider par le mainteneur :* toutes les
places « proposées », lot par lot, et la liste de ce qui quitte l'écran.
