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

/* IA par clé navigateur (Claude, Gemini, OpenRouter). Aucune
   installation, aucune démarche du mainteneur : elle reviendra ICI. */
export const IA = true;

/* Envoi direct OAuth (Gmail, Outlook). Reporté au titre de la
   question ② : il engage le mainteneur dans une démarche permanente
   chez un fournisseur. `mailto:` reste le chemin de tout le monde. */
export const ENVOI_DIRECT = false;
