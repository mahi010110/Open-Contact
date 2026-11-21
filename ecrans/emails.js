/* ============================================================
   OpenContact · la nouvelle interface · en bas de Pistes
   (docs/brief-refonte.md, lot 6 : ce que le lot 2 avait promis)

   « DEPUIS MES E-MAILS » n'est pas de l'IA chez OpenContact : trois
   gestes, dans l'ordre où ils se font — copier la consigne, la porter à
   l'assistant de son choix avec ses e-mails, recoller sa réponse. Puis
   l'aperçu de ce qu'elle ajoute, et « Annuler » (invariant ②). La réponse
   collée n'importe où au poste ouvre directement l'aperçu.

   LE BAC « À RATTACHER » ne paraît que s'il contient quelqu'un : un
   contact sans entreprise (d'un e-mail, d'un ancien import) attend qu'on
   le range dans une piste — l'app propose celle dont son e-mail porte le
   nom. On peut aussi le jeter, avec « Annuler ».
   ============================================================ */
import { $, ic, esc, annoncer } from './outils.js';
import { S, saveData, saveOrphans, logJ, attachContact } from './etat.js';
import { rendre, annuler, allerA, ouvrirFeuille, rendreFeuille, fermerFeuille, feuilleOuverte } from './coque.js';
import { CONSIGNE_EMAILS, lireReponseEmails, apercuEmails, appliquerEmails, pisteProposee } from '../engine/emails.js';
import { parseInput } from '../engine/exchange.js';
import { normalizeCompany, normalizeContact } from '../engine/model.js';
import { jourMois } from '../engine/suite.js';
import { todayISO } from '../engine/utils.js';
import { montrerApercu } from './echange.js';
import { choisirPiste } from './pistes.js';

const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const MOT = { ecrit: 'écrit', reponse: 'réponse', non: 'refus' };

/* ---------- en bas de Pistes ---------- */
export function basPistesHTML(ouvert){
  const b = S.orphans || [];
  const bac = b.length ? `<details class="term bac" data-p="bac"${ouvert ? ' open' : ''}><summary>À rattacher · ${b.length}${ic('chevron-right')}</summary><div class="rangs">`
    + b.map(o => {
      const p = pisteProposee(o, S.companies);
      const sous = [o.role, o.name ? o.email : '', p ? '→\u00a0' + p.name + '\u00a0?' : ''].filter(Boolean).join(' · ') || 'à compléter';
      return `<div class="rang"><div class="r-c"><b>${esc(o.name || o.email || o.phone || 'Contact')}</b><span>${esc(sous)}</span></div>`
        + `<button class="btn s" data-a="x-rattacher" data-id="${esc(o.id)}">Rattacher</button></div>`;
    }).join('') + '</div></details>' : '';
  return bac + `<div class="rangs s-liste x-mails-r"><button class="rang act" data-a="x-mails">${ic('mail')}<div class="r-c"><b>Depuis mes e-mails</b></div>${ic('chevron-right')}</button></div>`;
}
export function gesteBas(a, el){
  if (a === 'x-mails'){ ouvrirEmails(null); return true; }
  if (a === 'x-rattacher'){ ouvrirRattacher(el.getAttribute('data-id')); return true; }
  return false;
}

