/* ============================================================
   OpenContact — moteur · LA CARTE D'UNE ENTREPRISE
   (docs/carte.md)

   Demande du mainteneur, 5 octobre 2026 : « que les infos soient
   affichées d'une belle façon sans devoir appuyer sur un lien », et
   « mixer les sources afin de donner les meilleures infos, les plus
   utiles ». Une carte, donc, qui MÊLE plusieurs sources publiques et
   les montre sur place — dans l'aperçu de « À découvrir » comme dans la
   fiche.

   UN FAIT = UNE VALEUR. Chaque information a une source qui la dit le
   mieux, et la carte n'en montre qu'une — jamais « 100-199 salariés
   (annuaire) · 1 000 (Wikidata) » côte à côte. L'ordre de confiance :
   · TA PAROLE d'abord : ce que tu as écrit sur la fiche (« En bref »,
     le site) passe devant tout registre ;
   · L'ANNUAIRE pour l'entreprise juridique : effectif, création, chiffre
     d'affaires, dirigeants, établissements — c'est l'État qui les tient,
     pour CETTE entité (Wikidata parle souvent du groupe) ;
   · le BODACC pour ce qui RÉCLAME quelque chose : une procédure
     collective, la seule information de la carte qui change la
     décision d'écrire ;
   · WIKIPÉDIA et WIKIDATA pour ce que le registre ne sait pas dire en
     mots : ce que fait l'entreprise, son groupe, son logo, sa page
     LinkedIn. Relevé : ils ne connaissent que les grandes (8 sur 37) —
     ils complètent, ils ne portent jamais la carte.

   CE QUI SE MONTRE est choisi, pas empilé (CLAUDE.md §6 : « choisir à la
   place de l'utilisateur est le service rendu »). Ce que les étudiants
   regardent pour choisir une entreprise d'accueil — les missions, le
   secteur, la distance, la taille (Apec ; Planète Grandes Écoles) — et
   à qui écrire. La convention collective, les labels, le bilan carbone
   sont relevés par la sonde et laissés de côté : ils ne départagent
   rien pour un étudiant.

   Fonctions PURES : aucune requête, aucun écran. L'interface appelle,
   lit, et dessine (ui/carte.js).
   ============================================================ */
import { TRANCHES, LINKEDIN_GENS } from './annuaire.js';

export const WIKIDATA = 'https://query.wikidata.org/sparql';
export const WIKIPEDIA_FR = 'https://fr.wikipedia.org/api/rest_v1/page/summary/';
export const BODACC = 'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';
export const LINKEDIN_PAGE = 'https://www.linkedin.com/company/';

const SIREN_OK = s => /^\d{9}$/.test(String(s || ''));

/* ---------- Wikidata : ce que le registre ne dit pas en mots ----------
   Une seule question, par le SIREN (P1616) — neuf chiffres publics, rien
   d'autre n'y entre. */
export function questionWikidata(siren){
  if (!SIREN_OK(siren)) return '';
  const q = `SELECT ?site ?desc ?logo ?li ?mereLabel ?article WHERE {
    ?e wdt:P1616 "${siren}" .
    OPTIONAL { ?e wdt:P856 ?site }
    OPTIONAL { ?e schema:description ?desc FILTER(LANG(?desc) = "fr") }
    OPTIONAL { ?e wdt:P154 ?logo }
    OPTIONAL { ?e wdt:P4264 ?li }
    OPTIONAL { ?e wdt:P749 ?mere }
    OPTIONAL { ?article schema:about ?e ; schema:isPartOf <https://fr.wikipedia.org/> }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } } LIMIT 12`;
  return WIKIDATA + '?format=json&query=' + encodeURIComponent(q);
}
/* Plusieurs lignes peuvent revenir (deux sites, deux logos) : on garde
   le site en https d'abord, et la première valeur de chaque champ. */
