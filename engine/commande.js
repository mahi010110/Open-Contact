/* ============================================================
   OpenContact — moteur · la barre qui comprend (la refonte, lot 0)

   La barre de « Mes pistes » comprend une RECHERCHE : un métier, une
   ville, un état (`requete.js`). La barre de la refonte — le « + » —
   comprend aussi un GESTE : « relancer Advens », « entretien Aztek
   jeudi 14h », « refus Capgemini », « note Thales : écrire à Karim ».
   C'est l'idée d'Arc Search, traduite : une seule entrée, et l'app
   fait le chemin (docs/refonte-plan.md, fiche 0014).

   Une table, pas une IA — comme `requete.js`, et pour la même raison :
   chaque mot compris se lit ici et se teste un par un.

   CINQ RÈGLES, qui sont le contrat de ce fichier (tests.js les tient) :

   1. MIEUX VAUT NE PAS COMPRENDRE QUE MAL COMPRENDRE. Un geste n'existe
      que si son verbe OUVRE la phrase (ou suit le nom de la piste).
      « Orange » reste une recherche ; « relancer Orange » est un geste.
   2. LA BARRE PROPOSE, LE DOIGT DÉCIDE. Rien ici ne change une donnée :
      le moteur rend ce qu'il a compris, écrit en clair (« Relancer
      Claire », « Advens · en retard de 2 jours »), et l'écran ne
      l'applique que sur un tap, suivi d'« Annuler » (invariant ②).
   3. AUCUN MOT PERDU. Ce qui n'est ni le verbe, ni la piste, ni la date
      devient le texte du geste (« rappeler Advens lundi pour le test »
      → « Rappeler pour le test »), ou reste une recherche.
   4. UNE DATE DIT « PLUS TARD », SON ABSENCE DIT « MAINTENANT ».
      « relancer Advens » ouvre le mail ; « relancer Advens lundi »
      pose la relance à lundi.
   5. CE QU'ON A PASSE AVANT CE QU'ON N'A PAS. Un nom inconnu se propose
      en page préparée, puis en piste à ajouter — toujours en dernier.

   Fonctions pures : rien ici ne lit l'écran, l'horloge ni le réseau.
   ============================================================ */
import { fold } from './filter.js';
import { fautes, fautesPermises, interpreter, chercherPistes, contexteRecherche, propositions } from './requete.js';
import { silentPistes, dueFollowups, aDemarrer } from './assist.js';
import { CLOSE_REASONS, STATUSES, nextActionContact } from './model.js';
import { todayISO } from './utils.js';

/* ---------- les mots ---------- */
const plier = s => fold(s).replace(/œ/g, 'oe').replace(/æ/g, 'ae');
/* les mots d'un NOM (une piste, une personne) : « Villeneuve-d'Ascq »,
   « L'Oréal » — la lettre d'une élision n'est pas un mot */
