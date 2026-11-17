/* ============================================================
   OpenContact · la nouvelle interface · demander à l'annuaire
   (engine/annuaire.js ; docs/recherche.md)

   Repris de ui/decouvrir.js, sans le dessin : poser une question à
   l'annuaire public des entreprises, en suivre les pages, encaisser ses
   refus. Trouver en tient deux : la liste du jour (ce que tes trois
   réponses demandent) et la barre (ce que tu tapes).

   Ce qui part : ce qui décrit une entreprise — un métier en codes
   d'activité, un lieu (le centre d'une ville, jamais ton adresse), une
   taille, des mots qui peuvent nommer une entreprise. Jamais un mot de
   tes notes, de tes contacts, de ton profil ni d'un ami
   (`motsInterdits`). Une question vidée par ce tri ne part pas.
   ============================================================ */
import { todayISO } from '../engine/utils.js';
import { questionsAnnuaire, lireAnnuaire, decouvertes, motsInterdits, genreQuestion, ajoutsProfil,
         loinDe, PAR_PAGE, sirensEcartes } from '../engine/annuaire.js';
import { zoneDe, metierDuProfil, rayonDe } from '../engine/requete.js';
import { portesAmis } from '../engine/amis.js';
import { S } from './etat.js';

const PAUSE = 650;                 /* ms sans frappe avant de demander */
const cache = new Map();           /* url → réponse : on ne redemande pas ce qu'on sait */

const attendre = (ms, signal) => new Promise((ok, ko) => {
  const h = setTimeout(ok, ms);
  signal.addEventListener('abort', () => { clearTimeout(h); ko(Object.assign(new Error('abandon'), { name: 'AbortError' })); });
});
/* RELEVÉ par la sonde : l'annuaire répond « 429 » à des appels
   rapprochés — une classe entière sort par la même adresse. Une seconde
   tentative après un court délai, puis on le dit. */
export async function lireUrl(u, signal){
  for (let essai = 0; essai < 2; essai++){
    const res = await fetch(u, { signal, headers: { accept: 'application/json' }, referrerPolicy: 'no-referrer' });
    if (res.status === 429){
      if (essai === 0){ await attendre(1500, signal); continue; }
      throw Object.assign(new Error('limite'), { limite: true });
    }
    if (!res.ok) throw new Error('statut ' + res.status);
    return res.json();
  }
}
const avecPage = (u, p) => { const x = new URL(u); x.searchParams.set('page', String(p)); return x.toString(); };
const villeDe = interp => {
  const e = ((interp && interp.etiquettes) || []).find(x => x.famille === 'lieu' && x.ville);
  return e ? e.ville : '';
};

/* Un chercheur : une question à la fois, ses pages, son état.
   `notifier` est rappelé à chaque changement d'état (chargement,
   réponse, erreur, réseau revenu). */
