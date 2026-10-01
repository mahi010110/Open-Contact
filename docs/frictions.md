# Les frictions mises de côté

*Noté le 1er octobre 2026, à la demande du mainteneur : « note-les et
mets-les de côté, on y reviendra plus tard ». Rien n'est décidé ici. La
barre de recherche passe d'abord ([`recherche.md`](recherche.md)).*

---

## Les trois plus grosses, selon le mainteneur

Toutes viennent du même endroit : **l'app aide à suivre, pas encore à
produire.** Les pistes, les mails et l'envoi se font à la main.

### 1. Entrer toutes les pistes à la main

Aujourd'hui, chaque entreprise se tape une par une. « Partager » depuis
LinkedIn ou un navigateur marche sur Android (`share_target`), jamais sur
iPhone : Safari ne l'accepte pas pour une app web (demande ouverte chez
WebKit depuis 2019).

Pistes de solution :

- **« À découvrir »**, déjà conçu (lot 2 de la barre de recherche) : les
  vraies entreprises de l'annuaire officiel, cochées puis ajoutées d'un
  geste. **C'est la barre en cours de construction qui y répond en
  premier.**
- **Coller une liste** (Excel, notes, PDF de l'école) : une ligne, une
  piste, avec l'aperçu habituel avant d'ajouter.
- **Coller une annonce** (le texte copié d'une offre) : l'app y lit le
  nom, la ville, l'email, le type de contrat, et pré-remplit la fiche.
  Sans IA : la même table de mots que la barre de recherche.

### 2. Écrire les mails

Le modèle donne la structure ; l'accroche personnalisée, la phrase la
plus difficile, reste à écrire entreprise par entreprise.

Pistes de solution :

- **Les brouillons par son propre assistant, sans clé ni compte** : un
  bouton prépare la demande (infos de l'entreprise, profil, règles : trois
  phrases, une accroche précise, rien de générique) et la passe à
  l'assistant du téléphone par le menu Partager ; la réponse recollée
  remplit le message. **Une demande peut porter dix entreprises**, et
  l'app range chaque brouillon dans sa piste. C'est le motif de « Depuis
  mes e-mails » (§0) : l'app n'appelle aucune IA, et le crochet reste
  refusé à l'envoi (§7).
- **Plus de matière dans « Écrire »** : le site et l'activité de
  l'entreprise, apportés par le lot 3 de la barre de recherche.

### 3. Les allers-retours avec Gmail

Sur iPhone, « Ouvrir dans Mail » ouvre Mail d'Apple, pas Gmail : copier,
coller, envoyer, revenir.

| | Ce que ça donne | Ce que ça demande |
|---|---|---|
| **Ouvrir dans Gmail / Outlook** | un tap ouvre Gmail avec le mail prêt ; Envoyer ; revenir | rien — l'app retient l'app de mail choisie une fois. Le lien Gmail pour iPhone (`googlegmail:///co?to=…&subject=…&body=…`) n'est pas documenté par Google, et peu fiable si Gmail était fermé : à mesurer sur un vrai téléphone |
| **Envoyer depuis l'app** (Gmail, Outlook) | zéro aller-retour ; le code existe, masqué (`ENVOI_DIRECT`) | un projet Google créé une fois par le mainteneur. Avant validation : écran « Google n'a pas validé cette application », 100 utilisateurs au plus. Validation de `gmail.send` (étendue « sensible ») : 2 à 8 semaines, page de confidentialité, domaine, vidéo. C'est la question ② de §0 |
| **L'app ordinateur** (SMTP, mot de passe d'application) | envoi depuis l'app et détection des réponses, sans rien déclarer | seulement au poste ; elle vient après la bêta (§0) |

**Décision en attente** : essayer l'envoi direct avec le groupe de bêta
malgré l'écran d'avertissement, ou rester sur « Ouvrir dans Gmail ».

### Les trois ensemble

Une recherche trouve dix entreprises, ajoutées en un geste ; une demande à
son assistant prépare dix brouillons ; on relit chacun et on l'envoie.
Ordre proposé, le jour où on y revient : ouvrir dans Gmail, les
brouillons par l'assistant, puis l'envoi direct une fois décidé.

---

## Relevées en jouant l'app, le 30 septembre 2026

Profil vide, au téléphone, comme un étudiant qui la découvre.

**Corrigées** :
- 6.41.0 : le toast étiré sur la capture, et le premier mail qui partait
  avec ses crochets et sans signature (§6, §7) ;
- 6.42.0 : « Reporter » porte le calendrier de « Planifier » (même
  question, même dessin) ; la capture dit « Ajouter » au lieu de
  « Suivant » ; « Donner » propose « Texte » à côté de QR et Fichier,
  les mots de « Recevoir », et l'envoie par la feuille de partage.

**Restent :**

| Friction | Ce qui se passe | Piste |
|---|---|---|
| Rien ne rappelle de revenir | une app web ne peut pas notifier sans serveur ; « je fais quoi maintenant » dépend de penser à l'ouvrir. L'oubli fait partie des raisons qui font lâcher un outil de suivi (Epstein et al., 2015) | ajouter la prochaine action au **calendrier du téléphone** (fichier `.ics` avec alarme) : le calendrier rappelle, sans serveur |
| Fermer « Envoyé ✓ — et ensuite ? » ne planifie rien | la piste revient dans « Par où commencer » avec l'icône mail, comme si on ne lui avait jamais écrit | une relance proposée **par défaut** (7 jours, `SILENCE_RELANCE`) ; décider « quand » aide nettement à faire (effet de 0,65, Gollwitzer et Sheeran, 2006) ; et « Par où commencer » ne garde que les pistes jamais contactées, comme §6 le dit déjà |
| Dire « c'est envoyé » exige de revenir | parti depuis Gmail, l'app croit que rien n'est parti | l'envoi direct le règle ; sinon, le pied « Envoyée ✓ » au retour existe déjà |
| La page blanche de l'accroche | une piste neuve n'a ni notes ni site à montrer | les brouillons par l'assistant ; le lot 3 de la barre |

---

*Sources : Liu, Huang et Wang, « Effectiveness of job search
interventions », Psychological Bulletin, 2014 ; Epstein et al., « A lived
informatics model of personal informatics », 2015, et « Beyond abandonment
to next steps », 2016 ; Wanberg et al., travaux sur l'effort de recherche
d'emploi dans le temps ; Gollwitzer et Sheeran, « Implementation
intentions and goal achievement », 2006 ; Google, classement des étendues
Gmail et validation des applications ; MacStories, lien de rédaction de
Gmail pour iPhone ; WebKit, bug 194593 (Web Share Target).*
