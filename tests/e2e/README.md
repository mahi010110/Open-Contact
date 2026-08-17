# Tests de bout en bout (Playwright)

Outillage de développement — rien ici n'est chargé par l'application.

```
node tests/e2e/tous.mjs          # tout : unitaires (?test) + scénarios
node tests/e2e/e2e-verrou.mjs    # un seul scénario
```

Prérequis : Node ≥ 20 et Playwright avec un Chromium. La résolution est
automatique (`/opt/pw-browsers`, `PLAYWRIGHT_BROWSERS_PATH`) et se force
par `OC_PLAYWRIGHT=<chemin de index.mjs>` / `OC_CHROMIUM=<chemin du
binaire>`. Les captures vont dans `captures/` (non versionné).

| Scénario | Ce qu'il prouve |
|---|---|
| `unitaires.mjs` | Les auto-tests `?test` du moteur — tous verts, zéro erreur console |
| `e2e-verrou.mjs` | Création du profil protégé (code, phrase, sauvegarde bloquante), scellement `OCV1.` vérifié en IndexedDB, mauvais code + délai, clavier, thèmes |
| `e2e-recuperation.mjs` | « Code oublié ? » : phrase prouvée → rotation complète (gén. +1), ancien code refusé, sauvegarde obligatoire |
| `e2e-envoi.mjs` | Envoi direct Gmail intercepté, « Depuis {adresse} », expiration → reconnexion sans perdre le brouillon, `mailto:` intact |
| `e2e-campagne.mjs` | Bifurcation → assistant → contrôle → envois du jour interceptés, plafond, **fenêtre d'envoi (samedi = retenu)**, réponse → relances annulées |
| `e2e-ia.mjs` | « Proposer un brouillon » intercepté, quota (429) proprement, rien de perdu |
| `e2e-analyse.mjs` | « Depuis mes e-mails » : prompt copié, aperçu multi-sélection, lien piégé neutralisé, confiance non transmise |
| `e2e-oauth-sw.mjs` | Le service worker ne détourne jamais `oauth.html` ; le jeton revient par postMessage |
| `e2e-compagnon.mjs` | Appairage du Compagnon contre un faux au protocole exact : mauvais code refusé, clé de canal scellée, anneau (rôle companion), présence, rupture propre |
| `e2e-compagnon-envoi.mjs` | Le VRAI binaire (xvfb) : campagne confiée par l'assistant, envois SMTP réels vers un puits local, kill −9 + relance = zéro doublon, rapport replié, reprise en main — sauté si `compagnon/target` n'est pas construit |
| `e2e-compagnon-reponses.mjs` | Le VRAI binaire + faux IMAP : réponse détectée en boîte → relances arrêtées seules, fiche marquée « réponse » au repli — sauté sans binaire |
| `e2e-compagnon-scan.mjs` | Le VRAI binaire + corpus piégé + faux Ollama : « ton ordinateur lit tes e-mails » → aperçu multi-sélection, injection neutralisée, tri respecté — sauté sans binaire |
| `e2e-ux-audit.mjs` | Priorités de l'audit : actions impossibles désactivées, copie Compagnon mobile, relais avancés, cibles 44 px, doublon orphelin et disponibilité IA honnête |
| `e2e-diagnostic.mjs` | « Signaler un problème » : le rapport tient cinq lignes stables, **aucune donnée personnelle d'un vrai suivi n'y entre**, le presse-papier rend exactement le bloc affiché, tout se lit sans défiler en 390 px — et **ni numéro de version ni adresse d'hébergeur** nulle part, sur l'écran comme dans la source |
| `e2e-sobriete.mjs` | **Les couches ne repoussent pas.** Trois plafonds tenus à la main, sur les écrans visibles : longueur d'un toast (une phrase, un tiret cadratin), nombre de confirmations bloquantes, mots d'explication dans les feuilles. Aucun navigateur — il lit `ui/*.js`. Ajouter une porte ou une phrase oblige à monter le plafond **ici**, exprès |
| `e2e-durabilite.mjs` | **La panne qu'on ne peut pas réparer.** Un suivi complet — les 20 clés persistantes, coffre scellé et anneau d'appareils compris — puis un déploiement réel : tout survit octet pour octet, le thème aussi, et l'app **relit** vraiment ses pistes à l'écran. Sans serveur, ce qui est perdu ici est perdu pour de bon. Le contrôle plante une sonde pour prouver qu'il sait encore échouer |

Le résumé de `tous.mjs` distingue **joués**, **sautés** et **échoués**. Les
trois scénarios vrai-binaire ne sont donc plus comptés comme verts lorsque le
binaire Compagnon (ou `xvfb-run`) manque.
