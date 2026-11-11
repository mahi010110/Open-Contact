/* ============================================================
   OpenContact — interface · « Aujourd'hui »
   (la refonte — « le lecteur », docs/principes.md)

   L'écran répond à UNE question : « je fais quoi maintenant ? »
   (CLAUDE.md §1). Il y répond comme un lecteur de musique :

   · LA FILE — une liste 98, dans un seul cadre : « À faire », puis
     « Bientôt » (le plan, dont « Relancer si pas de réponse »), puis
     « Fait aujourd'hui » (les gestes du jour, sans les compter). Une
     ligne = une piste et sa prochaine étape. La ligne choisie prend le
     navy du châssis : elle dit où l'on est.
   · LA FENÊTRE « MAINTENANT » — une boîte de dialogue 98 qui pose UNE
     question : la piste, l'étape, ce qui s'est passé en dernier, et deux
     réponses — le geste, nommé et rempli, ou « Plus tard » (choisir
     quand : un plan, pas un abandon ; Gollwitzer & Sheeran, 2006).
     Toucher une ligne la charge dans la fenêtre ; la retoucher, ou
     toucher son nom dans la fenêtre, ouvre la fiche.

   L'APP ÉVOLUE AVEC LA RECHERCHE : c'est la fenêtre qui change. Sans
   cible, elle la demande ; sans piste, elle propose d'en trouver ; rien
   à faire, elle le dit et montre ce qui vient ; un contrat décroché,
   elle porte sa suite. L'écran, lui, garde sa forme.

   DEUX DESSINS (« le PC et le tel sont deux choses différentes ») :
   · AU TÉLÉPHONE, la fenêtre est ANCRÉE en bas, au-dessus de la barre :
     le bouton est sous le pouce, toujours au même endroit (§5), et la
     file défile au-dessus. Une ligne datée se glisse : Fait, Reporter.
   · À L'ORDINATEUR, la file tient le centre, en colonnes, et la fenêtre
     tient la droite, RICHE : le dernier échange, les contacts, les notes
     — on agit sans ouvrir une fiche. Le clavier suffit : ↑ ↓ parcourent
     la file, Entrée passe au geste.

   Ce qui tient depuis l'écran d'avant, et que e2e-commencer.mjs garde :
   tout ce qui est engagé se montre et passe devant ; ce que l'app
   propose complète jusqu'à trois lignes ; une seule emphase ; revenir ne
   coûte rien (« Pour reprendre ») ; ce que l'app fait seule, elle le dit.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { RECHERCHES, DOMAINS } from '../engine/model.js';
import { aFaire, dernierFait } from '../engine/etape.js';
import { annonces } from '../engine/rangement.js';
import { enPause } from '../engine/suivi.js';
import { metierDuProfil, METIER } from '../engine/requete.js';
import { amorces } from '../engine/commande.js';
import { portesDuJour } from './amis.js';
import { lignesAmis, ouvrirLigne, peutDemanderAmis } from './reseau.js';
import { ecritsDuJour, ouvrirNonLus } from './conversations.js';
import { S, bus, hasDemo, addDemo, removeDemo, saveProfile } from './state.js';
import { $, ic, openSheet, voirAutres, annoncer } from './dom.js';
import { frToday, frDate, dueMarkHTML, silenceMarkHTML } from './dates.js';
import { reportAction, askNextAction } from './actions.js';
import { openFiche } from './fiche.js';
import { openCapture } from './capture.js';
import { openMail } from './mail.js';
import { faireEtape, marquerFait, annulerRangement } from './gestes.js';
import { campaignLines, openCampaignById } from './campagnes.js';
import { mailAnalysis } from './analyse.js';
import { openPendingMailAnalysis } from './recevoir.js';
import { ouvrirSur } from './pistes.js';
import { pendingProposals, openPendingProposals } from './propositions.js';
import { ORDINATEUR, CAMPAGNES } from './perimetre.js';

const CAP = 8;                      /* lignes de « Bientôt » avant « voir plus » */
const FILE = 3;                     /* ce que l'app propose complète jusqu'à trois lignes */
const FAITS = 3;                    /* « Fait aujourd'hui » : les trois derniers gestes */
const expanded = new Set();         /* ce qu'on a déplié à la main (le temps de la session) */
let choisie = null;                 /* la piste chargée dans « Maintenant » */
let dite = '';                      /* la dernière étape annoncée (région vivante) */

