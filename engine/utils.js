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
export function todayISO(){ return new Date().toISOString().slice(0,10); }
export function isLate(iso){ return !!iso && iso < todayISO(); }
export function debounce(fn, ms){ let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }
export function normName(s){
  return String(s || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
export function extractCity(addr){
  const last = String(addr || '').split(',').pop() || '';
  return last.replace(/^\s*\d{4,5}\s*/, '').trim();
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
  const dest = c.address || (c.lat != null ? c.lat + ',' + c.lng : (c.city || ''));
  if (!dest) return '';
  const e = encodeURIComponent(dest), ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'https://maps.apple.com/?daddr=' + e;
  if (/Android/.test(ua)) return 'geo:' + (c.lat != null ? c.lat + ',' + c.lng : '0,0') + '?q=' + e;
  return 'https://www.google.com/maps/dir/?api=1&destination=' + e;
}
