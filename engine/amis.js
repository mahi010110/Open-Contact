/* ============================================================
   OpenContact — moteur · les amis (docs/reseau.md, lot 2)

   Un ami est une personne dont tu as le PROFIL : elle te l'a donné
   elle-même, d'un QR en face à face ou d'un texte copié. Le profil
   donné tient en trois choses — un identifiant, le nom, le parcours —
   et rien d'autre : ni adresse, ni formation, ni pistes, ni suivi. Tu
   peux déjà joindre ton ami ; ce que tu ne savais pas, c'est où il est
   passé. C'est ça qui sert : « Karim y est en alternance » sur ta piste
   Aztek (~40 % d'entretiens portés contre ~3 % à froid, §8).

   QUATRE RÈGLES, tenues par tests.js et e2e-amis.mjs :
   1. Un profil ne va que chez ceux à qui son propriétaire le DONNE. Il
      ne se repartage jamais : le profil donné n'emporte que le tien,
      jamais ceux de tes amis.
   2. Les amis vivent dans TON profil : seule la sync entre TES appareils
      et ta copie les transportent, comme le reste du profil. Aucun
      partage de pistes ne les fait sortir.
   3. Le nom d'une entreprise se reconnaît sous ses formes juridiques
      (« Aztek », « AZTEK SAS », « Aztek S.A.S. ») et par son SIREN.
      Mieux vaut ne rien dire que dire faux : deux noms différents ne
      se rapprochent jamais (pas de ressemblance approximative).
   4. Fonctions pures : rien ici ne lit l'écran ni le réseau.
   ============================================================ */
import { parcoursDe, PARCOURS } from './parcours.js';

export const AMIS_MAX = 200;
export const AMI_PARCOURS_MAX = 20;
const MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;
const ID_AMI = /^[A-Za-z0-9_-]{16,43}$/;
/* la clé publique de sa boîte aux lettres (lot 3, engine/boite.js) :
   un point P-256 en base64url. Un profil donné avant la 6.55 n'en a
   pas — on ne peut pas lui écrire, c'est tout. */
const CLE_BOITE = /^[A-Za-z0-9_-]{86,88}$/;

/* L'identifiant qu'un ami garde de toi : 128 bits tirés au hasard, une
   fois. Il ne dit rien de toi ; il sert à reconnaître ton profil quand
   tu le redonnes à jour (une ligne remplacée, jamais deux). */
