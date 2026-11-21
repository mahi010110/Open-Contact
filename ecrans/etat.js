/* ============================================================
   OpenContact · la nouvelle interface · l'état et son stockage
   (docs/refonte-reprendre.md §8)

   Repris de ui/state.js, sans rien de l'ancienne interface : les
   pistes, le profil, le bac, les suppressions et le journal privé,
   chargés et enregistrés sous les MÊMES clés (CONTRAT.md §1). Les deux
   interfaces lisent et écrivent les mêmes données : rien ne migre,
   rien ne se perd le jour de la bascule.
   ============================================================ */
import { normalizeCompany, normalizeContact, normalizeProfile, pushHist } from '../engine/model.js';
import { contactKey } from '../engine/merge.js';
import { mergeTombs } from '../engine/sync.js';
import { DATA_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, THEME_KEY, GROUP_KEY,
         OLD_V2, OLD_V1, kvInit, kvGet, kvSet, kvDel, getBackend } from '../engine/storage.js';

export const S = {
  companies: [],
  orphans: [],          /* contacts « à rattacher » */
  tombs: [],            /* suppressions : elles voyagent vers mes autres appareils */
  profile: null,
  journal: [],          /* privé, jamais partagé */
  theme: 'light',
  themeChoix: 'auto',
  avertir: false        /* rien ne s'enregistre ici (le stockage est en mémoire) */
};

/* la coque branche ici son rendu, et dit si une saisie est en cours */
export const bus = { refresh(){}, editionEnCours: () => false, avertir(){} };

function avertir(mal){
  if (S.avertir === !!mal) return;
  S.avertir = !!mal;
  bus.avertir(S.avertir);
}

/* Un autre onglet a écrit : on recharge, sauf pendant une saisie (on
   recharge après). Le même canal que l'app actuelle : ouvertes côte à
   côte sur la même adresse, les deux interfaces se suivent. */
const onglets = ('BroadcastChannel' in window) ? new BroadcastChannel('oc_tabs') : null;
const moi = Math.random().toString(36).slice(2);
function direAuxOnglets(){
  if (onglets) onglets.postMessage(moi);
  document.dispatchEvent(new CustomEvent('oc:change'));
}
if (onglets) onglets.addEventListener('message', e => {
  if (e.data === moi) return;
  if (bus.editionEnCours()){ S.perime = true; return; }
  recharger();
});
export async function recharger(){
  S.perime = false;
  /* verrouillée au démarrage, l'app n'a pas encore sa clé : elle relira
     tout en s'ouvrant */
  try { await charger(); } catch (e) { return; }
  bus.refresh();
}

export function saveData(){ kvSet(DATA_KEY, JSON.stringify(S.companies)).then(ok => avertir(!ok)); direAuxOnglets(); }
export function saveProfile(){
  S.profile.updatedAt = Date.now();     /* le plus récent gagne entre mes appareils */
  kvSet(PROFILE_KEY, JSON.stringify(S.profile)).then(ok => avertir(!ok));
  direAuxOnglets();
}
export function saveOrphans(){ kvSet(ORPHANS_KEY, JSON.stringify(S.orphans)).then(ok => avertir(!ok)); direAuxOnglets(); }
export function saveTombs(){ kvSet(TOMBS_KEY, JSON.stringify(S.tombs)); }
/* un état venu d'un autre de MES appareils (ou d'une copie) : il remplace
   celui d'ici, déjà fusionné (engine/sync.js) ; tout s'écrit d'un bloc */
export function applySynced(r){
  S.companies = r.companies;
  S.orphans = r.orphans;
  S.tombs = r.tombs;
  if (r.profile) S.profile = r.profile;
  kvSet(DATA_KEY, JSON.stringify(S.companies)).then(ok => avertir(!ok));
  kvSet(ORPHANS_KEY, JSON.stringify(S.orphans));
  kvSet(TOMBS_KEY, JSON.stringify(S.tombs));
  kvSet(PROFILE_KEY, JSON.stringify(S.profile));
  direAuxOnglets();
}
/* le journal privé : deux cents lignes au plus ; une ligne peut porter
   les pistes qu'elle concerne (CONTRAT.md §1) */
