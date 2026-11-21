/* ============================================================
   OpenContact — moteur · une offre collée
   (docs/brief-refonte.md, lot 6 : « le poste, un établi »)

   On copie une offre sur un site d'offres, on la colle dans l'app : elle
   en fait une piste. L'app y lit l'entreprise (qui va dans la barre de
   Trouver), le poste, le contrat, la durée, le début, le rythme, la date
   limite, les missions et la personne à qui écrire.

   UNE TABLE, PAS UNE IA. Chaque champ a sa forme ; ce qui ne se lit pas
   sûrement ne s'invente pas — un champ absent reste absent, et le texte
   entier est gardé avec la piste. Rien ne part : tout se lit ici.

   La piste garde l'offre dans `offre` (CONTRAT.md §3) : privée comme le
   suivi, elle ne part jamais dans un partage. Le contact lu, lui, rejoint
   les contacts de la piste.
   Fonctions pures, aucun accès au DOM.
   ============================================================ */
/* model.js importe ce module : la date se lit ici, sans lui */
const isoDay = v => { const m = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(String(v || '')); return m ? m[1] : ''; };

const plat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const MOIS = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12 };
const MOIS_RE = 'janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre';
export const OFFRE_TEXTE_MAX = 8000;
export const MISSIONS_MAX = 3;
const pad = n => String(n).padStart(2, '0');
const coupe = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

/* ce qui fait d'un texte une offre : assez long, plusieurs lignes, et un
   mot qu'on ne trouve que dans une offre */
export function estOffre(texte){
  const t = String(texte || '');
  const lignes = t.split(/\r?\n/).filter(l => l.trim());
  return t.trim().length >= 120 && lignes.length >= 3
    && /\b(alternance|apprentissage|stage|stagiaire|cdi|cdd|missions?|profil recherche|candidatures?|poste)\b/.test(plat(t));
}

/* une date limite : « avant le 15 décembre 2026 », « jusqu'au 3 mars »,
   « date limite : 12/01/2027 ». Sans année, la prochaine à venir. */
function dateLimite(t, today){
  const p = plat(t);
  const declic = "(?:avant le|jusqu'au|jusqu’au|au plus tard le|date limite(?: de candidature)?\\s*:?|candidatures? jusqu'au|candidatures? jusqu’au)";
  const m = p.match(new RegExp(declic + '\\s+(\\d{1,2})(?:er)?\\s+(' + MOIS_RE + ')(?:\\s+(\\d{4}))?'));
  const n = !m && p.match(new RegExp(declic + '\\s+(\\d{1,2})[/.](\\d{1,2})[/.](\\d{4})'));
  let j, mo, a;
  if (m){ j = +m[1]; mo = MOIS[m[2]]; a = m[3] ? +m[3] : 0; }
  else if (n){ j = +n[1]; mo = +n[2]; a = +n[3]; }
  else return '';
  if (!(j >= 1 && j <= 31 && mo >= 1 && mo <= 12)) return '';
  const auj = String(today || '');
  if (!a){
    a = +auj.slice(0, 4) || new Date().getFullYear();
    if (auj && `${a}-${pad(mo)}-${pad(j)}` < auj) a++;
  }
  return isoDay(`${a}-${pad(mo)}-${pad(j)}`);
}

/* le poste : la première ligne, sans « (H/F) » ni le contrat qui la préfixe */
function posteDe(l0){
  const p = String(l0 || '')
    .replace(/\s*\((?:h\s*\/\s*f|f\s*\/\s*h)\)|\s+(?:h\s*\/\s*f|f\s*\/\s*h)\b/ig, '')
    .replace(/\s+chez\s+.+$/i, '')
    .replace(/^(?:alternance|apprentissage|stage|cdi|cdd)\s*[–—:|-]\s*/i, '')
    .replace(/^(?:alternance|apprentissage|stage|cdi|cdd)\s+(?=\S)/i, '')
    .replace(/\s*[–—|-]\s*(?:alternance|apprentissage|stage|cdi|cdd)\s*$/i, '')
    .replace(/\s*\((?:alternance|apprentissage|stage|cdi|cdd)\)\s*$/i, '');
  return coupe(p.charAt(0).toUpperCase() + p.slice(1), 120);
}

