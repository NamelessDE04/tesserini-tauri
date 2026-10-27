/* Accesso con Google, approvazione degli utenti e archivio condiviso (Firestore).
   Se Firebase non è configurato l'app funziona in modalità locale (archivio solo su questo dispositivo). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.TAURI_CONFIG || {};
  var ADMIN = (cfg.adminEmail || '').toLowerCase();
  var KEY_ARCH = 'tauri.archivio.v1';
  var KEY_SEEN = 'tauri.richieste.viste';
  var MAX_DOC = 950000; // limite Firestore ~1 MB per documento

  function lsGet(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function toast(m) { if (window.TauriApp) window.TauriApp.toast(m); }
  var android = window.TauriAndroid || null;

  var list = [], cbs = [];
  function emit() { cbs.forEach(function (cb) { cb(list); }); }

  var configured = !!(cfg.firebase && cfg.firebase.apiKey && cfg.firebase.apiKey.indexOf('INSERIRE') < 0 && cfg.firebase.projectId);
  var enabled = configured && !!window.firebase;

  var api = {
    enabled: enabled,
    isAdmin: function () { return false; },
    canStamp: function () { return true; },
    onArchive: function (cb) { cbs.push(cb); cb(list); },
    save: null,
    remove: null
  };
  window.TauriSync = api;

  // ------------------------------------------------------------ modalità locale
  if (!enabled) {
    list = lsGet(KEY_ARCH, []);
    api.save = function (rec) {
      var arch = lsGet(KEY_ARCH, []);
      var i = arch.findIndex(function (a) { return a.id === rec.id; });
      if (i >= 0) arch[i] = rec; else arch.unshift(rec);
      if (!lsSet(KEY_ARCH, arch)) return Promise.reject(new Error('memoria piena, elimina qualche tesserino'));
      list = arch; emit();
      return Promise.resolve('local');
    };
    api.remove = function (id) {
      list = lsGet(KEY_ARCH, []).filter(function (a) { return a.id !== id; });
      lsSet(KEY_ARCH, list); emit();
      return Promise.resolve();
    };
    if (configured && !window.firebase) {
      var g = $('gate');
      if (g) {
        g.hidden = false;
        Array.prototype.forEach.call(g.querySelectorAll('[data-g]'), function (el) { el.hidden = el.getAttribute('data-g') !== 'errore'; });
        $('gErr').textContent = 'Impossibile caricare i servizi di accesso. Controlla la connessione e riapri l\'app.';
      }
    }
    return;
  }

  // ------------------------------------------------------------ Firebase
  firebase.initializeApp(cfg.firebase);
  var auth = firebase.auth();
  var db = firebase.firestore();
  try { db.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}

  var me = null, isAdmin = false, approved = false, istruttore = false;
  api.isAdmin = function () { return isAdmin && approved; };
  // può assegnare i brevetti: amministratore o account abilitato come istruttore
  api.canStamp = function () { return approved && (isAdmin || istruttore); };
  function roleChanged() { try { window.dispatchEvent(new Event('tauri-role')); } catch (e) {} }
  var unsubUser = null, unsubArch = null, unsubAdmin = null;

  function showGate(which, email) {
    var g = $('gate');
    if (!g) return;
    g.hidden = false;
    document.body.classList.add('locked');
    Array.prototype.forEach.call(g.querySelectorAll('[data-g]'), function (el) { el.hidden = el.getAttribute('data-g') !== which; });
    if (email) Array.prototype.forEach.call(g.querySelectorAll('.g-email'), function (el) { el.textContent = email; });
    if (which !== 'errore') $('gErr').textContent = '';
    watchdog(which);
  }
  // se il caricamento resta fermo troppo a lungo, si mostra cosa fare invece di restare bloccati
  var cTimer = null;
  function watchdog(which) {
    clearTimeout(cTimer);
    if (which !== 'carico') return;
    cTimer = setTimeout(function () {
      var g = $('gate');
      if (g.hidden) return;
      var vis = g.querySelector('[data-g="carico"]');
      if (vis && !vis.hidden) {
        showErrore('Il caricamento sta impiegando troppo. Controlla la connessione e riprova; se non si sblocca, esci e rientra.');
      }
    }, 15000);
  }
  function hideGate() {
    clearTimeout(cTimer);
    $('gate').hidden = true;
    document.body.classList.remove('locked');
  }
  function stopAll() {
    [unsubUser, unsubArch, unsubAdmin].forEach(function (u) { if (u) u(); });
    unsubUser = unsubArch = unsubAdmin = null;
    approved = false; istruttore = false;
    list = []; emit();
    roleChanged();
    var b = $('btnRichieste'); if (b) b.hidden = true;
  }

  // ---- accesso
  function showErrore(msg) {
    showGate('errore');
    $('gErr').textContent = msg;
    Array.prototype.forEach.call(document.querySelectorAll('.g-esci-err'), function (el) { el.hidden = false; });
  }
  function loginError(msg) {
    showGate('login');
    $('gErr').textContent = msg;
    $('gLogin').disabled = false;
  }
  window.__tauriGoogleToken = function (idToken) {
    auth.signInWithCredential(firebase.auth.GoogleAuthProvider.credential(idToken))
      .catch(function (e) { loginError('Accesso non riuscito: ' + (e.message || e)); });
  };
  window.__tauriGoogleError = function (msg) {
    loginError(msg && msg.indexOf('annull') >= 0 ? 'Accesso annullato.' : 'Accesso non riuscito: ' + (msg || 'errore sconosciuto'));
  };
  function login() {
    $('gErr').textContent = '';
    $('gLogin').disabled = true;
    if (android && android.googleSignIn) {
      android.googleSignIn(cfg.webClientId);
      return;
    }
    var p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(p).catch(function (e) {
      if (e && e.code === 'auth/popup-blocked') return auth.signInWithRedirect(p);
      if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return loginError('Accesso annullato.');
      if (e && e.code === 'auth/unauthorized-domain') return loginError('Questo indirizzo non è ancora autorizzato in Firebase (Authentication → Impostazioni → Domini autorizzati).');
      if (e && e.code === 'auth/operation-not-allowed') return loginError('L\'accesso con Google non è attivo in Firebase (Authentication → Metodo di accesso → Google).');
      loginError('Accesso non riuscito' + (e && e.code ? ' [' + e.code + ']' : '') + ': ' + (e && e.message || e));
    });
  }
  function logout() {
    if (android && android.disableAdminWatch) android.disableAdminWatch();
    if (android && android.googleSignOut) android.googleSignOut();
    auth.signOut();
  }

  (function bindUi() { // gli script sono in fondo alla pagina: gli elementi esistono già
    $('gLogin').onclick = login;
    Array.prototype.forEach.call(document.querySelectorAll('.g-esci'), function (b) { b.onclick = logout; });
    $('btnEsci').onclick = function () { if (confirm('Uscire dall\'account?')) logout(); };
    $('btnRichieste').onclick = openRichieste;
    $('dlgRichiesteChiudi').onclick = function () { $('dlgRichieste').close(); };
    showGate('carico');
  })();

  // esito di un eventuale accesso con reindirizzamento (iPhone, popup bloccati)
  auth.getRedirectResult().catch(function (e) {
    if (e && e.code) loginError('Accesso non riuscito [' + e.code + ']: ' + (e.message || ''));
  });

  auth.onAuthStateChanged(function (user) {
    stopAll();
    me = user;
    if (!user) { showGate('login'); $('gLogin').disabled = false; return; }
    var email = (user.email || '').toLowerCase();
    isAdmin = !!ADMIN && email === ADMIN && user.emailVerified !== false;
    $('accountEmail').textContent = user.email || '';
    $('accountCard').hidden = false;
    showGate('carico');

    var ref = db.collection('utenti').doc(user.uid);
    // l'amministratore entra subito, senza aspettare il database
    if (isAdmin) {
      hideGate();
      approved = true; startArchive(); startAdmin(user); roleChanged();
      ref.set({ email: email, nome: user.displayName || '', stato: 'approvato' }, { merge: true }).catch(function () {});
      return;
    }
    var creata = false;
    unsubUser = ref.onSnapshot(function (s) {
      if (me !== user) return;
      if (!s.exists) {
        // la richiesta si crea solo quando il server conferma che non esiste (non dalla cache)
        if (!s.metadata.fromCache && !creata) {
          creata = true;
          ref.set({
            email: email,
            nome: user.displayName || '',
            stato: 'in_attesa',
            richiestoIl: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function (e) {
            showErrore('Registrazione della richiesta rifiutata dal server (' + (e && e.code || e) + ').');
          });
        }
        showGate('attesa', user.email);
        return;
      }
      var d = s.data() || {};
      var stato = d.stato || 'in_attesa';
      var nuovoIstr = d.istruttore === true;
      if (stato === 'approvato') {
        hideGate();
        if (!approved) { approved = true; istruttore = nuovoIstr; startArchive(); roleChanged(); }
        else if (nuovoIstr !== istruttore) {
          istruttore = nuovoIstr; roleChanged();
          toast(istruttore ? 'Ora puoi assegnare i brevetti' : 'Non puoi più assegnare i brevetti');
        }
      } else {
        approved = false;
        if (unsubArch) { unsubArch(); unsubArch = null; }
        list = []; emit();
        showGate(stato === 'rifiutato' ? 'rifiutato' : 'attesa', user.email);
      }
    }, function (e) {
      showErrore('Impossibile leggere lo stato dell\'account (' + (e && e.code || e) + ').');
    });
  });

  // ---- archivio condiviso
  function startArchive() {
    unsubArch = db.collection('tessere').onSnapshot(function (qs) {
      list = qs.docs.map(function (d) { return d.data(); });
      emit();
    }, function (e) { toast('Archivio non disponibile: ' + (e.message || e)); });
    // porta nell'archivio condiviso le tessere salvate prima su questo telefono
    var local = lsGet(KEY_ARCH, []);
    if (local.length) {
      var batch = db.batch();
      local.forEach(function (r) { if (r && r.id) batch.set(db.collection('tessere').doc(r.id), withAuthor(r), { merge: true }); });
      batch.commit().then(function () {
        localStorage.removeItem(KEY_ARCH);
        toast(local.length + ' tesserini locali spostati nell\'archivio condiviso');
      }).catch(function () {});
    }
  }
  function withAuthor(rec) {
    var r = JSON.parse(JSON.stringify(rec));
    r.by = me ? (me.email || '') : '';
    return r;
  }
  api.save = function (rec) {
    if (!approved) return Promise.reject(new Error('accesso non ancora approvato'));
    var r = withAuthor(rec);
    if (JSON.stringify(r).length > MAX_DOC) return Promise.reject(new Error('foto troppo grande, riprova con un\'altra immagine'));
    // con la cache offline la scrittura è subito visibile; si sincronizza appena c'è rete.
    // I brevetti li scrive solo l'amministratore: per gli altri si lasciano quelli già salvati.
    var ref = db.collection('tessere').doc(r.id);
    var w;
    if (api.canStamp()) w = ref.set(r);
    else { delete r.brevetti; w = ref.set(r, { merge: true }); }
    w.catch(function (e) { toast('Errore salvataggio: ' + (e.message || e)); });
    return Promise.resolve('cloud');
  };
  api.remove = function (id) {
    if (!approved) return Promise.reject(new Error('accesso non ancora approvato'));
    db.collection('tessere').doc(id).delete().catch(function (e) { toast('Errore eliminazione: ' + (e.message || e)); });
    return Promise.resolve();
  };

  // ---- amministratore: richieste di accesso
  var utenti = [];
  function startAdmin(user) {
    $('btnRichieste').hidden = false;
    if (android && android.requestNotifyPermission) android.requestNotifyPermission();
    if (android && android.enableAdminWatch && user.refreshToken) {
      android.enableAdminWatch(cfg.firebase.apiKey, cfg.firebase.projectId, user.refreshToken);
    } else if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) {}
    }
    unsubAdmin = db.collection('utenti').onSnapshot(function (qs) {
      utenti = qs.docs.map(function (d) { var x = d.data(); x.uid = d.id; return x; });
      var pending = utenti.filter(function (u) { return u.stato === 'in_attesa'; });
      var badge = $('richiesteBadge');
      badge.textContent = pending.length; badge.hidden = pending.length === 0;
      var seen = lsGet(KEY_SEEN, []);
      pending.forEach(function (u) {
        if (seen.indexOf(u.uid) >= 0) return;
        seen.push(u.uid);
        var who = (u.nome ? u.nome + ' · ' : '') + (u.email || '');
        if (android && android.notifyRequest) android.notifyRequest(u.uid, who);
        else if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('Nuova richiesta di accesso', { body: who, icon: 'img/icon-192.png' }); } catch (e) {}
        }
        toast('Nuova richiesta di accesso: ' + who);
      });
      lsSet(KEY_SEEN, seen.slice(-200));
      if ($('dlgRichieste').open) drawRichieste();
    }, function (e) { toast('Elenco utenti non disponibile: ' + (e.message || e)); });
  }
  function setStato(u, stato) {
    var upd = {
      stato: stato,
      decisoIl: firebase.firestore.FieldValue.serverTimestamp(),
      decisoDa: me ? me.email : ''
    };
    if (stato !== 'approvato') upd.istruttore = false; // revocando l'accesso si toglie anche il permesso brevetti
    db.collection('utenti').doc(u.uid).update(upd).catch(function (e) { toast('Errore: ' + (e.message || e)); });
  }
  // solo l'amministratore: elimina dall'elenco un account non abilitato
  function eliminaUtente(u) {
    if (!isAdmin) return;
    if (!confirm('Eliminare definitivamente ' + (u.email || 'questo account') + ' dall\'elenco?\nSe in futuro rientra con Google, comparirà come nuova richiesta.')) return;
    db.collection('utenti').doc(u.uid).delete()
      .then(function () { toast('Account eliminato'); })
      .catch(function (e) { toast('Errore: ' + (e.message || e)); });
  }
  function setIstruttore(u, val) {
    var msg = val ? 'Permettere a ' + (u.email || '') + ' di assegnare e togliere i brevetti?'
                  : 'Togliere a ' + (u.email || '') + ' il permesso di assegnare i brevetti?';
    if (!confirm(msg)) return;
    db.collection('utenti').doc(u.uid).update({ istruttore: val })
      .catch(function (e) { toast('Errore: ' + (e.message || e)); });
  }
  function row(u, buttons) {
    var li = document.createElement('li');
    var who = document.createElement('div'); who.className = 'who';
    var b = document.createElement('b'); b.textContent = u.nome || u.email || '—';
    var s = document.createElement('span'); s.textContent = u.email || '';
    who.appendChild(b); who.appendChild(s); li.appendChild(who);
    buttons.forEach(function (bt) {
      var x = document.createElement('button'); x.type = 'button';
      x.className = 'btn' + (bt.accent ? ' btn-accent' : '');
      x.textContent = bt.label; x.onclick = bt.fn; li.appendChild(x);
    });
    return li;
  }
  function drawRichieste() {
    var lp = $('listaRichieste'), la = $('listaUtenti');
    lp.innerHTML = ''; la.innerHTML = '';
    var pending = utenti.filter(function (u) { return u.stato === 'in_attesa'; });
    var others = utenti.filter(function (u) { return u.stato !== 'in_attesa' && (u.email || '') !== ADMIN; });
    $('richiesteVuoto').hidden = pending.length > 0;
    pending.forEach(function (u) {
      lp.appendChild(row(u, [
        { label: 'Approva', accent: true, fn: function () { setStato(u, 'approvato'); } },
        { label: 'Rifiuta', fn: function () { if (confirm('Rifiutare ' + (u.email || '') + '?')) setStato(u, 'rifiutato'); } }
      ]));
    });
    $('utentiVuoto').hidden = others.length > 0;
    others.forEach(function (u) {
      var li;
      if (u.stato === 'approvato') {
        li = row(u, [
          u.istruttore
            ? { label: 'Togli brevetti', fn: function () { setIstruttore(u, false); } }
            : { label: 'Può dare brevetti', accent: true, fn: function () { setIstruttore(u, true); } },
          { label: 'Revoca', fn: function () { if (confirm('Togliere l\'accesso a ' + (u.email || '') + '?')) setStato(u, 'rifiutato'); } }
        ]);
        li.querySelector('span').textContent += u.istruttore ? ' · abilitato · istruttore (brevetti)' : ' · abilitato';
      } else {
        li = row(u, [
          { label: 'Abilita', fn: function () { setStato(u, 'approvato'); } },
          { label: 'Elimina', fn: function () { eliminaUtente(u); } }
        ]);
        li.querySelector('span').textContent += ' · non abilitato';
      }
      la.appendChild(li);
    });
  }
  function openRichieste() {
    drawRichieste();
    if (!$('dlgRichieste').open) $('dlgRichieste').showModal();
  }
  // aperta da una notifica Android
  window.__tauriOpenRequests = function () { if (isAdmin && approved) openRichieste(); };
})();