const mqWide = matchMedia('(min-width:901px)');
mqWide.addEventListener('change', () => { if (S.route === 'aujourdhui') renderToday(); });

/* ---------- ce qui a été fait aujourd'hui ----------
   Les gestes du jour, tels que le journal les a notés — le progrès qui
   dépend de l'étudiant, montré sans le compter (ni série, ni chiffre :
   Silverman & Barasch, 2023). Les trois derniers, le plus récent en tête. */
const FAIT = /^(Fait : |Email envoyé|Réponse reçue|Clôturée|Piste créée|Piste ajoutée|Demandé à|Donné à)/;
function faitsDuJour(){
  const debut = new Date(); debut.setHours(0, 0, 0, 0);
  return S.journal.filter(e => e.t >= +debut && FAIT.test(e.txt)).slice(-FAITS).reverse()
    .map(e => e.txt.replace(/^Fait : /, ''));
}
/* pistes arrivées par partage aujourd'hui — le petit accès « reçu de la promo » */
function receivedTodayCount(){
  const today = todayISO();
  return S.companies.filter(c =>
    (c.history || []).some(h => h.t === 'Reçue via partage' && h.d === today)).length;
}

/* ---------- la cible ----------
   Ce que je cherche, et où : le début du parcours (docs/refonte.md). Elle
   se règle une fois — elle tient donc en UNE ligne sous le titre, pas
   dans une boîte en tête d'écran (§6 : ce qu'on fait une fois ne prend
   pas la place de ce qu'on fait tous les jours). Pas encore dite : sur
   une app neuve c'est la fenêtre qui la demande ; sinon trois puces. */
function cibleDite(){
  const p = S.profile, r = RECHERCHES[p.recherche];
  if (!r) return '';
  const m = metierDuProfil(p);
  const metier = m && METIER[m] && !/[\/]/.test(METIER[m].label) ? ' en ' + METIER[m].label.toLowerCase() : '';
  return [r.label + metier, p.ville].filter(Boolean).join(' · ');
}
const pucesCible = () =>
  `<div class="aj-cible-vide" role="group" aria-labelledby="ajCibleQ">
     <b id="ajCibleQ">Tu cherches</b>
     <div class="datechips">${Object.keys(RECHERCHES).map(k =>
       `<button class="dchip" data-cherche="${k}">${RECHERCHES[k].label}</button>`).join('')}</div>
   </div>`;
function cibleHTML(neuf){
  const t = cibleDite();
  if (t) return `<button class="aj-cible" id="ajCible" aria-label="Ma recherche : ${esc(t)}. Modifier">
                   <span class="aj-cible-t">${esc(t)}</span>${ic('pencil', 'ic-14')}
                 </button>`;
  return neuf ? '' : pucesCible();
}

/* ---------- une ligne de la file ----------
   L'ENCRE VA À L'ENTREPRISE (§6) : le nom en tête, ce qu'il faut faire
   dessous — à la même place sur chaque ligne —, et au bout ce qui presse
   (le retard, le silence) ou le jour prévu. Pas de bouton dans la ligne :
   le geste vit dans la fenêtre « Maintenant », un seul à la fois. */
function rangHTML(e, o){
  const date = e.genre === 'retard' || e.genre === 'jour';
  const atout = e.genre === 'demarrer' && e.raison;
  const quoi = atout ? `<span class="act-vecu">${esc(e.raison)}</span>` : `<span class="act-do">${esc(e.titre)}</span>`;
  const suite = e.genre === 'contrat' ? `<span class="act-who">${esc(e.sous)}</span>` : '';
  const presse = e.genre === 'retard' && !o.reprise ? dueMarkHTML(e.date)
    : e.genre === 'silence' ? silenceMarkHTML(e.silence) : '';
  return (
    `<div class="act-row aj-rang${o.ici ? ' aj-ici' : ''}" data-id="${esc(e.id)}" data-genre="${e.genre}">
       ${date ? `<div class="act-under act-under-done">${ic('check', 'ic-14')} Fait</div>
                 <div class="act-under act-under-report">${ic('calendar', 'ic-14')} Reporter</div>` : ''}
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-pressed="${o.ici ? 'true' : 'false'}"
              aria-label="${esc(e.nom + ' : ' + (atout ? e.raison : e.titre))}">
           <b class="act-verb">${esc(e.nom)}</b>
           <span class="act-sub">${quoi}${suite}</span>
         </div>
         ${presse ? `<span class="aj-quand">${presse}</span>` : ''}
       </div>
     </div>`);
}
/* plus tard : ce qui est prévu, et le jour — ou le plan « si… alors »
   d'une piste qui attend */
