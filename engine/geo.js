/* ============================================================
   OpenContact — moteur · géocodage (Nominatim / OpenStreetMap)
   Seul appel réseau du moteur, déclenché uniquement par un geste
   volontaire (« Depuis l'adresse »). Erreurs : 'empty' si
   introuvable, sinon service/réseau indisponible.
   ============================================================ */
export async function geocodeAddress(q){
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 8000);
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=fr&q=' + encodeURIComponent(q);
    const r = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctl.signal });
    if (!r.ok) throw new Error('http');
    const j = await r.json();
    if (!j.length) throw new Error('empty');
    return { lat: +j[0].lat, lng: +j[0].lon };
  } finally {
    clearTimeout(tm);
  }
}
