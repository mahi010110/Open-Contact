/* ============================================================
   OpenContact — le périmètre visible (CLAUDE.md §0)

   Le recentrage de juillet 2026 : ce qui appartient au
   Ordinateur, ou ce qui est reporté par choix, est PRÉSENT dans
   le code mais MASQUÉ à l'écran.

   Rien n'est supprimé. Aucune clé de stockage ne bouge. Aucune
   donnée déjà enregistrée n'est perdue : une clé d'IA ou un
   jeton de messagerie en place reste lisible et scellé,
   simplement plus affiché.

   Remettre une capacité à l'écran = passer son drapeau à
   `true`, rien d'autre. La suppression franche se décidera
   après la première bêta — jamais dans le même geste que le
   masquage.

   À côté du périmètre, les drapeaux de LIVRAISON du recadrage
   (engine/drapeaux.js) : un lot arrivé dans main mais pas encore
   vérifié avec de vraies personnes. Ceux-là ont une date de retrait,
   et s'allument sur un appareil en préversion (`lot`, ui/state.js).
   Ce fichier-ci n'importe RIEN : tests/e2e/tous.mjs le lit sous Node
   pour savoir quels scénarios sauter.
   ============================================================ */

/* ---- Colonne PC : surface ordinateur (installation requise) ---- */

/* Tout ce qui exige une application installée : travail fenêtre fermée,
   analyse automatique de la boîte mail, IA locale, serveur MCP. */
export const ORDINATEUR = false;

/* Campagnes : séquence 1 message + 2 relances, plafond quotidien,
   fenêtre d'envoi, arrêt sur réponse. Le moteur et les écrans restent
   testés ; ils attendent la surface ordinateur. */
export const CAMPAGNES = false;

/* ---- Colonne ⏸ : passe la règle, reporté par choix de périmètre ---- */

/* Brouillon IA par clé navigateur (Claude, Gemini, OpenRouter) : la ligne
   « Mon assistant IA » des réglages et le bouton « Proposer un brouillon »
   du composeur. Rallumé puis rééteint le 2 août 2026 — il passe la règle,
   mais il demande de comprendre ce qu'est une clé d'API avant de rendre
   quoi que ce soit. Aucune installation, aucune démarche du mainteneur :
   il reviendra ICI, jamais sur la surface ordinateur.

   Ne commande PAS « Depuis mes e-mails » (capture → recevoir.js) : cette
   source ne fait qu'un aller-retour de texte par le presse-papier, sans
   clé ni appel réseau. Elle est de partout, sans drapeau. */
export const IA = false;

/* Envoi direct OAuth (Gmail, Outlook). Reporté au titre de la
   question ② : il engage le mainteneur dans une démarche permanente
   chez un fournisseur. `mailto:` reste le chemin de tout le monde. */
export const ENVOI_DIRECT = false;

/* ---- Remplacé par mieux ---- */

/* « Partage en groupe » EN DIRECT : un mot de passe commun, tout le monde
   connecté au même instant. Les groupes (lot 5, décision 22) font la même
   chose sans être là en même temps — on y donne des pistes, chacun les
   reçoit à sa prochaine ouverture. Le direct et ses scénarios restent :
   ils gardent le transport en direct que le rendez-vous QR emploie aussi. */
export const PARTAGE_DIRECT = false;
