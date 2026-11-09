# Réseau et messagerie : garder la messagerie intégrée d'OpenContact, ou s'appuyer sur celles des étudiants ? Quelle partie de la couche sociale apporte une valeur propre ?

> **Comment lire ces notes.** Recherche menée le 4 novembre 2026, 44 recherches web. La lecture directe des pages était bloquée dans cette session : diplomeo.com et blogdumoderateur.com ne se résolvaient pas, et la consigne était de ne pas essayer d'autres hôtes. **Tout ce qui vient du web a donc été lu en extraits de résultats de recherche, jamais dans la page entière.** Les chiffres pour lesquels ce point compte sont signalés.
>
> Étiquettes :
> - [officiel] statistique publique, texte de loi, institution ;
> - [recherche] article à comité de lecture ;
> - [industrie] page ou communiqué d'une entreprise sur son propre produit ;
> - [éditeur] chiffre d'un vendeur de briques de messagerie ;
> - [praticien] essai d'investisseur ou de fondateur, pas de la recherche ;
> - [presse] ;
> - [tiers] agrégateur, blog, guide ;
> - [projet] fait tiré du dépôt OpenContact.
>
> Quelques références viennent d'une note antérieure du projet (`research_notes/Accompagner la recherche de stage/`), et sont signalées comme telles.

## 0. La recommandation tient-elle ? Ce qui tient, ce qui ne tient pas, ce qui reste incertain

### Takeaway
La recommandation tient sur le fond, avec une correction. Ce qu'il faut remettre en question, c'est **la conversation libre** : le fil du groupe et les messages entre amis. **Le groupe lui-même**, en revanche, n'est pas en cause. Il porte deux choses que WhatsApp ne fait pas :
- des pistes qui entrent dans le suivi avec un aperçu et « Annuler » ;
- des demandes acheminées vers la personne dont le téléphone a trouvé quelqu'un.

Ces deux fonctions marchent sans un seul message tapé.

La valeur propre de la couche sociale est **le lien humain** : qui est passé où, la demande qui passe d'ami en ami, la présentation.

Trois points restent incertains : où vivent vraiment les classes d'informatique (WhatsApp ou Discord), si les étudiants se serviraient des groupes d'OpenContact, et le statut juridique d'une messagerie sans serveur. Enfin, retirer les messages relève du mainteneur : il les a gardés le 3 novembre 2026 et la refonte les range dans son socle.

