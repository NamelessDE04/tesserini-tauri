# Tesserini Tauri

App Android per creare i tesserini di riconoscimento di ASD Tauri Softair.

- L'interfaccia è in `app/src/main/assets/www` (stessa web app della versione PWA).
- A ogni push su `main` GitHub Actions compila l'APK firmato: lo trovi in **Actions → ultima esecuzione → Artifacts → TesseriniTauri-apk**.
- La chiave di firma è `app/tauri-release.jks`: non cambiarla, altrimenti gli aggiornamenti non si installano sopra la versione precedente.
