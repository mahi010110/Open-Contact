/* ============================================================
   OpenContact — moteur · les liens d'un message
   (lot F2, 13 octobre 2026 : « exactement comme les messageries
   traditionnelles — mais attention à la sécurité »)

   Un lien collé dans un groupe ou une conversation se tape, comme
   partout. Trois choses le rendent sûr, et elles vivent ici parce
   qu'elles se testent :

   · RIEN NE PART TOUT SEUL. Aucun aperçu : le téléphone de qui reçoit
     irait chercher une page qu'un autre a choisie, ce qui trahit son
     adresse et a déjà servi à faire fuiter des messages (Mysk, 2020).
     Le lien ne s'ouvre que sur un tap.
   · LE LIEN DIT OÙ IL MÈNE. Seuls http et https deviennent des liens
     (jamais `javascript:`, `data:`, `file:`). Une adresse qui cache un
     nom avant un @ (« https://banque.fr@pirate.com » mène chez pirate)
     reste du texte. Un nom de domaine en lettres non latines
     (« аpple.com » avec un а cyrillique) s'affiche comme le navigateur
     le lira, en punycode (« xn--pple-43d.com ») : l'usurpation se voit.
   · LA PONCTUATION RESTE À LA PHRASE. « … sur https://advens.fr. » ne
     mène pas à « advens.fr. » ; une parenthèse fermante reste au lien
     seulement si elle y a son ouvrante (les pages de Wikipédia).

   Le moteur rend des MORCEAUX, jamais du HTML : l'écran échappe tout.
   ============================================================ */

const RE = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;
const FIN = /[.,;:!?…»)\]'"’]$/;

/* ce qu'un lien affiche et vers quoi il mène — ou `null` s'il ne doit
   pas en être un */
export function lienSur(brut){
  const s = String(brut || '');
  let u;
  try { u = new URL(/^www\./i.test(s) ? 'https://' + s : s); } catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  if (!u.hostname.includes('.')) return null;
  const hoteTape = s.replace(/^https?:\/\//i, '').split(/[/?#:]/)[0];
  return { href: u.href, affiche: /[^\x00-\x7f]/.test(hoteTape) ? u.href : s };
}

/* le texte en morceaux : { t:'texte', v } et { t:'lien', v, href } */
export function decouperLiens(texte){
  const s = String(texte || '');
  const out = [];
  const pousse = v => { if (!v) return; const d = out[out.length - 1];
    if (d && d.t === 'texte') d.v += v; else out.push({ t: 'texte', v }); };
  let i = 0;
  for (const m of s.matchAll(RE)){
    /* un lien commence un mot : « xhttps:// » n'en est pas un */
    if (m.index > 0 && /[\p{L}\p{N}]/u.test(s[m.index - 1])) continue;
    let brut = m[0];
    while (FIN.test(brut)){
      const c = brut.slice(-1);
      if (c === ')' && brut.split('(').length > brut.split(')').length - 1) break;
      brut = brut.slice(0, -1);
    }
    pousse(s.slice(i, m.index));
    const l = lienSur(brut);
    if (l) out.push({ t: 'lien', v: l.affiche, href: l.href });
    else pousse(brut);
    i = m.index + brut.length;
  }
  pousse(s.slice(i));
  return out;
}
