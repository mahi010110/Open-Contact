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
| « À découvrir » : l'annuaire public depuis la barre | **Trouver**, l'onglet d'ouverture : trois questions le premier jour (ce que je cherche, ce que j'étudie, ma ville), puis une barre et une liste | 1 |
| La carte de l'entreprise (annuaire, BODACC, Wikidata, Wikipédia) | **La page d'une entreprise**, depuis Trouver ; la même carte, repliée, dans la page d'une piste | 1, 2 |
| « À qui écrire » | La page d'une entreprise, bloc « À qui écrire » ; puis « Les gens » de la piste | 1, 2 |
| Offres d'alternance (La bonne alternance), offres de stage (HelloWork) | Un lien à la fin de la liste de Trouver | 1 |
| « Autour de » : ma ville, mon rayon | La troisième question de Trouver, qui se rouvre d'un tap sur « Lille · 15 km » ; les mêmes réponses dans Moi › Mon profil | 1, 4 |
| « Pas pour moi » | Le pied de la page d'une entreprise ; au glissé sur une ligne ; « Annuler » après | 1 |
| L'aide à l'embauche d'un apprenti | La page d'une entreprise, ligne « Aide » | 1 |
| Capture, anti-doublon | **La barre de Trouver** : taper un nom, l'annuaire le reconnaît, « Garder » ; sinon « Garder tel quel ». Une entreprise déjà gardée se dit « dans tes pistes » et ouvre sa piste | 1 |
| Pistes, fiches, suivi, prochaine action, clôture | **Pistes** : « À faire » en tête, puis les pistes par étape. **La page d'une piste** : la suite, « Il s'est passé quelque chose ? », les gens, l'entreprise, l'historique, mes notes | 2 |
| Rappel par l'agenda du téléphone | La page d'une piste : « Rappel dans mon agenda » après un envoi, « Ajouter à mon agenda » quand un entretien a sa date | 2 |
| Écrire un mail (`mailto:`, copier, « Envoyée ✓ ») | « Écrire », poussé depuis la piste : quatre canaux (mail, LinkedIn, appel, site), puis « C'est parti ? » sur la piste | 2 |
| Postuler à plusieurs d'affilée | Après un envoi, « Suivante : … » ouvre le message de la piste suivante à contacter | 2 |
| « Mon parcours », la ligne « Expérience » du mail | Moi › Mon profil (une expérience se rouvre pour être modifiée ou retirée) ; le message, avec l'école, le téléphone, le rythme et le lien du CV | 4, 2 |
| Bac « à rattacher » | Pistes, en bas, seulement s'il contient quelque chose (pas encore dessiné) | 2 |
| « Depuis mes e-mails » | Pistes, en bas, à côté du bac (pas encore dessiné) | 2 |
| Supprimer une piste, la clore | Au glissé dans Pistes, avec « Annuler » ; « C'est non » et « Laisser tomber cette piste » sur sa page ; « Rouvrir » une piste terminée | 2 |
| Donner et recevoir (QR, fichier `.oc`, coller) | **Réseau** : Donner (les pistes, puis groupe, QR, fichier ou texte) · Recevoir (QR, fichier, texte, puis l'aperçu et « Annuler ») | 3 |
| Les groupes | Réseau : une conversation parmi les autres ; la ligne des membres ouvre « Groupe » (Inviter, membres, Quitter) ; « Rejoindre ma classe » ou « Nouveau groupe » ferme la liste | 3 |
| Amis, « Mes amis », s'écrire | Réseau : la page d'un ami (ce qu'il t'ouvre, « Écrire à … », « Retirer ») ; « Ajouter un ami » ferme la liste (son QR, « Scanner le sien »). Ce qu'un ami ouvre se lit aussi dans Trouver et sur la piste | 1, 2, 3 |
| « Je peux aider » ; « Décroché » qui propose d'aider | Moi › Mon profil, sous « Ce que tes amis voient » ; la clôture « Signé » d'une piste | 4, 2 |
| Demander à ses amis et à ses groupes ; la suivre comme un colis ; présenter | « Les gens » d'une piste pour demander ; Réseau, « Mes demandes » en tête, pour suivre et ajouter le contact reçu ; « Répondre » sur la demande d'un camarade | 2, 3 |
| Demander un métier et une ville | Réseau, « Demander quelqu'un » : un métier et la ville, ou une piste sans contact | 3 |
| Sync entre mes appareils | Moi › Ma copie › Mes appareils : « Relier un autre appareil » (chacun montre son QR et scanne celui de l'autre), « Retirer cet appareil » sur sa ligne | 4 |
| La phrase de secours | Moi › Ma copie : la créer ; « Restaurer une copie › Avec ma phrase de secours », l'aperçu, puis « Annuler » | 4 |
| CV et lettres, modèles d'e-mails | Moi › CV et lettres (et le lien vers le CV, qui part dans le mail) ; Moi › Mes messages types | 4 |
| Copie, restauration, verrouillage | Moi › Ma copie (« Télécharger », « Chiffrer », « Restaurer une copie » par l'aperçu) ; Moi › Réglages › Code de verrouillage | 4 |

## Ce que l'interface actuelle porte en plus

| Aujourd'hui | Sa place | Lot |
|---|---|---|
| Chercher dans mes pistes (barre, étiquettes, « Affiner », tri) | La barre de Pistes | 2 |
| « Par où commencer », « Sans nouvelles », « Tes amis » | « À faire », en tête de Pistes : trois lignes au plus | 2 |
| « Karim et Léa t'ont écrit » | L'onglet Réseau, qui change de couleur ; la liste des conversations | 3 |
| « Reçues, jamais reprises », l'historique des échanges | Pistes, « À contacter », avec qui les a données ; l'historique dans Réseau | 2, 3 |
| « J'y suis passé » | La page d'une piste ; Moi › Mon profil › Mon parcours | 2, 4 |
| Thème, installer l'app, effacer cet appareil, aide et confidentialité, diagnostic | Moi › Réglages : chaque ligne dit son état et ouvre ses choix | 4 |
| « Demandes de mes amis » (les faire suivre ou non) | Moi › Réglages | 4 |
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

*Validé par le mainteneur :* les places des lots 1 à 4 (17 novembre 2026).
*Tranché par l'assistant, à valider :* les places des lots suivants, et
la liste de ce qui quitte l'écran.
