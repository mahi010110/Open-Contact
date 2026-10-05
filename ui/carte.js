/* ============================================================
   OpenContact — interface · la carte d'une entreprise
   (engine/carte.js ; docs/carte.md)

   La MÊME carte dans l'aperçu de « À découvrir » et dans « À savoir »
   de la fiche : ce qu'elle fait, quatre chiffres, à qui écrire, son
   groupe — sur place, sans un lien à toucher. Un objet, un dessin
   (§7 appliqué à l'image).

   CE QUI PART, ET QUAND. L'annuaire a déjà répondu (c'est lui qui a
   trouvé l'entreprise) ; la carte demande le reste quand on la REGARDE —
   l'aperçu ouvert, la fiche ouverte —, une fois par session :
   · Wikidata et le BODACC reçoivent le SIREN, neuf chiffres publics ;
   · Wikipédia reçoit le titre de l'article que Wikidata a donné ;
   · le logo vient de Wikimedia Commons, sans référent.
   Rien d'autre : ni note, ni contact, ni profil.

   CE QUI SE TAIT. Ces sources-là complètent, elles ne portent pas la
   carte : une réponse absente, lente ou en erreur ne se dit pas (relevé :
   elles ne connaissent qu'une entreprise sur cinq). Hors ligne, rien ne
   part, et la carte montre ce que l'annuaire a dit.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { todayISO } from '../engine/utils.js';
import { questionWikidata, lireWikidata, questionResume, lireResume, questionBodacc, lireBodacc, carte } from '../engine/carte.js';
import { ic } from './dom.js';

/* siren → { wd, resume, bodacc, etats } — on ne redemande pas ce qu'on sait */
const memo = new Map();
const abonnes = new Map();

/* une requête bornée : douze secondes au plus, sans référent */
function lire(u, accept){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  return fetch(u, { headers: { accept }, referrerPolicy: 'no-referrer', signal: ctl.signal })
    .then(res => res.ok ? res.json() : Promise.reject(new Error('http ' + res.status)))
    .finally(() => clearTimeout(t));
}

/* Demander ce que les autres sources savent de `siren`. `notifier` est
   rappelé à chaque réponse qui change la carte. Une source en erreur se
   redemande à la prochaine ouverture, jamais en boucle. */
export function suivreCarte(siren, notifier){
  if (!/^\d{9}$/.test(String(siren || ''))) return () => {};
  if (notifier){
    if (!abonnes.has(siren)) abonnes.set(siren, new Set());
    abonnes.get(siren).add(notifier);
  }
  const e = memo.get(siren) || { wd: null, resume: '', bodacc: null, etats: {} };
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
      }).catch(() => { e.etats.wd = 'erreur'; });
    }
    if (!e.etats.bodacc || e.etats.bodacc === 'erreur'){
      e.etats.bodacc = 'charge';
      lire(questionBodacc(siren), 'application/json').then(j => {
        e.bodacc = lireBodacc(j, todayISO());
        e.etats.bodacc = 'ok';
        if (e.bodacc.procedure) prevenir();
      }).catch(() => { e.etats.bodacc = 'erreur'; });
    }
  }
  return () => abonnes.get(siren)?.delete(notifier);
}
/* ce que les sources ont rendu jusqu'ici (rien, tant qu'elles se taisent) */
export const sourcesDe = siren => {
  const e = memo.get(String(siren || ''));
  return e ? { wd: e.wd, resume: e.resume, bodacc: e.bodacc } : {};
};
/* la carte d'une entreprise, prête à dessiner */
export const carteDe = (r, piste) => carte({ r, piste, ...sourcesDe(r && r.siren) });

const jjmmaaaa = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
/* L'ALERTE se pose en ligne, à côté du lieu ou du nom : une marque, pas
   un bandeau — elle ne pousse rien sous le doigt quand le BODACC répond
   après le reste */
export const alerteHTML = k => k && k.alerte
  ? `<span class="mark mark-late">${esc(k.alerte.texte)}</span>${k.alerte.date ? `<span class="ct-le">depuis le ${esc(jjmmaaaa(k.alerte.date))}</span>` : ''}`
  : '';

/* LE CORPS DE LA CARTE. Trois niveaux, toujours dans le même ordre pour
   que deux cartes se comparent d'un coup d'œil : ce qu'elle fait (une
   phrase, et son logo s'il existe), quatre chiffres, puis à qui écrire
   et de qui elle dépend. Aucun bouton : on lit. */
export function carteHTML(k){
  if (!k) return '';
  const site = k.site
    ? `<div class="fk"><span class="fk-l">Site</span><a class="fk-v" href="${esc(k.site)}" target="_blank" rel="noopener">${
        esc(k.site.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''))} ${ic('external-link', 'ic-14')}</a></div>` : '';
  const tete = k.quoi || k.activite || k.chiffres.length;
  return (
    `${tete ? '<div class="ct-tete">' : ''}${k.quoi ? `<div class="ct-quoi">${k.logo
        ? `<img class="ct-logo" src="${esc(k.logo)}" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}<p>${esc(k.quoi.texte)}</p></div>` : ''}
     ${k.activite ? `<p class="ct-act">${esc(k.activite)}</p>` : ''}
     ${k.chiffres.length ? `<ul class="ct-chiffres">${k.chiffres.map(x =>
       `<li><b>${esc(x.v)}</b><span>${esc(x.l)}</span></li>`).join('')}</ul>` : ''}${tete ? '</div>' : ''}
     ${k.lignes.map(l => `<div class="fk"><span class="fk-l">${esc(l.l)}</span><span class="fk-v">${esc(l.v)}</span></div>`).join('')}
     ${site}`);
}
/* la source, nommée : la licence de l'annuaire le demande, et c'est ce
   qui dit d'où vient chaque mot de la carte — seulement celles qui ont
   dit quelque chose */
export const sourcesHTML = k => k && k.sources.length
  ? `<p class="ct-src">${k.sources.length > 1 ? 'Sources' : 'Source'} : ${k.sources.map(esc).join(' · ')}</p>` : '';

/* un logo qui ne se charge pas (hors ligne, fichier retiré) disparaît :
   un cadre vide ne dit que notre impuissance */
export function lierCarte(box){
  box?.querySelectorAll('img.ct-logo').forEach(i => {
    if (i.complete && !i.naturalWidth && i.src) i.remove();
    else i.addEventListener('error', () => i.remove(), { once: true });
  });
}