export function logJ(txt, cid, ids){
  const e = { t: Date.now(), txt, cid: cid || null };
  const l = (ids || []).filter(Boolean);
  if (l.length) e.ids = l.slice(0, 200);
  S.journal.push(e);
  if (S.journal.length > 200) S.journal = S.journal.slice(-200);
  kvSet(JOURNAL_KEY, JSON.stringify(S.journal));
}

/* Le thème : le CHOIX (auto, clair, sombre) n'est pas ce qui est
   appliqué. « Auto » suit l'appareil en direct. Le miroir synchrone de
   theme.js porte le choix, pour décider avant le premier pixel. */
export const choixTheme = v => (v === 'light' || v === 'dark') ? v : 'auto';
const mqSombre = matchMedia('(prefers-color-scheme: dark)');
export const themeVoulu = choix => choix === 'auto' ? (mqSombre.matches ? 'dark' : 'light') : choix;
export function appliquerTheme(t){
  S.theme = t;
  document.documentElement.dataset.theme = t;
  const m = document.getElementById('metaTheme');
  if (m) m.content = (t === 'dark') ? '#1E232B' : '#F7F6F1';
}
export function choisirTheme(choix, garder = true){
  S.themeChoix = choixTheme(choix);
  appliquerTheme(themeVoulu(S.themeChoix));
  if (garder) kvSet(THEME_KEY, S.themeChoix);
  try { localStorage.setItem(THEME_KEY, S.themeChoix); } catch (e) {}
}
mqSombre.addEventListener('change', () => { if (S.themeChoix === 'auto') appliquerTheme(themeVoulu('auto')); });

export async function charger(){
  await kvInit();
  const [t, pRaw, jRaw, oRaw, tbRaw, raw] = await Promise.all(
    [THEME_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, DATA_KEY].map(kvGet));
  S.themeChoix = choixTheme(t);
  S.theme = themeVoulu(S.themeChoix);
  let p = null;
  try { p = JSON.parse(pRaw); } catch (e) {}
  S.profile = normalizeProfile(p);
  try { S.journal = JSON.parse(jRaw) || []; } catch (e) { S.journal = []; }
  if (!Array.isArray(S.journal)) S.journal = [];
  try { S.orphans = (JSON.parse(oRaw) || []).map(normalizeContact); } catch (e) { S.orphans = []; }
  try { S.tombs = mergeTombs(JSON.parse(tbRaw) || [], []); } catch (e) { S.tombs = []; }
  /* `oc_group_v1` est retirée : une valeur restée d'avant s'efface
     (CONTRAT.md §1), comme le fait l'app actuelle */
  kvDel(GROUP_KEY).catch(() => {});
  S.companies = [];
  if (raw){
    try { S.companies = (JSON.parse(raw) || []).map(normalizeCompany); } catch (e) { S.companies = []; }
  }
  if (!S.companies.length){
    /* migration, une seule fois, depuis les très anciennes clés */
    for (const k of [OLD_V2, OLD_V1]){
      const old = await kvGet(k);
      if (!old) continue;
      try {
        const arr = JSON.parse(old) || [];
        if (arr.length){ S.companies = arr.map(normalizeCompany); saveData(); break; }
      } catch (e) {}
    }
  }
  avertir(getBackend() === 'memory');
}

/* ---------- les gestes sur les pistes ---------- */
export const ctLabel = ct => ct.name || ct.email || ct.phone || 'contact';

/* suppression : la pierre tombale voyage vers mes autres appareils */
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
/* ranger un contact dans une piste : compléter sans jamais écraser si
   la même personne y est déjà (email, téléphone, nom et rôle) */
export function attachContact(c, raw){
  const ct = normalizeContact(raw);
  const k = contactKey(ct);
  const known = k ? (c.contacts || []).find(t => contactKey(t) === k) : null;
  if (known){
    for (const f of ['name', 'role', 'email', 'phone', 'link', 'note'])
      if (!known[f] && ct[f]) known[f] = ct[f];
    pushHist(c, 'Contact complété : ' + ctLabel(ct));
  } else {
    (c.contacts = c.contacts || []).push(ct);
    pushHist(c, 'Contact ajouté : ' + ctLabel(ct));
  }
  c.updatedAt = Date.now();
  saveData();
  return known ? 'merged' : 'added';
}
