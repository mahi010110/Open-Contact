/* ============================================================
   OpenContact — moteur · utilitaires purs
   Chaînes, dates, distances, formats : aucun état, aucun accès
   au DOM. Tout est testable isolément (tests.js).
   ============================================================ */

/* neutralise le HTML avant toute injection dans la page */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
));
export function uid(){ return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
export function fmtDate(iso){ const p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
/* date ISO en heure LOCALE — jamais toISOString(), qui bascule en UTC et
   décale d'un jour entre minuit et 2 h en France */
export function localISO(d){
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}
export function todayISO(){ return localISO(new Date()); }
export function isLate(iso){ return !!iso && iso < todayISO(); }
export function debounce(fn, ms){ let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
export function normName(s){
  return String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
/* LA VILLE EST SUR LA DERNIÈRE LIGNE, PUIS APRÈS LA DERNIÈRE VIRGULE.
   Une adresse postale s'écrit sur plusieurs lignes (GOV.UK : un champ
   libre « gère n'importe quel format et accepte le copier-coller »), et
   la découper par la seule virgule ne marche alors plus du tout :
   « 12 rue du Rempart Saint-Étienne \n 31000 Toulouse » n'en contient
   AUCUNE, donc l'ancienne version rendait l'adresse entière comme
   « ville ». Ce n'est pas cosmétique — cette ville sert à remplir `city`
   sur une piste reçue sans ville (`model.js`) et surtout à l'anti-doublon
   (`merge.js`), qui se serait mis à comparer des adresses entières.
   Sur une adresse d'UNE ligne le résultat est identique au caractère
   près : c'est le cas d'usage historique, et il ne bouge pas. */
export function extractCity(addr){
  const lignes = String(addr || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const derniere = lignes.length ? lignes[lignes.length - 1] : '';
  const last = derniere.split(',').pop() || '';
  return last.replace(/^\s*\d{4,5}\s*/, '').trim();
}
/* UNE ADRESSE QUI VOYAGE SE REMET SUR UN RANG. Un saut de ligne encodé
   en `%0A` dans une URL de navigation n'est pas une adresse que Google
   ou Apple savent géocoder ; la virgule, si. La donnée garde ses lignes,
   c'est seulement ce qui SORT vers un service tiers qui se replie. */
export function surUnRang(s){
  return String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean).join(', ');
}
export function distKm(a, b, c, d){
  const r = Math.PI / 180, R = 6371;
  const x = Math.sin((c - a) * r / 2) ** 2 +
            Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export function fmtDT(ms){
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
export function fmtSize(n){
  return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo'
                      : Math.max(1, Math.round(n / 1024)) + ' Ko';
}
/* itinéraire vers la piste : l'app de navigation de l'appareil prend le relais
   (lit navigator.userAgent — environnement, pas écran) */
export function directionsUrl(c){
  const dest = surUnRang(c.address) || (c.lat != null ? c.lat + ',' + c.lng : (c.city || ''));
  if (!dest) return '';
  const e = encodeURIComponent(dest), ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'https://maps.apple.com/?daddr=' + e;
  if (/Android/.test(ua)) return 'geo:' + (c.lat != null ? c.lat + ',' + c.lng : '0,0') + '?q=' + e;
  return 'https://www.google.com/maps/dir/?api=1&destination=' + e;
}
