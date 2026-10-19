# 0007 — L'envoi direct sur le web passe par la vérification Google

**Statut** : proposée, en attente du mainteneur. En attendant, l'envoi
direct reste masqué (`ENVOI_DIRECT`, `ui/perimetre.js`) et `mailto:`
reste le chemin de tout le monde.

## Contexte

Le code de l'envoi direct existe (`engine/mailer.js`), masqué. La règle ②
de `CLAUDE.md` §0 le reporte : il engage le mainteneur dans une démarche
chez Google et Microsoft.

Envoyer depuis Gmail demande une permission « sensible ». Au-delà de 100
utilisateurs, comptés pour toute la vie de l'app, Google doit la
vérifier. Il faut un nom de domaine à soi, une page de confidentialité
(elle existe) et une courte vidéo. Les prestataires parlent de 2 à 8
semaines. Outlook demande une démarche du même genre chez Microsoft.
Lire les réponses est une permission « restreinte », avec un audit de
sécurité payant chaque année : le web ne le fera pas. L'application
ordinateur le fait déjà, par la messagerie de l'utilisateur.

## Décision proposée

Faire la vérification Google une fois, sans urgence : le lot R6 ne
bloque rien, le lien mail reste. Livrer l'application ordinateur pour
ceux qui veulent que les séries partent sans eux.

## Conséquences

- La règle ② doit être levée pour ce cas précis, dans `CLAUDE.md`, le
  jour où le mainteneur valide.
- Avant d'ouvrir l'envoi : la seule permission « envoyer », les jetons
  sous le coffre (déjà le cas), une revue de sécurité ciblée, et
  « Annuler » pendant 10 secondes.
- Si la vérification tarde ou échoue, rien n'est perdu : le lien mail
  et l'application ordinateur restent les deux chemins.