export function nouvelIdAmi(){
  const u = crypto.getRandomValues(new Uint8Array(16));
  let s = '';
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const idAmiValide = v => typeof v === 'string' && ID_AMI.test(v);

/* ---------- le nom d'une entreprise, sans sa forme juridique ----------
   « AZTEK SAS » et « Aztek » sont la même entreprise ; « Air France »
   n'est pas « Air ». On ne retire donc que des formes juridiques et le
   mot « groupe », jamais un mot qui pourrait être le nom. */
const FORMES = new Set(['sas', 'sasu', 'sarl', 'sa', 'eurl', 'snc', 'sci', 'scop', 'scic', 'sca',
  'gie', 'selarl', 'groupe', 'group', 'ltd', 'gmbh', 'inc']);
export function cleEntreprise(nom){
  const mots = String(nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const gardes = mots.filter(m => !FORMES.has(m));
  return (gardes.length ? gardes : mots).join('');
}
const sirenOk = s => /^\d{9}$/.test(String(s || ''));
export function memeEntreprise(a, b){
  if (!a || !b) return false;
  if (sirenOk(a.siren) && sirenOk(b.siren)) return a.siren === b.siren;
  /* une piste (`name`), une expérience (`entreprise`), une lettre (`nom`) */
  const ka = cleEntreprise(a.name ?? a.entreprise ?? a.nom), kb = cleEntreprise(b.name ?? b.entreprise ?? b.nom);
  return !!ka && ka === kb;
}

/* ---------- le profil qu'on DONNE ----------
   Ton parcours entier (saisi + déduit de tes « J'y suis passé »), avec
   le SIREN de la piste quand elle en a un — il est public, et c'est lui
   qui reconnaît l'entreprise chez ton ami sous un autre nom. Rien
   d'autre ne part : ni l'identifiant de la piste, ni ton suivi. */
export function profilDonne(profile, companies){
  const p = profile || {};
  const parSiren = new Map((companies || []).filter(c => c && sirenOk(c.siren)).map(c => [c.id, c.siren]));
  const parcours = parcoursDe(p, companies).slice(0, AMI_PARCOURS_MAX).map(e => {
    const x = { entreprise: e.entreprise, quoi: e.quoi, debut: e.debut || '', fin: e.fin || '' };
    const s = e.pisteId && parSiren.get(e.pisteId);
    if (s) x.siren = s;
    return x;
  });
  const d = { v: 1, kind: 'ami', id: p.amiId, nom: String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 80),
           parcours };
  /* la clé où m'écrire (lot 3) — publique par nature, elle ne sert qu'à
     sceller une lettre que moi seul pourrai ouvrir */
  if (p.boite && CLE_BOITE.test(String(p.boite.pub || ''))) d.cle = p.boite.pub;
  return d;
}

/* ---------- ce qu'on reçoit (un QR, un texte : n'importe qui a pu
   le fabriquer) — remis aux invariants, ou refusé ---------- */
export function normalizeAmi(x){
  if (!x || typeof x !== 'object') return null;
  if (!idAmiValide(x.id)) return null;
  const nom = String(x.nom || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!nom) return null;
  const parcours = [];
  for (const e of Array.isArray(x.parcours) ? x.parcours : []){
    if (!e || typeof e !== 'object' || !PARCOURS[e.quoi]) continue;
    const entreprise = String(e.entreprise || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!entreprise) continue;
    const debut = MOIS.test(e.debut) ? e.debut : '';
    let fin = MOIS.test(e.fin) ? e.fin : '';
    if (debut && fin && fin < debut) fin = '';
    const y = { entreprise, quoi: e.quoi, debut, fin };
    if (sirenOk(e.siren)) y.siren = String(e.siren);
    parcours.push(y);
    if (parcours.length >= AMI_PARCOURS_MAX) break;
  }
  const out = { id: x.id, nom, parcours };
  if (CLE_BOITE.test(String(x.cle || ''))) out.cle = x.cle;
  /* `recu` : le jour où il est arrivé chez toi — rien de plus */
  const r = Number(x.recu);
  if (Number.isFinite(r) && r > 0) out.recu = r;
  return out;
}
export function normalizeAmis(list){
  if (!Array.isArray(list)) return [];
  const vus = new Map();
  for (const x of list){
    const a = normalizeAmi(x);
    if (!a) continue;
    const deja = vus.get(a.id);
    if (!deja || (a.recu || 0) >= (deja.recu || 0)) vus.set(a.id, a);
  }
  return [...vus.values()].slice(-AMIS_MAX);
}

/* ---------- ajouter, mettre à jour, retirer ----------
   Le profil d'un ami est À LUI : sa version la plus récente remplace la
   précédente (même identifiant). On ne s'ajoute pas soi-même. */
const memeContenu = (a, b) => a.nom === b.nom && (a.cle || '') === (b.cle || '')
  && JSON.stringify(a.parcours) === JSON.stringify(b.parcours);
export function statutAmi(amis, ami, monId){
  if (!ami) return 'invalide';
  if (monId && ami.id === monId) return 'moi';
  const deja = (amis || []).find(a => a.id === ami.id);
  if (!deja) return 'nouveau';
  return memeContenu(deja, ami) ? 'identique' : 'maj';
}
export function ajouterAmi(amis, ami, quand = Date.now()){
  const a = normalizeAmi({ ...ami, recu: quand });
  if (!a) return normalizeAmis(amis);
  const reste = (amis || []).filter(x => x && x.id !== a.id);
  return normalizeAmis([...reste, a]);
}
export const retirerAmi = (amis, id) => (amis || []).filter(a => a && a.id !== id);
export const prenomAmi = a => String((a && a.nom) || '').trim().split(/\s+/)[0] || '';

/* ---------- ce que dit une expérience ----------
   En cours si elle a commencé et ne s'est pas finie (ou finit plus
   tard) ; sans dates, on ne sait pas — on dit le passé, qui reste vrai. */
const DIT = {
  alternance: { present: 'y est en alternance', passe: 'y a été en alternance',
                tuPresent: 'y es en alternance', tuPasse: 'y as été en alternance', force: 4 },
  emploi:     { present: 'y travaille',         passe: 'y a travaillé',
                tuPresent: 'y travailles',      tuPasse: 'y as travaillé',         force: 4 },
  stage:      { present: 'y est en stage',      passe: 'y a fait son stage',
                tuPresent: 'y es en stage',     tuPasse: 'y as fait ton stage',    force: 3 }
};
const moisDe = today => String(today || '').slice(0, 7);
export function enCours(e, today){
  if (!e || !e.debut) return false;
  return !e.fin || e.fin >= moisDe(today);
}
/* `poids` sur l'échelle de VECU (alternance 4 · stage 3 · entretien 2 ·
   connaît 1) : quelqu'un qui y est MAINTENANT passe devant tout */
export function direExperience(e, today){
  const d = DIT[e && e.quoi];
  if (!d) return null;
  const maintenant = enCours(e, today);
  return { court: maintenant ? d.present : d.passe, tu: maintenant ? d.tuPresent : d.tuPasse,
           poids: d.force + (maintenant ? 4 : 0), enCours: maintenant };
}

/* ---------- qui, parmi tes amis, est passé par CETTE piste ----------
   Pour chaque piste : les amis dont le parcours la nomme, chacun par
   son expérience la plus forte, la plus forte d'abord.
   Un INDEX d'abord (SIREN, nom sans forme juridique), puis une lecture
   par piste : cinq cents pistes et deux cents amis ne doivent pas faire
   deux millions de comparaisons à chaque rendu. */
export function portesAmis(companies, amis, today){
  const out = new Map();
  if (!amis || !amis.length) return out;
  const parSiren = new Map(), parCle = new Map();
  const ranger = (m, k, v) => { if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const a of amis)
    for (const e of a.parcours || []){
      const v = { a, e };
      if (sirenOk(e.siren)) ranger(parSiren, e.siren, v);
      ranger(parCle, cleEntreprise(e.entreprise), v);
    }
  for (const c of companies || []){
    if (!c || !c.name) continue;
    const cands = new Set([...(sirenOk(c.siren) && parSiren.get(c.siren)) || [],
                           ...(parCle.get(cleEntreprise(c.name)) || [])]);
    if (!cands.size) continue;
    const parAmi = new Map();
    for (const v of cands){
      if (!memeEntreprise(c, v.e)) continue;          /* deux SIREN connus et différents : pas la même */
      const d = direExperience(v.e, today);
      if (!d) continue;
      const deja = parAmi.get(v.a.id);
      if (!deja || d.poids > deja.poids)
        parAmi.set(v.a.id, { amiId: v.a.id, prenom: prenomAmi(v.a), nom: v.a.nom, quoi: v.e.quoi, ...d });
    }
    if (parAmi.size) out.set(c.id, [...parAmi.values()]
      .sort((x, y) => (y.poids - x.poids) || x.prenom.localeCompare(y.prenom, 'fr')));
  }
  return out;
}

/* ---------- l'onglet « Amis » (docs/reseau.md, lot 4) ----------
   Un ami se lit comme une piste : une ligne, et ce qu'elle t'APPORTE.
   Des onglets voisins doivent montrer des choses de même nature (NN/g) :
   « Mes pistes » et « À découvrir » montrent des entreprises, donc la
   ligne d'un ami dit les entreprises qu'il t'ouvre — la plus utile pour
   TA recherche d'abord. */
const plier = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[‘’‛`]/g, "'").toLowerCase();

export function ceQuOuvre(ami, companies, today){
  const ouvertes = (companies || []).filter(c => c && c.name && !c.closedReason);
  const lignes = [];
  for (const e of (ami && ami.parcours) || []){
    const d = direExperience(e, today);
    const piste = ouvertes.find(c => memeEntreprise(c, e)) || null;
    lignes.push({ entreprise: e.entreprise, quoi: e.quoi, debut: e.debut || '',
                  enCours: !!(d && d.enCours), poids: d ? d.poids : 0, pisteId: piste ? piste.id : null });
  }
  /* dans tes pistes, puis où il est MAINTENANT, puis le plus fort, puis
     le plus récent ; une entreprise ne se dit qu'une fois */
  lignes.sort((a, b) => (!!b.pisteId - !!a.pisteId) || (b.enCours - a.enCours) || (b.poids - a.poids)
    || String(b.debut).localeCompare(String(a.debut)));
  const vu = new Set();
  const uniques = lignes.filter(l => { const k = cleEntreprise(l.entreprise); if (!k || vu.has(k)) return false; vu.add(k); return true; });
  return { lignes: uniques, pistes: new Set(uniques.filter(l => l.pisteId).map(l => l.pisteId)).size,
           enCours: uniques.some(l => l.enCours) };
}

/* les trois tris : « Pour toi » sert la recherche (qui porte le plus de
   tes pistes ouvertes, puis qui y est maintenant, puis qui t'ouvre le
   plus d'entreprises) ; « Récents » et « A → Z » sont ceux de LinkedIn */
export const TRIS_AMIS = { pour: 'Pour toi', recent: 'Récents', az: 'A → Z' };
export const TRI_AMIS_DEFAUT = 'pour';
const SENS_NATUREL = { pour: 'desc', recent: 'desc', az: 'asc' };
export function classerAmis(amis, companies, today, tri = TRI_AMIS_DEFAUT, sens = ''){
  const l = (amis || []).map(a => ({ a, o: ceQuOuvre(a, companies, today) }));
  const nom = (x, y) => x.a.nom.localeCompare(y.a.nom, 'fr');
  const cmp = {
    pour: (x, y) => (y.o.pistes - x.o.pistes) || (y.o.enCours - x.o.enCours)
      || (y.o.lignes.length - x.o.lignes.length) || nom(x, y),
    recent: (x, y) => ((y.a.recu || 0) - (x.a.recu || 0)) || nom(x, y),
    az: nom
  }[tri] || null;
  if (!cmp) return classerAmis(amis, companies, today, TRI_AMIS_DEFAUT);
  l.sort(cmp);
  /* re-taper le critère inverse SON sens (ui/sort.js) */
  if (sens && sens !== SENS_NATUREL[tri]) l.reverse();
  return l;
}

/* chercher parmi ses amis : le nom, et les entreprises où ils sont
   passés — « Thales » trouve Karim. Chaque mot se cherche pour lui-même,
   accents pliés, comme la barre (engine/filter.js) ; les petits mots de
   liaison ne cherchent rien. */
const LIAISON = new Set(['a', 'au', 'aux', 'chez', 'de', 'des', 'du', 'en', 'et', 'la', 'le', 'les', 'l', 'd', 'un', 'une', 'pour', 'qui']);
export function chercherAmis(classes, q){
  const mots = plier(q).split(/[^a-z0-9]+/).filter(m => m && !LIAISON.has(m));
  if (!mots.length) return classes;
  return classes.filter(({ a }) => {
    const tout = ' ' + plier([a.nom, ...(a.parcours || []).flatMap(e => [e.entreprise, e.quoi])].join(' '))
      .replace(/[^a-z0-9]+/g, ' ') + ' ';
    return mots.every(m => tout.includes(' ' + m));
  });
}
