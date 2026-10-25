/* Configurazione Firebase di Tesserini Tauri.
   Valori presi dalla console Firebase (Impostazioni progetto → Le tue app → app web). */
window.TAURI_CONFIG = {
  adminEmail: 'vaisittiluca@gmail.com',
  // "ID client web" di Authentication → Google (serve per l'accesso dall'app Android)
  webClientId: 'INSERIRE_ID_CLIENT_WEB',
  firebase: {
    apiKey: 'INSERIRE_API_KEY',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