/* L'ENTREPRISE, dans cet ordre, et rien d'autre :
   ① une piste qu'on a déjà, nommée dans le texte ;
   ② une ligne qui la nomme (« Entreprise : … ») ;
   ③ « chez … » dans le titre ;
   ④ la ligne sous le titre, quand elle est courte et ne dit rien d'autre
     (« Réseaux et Systèmes du Nord · Lille » : ce qui précède la ville). */
const PAS_UN_NOM = /^(contrat|lieu|localisation|rythme|duree|debut|date|salaire|remuneration|description|missions?|profil|teletravail|type|niveau|experience|publie|postuler|candidat|alternance|apprentissage|stage|cdi|cdd|temps)\b/;
function entrepriseDe(lignes, t, noms){
  const p = ' ' + plat(t).replace(/[^a-z0-9]+/g, ' ') + ' ';
  const connue = (noms || []).filter(n => plat(n).replace(/[^a-z0-9]+/g, ' ').trim().length > 2)
    .sort((a, b) => b.length - a.length)
    .find(n => p.includes(' ' + plat(n).replace(/[^a-z0-9]+/g, ' ').trim() + ' '));
  if (connue) return connue;
  for (const l of lignes){
    const m = l.match(/^(?:entreprise|soci[ée]t[ée]|employeur|recruteur|structure)\s*:\s*(.{2,80})$/i);
    if (m) return coupe(m[1], 80);
  }
  const chez = lignes[0] && lignes[0].match(/\bchez\s+([A-Z0-9À-Ý][^,;()\n]{1,60}?)\s*(?:[–—|(-]|$)/);
  if (chez) return coupe(chez[1], 80);
  const l1 = lignes[1] || '';
  if (l1 && l1.length <= 70 && !/[.!?:]$/.test(l1) && !PAS_UN_NOM.test(plat(l1)) && !/@|https?:/.test(l1)){
    const parts = l1.split(/\s+[·•|–—-]\s+|\s*,\s+/);
    const nom = parts[0].replace(/\s*\(\d{2,3}\)\s*$/, '').trim();
    if (nom.length >= 2 && /[A-Za-zÀ-ÿ]/.test(nom)) return coupe(nom, 80);
  }
  return '';
}

/* la personne : « auprès de Thomas Leroy, responsable technique », ou
   « Contact : Thomas Leroy » ; l'e-mail où qu'il soit */
const NOM = "[A-ZÉÈÊËÀÂÎÏÔÛÇ][a-zà-ÿ'’-]+(?:\\s+[A-ZÉÈÊËÀÂÎÏÔÛÇ][A-Za-zà-ÿ'’-]+)+";
function contactDe(t){
  const mail = ((t.match(/[^\s@:;,()<>«»"]+@[^\s@:;,()<>«»"]+\.[a-z]{2,}/i) || [''])[0]).replace(/[.)]+$/, '');
  const m = t.match(new RegExp('(?:[Aa]upr[èe]s de|[Cc]ontact\\s*:|[Cc]ontacter|[Ee]nvoye[zr] (?:votre candidature|vos candidatures|votre cv|ton cv) (?:à|a)|[Aa]dress[ée]e? (?:à|a))\\s*(' + NOM + ')(?:\\s*,\\s*([^:\\n(]{2,60}?))?\\s*(?:[:(]|\\n|$|,|\\.)'));
  if (m) return { name: coupe(m[1], 80), role: coupe(m[2] || '', 80), email: mail };
  return mail ? { name: '', role: '', email: mail } : null;
}

/* les missions : les puces sous un titre qui les annonce, trois au plus */
function missionsDe(lignes){
  const out = [];
  let dans = false;
  for (const l of lignes){
    if (/\b(missions?|ce que tu feras|ce que vous ferez|vos taches|tes taches)\b/.test(plat(l)) && l.length < 50){ dans = true; continue; }
    if (!dans) continue;
    if (/^[-•·*–▪●]\s*/.test(l)) out.push(coupe(l.replace(/^[-•·*–▪●]\s*/, ''), 160));
    else if (out.length) break;
    if (out.length >= MISSIONS_MAX) break;
  }
  return out;
}

