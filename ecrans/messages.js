/* ============================================================
   OpenContact · la nouvelle interface · parler à un ami
   (docs/refonte-reprendre.md §8 ; la mécanique de ui/messages.js)

   Ce que j'écris part par la boîte aux lettres de l'ami, scellé pour
   lui seul, avec la preuve que c'est moi (ecrans/boite.js). La
   conversation reste sur CET appareil (`oc_messages_v1`,
   engine/messages.js) : aucun serveur ne la garde. Ce fichier ne
   dessine rien.
   ============================================================ */
import { MESSAGES_KEY, kvGet, kvSet } from '../engine/storage.js';
import { conversationsVides, normaliserConversations, filAvec as filDe, ajouterMessage, nonLus, dernier,
         marquerLu, oublier } from '../engine/messages.js';
import { cleFil } from '../engine/conversations.js';
import { S, bus } from './etat.js';
import { preparerMessage, posterMessage } from './boite.js';

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

export const filAvec = id => filDe(conv, id);
export const nonLusDe = id => nonLus(conv, id);
export const vuDe = id => (conv.fils[id] && conv.fils[id].vu) || 0;
/* chaque conversation résumée comme une ligne de messagerie ; un ami à
   qui l'on n'a jamais écrit n'y est pas (il est dans « Mes amis ») */
export function resumeConversations(){
  return (S.profile.amis || []).filter(a => filDe(conv, a.id).length).map(a => {
    const d = dernier(conv, a.id);
    return { cle: cleFil('ami', a.id), sorte: 'ami', id: a.id, nom: a.nom, at: d.at,
             apercu: (d.moi ? 'Toi : ' : '') + d.texte.replace(/\s+/g, ' '), n: nonLus(conv, a.id) };
  });
}
export function marquerAmiLu(id){
  if (!conv.fils[id]) return;
  conv = marquerLu(conv, id);
  sauver();
}
export async function oublierAmi(id){
  await chargerMessages();
  conv = oublier(conv, id);
  sauver();
}

/* la conversation ouverte (au plus une) : ce qui arrive y est lu, et
   elle se redessine */
let ouverte = null;
export function suivreOuverte(id, rendre){ ouverte = id ? { id, rendre } : null; }
export async function ajouterRecu(amiId, l){
  await chargerMessages();
  conv = ajouterMessage(conv, amiId, { id: l.id, moi: false, texte: l.texte, at: l.at });
  if (ouverte && ouverte.id === amiId) conv = marquerLu(conv, amiId);
  await sauver();
  if (ouverte && ouverte.id === amiId) ouverte.rendre();
  bus.refresh();
}
/* il entre dans la conversation TOUT DE SUITE, « pas encore parti » tant
   que la file le garde ; rend la promesse de son départ */
export async function envoyer(ami, texte){
  await chargerMessages();
  const l = await preparerMessage(ami, texte).catch(() => null);
  if (!l) return null;
  conv = ajouterMessage(conv, ami.id, { id: l.id, moi: true, texte: l.texte, at: l.at });
  conv = marquerLu(conv, ami.id);
  await sauver();
  return { l, parti: posterMessage(ami, l).catch(() => 0) };
}
