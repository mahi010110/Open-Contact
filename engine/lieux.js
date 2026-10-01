/* ============================================================
   OpenContact — moteur · les lieux que la barre reconnaît SANS réseau

   Une table, pas un service : la barre de recherche doit comprendre
   « Lille », « 59 » ou « Hauts-de-France » hors ligne, à chaque frappe
   (invariant ④). Trois listes, et chacune dit d'où elle vient :

   · les DÉPARTEMENTS — la liste officielle, complète (numéro → nom) ;
   · les RÉGIONS — les treize de métropole, avec leurs départements ;
   · les VILLES — celles où l'on étudie : préfectures, villes
     universitaires, et les communes de leur couronne où vivent les
     entreprises (Villeneuve-d'Ascq, Labège, Issy…). Une ville absente
     n'est pas perdue : elle reste du texte, et le texte la trouve déjà
     dans les pistes. Les villes des pistes elles-mêmes s'ajoutent à la
     table au moment de chercher (`engine/requete.js`).

   CE QUI N'EST PAS ICI, EXPRÈS (CLAUDE.md, recherche.md principe 2 :
   mieux vaut ne pas comprendre que mal comprendre) :
   · Orange — une entreprise avant d'être une ville ;
   · Croix, Sens — des mots de tous les jours ;
   · Vienne — à la fois une ville de l'Isère et un département : le mot
     ne dit pas lequel ;
   · les noms de département qui sont des mots courants (Cher, Lot, Var,
     Manche, Somme, Aube, Allier, Creuse) ou un prénom (Aude) : leur
     NUMÉRO, lui, est sans ambiguïté.
   ============================================================ */

export const DEPARTEMENTS = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence', '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes', '09': 'Ariège', '10': 'Aube',
  '11': 'Aude', '12': 'Aveyron', '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal',
  '16': 'Charente', '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse', '21': 'Côte-d’Or', '22': 'Côtes-d’Armor', '23': 'Creuse', '24': 'Dordogne',
  '25': 'Doubs', '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
  '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde', '34': 'Hérault',
  '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura',
  '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique',
  '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire',
  '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle',
  '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord',
  '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques',
  '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône',
  '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
  '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres',
  '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse',
  '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne',
  '90': 'Territoire de Belfort', '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne', '95': 'Val-d’Oise',
  '971': 'Guadeloupe', '972': 'Martinique', '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte'
};
/* les noms qu'on ne lit PAS comme un département : des mots courants
   (voir l'en-tête), et Paris, que la table des villes porte déjà */
export const DEPT_NOM_AMBIGU = new Set(['03', '10', '11', '18', '23', '46', '50', '75', '80', '83', '86']);

