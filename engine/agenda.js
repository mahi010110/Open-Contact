/* ============================================================
   OpenContact — moteur · le rappel par l'agenda du téléphone

   Une app web ne peut pas prévenir sans serveur (§10) : « je fais quoi
   maintenant » dépendait donc de penser à l'ouvrir, et l'oubli fait
   partie des raisons qui font lâcher un outil de suivi (Epstein et al.,
   2015). L'agenda de l'appareil, lui, sait sonner. Le rappel passe donc
   par lui, sous l'une de deux formes, sans compte ni réseau côté app :

   · un fichier .ics (RFC 5545) — l'agenda d'Apple l'ouvre tel quel, sur
     iPhone, iPad et Mac ;
   · un lien Google Agenda pré-rempli — partout ailleurs. L'agenda
     d'Android est presque toujours celui de Google, et il n'ouvre pas un
     .ics sans app tierce : le fichier y serait une impasse.

   Le choix ne se pose pas à l'écran (§8, règle 3 : une option est une
   décision que le concepteur n'a pas prise) : `formeAgenda` le tranche
   d'après l'appareil. Fonctions pures : l'écran demande, le moteur écrit.
   ============================================================ */

/* l'heure du rappel : le matin, avant les cours — une relance se fait
   dans la journée, pas à minuit, heure à laquelle tombe un événement
   « toute la journée » et son alarme */
export const RAPPEL_HEURE = '09:00';
const DUREE_MIN = 15;

const jourValide = iso => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))
  && !Number.isNaN(Date.parse(iso + 'T00:00:00Z'));
/* « 2026-10-08 » + « 09:00 » → « 20261008T090000 » : heure FLOTTANTE,
   sans fuseau — l'agenda la lit à l'heure locale de l'appareil, ce qu'on
   veut pour « mercredi matin », où qu'on soit */
const horodate = (iso, hhmm) => iso.replace(/-/g, '') + 'T' + hhmm.replace(':', '') + '00';
const fin = hhmm => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + DUREE_MIN;
  return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
};
/* RFC 5545 §3.3.11 : la barre oblique inverse, le point-virgule, la
   virgule et le retour à la ligne s'échappent dans un texte */
const echappe = s => String(s || '')
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/* RFC 5545 §3.1 : une ligne ne dépasse pas 75 OCTETS ; la suite se plie
   sur la ligne suivante, précédée d'une espace. On compte en octets
   UTF-8 — « é » en vaut deux — et on ne coupe jamais un caractère. */
function plie(ligne){
  const enc = new TextEncoder();
  const out = [];
  let cur = '', n = 0;
  for (const ch of ligne){
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)){ out.push(cur); cur = ''; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/* Le fichier .ics d'une prochaine action. Rend '' si la date n'en est
   pas une : l'écran ne propose alors rien. */
export function rappelICS({ uid, titre, date, details = '', heure = RAPPEL_HEURE, maintenant = new Date() } = {}){
  if (!jourValide(date) || !String(titre || '').trim()) return '';
  const stamp = maintenant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OpenContact//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + String(uid || 'rappel').replace(/[^\w.-]/g, '') + '@opencontact',
    'DTSTAMP:' + stamp,
    'DTSTART:' + horodate(date, heure),
    'DTEND:' + horodate(date, fin(heure)),
    'SUMMARY:' + echappe(titre),
    details ? 'DESCRIPTION:' + echappe(details) : null,
    /* l'alarme à l'heure dite : c'est elle qui fait sonner le téléphone */
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + echappe(titre), 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).map(plie).join('\r\n') + '\r\n';
}

/* Le même rappel, en lien Google Agenda pré-rempli (le format
   « TEMPLATE » que Google documente pour ses boutons « ajouter à
   l'agenda »). La notification suit les réglages de l'agenda de chacun. */
export function lienAgendaGoogle({ titre, date, details = '', heure = RAPPEL_HEURE } = {}){
  if (!jourValide(date) || !String(titre || '').trim()) return '';
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: String(titre),
    dates: horodate(date, heure) + '/' + horodate(date, fin(heure))
  });
  if (details) p.set('details', String(details));
  /* la barre des deux dates reste lisible, comme dans les exemples de
     Google : encodée, elle passe aussi, mais rien n'oblige à le parier */
  return 'https://calendar.google.com/calendar/render?' + p.toString().replace('%2F', '/');
}

/* Quelle forme pour CET appareil ? L'agenda d'Apple ouvre un .ics, celui
   d'Android non. Un iPad récent se dit « Macintosh » : c'est le toucher
   qui le trahit — mais un Mac aussi ouvre un .ics, donc le doute ne coûte
   rien ici. */
export function formeAgenda(ua){
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(String(ua || '')) ? 'ics' : 'google';
}
