/* Disegno del tesserino Tauri su canvas.
   Coordinate di progetto: 397 x 321 (= 105 x 85 mm). L'export scala a 300 dpi. */
(function (root) {
  'use strict';

  var W = 397, H = 321;
  var F_STENCIL = "'Saira Stencil One', Impact, 'Arial Black', sans-serif";
  var F_COND = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif-condensed, sans-serif";
  var F_MONO = "'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace";

  var THEMES = {
    notte: { bg: '#171915', panel: '#22251e', ink: '#ece6d6', muted: '#a8a291', accent: '#c8b68a', accentInk: '#171915', line: '#3b3f33', wm: 0.07 },
    oliva: { bg: '#2c3623', panel: '#36422c', ink: '#f0ead8', muted: '#c2bda6', accent: '#d8c48e', accentInk: '#1f2618', line: '#4f5b41', wm: 0.08 },
    deserto: { bg: '#d8caa4', panel: '#cbbb91', ink: '#1c1c18', muted: '#4b4636', accent: '#3d3a2b', accentInk: '#ece6d6', line: '#ad9d74', wm: 0.06 }
  };

  // gradi con categoria e tier corrispondente (tier modificabile dall'utente)
  var GRADI = [
    { nome: 'Soldato semplice', cat: 'Truppa', tier: '4' },
    { nome: 'Caporale', cat: 'Truppa', tier: '4' },
    { nome: 'Caporale maggiore', cat: 'Truppa', tier: '4' },
    { nome: 'Sergente', cat: 'Sottufficiali', tier: '3' },
    { nome: 'Maresciallo', cat: 'Sottufficiali', tier: '3' },
    { nome: 'Luogotenente', cat: 'Sottufficiali', tier: '3' },
    { nome: 'Sottotenente', cat: 'Ufficiali inferiori', tier: '2' },
    { nome: 'Tenente', cat: 'Ufficiali inferiori', tier: '2' },
    { nome: 'Capitano', cat: 'Ufficiali inferiori', tier: '2' },
    { nome: 'Maggiore', cat: 'Ufficiali superiori', tier: '1' },
    { nome: 'Tenente colonnello', cat: 'Ufficiali superiori', tier: '1' },
    { nome: 'Colonnello', cat: 'Ufficiali superiori', tier: '1' },
    { nome: 'Generale', cat: 'Generali', tier: '' }
  ];

  var tintCache = {};
  function tinted(img, color) {
    var key = color + '|' + img.src.length;
    if (tintCache[key]) return tintCache[key];
    var c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    tintCache[key] = c;
    return c;
  }

  function font(ctx, weight, size, family) { ctx.font = weight + ' ' + size + 'px ' + family; }

  function spaced(ctx, text, x, y, spacing, align, maxW) {
    // testo con spaziatura lettere (compatibile con tutti i browser); se supera maxW si stringe
    var w = 0, i, ws = [];
    for (i = 0; i < text.length; i++) { ws.push(ctx.measureText(text[i]).width); w += ws[i]; }
    w += spacing * (text.length - 1);
    var k = maxW && w > maxW ? maxW / w : 1;
    var vw = w * k;
    var sx = align === 'right' ? x - vw : align === 'center' ? x - vw / 2 : x;
    var prev = ctx.textAlign; ctx.textAlign = 'left';
    ctx.save(); ctx.translate(sx, y); ctx.scale(k, 1);
    var cx = 0;
    for (i = 0; i < text.length; i++) { ctx.fillText(text[i], cx, 0); cx += ws[i] + spacing; }
    ctx.restore();
    ctx.textAlign = prev;
    return vw;
  }

  function fitFont(ctx, text, weight, maxSize, minSize, family, maxW, spacing) {
    var s = maxSize;
    for (; s > minSize; s -= 0.5) {
      font(ctx, weight, s, family);
      var w = ctx.measureText(text).width + (spacing || 0) * s * Math.max(0, text.length - 1);
      if (w <= maxW) break;
    }
    font(ctx, weight, s, family);
    return s;
  }

  function hazard(ctx, x, y, w, h, c1, c2) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = c2; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = c1;
    for (var i = -h; i < w + h; i += 12) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 6, y + h);
      ctx.lineTo(x + i + 6 + h, y); ctx.lineTo(x + i + h, y);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  var STAR = [0, -6, 1.41, -1.94, 5.71, -1.85, 2.28, 0.74, 3.53, 4.85, 0, 2.4, -3.53, 4.85, -2.28, 0.74, -5.71, -1.85, -1.41, -1.94];
  function star(ctx, cx, cy, s) {
    ctx.beginPath();
    for (var i = 0; i < STAR.length; i += 2) {
      var px = cx + STAR[i] * s, py = cy + STAR[i + 1] * s;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }

  // insegna in un riquadro 40x40 (unità), posizionato in x,y con lato `size`
  function insignia(ctx, grado, x, y, size, color) {
    var k = size / 40;
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 4; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    function chev(yy) { ctx.beginPath(); ctx.moveTo(8, yy + 8); ctx.lineTo(20, yy); ctx.lineTo(32, yy + 8); ctx.stroke(); }
    function bar(yy) { ctx.fillRect(8, yy, 24, 4); }
    function band() { ctx.fillRect(5, 31, 30, 4); }
    function greca() {
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(5, 35);
      for (var gx = 5, up = true; gx < 35; gx += 3.75, up = !up) ctx.lineTo(gx + 3.75, up ? 27 : 35);
      ctx.stroke();
    }
    switch (grado) {
      case 'Soldato semplice': ctx.fillRect(12, 18, 16, 4); break;
      case 'Caporale': chev(16); break;
      case 'Caporale maggiore': chev(12); chev(21); break;
      case 'Sergente': chev(8); chev(17); chev(26); break;
      case 'Maresciallo': bar(14); bar(22); break;
      case 'Luogotenente': star(ctx, 20, 10, 1.05); bar(21); bar(29); break;
      case 'Sottotenente': star(ctx, 20, 20, 1.6); break;
      case 'Tenente': star(ctx, 12, 20, 1.25); star(ctx, 28, 20, 1.25); break;
      case 'Capitano': star(ctx, 9, 25, 1.05); star(ctx, 20, 13, 1.05); star(ctx, 31, 25, 1.05); break;
      case 'Maggiore': star(ctx, 20, 16, 1.5); band(); break;
      case 'Tenente colonnello': star(ctx, 12, 17, 1.2); star(ctx, 28, 17, 1.2); band(); break;
      case 'Colonnello': star(ctx, 8, 20, 0.95); star(ctx, 20, 11, 0.95); star(ctx, 32, 20, 0.95); band(); break;
      case 'Generale': star(ctx, 20, 13, 1.45); greca(); break;
    }
    ctx.restore();
  }

  function silhouette(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.fillStyle = color;
    var cx = x + w / 2, k = w / 112;
    ctx.beginPath(); ctx.arc(cx, y + h - 72 * k, 24 * k, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 10 * k, y + h);
    ctx.bezierCurveTo(x + 12 * k, y + h - 30 * k, cx - 26 * k, y + h - 42 * k, cx, y + h - 42 * k);
    ctx.bezierCurveTo(cx + 26 * k, y + h - 42 * k, x + w - 12 * k, y + h - 30 * k, x + w - 10 * k, y + h);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function brackets(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'square';
    var a = 12, o = 6;
    function L(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke(); }
    L(x + o, y + o + a, x + o, y + o, x + o + a, y + o);
    L(x + w - o - a, y + o, x + w - o, y + o, x + w - o, y + o + a);
    L(x + o, y + h - o - a, x + o, y + h - o, x + o + a, y + h - o);
    L(x + w - o - a, y + h - o, x + w - o, y + h - o, x + w - o, y + h - o - a);
    ctx.restore();
  }

  /**
   * d: { cognome, nome, callsign, sangue, grado, tier, numero, tema,
   *      photo (Image|null), photoZoom (1..3), photoX (-1..1), photoY (-1..1),
   *      qrText (string) }
   * assets: { logo: Image }
   */
  function draw(canvas, d, assets, scale) {
    scale = scale || 1;
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.textBaseline = 'alphabetic';
    var t = THEMES[d.tema] || THEMES.notte;
    var up = function (s) { return (s || '').toString().trim().toUpperCase(); };

    // fondo
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);

    // filigrana
    if (assets.logo && assets.logo.complete && assets.logo.naturalWidth) {
      ctx.save(); ctx.globalAlpha = t.wm;
      ctx.drawImage(tinted(assets.logo, t.accent === '#3d3a2b' ? '#1c1c18' : '#c8b68a'), 118, 58, 260, 260);
      ctx.restore();
    }

    // intestazione
    ctx.fillStyle = t.panel; ctx.fillRect(0, 0, W, 52);
    ctx.fillStyle = t.line; ctx.fillRect(0, 51, W, 1);
    ctx.fillStyle = t.ink; font(ctx, '400', 19, F_STENCIL);
    spaced(ctx, 'ASD TAURI SOFTAIR', 14, 27, 0.8, 'left', 250);
    ctx.fillStyle = t.accent; font(ctx, '600', 8.5, F_COND);
    spaced(ctx, 'TESSERA DI RICONOSCIMENTO', 14, 40, 1.9, 'left', 250);
    ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
    spaced(ctx, 'TESSERA N°', W - 14, 23, 1.5, 'right');
    ctx.fillStyle = t.accent; fitFont(ctx, up(d.numero) || '—', '700', 13, 8, F_MONO, 110, 0.06);
    spaced(ctx, up(d.numero) || '—', W - 14, 39, 0.8, 'right', 110);

    hazard(ctx, 0, 52, W, 4, t.accent, t.bg);
    hazard(ctx, 0, H - 6, W, 6, t.accent, t.bg);

    // ---- colonna sinistra: foto + gruppo sanguigno
    var px = 12, py = 66, pw = 112, ph = 150;
    ctx.fillStyle = t.panel; ctx.fillRect(px, py, pw, ph);
    if (d.photo && d.photo.naturalWidth) {
      var iw = d.photo.naturalWidth, ih = d.photo.naturalHeight;
      var z = Math.max(pw / iw, ph / ih) * (d.photoZoom || 1);
      var dw = iw * z, dh = ih * z;
      var ox = (dw - pw) / 2, oy = (dh - ph) / 2;
      var dx = px - ox + (d.photoX || 0) * ox, dy = py - oy + (d.photoY || 0) * oy;
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.drawImage(d.photo, dx, dy, dw, dh);
      ctx.restore();
    } else {
      silhouette(ctx, px, py, pw, ph, t.line);
      ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
      spaced(ctx, 'FOTO', px + pw / 2, py + 18, 2, 'center');
    }
    ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    brackets(ctx, px, py, pw, ph, t.accent);

    var by = 305 - 62;
    ctx.fillStyle = t.accent; ctx.fillRect(px, by, pw, 62);
    ctx.fillStyle = t.accentInk; font(ctx, '700', 8, F_COND);
    spaced(ctx, 'GRUPPO SANGUIGNO', px + 8, by + 17, 1.3, 'left', pw - 16);
    fitFont(ctx, d.sangue || '—', '700', 26, 12, F_MONO, pw - 16);
    ctx.fillText(d.sangue || '—', px + 8, by + 48);

    // ---- colonna centrale
    var mx = 136, mw = 153;
    function field(label, value, y) {
      ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
      spaced(ctx, label, mx, y + 8, 1.6);
      ctx.fillStyle = t.ink;
      fitFont(ctx, value || '—', '700', 18, 9, F_COND, mw, 0.03);
      spaced(ctx, value || '—', mx, y + 27, 0.5, 'left', mw);
      ctx.fillStyle = t.line; ctx.fillRect(mx, y + 33, mw, 1);
    }
    field('COGNOME', up(d.cognome), 66);
    field('NOME', up(d.nome), 108);

    ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
    spaced(ctx, 'CALLSIGN', mx, 158, 1.6);
    var cs = up(d.callsign) ? '“' + up(d.callsign) + '”' : '—';
    ctx.fillStyle = t.accent;
    fitFont(ctx, cs, '400', 28, 10, F_STENCIL, mw, 0.05);
    spaced(ctx, cs, mx, 186, 1.2, 'left', mw);

    var bw = (mw - 8) / 2, bh = 80, bty = 305 - bh;
    [0, 1].forEach(function (i) {
      var bx = mx + i * (bw + 8);
      ctx.fillStyle = t.panel; ctx.fillRect(bx, bty, bw, bh);
      ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, bty + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
      spaced(ctx, i === 0 ? 'GRADO' : 'LIVELLO', bx + bw / 2, bty + 13, 1.5, 'center');
    });
    insignia(ctx, d.grado, mx + bw / 2 - 19, bty + 19, 38, t.accent);
    ctx.fillStyle = t.ink;
    fitFont(ctx, up(d.grado), '700', 9.5, 6, F_COND, bw - 8, 0.12);
    spaced(ctx, up(d.grado), mx + bw / 2, bty + bh - 8, 1.1, 'center', bw - 8);

    var tx = mx + bw + 8 + bw / 2;
    ctx.fillStyle = t.accent; font(ctx, '400', 36, F_STENCIL);
    ctx.textAlign = 'center'; ctx.fillText(d.tier ? 'T' + d.tier : '—', tx, bty + 58); ctx.textAlign = 'left';
    ctx.fillStyle = t.ink; font(ctx, '700', 9.5, F_COND);
    spaced(ctx, 'TIER', tx, bty + bh - 8, 1.1, 'center');

    // ---- colonna destra: logo + QR
    if (assets.logo && assets.logo.complete && assets.logo.naturalWidth) {
      ctx.drawImage(tinted(assets.logo, t.accent), 297, 60, 92, 92);
    }
    var qx = 301, qy = 205, qs = 84;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(qx, qy, qs, qs);
    var qr = null;
    if (d.qrText && d.qrText.trim() && root.QR) {
      try { qr = root.QR.encode(d.qrText, 'M'); } catch (e) { qr = null; }
    }
    if (qr) {
      var quiet = 2, m = qs / (qr.size + quiet * 2);
      ctx.fillStyle = '#000000';
      for (var yy = 0; yy < qr.size; yy++) for (var xx = 0; xx < qr.size; xx++) {
        if (qr.get(xx, yy)) ctx.fillRect(qx + (xx + quiet) * m, qy + (yy + quiet) * m, m + 0.02, m + 0.02);
      }
    } else {
      ctx.save();
      ctx.strokeStyle = t.accent; ctx.setLineDash([3, 2]); ctx.strokeRect(qx + 0.5, qy + 0.5, qs - 1, qs - 1);
      ctx.restore();
      ctx.fillStyle = '#6b6658'; font(ctx, '700', 10, F_MONO);
      ctx.textAlign = 'center'; ctx.fillText('QR', qx + qs / 2, qy + qs / 2 + 4); ctx.textAlign = 'left';
    }
    ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
    spaced(ctx, 'SCAN ID', qx + qs / 2, qy + qs + 11, 1.5, 'center');

    return { qrVersion: qr ? qr.version : 0 };
  }

  root.TauriCard = { draw: draw, W: W, H: H, THEMES: THEMES, GRADI: GRADI };
})(window);