function tardHTML(e, o){
  const quoi = e.genre === 'attente' ? 'Relancer si pas de réponse' : e.titre;
  return (
    `<div class="act-row aj-tard${o.ici ? ' aj-ici' : ''}" data-id="${esc(e.id)}" data-genre="${e.genre}">
       <div class="act-in">
         <div class="act-main sw-cible" role="button" tabindex="0" aria-pressed="${o.ici ? 'true' : 'false'}"
              aria-label="${esc(e.nom + ' : ' + quoi + ', ' + frDate(e.date))}">
           <b class="act-verb">${esc(e.nom)}</b>
           <span class="act-sub"><span class="act-do">${esc(quoi)}</span></span>
         </div>
         <span class="aj-quand"><span class="act-when">${frDate(e.date)}</span></span>
       </div>
     </div>`);
}

/* ---------- ce que l'app a rangé toute seule ----------
   Un fait, et sa sortie : la piste est toujours là (« Mes pistes »,
   clôturée), « Annuler » la rouvre et le silence repart de zéro. */
const rangeesHTML = l => l.map(a =>
  `<div class="aj-range" data-id="${esc(a.id)}">
     ${ic('archive', 'ic-14')}
     <span class="aj-range-t"><b>${esc(a.name)}</b> s’est rangée : ${a.jours} jours sans réponse.</span>
     <button class="btn btn-sm" data-annuler aria-label="Annuler le rangement de ${esc(a.name)}">Annuler</button>
   </div>`).join('');

/* ---------- « Tes amis » (docs/reseau.md, lot 3) ----------
   Quelqu'un ATTEND : un ami cherche une personne chez une entreprise où
   tu en connais une, ou un ami t'a donné le contact que tu cherchais.
   Elle passe donc en tête, avant le travail du jour — une demande
   s'éteint en 14 jours, et c'est la seule ligne de l'écran qui fait
   gagner quelque chose à quelqu'un d'autre. Trois lignes, et la suite à
   un tap. La première dit qui t'a écrit : aucun bouton ne porte de
   chiffre, c'est ici qu'on le lit, à son heure. */
const CAP_AMIS = 3;
function amisHTML(lignes){
  const ecrits = ecritsDuJour();
  const tous = [...(ecrits ? [{ sorte: 'ecrits', id: 'ecrits', nom: ecrits.texte, raison: ecrits.sous, qui: '',
                                aria: [ecrits.texte, ecrits.sous].filter(Boolean).join(', ') }] : []), ...lignes];
  if (!tous.length) return '';
  const items = expanded.has('amis') ? tous : tous.slice(0, CAP_AMIS);
  const more = tous.length > items.length
    ? `<button class="linklike tr-more" data-tr="amis">${voirAutres(tous.length - items.length)}</button>` : '';
  return `<section class="tranche tr-amis">
            <h2 class="tr-h">${ic('users', 'ic-14')} Tes amis${lignes.length ? ` <span class="tr-n">${lignes.length}</span>` : ''}</h2>
            <div class="tr-rows">${items.map(x =>
              `<div class="act-row act-ami" data-sorte="${x.sorte}" data-ami="${esc(x.id)}">
                 <div class="act-in">
                   <div class="act-main sw-cible" role="button" tabindex="0" aria-label="${esc(x.aria || x.raison + ' — ' + x.nom)}">
                     <b class="act-verb">${esc(x.nom)}</b>
                     <span class="act-sub"><span class="act-vecu">${esc(x.raison)}</span><span class="act-who">${esc(x.qui)}</span></span>
                   </div>
                 </div>
               </div>`).join('')}${more}</div>
          </section>`;
}

/* les entrants à trier — une seule ligne calme (#10), plus jamais une
   pile de bandeaux au-dessus du travail du jour */