const motsNom = s => plier(s).split(/[^a-z0-9+#]+/).filter(w => w && !(w.length === 1 && 'ld'.includes(w)));
const majuscule = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

/* Un mot tapé : ce qu'on a écrit (`brut`), sa forme pliée (`mot`), sa
   place. Le trait d'union sépare (« après-demain », « rendez-vous ») ;
   la barre oblique, les deux-points et le « h » d'une heure, non. */
export function jetons(q){
  const s = String(q == null ? '' : q);
  const out = [];
  const re = /[^\s\-–—]+/g;
  let m;
  while ((m = re.exec(s))){
    let mot = plier(m[0]).replace(/^[^a-z0-9+]+/, '').replace(/[^a-z0-9+#]+$/, '');
    if (/^aujourd'?hui$/.test(mot)) mot = 'aujourdhui';
    /* l'élision : « l'entretien », « d'Advens », « j'ai », « qu'ils » */
    const eli = /^(?:l|d|j|n|s|m|t|c|qu)'(.+)$/.exec(mot);
    if (eli) mot = eli[1];
    if (!mot) continue;
    out.push({ brut: m[0], mot, debut: m.index, fin: m.index + m[0].length });
  }
  return out;
}

/* Les mots qui relient : ils ne cherchent rien et ne disent aucun geste.
   « j'ai décroché chez OVH », « Advens m'a répondu », « ils ont refusé ». */
const VIDES = new Set(['je', 'ai', 'a', 'as', 'ont', 'on', 'il', 'ils', 'elle', 'elles', 'me', 'nous',
  'est', 'ce', 'cet', 'cette', 'chez', 'au', 'aux', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une',
  'pour', 'avec', 'et', 'sur', 'dans', 'par', 'mon', 'ma', 'mes', 'que', 'y', 'en', 'ete', 'suis',
  'piste', 'entreprise', 'societe']);

/* ---------- les verbes ----------
   `piste` : le geste a besoin d'une piste. Les formes sont PLIÉES (sans
   accent, en minuscules) : « refusé » et « refuse » sont le même mot.
   Une forme de deux mots passe avant une forme d'un mot (« pas pris »
   n'est pas « pris »). */
export const VERBES = {
  relancer:  { mots: ['relancer', 'relance', 'relancez'] },
  ecrire:    { mots: ['ecrire', 'ecris', 'mail', 'mailer', 'email', 'postuler', 'postule', 'candidater', 'contacter', 'contacte'] },
  appeler:   { mots: ['appeler', 'appelle', 'appel', 'telephoner', 'telephone'] },
  entretien: { mots: ['entretien', 'rdv', 'rendez vous', 'entrevue', 'visio'] },
  reponse:   { mots: ['reponse', 'repondu', 'repond', 'repondent'] },
  refus:     { mots: ['refus', 'refuse', 'refusee', 'rejete', 'rejetee', 'recale', 'recalee',
                      'pas retenu', 'pas retenue', 'non retenu', 'non retenue', 'pas pris', 'pas prise'] },
  decroche:  { mots: ['decroche', 'decrochee', 'pris', 'prise', 'accepte', 'acceptee', 'embauche', 'embauchee', 'signe', 'gagne'] },
  ranger:    { mots: ['ranger', 'range', 'abandonner', 'abandonne', 'abandon', 'laisser tomber', 'laisse tomber',
                      'cloturer', 'cloture', 'clore', 'archiver'] },
  rouvrir:   { mots: ['rouvrir', 'rouvre', 'reouvrir', 'reprendre', 'reprends'] },
  fait:      { mots: ['fait', 'fini', 'termine'] },
  reporter:  { mots: ['reporter', 'reporte', 'decaler', 'decale', 'repousser', 'repousse'] },
  note:      { mots: ['note', 'noter', 'notes'] },
  demander:  { mots: ['demander', 'demande'] },
  ajouter:   { mots: ['ajouter', 'ajoute', 'nouvelle', 'nouveau', 'creer', 'cree'] },
  /* un verbe du quotidien, suivi d'une date : il se pose tel qu'il est dit */
  planifier: { mots: ['rappeler', 'rappelle', 'preparer', 'prepare', 'envoyer', 'envoie', 'repondre', 'confirmer',
                      'confirme', 'verifier', 'verifie', 'relire', 'deposer', 'signer', 'remercier', 'rencontrer',
                      'voir', 'passer', 'finir', 'tester', 'test', 'faire le point'] }
};
const VERBE_MAX = 3;                       /* « faire le point » */
const FORMES = new Map();
for (const [id, v] of Object.entries(VERBES)) for (const f of v.mots) if (!FORMES.has(f)) FORMES.set(f, id);

/* ---------- la date et l'heure ----------
   « demain », « après-demain », « jeudi », « lundi prochain », « dans 3
   jours », « dans deux semaines », « la semaine prochaine », « 12/11 »,
   « 12 novembre », « le 12 » ; « 14h », « 14h30 », « 14:30 », « midi ».
   Un jour de la semaine est le PROCHAIN, jamais aujourd'hui : on ne
   planifie pas « jeudi » un jeudi pour le jour même. */
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_LONGS = JOURS;
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre',
  'octobre', 'novembre', 'décembre'];
const MOIS = { janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6,
  juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, sep: 9, octobre: 10, oct: 10, novembre: 11, nov: 11,
  decembre: 12, dec: 12 };
const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, quinze: 15 };
const tempsDe = iso => Date.parse(iso + 'T00:00:00Z');
export const plusJours = (iso, n) => new Date(tempsDe(iso) + n * 86400000).toISOString().slice(0, 10);
const jourSemaine = iso => new Date(tempsDe(iso)).getUTCDay();
const p2 = n => String(n).padStart(2, '0');
function dateValide(y, m, d){
  const t = Date.UTC(y, m - 1, d), u = new Date(t);
  return (u.getUTCMonth() === m - 1 && u.getUTCDate() === d) ? `${y}-${p2(m)}-${p2(d)}` : '';
}
/* un jour et un mois sans année : le prochain, cette année ou la suivante */
function prochain(m, d, today){
  const y = Number(today.slice(0, 4));
  const a = dateValide(y, m, d);
  return (a && a >= today) ? a : dateValide(y + 1, m, d);
}
const entier = (mot, max) => /^\d{1,2}$/.test(mot) && Number(mot) <= max ? Number(mot) : -1;

/* Lit UNE date et UNE heure parmi les mots libres. Rend ce qu'il a lu
   et les places prises — le reste est du texte (règle 3). */
export function lireDate(toks, libre, today = todayISO()){
  const pris = new Set();
  let date = '', heure = '';
  const ok = i => i >= 0 && i < toks.length && libre(i) && !pris.has(i);
  const mot = i => ok(i) ? toks[i].mot : '';
  const prendre = (...is) => is.forEach(i => pris.add(i));
  for (let i = 0; i < toks.length; i++){
    if (!ok(i)) continue;
    const w = toks[i].mot;
    /* ----- l'heure ----- */
    if (!heure){
      let h = -1, mn = 0, n = 0;
      let m = /^(\d{1,2})h(\d{2})?$/.exec(w) || /^(\d{1,2}):(\d{2})$/.exec(w);
      if (m){ h = Number(m[1]); mn = Number(m[2] || 0); n = 1; }
      else if (entier(w, 23) >= 0 && mot(i + 1) === 'h'){
        h = Number(w); n = 2;
        if (/^\d{2}$/.test(mot(i + 2)) && Number(mot(i + 2)) < 60){ mn = Number(mot(i + 2)); n = 3; }
      } else if (w === 'midi'){ h = 12; n = 1; }
      if (n && h >= 0 && h <= 23 && mn < 60){
        heure = p2(h) + ':' + p2(mn);
        for (let k = 0; k < n; k++) prendre(i + k);
        continue;
      }
    }
    if (date) continue;
    /* ----- le jour ----- */
    if (w === 'aujourdhui'){ date = today; prendre(i); continue; }
    if (w === 'demain'){
      const apres = mot(i - 1) === 'apres';
      date = plusJours(today, apres ? 2 : 1);
      prendre(i); if (apres) prendre(i - 1);
      continue;
    }
    if (JOURS.includes(w)){
      const d = (JOURS.indexOf(w) - jourSemaine(today) + 7) % 7 || 7;
      date = plusJours(today, d);
      prendre(i); if (mot(i + 1) === 'prochain') prendre(i + 1);
      continue;
    }
    if (w === 'dans'){
      const nb = /^\d{1,3}$/.test(mot(i + 1)) ? Number(mot(i + 1)) : (NOMBRES[mot(i + 1)] || 0);
      const u = mot(i + 2);
      const par = /^(jour|jours|j)$/.test(u) ? 1 : /^(semaine|semaines|sem)$/.test(u) ? 7 : /^mois$/.test(u) ? 30 : 0;
      if (nb > 0 && par){ date = plusJours(today, nb * par); prendre(i, i + 1, i + 2); continue; }
    }
    if (w === 'semaine' && mot(i + 1) === 'prochaine'){
      date = plusJours(today, (8 - jourSemaine(today)) % 7 || 7);
      prendre(i, i + 1);
      continue;
    }
    let m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(w);
    if (m){
      const d = Number(m[1]), mo = Number(m[2]);
      const y = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : 0;
      const iso = y ? dateValide(y, mo, d) : prochain(mo, d, today);
      if (iso && iso >= today){ date = iso; prendre(i); continue; }
    }
    const j = w === '1er' ? 1 : entier(w, 31);
    if (j >= 1 && MOIS[mot(i + 1)]){
      const an = /^20\d\d$/.test(mot(i + 2)) ? Number(mot(i + 2)) : 0;
      const iso = an ? dateValide(an, MOIS[mot(i + 1)], j) : prochain(MOIS[mot(i + 1)], j, today);
      if (iso && iso >= today){ date = iso; prendre(i, i + 1); if (an) prendre(i + 2); continue; }
    }
    /* « le 12 » : le prochain 12 — jamais un nombre seul, qui peut être
       n'importe quoi (un numéro de rue, un département) */
    if (j >= 1 && i > 0 && toks[i - 1].mot === 'le' && mot(i + 1) !== 'h'){
      const y = Number(today.slice(0, 4)), mo = Number(today.slice(5, 7));
      const ici = dateValide(y, mo, j);
      const iso = (ici && ici >= today) ? ici : (mo === 12 ? dateValide(y + 1, 1, j) : dateValide(y, mo + 1, j));
      if (iso){ date = iso; prendre(i); continue; }
    }
  }
  return { date, heure, pris };
}
/* « 14 h », « 14 h 30 » — l'heure telle qu'on l'écrit */
export const heureEnMots = hhmm => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) + ' h' + (m[2] === '00' ? '' : ' ' + m[2]) : '';
};
/* « aujourd’hui », « demain », « jeudi 12 novembre » */
export function jourEnMots(iso, today = todayISO()){
  if (!iso) return '';
  if (iso === today) return 'aujourd’hui';
  if (iso === plusJours(today, 1)) return 'demain';
  const d = Number(iso.slice(8, 10));
  return JOURS_LONGS[jourSemaine(iso)] + ' ' + (d === 1 ? '1er' : d) + ' ' + MOIS_LONGS[Number(iso.slice(5, 7)) - 1];
}
const ecartJours = (a, b) => Math.round((tempsDe(b) - tempsDe(a)) / 86400000);

/* ---------- reconnaître une piste ----------
   Le nom entier (100), son début (90, 85 quand le dernier mot est
   incomplet), un mot du nom qui n'est pas le premier (70), une personne
   de la piste (75), et — proposée, jamais affirmée — une faute de frappe
   (50, `approx`). Deux lettres ne suffisent jamais à deviner un nom. */
const RESERVES = new Set([...FORMES.keys()].flatMap(f => f.split(' ')).concat(JOURS, Object.keys(MOIS),
  ['demain', 'apres', 'aujourdhui', 'dans', 'prochain', 'prochaine', 'semaine', 'midi', 'jour', 'jours']));
function indexer(companies){
  return (companies || []).filter(c => c && c.name).map(c => ({
    c, mots: motsNom(c.name),
    gens: (c.contacts || []).map(t => ({ t, mots: motsNom(t.name) })).filter(x => x.mots.length)
  })).filter(x => x.mots.length);
}
function forceNom(W, N){
  const n = W.length;
  if (n > N.length) return 0;
  for (let k = 0; k < n - 1; k++) if (W[k] !== N[k]) return 0;
  const dernier = W[n - 1], cible = N[n - 1];
  if (dernier === cible) return n === N.length ? 100 : 90;
  return (dernier.length >= 3 && cible.startsWith(dernier)) ? 85 : 0;
}
function trouverPistes(toks, libre, index){
  /* id → le meilleur rapprochement par le NOM (`fN`, `places`) et par
     une PERSONNE (`fC`, `placesCt`) : « écrire à Claire chez Advens »
     dit les deux, et les deux comptent */
  const par = new Map();
  const noter = (x, r) => {
    let d = par.get(x.c.id);
    if (!d) par.set(x.c.id, d = { c: x.c, fN: 0, fC: 0, places: [], placesCt: [], ct: null });
    if (r.ct){
      if (r.force > d.fC){ d.fC = r.force; d.ct = r.ct; d.placesCt = r.places; }
    } else if (r.force > d.fN || (r.force === d.fN && r.places.length > d.places.length)){
      d.fN = r.force; d.places = r.places;
    }
  };
  for (let i = 0; i < toks.length; i++){
    if (!libre(i)) continue;
    for (let n = Math.min(4, toks.length - i); n >= 1; n--){
      const places = [];
      for (let k = i; k < i + n; k++) places.push(k);
      if (!places.every(libre)) continue;
      const W = places.map(k => toks[k].mot);
      const seul = n === 1 ? W[0] : '';
      const vide = seul && (VIDES.has(seul) || RESERVES.has(seul));
      for (const x of index){
        let f = forceNom(W, x.mots);
        /* un mot qui relie ou qui commande ne nomme une piste que s'il EST son nom */
        if (vide && f < 100) f = 0;
        if (!f && seul && !vide && seul.length >= 4){
          if (x.mots.slice(1).some(w => w === seul)) f = 70;
          else if (x.mots.slice(1).some(w => w.startsWith(seul))) f = 65;
        }
        if (f){ noter(x, { force: f, places }); continue; }
        if (!seul || vide) continue;
        /* une personne de la piste : son prénom ou son nom, en entier */
        const p = x.gens.find(g => g.mots.includes(seul) && seul.length >= 3)
               || x.gens.find(g => seul.length >= 4 && g.mots.some(w => w.startsWith(seul)));
        if (p){ noter(x, { force: 75, places, ct: p.t }); continue; }
        /* une faute de frappe : proposée, et seulement pour un vrai mot */
        const max = fautesPermises(seul);
        if (max && x.mots.some(w => w.length >= 4 && fautes(seul, w, max) <= max))
          noter(x, { force: 50, places });
      }
    }
  }
  return [...par.values()].map(d => ({ c: d.c, ct: d.ct, places: d.places, placesCt: d.placesCt,
      force: Math.max(d.fN, d.fC) + (d.fN && d.fC ? 5 : 0), approx: d.fN === 50 && !d.fC }))
    .sort((a, b) => (b.force - a.force)
      || ((a.c.closedReason ? 1 : 0) - (b.c.closedReason ? 1 : 0))
      || String(a.c.name).localeCompare(String(b.c.name), 'fr'));
}

/* ---------- où en est une piste, en trois mots ---------- */
export function etatCourt(c, today = todayISO()){
  if (!c) return '';
  if (c.closedReason) return (CLOSE_REASONS[c.closedReason] || {}).label.toLowerCase();
  if (c.nextAction){
    const n = ecartJours(c.nextAction, today);
    if (n > 0) return 'en retard de ' + n + ' jour' + (n > 1 ? 's' : '');
    return jourEnMots(c.nextAction, today);
  }
  const sil = silentPistes([c], today)[0];
  if (sil) return 'sans nouvelles depuis ' + sil.jours + ' j';
  return (STATUSES[c.status] || STATUSES.todo).label.toLowerCase();
}
/* à qui part un mail : la personne visée par l'action, sinon la
   première qu'on peut joindre — jamais une adresse devinée */
export function aQuiEcrire(c){
  const p = nextActionContact(c);
  if (p && p.email) return p;
  const avec = (c.contacts || []).filter(t => t.email);
  return avec.find(t => t.activatedAt || t.src !== 'promo') || avec[0] || null;
}
/* le prénom d'une personne — mais « Service RH » n'en a pas : un nom
   qui commence par un service se dit en entier */
const SERVICES = new Set(['service', 'services', 'direction', 'equipe', 'accueil', 'recrutement', 'rh', 'drh', 'dsi',
  'contact', 'pole', 'cellule', 'departement', 'relation', 'relations', 'bureau', 'secretariat', 'cabinet', 'agence']);
export const prenomDe = t => {
  const nom = t ? String(t.name || '').trim() : '';
  const premier = nom.split(/\s+/)[0] || '';
  return SERVICES.has(plier(premier)) ? nom : premier;
};

/* ---------- le geste, écrit en clair ----------
   `change` : le tap modifie une donnée (l'écran doit offrir « Annuler ») ;
   sinon il OUVRE quelque chose (le mail, une feuille). */
function gesteDe(verbe, r, o){
  const { c } = r;
  const { today, date, heure, texte, brutVerbe } = o;
  const ferme = !!c.closedReason;
  const base = { type: 'geste', verbe, id: c.id, approx: !!r.approx };
  /* la sous-ligne : la piste, puis ce qu'il faut savoir d'elle. Le nom
     ne s'y redit pas quand le titre le porte déjà (« Relancer Kiabi ») */
  const sousLigne = (g, ...xs) => ({ ...g,
    detail: [g.titre.includes(c.name) ? '' : c.name, ...xs].filter(Boolean).join(' · ') });
  const g = gesteNu(verbe, r, o, base, ferme);
  return g ? sousLigne(g, ...(g.infos || [])) : null;
}
function gesteNu(verbe, r, o, base, ferme){
  const { c } = r;
  const { today, date, heure, texte, brutVerbe } = o;
  const ou = (...infos) => infos.filter(Boolean);
  const quand = date ? jourEnMots(date, today) + (heure ? ' à ' + heureEnMots(heure) : '') : '';
  if (verbe === 'rouvrir')
    return ferme ? { ...base, action: 'rouvrir', change: true, icone: 'undo', bouton: 'Rouvrir',
      titre: 'Rouvrir', infos: ou(etatCourt(c, today)) } : null;
  /* une piste clôturée ne se relance pas, ne se planifie pas : elle se rouvre d'abord */
  if (ferme) return null;
  switch (verbe){
    case 'relancer': case 'ecrire': {
      const ct = r.ct && r.ct.email ? r.ct : aQuiEcrire(c);
      const qui = prenomDe(ct) || c.name;
      /* on ne relance pas qui n'a jamais reçu de mail : on lui écrit */
      const relance = verbe === 'relancer' && !aDemarrer(c);
      const mot = relance ? 'Relancer' : 'Écrire à';
      if (date) return { ...base, action: 'plan', change: true, icone: 'calendar', bouton: 'Planifier',
        date, texte: relance ? 'Relancer' + (ct ? ' ' + qui : '') : 'Écrire' + (ct ? ' à ' + qui : ''),
        ct: ct ? ct.id : '', titre: mot + ' ' + qui, infos: ou(quand) };
      return { ...base, action: 'mail', change: false, icone: 'mail', bouton: 'Écrire', ct: ct ? ct.id : '',
        titre: mot + ' ' + qui, infos: ou(etatCourt(c, today)) };
    }
    case 'appeler': {
      const ct = (r.ct && r.ct.phone) ? r.ct : (c.contacts || []).find(t => t.phone) || r.ct || null;
      const qui = prenomDe(ct) || c.name;
      if (date) return { ...base, action: 'plan', change: true, icone: 'calendar', bouton: 'Planifier', date,
        texte: 'Appeler ' + qui, ct: ct ? ct.id : '', titre: 'Appeler ' + qui, infos: ou(quand) };
      if (ct && ct.phone) return { ...base, action: 'tel', change: false, icone: 'phone', bouton: 'Appeler',
        ct: ct.id, tel: ct.phone, titre: 'Appeler ' + qui, infos: ou(ct.phone) };
      return { ...base, action: 'quand', change: false, icone: 'calendar', bouton: 'Planifier',
        texte: 'Appeler ' + qui, ct: ct ? ct.id : '', titre: 'Appeler ' + qui, infos: ou('choisir un jour') };
    }
    case 'entretien': {
      const t = 'Entretien' + (heure ? ' à ' + heureEnMots(heure) : '');
      /* un entretien, c'est qu'on t'a répondu : le statut suit */
      if (date) return { ...base, action: 'plan', change: true, icone: 'calendar', bouton: 'Planifier', date, heure,
        texte: t, statut: 'reply', titre: t, infos: ou(jourEnMots(date, today)) };
      return { ...base, action: 'quand', change: false, icone: 'calendar', bouton: 'Planifier',
        texte: t, statut: 'reply', titre: t, infos: ou('choisir un jour') };
    }
    case 'planifier': {
      const t = majuscule([brutVerbe, texte].filter(Boolean).join(' '));
      if (date) return { ...base, action: 'plan', change: true, icone: 'calendar', bouton: 'Planifier', date, heure,
        texte: t + (heure ? ' à ' + heureEnMots(heure) : ''), ct: r.ct ? r.ct.id : '',
        titre: t, infos: ou(quand) };
      return { ...base, action: 'quand', change: false, icone: 'calendar', bouton: 'Planifier',
        texte: t, ct: r.ct ? r.ct.id : '', titre: t, infos: ou('choisir un jour') };
    }
    case 'fait':
      return c.nextAction ? { ...base, action: 'fait', change: true, icone: 'check', bouton: 'Cocher',
        titre: 'Fait : ' + (c.nextActionText || 'l’action prévue'), infos: ou() } : null;
    case 'reporter':
      if (!c.nextAction) return null;
      return date
        ? { ...base, action: 'plan', change: true, icone: 'calendar', bouton: 'Reporter', date,
            texte: c.nextActionText, ct: c.nextActionCt || '', titre: 'Reporter à ' + jourEnMots(date, today),
            infos: ou(c.nextActionText) }
        : { ...base, action: 'reporter', change: false, icone: 'calendar', bouton: 'Reporter',
            titre: 'Reporter', infos: ou(c.nextActionText) };
    case 'reponse':
      return c.status === 'reply' ? null : { ...base, action: 'statut', statut: 'reply', change: true,
        icone: 'message-text', bouton: 'Noter', titre: 'Réponse reçue', infos: ou() };
    case 'refus':
      return { ...base, action: 'clore', raison: 'rejected', change: true, icone: 'archive', bouton: 'Clôturer',
        titre: CLOSE_REASONS.rejected.label, infos: ou() };
    case 'decroche':
      return { ...base, action: 'clore', raison: 'won', change: true, icone: 'check', bouton: 'Clôturer',
        titre: CLOSE_REASONS.won.label, infos: ou() };
    case 'ranger':
      return { ...base, action: 'clore', raison: 'dropped', change: true, icone: 'archive', bouton: 'Ranger',
        titre: 'Ranger', infos: ou(etatCourt(c, today)) };
    case 'note':
      return texte ? { ...base, action: 'note', change: true, icone: 'pencil', bouton: 'Noter', texte,
        titre: 'Noter « ' + texte + ' »', infos: ou() } : null;
    case 'demander':
      return { ...base, action: 'demander', change: false, icone: 'users', bouton: 'Demander',
        titre: 'Demander à mes amis', infos: ou() };
  }
  return null;
}

/* Le verbe tapé SEUL (« relancer ») : les pistes où il a un sens, trois
   au plus — celles qui le réclament d'abord. */
function candidatsSans(verbe, companies, today){
  const vivantes = (companies || []).filter(c => c && !c.closedReason && !c.demo);
  const parId = new Map(vivantes.map(c => [c.id, c]));
  const recentes = l => l.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  let l = [];
  switch (verbe){
    case 'relancer': {
      const dus = dueFollowups(vivantes, today).map(x => parId.get(x.id)).filter(Boolean)
        .filter(c => /relanc/.test(plier(c.nextActionText)));
      const muettes = silentPistes(vivantes, today).map(s => parId.get(s.id)).filter(Boolean);
      l = [...dus, ...muettes];
      break;
    }
    case 'fait': case 'reporter':
      l = vivantes.filter(c => c.nextAction).sort((a, b) => String(a.nextAction).localeCompare(String(b.nextAction)));
      break;
    case 'ecrire':
      l = vivantes.filter(c => aDemarrer(c) && aQuiEcrire(c));
      break;
    case 'entretien': case 'reponse': case 'refus': case 'decroche':
      /* celles qui ont répondu d'abord : c'est d'elles que vient un
         entretien, un oui ou un non */
      l = recentes(vivantes.filter(c => c.status === 'active' || c.status === 'reply'))
        .sort((a, b) => (b.status === 'reply') - (a.status === 'reply'));
      if (verbe === 'reponse') l = l.filter(c => c.status === 'active');
      break;
    case 'rouvrir':
      l = recentes((companies || []).filter(c => c && c.closedReason && !c.demo));
      break;
    default: l = [];
  }
  const vus = new Set();
  return l.filter(c => !vus.has(c.id) && vus.add(c.id)).slice(0, 3).map(c => ({ c, force: 0, places: [], approx: false }));
}

/* ---------- où aller ----------
   Les mots qui mènent quelque part. La phrase entière doit être l'un
   d'eux, ou son début (trois lettres au moins). */
export const ALLER = [
  { id: 'accueil',    titre: 'Aujourd’hui',         icone: 'home',      mots: ['accueil', 'a faire'] },
  { id: 'pistes',     titre: 'Mes pistes',          icone: 'briefcase', mots: ['pistes', 'mes pistes', 'liste', 'toutes mes pistes'] },
  { id: 'rangees',    titre: 'Pistes rangées',      icone: 'archive',   mots: ['rangees', 'pistes rangees', 'archives'] },
  { id: 'decouvrir',  titre: 'À découvrir',         icone: 'search',    mots: ['decouvrir', 'a decouvrir', 'annuaire'] },
  { id: 'prospecter', titre: 'Prospecter',          icone: 'mail',      mots: ['prospecter', 'prospection'] },
  { id: 'reseau',     titre: 'Réseau',              icone: 'users',     mots: ['reseau', 'groupes', 'mes groupes', 'messages', 'conversations'] },
  { id: 'amis',       titre: 'Mes amis',            icone: 'users',     mots: ['amis', 'mes amis'] },
  { id: 'qr',         titre: 'Mon QR',              icone: 'user',      mots: ['qr', 'mon qr', 'qr code', 'ajouter un ami'] },
  { id: 'donner',     titre: 'Donner des pistes',   icone: 'upload',    mots: ['donner', 'donner mes pistes', 'partager', 'partager mes pistes'] },
  { id: 'recevoir',   titre: 'Recevoir',            icone: 'inbox',     mots: ['recevoir', 'scanner', 'importer', 'coller'] },
  { id: 'moi',        titre: 'Moi',                 icone: 'user',      mots: ['moi'] },
  { id: 'profil',     titre: 'Mon profil',          icone: 'user',      mots: ['profil', 'mon profil', 'ma cible', 'cible', 'ma recherche'] },
  { id: 'modeles',    titre: 'Modèles d’emails',    icone: 'mail',      mots: ['modeles', 'modeles d emails', 'mes modeles'] },
  { id: 'cv',         titre: 'CV',                  icone: 'file',      mots: ['cv', 'mon cv'] },
  { id: 'lettres',    titre: 'Lettres',             icone: 'file',      mots: ['lettres', 'lettre', 'lettre de motivation'] },
  { id: 'copie',      titre: 'Télécharger ma copie', icone: 'download', mots: ['copie', 'ma copie', 'telecharger', 'telecharger ma copie', 'sauvegarde', 'sauvegarder', 'exporter'] },
  { id: 'reglages',   titre: 'Réglages',            icone: 'settings-2', mots: ['reglages', 'reglage', 'parametres', 'options'] },
  { id: 'theme',      titre: 'Thème',               icone: 'moon',      mots: ['theme', 'sombre', 'clair', 'mode sombre', 'mode clair'] },
  { id: 'aide',       titre: 'Aide et confidentialité', icone: 'info-box', mots: ['aide', 'confidentialite'] }
];
function allerVers(cle){
  if (cle.length < 2) return [];
  const exact = [], debut = [];
  for (const a of ALLER){
    if (a.mots.includes(cle)) exact.push(a);
    else if (cle.length >= 3 && a.mots.some(m => m.startsWith(cle))) debut.push(a);
  }
  return [...exact, ...debut].slice(0, 3).map(a => ({ type: 'aller', vers: a.id, titre: a.titre, icone: a.icone, detail: '' }));
}

/* ---------- ce qu'on a collé ----------
   Une adresse web, un mail, un numéro : la barre les reconnaît à leur
   forme. Le texte long (une signature, une copie, une invitation) est
   l'affaire de « Recevoir », qui sait déjà tout lire. */
const RE_LIEN = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#]\S*)?$/i;
const RE_MAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const RE_TEL = /^(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/;
/* « www.sopra-steria.com/carrieres » → « Sopra Steria » */
export function nomDepuisLien(u){
  const h = String(u || '').replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '').replace(/^www\./i, '');
  const parts = h.split('.');
  const coeur = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '';
  return coeur.split(/[-_]+/).filter(Boolean).map(majuscule).join(' ');
}

/* ---------- comprendre ----------
   `ctx` : { companies, profile, today, recherche } — `recherche` est le
   contexte de `requete.js` (les villes et les prénoms des pistes) ; il
   se construit ici s'il n'est pas fourni.
   Rend `{ q, lignes }` : ce que la barre propose, dans l'ordre. Chaque
   ligne a un `type` : geste · piste · ami · aller · chercher · decouvrir
   · lien · contact · preparer · ajouter. */
export const LIGNES_MAX = 7;
export function comprendre(q, ctx){
  ctx = ctx || {};
  const s = String(q == null ? '' : q).trim();
  const companies = ctx.companies || [];
  const today = ctx.today || todayISO();
  const lignes = [];
  if (!s) return { q: s, lignes };
  const toks = jetons(s);
  if (!toks.length) return { q: s, lignes };

  /* ----- ce qui se reconnaît à sa forme ----- */
  if (RE_MAIL.test(s) || RE_TEL.test(s)){
    const cle = plier(s).replace(/[\s.-]/g, '');
    const chez = companies.find(c => c && (c.contacts || []).some(t =>
      plier(t.email) === plier(s) || (t.phone && plier(t.phone).replace(/[\s.-]/g, '') === cle)));
    if (chez) lignes.push({ type: 'piste', id: chez.id, icone: 'briefcase', titre: chez.name, detail: etatCourt(chez, today) });
    else lignes.push({ type: 'contact', icone: 'user', valeur: s, titre: 'Ajouter ce contact', detail: s });
    return { q: s, lignes };
  }
  if (!/\s/.test(s) && RE_LIEN.test(s) && !/^\d/.test(s)){
    const nom = nomDepuisLien(s);
    /* le site d'une piste qu'on a déjà : on l'ouvre, on ne la double pas */
    const hote = u => plier(u).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');
    const deja = companies.find(c => c && c.website && hote(c.website) === hote(s))
      || (trouverPistes(jetons(nom), () => true, indexer(companies)).find(r => r.force >= 90) || {}).c;
    if (deja) lignes.push({ type: 'piste', id: deja.id, icone: 'briefcase', titre: deja.name, detail: 'déjà dans tes pistes' });
    else lignes.push({ type: 'lien', icone: 'plus', lien: s, nom,
      titre: 'Ajouter ' + (nom || 'cette entreprise'), detail: s.replace(/^https?:\/\//i, '') });
    return { q: s, lignes };
  }

  const index = indexer(companies);
  const pris = new Set();
  const libre = i => !pris.has(i);
  const verbeA = i => {
    for (let n = Math.min(VERBE_MAX, toks.length - i); n >= 1; n--){
      const id = FORMES.get(toks.slice(i, i + n).map(t => t.mot).join(' '));
      if (id) return { id, i, n };
    }
    return null;
  };
  /* ----- le verbe : il ouvre la phrase (règle 1). Une date dite
     d'abord ne le déloge pas : « demain, appeler Claire ». ----- */
  const dates0 = lireDate(toks, () => true, today).pris;
  const premierUtile = () => {
    let i = 0;
    while (i < toks.length && (VIDES.has(toks[i].mot) || dates0.has(i))) i++;
    return i;
  };
  let verbe = null;
  const i0 = premierUtile();
  if (i0 < toks.length) verbe = verbeA(i0);
  /* … sauf si la phrase EST le nom d'une piste (« Note Blanche ») */
  if (verbe && trouverPistes(toks, () => true, index).some(r => r.force === 100 && r.places.length === toks.length)) verbe = null;
  if (verbe) for (let k = verbe.i; k < verbe.i + verbe.n; k++) pris.add(k);
  let pistes = trouverPistes(toks, libre, index);
  /* … ou suit le nom de la piste (« Aztek entretien jeudi ») */
  if (!verbe && pistes.length && pistes[0].force >= 70){
    const tout = [...pistes[0].places, ...pistes[0].placesCt];
    let apres = Math.max(...tout) + 1;
    while (apres < toks.length && VIDES.has(toks[apres].mot)) apres++;
    const v = apres < toks.length ? verbeA(apres) : null;
    if (v && Math.min(...tout) === i0){
      verbe = v;
      for (let k = v.i; k < v.i + v.n; k++) pris.add(k);
      pistes = trouverPistes(toks, libre, index);
    }
  }
  /* la recherche, telle que « Mes pistes » la comprend */
  const rech = ctx.recherche || contexteRecherche(companies, today);
  const interp = interpreter(s, rech);
  /* « cyber Lille » est une recherche entière : un mot de métier qui
     n'est que le DÉBUT d'un mot d'un nom (« Orange Cyberdefense ») ne la
     devance pas — le mot entier, « cyberdefense », si */
  if (!verbe && interp.etiquettes.length && !interp.texte.length) pistes = pistes.filter(r => r.force >= 70);

  /* ----- ajouter : un nom, et rien d'autre ----- */
  const lignesAjout = nom => [
    { type: 'preparer', icone: 'sparkles', nom, titre: 'Prépare la page de « ' + nom + ' »', detail: 'dans l’annuaire des entreprises' },
    { type: 'ajouter', icone: 'plus', nom, titre: 'Ajouter « ' + nom + ' » à mes pistes', detail: '' }];
  if (verbe && verbe.id === 'ajouter'){
    const reste = toks.filter((t, i) => libre(i));
    while (reste.length && VIDES.has(reste[0].mot)) reste.shift();
    const nom = reste.length ? s.slice(reste[0].debut).trim() : '';
    const deja = nom && pistes.find(r => r.force === 100);
    if (deja) lignes.push({ type: 'piste', id: deja.c.id, icone: 'briefcase', titre: deja.c.name, detail: 'déjà dans tes pistes' });
    else if (nom) lignes.push(...lignesAjout(nom));
    else lignes.push({ type: 'ajouter', icone: 'plus', nom: '', titre: 'Ajouter une piste', detail: '' });
    return { q: s, lignes };
  }

  /* ----- un geste ----- */
  let inconnu = '';        /* un geste sur un nom qu'on n'a pas : il se propose à l'ajout */
  if (verbe){
    const brutVerbe = toks.slice(verbe.i, verbe.i + verbe.n).map(t => t.brut).join(' ').replace(/[,;:.!?]+$/, '');
    const avecDate = !['note', 'refus', 'decroche', 'ranger', 'rouvrir', 'reponse', 'fait', 'demander'].includes(verbe.id);
    /* ce qui reste une fois le verbe, la date et les mots qui relient
       retirés : s'il reste un mot et qu'aucune piste ne le porte, ce
       n'est pas « le verbe tout seul » — c'est un nom inconnu */
    const d0 = avecDate ? lireDate(toks, libre, today) : { pris: new Set() };
    const mots0 = toks.filter((t, i) => libre(i) && !d0.pris.has(i) && !VIDES.has(t.mot));
    let cibles = [];
    if (pistes.length) cibles = pistes.filter(r => r.force >= (pistes[0].force >= 85 ? 85 : 50)).slice(0, 3);
    else if (!mots0.length) cibles = candidatsSans(verbe.id, companies, today);
    else if (verbe.id !== 'note') inconnu = mots0.map(t => t.brut).join(' ').replace(/[,;:.!?]+$/, '');
    for (const r of cibles){
      const nomIci = r.places || [], gensIci = r.placesCt || [];
      const occupe = new Set([...pris, ...nomIci, ...(verbe.id === 'planifier' ? [] : gensIci)]);
      const lib = i => !occupe.has(i);
      const d = avecDate ? lireDate(toks, lib, today) : { date: '', heure: '', pris: new Set() };
      let texte = '';
      if (verbe.id === 'note'){
        /* la note : tout ce qui suit le verbe et la piste, tel quel */
        const dernier = Math.max(verbe.i + verbe.n - 1, ...nomIci, ...gensIci);
        const apres = toks.filter((t, i) => i > dernier);
        const avant = toks.filter((t, i) => lib(i) && i < Math.min(...nomIci, ...gensIci, toks.length));
        while (avant.length && VIDES.has(avant[avant.length - 1].mot)) avant.pop();
        const brut = apres.length ? s.slice(apres[0].debut)
                   : avant.length ? s.slice(avant[0].debut, avant[avant.length - 1].fin) : '';
        texte = brut.replace(/^[\s:;,.\-–—]+/, '').trim();
      } else {
        /* le texte : ce qui reste, tel qu'on l'a écrit (règle 3). Le mot
           qui reliait ce qu'on retire part avec lui : « chez » devant la
           piste, « à » devant l'heure, « le » devant le jour */
        const retire = i => !lib(i) || d.pris.has(i);
        const reste = toks.map((t, i) => ({ t, i })).filter(x => {
          if (retire(x.i)) return false;
          if (!VIDES.has(x.t.mot)) return true;
          let k = x.i + 1;
          while (k < toks.length && !retire(k) && VIDES.has(toks[k].mot)) k++;
          return !(k < toks.length && retire(k)) && k < toks.length;
        });
        /* la personne nommée s'écrit comme sur sa fiche (« Rappeler Claire ») */
        texte = reste.map(x => !gensIci.includes(x.i) ? x.t.brut : (x.i === gensIci[0] ? prenomDe(r.ct) : ''))
          .filter(Boolean).join(' ').replace(/[,;:.!?]+$/, '');
      }
      const g = gesteDe(verbe.id, r, { today, date: d.date, heure: d.heure, texte, brutVerbe });
      if (g) lignes.push(g);
    }
  }

  /* ----- ce qu'on a : les pistes, les amis, les écrans ----- */
  const dejaGeste = new Set(lignes.map(l => l.id));
  if (!verbe || !lignes.length){
    for (const r of pistes.filter(r => !r.approx || !pistes.some(x => !x.approx)).slice(0, 4)){
      if (dejaGeste.has(r.c.id)) continue;
      lignes.push({ type: 'piste', id: r.c.id, icone: 'briefcase', approx: !!r.approx, ct: r.ct ? r.ct.id : '',
        titre: r.c.name, detail: [r.ct ? r.ct.name : '', etatCourt(r.c, today), r.c.city].filter(Boolean).join(' · ') });
    }
  }
  const cle = toks.map(t => t.mot).join(' ');
  if (!verbe){
    const amis = ((ctx.profile && ctx.profile.amis) || []).filter(a => a && a.nom);
    for (const a of amis){
      const N = motsNom(a.nom);
      const tous = toks.every(t => t.mot.length >= 2 && N.some(w => w === t.mot || (t.mot.length >= 3 && w.startsWith(t.mot))));
      if (tous) lignes.push({ type: 'ami', id: a.id, icone: 'message-text', titre: a.nom, detail: 'ami' });
    }
    lignes.push(...allerVers(cle));
  }

  /* ----- chercher : dans mes pistes, puis dans l'annuaire ----- */
  const miennes = companies.filter(c => c && !c.demo);
  if (interp.etiquettes.length && !lignes.some(l => l.type === 'geste' && pistes.length)){
    const r = chercherPistes(miennes, { q: s, ctx: rech, interp });
    const label = interp.etiquettes.map(e => e.label).join(' · ');
    if (r.liste.length) lignes.push({ type: 'chercher', icone: 'search', q: s, n: r.liste.length,
      titre: label, detail: r.liste.length + ' piste' + (r.liste.length > 1 ? 's' : '') });
    const ouvre = interp.etiquettes.some(e => e.famille === 'metier' || e.famille === 'lieu' || e.famille === 'recherche');
    if (ouvre && !verbe) lignes.push({ type: 'decouvrir', icone: 'search', q: s,
      titre: 'Découvrir des entreprises', detail: label });
  } else if (!verbe && !interp.etiquettes.length && s.length >= 3 && !pistes.some(r => r.force >= 85)){
    /* le mot est DANS des fiches (une techno, une ville, une note) */
    const dedans = chercherPistes(miennes, { q: s, ctx: rech, interp }).liste
      .filter(c => !lignes.some(l => l.id === c.id));
    if (dedans.length) lignes.push({ type: 'chercher', icone: 'search', q: s, n: dedans.length,
      titre: 'Chercher « ' + s + ' »', detail: dedans.length + ' piste' + (dedans.length > 1 ? 's' : '') });
  }

  /* ----- ce qu'on n'a pas : toujours en dernier (règle 5). Un nom
     qu'on est en train de finir de taper (« tha » pour Thales), une
     personne, un écran : ce n'est pas une entreprise à préparer ----- */
  const fort = pistes.length ? pistes[0].force : 0;
  const connu = fort === 100 || fort === 85 || pistes.some(r => r.ct)
    || lignes.some(l => l.type === 'aller' || l.type === 'ami' || l.type === 'geste');
  const queTexte = !verbe && interp.texte.length && !interp.etiquettes.length;
  const nom = inconnu || (queTexte && !connu ? s : '');
  if (nom && nom.replace(/\s/g, '').length >= 3 && !lignes.some(l => l.type === 'geste')) lignes.push(...lignesAjout(nom));
  return { q: s, lignes: lignes.slice(0, LIGNES_MAX) };
}

/* ---------- la barre vide : ce qu'on peut y taper ----------
   « Proposé en pointillé » (§6) : trois phrases au plus, écrites avec
   les pistes de l'utilisateur, et qui ont TOUTES une réponse — jamais
   un exemple qui ne mènerait à rien. Sans piste, la barre propose de
   commencer. */
export function amorces(ctx){
  ctx = ctx || {};
  const today = ctx.today || todayISO();
  const vivantes = (ctx.companies || []).filter(c => c && !c.closedReason && !c.demo);
  const out = [];
  const mettre = q => { if (q && !out.includes(q) && comprendre(q, ctx).lignes.length) out.push(q); };
  if (!vivantes.length) return out;
  const rech = ctx.recherche || contexteRecherche(ctx.companies || [], today);
  const p = propositions(ctx.companies || [], ctx.profile, rech, 1)[0];
  if (p) mettre(p.q);
  const muette = silentPistes(vivantes, today)[0];
  const due = vivantes.filter(c => c.nextAction && /relanc/.test(plier(c.nextActionText)))
    .sort((a, b) => String(a.nextAction).localeCompare(String(b.nextAction)))[0];
  const aRelancer = due || (muette && vivantes.find(c => c.id === muette.id));
  if (aRelancer) mettre('relancer ' + aRelancer.name);
  const engagee = vivantes.find(c => (c.status === 'active' || c.status === 'reply') && (!aRelancer || c.id !== aRelancer.id));
  if (engagee) mettre('entretien ' + engagee.name + ' jeudi 14h');
  if (out.length < 3) mettre('donner mes pistes');
  return out.slice(0, 3);
}
