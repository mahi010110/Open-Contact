/* ============================================================
   OpenContact — interface · UN SEUL « MOI » (lot R5)
   (docs/propositions/R5-un-seul-moi.md, analyse des menaces comprise)

   Une phrase de douze mots, et trois choses qu'elle fait :
   · elle se crée dans « Ma copie » (« Phrase de secours »), ou en
     protégeant ses données — c'est LA MÊME : le coffre n'en a qu'une
     (ui/verrou.js l'adopte à chaque fois qu'il s'en donne une) ;
   · tant qu'elle existe, la copie se DÉPOSE toute seule sur les relais,
     scellée, à l'ouverture et quand elle a changé (engine/moi.js) —
     sans phrase, rien ne part ;
   · sur un téléphone neuf, « J'ai déjà OpenContact » : les douze mots,
     ce qui revient, « Ramener », puis « Annuler » (invariant ②). La
     fusion est celle de mes appareils : rien ne s'écrase.
   L'appareil garde les CLÉS tirées de la phrase, jamais la phrase
   (oc_moi_v1, scellé par le coffre s'il y en a un).
   ============================================================ */
import { esc, localISO } from '../engine/utils.js';
import { MOI_KEY, SYNC_KEY, kvGet, kvSet } from '../engine/storage.js';
import { phraseUnknownWords, makeVaultPhrase } from '../engine/vault.js';
import { fullPayload } from '../engine/exchange.js';
import { syncMerge } from '../engine/sync.js';
import { defautPhrase, clesDe, clesValides, semaineDe, etiquetteSemaine, cleSemaine, posteSemaine, nouvelAppareil,
         sceller, ouvrirScelle, decouper, evenementsDepot, rassembler, fusionnerCopies, fautDeposer, empreinte,
         MOI_KIND, SEMAINES_LUES } from '../engine/moi.js';
import { S, bus, applySynced, logJ } from './state.js';
import { openSheet, btn, ic, showUndo, clavier } from './dom.js';
import { diffDays } from './dates.js';
import { publierLot, lire } from './reseau.js';
import { isProtected, phraseCeremony, changerPhrase, demanderCode, estPhraseDuCoffre, alignerCoffre } from './verrou.js';
import { startSync, breakLink } from './synclive.js';

const lib = () => import('../assets/vendor/trystero-nostr.min.js');

/* ---------- l'état de cet appareil ---------- */
let etat = null;          /* { v, cles, appareil, depot: { at, empreinte, relais, n } } */
let charge = null;
export function chargerMoi(){
  return charge || (charge = kvGet(MOI_KEY).then(v => {
    const o = JSON.parse(v || 'null');
    etat = o && clesValides(o.cles) && typeof o.appareil === 'string' ? o : null;
  }).catch(() => { etat = null; charge = null; }));
}
const sauver = () => kvSet(MOI_KEY, JSON.stringify(etat)).catch(() => {});
const prevenir = () => document.dispatchEvent(new CustomEvent('oc:moi'));
export const aUnePhrase = () => !!etat;
export const depotAt = () => (etat && etat.depot && etat.depot.at) || 0;
const quand = at => {
  const d = diffDays(localISO(new Date(at)));
  return d === 0 ? 'aujourd’hui' : d === -1 ? 'hier' : 'il y a ' + (-d) + ' j';
};
/* l'état de la rangée « Phrase de secours », en un mot ou deux */
export function etatPhrase(){
  if (!etat) return 'à créer';
  if (etat.trop) return 'copie trop grande';
  return depotAt() ? 'déposée ' + quand(depotAt()) : 'pas encore déposée';
}

/* ---------- adopter une phrase ----------
   Appelé partout où une phrase naît (ici, le coffre, la récupération) et
   quand on ramène ses données. Une phrase qui CHANGE efface ce que cet
   appareil avait déposé sous l'ancienne : « Changer de phrase » rend
   l'ancienne inutile (la parade à une phrase lue, dans la proposition). */
export async function adopterPhrase(phrase, cles){
  await chargerMoi();
  cles = cles || await clesDe(phrase);
  const ancien = etat;
  if (ancien && ancien.cles.scelle === cles.scelle){ deposer(true); return; }
  etat = { v: 1, cles, appareil: (ancien && ancien.appareil) || nouvelAppareil(), depot: null };
  await sauver();
  prevenir();
  if (ancien) effacerDepots(ancien).catch(() => {});
  deposer(true);
}