export function chercheur(notifier){
  let etat = { cle: '', urls: [], phase: 'repos', parQ: [], ordre: [], total: 0, page: 1, interp: null };
  let ctrl = null, minut = null;

  /* `o.actif` : demander même barre vide (la liste du jour) ;
     `o.sansLieu` : ne pas ajouter la ville du profil (un nom tapé se
     cherche partout) ; `o.immediat` : sans attendre la fin de la frappe */
  function suivre(interp, o){
    o = o || {};
    const pose = !!(o.actif || (interp && (interp.etiquettes.length || interp.texte.length)));
    const aj = pose ? ajoutsProfil(interp, S.profile, { lieu: !!o.sansLieu, metier: !!o.sansMetier })
      : { interp, lieu: null, metier: null };
    interp = aj.interp;
    const aLieu = ((interp && interp.etiquettes) || []).some(e => e.famille === 'lieu');
    const zone = aLieu || o.sansLieu ? null : zoneDe(S.companies);
    const base = { interdits: motsInterdits(S.companies, S.orphans, S.profile), userPos: o.userPos,
                   parDefaut: !!o.actif, rayonVille: rayonDe(S.profile) };
    const urls = questionsAnnuaire(interp, { ...base, zone });
    const cle = urls.join('|');
    if (cle === etat.cle && etat.phase !== 'repos') return false;
    if (ctrl) ctrl.abort();
    clearTimeout(minut);
    const l = ((interp && interp.etiquettes) || []).find(x => x.famille === 'lieu' && Array.isArray(x.centre));
    const centre = l ? { lat: l.centre[0], lng: l.centre[1] } : null;
    etat = { cle, urls, phase: 'repos', parQ: urls.map(() => []), totaux: urls.map(() => 0), ordre: [], total: 0, page: 1,
             genres: urls.map(genreQuestion), ville: villeDe(interp), interp, lieu: l || null,
             userPos: centre || o.userPos || null, loin: centre ? loinDe((l && l.rayon) || rayonDe(S.profile)) : 0 };
    if (!urls.length) return true;
    if (navigator.onLine === false){ etat.phase = 'horsligne'; return true; }
    etat.phase = 'attente';
    minut = setTimeout(() => charger(cle, 1), o.immediat ? 0 : PAUSE);
    return true;
  }

  async function charger(cle, page){
    if (cle !== etat.cle) return;
    etat.phase = page > 1 ? 'plus' : 'charge';
    notifier();
    ctrl = new AbortController();
    const signal = ctrl.signal;
    try {
      const listes = [], totaux = [];
      for (const [k, u0] of etat.urls.entries()){
        const u = avecPage(u0, page);
        let j = cache.get(u);
        if (!j){
          /* plusieurs questions : jamais d'un coup (« 429 » relevé dès
             une dizaine d'appels serrés) */
          if (k > 0) await attendre(300, signal);
          j = await lireUrl(u, signal);
          cache.set(u, j);
        }
        listes.push(lireAnnuaire(j, { ville: etat.ville, userPos: etat.userPos }));
        totaux.push(Number(j && j.total_results) || 0);
      }
      if (cle !== etat.cle) return;
      /* chaque question garde SA liste, pages bout à bout : le rang d'une
         entreprise dans sa question reste son vrai rang (la fusion en
         dépend) */
      etat.parQ = etat.parQ.map((l, k) => (page > 1 ? l : []).concat(listes[k] || []));
      etat.totaux = totaux;
      etat.total = Math.max(0, ...totaux);
      etat.page = page;
      etat.phase = 'ok';
      /* l'ordre de ce qui est DÉJÀ à l'écran ne bouge plus : la suite
         s'ajoute dessous, elle ne rebat pas ce qu'on vient de lire */
      const classees = classer();
      const deja = new Set(page > 1 ? etat.ordre : []);
      etat.ordre = [...(page > 1 ? etat.ordre : []), ...classees.map(r => r.siren).filter(x => !deja.has(x))];
    } catch (e){
      if (e && e.name === 'AbortError') return;
      if (cle !== etat.cle) return;
      etat.phase = navigator.onLine === false ? 'horsligne' : (e && e.limite) ? 'limite' : 'erreur';
    }
    notifier();
  }

  /* une entreprise = une ligne ; ce qui est dans tes pistes ne se redit
   pas, sauf ce que `garder` laisse voir (la ligne reste, « gardée ») */
  const classer = (garder) => decouvertes(etat.parQ,
    S.companies.filter(c => !(garder && garder.has(c.id))),
    { genres: etat.genres, userPos: etat.userPos, ville: etat.ville, loin: etat.loin,
      ecartees: sirensEcartes(S.profile.ecartees), metier: metierDuProfil(S.profile) });

  /* ce qui reste à montrer, dans l'ordre : un ami qui y est passé
     d'abord (le 40 pour 1), puis l'ordre de l'annuaire */
  function visibles(garder){
    const l = classer(garder);
    const rang = new Map(etat.ordre.map((x, i) => [x, i]));
    const portes = portesAmis(l.map(r => ({ id: r.siren, name: r.nom, siren: r.siren })), S.profile.amis, todayISO());
    return l.map(r => ({ ...r, amis: portes.get(r.siren) || null }))
      .sort((a, b) => (!!b.amis - !!a.amis) || ((rang.get(a.siren) ?? 1e9) - (rang.get(b.siren) ?? 1e9)));
  }

  /* le réseau revient : la question en attente part */
  addEventListener('online', () => {
    if (etat.phase !== 'horsligne' || !etat.urls.length) return;
    etat.phase = 'attente';
    notifier();
    charger(etat.cle, 1);
  });
  addEventListener('offline', () => {
    if (etat.phase !== 'attente' && etat.phase !== 'charge') return;
    if (ctrl) ctrl.abort();
    clearTimeout(minut);
    etat.phase = 'horsligne';
    notifier();
  });

  return {
    suivre,
    visibles,
    get etat(){ return etat; },
    /* encore une page au serveur ? */
    reste: () => etat.phase === 'ok' && etat.total > etat.page * PAR_PAGE,
    plus(){ if (etat.phase === 'ok') charger(etat.cle, etat.page + 1); },
    reessayer(){
      for (const u of etat.urls) cache.delete(avecPage(u, etat.page || 1));
      if (navigator.onLine === false){ etat.phase = 'horsligne'; notifier(); return; }
      charger(etat.cle, 1);
    },
    oublier(){ if (ctrl) ctrl.abort(); clearTimeout(minut); etat = { cle: '', urls: [], phase: 'repos', parQ: [], ordre: [], total: 0, page: 1, interp: null }; },
    /* « près de toi » : le compte de la question AUTOUR du point quand
       elle existe — le seul qui dise vraiment « à moins de N km » */
    pres(){
      const i = etat.urls.findIndex(u => u.includes('/near_point'));
      return i >= 0 ? (etat.totaux[i] || 0) : etat.total;
    }
  };
}
