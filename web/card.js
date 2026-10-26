/* Disegno del tesserino Tauri su canvas.
   Coordinate di progetto: 333 x 529 (= 88 x 140 mm, verticale). L'export scala a 300 dpi. */
(function (root) {
  'use strict';

  var W = 333, H = 529;
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


  // ------------------------------------------------------------------ brevetti
  // Catalogo modificabile: per aggiungere un brevetto basta una riga (icona di riserva: stella).
  var BREVETTI = [
    { id: 'navigazione', nome: 'Navigazione', icona: 'nav', ink: '#1f4f8f' },
    { id: 'comunicazioni', nome: 'Comunicazioni', icona: 'radio', ink: '#2d6a3e' },
    { id: 'survivor', nome: 'Survivor', icona: 'fuoco', ink: '#8f4a12' },
    { id: 'tiro', nome: 'Tiro dinamico', icona: 'mirino', ink: '#a1221c' },
    { id: 'cqb', nome: 'CQB', icona: 'cqb', ink: '#3b2f63' }
  ];
  var INK_RISERVA = ['#1f4f8f', '#2d6a3e', '#8f4a12', '#a1221c', '#3b2f63', '#1c1c18'];
  var PAPER = { notte: '#e7e0cc', oliva: '#e4e1c9', deserto: '#efe6cb' };

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function fmtData(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? m[3] + '.' + m[2] + '.' + m[1] : iso;
  }

  // testo lungo un arco: in alto si legge da sinistra a destra, in basso pure (lettere dritte)
  function arcText(ctx, text, r, top, maxAngle, spacing) {
    var ws = [], tot = 0, i;
    for (i = 0; i < text.length; i++) { ws.push(ctx.measureText(text[i]).width); tot += ws[i] + (i ? spacing : 0); }
    var k = Math.min(1, maxAngle * r / tot);
    var ang = tot * k / r, a = top ? -ang / 2 : ang / 2;
    ctx.textAlign = 'center';
    for (i = 0; i < text.length; i++) {
      var step = (ws[i] * k) / r;
      ctx.save();
      if (top) { ctx.rotate(a + step / 2); ctx.scale(k, 1); ctx.fillText(text[i], 0, -r); a += step + spacing * k / r; }
      else { ctx.rotate(a - step / 2); ctx.scale(k, 1); ctx.fillText(text[i], 0, r); a -= step + spacing * k / r; }
      ctx.restore();
    }
    ctx.textAlign = 'left';
  }

  function icona(ctx, tipo, s, ink, paper) {
    ctx.save();
    ctx.strokeStyle = ink; ctx.fillStyle = ink;
    ctx.lineWidth = s * 0.075; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var p = function (pts) { ctx.beginPath(); ctx.moveTo(pts[0] * s, pts[1] * s); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * s, pts[i + 1] * s); ctx.closePath(); };
    switch (tipo) {
      case 'nav':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); ctx.stroke();
        p([0, -0.5, 0.1, -0.1, 0.5, 0, 0.1, 0.1, 0, 0.5, -0.1, 0.1, -0.5, 0, -0.1, -0.1]); ctx.fill();
        ctx.fillStyle = paper; p([0, -0.42, 0.055, -0.08, -0.055, -0.08]); ctx.fill();
        break;
      case 'radio':
        ctx.beginPath(); ctx.moveTo(0, -0.12 * s); ctx.lineTo(0, 0.48 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.2 * s, 0.48 * s); ctx.lineTo(0, 0.12 * s); ctx.lineTo(0.2 * s, 0.48 * s); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -0.2 * s, 0.07 * s, 0, Math.PI * 2); ctx.fill();
        [0.2, 0.34].forEach(function (rr) {
          ctx.beginPath(); ctx.arc(0, -0.2 * s, rr * s, -0.85, 0.85); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -0.2 * s, rr * s, Math.PI - 0.85, Math.PI + 0.85); ctx.stroke();
        });
        break;
      case 'fuoco':
        ctx.beginPath();
        ctx.moveTo(0, -0.5 * s);
        ctx.bezierCurveTo(0.12 * s, -0.25 * s, 0.4 * s, -0.08 * s, 0.34 * s, 0.2 * s);
        ctx.bezierCurveTo(0.3 * s, 0.42 * s, 0.12 * s, 0.48 * s, 0, 0.48 * s);
        ctx.bezierCurveTo(-0.12 * s, 0.48 * s, -0.32 * s, 0.4 * s, -0.33 * s, 0.18 * s);
        ctx.bezierCurveTo(-0.34 * s, 0.0, -0.2 * s, -0.08 * s, -0.16 * s, -0.24 * s);
        ctx.bezierCurveTo(-0.08 * s, -0.12 * s, -0.06 * s, -0.3 * s, 0, -0.5 * s);
        ctx.fill();
        ctx.fillStyle = paper;
        ctx.beginPath();
        ctx.moveTo(0.02 * s, -0.04 * s);
        ctx.bezierCurveTo(0.1 * s, 0.08 * s, 0.2 * s, 0.18 * s, 0.14 * s, 0.32 * s);
        ctx.bezierCurveTo(0.1 * s, 0.4 * s, -0.1 * s, 0.4 * s, -0.13 * s, 0.3 * s);
        ctx.bezierCurveTo(-0.16 * s, 0.18 * s, -0.04 * s, 0.1 * s, 0.02 * s, -0.04 * s);
        ctx.fill();
        break;
      case 'mirino':
        ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2); ctx.stroke();
        [[0, -0.5, 0, -0.16], [0, 0.16, 0, 0.5], [-0.5, 0, -0.16, 0], [0.16, 0, 0.5, 0]].forEach(function (l) {
          ctx.beginPath(); ctx.moveTo(l[0] * s, l[1] * s); ctx.lineTo(l[2] * s, l[3] * s); ctx.stroke();
        });
        ctx.beginPath(); ctx.arc(0, 0, s * 0.055, 0, Math.PI * 2); ctx.fill();
        break;
      case 'cqb':
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(-0.38 * s, -0.14 * s); ctx.lineTo(-0.38 * s, -0.42 * s); ctx.lineTo(0.42 * s, -0.42 * s);
        ctx.lineTo(0.42 * s, 0.42 * s); ctx.lineTo(-0.38 * s, 0.42 * s); ctx.lineTo(-0.38 * s, 0.14 * s);
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-0.55 * s, 0); ctx.lineTo(0.12 * s, 0); ctx.stroke();
        p([0.24, 0, 0.06, -0.13, 0.06, 0.13]); ctx.fill();
        break;
      default:
        star(ctx, 0, 0, s / 12);
    }
    ctx.restore();
  }

  // timbro tondo stile "gomma": anello doppio, nome in alto, data in basso, icona al centro
  function timbro(ctx, b, cx, cy, r, data, paper) {
    var seed = hash(b.nome + (data || ''));
    var R = rng(seed);
    var ink = b.ink || INK_RISERVA[hash(b.nome) % INK_RISERVA.length];
    var rot = (R() - 0.5) * 0.42;
    ctx.save();
    ctx.translate(cx + (R() - 0.5) * 5, cy + (R() - 0.5) * 5);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = ink; ctx.fillStyle = ink;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r - 23, 0, Math.PI * 2); ctx.stroke();
    font(ctx, '700', 12, F_COND);
    arcText(ctx, b.nome.toUpperCase(), r - 18, true, 2.5, 1.2);
    font(ctx, '700', 9.5, F_MONO);
    arcText(ctx, fmtData(data) || '', r - 10, false, 2.0, 0.6);
    star(ctx, -(r - 14), 0, 0.42); star(ctx, r - 14, 0, 0.42);
    icona(ctx, b.icona, (r - 23) * 1.15, ink, paper);
    ctx.globalAlpha = 1;
    // inchiostro irregolare: piccole mancanze sul timbro
    ctx.fillStyle = paper;
    for (var i = 0; i < 70; i++) {
      var a = R() * Math.PI * 2, d = Math.sqrt(R()) * r, s = 0.25 + R() * 0.7;
      ctx.globalAlpha = 0.35 + R() * 0.45;
      ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // spazio vuoto per un brevetto non ancora conseguito
  function slotVuoto(ctx, b, cx, cy, r, color, paper) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.55;
    icona(ctx, b.icona, (r - 23) * 0.9, color, paper);
    ctx.globalAlpha = 1;
    font(ctx, '600', 10, F_COND);
    arcText(ctx, b.nome.toUpperCase(), r - 14, true, 2.4, 1.2);
    ctx.restore();
  }

  function logoAt(ctx, assets, color, x, y, s, alpha) {
    if (!(assets.logo && assets.logo.complete && assets.logo.naturalWidth)) return;
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(tinted(assets.logo, color), x, y, s, s);
    ctx.restore();
  }

  function header(ctx, t, assets, title, sub) {
    ctx.fillStyle = t.panel; ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = t.line; ctx.fillRect(0, 63, W, 1);
    logoAt(ctx, assets, t.accent, 10, 7, 50);
    ctx.fillStyle = t.ink; font(ctx, '400', 20, F_STENCIL);
    spaced(ctx, title, 68, 32, 0.8, 'left', W - 82);
    ctx.fillStyle = t.accent; font(ctx, '600', 8.5, F_COND);
    spaced(ctx, sub, 68, 47, 1.7, 'left', W - 82);
    hazard(ctx, 0, 64, W, 4, t.accent, t.bg);
  }

  /**
   * FRONTE. d: { cognome, nome, callsign, numero, rilascio (AAAA-MM-GG), sangue, grado, tier, tema,
   *              photo, photoZoom, photoX, photoY, qrText }
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

    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
    logoAt(ctx, assets, t.accent === '#3d3a2b' ? '#1c1c18' : '#c8b68a', 40, 190, 300, t.wm);

    header(ctx, t, assets, 'ASD TAURI SOFTAIR', 'TESSERA DI RICONOSCIMENTO');
    hazard(ctx, 0, H - 6, W, 6, t.accent, t.bg);

    // foto
    var px = 16, py = 82, pw = 136, ph = 176;
    ctx.fillStyle = t.panel; ctx.fillRect(px, py, pw, ph);
    if (d.photo && d.photo.naturalWidth) {
      var iw = d.photo.naturalWidth, ih = d.photo.naturalHeight;
      var z = Math.max(pw / iw, ph / ih) * (d.photoZoom || 1);
      var dw = iw * z, dh = ih * z, ox = (dw - pw) / 2, oy = (dh - ph) / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.drawImage(d.photo, px - ox + (d.photoX || 0) * ox, py - oy + (d.photoY || 0) * oy, dw, dh);
      ctx.restore();
    } else {
      silhouette(ctx, px, py, pw, ph, t.line);
      ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
      spaced(ctx, 'FOTO', px + pw / 2, py + 18, 2, 'center');
    }
    ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    brackets(ctx, px, py, pw, ph, t.accent);

    // colonna destra: tessera n°, rilascio, gruppo sanguigno
    var rx = 166, rw = W - 16 - rx;
    function small(label, value, y) {
      ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
      spaced(ctx, label, rx, y + 8, 1.6, 'left', rw);
      ctx.fillStyle = t.accent; font(ctx, '700', 15, F_MONO);
      spaced(ctx, value || '—', rx, y + 28, 0.6, 'left', rw);
      ctx.fillStyle = t.line; ctx.fillRect(rx, y + 35, rw, 1);
    }
    small('TESSERA N°', up(d.numero), 84);
    small('DATA DI RILASCIO', fmtData(d.rilascio), 128);

    var by = 180, bh = 78;
    ctx.fillStyle = t.accent; ctx.fillRect(rx, by, rw, bh);
    ctx.fillStyle = t.accentInk; font(ctx, '700', 8.5, F_COND);
    spaced(ctx, 'GRUPPO SANGUIGNO', rx + 10, by + 19, 1.3, 'left', rw - 20);
    fitFont(ctx, d.sangue || '—', '700', 32, 12, F_MONO, rw - 20);
    ctx.fillText(d.sangue || '—', rx + 10, by + 62);

    // dati anagrafici
    var mx = 16, mw = W - 32;
    function field(label, value, y) {
      ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
      spaced(ctx, label, mx, y + 8, 1.6);
      ctx.fillStyle = t.ink; font(ctx, '700', 22, F_COND);
      spaced(ctx, value || '—', mx, y + 31, 0.6, 'left', mw);
      ctx.fillStyle = t.line; ctx.fillRect(mx, y + 38, mw, 1);
    }
    field('COGNOME', up(d.cognome), 272);
    field('NOME', up(d.nome), 318);
    ctx.fillStyle = t.muted; font(ctx, '600', 8, F_COND);
    spaced(ctx, 'CALLSIGN', mx, 372, 1.6);
    var cs = up(d.callsign) ? '“' + up(d.callsign) + '”' : '—';
    ctx.fillStyle = t.accent; font(ctx, '400', 32, F_STENCIL);
    spaced(ctx, cs, mx, 404, 1.2, 'left', mw);

    // grado, tier, QR
    var ry = 416, rh = 101, bw = 92;
    [0, 1].forEach(function (i) {
      var bx = mx + i * (bw + 8);
      ctx.fillStyle = t.panel; ctx.fillRect(bx, ry, bw, rh);
      ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, ry + 0.5, bw - 1, rh - 1);
      ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
      spaced(ctx, i === 0 ? 'GRADO' : 'LIVELLO', bx + bw / 2, ry + 14, 1.5, 'center');
    });
    insignia(ctx, d.grado, mx + bw / 2 - 22, ry + 22, 44, t.accent);
    ctx.fillStyle = t.ink; font(ctx, '700', 9.5, F_COND);
    spaced(ctx, up(d.grado), mx + bw / 2, ry + rh - 9, 1.1, 'center', bw - 10);
    var tx = mx + bw + 8 + bw / 2;
    ctx.fillStyle = t.accent; font(ctx, '400', 40, F_STENCIL);
    ctx.textAlign = 'center'; ctx.fillText(d.tier ? 'T' + d.tier : '—', tx, ry + 68); ctx.textAlign = 'left';
    ctx.fillStyle = t.ink; font(ctx, '700', 9.5, F_COND);
    spaced(ctx, 'TIER', tx, ry + rh - 9, 1.1, 'center');

    var qx = W - 16 - 101, qy = ry, qs = 101;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(qx, qy, qs, qs);
    var qr = null;
    if (d.qrText && d.qrText.trim() && root.QR) { try { qr = root.QR.encode(d.qrText, 'M'); } catch (e) { qr = null; } }
    if (qr) {
      var quiet = 2, m = qs / (qr.size + quiet * 2);
      ctx.fillStyle = '#000000';
      for (var yy = 0; yy < qr.size; yy++) for (var xx = 0; xx < qr.size; xx++)
        if (qr.get(xx, yy)) ctx.fillRect(qx + (xx + quiet) * m, qy + (yy + quiet) * m, m + 0.02, m + 0.02);
    } else {
      ctx.save(); ctx.strokeStyle = t.accent; ctx.setLineDash([3, 2]); ctx.strokeRect(qx + 0.5, qy + 0.5, qs - 1, qs - 1); ctx.restore();
      ctx.fillStyle = '#6b6658'; font(ctx, '700', 11, F_MONO);
      ctx.textAlign = 'center'; ctx.fillText('QR', qx + qs / 2, qy + qs / 2 + 4); ctx.textAlign = 'left';
    }
    return { qrVersion: qr ? qr.version : 0 };
  }

  /**
   * RETRO: brevetti. d.brevetti = { <id>: 'AAAA-MM-GG' } per quelli conseguiti.
   * Mostra tutto il catalogo: timbro se conseguito, spazio tratteggiato se no.
   */
  function drawBack(canvas, d, assets, scale, catalogo) {
    scale = scale || 1;
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    var t = THEMES[d.tema] || THEMES.notte;
    var paper = PAPER[d.tema] || PAPER.notte;
    var up = function (s) { return (s || '').toString().trim().toUpperCase(); };
    var cat = catalogo || BREVETTI;
    var ok = d.brevetti || {};

    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    // trama leggera della carta
    var R = rng(7);
    ctx.fillStyle = 'rgba(80,70,40,0.05)';
    for (var i = 0; i < 900; i++) ctx.fillRect(R() * W, R() * H, 1, 1);
    logoAt(ctx, assets, '#1c1c18', 46, 150, 240, 0.05);

    var who = [up(d.cognome), up(d.nome)].filter(Boolean).join(' ');
    if (up(d.callsign)) who += (who ? '  ' : '') + '“' + up(d.callsign) + '”';
    if (up(d.numero)) who += (who ? '  ·  ' : '') + up(d.numero);
    header(ctx, t, assets, 'BREVETTI', who || 'OPERATORE');

    // griglia timbri
    var n = cat.length, cols = n <= 6 ? 2 : 3, rows = Math.max(1, Math.ceil(n / cols));
    var gx = 16, gy = 80, gw = W - 32, gh = 418;
    var cw = gw / cols, ch = gh / rows;
    var r = Math.min(cw, ch) / 2 - 9;
    cat.forEach(function (b, k) {
      var c = k % cols, rr = Math.floor(k / cols);
      var inRow = Math.min(cols, n - rr * cols);           // centra l'ultima riga se incompleta
      var off = (cols - inRow) * cw / 2;
      var cx = gx + off + c * cw + cw / 2, cy = gy + rr * ch + ch / 2;
      if (ok[b.id]) timbro(ctx, b, cx, cy, r, ok[b.id], paper);
      else slotVuoto(ctx, b, cx, cy, r, '#a49b80', paper);
    });

    ctx.fillStyle = '#5a5444'; font(ctx, '600', 8, F_COND);
    spaced(ctx, 'IL TIMBRO ATTESTA IL SUPERAMENTO DELL’ESAME DEL CORSO', W / 2, 512, 1, 'center', W - 32);
    hazard(ctx, 0, H - 6, W, 6, t.accent, t.bg);
  }

  root.TauriCard = { draw: draw, drawBack: drawBack, W: W, H: H, THEMES: THEMES, GRADI: GRADI, BREVETTI: BREVETTI };
})(window);
