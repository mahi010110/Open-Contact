/* ============================================================
   OpenContact — moteur · « Depuis mes e-mails »
   (docs/brief-refonte.md, lot 6 ; CLAUDE.md §0)

   Ce n'est pas de l'IA chez OpenContact : l'app donne une CONSIGNE à
   copier, l'étudiant la porte à l'assistant de son choix avec ses
   e-mails, et recolle sa réponse. Une ligne par entreprise :

     Entreprise ; Personne ; E-mail ; Où j'en suis ; Date du dernier échange

   Ici, on lit ces lignes et on calcule ce qu'elles ajoutent : une piste
   neuve (déjà écrite, avec sa réponse ou son refus), un contact de plus
   sur une piste qu'on a, ou un contact sans entreprise, qui attend dans
   « À rattacher ». Rien ne s'écrase (invariant ②) : une piste qu'on a
   garde son suivi, on n'y ajoute qu'une personne qui manque.
   Fonctions pures, aucun accès au DOM.
   ============================================================ */
import { normalizeCompany, normalizeContact } from './model.js';
import { findMatch, contactKey } from './merge.js';
import { phraseEnvoi } from './suite.js';
import { uid, todayISO } from './utils.js';

export const CONSIGNE_EMAILS = 'Voici des e-mails de ma recherche de stage ou d’alternance. '
  + 'Pour chaque entreprise à qui j’ai écrit, réponds par une ligne, et rien d’autre :\n'
  + 'Entreprise ; Personne ; E-mail ; Où j’en suis (écrit, réponse, entretien, refus) ; Date du dernier échange (jj/mm/aaaa)';
export const LIGNES_MAX = 200;

const plat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const ETATS = { ecrit: 'ecrit', ecrite: 'ecrit', envoye: 'ecrit', relance: 'ecrit', reponse: 'reponse', repondu: 'reponse',
  entretien: 'reponse', rdv: 'reponse', refus: 'non', refuse: 'non', refusee: 'non', non: 'non' };
const MAIL_RE = /^[^\s@;,]+@[^\s@;,]+\.[a-z]{2,}$/i;
function dateDe(s){
  const t = String(s || '').trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m){ const j = +m[1], mo = +m[2]; if (j >= 1 && j <= 31 && mo >= 1 && mo <= 12) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(j).padStart(2, '0')}`; }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? t : '';
}

/* la réponse de l'assistant : seules les lignes qui ont la forme de la
   consigne (trois points-virgules au moins) se lisent ; le reste est le
   bavardage d'un assistant (« Voici les entreprises : ») */
export function lireReponseEmails(texte){
  const l = String(texte || '').split(/\r?\n/).map(x => x.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(x => (x.match(/;/g) || []).length >= 3);
  if (!l.length) return null;
  return l.slice(0, LIGNES_MAX).map(x => {
    const c = x.split(';').map(y => y.trim().replace(/^["«]|["»]$/g, '').trim());
    const email = MAIL_RE.test(c[2] || '') ? c[2] : '';
    const etat = ETATS[plat(c[3]).split(/[\s,(]/)[0]] || 'ecrit';
    return { nom: (c[0] || '').slice(0, 80), ct: { name: (c[1] || '').slice(0, 80), email }, etat, date: dateDe(c[4]) };
  }).filter(x => x.nom || x.ct.name || x.ct.email);
}

/* ce que les lignes changeraient, pour l'aperçu : une ligne par entrée */
export function apercuEmails(lignes, companies){
  return (lignes || []).map(x => {
    if (!x.nom) return { ...x, quoi: 'bac' };
    const m = findMatch({ name: x.nom }, companies || []);
    if (!m) return { ...x, quoi: 'neuve' };
    const k = contactKey(normalizeContact(x.ct));
    const deja = !k || (m.contacts || []).some(t => contactKey(t) === k);
    return { ...x, quoi: deja ? 'deja' : 'complete', piste: m.id, pisteNom: m.name };
  });
}

/* les ajouter : rend les nouveaux tableaux (rien n'est touché en place —
   l'appelant garde l'ancien pour « Annuler ») et ce qui a changé */
export function appliquerEmails(lignes, companies, orphans, today = todayISO()){
  const cs = (companies || []).map(c => normalizeCompany(JSON.parse(JSON.stringify(c))));
  const os = (orphans || []).map(o => normalizeContact(o));
  const neuves = [], completees = [];
  let bac = 0;
  for (const x of apercuEmails(lignes, cs)){
    const d = x.date && x.date <= today ? x.date : today;
    const ct = x.ct.name || x.ct.email ? normalizeContact({ name: x.ct.name, email: x.ct.email }) : null;
    if (x.quoi === 'bac'){
      if (ct && !os.some(o => contactKey(o) === contactKey(ct))){ os.push(ct); bac++; }
      continue;
    }
    if (x.quoi === 'deja') continue;
    if (x.quoi === 'complete'){
      const c = cs.find(y => y.id === x.piste);
      if (c && ct){ c.contacts.push(ct); (c.history = c.history || []).push({ d: today, t: 'Contact ajouté : ' + (ct.name || ct.email) });
        c.updatedAt = Date.now(); completees.push(c.id); }
      continue;
    }
    /* une piste neuve, déjà écrite : son histoire tient en trois lignes,
       avec les mots que relit « la suite » (engine/suite.js) */
    if (ct) ct.activatedAt = d;
    const h = [{ d, t: 'Gardée, depuis mes e-mails' }, { d, t: phraseEnvoi('premier', ct && ct.email ? 'mail' : '', ct && ct.name) }];
    const c = { id: uid(), name: x.nom, contacts: ct ? [ct] : [], status: 'active', appliedAt: d, createdAt: Date.now(), history: h };
    if (x.etat === 'reponse'){ c.status = 'reply'; h.push({ d, t: 'Réponse reçue' }); }
    if (x.etat === 'non'){ c.closedReason = 'rejected'; c.closedAt = d; h.push({ d, t: 'Refus' }); }
    cs.push(normalizeCompany(c));
    neuves.push(cs[cs.length - 1].id);
  }
  return { companies: cs, orphans: os, neuves, completees, bac };
}

/* Un contact sans entreprise, et la piste qu'il propose : celle dont le
   site a le même domaine que son e-mail, ou dont le nom s'écrit comme lui
   (« h.lefort@lys-informatique.fr » → Lys Informatique). Jamais une
   messagerie (gmail, orange…) : elle ne dit rien de l'entreprise. */
const MESSAGERIES = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|orange|wanadoo|free|sfr|neuf|laposte|bbox|aol|gmx|proton|protonmail|yopmail)$/;
export function pisteProposee(ct, companies){
  const dom = String((ct && ct.email) || '').toLowerCase().split('@')[1] || '';
  if (!dom) return null;
  const racine = dom.split('.').slice(-2, -1)[0] || '';
  if (!racine || MESSAGERIES.test(racine)) return null;
  const coll = s => plat(s).replace(/[^a-z0-9]/g, '');
  return (companies || []).find(c => !c.closedReason && c.website && String(c.website).toLowerCase().includes(dom))
    || (companies || []).find(c => !c.closedReason && coll(c.name) && coll(c.name) === coll(racine)) || null;
}
