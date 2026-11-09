# Classe, promo et messagerie : où les étudiants se parlent, et ce qu'OpenContact doit garder de sa messagerie

> **Comment lire ces notes.** Recherche menée le 9 novembre 2026 : 40 recherches web (budget partagé avec deux autres chercheurs), puis une vérification dans le dépôt. Elles complètent `research_notes/Refonte navigation et concept/reseau_et_messagerie.md` (4 novembre 2026) et ne reprennent ce qu'il établit que pour fonder la recommandation. Ces reprises portent la mention « (notes du 4 novembre) ».
>
> **Tout ce qui vient du web a été lu en extraits de résultats de recherche, jamais dans la page entière.** La lecture directe a échoué : `diplomeo.com`, `faq.whatsapp.com` et `web.dev` ne se résolvent pas dans cette session. Pour lire ces pages en entier, il faudrait autoriser ces hôtes dans les réglages réseau de la session. Les chiffres pour lesquels ce point compte sont signalés.
>
> Étiquettes : celles des notes du 4 novembre, à savoir [officiel], [recherche], [industrie] (une entreprise sur son propre produit), [presse], [tiers] (agrégateur, blog, guide), [praticien], [projet] (fait tiré du dépôt) et [sondage d'éditeur]. Deux s'y ajoutent : [sondage d'entreprise et d'association] pour l'étude Caisse d'Épargne × e-Enfance, et [communauté] pour les forums d'utilisateurs.

## 0. Garder la conversation, ou seulement le groupe comme adresse qui reçoit pistes et demandes ?

### Takeaway
**Recommandation : garder le groupe comme adresse, et sortir la conversation libre.**
- **Le groupe reste.** Il reçoit les pistes et les demandes, il met une demande en tête chez la personne dont le téléphone a trouvé quelqu'un, et il garde un fil d'événements.
- **La conversation libre sort.** Ce sont les phrases du groupe, avec leurs mentions et leur épinglage, et les messages entre amis. On la masque d'abord par un drapeau de `ui/perimetre.js`, comme le 2 août 2026 : rien n'est supprimé, aucune clé ne bouge.
- **La conversation va à la messagerie de la classe.** Elle y part par la feuille de partage du téléphone, en texte seul, avec le lien écrit dans le texte.

Les sources nouvelles renforcent la recommandation du 4 novembre sur trois points :
- les groupes de classe vivent sur WhatsApp dès l'école, au point d'être le premier lieu du cyberharcèlement des 6-18 ans ;
- WhatsApp a désormais l'épinglage et la mention de tous, en plus de la validation des entrées et des messages éphémères : tout ce qu'OpenContact a reconstruit ;
- aucun usage mesuré n'a été trouvé pour les espaces de discussion des plateformes de carrière, et les groupes LinkedIn sont décrits comme des « villes fantômes » après la refonte qui a retiré le suivi des discussions et leurs notifications.

Le code apporte un argument de plus : le fil d'un groupe OpenContact n'est pas plus privé que la conversation WhatsApp où circule son invitation.

**Confiance : moyenne.** Aucune enquête française ne dit où vivent les classes du supérieur, ni s'il en va autrement en informatique (Discord, Slack). La feuille de partage couvre tous ces cas, donc cette incertitude change la cible du partage, pas la conclusion.

### Cited Findings
- [sondage d'entreprise et d'association] Le cyberharcèlement des 6-18 ans passe d'abord par les groupes WhatsApp. Enquête en ligne de mai 2025 auprès de 1 602 binômes parent-enfant, publiée le 30 octobre 2025. 41 % des cas passent par WhatsApp, « dont 25 % dans des groupes de classe ». Section 1 — [Caisse d'Épargne × e-Enfance, communiqué](https://newsroom.groupebpce.fr/download-pdf/69032c6160465505b60ccfbf)
- [officiel] WhatsApp est utilisé par 87 % des utilisateurs de messageries en France (notes du 4 novembre) — [CREDOC, Baromètre du numérique 2026](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_RAPPORT.pdf)
- [presse] WhatsApp couvre aujourd'hui ce qu'OpenContact a reconstruit pour ses groupes :
  - la validation des entrées (2023) et les messages éphémères de 24 h, 7 jours ou 90 jours (2021), relevés le 4 novembre ;
  - l'épinglage, qui peut désormais être permanent, l'admin décidant qui peut épingler ;
  - la mention « @tous », réservée aux admins au-delà de 32 membres ;
  - les communautés, avec un groupe d'annonces.

  Section 3 — [KultureGeek](https://kulturegeek.fr/?p=363130) ; [Le Café du Geek](https://lecafedugeek.fr/whatsapp-loption-all-arrive-pour-interpeller-tous-les-membres-dun-groupe/) ; [respond.io](https://respond.io/fr/blog/whatsapp-communities)
- [presse] Les groupes LinkedIn ont perdu leur engagement. Dans les groupes d'analyse de données, l'engagement moyen a été divisé par deux entre 2010 et 2015. La presse spécialisée parle de « villes fantômes » après une refonte qui a retiré le suivi des discussions et leurs notifications. Section 2 — [KDnuggets, 2015](https://www.kdnuggets.com/2015/05/top-linkedin-groups-analytics-big-data-mining-activity-engagement.html) ; [HuffPost](https://www.huffingtonpost.com/entry/linkedin-groups-have-become-ghost-towns_us_9509092)
- [industrie] L'application que LinkedIn a lancée en 2016 pour les étudiants qui cherchent un premier emploi n'avait ni messagerie ni groupes. Section 2 — [VentureBeat](https://venturebeat.com/business/linkedins-newest-app-helps-college-grads-find-a-job) ; [Digiday](https://digiday.com/media/linkedin-students-new-app)
- [industrie] Le modèle « l'objet dans l'app, le lien dans la messagerie » est la règle chez les apps de coordination. Chaque cagnotte Lydia a un lien unique « à envoyer par WhatsApp, SMS, Instagram, Messenger ou e-mail », et l'on y participe sans l'application. Section 3 — [Lydia](https://lydia.me/en/cagnottes)
- [presse] Les apps qui ont ajouté une messagerie l'ont fait pour qu'on reste chez elles. BeReal, en 2023 : « pour essayer de vous garder plus longtemps dans l'app ». Section 3 — [BGR](https://bgr.com/tech/bereal-is-adding-dms-to-try-and-keep-you-in-the-app-longer)
- [projet] Un seul PBKDF2 tire du code du groupe l'étiquette que voient les relais et la clé AES qui scelle chaque message. Or l'invitation, qui contient ce code, est faite pour partir dans la conversation de la classe. Section 5 — [engine/groupe.js, l. 10-16 et 172-183](/home/user/Open-Contact/engine/groupe.js) ; [ui/groupes.js, l. 964-966](/home/user/Open-Contact/ui/groupes.js)
- [officiel, technique] Pour la sortie, les voies existent et finissent toutes par un geste de l'utilisateur. Section 4 :
  - la feuille de partage — [web.dev](https://web.dev/articles/web-share) ;
  - `wa.me/?text=` sans numéro — [Toools](https://toools.cloud/phone/whatsapp-link-generator) ;
  - le lien de partage officiel de Telegram — [Telegram](https://core.telegram.org/widgets/share).
- [projet] Le projet sait déjà masquer sans supprimer. Quatre drapeaux de `ui/perimetre.js` le font depuis le 2 août 2026 (`ORDINATEUR`, `CAMPAGNES`, `IA`, `ENVOI_DIRECT`), et un cinquième, `PARTAGE_DIRECT`, masque le partage en groupe en direct, « remplacé par mieux ». Pour ce qui est masqué, « rien n'est supprimé, aucune clé de stockage ne bouge » — [ui/perimetre.js](/home/user/Open-Contact/ui/perimetre.js) ; [CLAUDE.md, §0](/home/user/Open-Contact/CLAUDE.md)
- [projet] Les messages font partie du socle de la refonte : « amis, groupes, messages, demandes, telles qu'en 8.1.0 ». Les sortir est une décision du mainteneur, montrée en captures avant d'arriver dans main — [docs/refonte.md, l. 48-50](/home/user/Open-Contact/docs/refonte.md) ; [CLAUDE.md, §0](/home/user/Open-Contact/CLAUDE.md)
- [presse] Contre-argument : BeReal dit que la messagerie privée était « l'une des fonctions les plus demandées » — [TechCrunch, 2023](https://techcrunch.com/2023/06/01/bereal-is-adding-a-messaging-feature-called-realchat/)

### Inferences
**Ce qu'on garde**
- *(inférence)* **Le groupe-adresse :**
  - le code, l'entrée ouverte ou sur demande, le chef et ses adjoints, le retrait d'un membre qui change le code ;
  - « Donner au groupe » ;
  - la demande au groupe, avec son acheminement nominatif (« tu as Julie Marchand ») et ses réponses structurées : « Donner Julie Marchand », « Je connais quelqu'un », « Faire suivre » ;
  - un fil d'**événements** : pistes données, demandes, « Karim veut entrer », départs.

  WhatsApp ne sait faire aucune de ces choses (notes du 4 novembre, section 0).
- *(inférence)* **Côté amis**, le profil donné, ce qu'il rapporte sur les pistes (« Karim y est en alternance »), la demande qui passe de cercle en cercle, la présentation, et « Lui demander », qui ouvre déjà le mail ou les SMS avec le message prêt ([ui/reseau.js, l. 789](/home/user/Open-Contact/ui/reseau.js)).

**Ce qu'on masque**
- *(inférence)* Les phrases du groupe (`mot`), les mentions, l'épinglage, et la conversation entre deux amis (« Écrire à Karim »).
- *(inférence)* La boîte de « Réseau » (épingler, couper le son, « Marquer comme lu ») perd l'essentiel de son objet. Elle se réduit à la liste des groupes et des amis, ce qui reste à dessiner.
- *(inférence)* Le motif qui convient est celui du 2 août 2026 : un drapeau dans `ui/perimetre.js`, aucune clé renommée (`oc_fils_v1` et les autres restent lisibles), les modules qui dorment toujours testés par `?test`. Aucune donnée ne se perd.

**Ce qu'on ajoute**
- *(inférence)* Un geste « Dire au groupe de la classe » sur une demande et sur un don au groupe. Il produit un texte prêt, avec l'entreprise, ce qu'on cherche et le lien ou le code pour répondre dans OpenContact, et il passe par `boutonEnvoyer`, qui partage déjà en texte seul (section 4).
- *(inférence, invariant ①)* Ce partage ne vaut que pour **ses propres** demandes. Une demande relayée, « Tom, par Karim, cherche quelqu'un », porte le prénom d'un maillon. La partager dans un groupe WhatsApp ferait sortir de la chaîne ce que `CLAUDE.md` §2 protège (« qui demande n'apprend que le prénom de SON ami »).

**Pourquoi c'est la bonne coupe**
- *(inférence)* La conversation libre ne gagne rien à vivre dans OpenContact :
  - elle n'y a pas plus de membres que dans WhatsApp, elle en a moins ;
  - elle n'y est pas plus privée, puisque le code qui la protège circule dans WhatsApp ;
  - elle n'y sonne pas, et sans notification les groupes LinkedIn se sont éteints ;
  - elle y porte un risque : le harcèlement entre élèves passe par les groupes de classe, sans personne au-dessus des admins.

  À l'inverse, l'état (pistes, demandes, suivi « comme un colis ») ne peut vivre que dans OpenContact.
- *(inférence)* L'argument le plus fort pour le fil vient du projet lui-même : une question visible de tous fait répondre avec ce qu'aucune app ne sait, « mon cousin travaille chez Aztek » ([docs/reseau.md, l. 1108-1116](/home/user/Open-Contact/docs/reseau.md)). Le geste « Dire au groupe de la classe » porte cette question là où toute la classe la lit, et « Je connais quelqu'un » en ramène la réponse. Ce qu'on perd : la question n'arrive plus « à ton nom » dans WhatsApp, et l'effet témoin y joue. L'acheminement nominatif reste dans le groupe OpenContact.
- *(inférence)* Que BeReal ait vu la messagerie parmi les fonctions les plus demandées montre qu'on peut la réclamer. Cela ne montre ni qu'on s'en sert, ni qu'elle sert le but. La refonte refuse le nombre d'ouvertures comme mesure (notes du 4 novembre, section 0).

**Ce qui ferait changer d'avis**
- *(inférence)* Trois résultats d'entretien :
  - des classes sans groupe commun ;
  - un désir de canal « emploi seulement », calme, que la classe ne se donne pas déjà par un sous-groupe de communauté WhatsApp ;
  - des réponses qui ne reviennent pas quand la question passe par WhatsApp.

  L'étape « Comprendre » de la refonte est le lieu pour le demander : où vit la classe (WhatsApp, Discord, Slack, Snapchat), et si un fil OpenContact servirait.

### Gaps
- Aucune enquête française sur le lieu des groupes de classe ou de promo du supérieur, ni sur leur usage pour la recherche de stage (section 1).
- Aucune donnée d'usage des groupes d'OpenContact.
- Aucune mesure ne compare une question posée dans une messagerie de classe à une demande acheminée nommément.
- Le coût de dessin de la boîte de « Réseau » réduite n'a pas été estimé.

## 1. Où vivent les groupes de classe et de promo des étudiants français (2024-2026) ?

### Takeaway
La messagerie est universelle chez les jeunes : 92,8 % des 16-24 ans communiquent par messagerie (INSEE, 2025). La donnée nouvelle la plus solide porte sur les 6-18 ans : 1 602 binômes interrogés en mai 2025 placent WhatsApp, et ses groupes de classe, au cœur du cyberharcèlement. Le groupe de classe sur WhatsApp est donc une habitude prise avant le supérieur. Le BTS SIO, qui se prépare en lycée, la prolonge sans doute (à vérifier).

Pour l'informatique, il existe des espaces propres :
- Slack à l'école 42 ;
- des serveurs Discord de formation ou d'université, souvent non officiels, plus larges qu'une classe ;
- aux États-Unis, des serveurs Discord de cours et de département.

Rien ne montre qu'ils remplacent le groupe WhatsApp de la classe, et en France Discord reste minoritaire au quotidien (environ 15 % des 15-24 ans en 2020, chiffre ancien). Aucune enquête française récente ne mesure le lieu des groupes de classe ou de promo du supérieur.

### Cited Findings
**Les jeunes et la messagerie**
- [officiel, lu en extrait] En 2025, 92,8 % des 16-24 ans utilisent internet pour communiquer par messagerie — [INSEE, usage d'internet pour les relations sociales selon l'âge, 2012-2025](https://insee.fr//fr/statistiques/2411023)
- [officiel] Selon la présentation de février 2026 du Baromètre du numérique, WhatsApp, Messenger et Instagram servent chacune à au moins 50 % des utilisateurs de messageries, WhatsApp à 87 %. Aucun découpage par âge n'apparaît dans les extraits — [Arcep, présentation 2026](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_PRESENTATION.pdf)
- [industrie, mesure d'audience] Les 15-24 ans passent 61 % de leur temps de navigation sur les réseaux sociaux et les messageries, et les 11-14 ans 63 % (L'Année Internet 2025, communiqué du 12 février 2026) — [Médiamétrie](https://www.mediametrie.fr/system/files/2026-02/2026%2002%2012%20CP%20M%C3%A9diam%C3%A9trie%20L%27Ann%C3%A9e%20Internet%202025.pdf). Les 15-24 ans passeraient en moyenne 5 heures par jour sur internet — [Les Gens d'Internet](https://gensdinternet.fr/?p=43244)
- [tiers, attribution incertaine] Snapchat toucherait 91 % des 15-24 ans et 64 % des 25-40 ans, avec 32 minutes par jour. Une compilation attribue ces chiffres à We Are Social (octobre 2025), et l'extrait ne dit pas laquelle des deux pages les porte — [Thunderbit](https://thunderbit.com/fr/blog/snapchat-statistics-need-to-know) ; [Wizishop](https://www.wizishop.fr/blog/chiffres-snapchat)

**Le groupe de classe, lieu du harcèlement des 6-18 ans**
- [sondage d'entreprise et d'association] Étude Caisse d'Épargne et e-Enfance/3018, publiée le 30 octobre 2025 : enquête en ligne de mai 2025 auprès de 1 602 binômes parent-enfant de 6 à 18 ans scolarisés. 37 % des 6-18 ans ont subi du harcèlement ou du cyberharcèlement, 18 % du cyberharcèlement seul — [communiqué, méthode](https://newsroom.groupebpce.fr/download-pdf/69021514b15fc101e50f5fe2)
- [sondage d'entreprise et d'association] 41 % des cas de cyberharcèlement passent par WhatsApp, « dont 25 % dans des groupes de classe ». L'extrait ne dit pas si ces 25 % portent sur tous les cas ou sur ceux de WhatsApp — [communiqué](https://newsroom.groupebpce.fr/download-pdf/69032c6160465505b60ccfbf)
- [sondage d'entreprise et d'association] Dans l'édition 2024, 44 % des cas de cyberharcèlement avaient eu lieu sur un groupe WhatsApp. La méthode semble différer d'une édition à l'autre — [communiqué 2024](https://newsroom.groupebpce.fr/assets/20241009-cp-ce-e-enfance-cyberhacelement-et-harcelement-6-18-ans-pdf-60104-7b707.html?dl=1)
- [presse] Selon e-Enfance, les messageries chiffrées rendent ces groupes difficiles à contrôler — [franceinfo, 31 octobre 2025, revue de presse de l'académie de Normandie](https://media.ac-normandie.fr/-/communication/revue-presse/2025/10/31/FranceInfo.fr_nat_actu_national_Il%20n'y%20a%20pas%20de%20harc%e8lement%20d'un%20c%f4t%e9%20et%20de%20cyberharc%e8lement%20de%20l'autre,%20ce%20qui%20se%20passe%20entre%20les%20murs%20se%20poursuit%20en%20ligne.pdf)

**Le supérieur**
- [presse, non daté] Un groupe de promo se crée quelques jours après la rentrée. À l'UPEC, l'étudiante qui a lancé celui de sa promo de science politique l'a fait parce qu'« en début d'année, les élèves ne se connaissent pas, et l'information circule mal ». Ces groupes aident les étudiants isolés à rencontrer du monde. L'article parle de Facebook — [L'Etudiant](https://www.letudiant.fr/etudes/peut-on-se-passer-des-groupes-facebook-de-classe-et-de-promo.html)
- [officiel, établissement] Le BTS SIO se prépare en lycée, comme le montrent les plaquettes de lycées publics — [Lycée Poincaré, Bar-le-Duc](https://sites.ac-nancy-metz.fr/lyc-poincare-bar-le-duc/sites/default/files/docs/PlaquetteBTSSIO.pdf) ; [Lycée Pierre Poivre, La Réunion](https://etab.ac-reunion.fr/lyc-pierre-poivre/wp-content/uploads/sites/36/2022/07/Présentation-du-BTSSIO.pdf)
- [recherche, pays non précisé dans l'extrait, 37 étudiants, 2026] Pour les échanges liés aux cours, WhatsApp est choisi par 62 % des étudiants, la plateforme de l'établissement par 5 % alors qu'elle est officiellement recommandée, et Microsoft Teams par quelques pour cent — [arXiv 2603.07186](https://arxiv.org/pdf/2603.07186)

**L'informatique : Discord et Slack**
- [industrie, page marketing, 2022] À l'école 42, chaque campus vit sur Slack. Les étudiants y trouvent des camarades aux intérêts communs, gèrent leurs groupes de projet, répartissent les tâches, organisent des discussions et préparent les examens. L'école compte 35 campus — [Slack, blog](https://slack.com/intl/fr-fr/blog/productivity/ecole-42)
- [tiers] La directrice de la communication de 42, Fabienne Haas, juge difficile pour l'école de modérer ce Slack, parce que les étudiants le gèrent eux-mêmes — [Wikipédia, « 42 (school) »](https://en.wikipedia.org/wiki/42_(school))
- [tiers] Un serveur Discord « Sorbonne Université (non-officiel) » compte environ 4 700 membres et se dit non affilié à l'université — [Discord Bot List](https://discordbotlist.com/servers/sorbonne-universite-non-off-749364640147832863). Les licences informatiques de Montpellier ont le leur, et Paris-Saclay publie un tutoriel de serveur de formation (notes du 4 novembre)
- [officiel, établissement] L'ENS Paris-Saclay rappelle que Discord « n'est pas prévu pour être utilisé autrement qu'à titre personnel ». Il faut le consentement des représentants légaux pour les moins de 15 ans, et la note propose des outils institutionnels (classe virtuelle du CNED) — [ENS Paris-Saclay](https://ens-paris-saclay.fr/sites/default/files/ACTU-AGENDA/GIPSEN/C15b_DISCORD.pdf)
- [tiers, ancien, secondaire] Médiamétrie, 2020, cité par Oberlo : 7,9 millions de visiteurs uniques mensuels pour Discord en France (+53 % en un an). Environ 15 % des 15-24 ans l'utilisaient chaque jour, contre 5 % des 25-49 ans — [Oberlo](https://www.oberlo.com/fr/blog/discord)
- [tiers, non attribué] Un livre blanc marketing avance 7,6 millions d'utilisateurs en France et 72 % des 15-24 ans connectés au moins une fois par semaine, sans source. À écarter sauf confirmation — [J'ai un pote dans la com](https://jai-un-pote-dans-la.com/livre-blanc-top-3-des-meilleures-campagnes-discord-2025/)
- [recherche, États-Unis et Europe, lu en résumés] Discord dans des formations en informatique :
  - SIGCSE 2022 : une aide sur Discord « 24 heures sur 24 » a fortement augmenté les échanges entre étudiants et enseignants dans un cours de génie logiciel — [rapport d'expérience](https://www.aminer.org/pub/628704365aee126c0f5bbc88/delivering-round-the-clock-help-to-software-engineering-students-using-discord-an) ;
  - ASEE 2024 : un serveur de département non officiel, ouvert par des étudiants en 2017, dépasse 2 000 membres — [ASEE](https://nemo.asee.org/public/conferences/344/papers/42573/view) ;
  - ASEE 2022 : dans un cours de MATLAB, 256 étudiants sur 444 ont rejoint le serveur, surtout pour la programmation et le débogage — [ASEE](https://peer.asee.org/students-utilization-of-discord-messaging-platform-in-an-introduction-to-matlab-course) ;
  - en infographie, sur 111 étudiants, Discord a favorisé l'entraide, mais le volume des messages et la dispersion ont posé problème — [ERIC](https://karla.hds.hebis.de/EdsRecord/eric%252CEJ1476337).

### Inferences
- *(inférence)* **WhatsApp est le lieu de la classe jusqu'au bac.** L'étude e-Enfance le montre sur un grand échantillon. Un étudiant de BTS ou de BUT arrive donc avec l'habitude du groupe de classe sur WhatsApp, et le BTS, qui se prépare en lycée, la prolonge vraisemblablement. Rien de cela n'est mesuré pour le supérieur.
- *(inférence)* **Discord et Slack servent surtout le travail en informatique** : l'aide, les projets, les cours. Ce sont des serveurs de cours, de département, de formation ou d'école, plus larges qu'une classe et souvent tenus par les étudiants. Ils coexistent vraisemblablement avec le groupe WhatsApp de la classe plutôt qu'ils ne le remplacent. Discord reste minoritaire au quotidien chez les 15-24 ans (environ 15 % en 2020).
- *(inférence)* **Conséquence pour OpenContact : la cible du partage est plurielle.** WhatsApp d'abord, Discord ou Slack pour certaines classes d'informatique, Snapchat et Instagram pour la conversation à deux. Il n'y a pas à choisir entre elles : la feuille de partage du téléphone les propose toutes (section 4).
- *(inférence)* **L'ENT et Teams ne sont pas le lieu des échanges entre pairs.** Seules de petites études hors de France le disent, mais dans le même sens que celles sur Moodle (notes du 4 novembre).

### Gaps
- **Aucune enquête française 2024-2026 sur les groupes de classe ou de promo du supérieur** : application, part des étudiants qui y sont, usage pour la recherche de stage. Ni l'OVE, ni Born Social, ni l'Arcom n'ont été trouvés sur ce point. Une édition 2026 de l'enquête Diplomeo × BDM est annoncée, sans résultats trouvés.
- **Le découpage par âge et par application du Baromètre 2026** reste introuvable dans les extraits.
- **Aucune donnée française sur Discord ou Slack chez les étudiants en informatique**, par filière.
- Une enquête Statista de 2017 auprès de 1 111 étudiants de 17 à 27 ans existe, mais elle est payante et n'a pas été lue.
- Les groupes Snapchat entre camarades de classe ne sont mesurés nulle part.

## 2. Les étudiants se servent-ils de la messagerie des plateformes de carrière ou étudiantes ?

### Takeaway
Aucun chiffre d'usage n'a été trouvé pour la messagerie entre pairs de Handshake, JobTeaser, LinkedIn ou Welcome to the Jungle. Ce qui existe va dans un seul sens :
- **Handshake** affiche une portée (environ 6 millions de personnes joignables), pas un usage, et réserve la messagerie à ceux qui l'ouvrent ;
- **JobTeaser** n'a pas de messagerie entre étudiants : ce sont les recruteurs qui contactent l'étudiant, selon ses réglages de visibilité ;
- **l'application étudiante de LinkedIn** (2016) a été conçue sans messagerie ni groupes ;
- **les groupes LinkedIn**, l'espace de discussion d'une plateforme de carrière, ont vu leur engagement s'effondrer, et la presse spécialisée parle de « villes fantômes » après la refonte qui a retiré le suivi des discussions et leurs notifications.

L'absence de chiffres ne prouve pas l'échec, mais aucune plateforme ne publie de réussite.

### Cited Findings
- [industrie] Handshake présente sa messagerie entre étudiants et anciens comme un accès à « près de six millions » d'étudiants actifs et de jeunes diplômés. C'est une portée, pas un usage — [Handshake, blog](https://joinhandshake.com/blog/students/how-to-get-useful-career-advice-from-other-students)
- [industrie] Pour envoyer un message, il faut passer son profil en « Community ». Le bouton d'envoi n'apparaît que sur le profil de qui s'est dit ouvert à la conversation. Un signalement bloque l'expéditeur et envoie le fil à l'équipe Trust & Safety — [Handshake, aide](https://support.joinhandshake.com/hc/en-us/articles/360021682793-How-Peer-Messaging-Works) ; [université d'Arizona](https://career.arizona.edu/resources/how-peer-messaging-works/)
- [industrie, établissement] Un service carrière promouvait encore en octobre 2022 le réseautage entre pairs et anciens sur Handshake, donc la fonction vivait toujours — [Tufts](https://careers.tufts.edu/blog/2022/10/24/gethiredonhandshake-networking-with-peers-and-alumni/)
- [industrie, auto-déclaré] La brochure de Handshake dit que 65 % des étudiants de dernière année y reçoivent un message spontané d'un employeur. C'est la messagerie des employeurs, pas celle des pairs — [Handshake, brochure](https://go.joinhandshake.com/rs/390-ZTF-353/images/Handshake_Benefits_Across_Campus.pdf)
- [industrie] JobTeaser permet à l'étudiant d'être « visible (profil et CV) et contacté directement par les recruteurs selon les critères de visibilité paramétrés ». Aucune messagerie entre étudiants n'a été trouvée — [JobTeaser, politique de confidentialité](https://www.jobteaser.com/fr/about/privacy-policy) ; [JobTeaser, conditions](https://jobteaser.com/fr/about/terms-for-members)
- [presse] Le seul échange en direct relevé chez JobTeaser est un événement, « l'After School » : des amphis en vidéo où les recruteurs répondent aux étudiants connectés — [MyRHline](https://myrhline.com/type-article/recrutement/le-recrutement-des-alternants-commence-jobteaser-com-lance-la-1ere-edition-de-l-after-school-pour-permettre-aux-recruteurs-de-trouver-rapidement-des-alternants-qui-leur-correspondent)
- [presse] LinkedIn Students (2016) est une application dépouillée pour la recherche du premier emploi, sans messagerie, sans groupes et sans le fil d'actualité Pulse. LinkedIn disait vouloir fermer d'autres outils étudiants à son profit — [VentureBeat](https://venturebeat.com/business/linkedins-newest-app-helps-college-grads-find-a-job) ; [eWeek](https://www.eweek.com/fr/mobile/linkedin-students-app-aims-to-help-college-grads-find-jobs/) ; [Digiday](https://digiday.com/media/linkedin-students-new-app)
- [presse spécialisée, 2015] Dans les groupes LinkedIn d'analyse de données, l'engagement moyen est passé de 2,16 (2ᵉ trimestre 2010) à 1,03 (1ᵉʳ trimestre 2015), soit une division par deux, et l'engagement médian a été divisé par six. Le relevé ne porte que sur ces groupes — [KDnuggets](https://www.kdnuggets.com/2015/05/top-linkedin-groups-analytics-big-data-mining-activity-engagement.html)
- [presse, tribunes, non datées dans l'extrait] Le HuffPost décrit les groupes LinkedIn comme des « villes fantômes » et relie la chute à la refonte de fin 2015. Une seconde tribune précise que les membres ne pouvaient plus « suivre » une discussion ni être notifiés des nouvelles discussions et des commentaires — [HuffPost, « ghost towns »](https://www.huffingtonpost.com/entry/linkedin-groups-have-become-ghost-towns_us_9509092) ; [HuffPost](https://www.huffpost.com/entry/why-a-power-linkedin-and-twitter-user-has-been-blown_b_58c18a8ce4b0c3276fb78215)
- [sondage d'éditeur] LinkedIn ne touche que 43 % des 16-25 ans interrogés (notes du 4 novembre) — [Diplomeo, 2025](https://diplomeo.com/actualite-sondage_reseaux_sociaux_jeunes_2025)
- [industrie] Chez Welcome to the Jungle, seuls des articles de conseil sur le réseau ont été trouvés. Ils recommandent de contacter les anciens de sa formation, « beaucoup plus naturel » qu'un inconnu — [Welcome to the Jungle](https://www.welcometothejungle.com/fr/articles/etudiant-conseils-reseau-professionnel-networking)

### Inferences
- *(inférence)* **Les plateformes de carrière gardent la messagerie qui sert une transaction et ferment celle des pairs.** Le recruteur écrit à l'étudiant (Handshake, JobTeaser). La messagerie entre pairs est soit absente, soit réservée à ceux qui l'activent. Aucune ne publie qu'elle marche.
- *(inférence)* **Les groupes LinkedIn sont l'analogue le plus proche du fil d'un groupe OpenContact** : un espace de discussion dans un outil de carrière. Ils ont dépéri quand on n'a plus pu y suivre une discussion ni être notifié. OpenContact n'a pas de notification du tout : il relève ses groupes toutes les cinq minutes, app ouverte (notes du 4 novembre). C'est un indice de praticiens, pas une preuve causale.
- *(inférence)* **Une application d'emploi pour étudiants peut vivre sans messagerie.** LinkedIn l'a fait exprès en 2016, avec sa propre messagerie à côté. OpenContact a lui aussi les messageries de l'étudiant à côté de lui.

### Gaps
- **Aucun chiffre d'usage** pour la messagerie entre pairs de Handshake, JobTeaser ou Welcome to the Jungle, ni pour la messagerie de LinkedIn entre étudiants.
- La fermeture de LinkedIn Students n'est pas confirmée : un blog peu fiable se contredit sur la fin de programmes étudiants de LinkedIn.
- Aucune donnée officielle de LinkedIn sur l'activité des groupes. Les sources ont presque toutes entre neuf et onze ans.

## 3. Comment les apps qui coordonnent un groupe sans posséder la conversation s'y prennent-elles ?

### Takeaway
Le motif relevé le 4 novembre se confirme : **l'objet reste dans l'app, le lien voyage dans la messagerie.**
- Une cagnotte Lydia a un lien unique qu'on envoie par WhatsApp, SMS, Instagram, Messenger ou e-mail. Il s'ouvre dans le navigateur, et l'on paie sans l'application.
- Splitwise invite par un lien partagé depuis la feuille de partage, mais demande un compte.
- Doodle et Tricount suivent le même motif (notes du 4 novembre).
- Pumpkin, l'autre app française de remboursement entre amis, a fermé fin 2022.

Les apps qui ont ajouté une messagerie l'ont fait pour qu'on reste chez elles, avec serveurs et modération :
- Strava, en décembre 2023, avec des groupes de 25 personnes au plus ;
- BeReal, en 2023, avec RealChat : entre amis mutuels seulement, sans chiffrement de bout en bout.

WhatsApp, de son côté, a absorbé la coordination : communautés et groupe d'annonces, épinglage permanent, mention de tous.

### Cited Findings
**Le lien qui voyage**
- [industrie] « Chaque cagnotte Lydia a un lien de partage unique. Vous pouvez l'envoyer par WhatsApp, SMS, Instagram, Messenger ou e-mail » — [Lydia](https://lydia.me/en/cagnottes)
- [tiers] Le lien s'ouvre dans le navigateur. On participe sans l'application, par carte ou par virement, en donnant son prénom et son nom, et l'on ne peut pas participer anonymement. Quiconque a l'adresse accède à la cagnotte, d'où le conseil de ne pas la poster sur un forum public — [Parrain du Web](https://parrainduweb.fr/blog/cagnotte-lydia) ; [ComparaBanques](https://www.comparabanques.fr/lydia/cagnotte)
- [presse] Depuis le 1ᵉʳ mai 2026, l'organisateur reçoit 100 % des sommes si les participants paient par Lydia ou Sumeria. Les sources divergent sur la commission des paiements par carte — [Meilleurtaux](https://banque.meilleurtaux.com/banque-en-ligne/actualites/2026-mai/lydia-cagnottes-sans-frais-depuis-le-1er-mai-2026.html)
- [tiers] Splitwise invite par un lien vers le groupe, qu'on envoie depuis la feuille de partage d'iOS (e-mail, SMS, réseaux sociaux, AirDrop), mais les membres doivent avoir un compte pour rejoindre — [TapSmart](https://www.tapsmart.com/tips-and-tricks/splitwise-guide/?amp=1) ; [Robots.net](https://robots.net/fintech/how-to-join-a-group-in-splitwise/)
- [presse] Pumpkin, rachetée par le Crédit Mutuel Arkéa en 2017 et revendiquant 1,6 million d'utilisateurs, a annoncé sa fin le 20 septembre 2022 et fermé fin 2022. Le service ne semblait plus assez rentable — [MoneyVox](https://www.moneyvox.fr/banque-en-ligne/actualites/89052/echec-pour-le-credit-mutuel-arkea-le-principal-concurrent-de-lydia-va-disparaitre) ; [iPhoneSoft](https://iphonesoft.fr/2022/09/25/clap-fin-application-pumpkin-disparaitre) ; [France Transactions](https://www.francetransactions.com/amp/actus/news-banques/pumpkin-clap-de-fin-l-aventure-se-termine-fin-2022.html)

**Ceux qui ont rapatrié la conversation**
- [presse] Strava a ouvert la messagerie à deux et en groupe début décembre 2023, avec des groupes de 25 membres au plus, sans accusé de lecture et d'abord sans photos. La messagerie dans les clubs était promise pour début 2024 — [BikeRadar](https://www.bikeradar.com/news/you-can-finally-send-direct-and-group-messages-on-strava) ; [Advnture](https://www.advnture.com/news/strava-in-app-messaging) ; [GCN](https://www.globalcyclingnetwork.com/tech/news/messaging-comes-to-strava-functionality-launches-for-dms-and-group-chats)
- [presse] BeReal a annoncé RealChat en juin 2023 et l'a testé d'abord en Irlande. Les conversations se font à deux, entre amis mutuels, avec blocage et signalement. RealChat n'est pas chiffré de bout en bout : selon BeReal, le chiffrement « peut être exploité par des acteurs malveillants ». Les messages effacés disparaissent de ses systèmes sous 30 jours — [TechCrunch](https://techcrunch.com/2023/06/01/bereal-is-adding-a-messaging-feature-called-realchat/) ; [Gizmodo](https://gizmodo.com/bereal-instagram-chat-social-media-1850494859)
- [presse] Le titre de BGR : « BeReal ajoute la messagerie pour essayer de vous garder plus longtemps dans l'app » — [BGR](https://bgr.com/tech/bereal-is-adding-dms-to-try-and-keep-you-in-the-app-longer)

**WhatsApp a absorbé la coordination**
- [tiers, chiffres divergents] Une communauté WhatsApp réunit des sous-groupes et un groupe d'annonces :
  - le groupe d'annonces compterait 5 000 membres selon la plupart des sources, mais un guide d'octobre 2026 donne 2 000 membres pour toute la communauté ;
  - le nombre de sous-groupes varie de 50 à 100 selon les sources ;
  - un groupe ordinaire va jusqu'à 1 024 membres.

  Le même guide juge les communautés adaptées aux écoles — [respond.io](https://respond.io/fr/blog/whatsapp-communities) ; [Blog du Modérateur](https://www.blogdumoderateur.com/whatsapp-lance-communautes-france/) ; [Kanal](https://getkanal.com/fr/blog/guide-communautes-whatsapp)
- [presse, dates variables, certaines fonctions en déploiement] Les dernières fonctions de groupe de WhatsApp — [KultureGeek](https://kulturegeek.fr/?p=363130) ; [Clubic](https://www.clubic.com/actualite-624100-whatsapp-ajoute-une-fonction-tres-pratique-pour-les-groupes-et-ameliore-ses-sondages.html) ; [Le Café du Geek](https://lecafedugeek.fr/whatsapp-loption-all-arrive-pour-interpeller-tous-les-membres-dun-groupe/) ; [Génération NT](https://www.generation-nt.com/actualites/whatsapp-discussions-groupe-atous-sondages-2079419) ; [Blog du Modérateur, épingler](https://www.blogdumoderateur.com/whatsapp-comment-epingler-message-haut-discussion/) :
  - l'épinglage peut désormais être permanent ; l'admin décide qui peut épingler, et un message système dit qui l'a fait ;
  - « @tous » notifie tout le groupe ; au-delà de 32 membres, seuls les admins s'en servent, et chacun peut couper ces alertes ;
  - un filtre affiche les mentions et les réponses ;
  - des statuts sont réservés aux membres du groupe.

### Inferences
- *(inférence)* **Le groupe d'OpenContact ressemble à une cagnotte Lydia plus qu'à une messagerie.** C'est un objet qui a un état, les pistes, les demandes et leur suivi. On l'atteint par un code ou un lien posté dans la conversation de la classe. Comme pour Lydia, quiconque a le lien entre : c'est un choix de conception, à dire au moment du partage.
- *(inférence)* **Ajouter une messagerie est un pari de rétention.** BeReal le dit presque en titre, Strava veut organiser les sorties sans quitter l'app. Les deux ont des serveurs et une modération, et aucun résultat d'usage n'a été publié. OpenContact refuse cette mesure (notes du 4 novembre).
- *(inférence)* **L'argument du canal « emploi seulement », calme, est le meilleur pour garder un fil, et WhatsApp le couvre aussi.** Une classe peut créer un sous-groupe « Stages » dans sa communauté, où toute la classe est déjà et où les notifications sonnent.
- *(inférence)* **Ce qu'OpenContact doit garder chez lui, c'est l'état que WhatsApp ne sait pas tenir :**
  - la piste qui entre dans le suivi, avec aperçu et « Annuler » ;
  - la demande acheminée nommément ;
  - la réponse structurée (« Je connais quelqu'un ») ;
  - le suivi « comme un colis ».

### Gaps
- Les commentaires et la discussion de Splitwise n'ont pas été vérifiés.
- La messagerie dans les clubs Strava n'est pas confirmée : toutes les sources datent de fin 2023.
- L'état actuel de RealChat n'a pas été vérifié.
- La politique de compte actuelle de Tricount n'a pas été revérifiée.
- **Aucune donnée d'usage** pour aucune de ces messageries ajoutées.

## 4. Envoyer quelque chose d'une app web vers un groupe WhatsApp ou Discord : options techniques et limites

### Takeaway
Depuis une page web, rien ne publie seul dans un groupe WhatsApp ou Discord : chaque voie se termine par l'utilisateur qui choisit la conversation et appuie sur « Envoyer ». Les voies fiables :
1. **La feuille de partage** (Web Share API), **en texte seul, le lien écrit dans le texte.** Sur iOS, WhatsApp perd le lien quand on passe à la fois du texte et une adresse, et Safari copie le texte à la place de l'adresse (bug WebKit 203221).
2. **`https://wa.me/?text=…` sans numéro** : WhatsApp s'ouvre sur le choix de la conversation, le texte prérempli.
3. **`https://t.me/share/url?url=…&text=…`** pour Telegram, documenté par Telegram.
4. **Discord** : il apparaît dans la feuille de partage d'iOS (serveur, salon, « Publier »), avec des défauts signalés. Le webhook est exclu : selon des rapports de 2021, il bute sur le CORS depuis le navigateur, ce qui demande un serveur relais, et son adresse est un secret qui laisse quiconque la détient publier.
5. **Snapchat** : un bouton de partage web existe sans démarche, mais le kit mobile demande un enregistrement et une validation par Snap, ce que la question ② reporte.

Les fichiers passent mal : Chromium n'accepte qu'une liste fermée d'extensions, sans `.oc`. OpenContact le sait et partage déjà en texte seul.

### Cited Findings
**WhatsApp**
- [tiers, citant la FAQ officielle] La forme du lien est `https://wa.me/<numéro>?text=<texte encodé>`, le numéro au format international sans « + », sans zéro ni espace — [Bird](https://bird.com/explained/whatsapp/what-is-a-whatsapp-click-to-chat-link.md) ; [Dotdigital](https://support.dotdigital.com/en/articles/11331301-click-to-chat-for-whatsapp)
- [tiers] Le texte arrive dans le champ de saisie et l'on peut le modifier avant d'envoyer : rien ne part tout seul — [Unipile](https://www.unipile.com/fr/?p=275019). Un seul paramètre `text` est permis — [Messangi](https://support.messangi.com/hc/en-us/articles/39008577066139-How-to-Use-WhatsApp-Links-to-Initiate-Conversations). Un texte non encodé casse le lien — [DEV](https://dev.to/dipbhi/how-to-send-a-link-in-whatsapp-why-most-people-do-it-wrong-and-what-to-do-instead-1gi3)
- [tiers] Sans numéro, le lien ouvre le choix des contacts avec le texte prérempli, ce qui convient à un bouton de partage dont le destinataire varie — [Toools](https://toools.cloud/phone/whatsapp-link-generator)

**Telegram**
- [officiel] Le bouton de partage pointe vers `https://t.me/share/url?url={url}&text={text}` : `url` est obligatoire, `text` facultatif, et l'interface du bouton est libre. Il existe aussi un schéma `tg://msg_url` — [Telegram, bouton de partage](https://core.telegram.org/widgets/share) ; [Telegram, liens](https://core.telegram.org/api/links)

**Discord**
- [communauté] Sur iOS, la feuille de partage propose des serveurs et des salons Discord. On choisit le serveur et le salon, puis « Publier ». Mais :
  - la liste des salons arrive parfois vide, et la recherche n'y aide pas ;
  - on ne règle ni l'ordre des salons ni leur présence.

  — [Discord, forum : quick share cassé](https://support.discord.com/hc/vi/community/posts/360071953352-iOS-quick-share-menu-feature-broken) ; [ordre des salons](https://support.discord.com/hc/vi/community/posts/360037324572-How-to-set-the-channel-order-in-iOS-share-menu) ; [contacts et salons dans la feuille](https://support.discord.com/hc/nl/community/posts/360071039831-iOS-Share-Sheet-includes-Discord-contacts-and-channels)
- [tiers] Par cette voie, on ne peut envoyer sur iOS que des images ou des vidéos, pas d'autres fichiers — [ITGeared](https://www.itgeared.com/how-to-send-files-through-discord)
- [communauté, tiers] Un webhook Discord appelé depuis le navigateur bute sur le CORS selon des rapports de 2021. Le contournement courant est un petit serveur relais. Un guide déconseille de mettre l'adresse d'un webhook dans du JavaScript côté client : le jeton qu'elle contient est sa seule authentification — [GitHub, DiscordConnect #14](https://github.com/caoranach/DiscordConnect/issues/14) ; [discord-webhook-proxy](https://github.com/tarohida/discord-webhook-proxy) ; [Inventive HQ](https://inventivehq.com/blog/discord-webhooks-guide)

**Snapchat**
- [officiel] Snap Kit — [Snap, Creative Kit Web](https://developers.snap.com/snap-kit/creative-kit/web) ; [Snap, revue](https://developers.snap.com/snap-kit/app-review/submission-and-review) ; [Creative Kit, GitHub](https://github.com/Snapchat/creative-kit) :
  - le Creative Kit Web ne demande « aucune préparation particulière » au-delà du bouton de partage, et un identifiant d'application facultatif ne sert qu'aux statistiques ;
  - le kit mobile exige d'enregistrer son application et une validation préalable de Snapchat avant toute mise à disposition.

**La feuille de partage (Web Share API)**
- [officiel, technique] Chromium vérifie les fichiers partagés contre une liste fermée d'environ 40 extensions, où figurent `.csv` et `.txt` — [Chromium, share_service_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/webshare/share_service_impl.cc). Un rapport de 2021 (Edge 96) dit que `application/json` est refusé — [Stack Overflow, miroir](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/70243790/web-share-api-permission-denied-on-certain-file-type)
- [officiel, technique] web.dev cite l'audio, l'image, le PDF, la vidéo et le texte, et renvoie à `navigator.canShare()`. Aucune liste n'est publiée pour iOS — [web.dev](https://web.dev/articles/web-share) ; [Stack Overflow, miroir](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/69728853/file-types-supported-in-ios-15-webshare)
- [praticien] Sur iOS, avec un paramètre `text`, l'option « Copier » copie le texte plutôt que l'adresse. Jeremy Keith rapporte que WebKit l'a enregistré comme bug 203221, « should prefer URL to text » — [Adactio](https://adactio.com/journal/15972)
- [praticien] Les champs qui arrivent dépendent de l'app cible et de la combinaison passée — [Phil Gyford, 2020](https://gyford.com/phil/writing/2020/04/10/web-share-api)
- [communauté, application native] WhatsApp sur iOS ne garde que le texte et laisse tomber l'adresse quand on lui passe les deux, alors qu'Android les garde. Le rapport vient d'une bibliothèque React Native, pas du web — [react-native-share #1497](https://www.github.com/react-native-share/react-native-share/issues/1497)
- [officiel, technique] Bug WebKit 251500 (2023) : quand un texte accompagne des fichiers, iOS ignore les fichiers — [WebKit, liste de diffusion](https://lists.webkit.org/pipermail/webkit-unassigned/2023-February/1084883.html)
- [communauté, ancien] Un développeur a vu une web app installée sur iPhone revenir sur une page blanche après un partage — [Stack Overflow, miroir](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/57409332/pwa-on-ios-navigates-to-blank-screen-on-share-button-click). Le partage entrant (Web Share Target) n'existe pas sur iOS — [note de recherche, décembre 2025](https://tangled.org/zzstoatzz.io/plyr.fm/blob/main/docs/research/2025-12-19-web-share-target-ios-pwa.md)

**Ce que fait déjà OpenContact**
- [projet] `boutonEnvoyer` partage **en texte seul** (`navigator.share({ text })`). Au doigt, il propose « Envoyer », sinon « Copier », et un échec retombe sur la copie — [ui/fichier.js, l. 62-88](/home/user/Open-Contact/ui/fichier.js)
- [projet] L'invitation d'un groupe est un texte. Elle demande à qui la reçoit de copier le message, puis de passer par « Réseau › Recevoir › Texte » : il n'y a pas de lien qui ouvre l'app au bon endroit — [ui/groupes.js, l. 964-966](/home/user/Open-Contact/ui/groupes.js)
- [projet] Les pistes données « en texte » partent par la feuille de partage, « là où la classe se parle ». Le texte porte la vue communautaire en JSON — [ui/donner.js, l. 482-499](/home/user/Open-Contact/ui/donner.js)
- [projet] Un fichier `.oc` est d'abord proposé sous son nom, puis en `.oc.txt` si Chrome le refuse. Le commentaire du code range `.json` parmi les extensions permises, ce que contredit le rapport de 2021 ; c'est sans effet, puisque le repli passe par `.txt` — [ui/fichier.js, l. 25-35](/home/user/Open-Contact/ui/fichier.js)
- [projet] Pour joindre un contact, `waHref` construit un lien `wa.me/<numéro>` et « Lui demander » un lien `sms:` avec le message — [ui/contact.js, l. 16-25](/home/user/Open-Contact/ui/contact.js) ; [ui/reseau.js, l. 789](/home/user/Open-Contact/ui/reseau.js)

### Inferences
- *(inférence)* **La forme est déjà la bonne : du texte seul, le lien dedans.** Elle échappe aux deux défauts d'iOS relevés ci-dessus. Le geste « Dire au groupe de la classe » (section 0) peut reprendre `boutonEnvoyer` tel quel.
- *(inférence)* **Aucune voie ne vise un groupe précis.** L'utilisateur choisit la conversation à chaque fois : la feuille de partage ou le sélecteur de WhatsApp. Pour une classe, c'est un geste de plus, pas un obstacle.
- *(inférence)* **Le retour vers l'app est le maillon faible.** Aujourd'hui, la réponse demande de copier le message puis d'aller dans « Recevoir › Texte ». Un lien qui ouvrirait OpenContact sur la bonne demande, ses données dans le fragment de l'adresse, épargnerait ce copier-coller. Deux points restent à vérifier :
  - le fragment d'une adresse n'est pas envoyé au serveur, c'est une connaissance générale du web, non sourcée ici ;
  - sur iPhone, un lien tapé dans WhatsApp s'ouvre sans doute dans le navigateur plutôt que dans l'app installée sur l'écran d'accueil, ce qui n'est pas vérifié. Les données qu'il porte devraient alors se lire dans les deux.
- *(inférence)* **L'automatisation vers Discord est exclue.** Un webhook demande un serveur relais (§10 : aucun serveur OpenContact) et met dans l'app un secret qui permet à quiconque de publier. La feuille de partage suffit.
- *(inférence)* **Snapchat et Instagram n'ont pas besoin d'intégration propre.** Pour la conversation à deux, la feuille de partage les propose déjà. Un kit qui demande une validation de Snap tombe sous la question ② (une démarche permanente).
- *(inférence)* Au poste, sans feuille de partage, « Copier » reste le chemin. `wa.me/?text=` pourrait servir de raccourci vers WhatsApp Web ou l'application de bureau, ce qui n'a pas été vérifié.

### Gaps
- La FAQ officielle de WhatsApp sur les liens n'a pas pu être lue (hôte bloqué). Sa formulation actuelle, notamment pour le lien sans numéro, n'est connue que par des tiers.
- L'état actuel du bug WebKit 203221 et de la perte de l'adresse par WhatsApp sur iOS est inconnu, de même que leur comportement exact quand on part du web plutôt que d'une application native.
- Le partage vers Discord sur Android n'est pas documenté dans les résultats.
- Le partage web vers Instagram et Messenger, ainsi que la syntaxe du corps d'un lien `sms:` sur iOS et Android, n'ont pas été vérifiés.
- On ne sait pas si un lien ouvre la web app installée ou Safari sur iPhone.

## 5. Les risques d'une messagerie pour un mainteneur seul : ce que les notes antérieures ne couvraient pas

### Takeaway
Quatre points complètent ou corrigent les notes du 4 novembre :
1. **Le code du groupe (confirmé dans le dépôt).** Un seul PBKDF2 tire du code l'étiquette des relais et la clé des messages. Quiconque a le code, par exemple en lisant l'invitation postée dans le groupe WhatsApp, peut relire ce qui reste sur les relais, jusqu'à 7 jours par défaut et 30 au plus, tant que le code ne change pas. Le fil n'est donc pas plus privé que la conversation où circule son invitation.
2. **Le harcèlement.** Les groupes de classe sont le premier lieu du cyberharcèlement des 6-18 ans, et e-Enfance juge les groupes chiffrés difficiles à contrôler. Garder un fil libre, c'est tenir un tel groupe sans personne au-dessus des admins.
3. **Le droit des mineurs et Chat Control.** Le Conseil constitutionnel a censuré le 14 août 2026 l'interdiction des réseaux sociaux aux moins de 15 ans : aucune obligation pour l'instant, un nouveau texte serait en préparation. Le règlement CSAM permanent n'est toujours pas adopté dans les dernières sources trouvées (juillet 2026). La dérogation provisoire, qui permet la détection volontaire, court jusqu'au 3 avril 2028.
4. **La catégorie juridique.** Une messagerie est, en droit français, un « service de communications interpersonnelles non fondé sur la numérotation » : un service de communications électroniques, avec des obligations propres. Savoir si un logiciel sans serveur fait de son auteur un « fournisseur » reste ouvert.

### Cited Findings
**Le code du groupe**
- [projet] « Un seul PBKDF2 en tire l'étiquette que voient les relais et la clé AES qui scelle chaque message ». La clé et l'étiquette ne dépendent que du code et d'un sel fixe — [engine/groupe.js, l. 10-16 et 172-183](/home/user/Open-Contact/engine/groupe.js)
- [projet] Chaque message part sur les relais avec une étiquette `x` et une date d'expiration NIP-40. Le projet suppose que les relais l'effacent d'eux-mêmes à l'échéance — [ui/groupes.js, l. 96-101](/home/user/Open-Contact/ui/groupes.js) ; [engine/groupe.js, l. 376-380](/home/user/Open-Contact/engine/groupe.js)
- [projet] Une phrase vit sept jours par défaut, 24 heures ou 30 jours au choix d'un responsable. Retirer un membre, passer l'entrée « sur demande » ou faire une nouvelle invitation change le code — [CLAUDE.md, §6 « Les groupes »](/home/user/Open-Contact/CLAUDE.md)
- [projet] L'invitation contient le code et part en texte vers la conversation de la classe — [ui/groupes.js, l. 964-966](/home/user/Open-Contact/ui/groupes.js)

**Le harcèlement**
- [sondage d'entreprise et d'association] 41 % des cas de cyberharcèlement des 6-18 ans passent par WhatsApp, « dont 25 % dans des groupes de classe » (mai 2025, 1 602 binômes). 25 % des victimes ont déjà pensé à se faire du mal ou au suicide, 39 % chez les filles — [Caisse d'Épargne × e-Enfance](https://newsroom.groupebpce.fr/download-pdf/69032c6160465505b60ccfbf) ; [Économie Matin](https://www.economiematin.fr/harcelement-cyber-reseaux-sociaux-jeunes-education)
- [sondage d'entreprise et d'association] 19 % des jeunes disent avoir participé à des actes de harcèlement, et 24 % d'entre eux reconnaissent avoir récidivé — [Journal de l'économie](https://www.journaldeleconomie.fr/cyberharcelement-omnipresent-dans-la-vie-des-jeunes/)
- [presse] Selon e-Enfance, les messageries chiffrées rendent ces groupes difficiles à contrôler — [franceinfo, 31 octobre 2025](https://media.ac-normandie.fr/-/communication/revue-presse/2025/10/31/FranceInfo.fr_nat_actu_national_Il%20n'y%20a%20pas%20de%20harc%e8lement%20d'un%20c%f4t%e9%20et%20de%20cyberharc%e8lement%20de%20l'autre,%20ce%20qui%20se%20passe%20entre%20les%20murs%20se%20poursuit%20en%20ligne.pdf)
- [tiers] Même une école, 42, juge difficile de modérer un espace de discussion tenu par ses étudiants — [Wikipédia](https://en.wikipedia.org/wiki/42_(school))

**Les mineurs**
- [presse] Le 14 août 2026, le Conseil constitutionnel a censuré l'article 1ᵉʳ de la loi, qui interdisait les réseaux sociaux aux moins de 15 ans, pour atteinte disproportionnée à la liberté d'expression — [Blog du Modérateur](https://www.blogdumoderateur.com/conseil-constitutionnel-censure-interdiction-reseaux-sociaux-moins-15-ans/) ; [L'Étudiant](https://www.letudiant.fr/lycee/l-interdiction-des-reseaux-sociaux-aux-moins-de-15-ans-censuree-au-nom-de-la-liberte-d-expression.html)
- [presse] Selon Next, la censure est une « non-conformité partielle », qui touche aussi le contrôle de l'âge des internautes, majeurs compris, au nom de leur vie privée — [Next](https://next.ink/251792/le-conseil-constitutionnel-censure-le-controle-de-lage-des-internautes-mineurs-ou-pas/)
- [presse] La loi avait été adoptée définitivement le 21 juillet 2026, par 279 voix contre 81, puis déférée par des députés LFI et PS — [Bourse Inside](https://bourseinside.fr/?p=12234). Un nouveau texte serait en préparation — [Journal de l'économie](https://www.journaldeleconomie.fr/tag/conseil-constitutionnel/)
- [presse, contradiction] Siècle Digital écrit que les services visés comprenaient des messageries comme WhatsApp et Messenger — [Siècle Digital, 17 août 2026](https://siecledigital.fr/2026/08/17/la-france-voulait-interdire-les-reseaux-sociaux-aux-moins-de-15-ans-le-conseil-constitutionnel-dit-non/). Les notes du 4 novembre rapportaient l'inverse, selon la rapporteure : les messageries privées n'étaient pas concernées. La question est sans objet tant que l'interdiction est censurée.

**Chat Control**
- [presse] Chat Control 1.0, la dérogation provisoire qui permet la détection volontaire, a été adopté au Parlement européen en juillet 2026 jusqu'au 3 avril 2028 (notes du 4 novembre). Une eurodéputée y voit la « vraie bataille » pour le chiffrement en septembre, autour de Chat Control 2.0 — [Euronews, 10 juillet 2026](https://fr.euronews.com/next/2026/07/10/chat-control-10-adopte-au-parlement-europeen-par-la-petite-porte)
- [tiers, militants et blogs, attribution exacte incertaine dans l'extrait] Le règlement permanent restait sans accord après cinq trilogues. Une source dit que le cinquième, le 29 juin 2026, a échoué et que les négociations reprenaient en septembre — [Andrea Fortuna, 10 juillet 2026](https://andreafortuna.org/2026/07/10/chatcontrol-survives/) ; [Fight Chat Control](https://fightchatcontrol.eu/chat-control-overview). *Contradiction possible :* les notes du 4 novembre relevaient à ce même trilogue un accord provisoire sur les communications audio. Les deux peuvent être vrais (un point d'accord, pas d'accord d'ensemble).

**La catégorie juridique**
- [officiel] Le Code des postes et des communications électroniques, modifié par l'ordonnance n° 2021-650 du 26 mai 2021, distingue les services de communications interpersonnelles fondés sur la numérotation et ceux qui ne le sont pas — [ordonnance 2021-650](https://en.arcep.fr/fileadmin/cru-1651234245/reprise/textes/communautaires/ordonnance-2021-650_JO_20210527.pdf) ; [CPCE, article L32](https://www.marche-public.fr/Marches-publics/Textes/Codes/CPCE/cpce-article-L032.htm). Un document parlementaire luxembourgeois range WhatsApp et iMessage dans la seconde catégorie — [Chambre des députés du Luxembourg](https://wdocs-pub.chd.lu/docs/exped/0126/021/252213.pdf)
- [officiel, lu en extrait] Le décret n° 2021-1281 du 30 septembre 2021 précise comment l'Arcep peut imposer à ces fournisseurs des obligations d'interopérabilité, sur la base de l'article 61(2) du Code européen des communications électroniques — [Le Monde du Droit](https://www.lemondedudroit.fr/pi-tic/298-telecommunications/77695-obligations-des-operateurs-de-communications-electroniques.html) ; [ORECE (BEREC)](https://www.berec.europa.eu/document-categories/berec/reports/berec-report-on-interoperability-of-number-independent-interpersonal-communication-services-ni-ics)
- [officiel, lu en extrait] Une sous-section du Code de la consommation ne s'applique pas à ces services, et les micro-entreprises qui ne fournissent que ce type de service sont exclues d'une autre section — [Code de la consommation, L224-25-4](https://french-business-law.com/rench-legislation-art/article-l224-25-4-of-the-french-consumer-code) ; [L224-26-3](https://french-business-law.com/rench-legislation-art/article-l224-26-3-of-the-french-consumer-code)
- [officiel] Selon le considérant 96 de la directive NIS2, ces services doivent respecter des exigences de sécurité adaptées à leur nature — [NIS2, considérant 96](https://luxgap.com/lois/nis2/cons-96/?lang=fr)

### Inferences
- *(inférence)* **La confidentialité ne justifie pas le fil.** Ceux qui lisent le groupe WhatsApp de la classe ont le code, donc peuvent lire le fil OpenContact pendant 7 à 30 jours, et il suffit d'une capture du QR pour qu'il circule plus loin. Le chiffrement protège contre les relais, pas contre la classe. C'est une lecture du code, pas un audit.
- *(inférence)* **Ce qui reste dans le groupe est structuré.** Pistes, demandes, entrées : ces événements ne portent que ce que l'app y met. Le texte libre, lui, peut tout contenir, insultes et images de personnes comprises. Sortir le texte libre retire le vecteur de harcèlement sans retirer le groupe.
- *(inférence)* **L'exposition juridique reste incertaine, mais ne s'aggrave pas du côté des mineurs.** La loi sur les moins de 15 ans est censurée, et le public, BTS et BUT, est surtout majeur. En revanche, une messagerie relève d'une catégorie du droit des communications électroniques dont un mainteneur seul ne peut pas évaluer seul les obligations : sécurité, interopérabilité sur décision de l'Arcep, Chat Control 2.0 à venir. Les demandes et les pistes s'y exposent moins, sans qu'aucune source ne le tranche.
- *(inférence)* **Le coût de maintenance déjà chiffré** (notes du 4 novembre : environ 2 870 lignes et neuf scénarios) baisse surtout dans les écrans et les tests de la conversation. Les relais et la boîte aux lettres restent, parce qu'ils portent aussi les demandes, les profils, `adieu` et les nouveaux codes.

### Gaps
- **L'effacement à l'échéance (NIP-40)** dépend de chaque relais, et n'a pas été vérifié dans cette session : un relais qui l'ignore garderait les messages au-delà de 7 jours.
- **Chat Control 2.0 entre septembre et novembre 2026** : aucune source trouvée.
- **Le nouveau texte français sur les mineurs** : ni date ni contenu confirmés.
- **Le statut d'un client libre, gratuit et sans serveur** : est-il un « fournisseur » de service de communications interpersonnelles, et lesquelles des obligations s'appliqueraient ? Il faut un avis juridique.
- **Aucune donnée sur le harcèlement entre étudiants majeurs** dans les groupes de promo en France : l'étude e-Enfance s'arrête à 18 ans.
