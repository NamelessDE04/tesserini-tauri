/* Addestramento per i brevetti.
   Ogni brevetto ha un percorso fatto di SEZIONI libere, nell'ordine scelto dall'istruttore:
   - teoria   testo e immagini in qualsiasi punto (la legge l'allievo)
   - pratica  descrizione con immagini (la convalida un istruttore)
   - test     domande a risposta multipla, ognuna con un'eventuale immagine
   Dati su Firestore:
   - percorsi/{brevetto}   { v: 2, sezioni: [...] }   (amministratore e istruttori)
   - immagini/{id}         { d: 'data:image/jpeg;base64,…' }  una immagine per documento
   - progressi/{uid}       letti[brevetto][sezione], test[brevetto] = tentativi (li scrive l'allievo)
   - validazioni/{uid}     [brevetto][sezione] = convalida pratica (amministratore e istruttori) */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var S = window.TauriSync;
  var root = $('viewTrain');

  var percorsi = {};
  var mioProg = {};
  var mieVal = {};
  var schermo = { nome: 'lista' };
  var quiz = null;
  var unsubs = [];
  var imgCache = {};      // id → dataURL già scaricato
  var TIPI = {
    teoria: { nome: 'Teoria', icona: '📖' },
    pratica: { nome: 'Pratica', icona: '🎯' },
    test: { nome: 'Test', icona: '✍️' }
  };

  function toast(m) { if (window.TauriApp) window.TauriApp.toast(m); }
  function db() { return S.db && S.db(); }
  function user() { return S.user && S.user(); }
  function canStamp() { return S.canStamp && S.canStamp(); }
  function nuovoId(pref) { return pref + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function errMsg(e) {
    var m = (e && (e.message || e.code)) || String(e);
    if (/permission|insufficient/i.test(m)) return 'permesso negato dal database: vanno pubblicate le regole Firestore aggiornate';
    return m;
  }

  // ---------- costruttore di elementi (il testo è sempre inserito come testo, mai come HTML)
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
  function btn(label, fn, cls, title) { return el('button', { type: 'button', class: 'btn ' + (cls || 'btn-ghost'), onclick: fn, text: label, title: title, 'aria-label': title }); }
  function indietro(label, fn) {
    return el('button', { type: 'button', class: 'tr-back', onclick: fn }, [el('span', { 'aria-hidden': 'true', text: '‹ ' }), label]);
  }

  // ---------- dati
  function brevetti() { return TauriCard.BREVETTI; }
  function brev(bid) { return brevetti().filter(function (b) { return b.id === bid; })[0]; }
  function percorso(bid) {
    var p = percorsi[bid];
    // i percorsi nel formato vecchio vengono ignorati: si riparte puliti
    return { sezioni: (p && p.v === 2 && Array.isArray(p.sezioni)) ? p.sezioni : [] };
  }
  function sezione(bid, id) { return percorso(bid).sezioni.filter(function (x) { return x.id === id; })[0]; }
  function letti(bid, prog) { return (((prog || mioProg).letti || {})[bid]) || {}; }
  function tentativi(bid, sid, prog) {
    return ((((prog || mioProg).test || {})[bid]) || []).filter(function (t) { return t.sez === sid; })
      .sort(function (a, b) { return b.data - a.data; });
  }
  function validati(bid, val) { return ((val || mieVal)[bid]) || {}; }
  function migliore(list) { return list.reduce(function (m, t) { return !m || t.percentuale > m.percentuale ? t : m; }, null); }
  function fatta(bid, x, prog, val) {
    if (x.tipo === 'teoria') return !!letti(bid, prog)[x.id];
    if (x.tipo === 'pratica') return !!validati(bid, val)[x.id];
    var b = migliore(tentativi(bid, x.id, prog)); return !!(b && b.superato);
  }
  function conteggio(bid, prog, val) {
    var s = percorso(bid).sezioni;
    return { fatte: s.filter(function (x) { return fatta(bid, x, prog, val); }).length, tot: s.length };
  }

  function avvia() {
    ferma();
    var u = user(), d = db();
    if (!u || !d) { disegna(); return; }
    unsubs.push(d.collection('percorsi').onSnapshot(function (qs) {
      percorsi = {}; qs.docs.forEach(function (x) { percorsi[x.id] = x.data(); });
      if (schermo.nome !== 'editsez' && schermo.nome !== 'quiz') disegna();
    }, function () {}));
    unsubs.push(d.collection('progressi').doc(u.uid).onSnapshot(function (s) { mioProg = s.data() || {}; if (schermo.nome !== 'editsez' && schermo.nome !== 'quiz') disegna(); }, function () {}));
    unsubs.push(d.collection('validazioni').doc(u.uid).onSnapshot(function (s) { mieVal = s.data() || {}; if (schermo.nome !== 'editsez' && schermo.nome !== 'quiz') disegna(); }, function () {}));
  }
  function ferma() { unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = []; }
  window.addEventListener('tauri-role', function () { if (S.approved && S.approved()) avvia(); else { ferma(); disegna(); } });

  function salvaProg(patch) {
    var u = user(); if (!u) return Promise.reject(new Error('non connesso'));
    patch.email = u.email || ''; patch.nome = u.displayName || '';
    return db().collection('progressi').doc(u.uid).set(patch, { merge: true });
  }

  // ---------- immagini
  function caricaImg(id) {
    if (imgCache[id]) return Promise.resolve(imgCache[id]);
    return db().collection('immagini').doc(id).get().then(function (s) {
      var d = s.exists ? (s.data() || {}).d : null; if (d) imgCache[id] = d; return d;
    });
  }
  function apriGrande(src) {
    var ov = el('div', { class: 'tr-lightbox', role: 'dialog', 'aria-label': 'Immagine ingrandita', onclick: function () { ov.remove(); } }, [
      el('img', { src: src, alt: '' }), el('span', { class: 'tr-lb-x', text: 'Tocca per chiudere' })
    ]);
    document.body.appendChild(ov);
  }
  function figura(id, cap, locale) {
    var img = el('img', { alt: cap || 'Immagine' });
    var fig = el('figure', { class: 'tr-fig' }, [el('button', { type: 'button', class: 'tr-fig-btn', 'aria-label': 'Ingrandisci immagine', onclick: function () { if (img.src) apriGrande(img.src); } }, [img])]);
    if (cap) fig.appendChild(el('figcaption', { text: cap }));
    if (locale) img.src = locale;
    else {
      fig.classList.add('carica');
      caricaImg(id).then(function (d) { fig.classList.remove('carica'); if (d) img.src = d; else fig.classList.add('manca'); },
        function () { fig.classList.remove('carica'); fig.classList.add('manca'); });
    }
    return fig;
  }
  // ridimensiona la foto (lato lungo max 1400 px, JPEG) perché stia in un documento Firestore
  function comprimi(file) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var lato = 1400, q = 0.82, out;
        for (var giro = 0; giro < 8; giro++) {
          var k = Math.min(1, lato / Math.max(im.naturalWidth, im.naturalHeight));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q);
          if (out.length < 850000) return ok(out);
          if (q > 0.6) q -= 0.1; else lato = Math.round(lato * 0.8);
        }
        ok(out);
      };
      im.onerror = function () { URL.revokeObjectURL(url); ko(new Error('immagine non leggibile')); };
      im.src = url;
    });
  }
  function scegliFoto(multi, cb) {
    var inp = el('input', { type: 'file', accept: 'image/*', multiple: !!multi, style: 'display:none' });
    inp.addEventListener('change', function () {
      var files = Array.prototype.slice.call(inp.files || []); inp.remove();
      if (!files.length) return;
      toast(files.length > 1 ? 'Preparo ' + files.length + ' immagini…' : 'Preparo l\'immagine…');
      Promise.all(files.map(comprimi)).then(cb, function (e) { toast('Errore: ' + errMsg(e)); });
    });
    document.body.appendChild(inp); inp.click();
  }

  // testo: riga vuota = nuovo paragrafo · "# " = sottotitolo · "- " = elenco puntato
  function rendiTesto(cont, txt) {
    (txt || '').split(/\n\s*\n/).forEach(function (par) {
      par = par.replace(/^\s+|\s+$/g, ''); if (!par) return;
      var righe = par.split('\n');
      if (/^#\s+/.test(righe[0])) { cont.appendChild(el('h3', { class: 'tr-sub', text: righe[0].replace(/^#\s+/, '') })); righe.shift(); if (!righe.length) return; }
      if (righe.every(function (r) { return /^\s*[-•]\s+/.test(r); })) {
        cont.appendChild(el('ul', null, righe.map(function (r) { return el('li', { text: r.replace(/^\s*[-•]\s+/, '') }); }))); return;
      }
      cont.appendChild(el('p', { text: righe.join('\n') }));
    });
  }
  function rendiBlocchi(cont, blocchi) {
    (blocchi || []).forEach(function (b) {
      if (b.t === 'img') cont.appendChild(figura(b.img, b.cap));
      else rendiTesto(cont, b.v);
    });
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
    var f = { lista: vLista, percorso: vPercorso, sez: vSezione, quiz: vQuiz, esito: vEsito, editor: vEditor, editsez: vEditSez, registro: vRegistro, allievo: vAllievo }[schermo.nome] || vLista;
    f(schermo);
  }
  window.TauriTrain = { mostra: function () { disegna(); } };

  // ---------- elenco brevetti
  function vLista() {
    root.appendChild(el('div', { class: 'arch-head' }, [
      el('div', null, [el('h2', { text: 'Addestramento' }), el('p', { class: 'hint', text: 'Teoria, pratica e test per ogni brevetto' })])
    ]));
    var lista = el('div', { class: 'tr-list' });
    brevetti().forEach(function (b) {
      var c = conteggio(b.id);
      var cv = el('canvas', { class: 'tr-badge', 'aria-hidden': 'true' });
      TauriCard.badge(cv, b, c.tot > 0 && c.fatte === c.tot, 48);
      var stato = c.tot ? c.fatte + ' di ' + c.tot + ' sezioni completate' + (c.fatte === c.tot ? ' ✓' : '') : 'Percorso da preparare';
      lista.appendChild(el('button', { type: 'button', class: 'riga', onclick: function () { vai({ nome: 'percorso', bid: b.id }); } }, [
        cv,
        el('span', { class: 'riga-txt' }, [el('b', { class: 'tr-nome', text: b.nome }), el('small', { class: 'tr-stato', text: stato })]),
        el('span', { class: 'riga-freccia', 'aria-hidden': 'true', text: '›' })
      ]));
    });
    root.appendChild(lista);
  }

  // ---------- pagina del percorso: elenco delle sezioni
  function statoSez(bid, x) {
    if (x.tipo === 'teoria') return letti(bid)[x.id] ? 'letta' : 'da leggere';
    if (x.tipo === 'pratica') { var v = validati(bid)[x.id]; return v ? 'convalidata' : 'da fare'; }
    var best = migliore(tentativi(bid, x.id));
    return best ? (best.superato ? 'superato' : best.percentuale + '%') : 'da fare';
  }
  function vPercorso(s) {
    var b = brev(s.bid), p = percorso(s.bid);
    root.appendChild(indietro('Brevetti', function () { vai({ nome: 'lista' }); }));
    var cv = el('canvas', { class: 'tr-badge big', 'aria-hidden': 'true' });
    TauriCard.badge(cv, b, true, 64);
    root.appendChild(el('div', { class: 'tr-title' }, [cv, el('h2', { text: b.nome })]));
    if (canStamp()) {
      root.appendChild(el('div', { class: 'row2' }, [
        btn('Modifica percorso', function () { vai({ nome: 'editor', bid: s.bid }); }, 'btn-accent'),
        btn('Registro allievi', function () { vai({ nome: 'registro', bid: s.bid }); })
      ]));
    }
    var card = el('section', { class: 'card' });
    if (!p.sezioni.length) card.appendChild(el('p', { class: 'hint', text: canStamp() ? 'Il percorso è vuoto. Tocca "Modifica percorso" per aggiungere teoria, pratica o test.' : 'Il percorso non è ancora pronto.' }));
    var demo = window.TAURI_DEMO && window.TAURI_DEMO[s.bid];
    if (!p.sezioni.length && demo && S.isAdmin && S.isAdmin()) {
      var bd = btn('Carica il percorso dimostrativo', function () {
        if (!confirm('Caricare il percorso dimostrativo di ' + b.nome + '? Dopo potrai modificarlo o eliminarlo come qualsiasi altro.')) return;
        bd.disabled = true; bd.textContent = 'Caricamento in corso…';
        caricaDemo(s.bid, demo).then(function () { toast('Percorso dimostrativo caricato'); disegna(); },
          function (e) { bd.disabled = false; bd.textContent = 'Carica il percorso dimostrativo'; toast('Errore: ' + errMsg(e)); });
      }, 'btn-accent');
      card.appendChild(bd);
    }
    p.sezioni.forEach(function (x, i) {
      var ok = fatta(s.bid, x);
      card.appendChild(el('button', { type: 'button', class: 'tr-item', onclick: function () { vai({ nome: 'sez', bid: s.bid, id: x.id }); } }, [
        el('span', { class: 'tr-check' + (ok ? ' ok' : ''), 'aria-hidden': 'true', text: ok ? '✓' : String(i + 1) }),
        el('span', { class: 'tr-item-t' }, [el('b', { text: x.titolo || 'Senza titolo' }), el('span', { class: 'tr-crit', text: TIPI[x.tipo].icona + ' ' + TIPI[x.tipo].nome })]),
        el('small', { text: statoSez(s.bid, x) })
      ]));
    });
    root.appendChild(card);
  }

  // ---------- una sezione (teoria / pratica / test)
  function vSezione(s) {
    var x = sezione(s.bid, s.id);
    root.appendChild(indietro(brev(s.bid).nome, function () { vai({ nome: 'percorso', bid: s.bid }); }));
    if (!x) { root.appendChild(el('p', { class: 'hint', text: 'Questa sezione non esiste più.' })); return; }
    var art = el('article', { class: 'card tr-scheda' }, [
      el('span', { class: 'tr-tipo', text: TIPI[x.tipo].icona + ' ' + TIPI[x.tipo].nome }),
      el('h2', { text: x.titolo || 'Senza titolo' })
    ]);
    if (x.tipo !== 'test') rendiBlocchi(art, x.blocchi);
    root.appendChild(art);

    if (x.tipo === 'teoria') {
      var ok = !!letti(s.bid)[x.id];
      root.appendChild(btn(ok ? 'Letta ✓ (tocca per segnarla da rileggere)' : 'Segna come letta', function () {
        var patch = { letti: {} }; patch.letti[s.bid] = {}; patch.letti[s.bid][x.id] = !ok;
        salvaProg(patch).then(function () { vai({ nome: 'percorso', bid: s.bid }); }, function (e) { toast('Errore: ' + errMsg(e)); });
      }, ok ? 'btn-ghost' : 'btn-accent'));
    } else if (x.tipo === 'pratica') {
      var v = validati(s.bid)[x.id];
      art.appendChild(el('p', { class: 'tr-info ' + (v ? 'ok' : ''), text: v ? '✓ Convalidata' + (v.da ? ' da ' + v.da : '') + (v.il ? ' il ' + new Date(v.il).toLocaleDateString('it-IT') : '') : 'Questa prova la convalida un istruttore sul campo.' }));
    } else {
      var n = Math.min(x.nDomande || 10, (x.domande || []).length);
      var tl = tentativi(s.bid, x.id), best = migliore(tl);
      if (!n) art.appendChild(el('p', { class: 'hint', text: 'Le domande di questo test non sono ancora pronte.' }));
      else {
        art.appendChild(el('p', { class: 'tr-info', text: n + ' domande' + (n < x.domande.length ? ' a caso' : '') + ' · ' + x.minuti + ' minuti · per superarlo serve almeno il ' + x.soglia + '%' }));
        if (best) art.appendChild(el('p', { class: 'tr-info ' + (best.superato ? 'ok' : 'ko'), text: 'Miglior risultato: ' + best.percentuale + '% ' + (best.superato ? '— superato' : '— non ancora superato') + ' (' + tl.length + (tl.length === 1 ? ' tentativo)' : ' tentativi)') }));
        root.appendChild(btn(best ? 'Rifai il test' : 'Inizia il test', function () { iniziaQuiz(s.bid, x); }, 'btn-accent'));
      }
    }
  }

  // ---------- test
  function mescola(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function orologio() { var r = Math.max(0, quiz.fine - Date.now()); return Math.floor(r / 60000) + ':' + ('0' + Math.floor(r / 1000) % 60).slice(-2); }
  function iniziaQuiz(bid, x) {
    var dom = mescola(x.domande).slice(0, Math.min(x.nDomande || 10, x.domande.length)).map(function (d) {
      return { d: d, ordine: mescola(d.opzioni.map(function (_, i) { return i; })), scelta: null };
    });
    quiz = { bid: bid, sez: x, dom: dom, i: 0, fine: Date.now() + (x.minuti || 15) * 60000, soglia: x.soglia || 80, timer: null };
    quiz.timer = setInterval(function () {
      if (!quiz) return;
      var t = $('trTimer'); if (t) t.textContent = orologio();
      if (quiz.fine <= Date.now()) { toast('Tempo scaduto'); consegna(); }
    }, 500);
    vai({ nome: 'quiz' });
  }
  function vQuiz() {
    if (!quiz) return vai({ nome: 'lista' });
    var q = quiz.dom[quiz.i], tot = quiz.dom.length;
    root.appendChild(el('div', { class: 'tr-quizhead' }, [
      el('span', { text: (quiz.sez.titolo || 'Test') + ' · domanda ' + (quiz.i + 1) + ' di ' + tot }),
      el('b', { id: 'trTimer', class: 'tr-timer', text: orologio() })
    ]));
    var risposte = quiz.dom.filter(function (x) { return x.scelta !== null; }).length;
    root.appendChild(el('div', { class: 'tr-progress', 'aria-hidden': 'true' }, [el('span', { style: 'width:' + Math.round(risposte / tot * 100) + '%' })]));
    var box = el('section', { class: 'card' }, [el('p', { class: 'tr-domanda', text: q.d.testo })]);
    if (q.d.img) box.appendChild(figura(q.d.img));
    q.ordine.forEach(function (oi, k) {
      box.appendChild(el('button', { type: 'button', class: 'tr-opt' + (q.scelta === oi ? ' sel' : ''), 'aria-pressed': String(q.scelta === oi), onclick: function () { q.scelta = oi; disegna(); } }, [
        el('span', { class: 'tr-lettera', text: 'ABCDEF'[k] || '•' }), el('span', { text: q.d.opzioni[oi] })
      ]));
    });
    root.appendChild(box);
    root.appendChild(el('div', { class: 'row2' }, [
      btn('‹ Precedente', function () { if (quiz.i > 0) { quiz.i--; disegna(); } }),
      quiz.i < tot - 1 ? btn('Successiva ›', function () { quiz.i++; disegna(); }, 'btn-accent')
        : btn('Consegna', function () {
          var mancano = tot - quiz.dom.filter(function (x) { return x.scelta !== null; }).length;
          if (mancano && !confirm('Ci sono ' + mancano + ' domande senza risposta. Consegnare comunque?')) return;
          consegna();
        }, 'btn-accent')
    ]));
    root.appendChild(btn('Abbandona il test', function () {
      if (!confirm('Abbandonare il test? Il tentativo non verrà registrato.')) return;
      clearInterval(quiz.timer); var bid = quiz.bid, id = quiz.sez.id; quiz = null; vai({ nome: 'sez', bid: bid, id: id });
    }, 'link-btn'));
  }
  function consegna() {
    if (!quiz) return;
    clearInterval(quiz.timer);
    var giuste = quiz.dom.filter(function (x) { return x.scelta === x.d.corretta; }).length;
    var tot = quiz.dom.length, perc = Math.round(giuste / tot * 100);
    var esito = { sez: quiz.sez.id, data: Date.now(), giuste: giuste, totale: tot, percentuale: perc, superato: perc >= quiz.soglia };
    var patch = { test: {} }; patch.test[quiz.bid] = S.fieldValue().arrayUnion(esito);
    salvaProg(patch).catch(function (e) { toast('Risultato non salvato: ' + errMsg(e)); });
    var f = quiz; quiz = null;
    vai({ nome: 'esito', fatto: f, esito: esito });
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

  // ---------- salvataggio del percorso (con le immagini nuove e la pulizia di quelle tolte)
  function immaginiDi(sezioni) {
    var ids = {};
    sezioni.forEach(function (x) {
      (x.blocchi || []).forEach(function (b) { if (b.t === 'img' && b.img) ids[b.img] = 1; });
      (x.domande || []).forEach(function (d) { if (d.img) ids[d.img] = 1; });
    });
    return ids;
  }
  function salvaPercorso(bid, sezioni, nuove) {
    var d = db(), u = user();
    var prima = immaginiDi(percorso(bid).sezioni), dopo = immaginiDi(sezioni);
    var daCaricare = Object.keys(nuove || {}).filter(function (id) { return dopo[id]; });
    return Promise.all(daCaricare.map(function (id) {
      return d.collection('immagini').doc(id).set({ d: nuove[id], bid: bid, da: (u && u.email) || '', il: Date.now() })
        .then(function () { imgCache[id] = nuove[id]; });
    })).then(function () {
      return d.collection('percorsi').doc(bid).set({ v: 2, sezioni: sezioni, aggiornatoDa: (u && u.email) || '', aggiornatoIl: Date.now() });
    }).then(function () {
      Object.keys(prima).forEach(function (id) { if (!dopo[id]) d.collection('immagini').doc(id).delete().catch(function () {}); });
    });
  }

  // ---------- percorso dimostrativo (train-demo.js): le immagini vengono caricate come quelle scelte dal telefono
  function caricaDemo(bid, demo) {
    var nomi = {}, nuove = {};
    demo.forEach(function (x) {
      (x.blocchi || []).forEach(function (b) { if (b.img) nomi[b.img] = 1; });
      (x.domande || []).forEach(function (d) { if (d.img) nomi[d.img] = 1; });
    });
    var ids = {};
    return Promise.all(Object.keys(nomi).map(function (n) {
      return fetch('img/demo/' + n + '.jpg', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('immagine ' + n + ' non trovata'); return r.blob();
      }).then(comprimi).then(function (d) { ids[n] = nuovoId('img'); nuove[ids[n]] = d; });
    })).then(function () {
      var sezioni = demo.map(function (x) {
        var y = { id: nuovoId('s'), tipo: x.tipo, titolo: x.titolo };
        if (x.tipo === 'test') {
          y.nDomande = x.nDomande; y.minuti = x.minuti; y.soglia = x.soglia;
          y.domande = x.domande.map(function (d) {
            var q = { id: nuovoId('q'), testo: d.testo, opzioni: d.opzioni.slice(), corretta: d.corretta };
            if (d.img) q.img = ids[d.img]; return q;
          });
        } else {
          y.blocchi = x.blocchi.map(function (b) { return b.img ? { t: 'img', img: ids[b.img], cap: b.cap || '' } : { t: 'testo', v: b.v }; });
        }
        return y;
      });
      return salvaPercorso(bid, sezioni, nuove);
    });
  }

  // ---------- editor del percorso: elenco e ordine delle sezioni
  function vEditor(s) {
    var b = brev(s.bid), sez = percorso(s.bid).sezioni;
    root.appendChild(indietro(b.nome, function () { vai({ nome: 'percorso', bid: s.bid }); }));
    root.appendChild(el('h2', { class: 'tr-edit-title', text: 'Modifica percorso · ' + b.nome }));
    root.appendChild(el('p', { class: 'hint', text: 'Metti le sezioni che vuoi, nell\'ordine che vuoi: solo teoria, solo test, solo pratica o un mix. Le modifiche all\'elenco si salvano subito.' }));
    function salvaElenco(nuovo) {
      salvaPercorso(s.bid, nuovo).then(function () { toast('Percorso aggiornato'); vai({ nome: 'editor', bid: s.bid }); }, function (e) { toast('Errore: ' + errMsg(e)); });
    }
    var card = el('section', { class: 'card' });
    if (!sez.length) card.appendChild(el('p', { class: 'hint', text: 'Nessuna sezione. Aggiungine una qui sotto.' }));
    sez.forEach(function (x, i) {
      var copia = function () { return JSON.parse(JSON.stringify(sez)); };
      card.appendChild(el('div', { class: 'tr-ed-sez' }, [
        el('span', { class: 'tr-ed-sez-t' }, [el('b', { text: (i + 1) + '. ' + (x.titolo || 'Senza titolo') }), el('small', { text: TIPI[x.tipo].icona + ' ' + TIPI[x.tipo].nome })]),
        el('span', { class: 'tr-mini' }, [
          btn('↑', function () { if (!i) return; var c = copia(); c.splice(i - 1, 0, c.splice(i, 1)[0]); salvaElenco(c); }, 'tr-ico', 'Sposta su'),
          btn('↓', function () { if (i === sez.length - 1) return; var c = copia(); c.splice(i + 1, 0, c.splice(i, 1)[0]); salvaElenco(c); }, 'tr-ico', 'Sposta giù'),
          btn('✎', function () { vai({ nome: 'editsez', bid: s.bid, id: x.id }); }, 'tr-ico', 'Modifica'),
          btn('✕', function () { if (confirm('Eliminare la sezione "' + (x.titolo || 'Senza titolo') + '" con tutte le sue immagini?')) { var c = copia(); c.splice(i, 1); salvaElenco(c); } }, 'tr-ico danger', 'Elimina')
        ])
      ]));
    });
    root.appendChild(card);
    root.appendChild(el('h3', { class: 'tr-add-h', text: 'Aggiungi una sezione' }));
    root.appendChild(el('div', { class: 'tr-add' }, ['teoria', 'pratica', 'test'].map(function (t) {
      return btn(TIPI[t].icona + ' ' + TIPI[t].nome, function () { vai({ nome: 'editsez', bid: s.bid, tipo: t }); });
    })));
  }

  // ---------- editor di una sezione
  function vEditSez(s) {
    var b = brev(s.bid), esistente = s.id && sezione(s.bid, s.id);
    // la bozza resta in memoria finché non si salva (anche se arrivano aggiornamenti dal database)
    if (!s.bozza) {
      s.bozza = esistente ? JSON.parse(JSON.stringify(esistente)) : { id: nuovoId('s'), tipo: s.tipo, titolo: '' };
      var x0 = s.bozza;
      if (x0.tipo === 'test') { x0.domande = x0.domande || []; x0.nDomande = x0.nDomande || 10; x0.minuti = x0.minuti || 15; x0.soglia = x0.soglia || 80; }
      else { x0.blocchi = x0.blocchi || [{ t: 'testo', v: '' }]; }
      s.nuove = {};
    }
    var x = s.bozza, nuove = s.nuove;
    root.appendChild(indietro('Percorso', function () { if (confirm('Uscire senza salvare questa sezione?')) vai({ nome: 'editor', bid: s.bid }); }));
    root.appendChild(el('h2', { class: 'tr-edit-title', text: (esistente ? 'Modifica ' : 'Nuova sezione · ') + TIPI[x.tipo].nome + ' · ' + b.nome }));

    function campo(label, input) { return el('label', null, [label, input]); }
    function testoIn(val, oninput, ph) { var t = el('input', { type: 'text', placeholder: ph || '' }); t.value = val || ''; t.addEventListener('input', function () { oninput(t.value); }); return t; }
    function numero(val, oninput, min, max) { var t = el('input', { type: 'number', min: min, max: max, inputmode: 'numeric' }); t.value = val; t.addEventListener('input', function () { oninput(parseInt(t.value, 10) || 0); }); return t; }
    // adatta l'altezza del riquadro al testo senza far saltare la pagina
    function autoAltezza(t, scrivendo) {
      var y = window.scrollY;
      corpo.style.minHeight = corpo.offsetHeight + 'px';   // la pagina non si accorcia mentre misuro
      t.style.height = 'auto';
      t.style.height = Math.max(90, t.scrollHeight + 4) + 'px';
      corpo.style.minHeight = '';
      if (window.scrollY !== y) window.scrollTo(0, y);
      if (!scrivendo) return;
      // se si scrive in fondo al riquadro, tiene visibile l'ultima riga sopra la tastiera e la barra "Salva"
      if (t.selectionEnd >= t.value.length - 1) {
        var vv = window.visualViewport, alto = vv ? vv.height + vv.offsetTop : window.innerHeight;
        var barra = document.querySelector('.tr-save'), limite = alto - (barra ? barra.offsetHeight + 16 : 16);
        var fondo = t.getBoundingClientRect().bottom;
        if (fondo > limite) window.scrollBy(0, fondo - limite);
      }
    }
    function imgSrc(id) { return nuove[id] || imgCache[id]; }
    function anteprima(id) {
      var src = imgSrc(id), im = el('img', { alt: '' });
      if (src) im.src = src; else caricaImg(id).then(function (d) { if (d) im.src = d; });
      return el('div', { class: 'tr-ed-img' }, [im]);
    }

    var corpo = el('div', { class: 'tr-editor' });
    root.appendChild(corpo);
    var fuoco = null;  // { i, pos } per rimettere il cursore dopo un ridisegno

    function ridisegna() {
      corpo.innerHTML = '';
      corpo.appendChild(el('section', { class: 'card' }, [campo('Titolo della sezione', testoIn(x.titolo, function (v) { x.titolo = v; }, x.tipo === 'test' ? 'Es. Test finale' : 'Es. La bussola'))]));
      if (x.tipo === 'test') editorTest(); else editorBlocchi();
      corpo.appendChild(el('div', { class: 'row2 tr-save' }, [
        btn('Annulla', function () { if (confirm('Annullare le modifiche a questa sezione?')) vai({ nome: 'editor', bid: s.bid }); }),
        btn('Salva sezione', salva, 'btn-accent')
      ]));
    }

    function editorBlocchi() {
      var card = el('section', { class: 'card' }, [
        el('h2', { text: 'Contenuto' }),
        el('p', { class: 'hint', text: 'Per mettere una foto in mezzo al testo, tocca nel punto giusto del testo e poi "📷 Foto qui". Riga vuota = nuovo paragrafo · "# " a inizio riga = sottotitolo · "- " = elenco puntato.' })
      ]);
      x.blocchi.forEach(function (bl, i) {
        var muovi = el('span', { class: 'tr-mini' }, [
          btn('↑', function () { if (i) { x.blocchi.splice(i - 1, 0, x.blocchi.splice(i, 1)[0]); ridisegna(); } }, 'tr-ico', 'Sposta su'),
          btn('↓', function () { if (i < x.blocchi.length - 1) { x.blocchi.splice(i + 1, 0, x.blocchi.splice(i, 1)[0]); ridisegna(); } }, 'tr-ico', 'Sposta giù'),
          btn('✕', function () {
            if (bl.t === 'img' || !bl.v.trim() || confirm('Eliminare questo blocco di testo?')) { x.blocchi.splice(i, 1); unisci(); ridisegna(); }
          }, 'tr-ico danger', bl.t === 'img' ? 'Togli immagine' : 'Elimina testo')
        ]);
        if (bl.t === 'img') {
          card.appendChild(el('div', { class: 'tr-blocco img' }, [
            anteprima(bl.img),
            testoIn(bl.cap, function (v) { bl.cap = v; }, 'Didascalia (facoltativa)'),
            el('div', { class: 'tr-bl-bar' }, [el('small', { text: '🖼 Immagine' }), muovi])
          ]));
        } else {
          var ta = el('textarea', { rows: 4, placeholder: 'Scrivi qui…' }); ta.value = bl.v || '';
          ta.addEventListener('input', function () { bl.v = ta.value; autoAltezza(ta, true); });
          var qui = btn('📷 Foto qui', null, 'tr-qui', 'Inserisci foto nel punto del cursore');
          // su telefono il tocco sul bottone toglie il fuoco: memorizzo prima la posizione
          var posSalvata = null;
          qui.addEventListener('pointerdown', function () { posSalvata = ta.selectionStart; });
          qui.addEventListener('click', function () {
            var pos = posSalvata != null ? posSalvata : ta.value.length; posSalvata = null;
            scegliFoto(true, function (dati) { inserisci(i, pos, dati); });
          });
          card.appendChild(el('div', { class: 'tr-blocco' }, [ta, el('div', { class: 'tr-bl-bar' }, [qui, muovi])]));
          requestAnimationFrame(function () { autoAltezza(ta); if (fuoco && fuoco.i === i) { ta.focus(); ta.setSelectionRange(fuoco.pos, fuoco.pos); fuoco = null; } });
        }
      });
      card.appendChild(el('div', { class: 'row2' }, [
        btn('+ Testo', function () { x.blocchi.push({ t: 'testo', v: '' }); fuoco = { i: x.blocchi.length - 1, pos: 0 }; ridisegna(); }),
        btn('+ Foto in fondo', function () { scegliFoto(true, function (dati) { inserisci(x.blocchi.length, null, dati); }); })
      ]));
      corpo.appendChild(card);
    }
    // inserisce le foto: se pos è un punto del testo del blocco i, il testo viene diviso lì
    function inserisci(i, pos, dati) {
      var nuoviBlocchi = dati.map(function (d) { var id = nuovoId('img'); nuove[id] = d; return { t: 'img', img: id, cap: '' }; });
      var bl = x.blocchi[i];
      if (bl && bl.t === 'testo' && pos != null) {
        var prima = bl.v.slice(0, pos).replace(/\s+$/, ''), dopo = bl.v.slice(pos).replace(/^\s+/, '');
        var pezzi = [];
        if (prima) pezzi.push({ t: 'testo', v: prima });
        pezzi = pezzi.concat(nuoviBlocchi);
        pezzi.push({ t: 'testo', v: dopo });
        x.blocchi.splice.apply(x.blocchi, [i, 1].concat(pezzi));
      } else {
        x.blocchi.splice.apply(x.blocchi, [i, 0].concat(nuoviBlocchi));
      }
      unisci(); ridisegna();
      toast(dati.length > 1 ? dati.length + ' immagini inserite' : 'Immagine inserita');
    }
    // due blocchi di testo vicini diventano uno solo; i blocchi di testo vuoti tra due immagini restano (servono per scriverci)
    function unisci() {
      for (var k = x.blocchi.length - 1; k > 0; k--) {
        var a = x.blocchi[k - 1], c = x.blocchi[k];
        if (a.t === 'testo' && c.t === 'testo') { a.v = [a.v, c.v].filter(function (t) { return t.trim(); }).join('\n\n'); x.blocchi.splice(k, 1); }
      }
      if (!x.blocchi.length) x.blocchi.push({ t: 'testo', v: '' });
    }

    function editorTest() {
      corpo.appendChild(el('section', { class: 'card' }, [el('h2', { text: 'Impostazioni' }), el('div', { class: 'grid tr-grid3' }, [
        campo('Domande per tentativo', numero(x.nDomande, function (v) { x.nDomande = v; }, 1, 100)),
        campo('Minuti', numero(x.minuti, function (v) { x.minuti = v; }, 1, 180)),
        campo('Soglia %', numero(x.soglia, function (v) { x.soglia = v; }, 1, 100))
      ]), el('p', { class: 'hint', text: 'Se le domande scritte sono più di quelle per tentativo, ogni volta ne escono alcune a caso. L\'ordine delle risposte viene sempre mescolato.' })]));
      var dq = el('section', { class: 'card' }, [el('h2', { text: 'Domande (' + x.domande.length + ')' })]);
      x.domande.forEach(function (q, i) {
        while (q.opzioni.length < 2) q.opzioni.push('');
        var item = el('div', { class: 'tr-ed-item' });
        var ta = el('textarea', { rows: 2, placeholder: 'Testo della domanda' }); ta.value = q.testo || '';
        ta.addEventListener('input', function () { q.testo = ta.value; });
        item.appendChild(campo('Domanda ' + (i + 1), ta));
        if (q.img) item.appendChild(el('div', { class: 'tr-blocco img' }, [anteprima(q.img), el('div', { class: 'tr-bl-bar' }, [
          el('small', { text: '🖼 Immagine della domanda' }),
          btn('✕', function () { delete q.img; ridisegna(); }, 'tr-ico danger', 'Togli immagine')
        ])]));
        else item.appendChild(btn('📷 Aggiungi immagine alla domanda', function () {
          scegliFoto(false, function (dati) { var id = nuovoId('img'); nuove[id] = dati[0]; q.img = id; ridisegna(); });
        }, 'tr-qui'));
        item.appendChild(el('small', { class: 'tr-ed-lbl', text: 'Risposte · segna quella giusta' }));
        q.opzioni.forEach(function (o, k) {
          var r = el('input', { type: 'radio', name: 'c_' + q.id, 'aria-label': 'Risposta giusta ' + (k + 1) });
          r.checked = q.corretta === k; r.addEventListener('change', function () { q.corretta = k; });
          var riga = el('div', { class: 'tr-ed-opt' }, [r, testoIn(o, function (v) { q.opzioni[k] = v; }, 'Risposta ' + (k + 1))]);
          if (q.opzioni.length > 2) riga.appendChild(btn('✕', function () {
            q.opzioni.splice(k, 1); if (q.corretta === k) q.corretta = 0; else if (q.corretta > k) q.corretta--; ridisegna();
          }, 'tr-ico', 'Togli risposta'));
          item.appendChild(riga);
        });
        var piedi = el('div', { class: 'tr-bl-bar' }, [
          q.opzioni.length < 6 ? btn('+ Risposta', function () { q.opzioni.push(''); ridisegna(); }, 'tr-qui') : el('span'),
          el('span', { class: 'tr-mini' }, [
            btn('↑', function () { if (i) { x.domande.splice(i - 1, 0, x.domande.splice(i, 1)[0]); ridisegna(); } }, 'tr-ico', 'Sposta su'),
            btn('↓', function () { if (i < x.domande.length - 1) { x.domande.splice(i + 1, 0, x.domande.splice(i, 1)[0]); ridisegna(); } }, 'tr-ico', 'Sposta giù'),
            btn('✕', function () { if (confirm('Eliminare la domanda ' + (i + 1) + '?')) { x.domande.splice(i, 1); ridisegna(); } }, 'tr-ico danger', 'Elimina domanda')
          ])
        ]);
        item.appendChild(piedi);
        dq.appendChild(item);
      });
      dq.appendChild(btn('+ Aggiungi domanda', function () { x.domande.push({ id: nuovoId('q'), testo: '', opzioni: ['', '', '', ''], corretta: 0 }); ridisegna(); }));
      corpo.appendChild(dq);
    }

    function salva() {
      if (!x.titolo.trim()) { toast('Dai un titolo alla sezione'); return; }
      if (x.tipo === 'test') {
        var vuote = x.domande.filter(function (d) { return !d.testo.trim() || d.opzioni.some(function (o) { return !o.trim(); }); }).length;
        if (vuote) { toast(vuote === 1 ? 'Una domanda ha campi vuoti' : vuote + ' domande hanno campi vuoti'); return; }
      } else {
        x.blocchi = x.blocchi.filter(function (bl) { return bl.t === 'img' || bl.v.trim(); });
      }
      var tutte = JSON.parse(JSON.stringify(percorso(s.bid).sezioni));
      var k = tutte.map(function (y) { return y.id; }).indexOf(x.id);
      if (k >= 0) tutte[k] = x; else tutte.push(x);
      toast('Salvataggio…');
      salvaPercorso(s.bid, tutte, nuove).then(function () { toast('Sezione salvata'); vai({ nome: 'editor', bid: s.bid }); },
        function (e) { if (x.blocchi && !x.blocchi.length) x.blocchi.push({ t: 'testo', v: '' }); toast('Errore: ' + errMsg(e)); });
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
        var c = conteggio(s.bid, a.prog, a.val);
        box.appendChild(el('button', { type: 'button', class: 'riga', onclick: function () { vai({ nome: 'allievo', bid: s.bid, a: a }); } }, [
          el('span', { class: 'riga-txt' }, [
            el('b', { class: 'tr-nome', text: a.prog.nome || a.prog.email || 'Senza nome' }),
            el('small', { class: 'tr-stato', text: p.sezioni.length ? c.fatte + ' di ' + c.tot + ' sezioni completate' : '—' })
          ]),
          el('span', { class: 'riga-freccia', 'aria-hidden': 'true', text: '›' })
        ]));
      });
    }, function (e) { box.innerHTML = ''; box.appendChild(el('p', { class: 'hint warn', text: 'Registro non disponibile: ' + errMsg(e) })); });
  }
  function vAllievo(s) {
    var b = brev(s.bid), p = percorso(s.bid), a = s.a;
    root.appendChild(indietro('Registro', function () { vai({ nome: 'registro', bid: s.bid }); }));
    root.appendChild(el('h2', { class: 'tr-edit-title', text: (a.prog.nome || a.prog.email) + ' · ' + b.nome }));
    var card = el('section', { class: 'card' });
    if (!p.sezioni.length) card.appendChild(el('p', { class: 'hint', text: 'Il percorso è vuoto.' }));
    p.sezioni.forEach(function (x) {
      var titolo = el('b', { text: TIPI[x.tipo].icona + ' ' + (x.titolo || 'Senza titolo') });
      if (x.tipo === 'pratica') {
        var v = (a.val[s.bid] || {})[x.id];
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!v;
        cb.addEventListener('change', function () {
          var patch = {}, u = user(); patch[s.bid] = {};
          patch[s.bid][x.id] = cb.checked ? { da: (u && (u.displayName || u.email)) || '', il: Date.now() } : S.fieldValue().delete();
          db().collection('validazioni').doc(a.uid).set(patch, { merge: true }).then(function () {
            a.val[s.bid] = a.val[s.bid] || {};
            if (cb.checked) a.val[s.bid][x.id] = patch[s.bid][x.id]; else delete a.val[s.bid][x.id];
            toast(cb.checked ? 'Prova convalidata' : 'Convalida tolta');
          }, function (e) { cb.checked = !cb.checked; toast('Errore: ' + errMsg(e)); });
        });
        card.appendChild(el('label', { class: 'check tr-val' }, [cb, el('span', null, [titolo, el('small', { text: 'Spunta per convalidare la prova pratica' })])]));
      } else if (x.tipo === 'teoria') {
        var l = !!letti(s.bid, a.prog)[x.id];
        card.appendChild(el('div', { class: 'tr-val-r' }, [titolo, el('small', { class: l ? 'ok' : '', text: l ? '✓ letta' : 'non ancora letta' })]));
      } else {
        var tl = tentativi(s.bid, x.id, a.prog);
        var riga = el('div', { class: 'tr-val-r' }, [titolo]);
        if (!tl.length) riga.appendChild(el('small', { text: 'nessun tentativo' }));
        tl.forEach(function (t) {
          riga.appendChild(el('small', { class: t.superato ? 'ok' : 'ko', text: new Date(t.data).toLocaleString('it-IT') + ' — ' + t.percentuale + '% (' + t.giuste + '/' + t.totale + ')' + (t.superato ? ' superato' : '') }));
        });
        card.appendChild(riga);
      }
    });
    root.appendChild(card);
    root.appendChild(el('p', { class: 'hint', text: 'Quando tutte le sezioni sono complete, assegna il brevetto dalla sua tessera.' }));
  }

  if (S.approved && S.approved()) avvia();
})();