function triageItems(){
  const items = [];
  if (S.orphans.length) items.push({
    n: S.orphans.length, icon: 'contact', label: 'Contacts à rattacher',
    open: () => { location.hash = '#/pistes'; } });
  const recv = receivedTodayCount();
  if (recv) items.push({
    n: recv, icon: 'inbox', label: 'Reçu du groupe',
    open: () => { location.hash = '#/pistes'; } });
  const analysis = ORDINATEUR ? mailAnalysis() : null;
  if (analysis && analysis.state === 'ready') items.push({
    n: analysis.count, icon: 'sparkles', label: 'Pistes lues dans tes e-mails',
    open: openPendingMailAnalysis });
  const nProps = ORDINATEUR ? pendingProposals().reduce((n, p) => n + p.n, 0) : 0;
  if (nProps) items.push({
    n: nProps, icon: 'sparkles', label: 'Ton assistant propose',
    open: openPendingProposals });
  return { items, total: items.reduce((s, x) => s + x.n, 0) };
}
function openTriage(items){
  if (items.length === 1){ items[0].open(); return; }
  const sh = openSheet({ title: 'À trier', icon: 'inbox' });
  sh.body.innerHTML =
    `<div class="pick-list">${items.map((x, i) =>
      `<button class="pick" data-i="${i}">
         <b>${ic(x.icon, 'ic-14')} ${esc(x.label)}</b><span>${x.n}</span>
       </button>`).join('')}</div>`;
  sh.body.querySelectorAll('.pick').forEach(b =>
    b.addEventListener('click', () => { sh.close(); items[+b.dataset.i].open(); }));
}

/* ============================================================
   LA FENÊTRE « MAINTENANT »
   Une boîte de dialogue 98 : une barre de titre, une question, des
   réponses. Elle porte la piste choisie — ou, quand il n'y en a pas,
   l'étape où en est la recherche.
   ============================================================ */
const fenetre = (titre, corps, o = {}) =>
  `<section class="aj-maint${o.cls ? ' ' + o.cls : ''}" id="ajMaint" aria-label="${esc(titre)}"${o.id ? ` data-id="${esc(o.id)}" data-genre="${o.genre}"` : ''}>
     <div class="mt-h"><h2 class="mt-t">${esc(titre)}</h2></div>
     <div class="mt-b">${corps}</div>
   </section>`;

/* « Plus tard » : choisir QUAND. Une action datée se reporte ; une
   proposition (une piste à démarrer, un silence) prend une date et passe
   dans « Bientôt ». Décider quand aide nettement à faire (§6). */
const peutAttendre = e => e.genre !== 'contrat' && e.action !== 'quand';
function plusTard(c, e){
  if (e.genre === 'retard' || e.genre === 'jour' || e.genre === 'prevu') return reportAction(c);
  askNextAction(c, { preset: e.titre, ctId: e.ct || undefined, title: 'Plus tard : quand ?' });
}

/* le contexte, au poste : de quoi agir sans ouvrir la fiche */
function contexteHTML(c){
  const gens = (c.contacts || []).filter(t => t.email || t.phone).slice(0, 2);
  const autres = (c.contacts || []).length - gens.length;
  const note = String(c.notes || '').trim();
  const blocs = [];
  if (gens.length) blocs.push(
    `<div class="mt-bloc"><h3 class="mt-lbl">Contacts</h3>
       ${gens.map(t =>
         `<div class="mt-ct">
            <span class="mt-ct-n"><b>${esc(t.name || 'Contact')}</b>${t.role ? ` <span>${esc(t.role)}</span>` : ''}</span>
            ${t.email ? `<button class="linklike mt-ct-m" data-ecrire="${esc(t.id)}">${esc(t.email)}</button>` : ''}
            ${t.phone ? `<span class="mt-ct-t">${esc(t.phone)}</span>` : ''}
          </div>`).join('')}
       ${autres > 0 ? `<p class="mt-suite">+ ${autres} autre${autres > 1 ? 's' : ''} dans la fiche</p>` : ''}
     </div>`);
  if (note) blocs.push(
    `<div class="mt-bloc"><h3 class="mt-lbl">Mes notes</h3><p class="mt-note">${esc(note)}</p></div>`);
  return blocs.join('');
}

