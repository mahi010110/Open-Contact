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
   · la boîte « Échanger » la range avec les groupes, la plus récente
     en haut, et l'onglet compte ce qui n'est pas lu (13 octobre 2026 :
     « comme les messageries traditionnelles ») ; au poste, elle se pose
     à droite de la liste.
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
import { S, bus, apresImage } from './state.js';
import { openSheet, btn, ic, champGrandit } from './dom.js';
import { heureDe, memeJour } from './dates.js';
import { preparerMessage, posterMessage, enAttente, ecouterBoite, relever, echecEnvoi } from './reseau.js';
import { cleFil } from '../engine/conversations.js';
import { ligneNouveaux, suivreNouveaux, ligneJour, texteHTML, debutFenetre, ligneAvant, ouvrirAvant } from './fil.js';

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

/* LA BOÎTE « Échanger » (ui/conversations.js) : chaque conversation
   résumée comme une ligne de messagerie. Un ami à qui l'on n'a jamais
   écrit n'y est pas — il est dans « Amis », et « Écrire à un ami »
   l'ouvre. */
export function resumeConversations(){
  return (S.profile.amis || []).filter(a => filAvec(conv, a.id).length).map(a => {
    const d = dernier(conv, a.id);
    return { cle: cleFil('ami', a.id), sorte: 'ami', id: a.id, nom: a.nom, at: d.at,
             apercu: (d.moi ? 'Toi : ' : '') + d.texte.replace(/\s+/g, ' '), n: nonLus(conv, a.id) };
  });
}
export const aUneConversation = id => filAvec(conv, id).length > 0;
/* l'instant de MON dernier message à cet ami (0 sinon) — le merci du lot
   R7 se tait dès qu'on lui a écrit depuis que la piste a répondu */
