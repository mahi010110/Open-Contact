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

/* LE CENTRE DE CHAQUE VILLE — pour chercher AUTOUR d'elle, pas dans tout
   son département. RELEVÉ le 6 octobre (sonde-utile.mjs) : « alternance
   Lille » rendait Maubeuge, Dunkerque, Valenciennes — le Nord fait 150 km
   de long —, et même le siège d'Annecy d'une entreprise qui n'avait
   aucun établissement correspondant dans le département. Relevés au
   découpage officiel (geo.api.gouv.fr, centre de la commune, trois
   décimales : ~100 m) ; les huit que le découpage ne connaît pas sous ce
   nom (La Défense, Sophia-Antipolis, les apostrophes typographiques) ont
   été posés à la main. Une table, pas un service : hors ligne, à chaque
   frappe (invariant ④). */
const CENTRES_BRUT = [
  'Paris:48.859,2.347|Boulogne-Billancourt:48.837,2.243|Issy-les-Moulineaux:48.824,2.263|Nanterre:48.897,2.202|Courbevoie:48.898,2.257|Puteaux:48.882,2.238',
  'Levallois-Perret:48.895,2.287|Neuilly-sur-Seine:48.886,2.265|Clichy:48.904,2.304|Colombes:48.922,2.247|Asnières-sur-Seine:48.918,2.293|Rueil-Malmaison:48.872,2.181',
  'Gennevilliers:48.932,2.288|Suresnes:48.871,2.218|Saint-Cloud:48.844,2.203|Sèvres:48.822,2.206|Meudon:48.803,2.229|Montrouge:48.816,2.316',
  'Malakoff:48.817,2.294|Bagneux:48.798,2.309|Clamart:48.796,2.252|Antony:48.751,2.298|Saint-Denis:48.938,2.366|Saint-Ouen-sur-Seine:48.912,2.333',
  'Montreuil:48.864,2.449|Aubervilliers:48.913,2.389|Pantin:48.901,2.409|Bobigny:48.907,2.443|Noisy-le-Grand:48.833,2.556|Bondy:48.904,2.485',
  'Drancy:48.925,2.445|Aulnay-sous-Bois:48.946,2.492|Épinay-sur-Seine:48.954,2.317|Créteil:48.785,2.452|Vitry-sur-Seine:48.789,2.395|Ivry-sur-Seine:48.813,2.387',
  'Villejuif:48.793,2.360|Vincennes:48.847,2.438|Maisons-Alfort:48.802,2.440|Fontenay-sous-Bois:48.850,2.474|Champigny-sur-Marne:48.817,2.521|Saint-Maur-des-Fossés:48.800,2.492',
  'Rungis:48.749,2.350|Versailles:48.804,2.119|Saint-Germain-en-Laye:48.931,2.105|Vélizy-Villacoublay:48.784,2.196|Guyancourt:48.773,2.075|Sartrouville:48.937,2.174',
  'Poissy:48.924,2.025|Massy:48.726,2.270|Palaiseau:48.715,2.229|Orsay:48.697,2.190|Saclay:48.737,2.169|Les Ulis:48.682,2.186',
  'Évry-Courcouronnes:48.629,2.431|Évry:48.629,2.431|Corbeil-Essonnes:48.597,2.465|Cergy:49.037,2.046|Argenteuil:48.950,2.248|Sarcelles:48.992,2.386',
  'Pontoise:49.049,2.100|Melun:48.542,2.655|Meaux:48.957,2.904|Chelles:48.885,2.595|Noisiel:48.846,2.619|Champs-sur-Marne:48.849,2.594',
  'Torcy:48.853,2.648|Serris:48.845,2.787|Lille:50.631,3.047|Roubaix:50.689,3.184|Tourcoing:50.721,3.158|Marcq-en-Barœul:50.679,3.101',
  'Lambersart:50.654,3.025|Wasquehal:50.673,3.130|Loos:50.608,3.022|Seclin:50.545,3.027|Lesquin:50.590,3.113|Armentières:50.693,2.879',
  'Douai:50.379,3.100|Valenciennes:50.362,3.514|Dunkerque:51.018,2.343|Maubeuge:50.283,3.961|Cambrai:50.172,3.241|Hazebrouck:50.725,2.536',
  'Arras:50.289,2.768|Lens:50.440,2.819|Liévin:50.423,2.770|Béthune:50.530,2.644|Hénin-Beaumont:50.419,2.958|Calais:50.952,1.869',
  'Boulogne-sur-Mer:50.730,1.606|Saint-Omer:50.767,2.265|Amiens:49.899,2.285|Abbeville:50.110,1.832|Beauvais:49.443,2.088|Compiègne:49.401,2.855',
  'Creil:49.256,2.484|Saint-Quentin:49.847,3.279|Laon:49.571,3.613|Soissons:49.377,3.324|Strasbourg:48.569,7.762|Schiltigheim:48.612,7.751',
  'Illkirch-Graffenstaden:48.522,7.730|Haguenau:48.839,7.821|Sélestat:48.251,7.459|Saverne:48.744,7.354|Mulhouse:47.753,7.325|Colmar:48.111,7.392',
  'Saint-Louis:47.599,7.543|Metz:49.105,6.196|Thionville:49.372,6.144|Forbach:49.192,6.899|Nancy:48.688,6.173|Vandœuvre-lès-Nancy:48.660,6.160',
  'Lunéville:48.596,6.510|Reims:49.254,4.055|Châlons-en-Champagne:48.966,4.380|Épernay:49.039,3.928|Troyes:48.292,4.076|Charleville-Mézières:49.780,4.730',
  'Sedan:49.699,4.927|Épinal:48.164,6.487|Saint-Dié-des-Vosges:48.297,6.939|Chaumont:48.096,5.157|Bar-le-Duc:48.763,5.173|Verdun:49.144,5.361',
  'Rouen:49.441,1.091|Le Havre:49.496,0.131|Dieppe:49.920,1.084|Fécamp:49.748,0.401|Elbeuf:49.277,0.997|Caen:49.185,-0.372',
  'Lisieux:49.148,0.243|Bayeux:49.277,-0.702|Cherbourg-en-Cotentin:49.628,-1.636|Cherbourg:49.628,-1.636|Saint-Lô:49.112,-1.081|Granville:48.872,-1.766',
  'Évreux:49.018,1.141|Vernon:49.092,1.483|Louviers:49.221,1.156|Alençon:48.431,0.092|Flers:48.739,-0.560|Argentan:48.726,-0.013',
  'Rennes:48.116,-1.688|Cesson-Sévigné:48.123,-1.593|Bruz:48.024,-1.747|Saint-Malo:48.647,-2.007|Fougères:48.351,-1.195|Vitré:48.111,-1.197',
  'Redon:47.656,-2.079|Brest:48.408,-4.500|Quimper:47.998,-4.097|Morlaix:48.597,-3.821|Concarneau:47.898,-3.899|Lorient:47.749,-3.380',
  'Vannes:47.658,-2.748|Pontivy:48.066,-2.970|Saint-Brieuc:48.511,-2.766|Lannion:48.745,-3.470|Dinan:48.447,-2.053|Nantes:47.238,-1.560',
  'Saint-Herblain:47.225,-1.631|Rezé:47.173,-1.557|Orvault:47.275,-1.619|Carquefou:47.297,-1.469|Saint-Nazaire:47.277,-2.239|Angers:47.482,-0.563',
  'Cholet:47.036,-0.875|Saumur:47.264,-0.084|Le Mans:47.982,0.196|La Flèche:47.691,-0.060|Laval:48.058,-0.769|Château-Gontier:47.821,-0.701',
  'La Roche-sur-Yon:46.666,-1.416|Orléans:47.873,1.912|Montargis:48.000,2.739|Tours:47.394,0.695|Joué-lès-Tours:47.337,0.654|Blois:47.581,1.305',
  'Vendôme:47.800,1.065|Bourges:47.078,2.398|Vierzon:47.235,2.078|Chartres:48.448,1.505|Dreux:48.748,1.358|Châteauroux:46.802,1.690',
  'Dijon:47.332,5.032|Beaune:47.027,4.842|Besançon:47.260,6.012|Montbéliard:47.517,6.783|Pontarlier:46.917,6.380|Belfort:47.646,6.841',
  'Vesoul:47.632,6.152|Dole:47.074,5.502|Lons-le-Saunier:46.676,5.557|Mâcon:46.327,4.808|Chalon-sur-Saône:46.790,4.851|Le Creusot:46.806,4.426',
  'Montceau-les-Mines:46.675,4.355|Auxerre:47.794,3.582|Nevers:46.985,3.160|Lyon:45.758,4.835|Villeurbanne:45.772,4.890|Vénissieux:45.701,4.880',
  'Bron:45.736,4.912|Écully:45.782,4.774|Vaulx-en-Velin:45.778,4.925|Caluire-et-Cuire:45.799,4.849|Limonest:45.827,4.768|Villefranche-sur-Saône:45.984,4.726',
  'Saint-Étienne:45.424,4.367|Roanne:46.044,4.080|Grenoble:45.184,5.715|Meylan:45.215,5.787|Échirolles:45.144,5.715|Montbonnot-Saint-Martin:45.221,5.815',
  'Voiron:45.380,5.587|Bourgoin-Jallieu:45.602,5.275|Clermont-Ferrand:45.787,3.113|Issoire:45.544,3.244|Vichy:46.132,3.425|Montluçon:46.343,2.608',
  'Moulins:46.559,3.325|Le Puy-en-Velay:45.028,3.897|Aurillac:44.928,2.442|Annecy:45.902,6.126|Annemasse:46.189,6.248|Thonon-les-Bains:46.374,6.478',
  'Cluses:46.063,6.577|Chambéry:45.582,5.906|Aix-les-Bains:45.694,5.904|Albertville:45.665,6.410|Valence:44.923,4.916|Montélimar:44.554,4.745',
  'Romans-sur-Isère:45.061,5.048|Privas:44.721,4.595|Annonay:45.245,4.642|Aubenas:44.611,4.394|Bourg-en-Bresse:46.203,5.247|Oyonnax:46.260,5.652',
  'Bordeaux:44.862,-0.585|Mérignac:44.831,-0.682|Pessac:44.786,-0.681|Talence:44.806,-0.592|Gradignan:44.768,-0.616|Bègles:44.803,-0.548',
  'Lormont:44.875,-0.518|Libourne:44.913,-0.233|Arcachon:44.651,-1.172|Limoges:45.857,1.226|Poitiers:46.585,0.371|Châtellerault:46.815,0.558',
  'La Rochelle:46.162,-1.177|Rochefort:45.946,-0.975|Saintes:45.746,-0.646|Royan:45.634,-1.013|Niort:46.327,-0.461|Bressuire:46.865,-0.473',
  'Angoulême:45.646,0.145|Cognac:45.696,-0.338|Pau:43.322,-0.344|Bayonne:43.484,-1.461|Biarritz:43.471,-1.556|Anglet:43.489,-1.519',
  'Périgueux:45.194,0.711|Bergerac:44.852,0.488|Sarlat-la-Canéda:44.906,1.199|Agen:44.201,0.630|Mont-de-Marsan:43.893,-0.501|Dax:43.703,-1.064',
  'Brive-la-Gaillarde:45.145,1.514|Tulle:45.269,1.766|Guéret:46.158,1.871|Toulouse:43.601,1.433|Blagnac:43.641,1.377|Labège:43.540,1.521',
  'Colomiers:43.612,1.325|Balma:43.611,1.504|Ramonville-Saint-Agne:43.544,1.478|Montpellier:43.610,3.874|Castelnau-le-Lez:43.637,3.911|Lattes:43.567,3.899',
  'Sète:43.384,3.644|Lunel:43.678,4.133|Béziers:43.348,3.234|Nîmes:43.832,4.343|Alès:44.125,4.090|Bagnols-sur-Cèze:44.162,4.624',
  'Perpignan:42.699,2.905|Narbonne:43.149,3.034|Carcassonne:43.208,2.349|Albi:43.929,2.132|Castres:43.613,2.245|Montauban:44.022,1.365',
  'Tarbes:43.239,0.065|Lourdes:43.109,-0.081|Rodez:44.359,2.570|Millau:44.098,3.118|Villefranche-de-Rouergue:44.347,2.030|Cahors:44.456,1.439',
  'Figeac:44.607,2.023|Auch:43.660,0.567|Foix:42.970,1.609|Mende:44.535,3.491|Marseille:43.280,5.381|Aix-en-Provence:43.536,5.388',
  'Aubagne:43.290,5.564|Martigues:43.384,5.045|Vitrolles:43.451,5.266|Istres:43.545,4.948|Salon-de-Provence:43.643,5.049|La Ciotat:43.188,5.617',
  'Arles:43.544,4.651|Nice:43.703,7.253|Cannes:43.545,7.015|Antibes:43.582,7.105|Grasse:43.656,6.937|Menton:43.796,7.498',
  'Valbonne:43.627,7.029|Biot:43.627,7.082|Toulon:43.136,5.933|La Seyne-sur-Mer:43.084,5.879|Hyères:43.114,6.236|Fréjus:43.455,6.785',
  'Draguignan:43.535,6.465|Avignon:43.942,4.833|Carpentras:44.063,5.058|Cavaillon:43.849,5.033|Gap:44.580,6.062|Digne-les-Bains:44.095,6.250',
  'Manosque:43.829,5.790|Ajaccio:41.923,8.706|Bastia:42.686,9.424|Pointe-à-Pitre:16.235,-61.538|Basse-Terre:15.999,-61.729|Fort-de-France:14.649,-61.069',
  'Cayenne:4.946,-52.332|Le Tampon:-21.225,55.570|Mamoudzou:-12.787,45.196|La Défense:48.892,2.236|Saint-Quentin-en-Yvelines:48.772,2.034|Marne-la-Vallée:48.849,2.640',
  'Villeneuve-d’Ascq:50.623,3.145|Lomme:50.643,2.987|Les Sables-d’Olonne:46.497,-1.784|Saint-Martin-d’Hères:45.167,5.765|Sophia-Antipolis:43.617,7.055'
];
export const CENTRES = new Map(CENTRES_BRUT.join('|').split('|').map(x => {
  const i = x.lastIndexOf(':');
  const [lat, lng] = x.slice(i + 1).split(',').map(Number);
  return [x.slice(0, i), [lat, lng]];
}));
