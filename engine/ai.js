/* ============================================================
   OpenContact — moteur · connexions IA (rédaction & analyse)
   Trois familles (D5), toutes optionnelles — sans IA, tout marche :
   · clé API navigateur : Anthropic, Gemini, OpenRouter (les trois
     autorisent l'appel direct depuis un navigateur) ;
   · via l'ordinateur (le Compagnon) : Ollama local, OpenAI par clé
     (api.openai.com refuse le navigateur) et l'abonnement ChatGPT
     (outil officiel Codex, mode non interactif documenté).
   Ici : la fabrique d'un appel « texte → texte » côté navigateur ;
   le chemin Compagnon vit dans ui/connexions.js (canal chiffré).
   L'IA ne fait que PROPOSER : le texte retombe dans un champ
   éditable, jamais un envoi. Fonctions + fetch, aucun accès au
   DOM. La clé n'est jamais mise dans un log ni un prompt système
   inutile — et jamais stockée par le Compagnon.
   ============================================================ */

export const AI_FAMILIES = {
  gemini:     { label: 'Gemini',     channel: 'browser', key: true },
  anthropic:  { label: 'Claude',     channel: 'browser', key: true },
  openrouter: { label: 'OpenRouter', channel: 'browser', key: true },
  openai:     { label: 'OpenAI',     channel: 'companion', key: true },
  ollama:     { label: 'Ollama',     channel: 'companion', key: false },
  chatgpt:    { label: 'ChatGPT',    channel: 'companion', key: false }
};
export const browserProviders = () =>
  Object.keys(AI_FAMILIES).filter(k => AI_FAMILIES[k].channel === 'browser');

const DEFAULT_MODEL = {
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-2.0-flash',
  openrouter: 'openai/gpt-4o-mini'
};

/* map d'erreurs HTTP → messages courts, honnêtes */
function classify(status){
  if (status === 401 || status === 403) return 'cle';       /* clé invalide/refusée */
  if (status === 429) return 'quota';
  if (status >= 500) return 'indispo';
  return 'echec';
}

/* un appel navigateur direct — Anthropic ou Gemini. Rend le TEXTE
   proposé (jamais envoyé). model optionnel (défaut raisonnable). */
export async function aiComplete(conn, prompt, opts){
  opts = opts || {};
  const provider = conn.provider;
  const fam = AI_FAMILIES[provider];
  if (!fam || fam.channel !== 'browser') throw new Error('viacompagnon');
  if (!conn.key) throw new Error('cle');
  const model = conn.model || DEFAULT_MODEL[provider];
  const maxTokens = opts.maxTokens || 700;
  if (provider === 'anthropic'){
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': conn.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        system: opts.system || '',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!r.ok) throw new Error(classify(r.status));
    const j = await r.json();
    return (j.content || []).map(b => b.text || '').join('').trim();
  }
  if (provider === 'openrouter'){
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + conn.key
      },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        messages: (opts.system ? [{ role: 'system', content: opts.system }] : [])
          .concat([{ role: 'user', content: prompt }])
      })
    });
    if (!r.ok) throw new Error(classify(r.status));
    const j = await r.json();
    const ch = (j.choices || [])[0];
    return ((ch && ch.message && ch.message.content) || '').trim();
  }
  if (provider === 'gemini'){
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(conn.key);
    const r = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      })
    });
    if (!r.ok) throw new Error(classify(r.status));
    const j = await r.json();
    const c = (j.candidates || [])[0];
    return ((c && c.content && c.content.parts) || []).map(p => p.text || '').join('').trim();
  }
  throw new Error('viacompagnon');
}

/* le prompt d'un brouillon d'email — cadré, concret, sans fioriture.
   L'IA reçoit le contexte de la piste, pas les données privées de suivi. */
export function draftPrompt(o){
  const c = o.company || {};
  const parts = [
    'Rédige un email de candidature spontanée, court (120 mots max), en français, ton professionnel et direct, sans formules ampoulées.',
    'Entreprise : ' + (c.name || '') + (c.city ? ' (' + c.city + ')' : '') + '.',
    c.domain ? 'Secteur : ' + c.domain + '.' : '',
    c.desc ? 'À propos : ' + c.desc + '.' : '',
    o.contactName ? 'Destinataire : ' + o.contactName + (o.contactRole ? ', ' + o.contactRole : '') + '.' : '',
    o.profile && o.profile.name ? 'Expéditeur : ' + o.profile.name + (o.profile.formation ? ', ' + o.profile.formation : '') + '.' : '',
    o.goal ? 'Objectif : ' + o.goal + '.' : 'Objectif : décrocher un stage ou une alternance.',
    'Ne mets pas d\'objet, seulement le corps. Ne signe pas avec des coordonnées inventées. Termine par le prénom de l\'expéditeur seulement.'
  ];
  return parts.filter(Boolean).join('\n');
}
