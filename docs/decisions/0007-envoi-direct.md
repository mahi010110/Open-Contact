# 0007 — L'envoi direct sur le web passe par la vérification Google

**Statut** : **close sans être faite**, par choix du mainteneur, le
27 octobre 2026 : « garder le lien mail ». Le lot R6 sort du recadrage ;
l'envoi direct reste masqué dans le code, et la 7.0.0 se livre sans lui.

*Avant : **reportée** par le mainteneur le 20 octobre 2026.* La
vérification Google n'est pas lancée ; l'envoi direct reste masqué
(`ENVOI_DIRECT`, `ui/perimetre.js`), `mailto:` reste le chemin de tout le
monde, et le lot R6 passe après les autres. L'application ordinateur
enverra par la messagerie de l'utilisateur, sans démarche. La décision
proposée plus bas reste écrite telle quelle : c'est elle qu'on rouvrira.

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

## La réponse du mainteneur (20 octobre 2026)

Reporter. La règle ② de `CLAUDE.md` §0 tient : rien n'engage le
mainteneur dans une démarche chez Google ou Microsoft pour l'instant. On
passe au lot R7.

## La réponse du mainteneur (27 octobre 2026)

Garder le lien mail. Le recadrage se termine sans R6 : la 7.0.0 ouvre
tous les autres lots, et `mailto:` reste le seul chemin du web. Rien ne
se perd — le code de l'envoi direct dort derrière `ENVOI_DIRECT`, et
cette fiche garde la démarche à suivre le jour où la question revient.
La règle ② de `CLAUDE.md` §0 n'est pas levée.
