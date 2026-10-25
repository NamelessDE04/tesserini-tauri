/* Configurazione Firebase di Tesserini Tauri.
   Valori presi dalla console Firebase (Impostazioni progetto → Le tue app → app web). */
window.TAURI_CONFIG = {
  adminEmail: 'vaisittiluca@gmail.com',
  // "ID client web" di Authentication → Google (serve per l'accesso dall'app Android)
  webClientId: '1092148468310-ppu9vpijnc72rp74v4l2o5j0vv52801o.apps.googleusercontent.com',
  firebase: {
    apiKey: 'AIzaSyCxa3trvi-E-VghBncEl7QkikxGSSGYBvc',
    authDomain: 'tesserini-tauri.firebaseapp.com',
    projectId: 'tesserini-tauri',
    storageBucket: 'tesserini-tauri.firebasestorage.app',
    messagingSenderId: '1092148468310',
    appId: '1:1092148468310:web:4c23c6cbc31b2c980139f7'
  }
};
