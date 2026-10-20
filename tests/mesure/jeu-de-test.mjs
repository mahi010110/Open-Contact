/* ============================================================
   OpenContact — le jeu de données des tests avec de vraies personnes
   (docs/mesure/protocole.md)

   Écrit une copie (`.oc`) à restaurer sur le téléphone ou le poste de
   la séance : « Moi › Réglages › Restaurer une copie », ou « Recevoir ›
   Fichier ». Les dates sont RELATIVES au jour où l'on lance ce script :
   une relance « en retard de deux jours » l'est le jour de la séance,
   pas trois semaines plus tard. Lancer donc le jour même :

     node tests/mesure/jeu-de-test.mjs [fichier]

   Le fichier par défaut est `tests/mesure/jeu-de-test.oc`, hors du
   dépôt (.gitignore à côté). Les personnes et les adresses sont
   inventées ; les entreprises sont réelles pour que la carte et
   l'annuaire aient quelque chose à dire, mais rien ne leur est envoyé.

   Le moteur de l'app construit le fichier lui-même (normalisation,
   format de copie) : ce qui sort est exactement ce que l'app relit.
   ============================================================ */
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeCompany, normalizeProfile } from '../../engine/model.js';
import { fullPayload } from '../../engine/exchange.js';
import { nouvelIdAmi } from '../../engine/amis.js';
import { nouvelleCle } from '../../engine/boite.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const sortie = process.argv[2] || path.join(ICI, 'jeu-de-test.oc');

/* un jour relatif, en heure locale (jamais toISOString : la nuit, il
   décalerait d'un jour) */
const jour = n => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const mois = n => jour(n).slice(0, 7);
let k = 0;
const piste = x => normalizeCompany({ id: 'test-' + (++k), ...x });

const boite = await nouvelleCle();
const karim = await nouvelleCle();
const profil = normalizeProfile({
  name: 'Inès Martin', formation: 'BTS SIO option SISR', ecole: 'Lycée de l’exemple, Lille',
  recherche: 'alternance', ville: 'Lille', rayon: 15,
  email: 'ines.martin@exemple.fr', phone: '06 00 00 00 00',
  amiId: nouvelIdAmi(), boite,
  /* Karim est passé chez Thales : parcours 2, « trouve quelqu'un chez Thales » */
  amis: [{ id: nouvelIdAmi(), nom: 'Karim Benali', cle: karim.pub, recu: Date.now() - 20 * 864e5,
           parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: mois(-400) }] }],
  updatedAt: Date.now()
});

const pistes = [
  /* parcours 4 : la relance est en retard de deux jours */
  piste({ name: 'Advens', city: 'Lille', domain: 'cyber', status: 'active', positions: ['alternance'],
    contacts: [{ name: 'Claire Dubois', role: 'Responsable RH', email: 'claire.dubois@exemple.fr' }],
    appliedAt: jour(-9), nextAction: jour(-2), nextActionText: 'Relancer Claire',
    history: [{ d: jour(-9), t: 'Mail envoyé à Claire Dubois' }] }),
  /* parcours 2 : personne à qui écrire, mais Karim y est passé */
  piste({ name: 'Thales', city: 'Élancourt', domain: 'cyber', status: 'todo', positions: ['alternance'] }),
  /* parcours 3 : jamais écrite, une adresse */
  piste({ name: 'Worldline', city: 'Seclin', domain: 'esn', status: 'todo', positions: ['alternance'],
    contacts: [{ name: 'Service RH', email: 'rh@exemple.fr' }] }),
  /* parcours 5 : l'entretien est aujourd'hui */
  piste({ name: 'Aztek', city: 'Lille', domain: 'startup', status: 'active',
    contacts: [{ name: 'Marc Lefèvre', role: 'Responsable infra', email: 'marc.lefevre@exemple.fr' }],
    appliedAt: jour(-14), nextAction: jour(0), nextActionText: 'Entretien à 14 h',
    history: [{ d: jour(-14), t: 'Mail envoyé à Marc Lefèvre' }, { d: jour(-6), t: 'Entretien fixé' }] }),
  /* le reste : une vraie liste, pas un décor */
  piste({ name: 'Orange Cyberdefense', city: 'Lille', domain: 'cyber', status: 'active',
    contacts: [{ name: 'Nadia Rahmani', role: 'RH', email: 'nadia.rahmani@exemple.fr' }],
    appliedAt: jour(-4), nextAction: jour(3), nextActionText: 'Relancer Nadia',
    history: [{ d: jour(-4), t: 'Mail envoyé à Nadia Rahmani' }] }),
  piste({ name: 'OVHcloud', city: 'Roubaix', domain: 'cloud', status: 'reply',
    contacts: [{ name: 'Théo Vasseur', role: 'Team lead infra', email: 'theo.vasseur@exemple.fr' }],
    appliedAt: jour(-20), nextAction: jour(5), nextActionText: 'Envoyer mes disponibilités',
    history: [{ d: jour(-20), t: 'Mail envoyé à Théo Vasseur' }, { d: jour(-3), t: 'Réponse reçue' }] }),
  piste({ name: 'Kiabi', city: 'Hem', domain: 'dsi', status: 'active',
    appliedAt: jour(-60), history: [{ d: jour(-60), t: 'Candidature sur le site' }] }),
  piste({ name: 'Decathlon Digital', city: 'Villeneuve-d’Ascq', domain: 'dsi', status: 'todo' }),
  piste({ name: 'Capgemini', city: 'Lille', domain: 'esn', status: 'reply', closedReason: 'rejected', closedAt: jour(-12),
    appliedAt: jour(-30), history: [{ d: jour(-30), t: 'Mail envoyé' }, { d: jour(-12), t: 'Refus' }] })
];

await writeFile(sortie, JSON.stringify(fullPayload(pistes, profil)), 'utf8');
console.log(`${pistes.length} pistes et le profil d’Inès écrits dans ${sortie}`);
