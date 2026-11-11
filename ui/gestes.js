/* ============================================================
   OpenContact — interface · faire une étape, faire un geste
   (la refonte — « l'app fait le travail », fiche 0014)

   Le moteur dit QUOI faire sur une piste : sa prochaine étape
   (`engine/etape.js`) ou le geste compris par la barre
   (`engine/commande.js`). Ici, on le FAIT — le même chemin depuis
   « Aujourd'hui », la fiche et la barre, pour que le même bouton fasse
   la même chose partout.

   Deux sortes de gestes, et la différence se tient (invariant ②) :
   · celui qui OUVRE quelque chose (le mail, une feuille de date, un
     numéro) ne change rien tant qu'on n'a pas validé là-bas ;
   · celui qui CHANGE une donnée d'un tap (planifier, noter, clôturer,
     cocher une étape du contrat) offre « Annuler » ~30 s, et annuler
     remet la piste exactement comme elle était.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { pushHist, STATUSES, CLOSE_REASONS } from '../engine/model.js';
import { cocherSuite, suiteDe } from '../engine/contrat.js';
import { tomberRelance } from '../engine/etape.js';
import { jourEnMots } from '../engine/commande.js';
import { sortir } from '../engine/rangement.js';
import { S, bus, saveData, logJ, setNextAction, markDone, closePiste, reopenPiste, activateContact } from './state.js';
import { showUndo, ic } from './dom.js';
import { askNextAction, reportAction, ouvrirAgenda } from './actions.js';
import { openMail } from './mail.js';
import { telHref, openContactEditor } from './contact.js';
import { ouvrirDecroche } from './aide.js';

/* ---------- « Annuler » remet la piste telle qu'elle était ---------- */
const photo = c => JSON.stringify(c);
function remettre(c, avant){
  const v = JSON.parse(avant);
  for (const k of Object.keys(c)) delete c[k];
  Object.assign(c, v);
  c.updatedAt = Date.now();
  saveData();
  bus.refresh();
}
const fait = `${ic('check', 'ic-14')} `;
const annulable = (c, avant, html) => showUndo(html, () => remettre(c, avant));
const contactDe = (c, id) => (c.contacts || []).find(t => t.id === id) || null;

/* « Fait » : l'action prévue est cochée, et la suite se décide tout de
   suite — décider QUAND aide nettement à faire (§6). */
export function marquerFait(c){
  markDone(c);
  bus.refresh();
  askNextAction(c, { title: 'Et ensuite ?' });
}

/* Cocher une étape de la suite d'un « Décroché » (engine/contrat.js) */
export function cocherEtape(c, id){
  const s = suiteDe(c, S.profile);
  const e = s && s.etapes.find(x => x.id === id);
  if (!e) return;
  const avant = photo(c);
  c.suite = cocherSuite(c, S.profile, id, todayISO());
  c.updatedAt = Date.now();
  if (!e.fait) pushHist(c, 'Fait : ' + e.label);
  saveData();
  bus.refresh();
  if (!e.fait) annulable(c, avant, fait + esc(e.label));
}

/* L'app avait rangé la piste toute seule : « Annuler » la rend */
export function annulerRangement(c){
  sortir(c, todayISO());
  logJ('Rouverte : ' + c.name, c.id);
  saveData();
  bus.refresh();
}

