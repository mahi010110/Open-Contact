/* ============================================================
   OpenContact — interface · parler à un ami
   (retour du mainteneur, 13 octobre 2026 : « pouvoir parler par
   message à un ami en conversation privée »)

   Ce que j'écris part par la boîte aux lettres de l'ami, scellé pour
   lui seul, avec la preuve que c'est moi (engine/boite.js). La
   conversation reste sur CET appareil (oc_messages_v1,
   engine/messages.js) : aucun serveur ne la garde.

   Où ça vit — là où l'on est déjà (§6, « une fonctionnalité neuve
   prend une place qui existe ») :
   · la fiche d'un ami porte « Écrire à Karim » : sur une fiche de
     personne, écrire est LE geste (Contacts d'iOS, WhatsApp) ;
   · sa ligne dans « Amis » compte ce qui n'est pas lu, en accent, à la
     place du chiffre d'un groupe dans « Échanger » ;
   · « Aujourd'hui » le dit en tête, dans « Tes amis » : quelqu'un
     attend une réponse.
   La feuille a le dessin du fil d'un groupe — les miens à droite en
   lavis d'accent, l'heure, et au pied le champ et la flèche. En direct
   tant qu'elle est ouverte ; fermée, la relève de la boîte prend le
   relais.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { MESSAGES_KEY, kvGet, kvSet } from '../engine/storage.js';
import { prenomAmi } from '../engine/amis.js';
import { MESSAGE_MAX, conversationsVides, normaliserConversations, filAvec, ajouterMessage, nonLus,
         dernier, marquerLu } from '../engine/messages.js';
import { S, bus } from './state.js';
import { openSheet, btn, ic, champGrandit } from './dom.js';
import { quandMessage } from './dates.js';
import { preparerMessage, posterMessage, enAttente, ecouterBoite, relever, echecEnvoi } from './reseau.js';

let conv = conversationsVides();
let charge = null;
export function chargerMessages(){
  return charge || (charge = kvGet(MESSAGES_KEY).then(v => {
    try { conv = normaliserConversations(JSON.parse(v || 'null')); } catch (e) { conv = conversationsVides(); }
    /* un ami retiré emporte sa conversation, de ce côté-ci aussi */
    const amis = new Set((S.profile.amis || []).map(a => a.id));
    const fils = Object.fromEntries(Object.entries(conv.fils).filter(([id]) => amis.has(id)));
    if (Object.keys(fils).length !== Object.keys(conv.fils).length){ conv = { ...conv, fils }; sauver(); }
  }).catch(() => {}));
}
const sauver = () => kvSet(MESSAGES_KEY, JSON.stringify(conv)).catch(() => {});

/* ce que la liste des amis et « Aujourd'hui » lisent */
export const nonLusDe = id => nonLus(conv, id);
export function lignesMessages(){
  return (S.profile.amis || []).map(a => ({ a, n: nonLus(conv, a.id) })).filter(x => x.n)
    .sort((x, y) => dernier(conv, y.a.id).at - dernier(conv, x.a.id).at)
    .map(({ a, n }) => {
      const raison = n > 1 ? `t’a écrit ${n} fois` : 't’a écrit', qui = dernier(conv, a.id).texte.replace(/\s+/g, ' ');
      return { sorte: 'message', id: a.id, nom: a.nom, raison, qui, aria: `${prenomAmi(a)} ${raison} : ${qui}` };
    });
}

/* reçu par la boîte (ui/reseau.js) — la preuve est déjà vérifiée */
let ouverte = null;
export async function ajouterRecu(amiId, l){
  await chargerMessages();
  conv = ajouterMessage(conv, amiId, { id: l.id, moi: false, texte: l.texte, at: l.at });
  /* la conversation est sous les yeux : ce qui arrive est lu */
  if (ouverte && ouverte.id === amiId) conv = marquerLu(conv, amiId);
  await sauver();
  if (ouverte && ouverte.id === amiId) ouverte.rendre();
}

/* L'HEURE UNE FOIS par salve : trois messages écrits d'affilée par la
   même personne ne la redisent pas trois fois (Messages, WhatsApp) —
   elle revient quand l'autre répond, ou après cinq minutes de silence.
   « pas encore parti » se dit toujours : c'est un état, pas une heure. */
