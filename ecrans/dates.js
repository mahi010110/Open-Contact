/* ============================================================
   OpenContact · la nouvelle interface · l'heure d'un message
   (recopié de ui/dates.js : la nouvelle interface n'importe rien de ui/)

   Les formateurs se créent une fois : un groupe de 640 messages en
   refaisait un par heure écrite.
   ============================================================ */
import { localISO, todayISO } from '../engine/utils.js';

const fmt = o => new Intl.DateTimeFormat('fr-FR', o);
const F = { heure: fmt({ hour: '2-digit', minute: '2-digit' }), jourCourt: fmt({ weekday: 'short' }),
  jourMois: fmt({ day: '2-digit', month: '2-digit' }), jourLong: fmt({ weekday: 'long' }),
  long: fmt({ weekday: 'long', day: 'numeric', month: 'long' }), longAn: fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  date: fmt({ day: 'numeric', month: 'short' }) };
const diffDays = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 86400000);
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);

export const heureDe = t => F.heure.format(new Date(t));
export const memeJour = (a, b) => localISO(new Date(a)) === localISO(new Date(b));
/* l'heure d'une ligne de la liste, au plus court : « 14:05 », « hier »,
   « lun. », « 03/07 » */
export function quandListe(t){
  if (!t) return '';
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  if (d === 0) return F.heure.format(new Date(t));
  if (d === -1) return 'hier';
  const j = new Date(iso + 'T12:00:00');
  if (d > -7) return F.jourCourt.format(j);
  return F.jourMois.format(j);
}
/* le jour, une fois, sur sa ligne : « Aujourd'hui », « Hier », « Lundi » */
export function jourFil(t){
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  if (d === 0) return 'Aujourd’hui';
  if (d === -1) return 'Hier';
  const j = new Date(iso + 'T12:00:00');
  if (d < 0 && d > -7) return majuscule(F.jourLong.format(j));
  return majuscule((j.getFullYear() !== new Date().getFullYear() ? F.longAn : F.long).format(j));
}
/* un jour passé dit comme on le dirait : « aujourd'hui », « hier », « le 2 oct. » */
export function quandJour(t){
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  if (d === 0) return 'aujourd’hui';
  if (d === -1) return 'hier';
  return 'le ' + F.date.format(new Date(iso + 'T12:00:00'));
}