/* ---------- la prochaine étape d'une piste (engine/etape.js) ---------- */
export async function faireEtape(c, e, o = {}){
  if (!c || !e) return;
  const apres = o.apres || (() => bus.refresh());
  switch (e.action){
    case 'mail': openMail(c, { ctId: e.ct || undefined }); return;
    case 'tel': {
      const t = contactDe(c, e.ct);
      if (t) activateContact(c, t);
      location.href = telHref(e.tel);
      return;
    }
    case 'fait': marquerFait(c); return;
    case 'cocher': cocherEtape(c, e.etape); return;
    case 'quand': askNextAction(c, { ...(e.texte ? { preset: e.texte } : {}), ctId: e.ct || undefined,
      title: e.genre === 'silence' ? 'Relancer quand ?' : 'Et ensuite ?' }); return;
    case 'porteur': (await import('./fiche.js')).demanderAuPorteur(c); return;
    case 'amis': (await import('./reseau.js')).ouvrirDemander(c, apres); return;
    case 'contact': {
      const { dirigeantsSuggeres } = await import('./fiche-annuaire.js');
      openContactEditor({ company: c, onDone: apres, suggestions: dirigeantsSuggeres(c) });
      return;
    }
    default: (await import('./fiche.js')).openFiche(c);
  }
}

/* ---------- le geste compris par la barre (engine/commande.js) ---------- */
export async function faireGeste(g){
  const c = S.companies.find(x => x.id === g.id);
  if (!c) return;
  const avant = photo(c);
  const nom = esc(c.name);
  switch (g.action){
    case 'mail': openMail(c, { ctId: g.ct || undefined }); return;
    case 'tel': {
      const t = contactDe(c, g.ct);
      if (t) activateContact(c, t);
      location.href = telHref(g.tel);
      return;
    }
    case 'quand': askNextAction(c, { preset: g.texte, ctId: g.ct || undefined }); return;
    case 'reporter': reportAction(c); return;
    case 'demander': (await import('./reseau.js')).ouvrirDemander(c, () => bus.refresh()); return;
    case 'fait': marquerFait(c); return;
    case 'plan': {
      /* un entretien, c'est qu'on t'a répondu : le statut suit */
      if (g.statut && STATUSES[g.statut] && c.status !== g.statut){
        c.status = g.statut;
        pushHist(c, 'Statut → ' + STATUSES[g.statut].label);
      }
      setNextAction(c, g.texte, g.date, g.ct || undefined);
      /* qui veut ses rappels les veut à chaque fois (`flags.rappelAgenda`) —
         et l'on est DANS le geste : le navigateur laisse ouvrir l'agenda */
      if ((S.profile.flags || {}).rappelAgenda) ouvrirAgenda(c, g.texte, g.date, g.heure);
      bus.refresh();
      annulable(c, avant, `${fait}${esc(g.texte)} · ${nom}, ${esc(jourEnMots(g.date))}`);
      return;
    }
    case 'statut': {
      c.status = g.statut;
      c.updatedAt = Date.now();
      /* la réponse est arrivée : la relance prévue tombe (le plan était
         « relancer SI pas de réponse ») — « Annuler » la remet */
      if (g.statut === 'reply') tomberRelance(c);
      pushHist(c, 'Réponse reçue');
      logJ('Réponse reçue : ' + c.name, c.id);
      saveData();
      bus.refresh();
      annulable(c, avant, `${fait}Réponse reçue · ${nom}`);
      askNextAction(c, { title: 'Et ensuite ?' });
      return;
    }
    case 'clore': {
      closePiste(c, g.raison);
      bus.refresh();
      annulable(c, avant, `${fait}${esc(CLOSE_REASONS[g.raison].label)} · ${nom}`);
      /* « Décroché » propose d'aider à son tour (ui/aide.js) ; la suite
         du contrat, elle, attend sur « Aujourd'hui » et sur la fiche */
      if (g.raison === 'won') ouvrirDecroche(c);
      return;
    }
    case 'rouvrir': {
      reopenPiste(c);
      bus.refresh();
      annulable(c, avant, `${fait}Rouverte · ${nom}`);
      return;
    }
    case 'note': {
      c.notes = c.notes ? String(c.notes).replace(/\s+$/, '') + '\n' + g.texte : g.texte;
      c.updatedAt = Date.now();
      pushHist(c, 'Note ajoutée');
      saveData();
      bus.refresh();
      annulable(c, avant, `${fait}Noté · ${nom}`);
      return;
    }
  }
}