/* Lire une offre collée. `noms` : les pistes qu'on a déjà (une entreprise
   connue se reconnaît d'abord) ; `today` : AAAA-MM-JJ (l'année d'une date
   qui n'en dit pas). Rend null si ce n'est pas une offre. */
export function lireOffre(texte, { noms = [], today = '' } = {}){
  const t = String(texte || '').replace(/\r/g, '');
  if (!estOffre(t)) return null;
  const lignes = t.split('\n').map(l => l.trim()).filter(Boolean);
  const p = plat(t);
  const type = /\b(alternance|apprentissage|apprenti|contrat de professionnalisation)\b/.test(p) ? 'alternance'
    : /\b(stage|stagiaire)\b/.test(p) ? 'stage' : /\b(cdi|cdd|emploi)\b/.test(p) ? 'emploi' : '';
  const duree = (t.match(/(?:alternance|apprentissage|stage|contrat|cdd)\s+de\s+(\d+\s*(?:ans?|mois|semaines))/i)
    || t.match(/dur[ée]e\s*:\s*(\d+\s*(?:ans?|mois|semaines))/i) || [])[1] || '';
  const debut = (t.match(/(?:à|a) partir (?:de |d’|d')\s*([a-zéû]+ \d{4})/i) || t.match(/d[ée]but\s*:\s*([a-zéû]+ \d{4})/i)
    || t.match(/\bdès (?:le )?(\d{1,2}(?:er)? [a-zéû]+ \d{4}|[a-zéû]+ \d{4})/i) || [])[1] || '';
  const rythme = (t.match(/rythme\s*:\s*([^.\n]+)/i) || [])[1] || '';
  return {
    entreprise: entrepriseDe(lignes, t, noms),
    poste: posteDe(lignes[0]),
    type,
    duree: coupe(duree, 40),
    debut: coupe(debut, 40),
    rythme: coupe(rythme, 160),
    avant: dateLimite(t, today),
    missions: missionsDe(lignes),
    contact: contactDe(t),
    texte: t.trim().slice(0, OFFRE_TEXTE_MAX)
  };
}

/* ce qu'une piste garde de l'offre (le contact rejoint ses contacts) :
   chaque champ à sa forme, rien d'autre ne passe — l'offre vient d'un
   texte collé, donc de n'importe où */
const TYPES = ['alternance', 'stage', 'emploi'];
export function normaliserOffre(o){
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const out = {
    poste: coupe(o.poste, 120),
    type: TYPES.includes(o.type) ? o.type : '',
    duree: coupe(o.duree, 40),
    debut: coupe(o.debut, 40),
    rythme: coupe(o.rythme, 160),
    avant: isoDay(o.avant),
    missions: Array.isArray(o.missions) ? o.missions.filter(x => typeof x === 'string' && x.trim()).slice(0, MISSIONS_MAX).map(x => coupe(x, 200)) : [],
    texte: String(o.texte || '').trim().slice(0, OFFRE_TEXTE_MAX)
  };
  if (!out.poste && !out.texte) return null;
  for (const k of ['type', 'duree', 'debut', 'rythme', 'avant']) if (!out[k]) delete out[k];
  if (!out.missions.length) delete out.missions;
  return out;
}

/* ce que l'offre ajoute au premier message : la phrase entière, qui
   s'efface quand il n'y a pas d'offre (le jeton {{offre}}) */
export const phraseOffre = c => c && c.offre && c.offre.poste ? `Je réponds à votre offre « ${c.offre.poste} ».` : '';
/* « Alternance, 2 ans, à partir de septembre 2027 » */
const MOT_TYPE = { alternance: 'Alternance', stage: 'Stage', emploi: 'Emploi' };
export function contratDit(o){
  if (!o) return '';
  const deb = o.debut ? (/^[aeiouéèh]/i.test(o.debut) ? 'à partir d’' : 'à partir de ') + o.debut : '';
  return [MOT_TYPE[o.type] || '', o.duree || '', deb].filter(Boolean).join(', ');
}