/* ---------- déposer ---------- */
async function contenu(){
  const c = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
  c.appareil = etat.appareil;
  /* la liaison de mes appareils voyage DANS le scellé : les douze mots
     ramènent aussi le lien, sans phrase de liaison à retaper */
  const liaison = await kvGet(SYNC_KEY).catch(() => '');
  if (liaison) c.liaison = liaison;
  return c;
}
const idDepot = () => nouvelAppareil();
let enCours = null;
export function deposer(force){
  if (!etat) return Promise.resolve(false);
  if (enCours) return enCours;
  const e0 = etat;
  enCours = (async () => {
    const now = Date.now();
    const c = await contenu();
    const emp = await empreinte(c);
    if (!force && !fautDeposer(e0.depot, emp, now)) return false;
    const morceaux = decouper(await sceller(e0.cles, c), idDepot());
    if (!morceaux){
      /* au-delà de 64 morceaux, la copie ne se dépose pas : le fichier
         de copie reste le chemin, et la rangée le dit */
      if (!e0.trop){ e0.trop = true; await sauver(); prevenir(); }
      return false;
    }
    const sem = semaineDe(now);
    const sk = await cleSemaine(e0.cles, sem);
    const eti = await etiquetteSemaine(e0.cles, sem);
    const poste = await posteSemaine(e0.cles, e0.appareil, sem);
    const { relayTopic } = await lib();
    const evs = [];
    for (const e of evenementsDepot(eti, poste, morceaux, now))
      evs.push(await relayTopic.evenementCle(sk, e.kind, e.tags, e.contenu));
    const n = await publierLot(evs);
    if (!n || etat !== e0) return false;
    e0.depot = { at: now, empreinte: emp, relais: n, n: Math.max(morceaux.length, (e0.depot && e0.depot.n) || 0) };
    delete e0.trop;
    await sauver();
    prevenir();
    return true;
  })().catch(() => false).finally(() => { enCours = null; });
  return enCours;
}
/* ce que cet appareil avait déposé sous une ANCIENNE phrase : remplacé
   par du vide (NIP-33) et demandé à l'effacement (NIP-09), semaine par
   semaine. Au mieux : un relais qui ne fait ni l'un ni l'autre l'oublie
   à l'expiration. */
async function effacerDepots(ancien){
  const { relayTopic } = await lib();
  const now = Date.now(), s0 = semaineDe(now);
  const n = Math.max(1, (ancien.depot && ancien.depot.n) || 1);
  const exp = String(Math.floor(now / 1000) + 86400);
  const evs = [];
  for (let i = 0; i < SEMAINES_LUES; i++){
    const sk = await cleSemaine(ancien.cles, s0 - i);
    const eti = await etiquetteSemaine(ancien.cles, s0 - i);
    const poste = await posteSemaine(ancien.cles, ancien.appareil, s0 - i);
    const pub = relayTopic.clePublique(sk);
    const ds = [...Array(n).keys()].map(j => eti + '.' + poste + '.' + j);
    for (const d of ds) evs.push(await relayTopic.evenementCle(sk, MOI_KIND, [['d', d], ['x', eti], ['expiration', exp]], ''));
    evs.push(await relayTopic.evenementCle(sk, 5, ds.map(d => ['a', MOI_KIND + ':' + pub + ':' + d]), ''));
  }
  await publierLot(evs);
}

/* ---------- au fil des ouvertures ----------
   Une tentative à l'ouverture, au retour sur l'app, en la quittant, et
   tous les quarts d'heure tant qu'elle est à l'écran. `fautDeposer`
   décide : rien ne part si rien n'a changé dans la semaine. */
let derniere = 0;
const tenter = () => {
  if (!etat || Date.now() - derniere < 60000) return;
  derniere = Date.now();
  deposer();
};
export function demarrerMoi(){
  chargerMoi().then(tenter);
  document.addEventListener('visibilitychange', tenter);
  setInterval(() => { if (document.visibilityState === 'visible') tenter(); }, 15 * 60000);
}

