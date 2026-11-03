/* ============================================================
   OpenContact — interface · dates du quotidien
   Tout ce qui traduit une date ISO en langage d'écran (« demain »,
   « –5 j », « jeu. 03/07 ») et les raccourcis de planification.
   ============================================================ */
import { todayISO, localISO } from '../engine/utils.js';

/* LES FORMATEURS, créés une fois. `toLocaleTimeString` en refait un à
   chaque appel : sur un groupe de 640 messages, c'était 93 ms de profil
   pour écrire des heures (relevé à grande échelle, octobre 2026). Même
   sortie, au caractère près — c'est le même formateur. */
const fmt = o => new Intl.DateTimeFormat('fr-FR', o);
const F = { heure: fmt({ hour: '2-digit', minute: '2-digit' }), court: fmt({ weekday: 'short', day: '2-digit', month: '2-digit' }),
  jourCourt: fmt({ weekday: 'short' }), jourMois: fmt({ day: '2-digit', month: '2-digit' }), jourLong: fmt({ weekday: 'long' }),
  long: fmt({ weekday: 'long', day: 'numeric', month: 'long' }), longAn: fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };

export function plusDaysISO(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localISO(d);
}
export function nextMondayISO(){
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return localISO(d);
}
/* écart en jours par rapport à aujourd'hui (négatif = passé) */
export function diffDays(iso){
  return Math.round((new Date(iso + 'T12:00:00') - new Date(todayISO() + 'T12:00:00')) / 86400000);
}
/* « jeu. 03/07 » */
export function frDate(iso){
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return F.court.format(d);
}
/* l'heure d'un message : « 14:05 » aujourd'hui, « hier », sinon « jeu. 03/07 » */
export function quandMessage(t){
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  if (d === 0) return F.heure.format(new Date(t));
  return d === -1 ? 'hier' : frDate(iso);
}
/* l'heure d'une LIGNE de la boîte, au plus court, comme toutes les
   messageries : « 14:05 » aujourd'hui, « hier », « lun. » dans la
   semaine, « 03/07 » au-delà — la colonne reste étroite et alignée */
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
/* DANS UN FIL (lot F2) : le jour se dit UNE fois, sur une ligne à lui,
   et chaque message ne porte plus que son heure — comme WhatsApp ou
   Messages. « Aujourd'hui », « Hier », le jour de la semaine tant qu'il
   est dans les sept derniers, la date au-delà (l'année seulement si ce
   n'est pas celle-ci). */
export const heureDe = t => F.heure.format(new Date(t));
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
export function jourFil(t){
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  if (d === 0) return 'Aujourd’hui';
  if (d === -1) return 'Hier';
  const j = new Date(iso + 'T12:00:00');
  if (d < 0 && d > -7) return majuscule(F.jourLong.format(j));
  return majuscule((j.getFullYear() !== new Date().getFullYear() ? F.longAn : F.long).format(j));
}
export const memeJour = (a, b) => localISO(new Date(a)) === localISO(new Date(b));
/* « mardi 8 juillet » */
export function frToday(){
  return F.long.format(new Date());
}
/* étiquette relative courte : « –5 j » · « aujourd'hui » · « demain » · « +12 j » */
export function relLabel(iso){
  const n = diffDays(iso);
  if (n === 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  return (n > 0 ? '+' : '–') + Math.abs(n) + ' j';
}

/* LA marque d'échéance — une seule dans toute l'app. Le même retard
   s'affichait en puce ambre encadrée dans « Mes pistes » et en simple
   italique dans « Aujourd'hui », qui est pourtant L'écran de l'urgence :
   deux dessins pour un même fait obligent à réapprendre d'un écran à
   l'autre. Elle vit ici parce que ni « Mes pistes » ni « Aujourd'hui »
   ne doit dépendre de l'autre. */
/* Le silence porte LA MÊME marque que l'échéance : un seul langage
   d'urgence dans toute l'app (§6). La colonne forte de la ligne dit
   « quand c'est dû » OU « depuis combien de temps c'est muet » — jamais
   les deux, puisqu'une piste sans nouvelles est par définition celle qui
   n'a pas de prochaine action. Le mot « sans nouvelles » vit dans la
   sous-ligne : seul, « 21 j » se lirait « dans 21 jours ». */
export function silenceMarkHTML(sil){
  if (!sil) return '';
  return `<span class="mark mark-${sil.cran}">${sil.jours} j</span>`;
}
export function dueMarkHTML(iso){
  if (!iso) return '';
  const n = diffDays(iso);
  const cran = n < 0 ? 'mark-late' : n === 0 ? 'mark-now' : n <= 2 ? 'mark-soon' : 'mark-far';
  return `<span class="mark ${cran}">${relLabel(iso)}</span>`;
}