export const REGIONS = {
  idf:  { nom: 'Île-de-France', alias: ['ile de france', 'idf', 'region parisienne'],
          depts: ['75', '77', '78', '91', '92', '93', '94', '95'] },
  hdf:  { nom: 'Hauts-de-France', alias: ['hauts de france', 'hdf'],
          depts: ['02', '59', '60', '62', '80'] },
  ge:   { nom: 'Grand Est', alias: ['grand est'],
          depts: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'] },
  nor:  { nom: 'Normandie', alias: ['normandie'], depts: ['14', '27', '50', '61', '76'] },
  bre:  { nom: 'Bretagne', alias: ['bretagne'], depts: ['22', '29', '35', '56'] },
  pdl:  { nom: 'Pays de la Loire', alias: ['pays de la loire'], depts: ['44', '49', '53', '72', '85'] },
  cvl:  { nom: 'Centre-Val de Loire', alias: ['centre val de loire'],
          depts: ['18', '28', '36', '37', '41', '45'] },
  bfc:  { nom: 'Bourgogne-Franche-Comté', alias: ['bourgogne franche comte', 'bfc', 'bourgogne', 'franche comte'],
          depts: ['21', '25', '39', '58', '70', '71', '89', '90'] },
  ara:  { nom: 'Auvergne-Rhône-Alpes', alias: ['auvergne rhone alpes', 'aura', 'auvergne', 'rhone alpes'],
          depts: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'] },
  naq:  { nom: 'Nouvelle-Aquitaine', alias: ['nouvelle aquitaine', 'aquitaine'],
          depts: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'] },
  occ:  { nom: 'Occitanie', alias: ['occitanie'],
          depts: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'] },
  paca: { nom: 'Provence-Alpes-Côte d’Azur', alias: ['provence alpes cote d azur', 'paca', 'region sud', 'cote d azur'],
          depts: ['04', '05', '06', '13', '83', '84'] },
  cor:  { nom: 'Corse', alias: ['corse'], depts: ['2A', '2B'] }
};

/* Nom:département, séparés par « | ». Une ligne par grande aire. */
const BRUT = [
  // Île-de-France
  'Paris:75|Boulogne-Billancourt:92|Issy-les-Moulineaux:92|Nanterre:92|Courbevoie:92|Puteaux:92|La Défense:92',
  'Levallois-Perret:92|Neuilly-sur-Seine:92|Clichy:92|Colombes:92|Asnières-sur-Seine:92|Rueil-Malmaison:92',
  'Gennevilliers:92|Suresnes:92|Saint-Cloud:92|Sèvres:92|Meudon:92|Montrouge:92|Malakoff:92|Bagneux:92',
  'Clamart:92|Antony:92|Saint-Denis:93|Saint-Ouen-sur-Seine:93|Montreuil:93|Aubervilliers:93|Pantin:93',
  'Bobigny:93|Noisy-le-Grand:93|Bondy:93|Drancy:93|Aulnay-sous-Bois:93|Épinay-sur-Seine:93',
  'Créteil:94|Vitry-sur-Seine:94|Ivry-sur-Seine:94|Villejuif:94|Vincennes:94|Maisons-Alfort:94',
  'Fontenay-sous-Bois:94|Champigny-sur-Marne:94|Saint-Maur-des-Fossés:94|Rungis:94',
  'Versailles:78|Saint-Germain-en-Laye:78|Vélizy-Villacoublay:78|Guyancourt:78|Saint-Quentin-en-Yvelines:78',
  'Sartrouville:78|Poissy:78|Massy:91|Palaiseau:91|Orsay:91|Saclay:91|Les Ulis:91|Évry-Courcouronnes:91',
  'Évry:91|Corbeil-Essonnes:91|Cergy:95|Argenteuil:95|Sarcelles:95|Pontoise:95|Melun:77|Meaux:77|Chelles:77',
  'Marne-la-Vallée:77|Noisiel:77|Champs-sur-Marne:77|Torcy:77|Serris:77',
  // Hauts-de-France
  'Lille:59|Villeneuve-d’Ascq:59|Roubaix:59|Tourcoing:59|Marcq-en-Barœul:59|Lambersart:59|Wasquehal:59',
  'Lomme:59|Loos:59|Seclin:59|Lesquin:59|Armentières:59|Douai:59|Valenciennes:59|Dunkerque:59',
  'Maubeuge:59|Cambrai:59|Hazebrouck:59|Arras:62|Lens:62|Liévin:62|Béthune:62|Hénin-Beaumont:62',
  'Calais:62|Boulogne-sur-Mer:62|Saint-Omer:62|Amiens:80|Abbeville:80|Beauvais:60|Compiègne:60|Creil:60',
  'Saint-Quentin:02|Laon:02|Soissons:02',
  // Grand Est
  'Strasbourg:67|Schiltigheim:67|Illkirch-Graffenstaden:67|Haguenau:67|Sélestat:67|Saverne:67',
  'Mulhouse:68|Colmar:68|Saint-Louis:68|Metz:57|Thionville:57|Forbach:57|Nancy:54|Vandœuvre-lès-Nancy:54',
  'Lunéville:54|Reims:51|Châlons-en-Champagne:51|Épernay:51|Troyes:10|Charleville-Mézières:08|Sedan:08',
  'Épinal:88|Saint-Dié-des-Vosges:88|Chaumont:52|Bar-le-Duc:55|Verdun:55',
  // Normandie, Bretagne, Pays de la Loire
  'Rouen:76|Le Havre:76|Dieppe:76|Fécamp:76|Elbeuf:76|Caen:14|Lisieux:14|Bayeux:14|Cherbourg-en-Cotentin:50',
  'Cherbourg:50|Saint-Lô:50|Granville:50|Évreux:27|Vernon:27|Louviers:27|Alençon:61|Flers:61|Argentan:61',
  'Rennes:35|Cesson-Sévigné:35|Bruz:35|Saint-Malo:35|Fougères:35|Vitré:35|Redon:35|Brest:29|Quimper:29',
  'Morlaix:29|Concarneau:29|Lorient:56|Vannes:56|Pontivy:56|Saint-Brieuc:22|Lannion:22|Dinan:22',
  'Nantes:44|Saint-Herblain:44|Rezé:44|Orvault:44|Carquefou:44|Saint-Nazaire:44|Angers:49|Cholet:49',
  'Saumur:49|Le Mans:72|La Flèche:72|Laval:53|Château-Gontier:53|La Roche-sur-Yon:85|Les Sables-d’Olonne:85',
  // Centre, Bourgogne-Franche-Comté
  'Orléans:45|Montargis:45|Tours:37|Joué-lès-Tours:37|Blois:41|Vendôme:41|Bourges:18|Vierzon:18',
  'Chartres:28|Dreux:28|Châteauroux:36|Dijon:21|Beaune:21|Besançon:25|Montbéliard:25|Pontarlier:25',
  'Belfort:90|Vesoul:70|Dole:39|Lons-le-Saunier:39|Mâcon:71|Chalon-sur-Saône:71|Le Creusot:71',
  'Montceau-les-Mines:71|Auxerre:89|Nevers:58',
  // Auvergne-Rhône-Alpes
  'Lyon:69|Villeurbanne:69|Vénissieux:69|Bron:69|Écully:69|Vaulx-en-Velin:69|Caluire-et-Cuire:69',
  'Limonest:69|Villefranche-sur-Saône:69|Saint-Étienne:42|Roanne:42|Grenoble:38|Meylan:38',
  'Saint-Martin-d’Hères:38|Échirolles:38|Montbonnot-Saint-Martin:38|Voiron:38|Bourgoin-Jallieu:38',
  'Clermont-Ferrand:63|Issoire:63|Vichy:03|Montluçon:03|Moulins:03|Le Puy-en-Velay:43|Aurillac:15',
  'Annecy:74|Annemasse:74|Thonon-les-Bains:74|Cluses:74|Chambéry:73|Aix-les-Bains:73|Albertville:73',
  'Valence:26|Montélimar:26|Romans-sur-Isère:26|Privas:07|Annonay:07|Aubenas:07|Bourg-en-Bresse:01',
  'Oyonnax:01',
  // Nouvelle-Aquitaine
  'Bordeaux:33|Mérignac:33|Pessac:33|Talence:33|Gradignan:33|Bègles:33|Lormont:33|Libourne:33|Arcachon:33',
  'Limoges:87|Poitiers:86|Châtellerault:86|La Rochelle:17|Rochefort:17|Saintes:17|Royan:17|Niort:79',
  'Bressuire:79|Angoulême:16|Cognac:16|Pau:64|Bayonne:64|Biarritz:64|Anglet:64|Périgueux:24|Bergerac:24',
  'Sarlat-la-Canéda:24|Agen:47|Mont-de-Marsan:40|Dax:40|Brive-la-Gaillarde:19|Tulle:19|Guéret:23',
  // Occitanie
  'Toulouse:31|Blagnac:31|Labège:31|Colomiers:31|Balma:31|Ramonville-Saint-Agne:31|Montpellier:34',
  'Castelnau-le-Lez:34|Lattes:34|Sète:34|Lunel:34|Béziers:34|Nîmes:30|Alès:30|Bagnols-sur-Cèze:30',
  'Perpignan:66|Narbonne:11|Carcassonne:11|Albi:81|Castres:81|Montauban:82|Tarbes:65|Lourdes:65|Rodez:12',
  'Millau:12|Villefranche-de-Rouergue:12|Cahors:46|Figeac:46|Auch:32|Foix:09|Mende:48',
  // Provence-Alpes-Côte d'Azur, Corse
  'Marseille:13|Aix-en-Provence:13|Aubagne:13|Martigues:13|Vitrolles:13|Istres:13|Salon-de-Provence:13',
  'La Ciotat:13|Arles:13|Nice:06|Cannes:06|Antibes:06|Grasse:06|Menton:06|Sophia-Antipolis:06|Valbonne:06',
  'Biot:06|Toulon:83|La Seyne-sur-Mer:83|Hyères:83|Fréjus:83|Draguignan:83|Avignon:84|Carpentras:84',
  'Cavaillon:84|Gap:05|Digne-les-Bains:04|Manosque:04|Ajaccio:2A|Bastia:2B',
  // Outre-mer
  'Pointe-à-Pitre:971|Basse-Terre:971|Fort-de-France:972|Cayenne:973|Le Tampon:974|Mamoudzou:976'
];
export const VILLES = BRUT.join('|').split('|').map(x => {
  const i = x.lastIndexOf(':');
  return { nom: x.slice(0, i), dept: x.slice(i + 1) };
});
