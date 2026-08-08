/* ============================================================
   OpenContact — interface · état & persistance
   L'état de l'application, son chargement (avec migration v1/v2),
   ses sauvegardes, le journal privé, et les gestes métier sur une
   piste (statut, prochaine action, clôture). Le moteur ne lit
   jamais l'écran ; ici, l'écran pilote le moteur.
   ============================================================ */
import { todayISO, localISO, fmtDate, uid } from '../engine/utils.js';
import { CLOSE_REASONS, normalizeCompany, normalizeContact,
         normalizeProfile, pushHist } from '../engine/model.js';
import { contactKey } from '../engine/merge.js';
import { mergeTombs } from '../engine/sync.js';
import { normalizeMembre } from '../engine/groupe.js';
import { DATA_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, THEME_KEY,
         GROUP_KEY, OLD_V2, OLD_V1, kvInit, kvGet, kvSet, getBackend } from '../engine/storage.js';
/* `dom.js` n'importe que `engine/utils.js` : pas de cycle. Le sens
   unique de l'architecture est respecté — l'écran appelle le moteur. */
import { sheetOpen } from './dom.js';

export const S = {
  companies: [],
  orphans: [],          /* contacts « à rattacher » */
  tombs: [],            /* suppressions — voyagent vers mes autres appareils */
  groupe: [],           /* mes camarades — PRIVÉ, et c'est la vie privée d'AUTRUI : jamais dans un partage */
  profile: null,
  journal: [],          /* privé, jamais partagé */
  theme: 'light',
  route: 'aujourdhui'
};
/* app.js branche ici le re-rendu de la vue courante */
export const bus = { refresh(){} };

export function setSaveWarn(bad){
  const w = document.getElementById('saveWarn');
  if (w) w.hidden = !bad;
}
/* les autres onglets rechargent quand celui-ci écrit (sinon : dernier
   écrit = seul gardé, les modifications de l'autre onglet partaient
   silencieusement à la poubelle) */
const tabs = ('BroadcastChannel' in window) ? new BroadcastChannel('oc_tabs') : null;
let selfTab = Math.random().toString(36).slice(2);
function tellTabs(){
  if (tabs) tabs.postMessage(selfTab);
  /* la sync appareils (direct.js) écoute : chaque enregistrement se propage */
  document.dispatchEvent(new CustomEvent('oc:change'));
}
if (tabs) tabs.addEventListener('message', e => {
  if (e.data === selfTab) return;
  /* une feuille ou un panneau ouvert = édition en cours : on recharge après */
  if (sheetOpen()){ S.stale = true; return; }
  reloadFromStorage();
});
export async function reloadFromStorage(){
  S.stale = false;
  await loadAll();
  bus.refresh();
}

export function saveData(){ kvSet(DATA_KEY, JSON.stringify(S.companies)).then(ok => setSaveWarn(!ok)); tellTabs(); }
export function saveProfile(){
  S.profile.updatedAt = Date.now();     /* LWW entre appareils */
  kvSet(PROFILE_KEY, JSON.stringify(S.profile)).then(ok => setSaveWarn(!ok));
  tellTabs();
}
export function saveOrphans(){ kvSet(ORPHANS_KEY, JSON.stringify(S.orphans)).then(ok => setSaveWarn(!ok)); tellTabs(); }
export function saveTombs(){ kvSet(TOMBS_KEY, JSON.stringify(S.tombs)); }
export function saveGroupe(){ kvSet(GROUP_KEY, JSON.stringify(S.groupe)).then(ok => setSaveWarn(!ok)); tellTabs(); }
/* applique le résultat d'une sync appareils — SANS re-tamponner le profil
   (saveProfile met updatedAt à maintenant, ce qui fausserait le LWW) */
export function applySynced(r){
  S.companies = r.companies;
  S.orphans = r.orphans;
  S.tombs = r.tombs;
  if (r.groupe) S.groupe = r.groupe;
  if (r.profile) S.profile = r.profile;
  kvSet(DATA_KEY, JSON.stringify(S.companies)).then(ok => setSaveWarn(!ok));
  kvSet(ORPHANS_KEY, JSON.stringify(S.orphans));
  kvSet(TOMBS_KEY, JSON.stringify(S.tombs));
  kvSet(GROUP_KEY, JSON.stringify(S.groupe));
  kvSet(PROFILE_KEY, JSON.stringify(S.profile));
  tellTabs();
}
/* Une entrée peut porter les identifiants des pistes qu'elle concerne.
   C'est un champ AJOUTÉ, jamais un renommage : une entrée écrite avant
   cette version n'en a pas et reste lisible telle quelle. C'est ce qui
   permet à « Tes échanges » de s'ouvrir sur ce qui a circulé, sans
   rien effacer de l'historique déjà écrit — les vieilles lignes se
   lisent, simplement elles ne s'ouvrent pas.
   Plafond : un gros partage n'a pas à faire enfler la clé de journal.
   Au-delà, la ligne dira son compte et la feuille dira ce qu'elle a. */