function maintenantHTML(x){
  const { sel, c, wide } = x;
  /* ---- une piste est choisie ---- */
  if (sel && c){
    const e = sel;
    const lieu = [c.city, c.domain && c.domain !== 'autre' ? (DOMAINS[c.domain] || {}).label : ''].filter(Boolean).join(' · ');
    const f = dernierFait(c);
    const presse = e.genre === 'retard' && !x.reprise ? dueMarkHTML(e.date)
      : e.genre === 'silence' ? silenceMarkHTML(e.silence) : '';
    const plan = e.genre === 'attente' ? `Relance prévue ${frDate(e.date)}, si rien ne vient.`
      : e.genre === 'prevu' ? `Prévu ${frDate(e.date)}.` : '';
    const maintenant = e.quand === 'maintenant';
    const boutons = maintenant
      ? `${peutAttendre(e) ? `<button class="btn" data-plus-tard>Plus tard</button>` : ''}
         <button class="btn btn-primary aj-geste" data-geste aria-label="${esc(e.bouton + ' — ' + e.nom)}">${ic(e.icone, 'ic-14')} ${esc(e.bouton)}</button>`
      : `${e.genre === 'prevu' ? `<button class="btn" data-plus-tard>Reporter</button>` : ''}
         <button class="btn" data-ouvrir>${ic('briefcase', 'ic-14')} Ouvrir la fiche</button>`;
    return fenetre(maintenant ? (x.reprise ? 'Pour reprendre' : 'Maintenant') : 'Bientôt',
      /* tout ce qui se LIT de la piste est un seul bouton : il ouvre la
         fiche — le lecteur s'agrandit */
      `<button class="mt-nom" data-ouvrir aria-label="Ouvrir la fiche de ${esc(c.name)}">
         <span class="mt-nom-t">
           <b>${esc(c.name)}</b>
           ${lieu ? `<span class="mt-lieu">${esc(lieu)}</span>` : ''}
           <span class="mt-quoi"><span class="mt-etape">${esc(e.titre)}</span>${presse}</span>
           ${e.raison && e.genre === 'demarrer' ? `<span class="mt-atout">${esc(e.raison)}</span>` : ''}
           ${plan ? `<span class="mt-plan">${esc(plan)}</span>` : ''}
           ${e.genre === 'contrat' ? `<span class="mt-plan">${esc([e.sous, e.note].filter(Boolean).join('. '))}</span>` : ''}
           ${f ? `<span class="mt-ctx"><span>${esc(frDate(f.d))}</span> ${esc(f.t)}</span>` : ''}
         </span>
         ${ic(wide ? 'chevron-right' : 'chevron-up', 'ic-14')}
       </button>
       ${wide ? contexteHTML(c) : ''}
       <div class="mt-f">${boutons}</div>`,
      { id: c.id, genre: e.genre });
  }
  /* ---- app neuve : la cible d'abord, puis de quoi commencer ---- */
  if (x.neuf){
    const cible = cibleDite();
    return fenetre('Pour commencer',
      `${cible ? `<p class="mt-quoi"><span class="mt-etape">${esc(cible)}</span></p>` : pucesCible()}
       ${/* UNE question à la fois : tant que la cible n'est pas dite, ses
            trois puces sont la réponse attendue — aucun bouton rempli ne
            leur dispute la place. Dite, « Trouver des entreprises »
            devient le geste. */''}
       <div class="mt-f">
         <button class="btn" id="tdeAdd">${ic('plus', 'ic-14')} Ajouter une piste</button>
         ${cible ? `<button class="btn btn-primary" id="tdeTrouver">${ic('search', 'ic-14')} Trouver des entreprises</button>` : ''}
       </div>`, { cls: 'aj-accueil' });
  }
  /* ---- rien à faire maintenant : le dire, et montrer ce qui vient ---- */
  const suivant = x.tard[0];
  const cible = cibleDite();
  return fenetre('Maintenant',
    `<div class="td-empty td-clear">
       <div class="tde-ic${suivant ? '' : ' ok'}">${ic(suivant ? 'calendar' : 'check', 'ic-24')}</div>
       <h2>${suivant ? 'Rien à faire aujourd’hui' : 'Tout est à jour'}</h2>
     </div>
     ${suivant ? `<p class="mt-plan">Ensuite : ${esc(suivant.nom)}, ${esc(frDate(suivant.date))}.</p>` : ''}
     <div class="mt-f">
       ${cible ? `<button class="btn" id="tdeTrouver">${ic('search', 'ic-14')} Trouver des entreprises</button>`
               : `<button class="btn" id="tdeAdd">${ic('plus', 'ic-14')} Ajouter une piste</button>`}
     </div>`, { cls: 'aj-calme' });
}