/* ---------- retrouver ---------- */
async function chercherCopie(cles){
  const { relayTopic } = await lib();
  const s0 = semaineDe(Date.now());
  const auteurs = [], xs = [];
  for (let i = 0; i < SEMAINES_LUES; i++){
    auteurs.push(relayTopic.clePublique(await cleSemaine(cles, s0 - i)));
    xs.push(await etiquetteSemaine(cles, s0 - i));
  }
  const { evs, lus } = await lire({ kinds: [MOI_KIND], authors: auteurs, '#x': xs });
  const siens = new Set(auteurs);
  const ouverts = [];
  for (const d of rassembler(evs.filter(e => siens.has(e.pubkey)))){
    try { ouverts.push({ at: d.at, obj: await ouvrirScelle(cles, d.texte) }); } catch (e) {}
  }
  return { copie: fusionnerCopies(ouverts), lus };
}

const pluriel = (n, mot) => `<b>${n}</b> ${mot}${n > 1 ? 's' : ''}`;
const dateLongue = at => new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/* les douze mots, puis ce qui revient. `sh` : la feuille où l'on est
   déjà (depuis « Phrase de secours »), sinon une neuve. */
export function ouvrirRetrouver(sh){
  sh = sh || openSheet({ title: 'Retrouver', icon: 'lock', focus: '#mpPhrase' });
  sh.setTitle('Retrouver');
  const q = s => sh.body.querySelector(s);
  sh.body.innerHTML =
    `<div class="field"><label for="mpPhrase">Ta phrase de secours</label>
       <textarea id="mpPhrase" rows="3" autocomplete="off" ${clavier('secret')}
         placeholder="Les 12 mots, dans l’ordre, séparés par des espaces" aria-describedby="mpHint"></textarea>
       <p class="hint" id="mpHint" hidden></p></div>`;
  const champ = q('#mpPhrase');
  if (document.activeElement !== champ) requestAnimationFrame(() => { try { champ.focus(); } catch (e) {} });
  /* l'erreur se dit SOUS le champ, et ce qui a été tapé reste (§6) */
  const dire = txt => {
    const h = q('#mpHint');
    if (!h) return;
    h.hidden = false; h.textContent = txt; h.classList.add('warn');
  };
  const bCherche = btn('Chercher', 'btn-primary', async () => {
    const v = champ.value;
    const d = defautPhrase(v);
    if (d === 'vide'){ dire('Tape les 12 mots de ta phrase.'); return; }
    if (d === 'mot'){ dire('Mot inconnu : « ' + phraseUnknownWords(v)[0] + ' » — vérifie l’orthographe.'); return; }
    if (d === 'nombre'){ dire('Il faut 12 mots, il y en a ' + v.trim().split(/\s+/).length + '.'); return; }
    bCherche.disabled = true;
    bCherche.textContent = 'Recherche…';
    let r = null, cles = null;
    try {
      cles = await clesDe(v);
      r = await chercherCopie(cles);
    } catch (e) {}
    if (!sh.body.isConnected) return;
    bCherche.disabled = false;
    bCherche.textContent = 'Chercher';
    if (r && r.copie){ apercu(sh, r.copie, v, cles); return; }
    /* une phrase que le coffre connaît (d'avant R5) : rien n'a encore
       été déposé sous elle — elle devient la phrase unique */
    if (cles && await estPhraseDuCoffre(v)){
      await adopterPhrase(v, cles);
      sh.close(null, true);
      return;
    }
    dire(!r || !r.lus ? 'Pas de connexion. Réessaie quand tu auras du réseau.'
                      : 'Aucune copie trouvée avec cette phrase. Vérifie l’ordre des mots.');
  });
  sh.setFoot([bCherche]);
}

/* L'APERÇU AVANT (invariant ②) : ce qui revient, compté sur la fusion à
   blanc — la même que celle qui s'appliquera. Rien ne s'écrase : une
   piste plus récente ici reste celle d'ici. */
