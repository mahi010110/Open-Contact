/* ============================================================
   OpenContact — moteur · ton parcours, en un fichier (lot R9-a)
   (docs/propositions/R9-tous-les-metiers.md)

   « Mon parcours » ne sortait pas de l'app : pour un CV, une page
   LinkedIn, un éditeur de CV, on le retapait à la main. Il part
   maintenant en JSON Resume (jsonresume.org, schéma v1.0.0), le format
   ouvert de CV le plus repris — Reactive Resume l'importe tel quel.

   CE QUI PART, ET RIEN D'AUTRE : ce que tu as écrit dans ton profil —
   ton nom, ton e-mail, ton téléphone, ta ville, ton lien LinkedIn ou ton
   portfolio, ta formation, ton école — et ton parcours (`parcoursDe` :
   ce que tu as saisi, plus les pistes où tu as déclaré toi-même « J'y
   suis passé »). Jamais une piste, une note, un contact, un ami, l'état
   d'une candidature. La feuille d'export montre ces lignes avant le
   geste (`lignesCv`), comme « Mon QR » montre ce qu'il donne.

   Un champ vide n'existe pas dans le fichier : un CV ne porte pas de
   case vide. Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */
import { PARCOURS, parcoursDe, periodeParcours } from './parcours.js';
import { emailPlausible } from './model.js';

export const SCHEMA_CV = 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json';

/* LE TYPE DE DIPLÔME, en tête de la formation : « BTS SIO SISR » se range
   en `studyType` « BTS » et `area` « SIO SISR », comme un éditeur de CV
   l'attend. Une formation qui ne commence par aucun d'eux reste entière,
   en `area`. Le plus long d'abord : « Licence pro » avant « Licence ». */
export const DIPLOMES = ['Licence professionnelle', 'Licence pro', 'Bac pro', 'Bac professionnel', 'Titre pro',
  'Titre professionnel', 'Mastère', 'Master', 'Licence', 'Bachelor', 'BTS', 'BUT', 'DUT', 'CAP', 'BEP',
  'DEUST', 'MBA', 'BMA', 'DN MADE', 'Diplôme d’ingénieur', "Diplôme d'ingénieur"];
const plie = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function diplomeDe(formation){
  const f = String(formation || '').replace(/\s+/g, ' ').trim();
  if (!f) return { studyType: '', area: '' };
  const pf = plie(f);
  for (const d of DIPLOMES){
    const pd = plie(d);
    if (pf === pd || pf.startsWith(pd + ' ')) return { studyType: d, area: f.slice(d.length).trim() };
  }
  return { studyType: '', area: f };
}

const URL_OK = s => /^https?:\/\/[^\s]+\.[^\s]+$/i.test(String(s || '').trim());
const sansVide = o => Object.fromEntries(Object.entries(o).filter(([, v]) =>
  v !== '' && v != null && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)));

/* Le CV, en objet JSON Resume. `now` (ms) date le fichier. */
export function cvDe(profile, companies, now = Date.now()){
  const p = profile || {};
  const nom = String(p.name || '').trim();
  const email = emailPlausible(p.email) ? String(p.email).trim() : '';
  const lien = URL_OK(p.portfolio) ? String(p.portfolio).trim() : '';
  const linkedin = /(^|\.)linkedin\.com\//i.test(lien.replace(/^https?:\/\//i, ''));
  const basics = sansVide({
    name: nom,
    email,
    phone: String(p.phone || '').trim(),
    url: lien && !linkedin ? lien : '',
    location: sansVide({ city: String(p.ville || '').trim() }),
    profiles: linkedin ? [{ network: 'LinkedIn', url: lien }] : []
  });
  const { studyType, area } = diplomeDe(p.formation);
  const ecole = String(p.ecole || '').trim();
  const education = (studyType || area || ecole) ? [sansVide({ institution: ecole, studyType, area })] : [];
  const work = parcoursDe(p, companies).map(e => sansVide({
    name: e.entreprise,
    position: PARCOURS[e.quoi] ? PARCOURS[e.quoi].label : '',
    startDate: e.debut,
    endDate: e.debut ? e.fin : ''          /* le schéma veut un début avant une fin */
  }));
  return sansVide({
    $schema: SCHEMA_CV,
    basics,
    work,
    education,
    meta: { version: 'v1.0.0', lastModified: new Date(now).toISOString().slice(0, 19) }
  });
}

/* CE QUE LA FEUILLE MONTRE AVANT LE GESTE : les lignes du fichier, dans
   l'ordre où un CV les lit — toi, ta formation, ton parcours. Le texte
   de chaque ligne vient de l'objet même qui part : rien ne peut être
   montré qui ne parte pas, ni partir sans être montré. */
export function lignesCv(cv){
  const b = (cv && cv.basics) || {};
  const out = [];
  if (b.name) out.push({ sorte: 'nom', texte: b.name });
  const coord = [b.email, b.phone, b.location && b.location.city].filter(Boolean);
  if (coord.length) out.push({ sorte: 'coord', texte: coord.join(' · ') });
  const lien = b.url || (b.profiles && b.profiles[0] && b.profiles[0].url);
  if (lien) out.push({ sorte: 'lien', texte: lien });
  for (const e of (cv && cv.education) || [])
    out.push({ sorte: 'formation', texte: [[e.studyType, e.area].filter(Boolean).join(' '), e.institution].filter(Boolean).join(' · ') });
  for (const w of (cv && cv.work) || []){
    const periode = periodeParcours({ debut: w.startDate || '', fin: w.endDate || '' });
    out.push({ sorte: 'experience', texte: w.name, sous: [w.position, periode].filter(Boolean).join(' · ') });
  }
  return out;
}

export const nomFichierCv = jour => `opencontact-parcours-${jour}.json`;
export const texteCv = cv => JSON.stringify(cv, null, 2) + '\n';
