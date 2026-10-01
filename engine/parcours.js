/* ============================================================
   OpenContact — moteur · « Mon parcours » (docs/reseau.md, lot 1)

   Ce que tu as fait avant ou maintenant : un stage, une alternance, un
   emploi — l'entreprise et les dates. Il vit dans le profil, donc il ne
   quitte jamais l'appareil (seule la sync entre TES appareils le porte,
   comme tout le profil). Il ne sort dans aucun partage.

   UNE DONNÉE QUI PEUT SE DÉDUIRE NE SE SAISIT PAS (§8, règle 2). Chaque
   piste où tu as déclaré toi-même « J'y suis passé » — stage ou
   alternance, sans prénom, donc la tienne — en fait déjà partie. Elle
   n'est pas recopiée : elle se LIT dans tes pistes à chaque fois, et
   disparaît du parcours si tu changes la déclaration. Ce que tu saisis
   toi-même (une entreprise que tu ne suis pas, des dates) s'ajoute ; une
   ligne saisie pour une piste prend la place de sa ligne déduite.

   Ce qu'il sert dès ce lot : une ligne du mail de candidature,
   « Expérience : stage chez Sopra Steria (2025) » — l'expérience en
   entreprise est ce qu'un recruteur cherche d'abord chez un étudiant,
   et elle était absente de tous les mails.
   ============================================================ */
import { normName, uid } from './utils.js';

export const PARCOURS = {
  stage:      { label: 'Stage' },
  alternance: { label: 'Alternance' },
  emploi:     { label: 'Emploi' }
};
export const PARCOURS_MAX = 20;
const MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;
const ID_OK = /^[\w:-]{1,64}$/;

/* remet une liste (chargée, importée, synchronisée) aux invariants —
   elle arrive aussi d'un autre appareil, donc de n'importe où */
export function normalizeParcours(arr){
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const x of arr){
    if (!x || typeof x !== 'object') continue;
    const entreprise = String(x.entreprise || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!entreprise || !PARCOURS[x.quoi]) continue;
    const debut = MOIS.test(x.debut) ? x.debut : '';
    let fin = MOIS.test(x.fin) ? x.fin : '';
    if (debut && fin && fin < debut) fin = '';       /* une fin avant le début ne dit rien de vrai */
    const e = { id: ID_OK.test(String(x.id || '')) ? String(x.id) : uid(), entreprise, quoi: x.quoi, debut, fin };
    if (x.pisteId && ID_OK.test(String(x.pisteId))) e.pisteId = String(x.pisteId);
    out.push(e);
    if (out.length >= PARCOURS_MAX) break;
  }
  return out;
}

const enCours = e => !!(e.debut && !e.fin);
/* le plus récent d'abord : ce qui est en cours, puis par date de fin (ou
   de début), puis ce qui n'a pas de date */
const cle = e => e.fin || e.debut || '';
function trier(l){
  return l.slice().sort((a, b) => (enCours(b) - enCours(a)) || cle(b).localeCompare(cle(a)));
}

/* le parcours entier : ce que tu as saisi, plus ce que tes pistes disent */
export function parcoursDe(profile, companies){
  const saisis = normalizeParcours(profile && profile.parcours);
  const lies = new Set(saisis.map(e => e.pisteId).filter(Boolean));
  const noms = new Set(saisis.map(e => normName(e.entreprise)));
  const deduits = [];
  for (const c of companies || []){
    /* « J'y suis passé » SANS prénom : c'est ta déclaration. Avec un
       prénom, c'est celle d'un camarade — son parcours, pas le tien. */
    if (!c || c.vecuQui || (c.vecu !== 'stage' && c.vecu !== 'alternance')) continue;
    if (lies.has(c.id) || noms.has(normName(c.name))) continue;
    deduits.push({ id: 'piste:' + c.id, entreprise: c.name, quoi: c.vecu, debut: '', fin: '',
                   pisteId: c.id, deduit: true });
  }
  return trier([...saisis, ...deduits]);
}

/* « 2025 », « 2024-2025 », « depuis 2025 », ou rien */
const an = m => m ? m.slice(0, 4) : '';
export function periodeParcours(e){
  const d = an(e && e.debut), f = an(e && e.fin);
  if (d && !f) return 'depuis ' + d;
  if (d && f) return d === f ? d : d + '-' + f;
  return f;
}

/* La ligne du mail : les deux expériences les plus récentes. Au-delà, la
   ligne cesse d'être lue — le CV dit le reste. */
export function phraseParcours(list, max = 2){
  return (list || []).slice(0, max).map(e => {
    const p = periodeParcours(e);
    return `${e.quoi} chez ${e.entreprise}${p ? ` (${p})` : ''}`;
  }).join(', ');
}