/* ---------- « Depuis mes e-mails » ---------- */
export function ouvrirEmails(lu){
  if (lu) allerA('pistes');
  const f = { titre: 'Depuis mes e-mails', lu: lu || null, texte: '', err: '', copiee: false,
    rendre: rendreEmails, geste: gesteEmails, focus: lu ? '' : '' };
  f.apres = z => {
    const ta = $('.x-rep', z);
    if (ta && !ta.__b){ ta.__b = true; ta.addEventListener('input', () => { f.texte = ta.value; if (f.err){ f.err = ''; const e = $('.x-err', z); if (e) e.hidden = true; } }); }
  };
  ouvrirFeuille(f);
}
function ligneMail(x){
  const qui = x.ct.name || x.ct.email;
  if (x.quoi === 'bac') return `<div class="rang"><div class="r-c"><b>${esc(qui)}</b><span>sans entreprise · ira dans « À rattacher »</span></div></div>`;
  if (x.quoi === 'deja' || x.quoi === 'complete')
    return `<div class="rang"><div class="r-c"><b>${esc(x.pisteNom)}</b><span${x.quoi === 'complete' ? ' class="plus"' : ''}>déjà dans tes pistes${x.quoi === 'complete' ? ' · ' + esc(qui) + ' s’ajoute' : ''}</span></div>${ic('check')}</div>`;
  return `<div class="rang"><div class="r-c"><b>${esc(x.nom)}</b><span class="plus">${esc(['nouvelle · ' + MOT[x.etat] + (x.date ? ' le ' + jourMois(x.date) : ''), x.ct.name].filter(Boolean).join(' · '))}</span></div></div>`;
}
function rendreEmails(f){
  if (!f.lu)
    return { corps: '<ol class="etapes x-pas">'
      + `<li><span>1</span><button class="btn s" data-a="x-consigne">${ic(f.copiee ? 'check' : 'copy')}${f.copiee ? 'Consigne copiée' : 'Copier la consigne'}</button></li>`
      + '<li><span>2</span>Colle-la dans ton assistant, avec tes e-mails.</li>'
      + '<li><span>3</span><div class="x-rep-c"><div class="x-rep-t"><label for="x-rep">Colle sa réponse ici</label><button class="lien" data-a="x-coller">Coller</button></div>'
      + `<textarea class="zone x-rep" id="x-rep" rows="4" autocomplete="off" spellcheck="false">${esc(f.texte)}</textarea><p class="err x-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p></div></li></ol>`,
      pied: '<button class="btn p" data-a="x-lire">Lire la réponse</button>' };
  const ap = apercuEmails(f.lu, S.companies), nv = ap.filter(x => x.quoi === 'neuve').length;
  const plus = ap.filter(x => x.quoi === 'complete').length, bac = ap.filter(x => x.quoi === 'bac').length;
  return { corps: `<p class="fort m-fort">Dans sa réponse</p><div class="rangs">${ap.map(ligneMail).join('')}</div>`
      + '<p class="doux m-top">Ce qui manque ici s’ajoute. Rien n’est effacé.</p>',
    pied: nv ? `<button class="btn p" data-a="x-ajouter">${ic('plus')}Ajouter ${pl(nv, 'piste')}</button>`
      : plus || bac ? `<button class="btn p" data-a="x-ajouter">${ic('plus')}${plus ? 'Ajouter ' + pl(plus, 'contact') : 'Ajouter au bac'}</button>`
      : '<button class="btn" data-a="x-rien">Rien de neuf</button>' };
}
async function lire(f){
  const t = String(f.texte || '').trim();
  const dire = m => { f.err = m; rendreFeuille(); const ta = $('.couche-f .x-rep'); if (ta) ta.focus(); annoncer(m); };
  if (!t){ dire('Il manque la réponse de ton assistant.'); return; }
  const lu = lireReponseEmails(t);
  if (lu){ f.lu = lu; f.err = ''; rendreFeuille(); return; }
  /* l'ancienne consigne demandait des pistes au format d'OpenContact :
     elles s'ouvrent dans l'aperçu de « Recevoir » */
  try {
    const obj = await parseInput(t);
    if (obj && obj.companies && obj.companies.length){ fermerFeuille(); montrerApercu(obj, {}); return; }
  } catch (e) {}
  dire('Aucune ligne ne se lit. La réponse doit suivre la consigne : une ligne par entreprise.');
}
function ajouter(f){
  const avantC = JSON.stringify(S.companies), avantO = JSON.stringify(S.orphans || []);
  const r = appliquerEmails(f.lu, S.companies, S.orphans, todayISO());
  S.companies = r.companies;
  S.orphans = r.orphans;
  saveData(); saveOrphans();
  logJ(`Depuis mes e-mails : +${r.neuves.length} piste(s), ${r.completees.length} contact(s), ${r.bac} à rattacher`, null, r.neuves);
  fermerFeuille();
  allerA('pistes');
  if (r.neuves.length) choisirPiste(r.neuves[0]);
  /* court, et un chiffre ne se sépare jamais de son mot */
  const n = (k, mot) => `${k}\u00a0${mot}${k > 1 ? 's' : ''}`;
  const dit = [r.neuves.length ? `${n(r.neuves.length, 'piste')} ajoutée${r.neuves.length > 1 ? 's' : ''}` : '',
    r.completees.length ? `${n(r.completees.length, 'contact')} ajouté${r.completees.length > 1 ? 's' : ''}` : '',
    r.bac ? `${r.bac}\u00a0à\u00a0rattacher` : ''].filter(Boolean).join(' · ') || 'Rien de neuf';
  annuler(dit, () => {
    S.companies = JSON.parse(avantC).map(normalizeCompany);
    S.orphans = JSON.parse(avantO).map(normalizeContact);
    saveData(); saveOrphans();
    logJ('Ajout depuis mes e-mails annulé');
  });
  rendre();
}
function gesteEmails(a, el, ev, f){
  if (a === 'x-consigne'){
    navigator.clipboard.writeText(CONSIGNE_EMAILS).then(() => { f.copiee = true; rendreFeuille(); annoncer('Consigne copiée.'); },
      () => { f.err = 'Copie impossible ici : sélectionne la consigne à la main.'; rendreFeuille(); });
    return;
  }
  if (a === 'x-coller'){
    navigator.clipboard.readText().then(t => { f.texte = t || ''; f.err = ''; rendreFeuille(); })
      .catch(() => { f.err = 'Colle ici avec un appui long : ce navigateur ne laisse pas l’app lire le presse-papier.'; rendreFeuille(); });
    return;
  }
  if (a === 'x-lire'){ lire(f); return; }
  if (a === 'x-ajouter'){ ajouter(f); return; }
  if (a === 'x-rien'){ fermerFeuille(); }
}

