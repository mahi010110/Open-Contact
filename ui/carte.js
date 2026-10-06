/* ============================================================
   OpenContact — interface · la carte d'une entreprise
   (engine/carte.js ; docs/carte.md)

   La MÊME carte dans l'aperçu de « À découvrir » et dans « À savoir »
   de la fiche : ce qu'elle fait, ses missions, sa taille, à qui
   écrire — sur place, sans un lien à toucher. Un objet, un dessin
   (§7 appliqué à l'image).

   CE QUI PART, ET QUAND. L'annuaire a déjà répondu (c'est lui qui a
   trouvé l'entreprise) ; la carte demande le reste quand on la REGARDE —
   l'aperçu ouvert, la fiche ouverte —, une fois par session :
   · Wikidata et le BODACC reçoivent le SIREN, neuf chiffres publics ;
   · Wikipédia reçoit le titre de l'article que Wikidata a donné ;
   · le logo vient de Wikimedia Commons, sans référent ;
   · Clearbit reçoit le NOM de l'entreprise, et seulement quand Wikidata
     n'a pas de site à donner (décision du mainteneur, 6/10).
   Rien d'autre : ni note, ni contact, ni profil.

   CE QUI SE TAIT. Ces sources-là complètent, elles ne portent pas la
   carte : une réponse absente, lente ou en erreur ne se dit pas (relevé :
   elles ne connaissent qu'une entreprise sur cinq). Hors ligne, rien ne
   part, et la carte montre ce que l'annuaire a dit.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { todayISO } from '../engine/utils.js';
import { questionWikidata, lireWikidata, questionResume, lireResume, questionBodacc, lireBodacc, carte } from '../engine/carte.js';
import { questionClearbit, lireClearbit } from '../engine/annuaire.js';
import { aideEmbauche, euros } from '../engine/marche.js';
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
export function suivreCarte(siren, notifier, nom){
  if (!/^\d{9}$/.test(String(siren || ''))) return () => {};
  if (notifier){
    if (!abonnes.has(siren)) abonnes.set(siren, new Set());
    abonnes.get(siren).add(notifier);
  }
  const e = memo.get(siren) || { wd: null, resume: '', bodacc: null, clearbit: '', etats: {} };
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
        /* pas de site chez Wikidata : Clearbit, par le nom — une fois */
        const cb = !e.wd.site && !e.etats.cb && questionClearbit(nom);
        if (cb){
          e.etats.cb = 'charge';
          lire(cb, 'application/json').then(j => { e.clearbit = lireClearbit(j, nom); if (e.clearbit) prevenir(); })
            .catch(() => { e.etats.cb = ''; });
        }
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
  return e ? { wd: e.wd, resume: e.resume, bodacc: e.bodacc, clearbit: e.clearbit } : {};
};
/* la carte d'une entreprise, prête à dessiner */
/* `metier` : celui que dit ta formation (metierDuProfil) — la carte dit
   si les missions y collent ; `profile` : ce que tu cherches, pour l'aide
   à l'embauche d'un apprenti */
export const carteDe = (r, piste, metier, profile) => carte({ r, piste, metier, ...sourcesDe(r && r.siren),
  aide: r && profile ? aideEmbauche(r, profile, todayISO()) : null });

const jjmmaaaa = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
/* L'ALERTE se pose en ligne, à côté du lieu ou du nom : une marque, pas
   un bandeau — elle ne pousse rien sous le doigt quand le BODACC répond
   après le reste */
export const alerteHTML = k => k && k.alerte
  ? `<span class="mark mark-late">${esc(k.alerte.texte)}</span>${k.alerte.date ? `<span class="ct-le">depuis le ${esc(jjmmaaaa(k.alerte.date))}</span>` : ''}`
  : '';

/* LE CORPS DE LA CARTE. Ce qui aide un étudiant à CHOISIR (retour du
   mainteneur, 6 octobre) : ce qu'elle fait (une phrase, et son logo),
   puis trois lignes — les missions et si elles collent à ta formation,
   la taille en mots, à qui écrire. Toujours dans cet ordre, pour que
   deux cartes se comparent d'un coup d'œil. Aucun bouton : on lit ; le
   seul lien mène à la personne. `o.ecrire === false` : la fiche range
   « à qui écrire » avec ses contacts, là où ça sert (§6). */
const ligne = (l, v) => `<div class="fk"><span class="fk-l">${l}</span><span class="fk-v">${v}</span></div>`;
export function ecrireHTML(e, entreprise){
  if (!e) return '';
  const qui = e.cible === 'dirigeant' ? esc(e.nom) + (e.qualite ? ', ' + esc(e.qualite) : '') : 'Son service recrutement';
  const aria = e.cible === 'dirigeant' ? `Trouver ${e.nom} sur LinkedIn` : `Le recrutement de ${entreprise || 'l’entreprise'} sur LinkedIn`;
  return ligne('Écrire à', `${qui}${e.url ? ` <a class="linklike ct-li" href="${esc(e.url)}" target="_blank" rel="noopener" aria-label="${esc(aria)}">LinkedIn${ic('external-link', 'ic-12')}</a>` : ''}`);
}
export function carteHTML(k, o){
  if (!k) return '';
  o = o || {};
  const site = k.site
    ? `<div class="fk"><span class="fk-l">Site</span><a class="fk-v" href="${esc(k.site)}" target="_blank" rel="noopener">${
        esc(k.site.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''))} ${ic('external-link', 'ic-14')}</a></div>` : '';
  return (
    `${k.quoi ? `<div class="ct-tete"><div class="ct-quoi">${k.logo
        ? `<img class="ct-logo" src="${esc(k.logo)}" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}<p>${esc(k.quoi.texte)}</p></div></div>` : ''}
     ${k.missions ? ligne('Missions', esc(k.missions.texte) + (k.missions.tonMetier
       ? ` <span class="ct-ton">${ic('check', 'ic-12')}colle à ta formation</span>` : '')) : ''}
     ${k.taille ? ligne('Taille', esc(k.taille)) : ''}
     ${o.ecrire === false ? '' : ecrireHTML(k.ecrire, o.nom)}
     ${k.aide ? ligne('Aide', `l’État lui verse jusqu’à <b>${euros(k.aide.montant)}</b> la 1<sup>re</sup> année${k.aide.grande ? ', sous conditions' : ''}`) : ''}
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
