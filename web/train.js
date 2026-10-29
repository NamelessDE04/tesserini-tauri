/* Addestramento per i brevetti: teoria, esercizi pratici, test finale a domande.
   Dati su Firestore:
   - percorsi/{brevetto}      contenuti del percorso (li modificano amministratore e istruttori)
   - progressi/{uid}          schede lette e tentativi del test (li scrive il giocatore)
   - validazioni/{uid}        esercizi pratici convalidati (li scrivono solo amministratore e istruttori) */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var S = window.TauriSync;
  var SEED = window.TAURI_SEED || {};
  var root = $('viewTrain');

  var percorsi = {};      // contenuti salvati nel database
  var mioProg = {};       // progressi/{uid}
  var mieVal = {};        // validazioni/{uid}
  var schermo = { nome: 'lista' };
  var quiz = null;
  var unsubs = [];

  function toast(m) { if (window.TauriApp) window.TauriApp.toast(m); }
  function db() { return S.db && S.db(); }
  function user() { return S.user && S.user(); }
  function canStamp() { return S.canStamp && S.canStamp(); }

  // ---------- piccolo costruttore di elementi (il testo è sempre inserito come testo, mai come HTML)
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) e.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function btn(label, fn, cls) { return el('button', { type: 'button', class: 'btn ' + (cls || 'btn-ghost'), onclick: fn, text: label }); }
  function indietro(label, fn) {
    return el('button', { type: 'button', class: 'tr-back', onclick: fn }, [
      el('span', { 'aria-hidden': 'true', text: '‹ ' }), label
    ]);
  }

  // ---------- dati
  function brevetti() { return TauriCard.BREVETTI; }
  function brev(bid) { return brevetti().filter(function (b) { return b.id === bid; })[0]; }
  function percorso(bid) {
    var p = percorsi[bid] || SEED[bid] || {};
    return {
      teoria: p.teoria || [], pratica: p.pratica || [], domande: p.domande || [],
      quiz: Object.assign({ nDomande: 10, soglia: 80, minuti: 15 }, p.quiz || {}),
      bozza: !percorsi[bid] && !!SEED[bid]
    };
  }
  function letti(bid) { return (mioProg.letti && mioProg.letti[bid]) || {}; }
  function tentativi(bid) { return ((mioProg.test && mioProg.test[bid]) || []).slice().sort(function (a, b) { return b.data - a.data; }); }
  function validati(bid, val) { return ((val || mieVal)[bid]) || {}; }
  function migliore(list) { return list.reduce(function (m, t) { return !m || t.percentuale > m.percentuale ? t : m; }, null); }

  function avvia() {
    ferma();
    var u = user(), d = db();
    if (!u || !d) { disegna(); return; }
    unsubs.push(d.collection('percorsi').onSnapshot(function (qs) {
      percorsi = {}; qs.docs.forEach(function (x) { percorsi[x.id] = x.data(); }); disegna();
    }, function () {}));
    unsubs.push(d.collection('progressi').doc(u.uid).onSnapshot(function (s) { mioProg = s.data() || {}; disegna(); }, function () {}));
    unsubs.push(d.collection('validazioni').doc(u.uid).onSnapshot(function (s) { mieVal = s.data() || {}; disegna(); }, function () {}));
  }
  function ferma() { unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = []; }
  window.addEventListener('tauri-role', function () { if (S.approved && S.approved()) avvia(); else { ferma(); disegna(); } });

  function salvaProg(patch) {
    var u = user(); if (!u) return Promise.reject(new Error('non connesso'));
    patch.email = u.email || ''; patch.nome = u.displayName || '';
    return db().collection('progressi').doc(u.uid).set(patch, { merge: true });
  }

  // ---------- navigazione interna
  function vai(s) { schermo = s; disegna(); window.scrollTo(0, 0); }
  function disegna() {
    if (!root || root.hidden) return;
    root.innerHTML = '';
    if (!(S.enabled && S.approved && S.approved())) {
      root.appendChild(el('p', { class: 'vuoto', text: 'L\'addestramento è disponibile dopo l\'accesso con un account approvato.' }));
      return;
    }
    var f = { lista: vLista, percorso: vPercorso, scheda: vScheda, quiz: vQuiz, esito: vEsito, editor: vEditor, registro: vRegistro, allievo: vAllievo }[schermo.nome] || vLista;
    f(schermo);
  }
  window.TauriTrain = { mostra: function () { disegna(); } };

  // ---------- elenco brevetti
  function vLista() {
    root.appendChild(el('div', { class: 'arch-head' }, [
      el('div', null, [el('h2', { text: 'Addestramento' }), el('p', { class: 'hint', text: 'Teoria, esercizi e test finale per ogni brevetto' })])
    ]));
    var lista = el('div', { class: 'tr-list' });
    brevetti().forEach(function (b) {
      var p = percorso(b.id);
      var nL = p.teoria.filter(function (t) { return letti(b.id)[t.id]; }).length;
      var nV = p.pratica.filter(function (e) { return validati(b.id)[e.id]; }).length;
      var best = migliore(tentativi(b.id));
      var cv = el('canvas', { class: 'tr-badge', 'aria-hidden': 'true' });
      TauriCard.badge(cv, b, best && best.superato && nV === p.pratica.length && p.pratica.length > 0, 48);
      var stato;
      if (!p.teoria.length && !p.pratica.length && !p.domande.length) stato = 'Percorso da preparare';
      else stato = 'Teoria ' + nL + '/' + p.teoria.length + ' · Pratica ' + nV + '/' + p.pratica.length +
        ' · Test ' + (best ? (best.superato ? 'superato ✓' : best.percentuale + '%') : '—');
      var riga = el('button', { type: 'button', class: 'riga', onclick: function () { vai({ nome: 'percorso', bid: b.id }); } }, [
        cv,
        el('span', { class: 'riga-txt' }, [el('b', { class: 'tr-nome', text: b.nome }), el('small', { class: 'tr-stato', text: stato })]),
        el('span', { class: 'riga-freccia', 'aria-hidden': 'true', text: '›' })
      ]);
      lista.appendChild(riga);
    });
    root.appendChild(lista);
  }

  // ---------- pagina del percorso
  function vPercorso(s) {
    var b = brev(s.bid), p = percorso(s.bid);
    root.appendChild(indietro('Brevetti', function () { vai({ nome: 'lista' }); }));
    var cv = el('canvas', { class: 'tr-badge big', 'aria-hidden': 'true' });
    TauriCard.badge(cv, b, true, 64);
    root.appendChild(el('div', { class: 'tr-title' }, [cv, el('h2', { text: b.nome })]));
    if (p.bozza) root.appendChild(el('p', { class: 'tr-nota', text: 'Contenuti di esempio da revisionare: un istruttore può modificarli e salvarli.' }));
    if (canStamp()) {
      root.appendChild(el('div', { class: 'row2' }, [
        btn('Modifica percorso', function () { vai({ nome: 'editor', bid: s.bid }); }),
        btn('Registro allievi', function () { vai({ nome: 'registro', bid: s.bid }); })
      ]));
    }

    // teoria
    var t = el('section', { class: 'card' }, [el('h2', { text: '1 · Teoria' })]);
    if (!p.teoria.length) t.appendChild(el('p', { class: 'hint', text: 'Nessuna scheda ancora.' }));
    p.teoria.forEach(function (x) {
      var ok = !!letti(s.bid)[x.id];
      t.appendChild(el('button', { type: 'button', class: 'tr-item', onclick: function () { vai({ nome: 'scheda', bid: s.bid, id: x.id }); } }, [
        el('span', { class: 'tr-check' + (ok ? ' ok' : ''), 'aria-hidden': 'true', text: ok ? '✓' : '' }),
        el('span', { class: 'tr-item-t', text: x.titolo }),
        el('small', { text: ok ? 'letta' : 'da leggere' })
      ]));
    });
    root.appendChild(t);

    // pratica
    var pr = el('section', { class: 'card' }, [el('h2', { text: '2 · Pratica' }), el('p', { class: 'hint', text: 'Gli esercizi li convalida un istruttore sul campo.' })]);
    if (!p.pratica.length) pr.appendChild(el('p', { class: 'hint', text: 'Nessun esercizio ancora.' }));
    p.pratica.forEach(function (x) {
      var v = validati(s.bid)[x.id];
      pr.appendChild(el('div', { class: 'tr-item static' }, [
        el('span', { class: 'tr-check' + (v ? ' ok' : ''), 'aria-hidden': 'true', text: v ? '✓' : '' }),
        el('span', { class: 'tr-item-t' }, [el('b', { text: x.titolo }), el('span', { class: 'tr-crit', text: x.criterio })]),
        el('small', { text: v ? 'convalidato' + (v.da ? ' da ' + v.da : '') : 'da fare' })
      ]));
    });
    root.appendChild(pr);

    // test
    var tl = tentativi(s.bid), best = migliore(tl);
    var q = el('section', { class: 'card' }, [el('h2', { text: '3 · Test finale' })]);
    var n = Math.min(p.quiz.nDomande, p.domande.length);
    if (!n) q.appendChild(el('p', { class: 'hint', text: 'Le domande del test non sono ancora pronte.' }));
    else {
      q.appendChild(el('p', { class: 'tr-info', text: n + ' domande a caso · ' + p.quiz.minuti + ' minuti · per superarlo serve almeno il ' + p.quiz.soglia + '%' }));
      if (best) q.appendChild(el('p', { class: 'tr-info ' + (best.superato ? 'ok' : 'ko'), text: 'Miglior risultato: ' + best.percentuale + '% ' + (best.superato ? '— superato' : '— non ancora superato') + ' (' + tl.length + (tl.length === 1 ? ' tentativo)' : ' tentativi)') }));
      q.appendChild(btn(best ? 'Rifai il test' : 'Inizia il test', function () { iniziaQuiz(s.bid); }, 'btn-accent'));
    }
    root.appendChild(q);
  }

  // ---------- scheda di teoria
  function vScheda(s) {
    var p = percorso(s.bid), x = p.teoria.filter(function (t) { return t.id === s.id; })[0];
    root.appendChild(indietro(brev(s.bid).nome, function () { vai({ nome: 'percorso', bid: s.bid }); }));
    if (!x) return;
    var art = el('article', { class: 'card tr-scheda' }, [el('h2', { text: x.titolo })]);
    (x.testo || '').split(/\n\s*\n/).forEach(function (par) { art.appendChild(el('p', { text: par })); });
    root.appendChild(art);
    var ok = !!letti(s.bid)[x.id];
    root.appendChild(btn(ok ? 'Letta ✓ (tocca per segnarla da rileggere)' : 'Segna come letta', function () {
      var patch = { letti: {} }; patch.letti[s.bid] = {}; patch.letti[s.bid][x.id] = !ok;
      salvaProg(patch).then(function () { vai({ nome: 'percorso', bid: s.bid }); }, function (e) { toast('Errore: ' + (e.message || e)); });
    }, ok ? 'btn-ghost' : 'btn-accent'));
  }

  // ---------- test
  function mescola(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function iniziaQuiz(bid) {
    var p = percorso(bid);
    var dom = mescola(p.domande).slice(0, Math.min(p.quiz.nDomande, p.domande.length)).map(function (d) {
      var ordine = mescola(d.opzioni.map(function (_, i) { return i; }));
      return { d: d, ordine: ordine, scelta: null };
    });
    quiz = { bid: bid, dom: dom, i: 0, fine: Date.now() + p.quiz.minuti * 60000, soglia: p.quiz.soglia, timer: null };
    quiz.timer = setInterval(function () {
      var el2 = $('trTimer'); if (!quiz) return;
      var r = Math.max(0, quiz.fine - Date.now());
      if (el2) el2.textContent = Math.floor(r / 60000) + ':' + ('0' + Math.floor(r / 1000) % 60).slice(-2);
      if (r <= 0) { toast('Tempo scaduto'); consegna(); }
    }, 500);
    vai({ nome: 'quiz' });
  }
  function vQuiz() {
    if (!quiz) return vai({ nome: 'lista' });
    var q = quiz.dom[quiz.i], tot = quiz.dom.length;
    root.appendChild(el('div', { class: 'tr-quizhead' }, [
      el('span', { text: brev(quiz.bid).nome + ' · domanda ' + (quiz.i + 1) + ' di ' + tot }),
      el('b', { id: 'trTimer', class: 'tr-timer', text: (function () { var r = Math.max(0, quiz.fine - Date.now()); return Math.floor(r / 60000) + ':' + ('0' + Math.floor(r / 1000) % 60).slice(-2); })() })
    ]));
    var risposte = quiz.dom.filter(function (x) { return x.scelta !== null; }).length;
    root.appendChild(el('div', { class: 'tr-progress', 'aria-hidden': 'true' }, [el('span', { style: 'width:' + Math.round(risposte / tot * 100) + '%' })]));
    var box = el('section', { class: 'card' }, [el('p', { class: 'tr-domanda', text: q.d.testo })]);
    q.ordine.forEach(function (oi, k) {
      box.appendChild(el('button', { type: 'button', class: 'tr-opt' + (q.scelta === oi ? ' sel' : ''), 'aria-pressed': String(q.scelta === oi), onclick: function () { q.scelta = oi; disegna(); } }, [
        el('span', { class: 'tr-lettera', text: 'ABCD'[k] || '•' }), el('span', { text: q.d.opzioni[oi] })
      ]));
    });
    root.appendChild(box);
    var nav = el('div', { class: 'row2' }, [
      btn('‹ Precedente', function () { if (quiz.i > 0) { quiz.i--; disegna(); } }),
      quiz.i < tot - 1 ? btn('Successiva ›', function () { quiz.i++; disegna(); }, 'btn-accent')
        : btn('Consegna', function () {
          var mancano = tot - quiz.dom.filter(function (x) { return x.scelta !== null; }).length;
          if (mancano && !confirm('Ci sono ' + mancano + ' domande senza risposta. Consegnare comunque?')) return;
          consegna();
        }, 'btn-accent')
    ]);
    root.appendChild(nav);
    root.appendChild(btn('Abbandona il test', function () {
      if (!confirm('Abbandonare il test? Il tentativo non verrà registrato.')) return;
      clearInterval(quiz.timer); var bid = quiz.bid; quiz = null; vai({ nome: 'percorso', bid: bid });
    }, 'link-btn'));
  }
  function consegna() {
    if (!quiz) return;
    clearInterval(quiz.timer);
    var giuste = quiz.dom.filter(function (x) { return x.scelta === x.d.corretta; }).length;
    var tot = quiz.dom.length, perc = Math.round(giuste / tot * 100);
    var esito = { data: Date.now(), giuste: giuste, totale: tot, percentuale: perc, superato: perc >= quiz.soglia };
    var patch = { test: {} }; patch.test[quiz.bid] = S.fieldValue().arrayUnion(esito);
    salvaProg(patch).catch(function (e) { toast('Risultato non salvato: ' + (e.message || e)); });
    var fatto = quiz; quiz = null;
    vai({ nome: 'esito', fatto: fatto, esito: esito });
  }
  function vEsito(s) {
    var e = s.esito, f = s.fatto;
    root.appendChild(el('section', { class: 'card tr-esito ' + (e.superato ? 'ok' : 'ko') }, [
      el('h2', { text: e.superato ? 'Test superato' : 'Test non superato' }),
      el('p', { class: 'tr-punteggio', text: e.percentuale + '%' }),
      el('p', { text: e.giuste + ' risposte giuste su ' + e.totale + ' (serve almeno il ' + f.soglia + '%)' })
    ]));
    var rev = el('section', { class: 'card' }, [el('h2', { text: 'Correzione' })]);
    f.dom.forEach(function (x, i) {
      var ok = x.scelta === x.d.corretta;
      rev.appendChild(el('div', { class: 'tr-rev ' + (ok ? 'ok' : 'ko') }, [
        el('b', { text: (i + 1) + '. ' + x.d.testo }),
        ok ? el('span', { text: '✓ ' + x.d.opzioni[x.d.corretta] })
          : el('span', { text: '✗ ' + (x.scelta === null ? 'nessuna risposta' : x.d.opzioni[x.scelta]) + ' — giusta: ' + x.d.opzioni[x.d.corretta] })
      ]));
    });
    root.appendChild(rev);
    root.appendChild(btn('Torna al percorso', function () { vai({ nome: 'percorso', bid: f.bid }); }, 'btn-accent'));
  }

  // ---------- editor del percorso (amministratore e istruttori)
  function vEditor(s) {
    var b = brev(s.bid), p = JSON.parse(JSON.stringify(percorso(s.bid)));
    delete p.bozza;
    var uid = function (pref) { return pref + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
    root.appendChild(indietro(b.nome, function () { if (confirm('Uscire senza salvare le modifiche?')) vai({ nome: 'percorso', bid: s.bid }); }));
    root.appendChild(el('h2', { class: 'tr-edit-title', text: 'Modifica percorso · ' + b.nome }));

    function campo(label, input) { return el('label', null, [label, input]); }
    function area(val, oninput, rows) { var t = el('textarea', { rows: rows || 3 }); t.value = val || ''; t.addEventListener('input', function () { oninput(t.value); }); return t; }
    function testo(val, oninput, ph) { var t = el('input', { type: 'text', placeholder: ph || '' }); t.value = val || ''; t.addEventListener('input', function () { oninput(t.value); }); return t; }
    function numero(val, oninput, min, max) { var t = el('input', { type: 'number', min: min, max: max, inputmode: 'numeric' }); t.value = val; t.addEventListener('input', function () { oninput(parseInt(t.value, 10) || 0); }); return t; }
    function togli(arr, i) { return btn('Elimina', function () { if (confirm('Eliminare questa voce?')) { arr.splice(i, 1); ridisegna(); } }, 'link-btn'); }

    var corpo = el('div', { class: 'tr-editor' });
    root.appendChild(corpo);
    function ridisegna() {
      corpo.innerHTML = '';
      var qz = el('section', { class: 'card' }, [el('h2', { text: 'Impostazioni test' }), el('div', { class: 'grid' }, [
        campo('Domande per test', numero(p.quiz.nDomande, function (v) { p.quiz.nDomande = v; }, 1, 50)),
        campo('Minuti', numero(p.quiz.minuti, function (v) { p.quiz.minuti = v; }, 1, 120)),
        campo('Soglia per superarlo (%)', numero(p.quiz.soglia, function (v) { p.quiz.soglia = v; }, 1, 100))
      ])]);
      corpo.appendChild(qz);

      var te = el('section', { class: 'card' }, [el('h2', { text: 'Teoria' })]);
      p.teoria.forEach(function (x, i) {
        te.appendChild(el('div', { class: 'tr-ed-item' }, [
          campo('Titolo', testo(x.titolo, function (v) { x.titolo = v; })),
          campo('Testo (riga vuota = nuovo paragrafo)', area(x.testo, function (v) { x.testo = v; }, 6)),
          togli(p.teoria, i)
        ]));
      });
      te.appendChild(btn('+ Aggiungi scheda', function () { p.teoria.push({ id: uid('t'), titolo: '', testo: '' }); ridisegna(); }));
      corpo.appendChild(te);

      var pr = el('section', { class: 'card' }, [el('h2', { text: 'Esercizi pratici' })]);
      p.pratica.forEach(function (x, i) {
        pr.appendChild(el('div', { class: 'tr-ed-item' }, [
          campo('Esercizio', testo(x.titolo, function (v) { x.titolo = v; })),
          campo('Come si supera', area(x.criterio, function (v) { x.criterio = v; }, 3)),
          togli(p.pratica, i)
        ]));
      });
      pr.appendChild(btn('+ Aggiungi esercizio', function () { p.pratica.push({ id: uid('p'), titolo: '', criterio: '' }); ridisegna(); }));
      corpo.appendChild(pr);

      var dq = el('section', { class: 'card' }, [el('h2', { text: 'Domande del test (' + p.domande.length + ')' }),
        el('p', { class: 'hint', text: 'Scrivi 4 risposte e scegli quella giusta: nel test l\'ordine viene mescolato.' })]);
      p.domande.forEach(function (x, i) {
        while (x.opzioni.length < 4) x.opzioni.push('');
        var opz = x.opzioni.map(function (o, k) {
          var r = el('input', { type: 'radio', name: 'c_' + x.id, 'aria-label': 'Risposta giusta ' + (k + 1) });
          r.checked = x.corretta === k; r.addEventListener('change', function () { x.corretta = k; });
          return el('div', { class: 'tr-ed-opt' }, [r, testo(o, function (v) { x.opzioni[k] = v; }, 'Risposta ' + (k + 1))]);
        });
        dq.appendChild(el('div', { class: 'tr-ed-item' }, [campo('Domanda ' + (i + 1), area(x.testo, function (v) { x.testo = v; }, 2))].concat(opz).concat([togli(p.domande, i)])));
      });
      dq.appendChild(btn('+ Aggiungi domanda', function () { p.domande.push({ id: uid('q'), testo: '', opzioni: ['', '', '', ''], corretta: 0 }); ridisegna(); }));
      corpo.appendChild(dq);

      corpo.appendChild(btn('Salva percorso', function () {
        var vuote = p.domande.filter(function (d) { return !d.testo.trim() || d.opzioni.some(function (o) { return !o.trim(); }); }).length;
        if (vuote) { toast(vuote + ' domande hanno campi vuoti'); return; }
        p.teoria = p.teoria.filter(function (x) { return x.titolo.trim() || x.testo.trim(); });
        p.pratica = p.pratica.filter(function (x) { return x.titolo.trim(); });
        var u = user(); p.aggiornatoDa = u ? u.email : ''; p.aggiornatoIl = Date.now();
        db().collection('percorsi').doc(s.bid).set(p).then(function () { toast('Percorso salvato'); vai({ nome: 'percorso', bid: s.bid }); },
          function (e) { toast('Errore: ' + (e.message || e)); });
      }, 'btn-accent'));
    }
    ridisegna();
  }

  // ---------- registro istruttore
  function vRegistro(s) {
    var b = brev(s.bid), p = percorso(s.bid);
    root.appendChild(indietro(b.nome, function () { vai({ nome: 'percorso', bid: s.bid }); }));
    root.appendChild(el('h2', { class: 'tr-edit-title', text: 'Registro allievi · ' + b.nome }));
    var box = el('div', { class: 'tr-list' }, [el('p', { class: 'hint', text: 'Caricamento…' })]);
    root.appendChild(box);
    Promise.all([db().collection('progressi').get(), db().collection('validazioni').get()]).then(function (r) {
      var val = {}; r[1].docs.forEach(function (d) { val[d.id] = d.data(); });
      box.innerHTML = '';
      var righe = r[0].docs.map(function (d) { return { uid: d.id, prog: d.data(), val: val[d.id] || {} }; })
        .sort(function (x, y) { return (x.prog.nome || x.prog.email || '').localeCompare(y.prog.nome || y.prog.email || '', 'it'); });
      if (!righe.length) box.appendChild(el('p', { class: 'hint', text: 'Nessun allievo ha ancora iniziato un percorso.' }));
      righe.forEach(function (a) {
        var nL = p.teoria.filter(function (t) { return ((a.prog.letti || {})[s.bid] || {})[t.id]; }).length;
        var nV = p.pratica.filter(function (e) { return (a.val[s.bid] || {})[e.id]; }).length;
        var best = migliore(((a.prog.test || {})[s.bid]) || []);
        box.appendChild(el('button', { type: 'button', class: 'riga', onclick: function () { vai({ nome: 'allievo', bid: s.bid, a: a }); } }, [
          el('span', { class: 'riga-txt' }, [
            el('b', { class: 'tr-nome', text: a.prog.nome || a.prog.email || 'Senza nome' }),
            el('small', { class: 'tr-stato', text: 'Teoria ' + nL + '/' + p.teoria.length + ' · Pratica ' + nV + '/' + p.pratica.length + ' · Test ' + (best ? best.percentuale + '%' + (best.superato ? ' ✓' : '') : '—') })
          ]),
          el('span', { class: 'riga-freccia', 'aria-hidden': 'true', text: '›' })
        ]));
      });
    }, function (e) { box.innerHTML = ''; box.appendChild(el('p', { class: 'hint warn', text: 'Registro non disponibile: ' + (e.message || e) + '. Controlla le regole di Firestore.' })); });
  }
  function vAllievo(s) {
    var b = brev(s.bid), p = percorso(s.bid), a = s.a;
    root.appendChild(indietro('Registro', function () { vai({ nome: 'registro', bid: s.bid }); }));
    root.appendChild(el('h2', { class: 'tr-edit-title', text: (a.prog.nome || a.prog.email) + ' · ' + b.nome }));
    var card = el('section', { class: 'card' }, [el('h2', { text: 'Convalida esercizi pratici' })]);
    p.pratica.forEach(function (x) {
      var v = (a.val[s.bid] || {})[x.id];
      var cb = el('input', { type: 'checkbox' }); cb.checked = !!v;
      cb.addEventListener('change', function () {
        var patch = {}; patch[s.bid] = {};
        var u = user();
        patch[s.bid][x.id] = cb.checked ? { da: (u && (u.displayName || u.email)) || '', il: Date.now() } : S.fieldValue().delete();
        db().collection('validazioni').doc(a.uid).set(patch, { merge: true }).then(function () {
          a.val[s.bid] = a.val[s.bid] || {};
          if (cb.checked) a.val[s.bid][x.id] = patch[s.bid][x.id]; else delete a.val[s.bid][x.id];
          toast(cb.checked ? 'Esercizio convalidato' : 'Convalida tolta');
        }, function (e) { cb.checked = !cb.checked; toast('Errore: ' + (e.message || e)); });
      });
      card.appendChild(el('label', { class: 'check tr-val' }, [cb, el('span', null, [el('b', { text: x.titolo }), el('small', { text: x.criterio })])]));
    });
    root.appendChild(card);
    var tl = (((a.prog.test || {})[s.bid]) || []).slice().sort(function (x, y) { return y.data - x.data; });
    var tc = el('section', { class: 'card' }, [el('h2', { text: 'Tentativi del test' })]);
    if (!tl.length) tc.appendChild(el('p', { class: 'hint', text: 'Nessun tentativo.' }));
    tl.forEach(function (t) {
      tc.appendChild(el('p', { class: 'tr-info ' + (t.superato ? 'ok' : 'ko'), text: new Date(t.data).toLocaleString('it-IT') + ' — ' + t.percentuale + '% (' + t.giuste + '/' + t.totale + ')' + (t.superato ? ' superato' : '') }));
    });
    root.appendChild(tc);
    root.appendChild(el('p', { class: 'hint', text: 'Quando teoria, pratica e test sono completi e l\'esame pratico è superato, assegna il brevetto dalla sua tessera.' }));
  }

  if (S.approved && S.approved()) avvia();
})();