export function renderToday(){
  const root = $('#view-aujourdhui');
  const today = todayISO();
  const wide = mqWide.matches;
  const f = aFaire(S.companies, { today, profile: S.profile, portes: portesDuJour(), peutDemander: peutDemanderAmis() });
  /* REVENIR NE COÛTE RIEN : après une semaine sans geste, trois lignes
     pour reprendre, et plus un seul compte de jours de retard */
  const reprise = enPause(S.companies, S.journal);
  const file = [...f.engage, ...f.propose];
  /* tout ce qui est engagé se montre ; ce que l'app propose complète
     jusqu'à trois lignes — le reste est à un tap */
  const base = reprise ? FILE : Math.max(f.engage.length, FILE);
  const visibles = expanded.has('faire') ? file : file.slice(0, base);
  const tard = [...f.bientot, ...f.attente].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)) || String(a.nom).localeCompare(String(b.nom), 'fr'));
  const tardVus = tard.slice(0, expanded.has('soon') ? tard.length : CAP);
  const rangees = annonces(S.companies, today);
  const faits = faitsDuJour();
  const triage = triageItems();
  const neuf = !S.companies.length;
  const byId = id => S.companies.find(x => x.id === id);

  /* ---- la piste chargée dans « Maintenant » ----
     Celle qu'on a choisie tant qu'elle est à l'écran ; sinon la première
     de la file. Rien à faire : personne — la fenêtre dit où en est la
     recherche. */
  const montrees = [...visibles, ...tardVus];
  let sel = montrees.find(e => e.id === choisie) || visibles[0] || null;
  choisie = sel ? sel.id : null;
  const cSel = sel ? byId(sel.id) : null;
  if (!cSel) sel = null;

  /* ---- la file ---- */
  let liste = '';
  if (visibles.length){
    const more = file.length > visibles.length
      ? `<button class="linklike tr-more" data-tr="faire">${voirAutres(file.length - visibles.length)}</button>` : '';
    liste +=
      `<section class="tranche tr-faire">
         <h2 class="tr-h">${ic('zap', 'ic-14')} ${reprise ? 'Pour reprendre' : 'À faire'}</h2>
         <div class="tr-rows">${visibles.map(e => rangHTML(e, { ici: sel && sel.id === e.id, reprise })).join('')}${more}</div>
       </section>`;
  }
  if (tard.length){
    const more = tard.length > tardVus.length
      ? `<button class="linklike tr-more" data-tr="soon">${voirAutres(tard.length - tardVus.length)}</button>` : '';
    liste +=
      `<section class="tranche tr-soon">
         <h2 class="tr-h">${ic('calendar', 'ic-14')} Bientôt</h2>
         <div class="tr-rows">${tardVus.map(e => tardHTML(e, { ici: sel && sel.id === e.id })).join('')}${more}</div>
       </section>`;
  }
  if (faits.length && !neuf)
    liste +=
      `<section class="tranche tr-fait">
         <h2 class="tr-h">${ic('check', 'ic-14')} Fait aujourd’hui</h2>
         <div class="tr-rows">${faits.map(t => `<div class="aj-fait">${ic('check', 'ic-14')}<span>${esc(t)}</span></div>`).join('')}</div>
       </section>`;
  if (liste) liste = `<div class="aj-liste">${liste}</div>`;

  /* ---- le travail : tes amis, la file, ce qui s'est rangé ---- */
  let travail = amisHTML(lignesAmis());
  if (neuf){
    /* première visite : la promesse. Le geste est dans la fenêtre ; ce
       que l'écran suivant montre, celui-ci n'a pas à le dire (§7). */
    travail +=
      `<div class="td-empty">
         <div class="tde-ic">${ic('zap', 'ic-24')}</div>
         <h2>Ta recherche, un jour à la fois</h2>
         <div class="tde-actions">
           <button class="btn" id="tdeDemo">Voir un exemple</button>
           ${/* UN SEUL MOI (lot R5) : sur un téléphone neuf, c'est ICI que
                l'on arrive — la phrase de secours ramène tout */''}
           <button class="btn" id="tdeMoi">J’ai déjà OpenContact</button>
         </div>
       </div>`;
  }
  travail += liste + rangeesHTML(rangees);
  /* les campagnes du jour — SOUS le travail, jamais tronquées (#10) */
  if (CAMPAGNES) travail += campaignLines().map(l =>
    `<button class="camp-line" data-camp="${esc(l.id)}">${ic('flag', 'ic-14')} <span>${esc(l.txt)}</span> <em>Voir</em></button>`).join('');

  /* ---- le pied : ce qui suit le travail du jour ---- */
  let pied = '';
  if (triage.total)
    pied += `<button class="td-triage" id="tdTriage">${ic('inbox', 'ic-14')} À trier <span class="tr-n">${triage.total}</span></button>`;
  /* LE LIEN DU PIED MÈNE À CE QU'IL NOMME (§5, promesse 5), et n'existe
     que s'il ajoute à l'écran : il compte les pistes « à contacter » —
     le mot de « Mes pistes » et de la barre — et se tait quand toutes
     sont déjà dans la file. */
  const aContacter = S.companies.filter(c => !c.closedReason && (c.status || 'todo') === 'todo');
  if (aContacter.some(c => !visibles.some(e => e.id === c.id)) && !neuf)
    pied += `<button class="td-foot linklike" id="tdNoAct">${aContacter.length} piste${aContacter.length > 1 ? 's' : ''} à contacter →</button>`;
  if (hasDemo())
    pied += `<button class="td-foot linklike" id="tdRmDemo">Retirer les pistes d’exemple</button>`;
  if (pied) pied = `<div class="td-under">${pied}</div>`;

  const tete =
    `<div class="td-head">
       <h1>Aujourd’hui</h1>
       <div class="td-date">${frToday()}</div>
     </div>${cibleHTML(neuf)}`;
  const maint = maintenantHTML({ sel, c: cSel, wide, reprise, neuf, tard });

  root.innerHTML = wide
    ? `<div class="page-inner page-wide aj aj-pc">
         ${tete}
         <div class="aj-cols">
           <div class="aj-travail">${travail}${pied}</div>
           <aside class="aj-contexte">${maint}</aside>
         </div>
       </div>`
    : `<div class="page-inner aj aj-tel">
         ${tete}${travail}${pied}
         <div class="aj-quai">${maint}</div>
       </div>`;

  /* la place que prend le quai : la barre « Annuler » et le toast se
     posent au-dessus de lui, jamais sur son bouton */
  const quai = root.querySelector('.aj-quai');
  document.documentElement.style.setProperty('--quai-h', (quai ? quai.offsetHeight : 0) + 'px');

  /* ce qui vient de se charger dans la fenêtre se dit, une fois */
  const aDire = sel ? `${sel.nom} : ${sel.titre}` : '';
  if (aDire && dite && aDire !== dite) annoncer(aDire);
  dite = aDire;

  /* ---- branchements ---- */
  const ouvrable = (cible, ouvrir) => {
    cible.addEventListener('click', ouvrir);
    cible.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
    });
  };
  /* TOUCHER UNE LIGNE LA CHARGE dans la fenêtre ; la retoucher ouvre la
     fiche — le même geste, un cran plus loin */
  const choisir = (id, focus) => {
    if (choisie === id){ const c = byId(id); if (c) openFiche(c); return; }
    choisie = id;
    renderToday();
    if (focus) root.querySelector(`.act-row[data-id="${CSS.escape(id)}"] .act-main`)?.focus({ preventScroll: true });
  };
  const rangs = [...root.querySelectorAll('.aj-rang, .aj-tard')];
  rangs.forEach((row, i) => {
    const c = byId(row.dataset.id);
    if (!c) return;
    const main = row.querySelector('.act-main');
    main.addEventListener('click', () => choisir(c.id, true));
    main.addEventListener('keydown', ev => {
      if (ev.key === ' '){ ev.preventDefault(); choisir(c.id, true); }
      /* Entrée : la ligne est choisie, la main passe au geste */
      else if (ev.key === 'Enter'){
        ev.preventDefault();
        if (choisie !== c.id){ choisie = c.id; renderToday(); }
        $('#ajMaint .mt-f .btn-primary, #ajMaint .mt-f .btn:last-child')?.focus();
      }
      /* ↑ ↓ : la file se parcourt, et la fenêtre suit */
      else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
        const voisin = rangs[i + (ev.key === 'ArrowDown' ? 1 : -1)];
        if (!voisin) return;
        ev.preventDefault();
        choisie = voisin.dataset.id;
        renderToday();
        root.querySelector(`.act-row[data-id="${CSS.escape(choisie)}"] .act-main`)?.focus();
      }
    });
    /* ce qui est daté se glisse : droite = Fait, gauche = Reporter */
    if (row.querySelector('.act-under')) bindSwipe(row, c);
  });
  /* la fenêtre : le geste, « Plus tard », la fiche */
  const m = root.querySelector('#ajMaint');
  if (m && sel && cSel){
    m.querySelector('[data-geste]')?.addEventListener('click', () => faireEtape(cSel, sel));
    m.querySelector('[data-plus-tard]')?.addEventListener('click', () => plusTard(cSel, sel));
    m.querySelectorAll('[data-ouvrir]').forEach(b => b.addEventListener('click', () => openFiche(cSel)));
    m.querySelectorAll('[data-ecrire]').forEach(b => b.addEventListener('click', () => openMail(cSel, { ctId: b.dataset.ecrire })));
  }
  root.querySelectorAll('.act-ami').forEach(row => {
    /* « Karim et Léa t'ont écrit » ouvre la boîte sur « Non lus » ; les
       autres lignes, ce qu'elles disent */
    ouvrable(row.querySelector('.act-main'), () =>
      row.dataset.sorte === 'ecrits' ? ouvrirNonLus() : ouvrirLigne(row.dataset.sorte, row.dataset.ami));
  });
  root.querySelectorAll('.aj-range [data-annuler]').forEach(b => b.addEventListener('click', () => {
    const c = byId(b.closest('.aj-range').dataset.id);
    if (c) annulerRangement(c);
  }));
  root.querySelector('#ajCible')?.addEventListener('click', () =>
    import('./profil.js').then(m => m.openProfil(() => bus.refresh())));
  /* la cible, d'un tap : c'est un réglage du profil, il se change là */
  root.querySelectorAll('[data-cherche]').forEach(b => b.addEventListener('click', () => {
    S.profile.recherche = b.dataset.cherche;
    saveProfile();
    bus.refresh();
  }));
  root.querySelectorAll('.tr-more').forEach(b =>
    b.addEventListener('click', () => { expanded.add(b.dataset.tr); renderToday(); }));
  root.querySelectorAll('[data-camp]').forEach(b =>
    b.addEventListener('click', () => openCampaignById(b.dataset.camp)));
  root.querySelector('#tdTriage')?.addEventListener('click', () => openTriage(triage.items));
  root.querySelector('#tdNoAct')?.addEventListener('click', () => ouvrirSur('à contacter'));
  root.querySelector('#tdeAdd')?.addEventListener('click', () => openCapture());
  /* la cible est dite : l'app sait quoi chercher — ce que tu cherches,
     ton métier, ta ville, dans l'annuaire des entreprises */
  root.querySelector('#tdeTrouver')?.addEventListener('click', () => {
    const q = amorces({ companies: [], profile: S.profile, today })[0] || '';
    ouvrirSur(q, 'decouvrir');
  });
  /* pas de toast : les pistes d'exemple arrivent sous les yeux, et
     « Retirer les pistes d'exemple » s'affiche au pied du même écran */
  root.querySelector('#tdeDemo')?.addEventListener('click', () => { addDemo(); bus.refresh(); });
  root.querySelector('#tdeMoi')?.addEventListener('click', () =>
    import('./moi-phrase.js').then(m => m.ouvrirRetrouver()));
  root.querySelector('#tdRmDemo')?.addEventListener('click', () => { removeDemo(); bus.refresh(); });
}

