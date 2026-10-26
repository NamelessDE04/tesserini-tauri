(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var KEY_DRAFT = 'tauri.bozza.v1';
  var KEY_ARCH = 'tauri.archivio.v1';
  var EXPORT_SCALE = 1039 / TauriCard.W; // 88 mm a 300 dpi

  var FIELDS = ['cognome', 'nome', 'callsign', 'numero', 'rilascio', 'sangue', 'grado', 'tier', 'tema', 'note'];
  var state = defaults();
  var photoImg = null;
  var logo = new Image();
  logo.src = 'img/logo.png';
  logo.onload = render;

  function defaults() {
    return {
      id: null, cognome: '', nome: '', callsign: '', numero: '', sangue: '', grado: 'Soldato semplice', tier: '4', tema: 'notte',
      note: '', qrDati: true, referenti: [{ nome: '', ruolo: '', tel: '' }],
      photoData: null, photoZoom: 1, photoX: 0, photoY: 0,
      rilascio: oggi(), brevetti: {}
    };
  }
  function oggi() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // ---------- storage
  function lsGet(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var saveTimer = null;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { lsSet(KEY_DRAFT, state); }, 300);
  }

  // ---------- toast
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // ---------- QR text
  function qrText() {
    var L = ['ASD TAURI SOFTAIR'];
    if (state.numero.trim()) L.push('Tessera ' + state.numero.trim().toUpperCase());
    if (state.qrDati) {
      var nome = (state.nome + ' ' + state.cognome).trim().toUpperCase();
      if (nome || state.callsign.trim()) {
        L.push('Operatore: ' + nome + (state.callsign.trim() ? ' "' + state.callsign.trim().toUpperCase() + '"' : ''));
      }
      if (state.sangue) L.push('Gruppo sanguigno: ' + state.sangue);
    }
    var refs = state.referenti.filter(function (r) { return r.nome.trim() || r.tel.trim(); });
    if (refs.length) {
      L.push('CONTATTI DI EMERGENZA');
      refs.forEach(function (r, i) {
        var who = r.nome.trim() + (r.ruolo.trim() ? ' (' + r.ruolo.trim() + ')' : '');
        L.push((i + 1) + ') ' + who + (r.tel.trim() ? ': ' + r.tel.trim() : ''));
      });
    }
    if (state.note.trim()) L.push('Note: ' + state.note.trim());
    return L.length > 1 ? L.join('\n') : '';
  }

  // ---------- render
  function render() {
    var cv = $('preview');
    var w = cv.clientWidth || 360;
    var scale = Math.min(4, Math.max(1, (w * (window.devicePixelRatio || 1)) / TauriCard.W));
    var txt = qrText();
    var info = TauriCard.draw(cv, cardData(txt), { logo: logo }, scale);
    TauriCard.drawBack($('previewBack'), cardData(txt), { logo: logo }, scale);
    $('qrPreview').textContent = txt || '(vuoto: aggiungi almeno un referente o i dati operatore)';
    var qi = $('qrInfo');
    if (!txt) { qi.textContent = 'QR vuoto: compila i referenti per generarlo.'; qi.className = 'hint'; }
    else if (!info.qrVersion) { qi.textContent = 'Testo troppo lungo per il QR: accorcia le note.'; qi.className = 'hint warn'; }
    else if (info.qrVersion > 10) { qi.textContent = 'QR molto fitto: potrebbe leggersi male una volta stampato. Accorcia note o contatti.'; qi.className = 'hint warn'; }
    else { qi.textContent = 'QR pronto (' + new TextEncoder().encode(txt).length + ' caratteri).'; qi.className = 'hint'; }
  }
  function cardData(txt) {
    return {
      cognome: state.cognome, nome: state.nome, callsign: state.callsign, numero: state.numero,
      rilascio: state.rilascio, brevetti: state.brevetti || {},
      sangue: state.sangue, grado: state.grado, tier: state.tier, tema: state.tema,
      photo: photoImg, photoZoom: state.photoZoom, photoX: state.photoX, photoY: state.photoY,
      qrText: txt === undefined ? qrText() : txt
    };
  }
  var raf = null;
  function update() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { raf = null; render(); }); saveDraft(); }

  // ---------- form binding
  var gradoSel = $('grado');
  var groups = {};
  TauriCard.GRADI.forEach(function (g) {
    if (!groups[g.cat]) {
      groups[g.cat] = document.createElement('optgroup');
      groups[g.cat].label = g.cat + (g.tier ? ' · Tier ' + g.tier : '');
      gradoSel.appendChild(groups[g.cat]);
    }
    var o = document.createElement('option'); o.value = g.nome; o.textContent = g.nome; groups[g.cat].appendChild(o);
  });
  // cambiando grado si imposta il tier della sua categoria (poi resta modificabile)
  gradoSel.addEventListener('change', function () {
    var g = TauriCard.GRADI.find(function (x) { return x.nome === gradoSel.value; });
    if (g) { state.tier = g.tier; $('tier').value = g.tier; update(); }
  });

  FIELDS.forEach(function (f) {
    $(f).addEventListener('input', function (e) { state[f] = e.target.value; update(); });
  });
  $('qrDati').addEventListener('change', function (e) { state.qrDati = e.target.checked; update(); });
  ['photoZoom', 'photoX', 'photoY'].forEach(function (f) {
    $(f).addEventListener('input', function (e) { state[f] = parseFloat(e.target.value); update(); });
  });

  function fillForm() {
    FIELDS.forEach(function (f) { $(f).value = state[f] || ''; });
    if (state.grado === 'Soldato') state.grado = 'Soldato semplice';
    if (!TauriCard.GRADI.some(function (g) { return g.nome === state.grado; })) state.grado = 'Soldato semplice';
    $('grado').value = state.grado;
    $('tier').value = state.tier || '';
    $('qrDati').checked = !!state.qrDati;
    $('photoZoom').value = state.photoZoom; $('photoX').value = state.photoX; $('photoY').value = state.photoY;
    renderReferenti();
    renderBrevetti();
    loadPhoto(state.photoData);
  }

  // ---------- referenti
  function renderReferenti() {
    var box = $('referenti'); box.innerHTML = '';
    var tpl = $('tplReferente');
    state.referenti.forEach(function (r, i) {
      var n = tpl.content.firstElementChild.cloneNode(true);
      var a = n.querySelector('.r-nome'), b = n.querySelector('.r-ruolo'), c = n.querySelector('.r-tel');
      a.value = r.nome; b.value = r.ruolo; c.value = r.tel;
      a.setAttribute('aria-label', 'Nome referente ' + (i + 1));
      b.setAttribute('aria-label', 'Ruolo referente ' + (i + 1));
      c.setAttribute('aria-label', 'Telefono referente ' + (i + 1));
      a.oninput = function () { r.nome = a.value; update(); };
      b.oninput = function () { r.ruolo = b.value; update(); };
      c.oninput = function () { r.tel = c.value; update(); };
      n.querySelector('.r-del').onclick = function () {
        state.referenti.splice(i, 1);
        if (!state.referenti.length) state.referenti.push({ nome: '', ruolo: '', tel: '' });
        renderReferenti(); update();
      };
      box.appendChild(n);
    });
  }
  $('addReferente').onclick = function () {
    if (state.referenti.length >= 6) { toast('Massimo 6 referenti'); return; }
    state.referenti.push({ nome: '', ruolo: '', tel: '' });
    renderReferenti();
    var rows = $('referenti').querySelectorAll('.r-nome'); rows[rows.length - 1].focus();
    update();
  };

  // ---------- brevetti (li assegnano l'amministratore e gli istruttori abilitati)
  function puoTimbrare() { return !window.TauriSync.enabled || window.TauriSync.canStamp(); }
  function renderBrevetti() {
    var box = $('brevettiList'); box.innerHTML = '';
    var edit = puoTimbrare();
    if (!state.brevetti || typeof state.brevetti !== 'object') state.brevetti = {};
    $('brevettiHint').textContent = edit
      ? 'Spunta il brevetto quando l\'esame è superato e indica la data: sul retro compare il timbro.'
      : 'I brevetti li assegnano solo l\'amministratore e gli istruttori abilitati, dopo l\'esame.';
    TauriCard.BREVETTI.forEach(function (b) {
      var row = document.createElement('div'); row.className = 'brev';
      var lab = document.createElement('label'); lab.className = 'check';
      var cb = document.createElement('input'); cb.type = 'checkbox';
      var dt = document.createElement('input'); dt.type = 'date';
      dt.setAttribute('aria-label', 'Data esame ' + b.nome);
      cb.checked = !!state.brevetti[b.id];
      dt.value = state.brevetti[b.id] || '';
      cb.disabled = dt.disabled = !edit;
      dt.hidden = !cb.checked;
      cb.onchange = function () {
        if (cb.checked) { state.brevetti[b.id] = dt.value || oggi(); dt.value = state.brevetti[b.id]; }
        else delete state.brevetti[b.id];
        dt.hidden = !cb.checked; update();
      };
      dt.oninput = function () { if (cb.checked && dt.value) { state.brevetti[b.id] = dt.value; update(); } };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + b.nome));
      row.appendChild(lab); row.appendChild(dt); box.appendChild(row);
    });
  }
  window.addEventListener('tauri-role', function () { renderBrevetti(); });

  // fronte / retro
  function lato(retro) {
    $('preview').hidden = retro; $('previewBack').hidden = !retro;
    $('tabFronte').setAttribute('aria-pressed', String(!retro));
    $('tabRetro').setAttribute('aria-pressed', String(retro));
  }
  $('tabFronte').onclick = function () { lato(false); };
  $('tabRetro').onclick = function () { lato(true); };

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
      saveDraft();
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('Impossibile aprire questa immagine'); };
    img.src = url;
  }
  $('fotoCamera').addEventListener('change', onFile);
  $('fotoGalleria').addEventListener('change', onFile);
  $('fotoRimuovi').onclick = function () { state.photoData = null; loadPhoto(null); saveDraft(); };

  // trascinamento foto sull'anteprima
  (function () {
    var cv = $('preview'), drag = null;
    function toCard(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / r.width * TauriCard.W, y: (ev.clientY - r.top) / r.height * TauriCard.H };
    }
    function inFoto(p) { return p.x >= 16 && p.x <= 152 && p.y >= 82 && p.y <= 258; }
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
      var z = Math.max(136 / iw, 176 / ih) * state.photoZoom;
      var ox = (iw * z - 136) / 2, oy = (ih * z - 176) / 2;
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
  function hiResBack() {
    var c = document.createElement('canvas');
    TauriCard.drawBack(c, cardData(), { logo: logo }, EXPORT_SCALE);
    return c;
  }
  // fronte e retro affiancati in un'unica immagine
  function hiResBoth() {
    var f = hiRes(), b = hiResBack(), gap = 60;
    var c = document.createElement('canvas');
    c.width = f.width * 2 + gap; c.height = f.height;
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(f, 0, 0); x.drawImage(b, f.width + gap, 0);
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
    return new Promise(function (res) { hiResBoth().toBlob(res, 'image/png'); });
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
  // due pagine 88 x 140 mm: fronte e retro
  function pdfCard() {
    var imgs = [jpg(hiRes()), jpg(hiResBack())];
    return makePdf([
      { w: CW, h: CH, imgs: [{ i: 0, x: 0, y: 0, w: CW, h: CH }] },
      { w: CW, h: CH, imgs: [{ i: 1, x: 0, y: 0, w: CW, h: CH }] }
    ], imgs);
  }
  // A4: fronte e retro affiancati a grandezza reale, con segni di taglio
  function pdfA4() {
    var imgs = [jpg(hiRes()), jpg(hiResBack())];
    var PW = 210 * MM, PH = 297 * MM, gap = 10 * MM;
    var x1 = (PW - CW * 2 - gap) / 2, x2 = x1 + CW + gap, y = PH - 25 * MM - CH;
    var g = 2 * MM, l = 6 * MM, ops = '0 G 0.5 w\n';
    function ln(ax, ay, bx, by) { ops += ax.toFixed(2) + ' ' + ay.toFixed(2) + ' m ' + bx.toFixed(2) + ' ' + by.toFixed(2) + ' l S\n'; }
    [x1, x2].forEach(function (x) {
      [[x, y], [x + CW, y], [x, y + CH], [x + CW, y + CH]].forEach(function (pt, i) {
        var sx = (i % 2 === 0) ? -1 : 1, sy = (i < 2) ? -1 : 1;
        ln(pt[0] + sx * g, pt[1], pt[0] + sx * (g + l), pt[1]);
        ln(pt[0], pt[1] + sy * g, pt[0], pt[1] + sy * (g + l));
      });
    });
    ops += 'BT /F1 9 Tf 0 g ' + x1.toFixed(2) + ' ' + (y - 12 * MM).toFixed(2) + ' Td (Tesserino 88 x 140 mm - a sinistra il fronte, a destra il retro) Tj ET\n';
    ops += 'BT /F1 9 Tf 0 g ' + x1.toFixed(2) + ' ' + (y - 17 * MM).toFixed(2) + ' Td (Stampare al 100% \\(dimensione reale\\) e ritagliare sui segni.) Tj ET\n';
    return makePdf([{ w: PW, h: PH, imgs: [{ i: 0, x: x1, y: y, w: CW, h: CH }, { i: 1, x: x2, y: y, w: CW, h: CH }], extra: ops }], imgs);
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

  // ---------- archivio (condiviso tramite TauriSync: Firebase, o locale se non configurato)
  function thumb() {
    var c = document.createElement('canvas');
    TauriCard.draw(c, cardData(), { logo: logo }, 0.4);
    return c.toDataURL('image/jpeg', 0.7);
  }
  var archivio = [];
  window.TauriSync.onArchive(function (list) {
    archivio = list.slice().sort(function (x, y) { return (y.savedAt || 0) - (x.savedAt || 0); });
    if ($('dlgArchivio').open) drawArchivio();
  });
  $('btnSalva').onclick = busy($('btnSalva'), function () {
    if (!state.id) state.id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var rec = JSON.parse(JSON.stringify(state));
    rec.thumb = thumb(); rec.savedAt = Date.now();
    saveDraft();
    return window.TauriSync.save(rec).then(function (where) {
      toast(where === 'cloud' ? 'Tesserino salvato nell\'archivio condiviso' : 'Tesserino salvato in archivio');
    });
  });
  $('btnNuovo').onclick = function () {
    state = defaults(); photoImg = null; fillForm(); update(); window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Nuovo tesserino');
  };
  function drawArchivio() {
    var ul = $('listaArchivio');
    ul.innerHTML = '';
    $('archivioVuoto').hidden = archivio.length > 0;
    archivio.forEach(function (rec) {
      var li = document.createElement('li');
      var img = document.createElement('img'); img.src = rec.thumb || ''; img.alt = '';
      var who = document.createElement('div'); who.className = 'who';
      var b = document.createElement('b'); b.textContent = ((rec.cognome || '') + ' ' + (rec.nome || '')).trim().toUpperCase() || 'Senza nome';
      var s = document.createElement('span'); s.textContent = (rec.callsign ? '"' + rec.callsign.toUpperCase() + '" · ' : '') + (rec.numero || '');
      who.appendChild(b); who.appendChild(s);
      var open = document.createElement('button'); open.type = 'button'; open.className = 'btn'; open.textContent = 'Apri';
      open.onclick = function () {
        var r = JSON.parse(JSON.stringify(rec)); delete r.thumb; delete r.savedAt; delete r.by;
        state = Object.assign(defaults(), r); fillForm(); update(); $('dlgArchivio').close();
        toast('Caricato: ' + b.textContent);
      };
      var del = document.createElement('button'); del.type = 'button'; del.className = 'icon-btn'; del.setAttribute('aria-label', 'Elimina ' + b.textContent);
      del.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
      del.style.color = 'var(--danger)';
      del.onclick = function () {
        if (!confirm('Eliminare il tesserino di ' + b.textContent + ' per tutti?')) return;
        window.TauriSync.remove(rec.id).catch(function (e) { toast('Errore: ' + (e && e.message || e)); });
      };
      li.appendChild(img); li.appendChild(who); li.appendChild(open); li.appendChild(del);
      ul.appendChild(li);
    });
  }
  function openArchivio() {
    drawArchivio();
    if (!$('dlgArchivio').open) $('dlgArchivio').showModal();
  }
  $('btnArchivio').onclick = openArchivio;
  $('dlgChiudi').onclick = function () { $('dlgArchivio').close(); };
  window.TauriApp = { toast: toast, lsGet: lsGet, lsSet: lsSet, KEY_ARCH: KEY_ARCH, android: ANDROID };

  // ---------- avvio
  state = Object.assign(defaults(), lsGet(KEY_DRAFT, {}));
  fillForm();
  render();
  if (document.fonts) {
    ['400 20px "Saira Stencil One"', '700 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '700 20px "JetBrains Mono"']
      .forEach(function (f) { document.fonts.load(f).then(render, function () {}); });
    document.fonts.ready.then(render);
  }
  window.addEventListener('resize', function () { update(); });

  if ('serviceWorker' in navigator && !ANDROID) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
