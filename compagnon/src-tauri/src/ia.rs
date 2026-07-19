//! Rédaction IA « via ton ordinateur » (D5) : la PWA confie un prompt
//! sur le canal chiffré, l'ordinateur interroge le fournisseur choisi
//! et rend un TEXTE — qui retombe dans un champ éditable de la PWA,
//! jamais dans un envoi. Trois chemins :
//! · Ollama local (aucune clé, hors ligne une fois le modèle là) ;
//! · OpenAI par la clé de l'utilisateur — elle arrive chiffrée avec
//!   la demande, sert l'appel, puis meurt : jamais écrite, jamais
//!   journalisée ;
//! · l'abonnement ChatGPT par l'outil officiel Codex en mode non
//!   interactif (`codex exec --output-last-message`, documenté), en
//!   bac à sable lecture seule dans un dossier temporaire vide.
//! Les erreurs sortent en codes courts (`cle`, `quota`, `indispo`,
//! `runtime`, `echec`) — la PWA les traduit en français.
//! Crochets de développement (jamais en production) : OC_OLLAMA,
//! OC_OLLAMA_MODELE, OC_OPENAI_TEST, OC_CODEX.

use rand::RngCore;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const CODEX_PATIENCE: Duration = Duration::from_secs(180);

fn classer_ureq(e: ureq::Error, transport: &'static str) -> String {
    match e {
        ureq::Error::Status(code, _) => oc_coeur::ia::classer_http(code).to_string(),
        ureq::Error::Transport(_) => transport.to_string(),
    }
}

fn plein(prompt: &str, systeme: &str) -> String {
    if systeme.trim().is_empty() {
        prompt.to_string()
    } else {
        format!("{systeme}\n\n{prompt}")
    }
}

pub fn generer(
    fournisseur: &str,
    cle: &str,
    modele: &str,
    prompt: &str,
    systeme: &str,
) -> Result<String, String> {
    match fournisseur {
        "ollama" => ollama(cle_absente(modele), &plein(prompt, systeme)),
        "openai" => openai(cle, modele, prompt, systeme),
        "chatgpt" => codex(&plein(prompt, systeme)),
        _ => Err("fournisseur".into()),
    }
}

fn cle_absente(modele: &str) -> String {
    if modele.trim().is_empty() {
        std::env::var("OC_OLLAMA_MODELE").unwrap_or_else(|_| "llama3.2".into())
    } else {
        modele.trim().to_string()
    }
}

fn ollama(modele: String, prompt: &str) -> Result<String, String> {
    let url = format!(
        "{}/api/generate",
        std::env::var("OC_OLLAMA").unwrap_or_else(|_| "http://127.0.0.1:11434".into())
    );
    let rep: serde_json::Value = ureq::post(&url)
        .send_json(serde_json::json!({ "model": modele, "stream": false, "prompt": prompt }))
        .map_err(|e| classer_ureq(e, "runtime"))?
        .into_json()
        .map_err(|_| "echec".to_string())?;
    let txt = rep["response"].as_str().unwrap_or("").trim().to_string();
    if txt.is_empty() {
        return Err("echec".into());
    }
    Ok(txt)
}

fn openai(cle: &str, modele: &str, prompt: &str, systeme: &str) -> Result<String, String> {
    let base = std::env::var("OC_OPENAI_TEST").unwrap_or_else(|_| "https://api.openai.com".into());
    let m = if modele.trim().is_empty() { "gpt-4o-mini" } else { modele.trim() };
    let mut messages = Vec::new();
    if !systeme.trim().is_empty() {
        messages.push(serde_json::json!({ "role": "system", "content": systeme }));
    }
    messages.push(serde_json::json!({ "role": "user", "content": prompt }));
    let rep: serde_json::Value = ureq::post(&format!("{base}/v1/chat/completions"))
        .set("authorization", &format!("Bearer {cle}"))
        .send_json(serde_json::json!({ "model": m, "messages": messages }))
        .map_err(|e| classer_ureq(e, "indispo"))?
        .into_json()
        .map_err(|_| "echec".to_string())?;
    let txt = rep["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();
    if txt.is_empty() {
        return Err("echec".into());
    }
    Ok(txt)
}

/// L'abonnement ChatGPT : l'outil officiel Codex, déjà connecté par
/// l'utilisateur sur cet ordinateur, en mode non interactif. Le prompt
/// part en argument, la réponse revient par `--output-last-message` ;
/// bac à sable lecture seule, dossier de travail temporaire vide.
fn codex(prompt: &str) -> Result<String, String> {
    let outil = std::env::var("OC_CODEX").unwrap_or_else(|_| "codex".into());
    let mut alea = [0u8; 8];
    rand::thread_rng().fill_bytes(&mut alea);
    let dossier = std::env::temp_dir().join(format!("oc-ia-{:016x}", u64::from_le_bytes(alea)));
    std::fs::create_dir_all(&dossier).map_err(|_| "echec".to_string())?;
    let sortie = dossier.join("derniere.txt");
    let lance = Command::new(&outil)
        .args(["exec", "--skip-git-repo-check", "--sandbox", "read-only", "--output-last-message"])
        .arg(&sortie)
        .arg(prompt)
        .current_dir(&dossier)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
    let mut enfant = match lance {
        Ok(e) => e,
        Err(_) => {
            let _ = std::fs::remove_dir_all(&dossier);
            return Err("runtime".into()); /* Codex absent de cet ordinateur */
        }
    };
    let debut = Instant::now();
    let statut = loop {
        match enfant.try_wait() {
            Ok(Some(s)) => break s,
            Ok(None) => {
                if debut.elapsed() > CODEX_PATIENCE {
                    let _ = enfant.kill();
                    let _ = enfant.wait();
                    let _ = std::fs::remove_dir_all(&dossier);
                    return Err("indispo".into());
                }
                std::thread::sleep(Duration::from_millis(300));
            }
            Err(_) => {
                let _ = std::fs::remove_dir_all(&dossier);
                return Err("echec".into());
            }
        }
    };
    let texte = std::fs::read_to_string(&sortie).unwrap_or_default().trim().to_string();
    let _ = std::fs::remove_dir_all(&dossier);
    if !statut.success() {
        return Err("runtime".into()); /* pas connecté, ou outil en échec */
    }
    if texte.is_empty() {
        return Err("echec".into());
    }
    Ok(texte)
}
