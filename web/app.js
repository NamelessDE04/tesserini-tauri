(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var KEY_DRAFT = 'tauri.bozza.v1';
  var KEY_ARCH = 'tauri.archivio.v1';
  var EXPORT_SCALE = 1039 / TauriCard.W; // 88 mm a 300 dpi
  var VERSIONE = '1.21'; // aggiornare insieme a CACHE in sw.js

  var FIELDS = ['cognome', 'nome', 'callsign', 'nascita', 'unita', 'numero', 'rilascio', 'sangue', 'tier', 'tema'];
  var state = defaults();
  var photoImg = null;
  var logo = new Image();
  logo.src = 'img/logo.png';
  logo.onload = function () { ridisegna(); };

  function defaults() {
    return {
      id: null, cognome: '', nome: '', callsign: '', nascita: '', unita: '', numero: '', sangue: '', tier: '', tema: 'notte',
      photoData: null, photoZoom: 1, photoX: 0, photoY: 0,
      rilascio: oggi(), brevetti: {}, brevSync: false
    };
  }
  function oggi() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // ---------- storage
  function lsGet(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  // salvataggio automatico nell'archivio: parte poco dopo l'ultima modifica
  var saveTimer = null, inAttesa = false;
  function haContenuto() {
    return !!(state.id || state.cognome.trim() || state.nome.trim() || state.callsign.trim() || state.numero.trim() || state.photoData);
  }
  function saveDraft() {
    if (!haContenuto()) return;
    inAttesa = true; mostraStato();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(salvaOra, 1200);
  }
  function salvaOra() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!inAttesa || !haContenuto()) return Promise.resolve();
    if (!state.id) state.id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var rec = JSON.parse(JSON.stringify(state));
    delete rec.thumb;
    rec.savedAt = Date.now();
    inAttesa = false;
    return window.TauriSync.save(rec).then(function () { mostraStato(); }, function (e) {
      inAttesa = true; mostraStato();
      toast('Salvataggio non riuscito: ' + (e && e.message || e));
    });
  }

  // ---------- toast
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // ---------- render
  function render() {
    var cv = $('preview');
    var w = cv.clientWidth || 360;
    var scale = Math.min(4, Math.max(1, (w * (window.devicePixelRatio || 1)) / TauriCard.W));
    TauriCard.draw(cv, cardData(), { logo: logo }, scale);
  }
  function cardData() {
    return {
      cognome: state.cognome, nome: state.nome, callsign: state.callsign, numero: state.numero,
      rilascio: state.rilascio, brevetti: state.brevetti || {},
      nascita: state.nascita, unita: state.unita, sangue: state.sangue, tier: state.tier, tema: state.tema,
      photo: photoImg, photoZoom: state.photoZoom, photoX: state.photoX, photoY: state.photoY
    };
  }
  var raf = null;
  function update() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { raf = null; render(); }); segnaModificato(); saveDraft(); }

  // ---------- stato del salvataggio (sotto l'anteprima)
  function mostraStato() {
    var el = $('saveState');
    if (!el) return;
    if (inAttesa) { el.textContent = 'Salvataggio…'; el.className = 'save-state'; }
    else if (state.id) { el.textContent = '✓ Salvata in archivio'; el.className = 'save-state ok'; }
    else { el.textContent = 'Nuova tessera: compila i dati, si salva da sola'; el.className = 'save-state'; }
  }
  function segnaModificato() { mostraStato(); }

  // ---------- form binding
  FIELDS.forEach(function (f) {
    $(f).addEventListener('input', function (e) { state[f] = e.target.value; update(); });
  });
  ['photoZoom', 'photoX', 'photoY'].forEach(function (f) {
    $(f).addEventListener('input', function (e) { state[f] = parseFloat(e.target.value); update(); });
  });

  function fillForm() {
    FIELDS.forEach(function (f) { $(f).value = state[f] || ''; });
    $('tier').value = state.tier || '';
    $('photoZoom').value = state.photoZoom; $('photoX').value = state.photoX; $('photoY').value = state.photoY;
    renderBrevetti();
    loadPhoto(state.photoData);
  }

  // ---------- brevetti (li assegnano l'amministratore e gli istruttori abilitati)
  function puoTimbrare() { return !window.TauriSync.enabled || window.TauriSync.canStamp(); }
  // solo l'amministratore può legare le date dei brevetti alla data di rilascio
  function puoSincronizzare() { return !window.TauriSync.enabled || window.TauriSync.isAdmin(); }
  function syncAttivo() { return !!state.brevSync && puoSincronizzare(); }
  function allineaDate() {
    if (!syncAttivo() || !state.rilascio) return;
    Object.keys(state.brevetti || {}).forEach(function (k) { state.brevetti[k] = state.rilascio; });
  }
  function renderBrevetti() {
    var box = $('brevettiList'); box.innerHTML = '';
    var edit = puoTimbrare();
    if (!state.brevetti || typeof state.brevetti !== 'object') state.brevetti = {};
    $('brevettiHint').textContent = edit
      ? 'Spunta il brevetto quando l\'esame è superato e indica la data: compare sul tesserino.'
      : 'I brevetti li assegnano solo l\'amministratore e gli istruttori abilitati, dopo l\'esame.';
    var syncBox = $('brevSyncBox');
    syncBox.hidden = !puoSincronizzare();
    $('brevSync').checked = !!state.brevSync;
    allineaDate();
    TauriCard.BREVETTI.forEach(function (b) {
      var row = document.createElement('div'); row.className = 'brev';
      var lab = document.createElement('label'); lab.className = 'check';
      var cb = document.createElement('input'); cb.type = 'checkbox';
      var dt = document.createElement('input'); dt.type = 'date';
      dt.setAttribute('aria-label', 'Data esame ' + b.nome);
      cb.checked = !!state.brevetti[b.id];
      dt.value = state.brevetti[b.id] || '';
      cb.disabled = !edit;
      dt.disabled = !edit || syncAttivo();
      dt.hidden = !cb.checked;
      cb.onchange = function () {
        if (cb.checked) { state.brevetti[b.id] = syncAttivo() && state.rilascio ? state.rilascio : (dt.value || oggi()); dt.value = state.brevetti[b.id]; }
        else delete state.brevetti[b.id];
        dt.hidden = !cb.checked; update();
      };
      dt.oninput = function () { if (cb.checked && dt.value) { state.brevetti[b.id] = dt.value; update(); } };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + b.nome));
      row.appendChild(lab); row.appendChild(dt); box.appendChild(row);
    });
  }
  window.addEventListener('tauri-role', function () { renderBrevetti(); });
  $('brevSync').addEventListener('change', function (e) {
    state.brevSync = e.target.checked;
    renderBrevetti(); update();
  });
  // cambiando la data di rilascio, se il collegamento è attivo, si aggiornano anche i brevetti
  $('rilascio').addEventListener('input', function () {
    if (syncAttivo()) { allineaDate(); renderBrevetti(); update(); }
  });

  // ---------- foto
  function loadPhoto(dataUrl) {
    $('fotoControls').hidden = !dataUrl;
    if (!dataUrl) { photoImg = null; render(); return; }
    var img = new Image();
    img.onload = function () { photoImg = img; render(); };
    img.src = dataUrl;
  }
  function onFile(e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      // ridimensiona (max 1000 px sul lato lungo) e salva come JPEG
      var max = 1000, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      state.photoData = c.toDataURL('image/jpeg', 0.9);
      state.photoZoom = 1; state.photoX = 0; state.photoY = 0;
      $('photoZoom').value = 1; $('photoX').value = 0; $('photoY').value = 0;
      loadPhoto(state.photoData);
      segnaModificato(); saveDraft();
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Impossibile aprire questa immagine'); };
    img.src = url;
  }
  $('fotoCamera').addEventListener('change', onFile);
  $('fotoGalleria').addEventListener('change', onFile);
  $('fotoRimuovi').onclick = function () { state.photoData = null; loadPhoto(null); segnaModificato(); saveDraft(); };

  // trascinamento foto sull'anteprima
  (function () {
    var cv = $('preview'), drag = null;
    function toCard(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / r.width * TauriCard.W, y: (ev.clientY - r.top) / r.height * TauriCard.H };
    }
    function inFoto(p) { return p.x >= 16 && p.x <= 128 && p.y >= 78 && p.y <= 222; }
    // il tesserino lascia scorrere la pagina; solo toccando la foto (se c'è) si trascina la foto
    cv.addEventListener('touchstart', function (ev) {
      if (!photoImg || ev.touches.length !== 1) return;
      if (inFoto(toCard(ev.touches[0]))) ev.preventDefault();
    }, { passive: false });
    cv.addEventListener('pointerdown', function (ev) {
      if (!photoImg) return;
      var p = toCard(ev);
      if (!inFoto(p)) return;
      drag = { x: p.x, y: p.y, sx: state.photoX, sy: state.photoY };
      cv.setPointerCapture(ev.pointerId);
    });
    cv.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var p = toCard(ev);
      var iw = photoImg.naturalWidth, ih = photoImg.naturalHeight;
      var z = Math.max(112 / iw, 144 / ih) * state.photoZoom;
      var ox = (iw * z - 112) / 2, oy = (ih * z - 144) / 2;
      var clamp = function (v) { return Math.max(-1, Math.min(1, v)); };
      if (ox > 0.5) state.photoX = clamp(drag.sx + (p.x - drag.x) / ox);
      if (oy > 0.5) state.photoY = clamp(drag.sy + (p.y - drag.y) / oy);
      $('photoX').value = state.photoX; $('photoY').value = state.photoY;
      update();
    });
    function end() { drag = null; }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  })();

  // ---------- export
  function fileBase() {
    var n = [state.cognome, state.nome].join('_').trim().replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
    return 'tesserino_' + (n || 'tauri');
  }
  function hiRes() {
    var c = document.createElement('canvas');
    TauriCard.draw(c, cardData(), { logo: logo }, EXPORT_SCALE);
    return c;
  }
  var ANDROID = window.TauriAndroid || null;
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function blobB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = rej; r.readAsDataURL(blob);
    });
  }
  function download(blob, name) {
    if (ANDROID) {
      return blobB64(blob).then(function (b64) {
        var r = ANDROID.saveFile(b64, name, blob.type || 'application/octet-stream');
        if (r !== 'ok') throw new Error(r);
      });
    }
    // iPhone/iPad: il download diretto è poco affidabile (soprattutto dalla schermata Home),
    // si usa il menu Condividi da cui scegliere "Salva su File" o "Salva immagine"
    if (IOS && navigator.canShare) {
      var f = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [f] })) {
        return navigator.share({ files: [f] }).then(function () { return 'ios'; }, function (e) {
          if (e && e.name === 'AbortError') return 'ios';
          throw e;
        });
      }
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function pngBlob() {
    return new Promise(function (res) { hiRes().toBlob(res, 'image/png'); });
  }

  function b64ToBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // PDF minimale: pagine con immagini JPEG (ed eventuali segni di taglio/testo)
  // pages: [{ w, h, imgs: [{ i, x, y, w, h }], extra }], images: [{ jpeg, w, h }]
  function makePdf(pages, images) {
    var parts = [], len = 0, offsets = [];
    function latin1(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
    function add(x) { var b = typeof x === 'string' ? latin1(x) : x; parts.push(b); len += b.length; }
    var f = function (v) { return (Math.round(v * 100) / 100).toString(); };
    var nPages = pages.length, firstPage = 3, firstImg = firstPage + nPages * 2, fontObj = firstImg + images.length;
    var total = fontObj;
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    function obj(n, body) { offsets[n] = len; add(n + ' 0 obj\n' + body + '\nendobj\n'); }
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    var kids = pages.map(function (p, k) { return (firstPage + k * 2) + ' 0 R'; }).join(' ');
    obj(2, '<< /Type /Pages /Kids [' + kids + '] /Count ' + nPages + ' >>');
    var xo = images.map(function (im, k) { return '/Im' + k + ' ' + (firstImg + k) + ' 0 R'; }).join(' ');
    pages.forEach(function (p, k) {
      var content = p.imgs.map(function (it) {
        return 'q ' + f(it.w) + ' 0 0 ' + f(it.h) + ' ' + f(it.x) + ' ' + f(it.y) + ' cm /Im' + it.i + ' Do Q\n';
      }).join('') + (p.extra || '');
      obj(firstPage + k * 2, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(p.w) + ' ' + f(p.h) + '] /Resources << /XObject << ' + xo + ' >> /Font << /F1 ' + fontObj + ' 0 R >> >> /Contents ' + (firstPage + k * 2 + 1) + ' 0 R >>');
      obj(firstPage + k * 2 + 1, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
    });
    images.forEach(function (im, k) {
      offsets[firstImg + k] = len;
      add((firstImg + k) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + im.jpeg.length + ' >>\nstream\n');
      add(im.jpeg);
      add('\nendstream\nendobj\n');
    });
    obj(fontObj, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    var xref = len, x = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
    for (var i = 1; i <= total; i++) x += ('0000000000' + offsets[i]).slice(-10) + ' 00000 n \n';
    add(x + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    var out = new Uint8Array(len), p = 0;
    parts.forEach(function (b) { out.set(b, p); p += b.length; });
    return new Blob([out], { type: 'application/pdf' });
  }
  var MM = 72 / 25.4, CW = 88 * MM, CH = 140 * MM;
  function jpg(c) { return { jpeg: b64ToBytes(c.toDataURL('image/jpeg', 0.95).split(',')[1]), w: c.width, h: c.height }; }
  // una pagina 88 x 140 mm
  function pdfCard() {
    return makePdf([{ w: CW, h: CH, imgs: [{ i: 0, x: 0, y: 0, w: CW, h: CH }] }], [jpg(hiRes())]);
  }
  // A4: tesserino a grandezza reale con segni di taglio
  function pdfA4() {
    var PW = 210 * MM, PH = 297 * MM;
    var x = (PW - CW) / 2, y = PH - 25 * MM - CH;
    var g = 2 * MM, l = 6 * MM, ops = '0 G 0.5 w\n';
    function ln(ax, ay, bx, by) { ops += ax.toFixed(2) + ' ' + ay.toFixed(2) + ' m ' + bx.toFixed(2) + ' ' + by.toFixed(2) + ' l S\n'; }
    [[x, y], [x + CW, y], [x, y + CH], [x + CW, y + CH]].forEach(function (pt, i) {
      var sx = (i % 2 === 0) ? -1 : 1, sy = (i < 2) ? -1 : 1;
      ln(pt[0] + sx * g, pt[1], pt[0] + sx * (g + l), pt[1]);
      ln(pt[0], pt[1] + sy * g, pt[0], pt[1] + sy * (g + l));
    });
    ops += 'BT /F1 9 Tf 0 g ' + x.toFixed(2) + ' ' + (y - 12 * MM).toFixed(2) + ' Td (Tesserino 88 x 140 mm) Tj ET\n';
    ops += 'BT /F1 9 Tf 0 g ' + x.toFixed(2) + ' ' + (y - 17 * MM).toFixed(2) + ' Td (Stampare al 100% \\(dimensione reale\\) e ritagliare sui segni.) Tj ET\n';
    return makePdf([{ w: PW, h: PH, imgs: [{ i: 0, x: x, y: y, w: CW, h: CH }], extra: ops }], [jpg(hiRes())]);
  }

  function busy(btn, fn) {
    return function () {
      if (btn.disabled) return;
      btn.disabled = true;
      Promise.resolve().then(fn).catch(function (e) { console.error(e); toast('Errore: ' + (e && e.message || e)); })
        .then(function () { btn.disabled = false; });
    };
  }
  function ensureFonts() { return document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(); }

  $('expPng').onclick = busy($('expPng'), function () {
    return ensureFonts().then(pngBlob).then(function (b) { return download(b, fileBase() + '.png'); }).then(function (r) { if (r !== 'ios') toast(ANDROID ? 'Immagine salvata in Download' : 'Immagine salvata'); });
  });
  $('expPdf').onclick = busy($('expPdf'), function () {
    return ensureFonts().then(function () { return download(pdfCard(), fileBase() + '.pdf'); }).then(function (r) { if (r !== 'ios') toast(ANDROID ? 'PDF salvato in Download' : 'PDF salvato'); });
  });
  $('expA4').onclick = busy($('expA4'), function () {
    return ensureFonts().then(function () { return download(pdfA4(), fileBase() + '_A4.pdf'); }).then(function (r) { if (r !== 'ios') toast(ANDROID ? 'PDF A4 salvato in Download' : 'PDF A4 salvato'); });
  });
  $('expShare').onclick = busy($('expShare'), function () {
    return ensureFonts().then(pngBlob).then(function (b) {
      if (ANDROID) return blobB64(b).then(function (b64) { ANDROID.shareFile(b64, fileBase() + '.png', 'image/png'); });
      var file = new File([b], fileBase() + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'Tesserino Tauri' }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          throw e;
        });
      }
      return Promise.resolve(download(b, file.name)).then(function () { toast('Condivisione non disponibile: immagine salvata'); });
    });
  });

  // ---------- archivio a tutto schermo (pagina iniziale) ed editor della tessera
  var archivio = [];
  function nomeTessera(r) { return ((r.cognome || '') + ' ' + (r.nome || '')).trim().toUpperCase() || 'Senza nome'; }
  window.TauriSync.onArchive(function (list) {
    var chiave = function (r) { return ((r.callsign || '') + ' ' + nomeTessera(r)).trim().toUpperCase(); };
    archivio = list.slice().sort(function (x, y) {
      return chiave(x).localeCompare(chiave(y), 'it') || (y.savedAt || 0) - (x.savedAt || 0);
    });
    if (!$('viewArchivio').hidden) disegnaArchivio();
  });
  function disegnaArchivio() {
    var q = ($('cerca').value || '').trim().toLowerCase();
    var lista = archivio.filter(function (r) {
      if (!q) return true;
      return [r.cognome, r.nome, r.callsign, r.unita, r.numero].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    $('conteggio').textContent = archivio.length === 1 ? '1 tessera' : archivio.length + ' tessere';
    var g = $('griglia'); g.innerHTML = '';
    $('archivioVuoto').hidden = archivio.length > 0;
    $('nessunRisultato').hidden = !(archivio.length > 0 && lista.length === 0);
    lista.forEach(function (rec) {
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'riga';
      var cs = (rec.callsign || '').trim().toUpperCase();
      bt.setAttribute('aria-label', 'Apri la tessera ' + (cs || nomeTessera(rec)));
      var foto = document.createElement('span'); foto.className = 'riga-foto';
      if (rec.photoData) {
        var img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = rec.photoData;
        img.style.objectPosition = (50 + (rec.photoX || 0) * 50) + '% ' + (50 + (rec.photoY || 0) * 50) + '%';
        foto.appendChild(img);
      } else {
        foto.innerHTML = '<svg viewBox="0 0 40 48" aria-hidden="true"><circle cx="20" cy="17" r="8" fill="currentColor"/><path d="M4 48c1-11 7-16 16-16s15 5 16 16z" fill="currentColor"/></svg>';
      }
      var txt = document.createElement('span'); txt.className = 'riga-txt';
      var c = document.createElement('b'); c.className = 'riga-cs'; c.textContent = cs ? '“' + cs + '”' : nomeTessera(rec);
      var n = document.createElement('small'); n.className = 'riga-num'; n.textContent = 'N° ' + ((rec.numero || '').trim().toUpperCase() || '—');
      txt.appendChild(c); txt.appendChild(n);
      var fr = document.createElement('span'); fr.className = 'riga-freccia'; fr.setAttribute('aria-hidden', 'true');
      fr.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
      bt.appendChild(foto); bt.appendChild(txt); bt.appendChild(fr);
      bt.onclick = function () { apriEditor(rec); };
      g.appendChild(bt);
    });
  }
  $('cerca').addEventListener('input', disegnaArchivio);

  function mostraVista(editor) {
    $('viewArchivio').hidden = editor;
    $('viewEditor').hidden = !editor;
    $('barraEditor').hidden = !editor;
    $('btnTornaArchivio').hidden = !editor;
    document.body.classList.toggle('in-editor', editor);
    window.scrollTo(0, 0);
  }
  function apriEditor(rec) {
    if (rec) {
      var r = JSON.parse(JSON.stringify(rec)); delete r.thumb; delete r.savedAt; delete r.by;
      state = Object.assign(defaults(), r);
    } else {
      state = defaults();
    }
    photoImg = null; inAttesa = false;
    fillForm();
    mostraVista(true);
    render(); mostraStato();
    $('btnElimina').hidden = !state.id;
    try { history.pushState({ editor: true }, ''); } catch (e) {}
  }
  function tornaArchivio(daHistory) {
    var p = inAttesa ? salvaOra() : Promise.resolve();
    mostraVista(false);
    disegnaArchivio();
    if (!daHistory) { try { if (history.state && history.state.editor) history.back(); } catch (e) {} }
    return p;
  }
  window.addEventListener('popstate', function () { if (!$('viewEditor').hidden) tornaArchivio(true); });
  $('btnNuova').onclick = function () { apriEditor(null); };
  $('btnTornaArchivio').onclick = function () { tornaArchivio(false); };
  $('btnElimina').onclick = function () {
    if (!state.id) return;
    var nome = nomeTessera(state);
    if (!confirm('Eliminare la tessera di ' + nome + ' per tutti?')) return;
    var id = state.id;
    clearTimeout(saveTimer); inAttesa = false;
    window.TauriSync.remove(id).then(function () { toast('Tessera eliminata'); }, function (e) { toast('Errore: ' + (e && e.message || e)); });
    state = defaults();
    tornaArchivio(false);
  };
  // uscendo dall'app con un salvataggio in sospeso, lo si completa subito
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && inAttesa) salvaOra(); });
  window.addEventListener('beforeunload', function () { if (inAttesa) salvaOra(); });
  window.TauriApp = { toast: toast, lsGet: lsGet, lsSet: lsSet, KEY_ARCH: KEY_ARCH, android: ANDROID };

  // ---------- avvio: si parte dall'archivio
  $('versione').textContent = 'Tesserini Tauri · versione ' + VERSIONE;
  try { localStorage.removeItem(KEY_DRAFT); localStorage.removeItem('tauri.modificato.v1'); } catch (e) {}
  state = defaults();
  fillForm();
  mostraVista(false);
  disegnaArchivio();
  if (document.fonts) {
    ['400 20px "Saira Stencil One"', '700 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '700 20px "JetBrains Mono"']
      .forEach(function (f) { document.fonts.load(f).then(ridisegna, function () {}); });
    document.fonts.ready.then(ridisegna);
  }
  function ridisegna() { if ($('viewEditor').hidden) disegnaArchivio(); else render(); }
  window.addEventListener('resize', ridisegna);
  mostraStato();

  // ---------- menu "Stampa e invia"
  $('btnEsporta').onclick = function () { $('dlgEsporta').showModal(); };
  $('dlgEsportaChiudi').onclick = function () { $('dlgEsporta').close(); };
  ['expShare', 'expPng', 'expA4', 'expPdf'].forEach(function (id) {
    $(id).addEventListener('click', function () { $('dlgEsporta').close(); });
  });
  // tocco fuori dal pannello = chiudi
  ['dlgEsporta'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === $(id)) $(id).close(); });
  });

  if ('serviceWorker' in navigator && !ANDROID) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
