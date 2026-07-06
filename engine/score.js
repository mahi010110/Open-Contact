/* ============================================================
   OpenContact — moteur · indice de complétude
   La fiche est-elle complète, récente et confirmée ? Un indicateur
   d'entretien de la fiche, pas une garantie d'exactitude.
   ============================================================ */
export function scoreOf(c){
  const filled = [c.desc, (c.city || c.address), c.website, c.techs, c.process, c.tips,
    (c.positions && c.positions.length), (c.contacts && c.contacts.length),
    (c.contacts || []).some(t => t.email || t.phone || t.link), (c.lat != null)].filter(Boolean).length;
  const comp = filled / 10 * 60;
  const ref = c.verifiedAt || (c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0,10) : '');
  let fresh = 0;
  if (ref){
    const months = (Date.now() - new Date(ref).getTime()) / (1000 * 3600 * 24 * 30.4);
    fresh = Math.max(0, 25 * (1 - months / 12));
  }
  const val = Math.min(c.confirmations || 0, 3) / 3 * 15;
  return Math.min(100, Math.round(comp + fresh + val));
}