/* ---------- « Rattacher » ---------- */
function ouvrirRattacher(id){
  const o = (S.orphans || []).find(x => x.id === id);
  if (!o) return;
  ouvrirFeuille({ titre: 'Rattacher', id, rendre: rendreRattacher, geste: gesteRattacher });
}
function rendreRattacher(f){
  const o = (S.orphans || []).find(x => x.id === f.id);
  if (!o) return { corps: '<p class="doux">Ce contact n’est plus là.</p>' };
  const p = pisteProposee(o, S.companies);
  const ids = S.companies.filter(c => !c.closedReason && !c.demo).sort((a, b) => (p && b.id === p.id ? 1 : 0) - (p && a.id === p.id ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'fr'));
  return { corps: `<p class="fort m-fort">${esc(o.name || o.email || 'Contact')}</p><p class="doux m-doux">${esc([o.role, o.name ? o.email : ''].filter(Boolean).join(' · '))}</p>`
    + '<div class="et">À quelle piste ?</div>'
    + (ids.length ? `<div class="rangs choix">${ids.map(c => `<button class="rang act" data-a="x-rattacher-a" data-id="${esc(c.id)}"><div class="r-c"><b>${esc(c.name)}</b>${p && c.id === p.id ? '<span class="plus">proposée</span>' : ''}</div>${ic('chevron-right')}</button>`).join('')}</div>`
      : '<p class="doux">Garde d’abord l’entreprise : Trouver, puis « Garder ».</p>')
    + `<div class="bas-p"><button class="btn s danger" data-a="x-jeter">${ic('trash')}Jeter ce contact</button></div>` };
}
function gesteRattacher(a, el, ev, f){
  const o = (S.orphans || []).find(x => x.id === f.id);
  if (!o) return;
  const i = S.orphans.indexOf(o);
  if (a === 'x-rattacher-a'){
    const c = S.companies.find(x => x.id === el.getAttribute('data-id'));
    if (!c) return;
    const snap = JSON.stringify(c);
    S.orphans.splice(i, 1);
    saveOrphans();
    attachContact(c, o);
    logJ('Contact rattaché : ' + (o.name || o.email) + ' → ' + c.name, c.id);
    fermerFeuille();
    annuler('Contact rattaché à ' + c.name, () => {
      const j = S.companies.findIndex(x => x.id === c.id);
      if (j >= 0){ S.companies[j] = normalizeCompany(JSON.parse(snap)); saveData(); }
      S.orphans.splice(Math.min(i, S.orphans.length), 0, o);
      saveOrphans();
    });
    rendre();
    return;
  }
  if (a === 'x-jeter'){
    S.orphans.splice(i, 1);
    saveOrphans();
    fermerFeuille();
    annuler('Contact jeté', () => { S.orphans.splice(Math.min(i, S.orphans.length), 0, o); saveOrphans(); });
    rendre();
  }
}
export const emailsOuverts = () => { const f = feuilleOuverte(); return !!(f && f.titre === 'Depuis mes e-mails'); };