/* la ligne se vide : petit temps d'effacement, puis la suite */
function finishRow(row, c){
  if (row.classList.contains('act-gone')) return;   /* double-tap = un seul « Fait » */
  row.classList.add('act-gone');
  setTimeout(() => marquerFait(c), 160);
}

/* swipe mobile : droite = Fait, gauche = Reporter */
function bindSwipe(row, c){
  if (!matchMedia('(pointer:coarse)').matches) return;
  const inner = row.querySelector('.act-in');
  let x0 = null, y0 = null, dx = 0, active = false;
  const auRepos = () => {
    x0 = null; dx = 0; active = false;
    inner.style.transform = '';
    row.classList.remove('swipe-done', 'swipe-report');
  };
  row.addEventListener('touchstart', e => {
    auRepos();
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  row.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!active){
      if (Math.abs(mx) < 12 || Math.abs(mx) < Math.abs(my) * 1.4) return;
      active = true;
    }
    dx = Math.max(-96, Math.min(96, mx));
    inner.style.transform = `translateX(${dx}px)`;
    row.classList.toggle('swipe-done', dx > 24);
    row.classList.toggle('swipe-report', dx < -24);
  }, { passive: true });
  row.addEventListener('touchend', () => {
    if (active){
      /* la ligne part en s'effaçant : elle garde son décalage pendant
         les 160 ms de `act-gone` — la remettre droite la ferait sauter */
      if (dx > 72){ x0 = null; dx = 0; active = false; finishRow(row, c); return; }
      if (dx < -72) reportAction(c);
    }
    auRepos();
  });
  row.addEventListener('touchcancel', () => { if (x0 != null) auRepos(); });
}
