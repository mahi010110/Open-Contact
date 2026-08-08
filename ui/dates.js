/* ============================================================
   OpenContact — interface · dates du quotidien
   Tout ce qui traduit une date ISO en langage d'écran (« demain »,
   « –5 j », « jeu. 03/07 ») et les raccourcis de planification.
   ============================================================ */
import { todayISO, localISO } from '../engine/utils.js';

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
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
/* « mardi 8 juillet » */
export function frToday(){
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
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
