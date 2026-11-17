/* ============================================================
   OpenContact · la nouvelle interface · ce qu'on sait d'une entreprise
   (engine/carte.js ; docs/carte.md)

   Repris de ui/carte.js, sans le dessin. L'annuaire a déjà répondu :
   c'est lui qui a trouvé l'entreprise. La page d'une entreprise demande
   le reste quand on la REGARDE, une fois par session :
   · Wikidata et le BODACC reçoivent le SIREN, neuf chiffres publics ;
   · Wikipédia reçoit le titre de l'article que Wikidata a donné ;
   · Clearbit reçoit le NOM, seulement quand Wikidata n'a pas de site ;
   · Egapro le SIREN, seulement quand l'annuaire dit l'index déclaré.
   Rien d'autre : ni note, ni contact, ni profil. Ces sources complètent
   et se taisent : une réponse absente, lente ou en erreur ne se dit pas.
   Hors ligne, rien ne part.

   Et une piste qui porte un SIREN se relit par ce SIREN seul
   (`relireSiren`), pour que sa page dise la même chose que celle de
   l'entreprise trouvée.
   ============================================================ */
import { todayISO } from '../engine/utils.js';
import { questionWikidata, lireWikidata, questionResume, lireResume, questionBodacc, lireBodacc,
         questionEgapro, lireEgapro, carte } from '../engine/carte.js';
import { questionClearbit, lireClearbit, questionSiren, lireAnnuaire } from '../engine/annuaire.js';
import { aideEmbauche } from '../engine/marche.js';
import { lireUrl } from './annuaire.js';

const memo = new Map();       /* siren → ce que les sources ont rendu */
const abonnes = new Map();    /* siren → les écrans à prévenir */

/* une requête bornée : douze secondes au plus, sans référent */
function lire(u, accept){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  return fetch(u, { headers: { accept }, referrerPolicy: 'no-referrer', signal: ctl.signal })
    .then(res => res.ok ? res.json() : Promise.reject(new Error('http ' + res.status)))
    .finally(() => clearTimeout(t));
}

/* Demander ce que les autres sources savent de `siren`. `notifier` est
   rappelé à chaque réponse qui change la carte. Rend de quoi se
   désabonner. Une source en erreur se redemande à la prochaine
   ouverture, jamais en boucle. */
export function suivreCarte(siren, notifier, nom, o = {}){
  if (!/^\d{9}$/.test(String(siren || ''))) return () => {};
  if (notifier){
    if (!abonnes.has(siren)) abonnes.set(siren, new Set());
    abonnes.get(siren).add(notifier);
  }
  const e = memo.get(siren) || { wd: null, resume: '', bodacc: null, clearbit: '', egapro: null, etats: {} };
  memo.set(siren, e);
  const prevenir = () => (abonnes.get(siren) || []).forEach(f => { try { f(); } catch (x) { /* un écran fermé */ } });
  if (navigator.onLine !== false){
    if (!e.etats.wd || e.etats.wd === 'erreur'){
      e.etats.wd = 'charge';
      lire(questionWikidata(siren), 'application/sparql-results+json').then(j => {
        e.wd = lireWikidata(j);
        e.etats.wd = 'ok';
        if (e.wd.site || e.wd.desc || e.wd.groupe || e.wd.logo || e.wd.linkedin) prevenir();
        const u = questionResume(e.wd.article);
        if (u) lire(u, 'application/json').then(r => { e.resume = lireResume(r); if (e.resume) prevenir(); }).catch(() => {});
        const cb = !e.wd.site && !e.etats.cb && questionClearbit(nom);
        if (cb){
          e.etats.cb = 'charge';
          lire(cb, 'application/json').then(j => { e.clearbit = lireClearbit(j, nom); if (e.clearbit) prevenir(); })
            .catch(() => { e.etats.cb = ''; });
        }
      }).catch(() => { e.etats.wd = 'erreur'; });
    }
    if (o.egapro && (!e.etats.egapro || e.etats.egapro === 'erreur')){
      e.etats.egapro = 'charge';
      lire(questionEgapro(siren), 'application/json').then(j => {
        e.egapro = lireEgapro(j, siren);
        e.etats.egapro = 'ok';
        if (e.egapro) prevenir();
      }).catch(() => { e.etats.egapro = 'erreur'; });
    }
    if (!e.etats.bodacc || e.etats.bodacc === 'erreur'){
      e.etats.bodacc = 'charge';
      lire(questionBodacc(siren), 'application/json').then(j => {
        e.bodacc = lireBodacc(j, todayISO(), siren);
        e.etats.bodacc = 'ok';
        if (e.bodacc.procedure || e.bodacc.evenements.length) prevenir();
      }).catch(() => { e.etats.bodacc = 'erreur'; });
    }
  }
  return () => abonnes.get(siren)?.delete(notifier);
}
export const sourcesDe = siren => {
  const e = memo.get(String(siren || ''));
  return e ? { wd: e.wd, resume: e.resume, bodacc: e.bodacc, clearbit: e.clearbit, egapro: e.egapro } : {};
};
/* la carte d'une entreprise, prête à dessiner (engine/carte.js) */
export const carteDe = (r, piste, metier, profile) => carte({ r, piste, metier, ...sourcesDe(r && r.siren),
  aide: r && profile ? aideEmbauche(r, profile, todayISO()) : null, today: todayISO() });

/* ---------- une piste se relit par son SIREN ----------
   Une fois par session ; la question ne porte que les neuf chiffres. */
const relues = new Map();     /* siren → { etat, r } */
export function relireSiren(siren, notifier){
  if (!/^\d{9}$/.test(String(siren || ''))) return null;
  const e = relues.get(siren);
  if (e && (e.etat === 'ok' || e.etat === 'charge')) return e.r || null;
  if (navigator.onLine === false) return null;
  const x = { etat: 'charge', r: null };
  relues.set(siren, x);
  lireUrl(questionSiren(siren), new AbortController().signal).then(j => {
    x.r = lireAnnuaire(j)[0] || null;
    x.etat = 'ok';
    if (x.r && notifier) notifier();
  }).catch(() => { x.etat = 'erreur'; });
  return null;
}
