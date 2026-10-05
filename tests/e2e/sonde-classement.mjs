/* ============================================================
   OpenContact — sonde du classement de « À découvrir », AVANT / APRÈS
   (docs/sources.md, lot 4)

   Le lot 4 change ce que l'app DEMANDE à l'annuaire et l'ordre dans
   lequel elle MONTRE ce qu'il rend. Ça ne se juge pas sur des réponses
   fabriquées : la sonde pose les mêmes questions réelles au vrai
   annuaire, comme l'app d'avant puis comme l'app d'après, et compte ce
   qu'un étudiant verrait sur la première page — des personnes en nom
   propre, des employeurs, des entreprises dans la ville tapée, et
   combien n'apparaissaient pas avant.

   L'« avant » est rejoué fidèlement : la première question seule, sans
   le filtre des entrepreneurs individuels, dans l'ordre de l'annuaire.

   INFORMATIVE : elle relève, elle ne fait pas rougir la CI. Sans réseau,
   elle se tait au lieu d'accuser.
   ============================================================ */
import { interpreter, contexteRecherche } from '../../engine/requete.js';
import { questionsAnnuaire, lireAnnuaire, decouvertes, genreQuestion, PAR_PAGE } from '../../engine/annuaire.js';
import { cleDe } from '../../engine/requete.js';

const QUESTIONS = [
  ['alternance Lille', {}],
  ['cyber Lille', {}],
  ['réseau Lyon', {}],
  ['dev Rennes', {}],
  ['data Toulouse', {}],
  ['alternance', { zone: { dept: '59' } }]
];
const ctx = contexteRecherche([]);
const pause = ms => new Promise(ok => setTimeout(ok, ms));
const lire = async u => {
  for (let essai = 0; essai < 3; essai++){
    try {
      const res = await fetch(u, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (res.status === 429){ await pause(2000); continue; }
      if (!res.ok) return { erreur: 'statut ' + res.status };
      return { json: await res.json() };
    } catch (e){ return { erreur: String(e && e.message || e) }; }
  }
  return { erreur: '429 répétés' };
};
const villeDe = interp => {
  const e = interp.etiquettes.find(x => x.famille === 'lieu' && x.ville);
  return e ? e.ville : '';
};
const decrire = (l, ville) => {
  const top = l.slice(0, PAR_PAGE);
  return {
    top,
    personnes: top.filter(r => r.personne).length,
    employeurs: top.filter(r => r.employeur === true).length,
    inconnus: top.filter(r => r.employeur == null).length,
    ville: ville ? top.filter(r => cleDe(r.ville) === ville).length : null
  };
};
const ligne = r => `${r.nom}${r.personne ? ' (PERSONNE)' : ''} [${r.employeur === true ? 'emp' : r.employeur === false ? 'sans' : '?'} · ${r.ville || '—'}${r.effectif ? ' · ' + r.effectif : ''}]`;

let mesure = 0;
for (const [q, o] of QUESTIONS){
  const interp = interpreter(q, ctx);
  const ville = villeDe(interp);
  const urls = questionsAnnuaire(interp, o);
  console.log(`\n=== « ${q} »${o.zone ? ' (zone ' + o.zone.dept + ')' : ''} — ${urls.length} question(s)`);
  if (!urls.length){ console.log('   rien ne part'); continue; }
  /* AVANT : la première question seule, sans le filtre des personnes ;
     sans lieu tapé, l'ancienne app ne demandait rien du tout */
  const avantUrl = (() => {
    if (o.zone) return '';
    const u = new URL(urls[0]); u.searchParams.delete('est_entrepreneur_individuel'); return u.toString();
  })();
  let avant = null;
  if (avantUrl){
    const r = await lire(avantUrl);
    await pause(500);
    if (r.json){ avant = decrire(lireAnnuaire(r.json, { ville }), ville); mesure++; }
    else console.log('   avant : ', r.erreur);
  }
  const listes = [];
  for (const u of urls){
    const r = await lire(u);
    await pause(500);
    listes.push(r.json ? lireAnnuaire(r.json, { ville }) : []);
    if (r.json) mesure++; else console.log('   après : ', r.erreur);
  }
  const apres = decrire(decouvertes(listes, [], { genres: urls.map(genreQuestion), ville }), ville);
  const nouvelles = avant ? apres.top.filter(r => !avant.top.some(x => x.siren === r.siren)).length : apres.top.length;
  if (avant){
    console.log(`   AVANT : ${avant.personnes} personne(s) · ${avant.employeurs} employeur(s) · ${avant.inconnus} inconnu(s)${ville ? ` · ${avant.ville} dans la ville` : ''}`);
    console.log('     ' + avant.top.map(ligne).join(' | '));
  } else console.log('   AVANT : rien ne partait');
  console.log(`   APRÈS : ${apres.personnes} personne(s) · ${apres.employeurs} employeur(s) · ${apres.inconnus} inconnu(s)${ville ? ` · ${apres.ville} dans la ville` : ''} · ${nouvelles} nouvelle(s) en première page`);
  console.log('     ' + apres.top.map(ligne).join(' | '));
}
if (!mesure) console.log('\nRien de mesurable ici : pas de réseau sortant. Aucune conclusion.');
