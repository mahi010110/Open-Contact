/* ============================================================
   OpenContact — le périmètre visible (CLAUDE.md §0)

   Le recentrage de juillet 2026 : ce qui appartient au
   Compagnon, ou ce qui est reporté par choix, est PRÉSENT dans
   le code mais MASQUÉ à l'écran.

   Rien n'est supprimé. Aucune clé de stockage ne bouge. Aucune
   donnée déjà enregistrée n'est perdue : une clé d'IA ou un
   jeton de messagerie en place reste lisible et scellé,
   simplement plus affiché.

   Remettre une capacité à l'écran = passer son drapeau à
   `true`, rien d'autre. La suppression franche se décidera
   après la première bêta — jamais dans le même geste que le
   masquage.
   ============================================================ */

/* ---- Colonne PC : surface ordinateur (installation requise) ---- */

/* Tout ce qui exige une application installée : travail fenêtre fermée,
   analyse automatique de la boîte mail, IA locale, serveur MCP. */
export const COMPAGNON = false;

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
