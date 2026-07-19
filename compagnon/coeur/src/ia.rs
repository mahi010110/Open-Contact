//! Rédaction IA via l'ordinateur (D5) — la part pure : bornes et
//! vocabulaire fermé d'une demande, classement des erreurs HTTP.
//! La demande vient de la PWA par le canal chiffré ; elle porte au
//! plus un prompt court, un modèle et une clé qui ne sera JAMAIS
//! écrite (ni disque, ni journal). Tout le réseau vit dans la
//! coquille — ici uniquement ce qui se teste sans réseau.

/// Les fournisseurs que l'ordinateur sait servir. `openrouter`,
/// `anthropic` et `gemini` parlent au navigateur directement : ils
/// n'ont rien à faire ici et sont refusés.
pub const FOURNISSEURS: [&str; 3] = ["ollama", "openai", "chatgpt"];

pub const PROMPT_MAX: usize = 8_000;
pub const SYSTEME_MAX: usize = 2_000;
pub const CLE_MAX: usize = 256;
pub const MODELE_MAX: usize = 100;
pub const JID_MAX: usize = 40;

/// Un identifiant de demande sûr : court, alphabet fermé — jamais
/// interpolé dans un chemin ni un journal sans cette garantie.
pub fn jid_valide(jid: &str) -> bool {
    (4..=JID_MAX).contains(&jid.len())
        && jid.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// La demande est-elle recevable ? Vocabulaire fermé, bornes strictes,
/// clé exigée là où le fournisseur la demande (OpenAI).
pub fn valider_demande(
    fournisseur: &str,
    prompt: &str,
    systeme: &str,
    cle: &str,
    modele: &str,
) -> Result<(), &'static str> {
    if !FOURNISSEURS.contains(&fournisseur) {
        return Err("fournisseur");
    }
    if prompt.trim().is_empty() || prompt.len() > PROMPT_MAX {
        return Err("prompt");
    }
    if systeme.len() > SYSTEME_MAX {
        return Err("prompt");
    }
    if cle.len() > CLE_MAX || (fournisseur == "openai" && cle.trim().is_empty()) {
        return Err("cle");
    }
    if modele.len() > MODELE_MAX {
        return Err("modele");
    }
    Ok(())
}

/// Le même classement court et honnête que `engine/ai.js` : la PWA
/// traduit ces codes en phrases, jamais l'inverse.
pub fn classer_http(statut: u16) -> &'static str {
    match statut {
        401 | 403 => "cle",
        429 => "quota",
        s if s >= 500 => "indispo",
        _ => "echec",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vocabulaire_ferme() {
        assert!(valider_demande("ollama", "Rédige.", "", "", "").is_ok());
        assert!(valider_demande("chatgpt", "Rédige.", "", "", "").is_ok());
        assert!(valider_demande("openai", "Rédige.", "", "sk-x", "gpt-4o-mini").is_ok());
        assert_eq!(valider_demande("anthropic", "x", "", "k", ""), Err("fournisseur"));
        assert_eq!(valider_demande("openrouter", "x", "", "k", ""), Err("fournisseur"));
        assert_eq!(valider_demande("", "x", "", "", ""), Err("fournisseur"));
        assert_eq!(valider_demande("shell", "x", "", "", ""), Err("fournisseur"));
    }

    #[test]
    fn bornes_strictes() {
        assert_eq!(valider_demande("ollama", "", "", "", ""), Err("prompt"));
        assert_eq!(valider_demande("ollama", "   ", "", "", ""), Err("prompt"));
        assert_eq!(valider_demande("ollama", &"x".repeat(PROMPT_MAX + 1), "", "", ""), Err("prompt"));
        assert_eq!(valider_demande("ollama", "x", &"s".repeat(SYSTEME_MAX + 1), "", ""), Err("prompt"));
        assert_eq!(valider_demande("openai", "x", "", "", ""), Err("cle"));
        assert_eq!(valider_demande("openai", "x", "", &"k".repeat(CLE_MAX + 1), ""), Err("cle"));
        assert_eq!(valider_demande("ollama", "x", "", "", &"m".repeat(MODELE_MAX + 1)), Err("modele"));
    }

    #[test]
    fn jid_alphabet_ferme() {
        assert!(jid_valide("ia-abc123"));
        assert!(jid_valide("a_b-C-9d"));
        assert!(!jid_valide("abc"));
        assert!(!jid_valide(&"j".repeat(JID_MAX + 1)));
        assert!(!jid_valide("../fuite"));
        assert!(!jid_valide("é😀"));
        assert!(!jid_valide(""));
    }

    #[test]
    fn classement_http() {
        assert_eq!(classer_http(401), "cle");
        assert_eq!(classer_http(403), "cle");
        assert_eq!(classer_http(429), "quota");
        assert_eq!(classer_http(500), "indispo");
        assert_eq!(classer_http(503), "indispo");
        assert_eq!(classer_http(400), "echec");
        assert_eq!(classer_http(404), "echec");
    }
}