export const dernierEnvoiA = id => filAvec(conv, id).filter(m => m.moi).reduce((t, m) => Math.max(t, m.at || 0), 0);
export function marquerAmiLu(id){
  conv = marquerLu(conv, id);
  sauver();
  bus.refresh();
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
function bulleHTML(m, avant, neuf){
  const attente = m.moi && enAttente(m.id);
  /* le jour est dit au-dessus (ligne de jour) : la salve s'arrête à minuit */
  const suite = !!avant && avant.moi === m.moi && m.at - avant.at < SALVE && memeJour(avant.at, m.at);
  const tete = attente ? `<span class="gr-qui">${suite ? '' : `<time>${esc(heureDe(m.at))}</time> · `}${ic('clock', 'ic-14')} pas encore parti</span>`
    : suite ? '' : `<span class="gr-qui"><time>${esc(heureDe(m.at))}</time></span>`;
  /* les liens se tapent, sans aperçu (ui/fil.js) */
  return `<li class="${neuf ? 'fil-neuf ' : ''}gr-m ms-m${m.moi ? ' gr-moi' : ''}${suite ? ' ms-suite' : ''}">${tete}<p>${texteHTML(m.texte)}</p></li>`;
}

/* LA CONVERSATION. La barre porte le nom de l'ami, et lui seul : c'est
   celle d'une messagerie (§4). */
export async function ouvrirConversation(a, apres, o = {}){
  await chargerMessages();
  let arret = null;
  /* ce qui était lu AVANT d'ouvrir : la ligne « N nouveaux » se pose là */
  const vuAvant = (conv.fils[a.id] && conv.fils[a.id].vu) || 0;
  /* au poste, posée dans le volet de la boîte ; au pouce, une feuille */
  const sh = openSheet({ title: a.nom, icon: 'message-text', className: 'modal-groupe modal-conv', dans: o.dans,
    onClose: () => {
      if (arret) arret();
      if (ouverte && ouverte.sh === sh) ouverte = null;
      conv = marquerLu(conv, a.id);
      apresImage(sauver);
      bus.apresImage();
      if (apres) apres();
    } });
  const rendre = () => {
    if (!sh.body.isConnected) return;
    const fil = filAvec(conv, a.id);
    const bas = rendu && sh.body.scrollHeight - sh.body.scrollTop - sh.body.clientHeight < 40;
    const neuf = m => !m.moi && m.at > vuAvant;
    const n = fil.filter(neuf).length;
    const premier = fil.findIndex(neuf);
    /* la fenêtre : les derniers messages, jamais les 300 d'un coup (ui/fil.js) */
    const debut = debutFenetre(fil, neuf, fen.ancre);
    fen.debut = debut; fen.ancre = (fil[debut] || {}).id || ''; fen.fil = fil;
    /* vide, la feuille le dit d'un mot — un ÉTAT, pas une explication */
    sh.body.innerHTML = fil.length
      ? `<ol class="gr-fil ms-fil" id="msFil">${ligneAvant(debut)}${fil.slice(debut).map((m, k) => {
          const i = debut + k;
          return (!k || !memeJour(fil[i - 1].at, m.at) ? ligneJour(m.at) : '') +
            (i === premier ? ligneNouveaux(n) : '') + bulleHTML(m, k ? fil[i - 1] : null, neuf(m));
        }).join('')}</ol>`
      : `<p class="ms-vide" id="msVide">Aucun message pour l’instant.</p>`;
    sh.body.querySelector('[data-avant]')?.addEventListener('click', () => ouvrirAvant(sh.body, fen, fen.fil, rendre));
    if (!rendu) suivre.ouvrir(); else if (bas) sh.body.scrollTop = sh.body.scrollHeight;
    else suivre.maj();
    rendu = true;
  };
  let rendu = false;
  const fen = {};
  const suivre = suivreNouveaux(sh.body);
  ouverte = { id: a.id, sh, rendre };

  /* LE PIED : le champ et la flèche, comme dans un groupe. Un message
     n'est pas une ligne de groupe : il peut aller à la ligne. AU DOIGT,
     Entrée va donc à la ligne et c'est la flèche qui envoie — la
     convention de Messages et de WhatsApp sur un téléphone, où l'on
     n'a pas de Maj+Entrée sous le pouce. AU POSTE, Entrée envoie et
     Maj+Entrée va à la ligne. Jamais pendant qu'un clavier à
     composition choisit encore son caractère (IME). */
  const champ = document.createElement('textarea');
  champ.id = 'msChamp'; champ.rows = 1; champ.maxLength = MESSAGE_MAX;
  champ.className = 'gr-champ';
  champ.placeholder = 'Écrire à ' + prenomAmi(a);
  champ.setAttribute('aria-label', 'Écrire à ' + prenomAmi(a));
  champGrandit(champ);
  /* un message PRÊT (lot R7 : une demande d'aide, un merci) : posé dans
     le champ, jamais envoyé — il part de la flèche, comme tout le reste */
  if (o.texte){ champ.value = String(o.texte).slice(0, MESSAGE_MAX); queueMicrotask(() => champ.dispatchEvent(new Event('input'))); }
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
  champ.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || matchMedia('(pointer:coarse)').matches) return;
    e.preventDefault();
    envoyer();
  });
  const bEnv = btn('', 'icon-btn btn-contour', envoyer, 'arrow-up');
  bEnv.id = 'msEnvoyer'; bEnv.setAttribute('aria-label', 'Envoyer'); bEnv.title = 'Envoyer';
  const pied = document.createElement('div');
  pied.className = 'gr-pied';
  pied.append(champ, bEnv);
  sh.setFoot([pied]);

  conv = marquerLu(conv, a.id);
  rendre();
  /* la boîte est derrière la feuille, et la lecture n'a pas à
     s'enregistrer pendant le tap : après l'image (ui/state.js) */
  apresImage(sauver);
  bus.apresImage();
  /* EN DIRECT tant que la feuille est ouverte ; une relève rattrape ce
     qui est arrivé pendant que l'app était fermée, et renvoie ce qui
     attendait encore */
  ecouterBoite(rendre).then(f => { if (sh.body.isConnected) arret = f; else f(); });
  relever().then(rendre);
  return sh;
}