function apercu(sh, copie, phrase, cles){
  const local = { companies: S.companies, orphans: S.orphans, profile: S.profile, tombs: S.tombs };
  const blanc = syncMerge(copie, local);
  const st = blanc.stats;
  const p = copie.profile || {};
  const vide = !S.companies.length;
  const lignes = [];
  if (vide) lignes.push(`${ic('briefcase', 'ic-14')} ${pluriel(blanc.companies.length, 'piste')}`);
  else {
    if (st.addedC) lignes.push(`${ic('briefcase', 'ic-14')} ${pluriel(st.addedC, 'piste')} en plus`);
    if (st.updatedC) lignes.push(`${ic('briefcase', 'ic-14')} ${pluriel(st.updatedC, 'piste')} plus récente${st.updatedC > 1 ? 's' : ''}`);
  }
  if (st.addedO) lignes.push(`${ic('contact', 'ic-14')} ${pluriel(st.addedO, 'contact')} à rattacher`);
  if (st.profile === 'remote'){
    const plus = [(p.amis || []).length && pluriel(p.amis.length, 'ami'), (p.groupes || []).length && pluriel(p.groupes.length, 'groupe')].filter(Boolean);
    lignes.push(`${ic('user', 'ic-14')} ton profil${plus.length ? ', ' + plus.join(', ') : ''}`);
  }
  const lien = !!copie.liaison;
  if (lien) lignes.push(`${ic('switch', 'ic-14')} le lien avec tes appareils`);
  sh.setTitle('Ta copie');
  sh.body.innerHTML =
    `<p class="pd" style="margin:0 0 10px">Déposée le ${esc(dateLongue(copie.at))}</p>
     ${lignes.length
       ? `<ul class="rc-lines cp-what">${lignes.map(l => `<li>${l}</li>`).join('')}</ul>`
       : `<p class="pd">Cet appareil a déjà tout.</p>`}`;
  sh.setFoot([btn(lignes.length ? 'Ramener' : 'Terminer', 'btn-primary', async () => {
    /* protégé : le code d'abord, comme pour restaurer une copie — et il
       sert à faire de cette phrase celle du coffre aussi */
    const pin = await demanderCode('Ton code, pour ramener');
    if (pin === null) return;
    const snap = {
      companies: JSON.parse(JSON.stringify(S.companies)), orphans: JSON.parse(JSON.stringify(S.orphans)),
      profile: JSON.parse(JSON.stringify(S.profile)), tombs: JSON.parse(JSON.stringify(S.tombs))
    };
    const res = syncMerge(copie, { companies: S.companies, orphans: S.orphans, profile: S.profile, tombs: S.tombs });
    applySynced(res);
    let lie = false;
    if (lien && !(await kvGet(SYNC_KEY).catch(() => ''))){ await startSync(copie.liaison); lie = true; }
    if (pin) await alignerCoffre(phrase, pin);
    await adopterPhrase(phrase, cles);
    const n = res.companies.length;
    logJ('Données ramenées par la phrase de secours : ' + n + ' piste(s)');
    sh.close(null, true);
    bus.refresh();
    if (!lignes.length) return;
    showUndo(`${ic('check', 'ic-14')} Ramené : ${n} piste${n > 1 ? 's' : ''}.`, () => {
      applySynced(snap);
      if (lie) breakLink();
      logJ('Retour des données annulé');
      bus.refresh();
    });
  })]);
}

/* ---------- la rangée « Phrase de secours » ---------- */
export function ouvrirPhrase(){
  const sh = openSheet({ title: 'Phrase de secours', icon: 'lock' });
  const q = s => sh.body.querySelector(s);
  const changer = () => {
    if (isProtected()){ sh.close(null, true); changerPhrase(); return; }
    const neuve = makeVaultPhrase();
    phraseCeremony(sh, neuve, async () => {
      sh.close(null, true);
      await adopterPhrase(neuve);
    });
  };
  if (!etat){
    /* les deux verbes de « Mes appareils » : on CRÉE une phrase qu'on
       n'a pas, on ENTRE celle qu'on a déjà */
    sh.body.innerHTML =
      `<div class="pick-list">
         <button class="pick" id="mpNew"><b>${ic('sparkles', 'ic-14')} Créer ma phrase</b></button>
         <button class="pick" id="mpJoin"><b>${ic('switch', 'ic-14')} Entrer ma phrase</b></button>
       </div>`;
    q('#mpNew').addEventListener('click', changer);
    q('#mpJoin').addEventListener('click', () => ouvrirRetrouver(sh));
    return;
  }
  const d = etat.depot;
  sh.body.innerHTML =
    `<ul class="rc-lines">
       <li id="mpEtat">${ic('upload', 'ic-14')} ${etat.trop
         ? 'Trop grande pour les relais : garde ton fichier de copie.'
         : d ? `Copie déposée ${esc(quand(d.at))} sur <b>${d.relais}</b> relais`
             : 'Copie pas encore déposée'}</li>
     </ul>`;
  /* le seul geste de la feuille tient son pied, sous le pouce (§5) —
     teinté, pas rempli : changer de phrase n'est pas ce qu'on vient
     faire tous les jours */
  const b = btn('Changer de phrase', '', changer, 'reload');
  b.id = 'mpChange';
  sh.setFoot([b]);
}