export function lireWikidata(json){
  const b = (json && json.results && Array.isArray(json.results.bindings)) ? json.results.bindings : [];
  const v = k => b.map(x => x && x[k] && x[k].value).filter(Boolean);
  const sites = v('site').filter(u => /^https?:\/\//i.test(u));
  const site = sites.find(u => /^https:/i.test(u)) || sites[0] || '';
  const li = v('li').find(x => /^[a-z0-9][a-z0-9\-_.%]*$/i.test(x)) || '';
  const logo = v('logo').find(u => /^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//i.test(u)) || '';
  /* le libellé d'une organisation mère sans nom en français revient sous
     la forme « Q1234 » : ce n'est pas un nom, il ne se montre pas */
  const mere = v('mereLabel').find(x => !/^Q\d+$/.test(x)) || '';
  const article = v('article').find(u => /^https:\/\/fr\.wikipedia\.org\/wiki\//.test(u)) || '';
  return {
    site, desc: v('desc')[0] || '', groupe: mere, article,
    linkedin: li ? LINKEDIN_PAGE + li : '',
    /* une vignette, pas le fichier entier : un logo SVG de 2 Mo n'a rien
       à faire sur un téléphone */
    logo: logo ? logo.replace(/^http:/, 'https:') + '?width=96' : ''
  };
}

/* ---------- Wikipédia : ce que fait l'entreprise, en une phrase ---------- */
export function questionResume(article){
  const m = String(article || '').match(/^https:\/\/fr\.wikipedia\.org\/wiki\/([^?#]+)$/);
  return m ? WIKIPEDIA_FR + m[1] : '';
}
/* La première phrase seulement — elle dit presque toujours CE QUE FAIT
   l'entreprise (relevé : 5 résumés sur 5). Les parenthèses (anciens
   noms, prononciation, sigles) partent : elles ralentissent la lecture
   sans rien dire de l'activité. Plafond : 180 caractères, coupés à un
   mot. */
export function lireResume(json){
  if (!json || json.type === 'disambiguation') return '';
  let t = String(json.extract || '').replace(/\s*\([^()]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const fin = t.search(/[.!?](\s|$)/);
  if (fin > 30) t = t.slice(0, fin + 1);
  if (t.length > 180){
    t = t.slice(0, 180);
    t = t.slice(0, t.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
  }
  return t;
}

/* ---------- le BODACC : ce qui RÉCLAME quelque chose ---------- */
export function questionBodacc(siren){
  if (!SIREN_OK(siren)) return '';
  const p = new URLSearchParams({
    where: `registre like "${siren}"`,
    select: 'dateparution,familleavis,familleavis_lib,jugement',
    order_by: 'dateparution desc',
    limit: '20'
  });
  return BODACC + '?' + p.toString();
}
const MOIS = 30.44 * 86400000;
const NATURES = [
  [/liquidation/i, 'liquidation judiciaire'],
  [/redressement/i, 'redressement judiciaire'],
  [/sauvegarde/i, 'procédure de sauvegarde']
];
/* Une procédure collective est « en cours » quand sa DERNIÈRE annonce a
   moins de trois ans et n'est pas une clôture. Le jugement arrive en
   texte libre, parfois en chaîne JSON : on lit sa nature, on reconnaît
   trois mots, et un texte qu'on ne reconnaît pas reste « procédure
   collective » — mieux vaut ne pas comprendre que mal comprendre. */
export function lireBodacc(json, today){
  const res = (json && Array.isArray(json.results)) ? json.results : [];
  const t0 = Date.parse((today || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z');
  const coll = res.filter(a => a && a.familleavis === 'collective' && /^\d{4}-\d{2}-\d{2}/.test(a.dateparution || ''))
    .sort((a, b) => String(b.dateparution).localeCompare(String(a.dateparution)));
  const a = coll[0];
  if (!a || t0 - Date.parse(a.dateparution.slice(0, 10) + 'T00:00:00Z') > 36 * MOIS) return { procedure: null };
  let j = a.jugement;
  if (typeof j === 'string'){ try { j = JSON.parse(j); } catch (e) { j = { nature: j }; } }
  const texte = [j && j.famille, j && j.nature, j && j.complementJugement].filter(Boolean).join(' ');
  if (/cl[ôo]ture/i.test(texte) && !/liquidation/i.test(texte)) return { procedure: null };
  const n = NATURES.find(([re]) => re.test(texte));
  const date = String((j && j.date) || a.dateparution).slice(0, 10);
  return { procedure: { nature: n ? n[1] : 'procédure collective', date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : a.dateparution.slice(0, 10) } };
}

/* ---------- un montant, lisible d'un coup d'œil ---------- */
export function montant(n){
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return '';
  const fr = (v, d) => v.toFixed(d).replace('.', ',').replace(/,0$/, '');
  if (x >= 1e9) return fr(x / 1e9, x < 1e10 ? 1 : 0) + ' Md€';
  if (x >= 1e6) return fr(x / 1e6, x < 1e7 ? 1 : 0) + ' M€';
  if (x >= 1e3) return Math.round(x / 1e3) + ' k€';
  return Math.round(x) + ' €';
}
const majuscule = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const pareil = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/* ---------- LA CARTE : une valeur par fait, la meilleure ----------
   `piste` (facultatif) : la fiche, dont la parole passe devant ;
   `r` : la lecture de l'annuaire (lireAnnuaire) ; `wd`, `resume`,
   `bodacc` : ce que les autres sources ont rendu, s'ils ont répondu.
   Rend ce qu'il faut DESSINER, et d'où ça vient. */
export function carte(o){
  o = o || {};
  const c = o.piste || {};
  const r = o.r || {};
  const wd = o.wd || {};
  const src = new Set();
  const dit = (s, v) => { if (v) src.add(s); return v; };

  /* ce qui réclame quelque chose, en tête — une seule alerte, la plus forte */
  let alerte = null;
  if (r.fermee) alerte = dit('annuaire', { texte: 'Entreprise fermée', date: r.fermeeLe || '' });
  else if (o.bodacc && o.bodacc.procedure)
    alerte = dit('bodacc', { texte: majuscule(o.bodacc.procedure.nature), date: o.bodacc.procedure.date });

  /* CE QU'ELLE FAIT : ta phrase, sinon Wikipédia, sinon Wikidata, sinon
     le libellé de son code d'activité */
  const quoi = String(c.desc || '').trim() ? { texte: String(c.desc).trim(), src: 'toi' }
    : o.resume ? { texte: o.resume, src: dit('wikipedia', 'wikipedia') }
    : wd.desc && !/^(entreprise|société)( française| de france)?$/i.test(wd.desc) ? { texte: majuscule(wd.desc), src: dit('wikidata', 'wikidata') }
    : r.activite ? { texte: r.activite, src: dit('annuaire', 'annuaire') }
    : null;
  /* le libellé de l'activité reste dit quand une phrase le remplace :
     « Conseil en systèmes et logiciels informatiques » départage deux
     ESN mieux qu'une phrase d'encyclopédie */
  const activite = quoi && quoi.src !== 'annuaire' && r.activite && !pareil(r.activite, quoi.texte) ? r.activite : '';
  if (activite) src.add('annuaire');

  /* LES CHIFFRES — quatre au plus, toujours dans le même ordre, pour que
     deux cartes se comparent d'un coup d'œil */
  const chiffres = [];
  const t = TRANCHES[r.tranche] || '';
  if (t && r.tranche !== '00'){
    const m = t.match(/^(.+?) salariés?( et plus)?$/);
    chiffres.push({ v: m ? m[1] + (m[2] ? ' +' : '') : t, l: 'salariés' });
  }
  if (r.ca && r.ca.montant > 0) chiffres.push({ v: montant(r.ca.montant), l: 'CA ' + r.ca.annee });
  const an = String(r.creation || '').slice(0, 4);
  if (/^\d{4}$/.test(an)) chiffres.push({ v: an, l: 'création' });
  if (r.etablissements > 1) chiffres.push({ v: String(r.etablissements), l: 'sites' });
  if (chiffres.length) src.add('annuaire');

  /* À QUI ÉCRIRE, ET DE QUI ELLE DÉPEND */
  const lignes = [];
  const dirs = (r.dirigeants || []).filter(d => d && d.personne).slice(0, 2)
    .map(d => d.nom + (d.qualite ? ', ' + d.qualite.toLowerCase() : '')).join(' · ');
  if (dirs){ lignes.push({ l: 'Dirigeant', v: dirs }); src.add('annuaire'); }
  if (wd.groupe && !pareil(wd.groupe, r.nom) && !pareil(wd.groupe, c.name))
    lignes.push({ l: 'Groupe', v: dit('wikidata', wd.groupe) });

  /* le site : celui de la fiche, sinon Wikidata — la carte ne le redit
     pas quand la fiche le montre déjà */
  const site = String(c.website || '').trim() ? '' : (wd.site ? dit('wikidata', wd.site) : '');
  const logo = wd.logo ? dit('wikidata', wd.logo) : '';
  const linkedin = wd.linkedin ? dit('wikidata', wd.linkedin) : '';

  const NOMS = { annuaire: 'Annuaire des entreprises', bodacc: 'BODACC', wikipedia: 'Wikipédia', wikidata: 'Wikidata' };
  return {
    alerte, quoi, activite, chiffres, lignes, site, logo, linkedin,
    sources: ['annuaire', 'bodacc', 'wikipedia', 'wikidata'].filter(k => src.has(k)).map(k => NOMS[k])
  };
}

/* ---------- À QUI ÉCRIRE ----------
   (docs/utile.md) Une piste ajoutée depuis l'annuaire n'a PERSONNE : le
   premier geste du produit — écrire — n'avait pas de destinataire, et
   l'étudiant restait devant une fiche sans savoir à qui s'adresser.
   Ce qui décide est la TAILLE :
   · jusqu'à 249 salariés, c'est le dirigeant qui décide d'accueillir un
     stagiaire ou un alternant : on lui écrit, par son nom ;
   · au-delà — ou dans une filiale d'un grand groupe —, un service
     recrute : on écrit au recrutement, ou à un ancien de son école.
   L'app ne devine AUCUNE adresse (une adresse inventée part dans le
   vide, et personne ne le saura). Elle nomme la personne, et ouvre la
   recherche qui la trouve — sur ton geste, vers le site que le lien
   nomme. */
const GRANDE = new Set(['32', '41', '42', '51', '52', '53']);
export const estGrande = r => !!r && (GRANDE.has(String(r.tranche || '')) || r.categorie === 'GE' || r.categorie === 'ETI');
export function aQui(r, nom){
  r = r || {};
  const ent = String(nom || r.nom || '').trim();
  const dir = (r.dirigeants || []).find(d => d && d.personne && d.nom);
  if (!estGrande(r) && dir) return {
    cible: 'dirigeant', nom: dir.nom, qualite: String(dir.qualite || '').toLowerCase(),
    url: ent ? LINKEDIN_GENS + encodeURIComponent(dir.nom + ' ' + ent) : ''
  };
  if (!ent) return null;
  return { cible: 'recrutement', nom: '', qualite: '',
           url: LINKEDIN_GENS + encodeURIComponent(ent + ' recrutement') };
}

/* ---------- CE QUE TU Y FERAIS ----------
   Le code d'activité dit ce que fait l'entreprise dans la langue de
   l'INSEE : « Conseil en systèmes et logiciels informatiques » neuf fois
   sur dix, qui ne départage rien et ne dit pas le travail. Un étudiant
   cherche autre chose : quel travail il y ferait, et si c'est le sien.
   La table traduit chaque code en ce travail, et dit à quels MÉTIERS de
   la barre (engine/requete.js) il correspond — c'est ce qui permet de
   dire « c'est ton métier » sans rien inventer. */
const T = (texte, metiers) => ({ texte, metiers });
export const TRAVAIL = {
  '62.01Z': T('du développement de logiciels', ['dev']),
  '62.02A': T('du conseil et de l’intégration informatique', ['dev', 'reseau', 'cyber']),
  '62.02B': T('de la maintenance de systèmes et d’applications', ['reseau', 'support']),
  '62.03Z': T('de l’infogérance : les serveurs et réseaux de ses clients', ['reseau', 'cloud']),
  '62.09Z': T('de l’installation et du dépannage informatique', ['support', 'reseau']),
  '63.11Z': T('de l’hébergement et du cloud', ['cloud', 'reseau']),
  '63.12Z': T('du web : sites et services en ligne', ['dev']),
  '58.21Z': T('du jeu vidéo', ['dev']),
  '58.29A': T('de l’édition de logiciels', ['dev']),
  '58.29B': T('de l’édition de logiciels', ['dev']),
  '58.29C': T('de l’édition de logiciels', ['dev']),
  '61.10Z': T('des télécoms et du réseau', ['reseau']),
  '61.20Z': T('des télécoms et du réseau', ['reseau']),
  '61.90Z': T('des télécoms et du réseau', ['reseau']),
  '46.51Z': T('de l’intégration de matériel informatique chez ses clients', ['reseau', 'support']),
  '46.52Z': T('de l’intégration de matériel réseau et télécoms', ['reseau']),
  '47.41Z': T('de la vente et du dépannage informatique', ['support']),
  '95.11Z': T('du dépannage informatique', ['support']),
  '95.12Z': T('de la maintenance de matériel de communication', ['reseau', 'support'])
};
/* Une entreprise qui n'est PAS du numérique peut avoir un service
   informatique — une collectivité, un hôpital, une banque, une usine.
   Seulement passé une taille : une boulangerie n'a pas de DSI. Le seuil
   est celui où une informatique interne existe (50 salariés). */
const AVEC_SERVICE = new Set(['21', '22', '31', '32', '41', '42', '51', '52', '53']);
export function travailDe(r){
  r = r || {};
  const t = TRAVAIL[String(r.naf || '')];
  if (t) return t;
  if (AVEC_SERVICE.has(String(r.tranche || '')) || r.categorie === 'GE' || r.categorie === 'ETI')
    return T('dans son service informatique', ['reseau', 'support', 'dev']);
  return null;
}
