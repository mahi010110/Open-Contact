/* ============================================================
   OpenContact — moteur · la conversation privée avec un ami
   (retour du mainteneur, 13 octobre 2026 : « pouvoir parler par message
   à un ami en conversation privée »)

   Un message part par la BOÎTE AUX LETTRES de l'ami (engine/boite.js) :
   scellé pour lui seul, gardé par les relais le temps qu'il ouvre l'app,
   avec une PREUVE d'auteur — personne ne peut écrire au nom d'un ami. Ce
   fichier ne tient que la conversation telle que CET appareil la garde :
   pas de réseau, pas de DOM.

   Ce qu'on garde (oc_messages_v1) : par ami, ses messages et les miens
   `{id, moi, texte, at}`, et `vu` — la dernière fois que j'ai ouvert la
   conversation. Trois cents messages au plus par ami : une conversation
   d'entraide, pas une archive.
   ============================================================ */
export const MESSAGE_MAX = 1000;
export const FIL_MAX = 300;
const ID = /^[A-Za-z0-9_-]{8,40}$/;
const AMI = /^[A-Za-z0-9_-]{16,43}$/;

/* le texte : ses retours à la ligne gardés (deux au plus d'affilée), les
   espaces repliés — un message n'est pas une ligne de groupe */
export const texteMessage = s => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ')
  .split('\n').map(l => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MESSAGE_MAX);

export const conversationsVides = () => ({ v: 1, fils: {} });
const messageValide = m => !!m && ID.test(String(m.id || '')) && typeof m.texte === 'string' && m.texte.length > 0
  && Number.isFinite(Number(m.at));
export function normaliserConversations(o){
  const out = conversationsVides();
  const fils = o && typeof o === 'object' && o.fils && typeof o.fils === 'object' ? o.fils : {};
  for (const [ami, f] of Object.entries(fils)){
    if (!AMI.test(ami) || !f || typeof f !== 'object') continue;
    const m = (Array.isArray(f.m) ? f.m : []).filter(messageValide)
      .map(x => ({ id: x.id, moi: !!x.moi, texte: texteMessage(x.texte), at: Number(x.at) }))
      .filter(x => x.texte).sort((a, b) => a.at - b.at).slice(-FIL_MAX);
    out.fils[ami] = { m, vu: Number(f.vu) || 0 };
  }
  return out;
}
export const filAvec = (c, ami) => (c.fils[ami] && c.fils[ami].m) || [];
/* un message ajouté une fois, à sa place dans le temps */
export function ajouterMessage(c, ami, m){
  if (!AMI.test(String(ami || '')) || !messageValide(m)) return c;
  const avant = filAvec(c, ami);
  if (avant.some(x => x.id === m.id)) return c;
  const x = { id: m.id, moi: !!m.moi, texte: texteMessage(m.texte), at: Number(m.at) };
  if (!x.texte) return c;
  const fil = [...avant, x].sort((a, b) => a.at - b.at).slice(-FIL_MAX);
  /* ce que j'écris, je l'ai vu */
  const vu = Math.max((c.fils[ami] && c.fils[ami].vu) || 0, x.moi ? x.at : 0);
  return { ...c, fils: { ...c.fils, [ami]: { m: fil, vu } } };
}
export const nonLus = (c, ami) => filAvec(c, ami).filter(m => !m.moi && m.at > ((c.fils[ami] && c.fils[ami].vu) || 0)).length;
export const dernier = (c, ami) => filAvec(c, ami).at(-1) || null;
export function marquerLu(c, ami, now = Date.now()){
  if (!c.fils[ami] || !nonLus(c, ami)) return c;
  return { ...c, fils: { ...c.fils, [ami]: { ...c.fils[ami], vu: now } } };
}
/* un ami retiré emporte sa conversation */
export function oublier(c, ami){
  if (!c.fils[ami]) return c;
  const { [ami]: _, ...fils } = c.fils;
  return { ...c, fils };
}
