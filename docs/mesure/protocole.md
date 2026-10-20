# La mesure : six parcours, cinq étudiants

**Ce protocole mesure l'app avec de vraies personnes, sans rien
collecter.** Il se joue une première fois sur l'app actuelle (la mesure
de départ, lot R0), puis sur chaque lot en préversion. Les chiffres se
comparent d'un tour à l'autre : c'est ce qui dit si un lot fait mieux.

Pourquoi cinq : cinq personnes par tour trouvent l'essentiel des
problèmes d'un écran (Nielsen). On corrige, puis on refait un tour.

## Avant la séance

- **Cinq étudiants** qui cherchent un stage, une alternance ou un emploi,
  si possible pas ceux qui ont vu l'app se construire.
- **Un téléphone préparé, le jour même**, avec le jeu de la séance :
  `node tests/mesure/jeu-de-test.mjs` écrit une copie (`jeu-de-test.oc`)
  à restaurer par « Moi › Réglages › Restaurer une copie ». C'est le
  profil d'Inès Martin, en BTS SIO à Lille, avec neuf pistes et un ami,
  Karim, passé par Thales. Les dates sont relatives au jour du script :
  une relance en retard l'est le jour de la séance. Pas « Voir un
  exemple » : ses pistes ne se donnent pas, et le parcours 6 échouerait
  pour une raison qui n'est pas la personne. Pour le tour de
  l'ordinateur, un poste préparé de la même façon.
- **Un second appareil**, celui de l'animateur, pour recevoir au
  parcours 6.
- **Le consentement, à voix haute** : « On teste l'app, pas toi. Rien
  n'est enregistré par l'app. Je note ce que tu fais et où tu hésites.
  Tu peux arrêter quand tu veux. » Pas d'enregistrement vidéo sans
  accord écrit ; si accord, la vidéo est effacée après le compte rendu.
- **Ne jamais aider pendant une tâche.** Si la personne demande, on
  répond « fais comme tu ferais seul ». Une tâche abandonnée est une
  mesure, pas un échec de la personne.

## Les six parcours

Chacun se lit tel quel, sans les mots de l'interface quand ils
trahiraient la réponse.

| # | Ce qu'on demande | Réussi quand |
|---|---|---|
| 1 | « Tu viens d'entendre parler de Sopra Steria à Lille. Garde-la pour plus tard. » | la piste existe avec sa ville |
| 2 | « Tu veux quelqu'un qui pourrait te présenter chez Thales. Essaie de le trouver. » | la personne trouve Karim sur la fiche de Thales et ouvre « Demander à Karim » |
| 3 | « Écris ton premier mail à Worldline. » | le composeur s'ouvre sur Worldline et le mail part (ou « Ouvrir dans Mail ») |
| 4 | « Où en est ta candidature chez Advens, et que dois-tu faire ensuite ? » | la personne dit « en cours » et « relancer Claire, en retard », sans hésiter plus de 30 s |
| 5 | « Tu sors d'un entretien chez Aztek. Note-le et prévois la suite. » | le statut passe à « Réponse » et une prochaine action est planifiée |
| 6 | « Donne tes trois meilleures pistes à Karim, assis à côté de toi. » | trois pistes arrivent chez Karim (QR, fichier ou texte), aperçu compris |

## Ce qu'on note, par parcours

- **Réussi seul** : oui, avec hésitation, ou non.
- **Le temps**, du dernier mot de la consigne au geste qui réussit.
- **Où ça hésite** : l'écran, et ce que la personne a cherché.
- **Le SEQ**, une question posée juste après la tâche : « Dans
  l'ensemble, cette tâche était… » de 1 (très difficile) à 7 (très
  facile) (MeasuringU).

## À la fin de la séance

Le **SUS**, dix questions, en français. La moyenne des logiciels est à
68 ; on vise plus de 80 à la bascule 7.0.

1. Je pense que j'aimerais utiliser cette app souvent.
2. J'ai trouvé l'app inutilement compliquée.
3. J'ai trouvé l'app facile à utiliser.
4. Je pense que j'aurais besoin d'aide pour me servir de cette app.
5. J'ai trouvé que les différentes fonctions de l'app étaient bien
   intégrées.
6. J'ai trouvé qu'il y avait trop d'incohérences dans l'app.
7. J'imagine que la plupart des gens apprendraient très vite à se servir
   de cette app.
8. J'ai trouvé l'app très lourde à utiliser.
9. Je me suis senti·e en confiance en utilisant l'app.
10. J'ai dû apprendre beaucoup de choses avant de pouvoir me servir de
    cette app.

Chaque réponse de 1 (pas du tout d'accord) à 5 (tout à fait d'accord).
Le score : pour les questions impaires, réponse − 1 ; pour les paires,
5 − réponse ; la somme, multipliée par 2,5, donne un score sur 100.

## Le compte rendu d'un tour

Un fichier par tour, `docs/mesure/AAAA-MM-JJ-<lot>.md`, sans aucun nom de
testeur (T1 à T5) :

| parcours | réussis seuls | temps médian | SEQ moyen | où ça hésite |
|---|---|---|---|---|
| 1 | /5 | | | |
| … | | | | |

Puis le SUS moyen, et les trois problèmes les plus graves, chacun avec
l'écran, ce qui s'est passé et ce qu'on propose. Un lot passe sa porte
quand au moins 4 personnes sur 5 réussissent seules chaque parcours et
que le SEQ moyen dépasse celui de la mesure de départ.