const SALVE = 5 * 60000;
function bulleHTML(m, avant){
  const attente = m.moi && enAttente(m.id);
  const suite = !!avant && avant.moi === m.moi && m.at - avant.at < SALVE;
  const tete = attente ? `<span class="gr-qui">${suite ? '' : `<time>${esc(quandMessage(m.at))}</time> · `}${ic('clock', 'ic-14')} pas encore parti</span>`
    : suite ? '' : `<span class="gr-qui"><time>${esc(quandMessage(m.at))}</time></span>`;
  return `<li class="gr-m ms-m${m.moi ? ' gr-moi' : ''}${suite ? ' ms-suite' : ''}">${tete}<p>${esc(m.texte)}</p></li>`;
}

/* LA CONVERSATION. La barre porte le nom de l'ami, et lui seul : c'est
   celle d'une messagerie (§4). */
export async function ouvrirConversation(a, apres){
  await chargerMessages();
  let arret = null;
  const sh = openSheet({ title: a.nom, icon: 'message-text', className: 'modal-groupe modal-conv',
    onClose: () => {
      if (arret) arret();
      if (ouverte && ouverte.sh === sh) ouverte = null;
      conv = marquerLu(conv, a.id);
      sauver();
      bus.refresh();
      if (apres) apres();
    } });
  const rendre = () => {
    if (!sh.body.isConnected) return;
    const fil = filAvec(conv, a.id);
    const bas = sh.body.scrollHeight - sh.body.scrollTop - sh.body.clientHeight < 40;
    /* vide, la feuille le dit d'un mot — un ÉTAT, pas une explication */
    sh.body.innerHTML = fil.length
      ? `<ol class="gr-fil ms-fil" id="msFil">${fil.map((m, i) => bulleHTML(m, fil[i - 1])).join('')}</ol>`
      : `<p class="ms-vide" id="msVide">Aucun message pour l’instant.</p>`;
    if (bas || !rendu) sh.body.scrollTop = sh.body.scrollHeight;
    rendu = true;
  };
  let rendu = false;
  ouverte = { id: a.id, sh, rendre };

  /* LE PIED : le champ et la flèche, comme dans un groupe. Entrée envoie,
     Maj+Entrée va à la ligne — un message n'est pas une ligne de groupe. */
  const champ = document.createElement('textarea');
  champ.id = 'msChamp'; champ.rows = 1; champ.maxLength = MESSAGE_MAX;
  champ.className = 'gr-champ';
  champ.placeholder = 'Écrire à ' + prenomAmi(a);
  champ.setAttribute('aria-label', 'Écrire à ' + prenomAmi(a));
  champ.setAttribute('enterkeyhint', 'send');
  champGrandit(champ);
  const envoyer = async () => {
    const texte = champ.value.trim();
    if (!texte) return;
    bEnv.disabled = true;
    const l = await preparerMessage(a, texte).catch(() => null);
    bEnv.disabled = false;
    if (!l){ echecEnvoi(); return; }
    /* il entre dans la conversation TOUT DE SUITE, « pas encore parti »
       tant que la file le garde : rien de ce qu'on a écrit ne se perd */
    conv = ajouterMessage(conv, a.id, { id: l.id, moi: true, texte: l.texte, at: l.at });
    await sauver();
    champ.value = '';
    champ.dispatchEvent(new Event('input'));
    const parti = posterMessage(a, l);
    rendre();
    sh.body.scrollTop = sh.body.scrollHeight;
    await parti.catch(() => 0);
    rendre();
  };
  champ.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); envoyer(); } });
  const bEnv = btn('', 'icon-btn btn-contour', envoyer, 'arrow-up');
  bEnv.id = 'msEnvoyer'; bEnv.setAttribute('aria-label', 'Envoyer'); bEnv.title = 'Envoyer';
  const pied = document.createElement('div');
  pied.className = 'gr-pied';
  pied.append(champ, bEnv);
  sh.setFoot([pied]);

  conv = marquerLu(conv, a.id);
  sauver();
  rendre();
  bus.refresh();
  /* EN DIRECT tant que la feuille est ouverte ; une relève rattrape ce
     qui est arrivé pendant que l'app était fermée, et renvoie ce qui
     attendait encore */
  ecouterBoite(rendre).then(f => { if (sh.body.isConnected) arret = f; else f(); });
  relever().then(rendre);
  return sh;
}