const JOURNAL_IDS_MAX = 200;
export function logJ(txt, cid, ids){
  const e = { t: Date.now(), txt, cid: cid || null };
  const l = (ids || []).filter(Boolean);
  if (l.length) e.ids = l.slice(0, JOURNAL_IDS_MAX);
  S.journal.push(e);
  if (S.journal.length > 200) S.journal = S.journal.slice(-200);
  kvSet(JOURNAL_KEY, JSON.stringify(S.journal));
}

export async function loadAll(){
  await kvInit();
  /* les clés se lisent en parallèle : autant d'allers-retours IndexedDB
     séquentiels, ça se paie cher sur un vrai téléphone */
  const [t, pRaw, jRaw, oRaw, tbRaw, gRaw, raw] = await Promise.all(
    [THEME_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, GROUP_KEY, DATA_KEY].map(kvGet));
  S.theme = (t === 'light' || t === 'dark') ? t
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  let p = null;
  try { p = JSON.parse(pRaw); } catch (e) {}
  S.profile = normalizeProfile(p);
  try { S.journal = JSON.parse(jRaw) || []; } catch (e) { S.journal = []; }
  if (!Array.isArray(S.journal)) S.journal = [];
  try { S.orphans = (JSON.parse(oRaw) || []).map(normalizeContact); } catch (e) { S.orphans = []; }
  try { S.tombs = mergeTombs(JSON.parse(tbRaw) || [], []); } catch (e) { S.tombs = []; }
  try { S.groupe = (JSON.parse(gRaw) || []).map(normalizeMembre).filter(Boolean); } catch (e) { S.groupe = []; }
  if (raw){
    try { S.companies = (JSON.parse(raw) || []).map(normalizeCompany); } catch (e) { S.companies = []; }
  }
  if (!S.companies.length){
    /* migration une seule fois depuis les très anciennes clés */
    for (const k of [OLD_V2, OLD_V1]){
      const old = await kvGet(k);
      if (!old) continue;
      try {
        const arr = JSON.parse(old) || [];
        if (arr.length){ S.companies = arr.map(normalizeCompany); saveData(); break; }
      } catch (e) {}
    }
  }
  if (getBackend() === 'memory') setSaveWarn(true);
}

/* ---------- gestes métier sur une piste ----------
   (le statut, lui, ne s'écrit plus qu'au « Confirmer » de la fiche) */
export const isClosed = c => !!c.closedReason;

export function setNextAction(c, text, dateISO, ctId){
  c.nextActionText = String(text || '').trim();
  c.nextAction = dateISO || '';
  /* #14 : l'action vise une personne quand on la connaît — sinon elle
     reste au niveau entreprise (le champ optionnel disparaît) */
  if (ctId && (c.contacts || []).some(t => t.id === ctId)) c.nextActionCt = ctId;
  else delete c.nextActionCt;
  c.updatedAt = Date.now();
  if (c.nextAction) pushHist(c, 'À faire : ' + (c.nextActionText || 'faire le point') + ' — ' + fmtDate(c.nextAction));
  saveData();
}
/* #14 : écrire à quelqu'un (ou l'appeler) le rend « actif » — il cesse
   d'être un simple nom connu. Silencieux et idempotent. */
export function activateContact(c, ct){
  if (!ct || ct.activatedAt) return;
  ct.activatedAt = todayISO();
  c.updatedAt = Date.now();
  saveData();
}
export function markDone(c){
  const label = c.nextActionText || 'l’action prévue';
  pushHist(c, 'Fait : ' + label);
  logJ('Fait : ' + label + ' — ' + c.name, c.id);
  c.nextAction = '';
  c.nextActionText = '';
  delete c.nextActionCt;
  c.updatedAt = Date.now();
  saveData();
}
export function closePiste(c, reason){
  if (!CLOSE_REASONS[reason]) return;
  c.closedReason = reason;
  c.closedAt = todayISO();
  c.nextAction = '';
  c.nextActionText = '';
  delete c.nextActionCt;
  c.updatedAt = Date.now();
  pushHist(c, 'Clôturée — ' + CLOSE_REASONS[reason].label);
  logJ('Clôturée (' + CLOSE_REASONS[reason].label + ') : ' + c.name, c.id);
  saveData();
}
export function reopenPiste(c){
  c.closedReason = '';
  c.closedAt = '';
  c.updatedAt = Date.now();
  pushHist(c, 'Rouverte');
  logJ('Rouverte : ' + c.name, c.id);
  saveData();
}
/* suppression définitive — la tombstone voyage vers mes autres appareils */
export function deletePiste(c){
  S.companies = S.companies.filter(x => x.id !== c.id);
  S.tombs = mergeTombs(S.tombs, [{ id: c.id, t: Date.now() }]);
  saveTombs();
  saveData();
  logJ('Supprimée : ' + c.name);
}
export function undeletePiste(c){
  S.tombs = S.tombs.filter(t => t.id !== c.id);
  c.updatedAt = Date.now();
  S.companies.push(c);
  saveTombs();
  saveData();
}