### Cited Findings
- [officiel] WhatsApp est la messagerie commune en France. Parmi les utilisateurs de messageries instantanées, 87 % utilisent WhatsApp, 76 % Messenger et 60 % Instagram, et 82 % en utilisent au moins deux (terrain de juin 2025, lu en extraits) — [CREDOC, Baromètre du numérique, édition 2026](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_RAPPORT.pdf)
- [recherche] On choisit l'outil de ses contacts. Sur 60 personnes interrogées, 50 disent utiliser le plus les outils qu'utilisent la plupart de leurs contacts. L'adoption d'une messagerie de plus bute sur des bases d'utilisateurs fragmentées — [Abu-Salma et al., IEEE S&P 2017](https://www.ieee-security.org/TC/SP2017/papers/84.pdf) ; [Help Net Security](https://helpnetsecurity.com/?p=65864)
- [recherche] Quand l'établissement fournit un espace de discussion (un forum Moodle), les étudiants créent et préfèrent leur propre groupe WhatsApp ou Telegram. Détails et sources en section 2.
- [industrie] WhatsApp a déjà les mécanismes qu'OpenContact a reconstruits : un admin qui valide les entrées par lien (2023), et des messages éphémères de 24 h, 7 jours ou 90 jours (2021). Sources en section 3.
- [officiel, technique] Sur iPhone, une page web ne reçoit de notifications que si elle est ajoutée à l'écran d'accueil (iOS 16.4 et plus), et l'envoi passe par un service de push — [WebKit](https://webkit.org/?p=13878)
- [projet] OpenContact n'envoie aucune notification. Il relève les groupes toutes les cinq minutes, et seulement pendant que l'app est à l'écran — [ui/groupes.js, l. 1407](/home/user/Open-Contact/ui/groupes.js) ; [ui/reseau.js, l. 493](/home/user/Open-Contact/ui/reseau.js)
- [éditeur] L'idée qu'une messagerie intégrée « fait revenir » repose sur des chiffres de vendeurs : 45 % des clients interrogés par Stream disent avoir au moins doublé leur rétention — [Stream](https://getstream.io/blog/chat-improves-app-metrics/)
- [recherche] Une place de marché garde la conversation chez elle pour garder la transaction. Or plus la confiance monte, plus les utilisateurs la contournent — [Gu & Zhu, *Management Science*, 2021](https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.2020.3583)
- [projet] Deux choix d'OpenContact supposent déjà qu'une autre messagerie existe :
  - l'invitation d'un groupe part par la feuille de partage du téléphone, « donc la conversation de la classe en un geste » ;
  - le profil donné à un ami ne contient pas de quoi le joindre, parce que « tu le peux déjà ».

  — [CLAUDE.md, §6 « Les groupes » et §8](/home/user/Open-Contact/CLAUDE.md)
- [projet] Au retour à la 6.70 (3 novembre 2026), le mainteneur a gardé « les amis, les groupes et les messages ». La refonte range « amis, groupes, messages, demandes, telles qu'en 8.1.0 » dans le socle qui ne bouge pas — [CLAUDE.md, §0](/home/user/Open-Contact/CLAUDE.md) ; [docs/refonte.md](/home/user/Open-Contact/docs/refonte.md)
- [projet] Le projet a lui-même formulé l'argument le plus fort pour un fil de groupe : une question visible de tous fait répondre avec ce qu'aucune app ne sait (« mon cousin travaille chez Aztek », « mon ancien maître de stage y est passé ») — [docs/reseau.md, « Gardé de côté : le fil du groupe »](/home/user/Open-Contact/docs/reseau.md)
- [sondage d'éditeur] LinkedIn ne touche que 43 % des 16-25 ans interrogés — [Diplomeo, 2025](https://diplomeo.com/actualite-sondage_reseaux_sociaux_jeunes_2025)
- [industrie] Le bouton « Ask for a Referral » de LinkedIn ne s'affiche que pour les entreprises où l'on a déjà une relation — [LinkedIn, 2018](https://blog.linkedin.com/2018/march/19/introducing-ask-for-a-referral-making-it-easier-to-find-your-way-in)

### Inferences
**Ce qui tient**
- *(inférence)* **La conversation libre double ce que les étudiants ont déjà, et le fait moins bien.** Quatre écarts :
  - pas de notification : un message attend que l'autre rouvre l'app, ce qui peut prendre des jours ;
  - des membres partiels : seuls ceux qui ont installé OpenContact y sont, alors que toute la classe est dans le groupe WhatsApp ;
  - du texte seul (« une phrase, pas d'image », décision 27) ;
  - personne au-dessus des admins du groupe pour recevoir un signalement.

  Elle n'apporte en échange qu'un chiffrement de bout en bout. WhatsApp l'a déjà, et la plupart des gens ne le comprennent pas (section 5).
- *(inférence)* **Le lien humain est la partie qui n'existe nulle part ailleurs, et elle ne demande pas de conversation.** On la décompose en trois éléments :
  - « qui est passé où », déclaré par des camarades qui ne sont pas sur LinkedIn (57 % des 16-25 ans interrogés n'utilisent pas LinkedIn) et affiché sur la piste elle-même ;
  - la demande qui dépasse le premier cercle en protégeant la chaîne, alors que LinkedIn s'arrête aux relations directes ;
  - la demande qui désigne nommément qui peut aider, au lieu d'être lancée à tous.
- *(inférence)* **Le lien humain marche à deux.** Une demande à un seul ami qui est passé par l'entreprise rend déjà service. Un fil de classe, lui, ne devient « le » lieu de la classe que si presque toute la classe y est. Dans le vocabulaire d'Andrew Chen (section 2), son « réseau atomique » est beaucoup plus gros.
- *(inférence)* **Les raisons qu'ont les autres de garder la conversation chez eux ne s'appliquent pas ici.** Elles sont deux : protéger une commission, et mesurer l'engagement. OpenContact ne prélève rien, et sa refonte refuse le nombre d'ouvertures comme mesure : « un étudiant qui trouve et n'ouvre plus l'app est une réussite » ([docs/refonte.md](/home/user/Open-Contact/docs/refonte.md)).

**Ce qui ne tient pas, ou pas tel quel**
- *(inférence)* **« Les groupes doublent WhatsApp » est à moitié faux.** Le groupe vu comme une adresse protégée par un code, qui reçoit des pistes et des demandes, n'a pas d'équivalent dans WhatsApp. Seul le fil de messages en a un.

  Il y a plus. Poster une demande dans le groupe WhatsApp de 35 personnes, c'est la situation où chacun attend qu'un autre réponde. L'app répond à cette dilution en mettant la demande en tête chez celui dont le téléphone a trouvé quelqu'un, à son nom ; WhatsApp ne peut pas le faire. Ce mécanisme est décrit dans le projet (`docs/reseau.md`, décision 29). Les chiffres de l'effet témoin que cite le projet n'ont pas été revérifiés, ni ici ni dans la note antérieure.
- *(inférence)* **« WhatsApp » est trop étroit pour les conversations entre deux personnes.** Chez les 16-25 ans, Snapchat et Instagram comptent autant (section 1). La formulation juste serait : « double les messageries que les étudiants ont déjà ».
- *(inférence)* **Retirer la conversation ne retire ni les relais ni la cryptographie.** La boîte aux lettres (`engine/boite.js`, 631 lignes) porte aussi les demandes, les mises à jour de profil, la lettre `adieu` et les nouveaux codes de groupe. Le gain se fait en écrans, en tests et en exposition (modération, droit), pas en infrastructure (section 5).
- *(inférence)* **Un groupe sans conversation garde un fil d'événements** : pistes données, demandes, « Karim veut entrer », « Retiré par Inès ». Le retrait des messages libres ne supprime donc pas l'écran du groupe.

**Ce qui reste incertain**
- **Le lieu de la classe.** En informatique et en cybersécurité, la classe vit peut-être sur Discord plutôt que sur WhatsApp. Aucune donnée chiffrée n'a été trouvée (section 1). Cela change la cible du partage, pas la conclusion.
- **L'usage des groupes d'OpenContact.** Aucune donnée. L'étape « Comprendre » de la refonte (entretiens) est l'endroit où le demander.
- **Le savoir qu'aucune app ne détient** (« mon cousin… »). Sans fil, il doit passer :
  - soit par la réponse structurée « Je connais quelqu'un », qui existe déjà ;
  - soit par le groupe WhatsApp, au prix de l'acheminement nominatif.

  On ne sait pas laquelle des deux voies les étudiants prendraient.
- **Le droit.** La qualification d'une messagerie de groupe sans serveur, distribuée gratuitement, n'est pas tranchée (section 5).
- **La décision.** Les messages font partie du socle de la refonte. Les retirer demande une décision du mainteneur, montrée en captures comme toute retouche visible (CLAUDE.md, §0).

### Gaps
- Aucune enquête française 2024-2026 trouvée sur les groupes de classe ou de promo : quelle part des étudiants y est, et sur quelle application.
- Aucune donnée d'usage publique sur les messageries ajoutées à des apps qui n'en sont pas (Handshake en 2019, Strava en 2023).
- Aucune source ne tranche le statut juridique du projet au regard du DSA.
- Les lacunes propres à chaque question sont détaillées ci-dessous.

## 1. Quelles messageries les étudiants et jeunes adultes français utilisent-ils, et pour quoi ?

### Takeaway
En France, la messagerie est quasi universelle (86 % des 12 ans et plus), WhatsApp domine (87 % des utilisateurs) et presque tout le monde en utilise plusieurs (82 %). Chez les 16-25 ans, Instagram et Snapchat sont aussi des messageries du quotidien. Selon un extrait non confirmé, WhatsApp sert à 80 % d'entre eux à parler à leurs proches.

Aucune enquête française récente n'a été trouvée sur les groupes de classe ou de promo eux-mêmes : on ne dispose que d'exemples. Pour les étudiants en informatique, des serveurs Discord de formation existent, sans aucun chiffre d'usage.

### Cited Findings
- [officiel] Le Baromètre du numérique, édition 2026, est réalisé par le CREDOC pour l'Arcep, l'Arcom, le CGE et l'ANCT. Terrain du 5 au 21 juin 2025, auprès de 4 145 personnes de 12 ans et plus en France métropolitaine (lu en extraits) — [Arcep, communiqué](https://www.arcep.fr/actualites/actualites-et-communiques/detail/n/equipements-et-usages-du-numerique-090226.html) ; [CREDOC, rapport](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_RAPPORT.pdf)
- [officiel] 86 % de la population utilise une messagerie instantanée, et 64 % chaque jour (+2 points en un an) — [Arcep, communiqué](https://www.arcep.fr/actualites/actualites-et-communiques/detail/n/equipements-et-usages-du-numerique-090226.html)
- [officiel] Parmi les utilisateurs de messageries : WhatsApp 87 %, Messenger 76 %, Instagram 60 % — [CREDOC, rapport](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_RAPPORT.pdf)
- [officiel] 82 % des utilisateurs de messageries en utilisent au moins deux — [CREDOC, rapport](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_RAPPORT.pdf)
- [officiel] Le rapport signale que les 18-24 ans adoptent plus souvent certaines fonctions. Le détail par messagerie n'apparaissait pas dans les extraits — [CREDOC, rapport](https://www.arcep.fr/uploads/tx_gspublication/barometre-du-numerique-edition-2026_RAPPORT.pdf)
- [tiers, non confirmé dans le rapport] Un site tiers attribue au même baromètre les chiffres suivants — [Osmova](https://osmova.com/messageries-france/) :
  - chez les 18-24 ans, 65 % utilisent chaque jour la messagerie d'Instagram, et 61 % celle de Snapchat ;
  - sur l'ensemble des 12 ans et plus, WhatsApp 73 %, Instagram 50 %, Snapchat 39 %.

  Ces chiffres rapportés à toute la population ne se comparent pas aux 87 % calculés sur les seuls utilisateurs.
- [sondage d'éditeur] L'enquête Diplomeo × Blog du Modérateur 2025 a interrogé 444 jeunes de 16 à 25 ans — [Diplomeo](https://diplomeo.com/actualite-sondage_reseaux_sociaux_jeunes_2025) ; [BDM](https://www.blogdumoderateur.com/etude-comment-gen-z-utilise-reseaux-sociaux-2025/). Ses résultats :
  - Instagram 76 %, Snapchat 63 %, TikTok 60 %, LinkedIn 43 %, Pinterest 40 % ;
  - un tiers passe 1 à 3 heures par jour sur les réseaux sociaux ;
  - 39 % ont quitté au moins une plateforme ;
  - 75 % s'en servent pour discuter avec leurs proches.
- [sondage d'éditeur, extrait non confirmé par une seconde recherche] Dans la même enquête, 80 % utiliseraient WhatsApp pour communiquer avec leurs proches, devant les SMS et iMessage (67 %) — [BDM](https://www.blogdumoderateur.com/etude-comment-gen-z-utilise-reseaux-sociaux-2025/)
- [tiers, déclaratif] Snapchat en France : entre 23 et 27,8 millions d'utilisateurs selon les sources, et Snap revendiquerait 26 millions d'utilisateurs actifs mensuels — [BDM, chiffres Snapchat](https://www.blogdumoderateur.com/chiffres-snapchat/?authuser=0) ; [Les Gens d'Internet](https://gensdinternet.fr/2025/02/14/les-chiffres-cles-de-snapchat-en-2025-influence-marketing-social-media-createurs)
- [presse, ancien] Médiamétrie (2022) : Snapchat touchait 94 % des 15-24 ans — [Siècle Digital, 2022](https://siecledigital.fr/2022/04/15/snapchat-passe-le-cap-des-25-millions-dutilisateurs-en-france/)
- [tiers, agrégateur] Médiamétrie, *L'Année Internet 2025* : 1 h 47 par jour en moyenne sur les réseaux sociaux et les messageries. Chez les 11-14 ans, Snapchat arrive devant WhatsApp, Instagram, TikTok et Facebook. Le même agrégateur cite l'Arcom : environ 55 heures par mois sur Snapchat pour les 15-17 ans — [statistiques.com, réseaux sociaux](https://www.statistiques.com/internet/reseaux-sociaux) ; [statistiques.com, adolescents](https://www.statistiques.com/internet/adolescents-et-internet)
- [presse, non daté dans l'extrait] Les groupes de classe ou de promo se créent souvent sur Facebook quelques jours après la rentrée ; l'article ne parle pas de WhatsApp — [L'Etudiant](https://www.letudiant.fr/etudes/peut-on-se-passer-des-groupes-facebook-de-classe-et-de-promo.html)
- [industrie] Exemple de groupe WhatsApp animé dans un établissement : celui de BSB (Dijon, Lyon), tenu par des étudiants pour accueillir les étudiants internationaux — [BSB](https://hub.bsb-education.com/hc/fr/articles/26053075304092--International-Mates-Student-Experience)
- [presse, institution] Les affaires disciplinaires de 2025 montrent des groupes WhatsApp d'étudiants à Paris 1, dans une L3 d'histoire d'Aix-Marseille et dans une résidence du Crous à Pessac. Sources en section 5.
- [tiers] Des serveurs Discord d'étudiants en informatique existent : par exemple celui des licences informatiques de l'université de Montpellier, ouvert aux anciens et aux externes — [Discord](https://discord.com/servers/licences-informatiques-de-luniversite-de-358188946733400064)
- [officiel] Un tutoriel de l'université Paris-Saclay explique comment organiser un serveur Discord de formation, avec un salon par groupe et des rôles comme « promo 2020 » — [Paris-Saclay](https://www.persay.universite-paris-saclay.fr/app/uploads/2022/03/tuto-discord.pdf)
- [presse étudiante, hors France, anecdotique] À l'université de Groningue, des groupes de programme comptent plusieurs centaines de membres, jusqu'à 500 messages par jour en période d'examens selon un étudiant ; beaucoup les mettent en sourdine — [UKrant](https://ukrant.nl/magazine/group-chat-overload-mute-those-study-related-text-messages/?lang=en)

### Inferences
- *(inférence)* Pour une classe française, WhatsApp est le dénominateur commun : c'est la seule messagerie dont presque tout le monde dispose (87 % des utilisateurs). Un groupe de classe y a donc toute la classe, ce qu'aucun groupe dans OpenContact n'aura tant que l'app n'est pas installée par tous.
- *(inférence)* Chez les 16-25 ans, les conversations à deux vivent aussi sur Snapchat et Instagram (63 % et 76 % d'usage, et une forte messagerie quotidienne selon un tiers). La messagerie entre amis d'OpenContact s'ajoute donc à deux ou trois canaux déjà ouverts entre les mêmes personnes.
- *(inférence)* Le multi-usage (82 %) montre qu'ajouter un canal n'est pas impossible en soi. Mais un canal de plus doit apporter ce que les autres n'ont pas (section 2, Abu-Salma). Une conversation libre n'apporte rien de tel ; des pistes structurées et des demandes acheminées, si.
- *(inférence, à vérifier en entretien)* Les étudiants en informatique et en cybersécurité sont plus probablement que d'autres sur Discord, ce qui ferait de Discord le lieu de certaines classes. Si c'est le cas, le partage vers « la conversation de la classe » doit savoir viser Discord autant que WhatsApp. La feuille de partage du système le fait déjà (section 3).

### Gaps
- **Aucune enquête française 2024-2026 trouvée sur les groupes de classe ou de promo** : part des étudiants qui y sont, application, usage pour la recherche de stage. Ni l'Observatoire de la vie étudiante (OVE), ni Born Social, ni l'Arcom n'ont été trouvés sur ce point.
- **La ventilation par âge et par messagerie du Baromètre 2026** n'a pas été obtenue : seulement les chiffres d'un tiers, non confirmés.
- **L'usage de Discord** par les étudiants français, et a fortiori par les étudiants en informatique : aucun chiffre.
- **Les pages Diplomeo et BDM** n'ont pas pu être lues (hôtes bloqués). Le chiffre « 80 % WhatsApp pour les proches » n'a été vu que dans un extrait.
- Une étude de 2024 (Hermand, revue *Communiquer*) porte sur les groupes de classe WhatsApp dans des universités d'Afrique francophone. Elle n'a pas été lue, et ne vaut pas pour la France.

## 2. Quand une messagerie ajoutée à une app qui n'en est pas une réussit-elle, et quand échoue-t-elle ?

### Takeaway
Les raisons documentées de garder la conversation dans l'app sont commerciales : une place de marché la garde pour garder la transaction et la confiance, et les utilisateurs la contournent quand même dès que la confiance est là (Gu & Zhu, 2021). La preuve qu'une messagerie intégrée fait revenir les gens ne vient que de vendeurs de messagerie.

Les cadres de praticiens disent deux choses :
- Dixon : l'outil d'abord, le réseau ensuite ; ce passage réussit rarement selon ses critiques ;
- Chen : le réseau doit atteindre un « réseau atomique » qui tient seul. Pour une messagerie, la barre est haute : chez Slack, 2 000 messages avant qu'une équipe reste.

La recherche dit aussi que l'on va là où sont ses contacts (Abu-Salma, 2017), et que des étudiants délaissent l'espace de discussion fourni par l'établissement au profit de leur propre groupe.

### Cited Findings
- [praticien] Chris Dixon a popularisé en janvier 2015 la formule « Come for the tool, stay for the network » : attirer avec un outil utile seul, puis amener peu à peu au réseau. Lu en sources secondaires, l'essai d'origine n'ayant pas été lu — [note de lecture de *The Cold Start Problem*](https://www.goodreads.com/notes/56962799-the-cold-start-problem/10957646-claus-enevoldsen/79edb29b-c9f1-4547-b5af-1f98a57abad0)
- [presse, opinion] Deux tribunes de TechCrunch critiquent la formule — [TechCrunch](https://techcrunch.com/?p=1420204) ; [TechCrunch, 2016](https://techcrunch.com/2016/12/01/come-for-the-tool-stay-for-the-network-reconsidered/?ncid=rss) :
  - beaucoup de start-up grand public ont essayé l'outil puis le réseau, et on peine à citer de grands succès ;
  - l'histoire d'Instagram est souvent réécrite : le partage et l'abonnement y étaient dès le départ ;
  - construire un produit social est presque toujours plus difficile que construire un bon outil pour un seul utilisateur.
- [praticien] Andrew Chen (*The Cold Start Problem*, 2021) appelle « réseau atomique » le plus petit réseau qui tient seul et peut croître. Selon lui, les grands réseaux se construisent en réussissant un réseau atomique, puis en le répliquant à côté — [Lenny's Newsletter, extrait « The Atomic Network »](https://www.lennysnewsletter.com/p/atomic-network)
- [praticien, résumé secondaire à vérifier dans le livre] Les exemples iraient d'environ trois personnes pour Slack à environ 300 annonces par marché pour Airbnb — [résumé](https://www.antoinebuteau.com/the-cold-start-problem-book-summary.md) ; [résumé](https://blas.com/the-cold-start-problem/)
- [praticien, citation secondaire] Selon Stewart Butterfield, cité dans le livre de Chen : une équipe qui avait échangé 2 000 messages « avait vraiment essayé Slack », et 93 % de ces clients l'utilisaient encore. L'entretien d'origine (Recode, 2015) n'a pas été lu — [note de lecture de *The Cold Start Problem*](https://www.goodreads.com/notes/56962799-the-cold-start-problem/84411704-mikko-ikola/435bc888-c6a7-45f1-83c2-6c66617e1ab2)
- [recherche] Gu & Zhu, « Trust and Disintermediation: Evidence from an Online Freelance Marketplace », *Management Science* 67(2), 2021, p. 794-807. Essai randomisé sur une place de marché de freelances. Renforcer la confiance fait embaucher davantage de freelances de qualité, mais au-delà d'un seuil, elle pousse à contourner la plateforme, ce qui annule le gain de revenu — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.2020.3583) ; [RePEc](https://econpapers.repec.org/RePEc:inm:ormnsc:v:67:y:2021:i:2:p:794-807)
- [recherche] Gu, *Management Science* 70(11), 2024. Le blocage de Skype en Chine continentale a réduit d'environ 18 % le contournement d'une place de marché — [RePEc](https://econpapers.repec.org/RePEc:inm:ormnsc:v:70:y:2024:i:11:p:7868-7891)
- [éditeur, auto-déclaré] Stream a interrogé ses propres clients : 45 % disent avoir au moins doublé leur rétention après avoir ajouté sa brique de messagerie, 76 % la satisfaction. L'échantillon est choisi par le vendeur, il ne s'agit pas d'une étude contrôlée — [Stream](https://getstream.io/blog/chat-improves-app-metrics/)
- [éditeur, auto-déclaré] CometChat reprend le chiffre d'environ 70 % d'apps ayant doublé leur engagement — [CometChat](https://www.cometchat.com/blog/app-engagement-statistics)
- [recherche] Abu-Salma et al., « Obstacles to the Adoption of Secure Communication Tools », IEEE S&P 2017, 60 entretiens — [IEEE](https://www.ieee-security.org/TC/SP2017/papers/84.pdf) ; [Help Net Security](https://helpnetsecurity.com/?p=65864) :
  - l'adoption est freinée par des bases d'utilisateurs fragmentées et des outils incompatibles entre eux, et non d'abord par l'ergonomie ;
  - 50 participants sur 60 disent utiliser le plus les outils qu'utilisent la plupart de leurs contacts ;
  - la grande majorité ne comprend pas ce qu'est le chiffrement de bout en bout.
- [presse, données Sensor Tower] La fuite de janvier 2021 n'a pas déplacé les groupes — [Sensor Tower](https://sensortower.com/blog/whatsapp-signal-telegram-install-growth) :
  - après le changement de règles de confidentialité de WhatsApp, Signal et Telegram ont bondi en téléchargements (Signal environ 60 millions entre le 6 et le 29 janvier 2021, selon un relais de presse ; les chiffres varient selon les sources) ;
  - les installations se sont ensuite normalisées.
- [presse] Face à la contestation, WhatsApp a repoussé son changement de trois mois — [TechCentral](https://techcentral.co.za/whatsapp-scrambles-to-contain-fallout-as-users-flee-to-rival-apps/104207/)
- *Lecture :* aucune des sources ne teste directement l'effet de réseau. Le recul rapide des nouvelles installations est compatible avec lui, sans le prouver.
- [recherche, petits échantillons, hors France] Des étudiants délaissent l'espace fourni par l'établissement :
  - Mpungose (2020, Afrique du Sud, 25 étudiants de première année) : ils jugent le forum Moodle difficile, créent leur propre groupe WhatsApp et le préfèrent — [*Education and Information Technologies*, doi:10.1007/s10639-019-10005-5](https://springerlink.bibliotecabuap.elogim.com/content/pdf/10.1007%2Fs10639-019-10005-5.pdf) ;
  - Ramkissoon (Maurice, 600 étudiants) : 68,4 % passent par WhatsApp, contre 23,6 % par Moodle — [scite](https://scite.ai/authors/parmeswar-ramkissoon-RZNVVW) ;
  - Pereira (Espagne, trois ans) : des groupes Telegram de classe plus vivants que les forums Moodle, et plus de 90 % des étudiants veulent les garder — [EHU](https://ekoizpen-zientifikoa.ehu.eus/documentos/60cd62c063d7a5247e8da2f7).
- [presse] Strava a ajouté en décembre 2023 les messages entre deux personnes et les groupes, gratuits pour tous, d'abord sur mobile — [Android Authority](https://www.androidauthority.com/strava-messaging-3391139) ; [GCN](https://www.globalcyclingnetwork.com/tech/news/messaging-comes-to-strava-functionality-launches-for-dms-and-group-chats) ; [Cycling Magazine](https://cyclingmagazine.ca/?p=96664) :
  - le créateur d'un groupe ajoute ou retire des participants, on y partage activités et parcours ;
  - un réglage dit qui peut vous écrire ;
  - la messagerie dans les clubs était annoncée pour 2024 ;
  - le but annoncé : organiser les sorties sans quitter l'app — [TechRadar](https://www.techradar.com/computing/software/strava-gets-a-handy-direct-messaging-feature-to-make-organizing-rides-easier).
- [industrie] Handshake a ouvert la messagerie entre étudiants et anciens à partir de juillet 2019, dans plus de 800 établissements partenaires — [Idaho State University](https://isu.edu/news/2019-spring/handshake-the-career-center-software-program-will-feature-a-new-studentalumni-peer-messaging-feature-in-july.html). Son communiqué annonce 14 millions d'étudiants et de jeunes diplômés — [PR Newswire](https://prnewswire.com/news-releases/handshake-makes-industry-leading-early-career-community-available-to-every-undergraduate-university-student-in-america-300904082.html)
- [industrie] Chez Handshake, qui peut recevoir un message dépend de l'activité récente, du volume de messages, du taux de réponse et de la proximité du poste. Signaler un message empêche l'expéditeur d'écrire encore — [Handshake, aide](https://support.joinhandshake.com/hc/en-us/articles/360020974233)
- [industrie] Les chiffres d'engagement de Handshake sont déclaratifs : en moyenne 60 % d'engagement en plus quand une école passe à Handshake (brochure), et 77 % d'activation à HEC Paris (étude de cas) — [Handshake, brochure](https://go.joinhandshake.com/rs/390-ZTF-353/images/Handshake_Benefits_Across_Campus.pdf) ; [Handshake, HEC Paris](https://joinhandshake.co.uk/blog/careers-services/how-hec-paris-leverages-handshake-to-drive-student-engagement-and-make-data-informed-decisions)
- [sondage d'entreprise, États-Unis, auto-sélectionné] 66 % se sont déjà sentis débordés par des discussions de groupe, et 52 % ont du mal à les suivre. Selon 42 % des répondants, la messagerie de groupe « ressemble à un travail à temps partiel » — [Secure Data Recovery](https://www.securedatarecovery.com/blog/group-messaging-feels-like-job)
- [projet] Ce qui juge la refonte : les étudiants qui décrochent, l'adéquation ressentie, l'absence de préjudice, « jamais le nombre d'ouvertures » — [docs/refonte.md](/home/user/Open-Contact/docs/refonte.md)

### Inferences
- *(inférence)* Les deux moteurs habituels d'une messagerie intégrée sont absents chez OpenContact : protéger une commission (Gu & Zhu) et augmenter l'engagement (vendeurs). L'app ne prélève rien et refuse l'engagement comme mesure. Il ne reste que l'argument d'usage : la conversation est-elle mieux ici qu'ailleurs ? Les sections 1, 3 et 5 disent que non, pour la conversation libre.
- *(inférence)* **La masse critique dans une classe.** Le fil d'un groupe OpenContact n'a que les camarades qui ont installé l'app, et le groupe WhatsApp de la même classe les a tous. Le premier est donc un canal parallèle à membres partiels, la situation exacte où Abu-Salma voit l'adoption échouer.
  - Pour devenir une habitude, une messagerie a besoin de volume : chez Slack, 2 000 messages (praticien).
  - Un fil de classe qui n'est pas le canal principal n'atteindra pas ce volume.
  - À l'inverse, échanger des pistes et des demandes ajoute quelque chose dès deux utilisateurs, parce que WhatsApp ne sait pas le faire.
- *(inférence)* Le fil d'un groupe OpenContact est dans la position du forum Moodle des études ci-dessus : un second espace, voulu par l'outil, à côté du groupe que les étudiants ont créé eux-mêmes. C'est une analogie, pas une preuve : les études portent sur des cours, hors de France, avec de petits échantillons.
- *(inférence)* Strava montre qu'une app qui n'est pas une messagerie peut en ajouter une. Mais Strava a des serveurs, des notifications et un graphe social de plusieurs dizaines de millions de personnes, et aucun résultat public n'a été trouvé. Le cas ne se transpose pas à une app web sans serveur.
- *(inférence)* La messagerie de Handshake suppose une équipe centrale : qui peut recevoir des messages se calcule sur ses serveurs, et les signalements arrivent chez son équipe Trust & Safety. OpenContact n'a ni l'un ni l'autre (section 5).
- *(inférence, praticien)* Le cadre de Dixon soutient l'ordre que le projet suit déjà : le suivi des pistes doit valoir sans réseau, le réseau s'ajoute. Ses critiques disent que l'étape « réseau » échoue souvent. C'est une raison de garder la couche réseau la plus petite possible, et de la faire porter sur ce qui ne se trouve pas ailleurs.

### Gaps
- **Aucune donnée d'usage publique après lancement** pour la messagerie de Handshake (2019) ni pour celle de Strava (2023).
- **Aucun cas documenté d'une app « outil » qui a retiré sa messagerie faute d'usage.** Duolingo a fermé ses forums le 22 mars 2022, mais ses raisons officielles n'ont pas été trouvées — [MetaFilter](https://metatalk.metafilter.com/26027/Duolingo-forums-shutting-down-March-22). À ne pas citer comme preuve.
- **Aucun article CHI ou CSCW trouvé dans cette session** sur l'adoption d'une messagerie dans une app qui n'en est pas une, ni sur la surcharge des groupes.
- **Aucun seuil empirique de masse critique** pour un groupe de classe : seulement les notions de praticiens.
- L'essai de Dixon, le livre de Chen et l'entretien Recode de Butterfield n'ont été lus qu'à travers des sources secondaires.

## 3. Quelles alternatives passent par les messageries existantes, et que gardent les apps de coordination chez elles ?

### Takeaway
Les apps de coordination qui ne sont pas des messageries suivent un même motif : **l'objet reste dans l'app, le lien voyage dans la messagerie.** Un sondage Doodle ou un tricount se rejoint par un lien, sans compte. La feuille de partage du téléphone s'ouvre depuis une page web : l'API Web Share est prise en charge par Safari depuis la version 12.1 et par Chrome sur Android, mais Firefox la laisse derrière un réglage.

WhatsApp a déjà tout ce qu'OpenContact a reconstruit pour ses groupes (validation des entrées, messages éphémères à 7 jours). L'interopérabilité imposée par le DMA existe, mais seulement entre deux personnes et avec deux partenaires, sans les groupes, et elle passe par une intégration côté serveur.

OpenContact pratique déjà ce motif : invitations, profils et « Lui demander » partent par le système.

### Cited Findings
- [officiel, technique] Prise en charge de `navigator.share()` selon le tableau de web.dev — [web.dev](https://web.dev/web-share/?hl=nl) ; [LogRocket](https://blog.logrocket.com/?p=182086) :
  - Safari 12.1 (iOS et macOS) ; Edge 93 ; Chrome 128 dans le tableau, et Chrome pour Android depuis la version 61 selon LogRocket ;
  - Firefox : derrière un réglage, donc pas activé par défaut ;
  - conditions : une page en HTTPS et un geste de l'utilisateur ; web.dev recommande de tester la présence de l'API plutôt que de la supposer.
- [industrie] Doodle — [Doodle, aide (compte)](https://help.doodle.com/en/articles/8393821-do-i-need-a-doodle-account-to-participate-in-a-group-poll) ; [Doodle, aide (inviter)](https://help.doodle.com/en/articles/7793792-how-do-i-invite-participants-to-my-group-poll) ; [Doodle, aide (créer sans compte)](https://help.doodle.com/en/articles/12086821-how-can-i-create-a-group-poll-without-an-account) :
  - les invités d'un sondage de groupe n'ont pas besoin de compte pour répondre ;
  - le créateur copie le lien (« Copy link ») et le colle où il veut ;
  - la création anonyme d'un sondage a été abandonnée.
- [tiers, faible autorité] Tricount — [informations-pratiques.org](https://informations-pratiques.org/articles/mon-compte-tricount.html) :
  - on l'utilise sans compte, en mode invité, et on envoie le lien d'invitation par SMS, WhatsApp ou e-mail ;
  - un compte ajoute la synchronisation et la sauvegarde ;
  - téléphone perdu, on demande à un autre participant de vous réinviter par lien.
- [presse] Contre-exemple : Strava a choisi en 2023 de ramener l'organisation des sorties dans l'app (section 2).
- [presse] Les admins d'un groupe WhatsApp peuvent valider ou refuser les demandes d'entrée faites par lien d'invitation (réglage « Approve new participants », annoncé en mars 2023, désactivé par défaut, avec une liste de demandes en attente) — [SoyaCincau, 2023](https://soyacincau.com/2023/03/23/whatsapp-group-admins-can-now-approve-or-deny-people-from-entering-a-group-chat/amp/) ; [Beebom](https://beebom.com/how-approve-new-participants-whatsapp-groups)
- [industrie] En décembre 2021, WhatsApp a ajouté les durées de 24 heures et de 90 jours à côté des 7 jours, et une durée par défaut pour les nouvelles conversations — [Meta, décembre 2021](https://about.fb.com/news/2021/12/whatsapp-default-disappearing-messages-multiple-durations/)
- [tiers, faible autorité] Un groupe WhatsApp accueille jusqu'à 1 024 membres — [Kanal, guide 2026](https://getkanal.com/fr/blog/creer-un-groupe-whatsapp.md)
- [presse] WhatsApp aurait testé la mise en sourdine automatique des groupes au-delà d'une certaine taille — [TelecomTalk](https://telecomtalk.info/whatsapp-working-on-new-feature-to-reduce-notifications-load/620726/)
- [industrie] Interopérabilité imposée par le DMA — [Meta, novembre 2025](https://about.fb.com/news/2025/11/messaging-interoperability-whatsapp-enables-third-party-chats-for-users-in-europe/) ; [MacRumors](https://www.macrumors.com/2025/11/14/whatsapp-third-party-chat-support-eu/) :
  - en novembre 2025, WhatsApp a annoncé des « discussions tierces » en Europe, d'abord avec BirdyChat et Haiket ;
  - les deux côtés doivent l'activer ;
  - on y échange texte, messages vocaux, images, vidéos et fichiers ;
  - les groupes avec des utilisateurs tiers ne sont « pas encore disponibles » ;
  - d'autres services doivent suivre.
- [projet] OpenContact passe déjà par le système :
  - `boutonEnvoyer` ouvre la feuille de partage du téléphone pour une invitation ou un profil ;
  - l'invitation d'un groupe part ainsi vers « la conversation de la classe en un geste » ;
  - « Lui demander » ouvre le mail ou les SMS avec le message prêt ;
  - les pistes se donnent par QR, fichier `.oc` ou texte à coller.

  — [CLAUDE.md, §0, §6 et §8](/home/user/Open-Contact/CLAUDE.md)

### Inferences
- *(inférence)* **Les groupes d'OpenContact dépendent déjà du groupe WhatsApp de la classe.** Leur code d'invitation y circule. Deux conséquences :
  - un groupe OpenContact n'est jamais plus privé que la conversation d'où vient son invitation : quiconque y lit le code entre ;
  - tous ses membres sont, par construction, déjà ensemble dans une autre messagerie.
- *(inférence)* **Le motif « l'objet dans l'app, le lien dans la messagerie » couvre presque toute la couche réseau.** Les pistes (fichier, QR, texte), le profil, l'invitation et la présentation suivent déjà ce chemin. Pour un groupe sans conversation libre, il manquerait surtout deux gestes :
  - partager une demande vers le groupe WhatsApp sous forme de texte et de lien ;
  - ramener une réponse donnée là-bas vers la demande, par un lien ou un code collé.

  C'est une piste de conception, pas un résultat.
- *(inférence)* Ce que les apps de coordination gardent chez elles, c'est l'**état** : le compte de qui doit quoi, les votes, le suivi. La discussion, elles la laissent au canal du groupe. Pour OpenContact, l'état est la piste, la demande et son suivi « comme un colis », et le profil de l'ami.
- *(inférence)* L'interopérabilité du DMA n'est pas une voie pour un projet sans serveur tenu par une seule personne. Il faudrait que le fournisseur s'intègre à l'offre de WhatsApp, côté serveur, et les groupes n'y sont pas encore.
- *(inférence)* Firefox laisse l'API Web Share derrière un réglage, donc le repli « Copier » reste nécessaire, et le projet l'a déjà. Sur iPhone (Safari) et sur Android (Chrome), là où vit l'utilisateur type, la feuille de partage est disponible.

### Gaps
- **Les liens profonds de WhatsApp** (« click to chat », liens d'invitation de groupe) n'ont pas été vérifiés dans cette session.
- **Splitwise, Lydia, WhatsApp Communautés** (taille, sous-groupes) : non étudiés, faute de budget.
- **Les mentions et les messages épinglés de WhatsApp** n'ont pas été vérifiés dans cette session. On ne peut donc pas affirmer ici, source à l'appui, que WhatsApp couvre aussi ces deux fonctions d'OpenContact.
- **Aucune donnée comparant** une coordination par lien partagé à une messagerie intégrée (taux de réponse, délai).

## 4. Quelles formes de produit livrent « qui est passé où » et la recommandation sans messagerie, et que sait-on de leur usage ?

### Takeaway
Les grands acteurs livrent « qui est passé où » sous deux formes :
- **une carte de personnes rattachées à des employeurs** : l'outil Alumni de LinkedIn depuis 2013, avec « où ils travaillent » et « ce qu'ils font », valable aussi pour d'autres écoles que la sienne ;
- **une demande de recommandation en un geste** vers une relation existante : « Ask for a Referral », LinkedIn, mars 2018.

Handshake y ajoute une messagerie entre pairs (2019) et des questions-réponses modérées. En France, My Job Glasses met des étudiants en relation avec 82 000 professionnels bénévoles, et s'est intégré à 1jeune1solution.

Les résultats sont absents ou déclaratifs, et le secteur lui-même parle de l'« échec » des communautés d'anciens en ligne. Partout, la valeur est dans le profil et l'acheminement ; la conversation se fait dans un canal ordinaire.

### Cited Findings
- [industrie] LinkedIn Alumni a été lancé en janvier 2013 — [LinkedIn, blog 2013](https://blog.linkedin.com/2013/01/30/start-mapping-your-career-with-linkedin-alumni). Ses filtres et ses usages — [Villanova](https://connections.villanova.edu/resources/linkedin-alumni-tool/) ; [Santa Clara University](https://www.scu.edu/careercenter/toolkit/networking/alumnitool/) :
  - filtres principaux : « Where they work », « Where they live », « What they do » ;
  - puis « What they studied », « What they're skilled at » et le degré de relation ;
  - on choisit un employeur pour voir les diplômés qui y sont ;
  - l'outil marche aussi pour une école qu'on n'a pas fréquentée.
- [industrie] Le 19 mars 2018, LinkedIn a lancé « Ask for a Referral ». Le filtre « In Your Network » montre les offres des entreprises où l'on a une relation, le bouton s'affiche sur ces offres, et un message prérempli se modifie avant l'envoi — [LinkedIn, blog 2018](https://blog.linkedin.com/2018/march/19/introducing-ask-for-a-referral-making-it-easier-to-find-your-way-in) ; [TechCrunch](https://techcrunch.com/2018/03/19/linkedin-now-lets-job-seekers-ask-for-referrals-with-a-click-of-a-button)
- [sondage d'éditeur] LinkedIn touche 43 % des 16-25 ans interrogés — [Diplomeo, 2025](https://diplomeo.com/actualite-sondage_reseaux_sociaux_jeunes_2025)
- [industrie, relevé dans une note antérieure] Handshake propose des questions-réponses entre étudiants et anciens de n'importe quelle école. Elles sont modérées avant publication, et l'on répond sous son nom ou anonymement — [Handshake, aide Q&A](https://support.joinhandshake.com/hc/en-gb/articles/360008503614)
- [industrie, relevé dans une note antérieure] La messagerie entre pairs de Handshake n'est ouverte que si le profil est réglé sur « Community ». Un signalement déclenche une revue par l'équipe Trust & Safety, à laquelle l'école peut être associée — [Handshake, How Peer Messaging Works](https://support.joinhandshake.com/hc/en-gb/articles/360021682793-How-Peer-Messaging-Works) ; [Handshake, Flags & Moderation](https://support.joinhandshake.com/hc/en-gb/articles/360021679833-How-Peer-Messaging-Flags-and-Content-Moderation-Work)
- [officiel, partenaire] My Job Glasses — [France Travail, communiqué du 27 avril 2026](https://www.francetravail.org/files/live/sites/peorg/files/documents/Communiqu%C3%A9%20de%20presse/2026/20260427%20-%20CP%20-%20France%20Travail%20et%20My%20Job%20Glasses%20lancent%20un%20programme%20d'ambassadorat.pdf) ; [France Travail Grand Est](https://www.francetravail.fr/region/grand-est/actualites/2026/my-job-glasses-un-reseau-de-82-0.html) :
  - plus de 82 000 professionnels inscrits, bénévoles ;
  - un programme commun avec France Travail vise 100 000 demandeurs d'emploi ;
  - en Grand Est, 129 demandeurs d'emploi avaient déjà eu un entretien individuel avec un ambassadeur.
- [officiel, partenaire] Depuis le 29 septembre 2025, un module dédié de 1jeune1solution.gouv.fr donne accès à My Job Glasses — [Centre Inffo](https://www.centre-inffo.fr/?p=501377)
- [industrie] La conférence DRIVE 2023 du CASE (Council for Advancement and Support of Education, l'association professionnelle des services de développement et de relations avec les anciens des établissements) a tenu une session intitulée « 20 Years On: Benchmarking the Failure of Online Alumni Communities to Advance the Fundraising Pipeline ». Seuls le titre et la description ont été vus — [CASE](https://case.org/conferences-training/drive-2023/sessions/20-years-benchmarking-failure-online-alumni-communities)
- [tiers] La règle « 90-9-1 » de participation aux communautés en ligne est une heuristique contestée, pas une mesure — [Garfield & Romero, SlideShare](https://fr2.slideshare.net/SGarfield/90-91-rule-of-thumb-fact-or-fiction)
- [recherche, relevé dans une note antérieure] Rajkumar et al. (*Science*, 2022) ont mené des expériences randomisées sur la suggestion « Vous connaissez peut-être » de LinkedIn, auprès de plus de 20 millions de personnes pendant cinq ans. Les liens modérément faibles, mesurés par le nombre de relations en commun, produisent le plus de mobilité professionnelle, selon une courbe en U inversé — [PubMed](https://pubmed.ncbi.nlm.nih.gov/36107999/) ; [Stanford Digital Economy Lab](https://digitaleconomy.stanford.edu/publication/a-causal-test-of-the-strength-of-weak-ties)
- [recherche, relevé dans une note antérieure] Burks et al. (*QJE*, 2015), sur les données de personnel de neuf grandes entreprises : à compétences comparables, un candidat recommandé est plus souvent embauché, accepte plus souvent l'offre et démissionne moins — [IDEAS/RePEc](https://ideas.repec.org/a/oup/qjecon/v130y2015i2p805-839.html)
- [projet] Le lien humain d'OpenContact — [CLAUDE.md, §2 et §8](/home/user/Open-Contact/CLAUDE.md) ; [docs/reseau.md](/home/user/Open-Contact/docs/reseau.md) :
  - `vecuQui` : le prénom de qui déclare « j'y suis passé » ;
  - le profil donné à un ami (OCA1 : identifiant, nom, parcours, clé de sa boîte) ;
  - la demande à ses amis (OCB1), qui passe d'elle-même jusqu'au troisième cercle ; qui demande n'apprend que le prénom de SON ami ;
  - la présentation d'un contact qui est d'accord ;
  - le mail qui s'ouvre sur « Karim m'a conseillé de vous écrire ».

### Inferences
- *(inférence)* **Aucune de ces formes n'a besoin d'une conversation pour livrer sa valeur.** L'outil Alumni est une carte. « Ask for a Referral » est un bouton suivi d'un message prérempli, qui part dans la messagerie ordinaire de LinkedIn. My Job Glasses débouche sur un rendez-vous. La conversation arrive après, dans un canal générique.
- *(inférence)* **Ce qu'OpenContact a de propre face à ces formes :**
  - les camarades qui ne sont pas sur LinkedIn (la majorité des 16-25 ans interrogés) peuvent dire où ils sont passés, et ce savoir s'affiche sur la piste où l'on travaille (« Karim y est en alternance ») ;
  - la demande dépasse les relations directes : deuxième et troisième cercles, chaîne protégée. C'est exactement la zone où Rajkumar et al. situent la valeur, les liens modérément faibles avec des relations en commun ;
  - tout tient sans compte ni plateforme qui détienne le graphe social.

  Ces trois points ne doivent rien à la messagerie.
- *(inférence)* Une classe est un graphe dense : ce sont surtout des liens forts entre camarades. La valeur prédite par Rajkumar et al. se trouve dans les ponts (amis d'amis, autres promos, anciens), donc dans la demande qui passe de cercle en cercle, plus que dans le fil de la classe.
- *(inférence)* My Job Glasses couvre l'entretien d'information avec un professionnel, gratuitement et en France. OpenContact n'a pas à le refaire. Un lien au bon moment suffirait, par exemple quand une demande n'aboutit pas. Ce n'est pas une conclusion de recherche : la pertinence de ce lien n'a pas été mesurée.
- *(inférence)* Selon le titre même de la session du CASE, les communautés d'anciens en ligne « échouent ». Si c'est confirmé, c'est un signal contre les espaces de discussion qu'on visite, et pour des formes qui viennent à l'utilisateur au moment où il en a besoin, comme le bandeau d'une piste.

### Gaps
- **Aucun résultat mesuré** trouvé pour « Ask for a Referral », pour la messagerie et les questions-réponses de Handshake, ni pour My Job Glasses (nombre de rendez-vous en 2025, effet sur l'accès au stage).
- **Aucune donnée** sur l'usage de l'outil Alumni de LinkedIn par des étudiants de BTS ou de BUT en France.
- **Le contenu de la session du CASE** n'a pas été lu. Seul son titre est connu.

## 5. Que coûte et que risque une messagerie de groupe pour un mainteneur seul, sans serveur ?

### Takeaway
Le coût décisif est **structurel**. Sans serveur, il n'y a pas de notification. Sur iPhone, Web Push n'existe que pour une web app installée sur l'écran d'accueil, et il faut un service qui envoie. OpenContact ne fait que relever ses groupes toutes les cinq minutes, app ouverte.

Les autres risques sont réels, mais d'ampleur incertaine :
- **cryptographie** : un protocole de groupe maison est difficile même pour une équipe financée (Matrix, IEEE S&P 2023) ;
- **relais** : ceux de Nostr disparaissent ou restreignent l'écriture ;
- **modération** : il n'y a personne pour recevoir un signalement, et l'éphémère efface les preuves. Des groupes WhatsApp d'étudiants ont donné lieu à des procédures disciplinaires en France en 2025 ;
- **droit** : le DSA laisse hors des « plateformes en ligne » la messagerie entre un nombre fini de personnes choisies par l'expéditeur, mais les groupes semi-ouverts à lien d'invitation sont discutés. On ignore même si un logiciel gratuit sans serveur est un « service ». Le règlement CSAM est encore en trilogue en 2026 ;
- **mineurs** : risque faible pour ce public. La loi française sur les moins de 15 ans exclurait les messageries privées, et la majorité numérique RGPD est fixée à 15 ans.

Les utilisateurs tiennent le chiffrement de bout en bout pour acquis (WhatsApp, Messenger depuis 2023) et le comprennent mal. Ce n'est donc pas un avantage distinctif.

### Cited Findings
**Notifications et coût de code**
- [officiel, technique] iOS et iPadOS 16.4 ont étendu Web Push aux web apps de l'écran d'accueil — [WebKit](https://webkit.org/?p=13878) ; [9to5Mac](https://9to5mac.com/2023/02/16/iphone-web-app-new-features-ios-16-4/) ; [OneSignal, documentation](https://documentation.onesignal.com/docs/ios-web-push) :
  - un onglet Safari ne peut pas demander la permission ;
  - la demande doit suivre un geste de l'utilisateur ;
  - il faut un manifeste d'application web ;
  - WebKit demande d'autoriser les adresses `*.push.apple.com` côté émetteur.
- [projet] Aucun appel aux API de notification ou de push dans `ui/` ni dans `sw.js` (relevé du 4 novembre 2026). Les groupes sont relevés toutes les cinq minutes, page visible, et seulement si l'on est dans un groupe. Le projet note lui-même qu'« une app web ne sonne pas sans serveur » — [ui/groupes.js, l. 1407](/home/user/Open-Contact/ui/groupes.js) ; [ui/reseau.js, l. 493](/home/user/Open-Contact/ui/reseau.js) ; [CLAUDE.md, §6](/home/user/Open-Contact/CLAUDE.md)
- [projet, comptage du 4 novembre 2026] Ce que pèse la messagerie dans le code :
  - les modules propres à la conversation font 2 870 lignes, soit environ 8,7 % des 33 058 lignes de `ui/` et `engine/` : `ui/conversations.js` 196, `ui/messages.js` 196, `ui/groupes.js` 1 408, `ui/fil.js` 219, `engine/groupe.js` 584, `engine/messages.js` 66, `engine/conversations.js` 134, `engine/liens.js` 67 ;
  - `ui/groupes.js` porte aussi le don de pistes au groupe et les demandes, donc tout n'est pas « conversation » ;
  - neuf scénarios de bout en bout (3 015 lignes) gardent les groupes, les messages et la boîte : `e2e-groupes`, `e2e-groupe-demande`, `e2e-groupe-reglages`, `e2e-groupe-retirer`, `e2e-groupe-sur-demande`, `e2e-messages`, `e2e-conversations`, `e2e-boite`, `e2e-echelle` ;
  - cinq (2 141 lignes) gardent les amis, les demandes, les sauts et le suivi, sur 103 scripts au total ;
  - `engine/boite.js` (631 lignes), la boîte aux lettres, sert à la fois aux demandes, aux profils, à `adieu`, aux nouveaux codes et aux messages.

  — [dépôt](/home/user/Open-Contact/)

**Cryptographie et relais**
- [recherche] Albrecht, Celi, Dowling et Jones, IEEE S&P 2023, prix de l'article distingué — [IACR ePrint 2023/485](https://eprint.iacr.org/2023/485) ; [The Register](https://www.theregister.com/2022/09/28/matrix_encryption_flaws/) ; [King's College London](https://www.kcl.ac.uk/news/security-vulnerabilities-in-popular-chat-platform) :
  - des vulnérabilités exploitables en pratique dans Matrix et son client Element ruinent la confidentialité et l'authentification face à un serveur malveillant ;
  - le chiffrement de groupe repose sur Megolm, un protocole maison peu étudié ;
  - les failles critiques supposent un serveur malveillant ; elles ont été corrigées.
- [projet] Le chiffrement d'OpenContact — [CLAUDE.md, §6](/home/user/Open-Contact/CLAUDE.md) :
  - un groupe est un code, dont un seul PBKDF2 tire l'étiquette vue des relais et la clé qui scelle chaque message ;
  - les lettres entre amis sont scellées par ECDH P-256 et AES-GCM, avec une clé jetable par lettre ;
  - retirer un membre change le code du groupe.
- [recherche] Wei et Tyson ont étudié Nostr sur 17,8 millions de messages, 1,5 million de clés et 712 relais (juillet à décembre 2023). Publier sur plusieurs relais impose un arbitrage entre disponibilité et surcoût de réplication, et ce surcoût est élevé — [arXiv 2402.05709](https://arxiv.org/html/2402.05709v2)
- [tiers, non confirmé dans l'article] Une source secondaire attribue à Tyson et al. l'idée que 95 % des relais peinent à couvrir leurs coûts et que 20 % ont connu des pannes notables — [DoraHacks Research](https://research.dorahacks.io/2024/04/30/nostr-relay-incentive)
- [tiers, blog] Sur plus de 1 000 relais suivis, 343 auraient disparu — [DEV](https://dev.to/jonathan_greenallidoizc/95-of-nostr-relays-cant-cover-costs-heres-why-that-matters-189l)
- [projet] Les mesures du projet sur les relais — [CLAUDE.md, §8](/home/user/Open-Contact/CLAUDE.md) :
  - le 18 septembre 2026, sept relais publics étaient « sains », mais quatre seulement portaient la découverte, beaucoup ayant restreint l'écriture ;
  - au premier relevé, six relais sur sept gardaient une lettre.

**Modération**
- [presse] Quand on signale une conversation WhatsApp, les modérateurs voient le message signalé et les quatre précédents. Ils sont déchiffrés sur l'appareil de qui signale, puis envoyés en clair (révélation de ProPublica, 2021, et porte-parole de WhatsApp) — [Gizmodo](https://gizmodo.com/whatsapp-moderators-can-read-your-messages-1847629241) ; [Silicon UK](https://silicon.co.uk/mobility/mobile-apps/whatsapp-moderators-can-read-messages-report-415442)
- [officiel, institution] Paris 1 Panthéon-Sorbonne a publié en septembre 2025 deux communiqués sur des faits antisémites dans des groupes de discussion d'étudiants — [Paris 1, 16 septembre 2025](https://www.pantheonsorbonne.fr/sites/default/files/2025-09/20250916_Communiqu%C3%A9_CP_P1PS.pdf) ; [Paris 1, 20 septembre 2025](https://www.pantheonsorbonne.fr/sites/default/files/2025-09/20250920_communique_cp_p1ps.pdf) ; [Europe 1](https://www.europe1.fr/france/sorbonne-des-etudiants-juifs-exclus-dun-groupe-whatsapp-luejf-denonce-un-antisemitisme-decomplexe-772850) :
  - un sondage posté dans un groupe WhatsApp en août 2025, dont l'auteur n'était pas identifié comme étudiant de Paris 1 ;
  - une autre affaire, qui a conduit à une procédure disciplinaire et à une mesure conservatoire.
- [presse] Dans une résidence universitaire de Pessac, des messages antisémites postés dans un groupe WhatsApp ont valu à deux étudiants d'être exclus par le Crous — [Europe 1](https://www.europe1.fr/societe/info-europe-1-je-vais-exterminer-tous-les-juifs-a-pessac-deux-etudiants-exclus-dune-residence-etudiante-pour-des-messages-antisemites-875792)
- [presse] À Aix-Marseille, neuf étudiants ont été convoqués pour des propos haineux dans le groupe de discussion d'une L3 d'histoire. La date n'a pas été relevée — [Bladi](https://www.bladi.net/racisme-assume-groupe-whatsapp-deraille-universite-aix-marseille,115316.html)

**Droit**
- [officiel] DSA, considérant 14 — [Prighter, considérant 14](https://prighter.com/resources/laws/dsa/recitals/recital-14) :
  - les services de communication interpersonnelle, comme le courriel ou la messagerie privée, sortent de la définition des plateformes en ligne : ils servent entre un nombre fini de personnes déterminées par l'expéditeur ;
  - les obligations des plateformes peuvent en revanche s'appliquer quand l'information est mise à disposition d'un nombre potentiellement illimité de destinataires, non déterminés par l'expéditeur, « par exemple au moyen de groupes publics ou de canaux ouverts ».
- [recherche, étude pour l'autorité néerlandaise ACM, novembre 2025] L'ILP Lab oppose deux lectures du considérant 14 : une lecture stricte (contrôles d'accès techniques, audience choisie par l'expéditeur) et une lecture fonctionnelle (le fonctionnement réel du service). Il retient la seconde : des services qui permettent un partage à grande échelle dans des groupes semi-ouverts, ou par lien d'invitation, peuvent relever des plateformes en ligne — [ILP Lab, note](https://ilplab.nl/wp-content/uploads/sites/2/2025/11/ILP-ACM_PolicyPaper_HybridServices_DSA_NOV2025-1.pdf) ; [ILP Lab, projet](https://ilplab.nl/projects/group-chats-under-the-dsa-when-do-hybrid-services-become-online-platforms/)
- [presse, lu en extrait] Les chaînes WhatsApp comptaient en moyenne 51,7 millions d'utilisateurs actifs mensuels dans l'UE au premier semestre 2025, au-dessus du seuil de 45 millions. La Commission examinerait quelles parties de WhatsApp sont de la communication privée et lesquelles fonctionnent comme une plateforme publique — [Mobile Ecosystem Forum](https://mobileecosystemforum.com/?p=202350)
- [officiel] DSA, article 19 : les micro et petites entreprises (au sens de la recommandation 2003/361/CE) sont exemptées de la section consacrée aux plateformes en ligne, sauf l'article 24(3). L'exemption dure encore 12 mois après la perte de ce statut, et elle ne vaut pas pour les très grandes plateformes — [Springlex, article 19](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-19/)
- [officiel] Le champ du DSA — [Springlex, article 3](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-3/) ; [William Fry](https://www.williamfry.com/wp-content/uploads/2024/01/Tech_Does-the-DSA-apply-to-you_6.pdf) :
  - les « services intermédiaires » sont une partie des services de la société de l'information (directive 2015/1535, art. 1(1)(b)) ;
  - un tel service est « normalement fourni contre rémunération, à distance, par voie électronique et à la demande individuelle d'un destinataire » ;
  - l'hébergement consiste à stocker des informations fournies par un destinataire et à sa demande.
- [officiel, presse spécialisée] Règlement CSAM, dit « Chat Control » — [Freevacy](https://www.freevacy.com/news/council-of-the-european-union/eu-council-agrees-negotiating-position-on-csam-regulation/6962) ; [eucrim](https://eucrim.eu/news/csa-regulation-council-position-reached/) ; [Bitkom](https://www.bitkom.org/index%2Ephp/EN/List-and-detailpages/Publications/CSAM-Proposal) ; [Conseil de l'UE, ST 11501/26](https://data.consilium.europa.eu/doc/document/ST-11501-2026-INIT/en/pdf) :
  - le Conseil a arrêté sa position le 26 novembre 2025, et les trilogues ont commencé le 9 décembre 2025 ;
  - selon des commentateurs, la version du Conseil rendrait la détection volontaire. Bitkom indique qu'un régime volontaire proposé par une présidence excluait les communications chiffrées ;
  - au cinquième trilogue, le 29 juin 2026, un accord provisoire a été trouvé sur la question des communications audio, qui touche au champ du texte (lu en extrait, portée exacte non vérifiée).
- [officiel, presse spécialisée] Dérogation provisoire : le Parlement européen a refusé sa prolongation le 26 mars 2026. Le règlement (UE) 2026/1881 du 24 juillet 2026 l'a rétablie, du 3 août 2026 au 3 avril 2028. Elle permet aux fournisseurs de messagerie de détecter volontairement — [eucrim](https://eucrim.eu/news/interim-rules-on-voluntary-csam-detection-reinstated-until-2028/) ; [Leto](https://www.leto.legal/news/chat-control-parlement-derogation-eprivacy-2026)

**Mineurs**
- [presse] Loi française sur les réseaux sociaux et les moins de 15 ans — [Siècle Digital](https://siecledigital.fr/2026/01/26/reseaux-sociaux-le-couperet-tombe-pour-les-moins-de-15-ans/) ; [Public Sénat](https://www.publicsenat.fr/actualites/politique/reseaux-sociaux-le-senat-examine-le-texte-sur-linterdiction-pour-les-moins-de-15-ans-le-31-mars) ; [L'Étudiant (AFP)](https://www.letudiant.fr/lifestyle/interdiction-les-reseaux-sociaux-aux-moins-de-15-ans-la-loi-adoptee-par-le-parlement.html) :
  - l'Assemblée nationale a adopté l'interdiction le 26 janvier 2026 ;
  - le Sénat l'a examinée le 31 mars et l'a remaniée ;
  - selon l'AFP, le Parlement l'a définitivement adoptée le 21 juillet 2026, pour une entrée en vigueur prévue en septembre.
- [presse] Selon la rapporteure Laure Miller, les « messageries privées interpersonnelles » comme WhatsApp ne sont pas concernées. L'exclusion figurait dans l'exposé des motifs, pas explicitement dans le dispositif, et des députés ont proposé de l'y inscrire — [Mac4Ever](https://www.mac4ever.com/societe/194329-reseaux-sociaux-interdits-aux-de-15-ans-ce-que-prevoit-la-loi). Une note d'avocats présente le texte comme censuré « avant d'exister » : l'extrait était tronqué et contredit l'adoption décrite ailleurs — [HLC](https://www.hlc.com/fr/publications/reseaux-sociaux-interdits-aux-moins-de-15-ans)
- [officiel] Majorité numérique RGPD en France — [CNIL, recommandation 4](https://cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans) ; [CNIL, recommandation 1](https://www.cnil.fr/fr/recommandation-1-encadrer-la-capacite-dagir-des-mineurs-en-ligne) :
  - dès 15 ans, un mineur peut consentir seul à un traitement fondé sur le consentement, dans un service en ligne (article 45 de la loi Informatique et Libertés) ;
  - avant 15 ans, le consentement est donné conjointement avec un titulaire de l'autorité parentale ;
  - la CNIL précise que les textes ne créent pas de « majorité numérique globale » à 15 ans.

**Ce qu'attendent les utilisateurs du chiffrement**
- [presse] Messenger chiffre de bout en bout par défaut les conversations et les appels personnels depuis le 6 décembre 2023, avec un déploiement étalé sur plusieurs mois. Les groupes restaient alors à activer soi-même. Le chiffrement repose sur le protocole Signal et sur le protocole Labyrinth de Meta — [TechCrunch](https://techcrunch.com/2023/12/06/meta-finally-starts-rolling-out-default-end-to-end-encryption-for-messenger/embed/) ; [MacRumors](https://www.macrumors.com/2023/12/07/facebook-messenger-end-to-end-encryption/) ; [Android Central](https://androidcentral.com/apps-software/messenger-e2ee-default-edit-messages)
- [recherche] La grande majorité des participants d'Abu-Salma et al. (2017) ne comprenait pas ce qu'est le chiffrement de bout en bout — [IEEE](https://www.ieee-security.org/TC/SP2017/papers/84.pdf)

### Inferences
- *(inférence)* **Les notifications départagent la conversation et le lien humain.** Une demande ou un profil peuvent attendre la prochaine ouverture : ils sont asynchrones par conception, et une demande vit 14 jours. Une conversation, elle, perd son sens si la réponse attend trois jours que l'autre rouvre l'app. Sur iPhone, même installée, l'app ne pourrait pas sonner sans un service d'envoi, ce que l'interdit « aucun serveur OpenContact » exclut.
- *(inférence)* **Modération.** Avec un chiffrement de bout en bout et sans serveur, personne au-dessus des admins d'un groupe ne peut agir : ni le mainteneur, ni une équipe, ni un signalement transmis. La victime ne dispose que d'une capture d'écran à porter à l'école. Ce n'est pas une panne de conception, c'est l'architecture.

  Les messages qui s'effacent au bout de 7 jours allègent les échanges, mais ils effacent aussi les preuves. Les affaires de 2025 montrent que des groupes d'étudiants produisent des faits qui finissent devant une instance disciplinaire. Un produit fait pour aider à trouver un stage n'a aucune raison d'en porter le risque.
- *(inférence, juridique, à faire confirmer)* **Exposition juridique : probablement faible, mais pas nulle.**
  - Le mainteneur ne stocke rien : les relais hébergent. Distribuer gratuitement un logiciel n'est peut-être pas un « service normalement fourni contre rémunération ».
  - Même qualifié de plateforme, un projet individuel relèverait de l'exemption des micro et petites entreprises (article 19).
  - L'article 16 (signalement et action) relève de la section sur l'hébergement, hors du champ de cette exemption. C'est une lecture de la structure du texte, non confirmée par une source.
  - Un groupe « ouvert » où « qui a le QR entre » pourrait être lu, au sens fonctionnel de l'ILP Lab, comme un groupe semi-ouvert.
  - Le texte final du règlement CSAM est inconnu.

  Garder la conversation, c'est garder ces incertitudes ouvertes pour une personne seule, sans juriste.
- *(inférence)* **Cryptographie.** Dans le dessin décrit par le projet, tous les messages d'un groupe sont scellés par une clé tirée du code, tant que ce code ne change pas. Quiconque obtient le code, par exemple en photographiant le QR posté dans le groupe WhatsApp, peut lire les messages encore présents sur les relais, jusqu'à sept jours en arrière. C'est une inférence tirée de la description, pas un audit.

  Le cas Matrix montre qu'un protocole de groupe maison, même porté par une fondation, peut casser. Le risque est plus grand pour du texte libre, qui peut tout contenir, que pour des pistes et des demandes, qui sont structurées et ne portent que ce que l'app y met.
- *(inférence)* **Retirer la conversation réduit l'exposition sans supprimer la dépendance aux relais.** La boîte aux lettres reste pour les demandes et les profils. Moins de trafic sur des relais bénévoles, qui restreignent l'écriture, c'est moins de pannes visibles.
- *(inférence)* **Coût de code.** Environ 2 870 lignes et neuf scénarios, c'est modeste mais réel pour une personne seule. Chaque retouche visible doit aussi se montrer en captures (règle du §0). La part supprimable sans perte de valeur propre est la conversation libre : le fil, les mentions, l'épinglage, les messages entre amis. Le don de pistes et les demandes au groupe restent.
- *(inférence)* **Mineurs.** Le public (BTS SIO, BUT) est surtout majeur ; en première année ou en alternance, certains ont 16 ou 17 ans. La loi sur les moins de 15 ans ne les vise pas, et elle exclurait les messageries privées. Le risque principal pour les mineurs reste celui de tout groupe mixte d'adultes et de mineurs sans modération extérieure, et il disparaît avec la conversation libre.
- *(inférence)* **Le chiffrement n'est pas un argument de différence.** Il est la norme des messageries grand public (WhatsApp ; Messenger par défaut depuis 2023), et la plupart des gens ne le comprennent pas. OpenContact ne gagnera donc pas d'utilisateurs en mettant en avant le chiffrement de ses conversations. Il doit simplement ne pas faire moins bien que WhatsApp, ce qui est difficile à garantir seul.

### Gaps
- **Le statut d'un client gratuit, libre et sans serveur au regard du DSA** : est-ce un « service de la société de l'information » ? Qui est le « fournisseur » quand des relais publics hébergent ? Aucune source ne le tranche ; il faut un avis juridique.
- **Le règlement CSAM** : on ignore les obligations finales pour les petits services de communication interpersonnelle (évaluation des risques, mesures). Les trilogues étaient en cours mi-2026 et les sources sur l'exclusion du chiffré divergent.
- **La loi française sur les moins de 15 ans** : texte promulgué, contrôle constitutionnel et périmètre exact (messageries) non confirmés. Les sources se contredisent.
- **Aucune donnée sur la fréquence du harcèlement** dans les groupes d'étudiants en France : seulement des affaires.
- **L'économie des relais Nostr** : le chiffre de 95 % n'a pas été confirmé dans l'article de Wei et Tyson.
- **Le protocole MLS** (RFC 9420) et la confidentialité persistante dans le dessin des groupes d'OpenContact n'ont pas été étudiés. L'inférence sur la lecture des messages par qui obtient le code est à vérifier contre `engine/groupe.js`.