/* ---------- contacts : orphelins & rattachement ---------- */
export const ctLabel = ct => ct.name || ct.email || ct.phone || 'contact';

export function addOrphan(raw){
  const ct = normalizeContact(raw);
  S.orphans.push(ct);
  saveOrphans();
  logJ('Contact à rattacher : ' + ctLabel(ct));
  return ct;
}
export function removeOrphan(id){
  S.orphans = S.orphans.filter(o => o.id !== id);
  saveOrphans();
}
/* range un contact dans une piste — complète sans jamais écraser si la
   même personne (email / téléphone / nom+rôle) y est déjà */
export function attachContact(c, raw){
  const ct = normalizeContact(raw);
  if (ct.extra){ delete ct.extra.company; if (!Object.keys(ct.extra).length) delete ct.extra; }
  const k = contactKey(ct);
  const known = k ? (c.contacts || []).find(t => contactKey(t) === k) : null;
  if (known){
    for (const f of ['name','role','email','phone','link','note'])
      if (!known[f] && ct[f]) known[f] = ct[f];
    pushHist(c, 'Contact complété : ' + ctLabel(ct));
  } else {
    (c.contacts = c.contacts || []).push(ct);
    pushHist(c, 'Contact ajouté : ' + ctLabel(ct));
  }
  c.updatedAt = Date.now();
  logJ('Contact ' + (known ? 'complété' : 'ajouté') + ' : ' + ctLabel(ct) + ' → ' + c.name, c.id);
  saveData();
  return known ? 'merged' : 'added';
}

/* ---------- pistes d'exemple (supprimables d'un tap) ---------- */
export function hasDemo(){ return S.companies.some(c => c.demo); }
export function addDemo(){
  const mk = (x, days, text) => {
    const c = normalizeCompany(Object.assign({ id: uid(), demo: true }, x));
    if (text){
      c.nextActionText = text;
      const d = new Date(); d.setDate(d.getDate() + days);
      c.nextAction = localISO(d);   /* heure locale — toISOString décalerait d'un jour la nuit */
    }
    c.history = [{ d: todayISO(), t: 'Piste d’exemple' }];
    return c;
  };
  S.companies.push(
    mk({ name: 'Orange Cyberdefense', city: 'Lille', domain: 'cyber', status: 'active',
         desc: 'Filiale cybersécurité d’Orange', techs: 'SOC, EDR, Fortinet',
         contacts: [{ name: 'Nadia Rahmani', role: 'RH', email: 'nadia.rahmani@exemple.fr' }] },
       -4, 'Relancer le RH'),
    mk({ name: 'Damart — DSI', city: 'Roubaix', domain: 'dsi', status: 'todo',
         desc: 'DSI du groupe textile', techs: 'Windows Server, réseau magasin' },
       0, 'Envoyer la candidature'),
    mk({ name: 'OVHcloud', city: 'Roubaix', domain: 'cloud', status: 'reply',
         desc: 'Hébergeur européen', techs: 'Linux, OpenStack',
         contacts: [{ name: 'Théo Vasseur', role: 'Team lead infra', email: 'theo.vasseur@exemple.fr' }] },
       3, 'Préparer l’entretien')
  );
  saveData();
}
/* L'exemple ne laisse AUCUNE trace. Il écrivait dans le journal privé
   comme une vraie piste — « Fait : … » — et ces lignes survivaient à son
   retrait : l'écran d'accueil annonçait « 3 actions faites aujourd'hui »
   au-dessus d'un « ajoute ta première piste ». Deux phrases qui se
   contredisent sur le même écran, à propos d'entreprises qui n'ont
   jamais existé. Chaque entrée porte l'id de sa piste (`logJ`), le
   ménage est donc exact : on ne retire que ce que l'exemple a écrit. */
export function removeDemo(){
  const ids = new Set(S.companies.filter(c => c.demo).map(c => c.id));
  S.companies = S.companies.filter(c => !c.demo);
  const avant = S.journal.length;
  S.journal = S.journal.filter(e => !(e && e.cid && ids.has(e.cid)));
  if (S.journal.length !== avant) kvSet(JOURNAL_KEY, JSON.stringify(S.journal));
  saveData();
}
