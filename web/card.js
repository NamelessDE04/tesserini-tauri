/* Disegno del tesserino Tauri su canvas.
   Coordinate di progetto: 333 x 529 (= 88 x 140 mm, verticale, un solo lato). L'export scala a 300 dpi. */
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
    { id: 'cqb', nome: 'CQB', icona: 'cqb', ink: '#3b2f63' },
    { id: 'medicina', nome: 'Medicina tattica', icona: 'croce', ink: '#9c1c3a' },
    { id: 'nbc', nome: 'Chimico/batteriologico', icona: 'nbc', ink: '#6b6a12' },
    { id: 'meccanica', nome: 'Meccanica ASG', icona: 'asg', ink: '#4a4f57' },
    { id: 'corda', nome: 'Manovre su corda', icona: 'corda', ink: '#1f6b6b' }
  ];
  var INK_RISERVA = ['#1f4f8f', '#2d6a3e', '#8f4a12', '#a1221c', '#3b2f63', '#1c1c18'];

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function fmtData(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? m[3] + '.' + m[2] + '.' + m[1] : iso;
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
      case 'croce':
        p([-0.13, -0.42, 0.13, -0.42, 0.13, -0.13, 0.42, -0.13, 0.42, 0.13, 0.13, 0.13, 0.13, 0.42, -0.13, 0.42, -0.13, 0.13, -0.42, 0.13, -0.42, -0.13, -0.13, -0.13]);
        ctx.fill();
        break;
      case 'nbc':
        // tre anelli intrecciati attorno a un centro (simbolo di rischio biologico stilizzato)
        for (var k = 0; k < 3; k++) {
          var ang = -Math.PI / 2 + k * Math.PI * 2 / 3;
          ctx.beginPath(); ctx.arc(Math.cos(ang) * 0.17 * s, Math.sin(ang) * 0.17 * s, 0.2 * s, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 0.07 * s, 0, Math.PI * 2); ctx.fill();
        break;
      case 'asg':
        // ingranaggio (meccanica) con la sagoma di un fucile softair davanti
        var teeth = 8, ro = 0.42 * s, ri = 0.34 * s;
        ctx.beginPath();
        for (var g = 0; g < teeth * 2; g++) {
          var a0 = g * Math.PI / teeth, rr = (g % 2 === 0) ? ro : ri;
          ctx.lineTo(Math.cos(a0 - 0.18) * rr, Math.sin(a0 - 0.18) * rr);
          ctx.lineTo(Math.cos(a0 + 0.18) * rr, Math.sin(a0 + 0.18) * rr);
        }
        ctx.closePath(); ctx.lineWidth = s * 0.06; ctx.stroke();
        var fucile = [-0.5, -0.06, -0.3, -0.06, -0.28, -0.11, 0.18, -0.11, 0.18, -0.065, 0.4, -0.065, 0.4, -0.08, 0.52, -0.08,
          0.52, -0.045, 0.4, -0.045, 0.18, -0.02, 0.18, 0.0, 0.03, 0.0, 0.01, 0.17, -0.08, 0.16, -0.07, 0.0, -0.14, 0.0,
          -0.18, 0.15, -0.25, 0.14, -0.22, 0.0, -0.3, 0.02, -0.5, 0.09];
        p(fucile); ctx.lineWidth = s * 0.07; ctx.strokeStyle = paper; ctx.stroke();
        ctx.fillStyle = ink; ctx.fill();
        break;
      case 'corda':
        // matassa di corda legata al centro, con moschettone in alto
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = s * 0.07;
        ctx.beginPath(); ctx.ellipse(-0.08 * s, 0.08 * s, 0.25 * s, 0.4 * s, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-0.08 * s, 0.1 * s, 0.12 * s, 0.29 * s, 0, 0, Math.PI * 2); ctx.stroke();
        // legature al centro (con un piccolo stacco di sfondo per farle risaltare)
        [-0.02, 0.12].forEach(function (yy) {
          ctx.fillStyle = paper; ctx.fillRect(-0.4 * s, (yy - 0.07) * s, 0.64 * s, 0.14 * s);
          ctx.fillStyle = ink;
          var x0 = -0.37 * s, w0 = 0.58 * s, h0 = 0.08 * s, y0 = (yy - 0.04) * s, rr = h0 / 2;
          ctx.beginPath(); ctx.moveTo(x0 + rr, y0); ctx.lineTo(x0 + w0 - rr, y0); ctx.arc(x0 + w0 - rr, y0 + rr, rr, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(x0 + rr, y0 + h0); ctx.arc(x0 + rr, y0 + rr, rr, Math.PI / 2, Math.PI * 1.5); ctx.fill();
        });
        // moschettone
        ctx.save(); ctx.translate(0.28 * s, -0.3 * s); ctx.rotate(0.15);
        var cw2 = 0.09 * s, ch2 = 0.17 * s;
        ctx.lineWidth = s * 0.06;
        ctx.beginPath(); ctx.moveTo(-cw2, -ch2 + cw2); ctx.arc(0, -ch2 + cw2, cw2, Math.PI, 0); ctx.lineTo(cw2, ch2 - cw2);
        ctx.arc(0, ch2 - cw2, cw2, 0, Math.PI); ctx.closePath(); ctx.stroke();
        ctx.restore();
        ctx.lineWidth = s * 0.06;
        ctx.beginPath(); ctx.moveTo(0.27 * s, -0.13 * s); ctx.quadraticCurveTo(0.18 * s, -0.12 * s, 0.1 * s, -0.22 * s); ctx.stroke();
        break;
      default:
        star(ctx, 0, 0, s / 12);
    }
    ctx.restore();
  }

  // livelli dei brevetti
  var LIVELLI = {
    bronzo: { nome: 'Bronzo', stelle: 1, chiaro: '#e3a46b', medio: '#a8652f', scuro: '#5e3413' },
    argento: { nome: 'Argento', stelle: 2, chiaro: '#f4f6f8', medio: '#aab2ba', scuro: '#5d656d' },
    oro: { nome: 'Oro', stelle: 3, chiaro: '#ffe9a0', medio: '#d4a82e', scuro: '#7a5a0c' }
  };
  // un brevetto salvato può essere 'AAAA-MM-GG' (vecchio formato = bronzo) oppure { liv, data }
  function leggiBrevetto(v) {
    if (!v) return null;
    if (typeof v === 'string') return { liv: 'bronzo', data: v };
    return { liv: LIVELLI[v.liv] ? v.liv : 'bronzo', data: v.data || '' };
  }
  function stella(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // distintivo del brevetto: tondo pieno col colore del corso se conseguito, tratteggiato se no;
  // il bordo metallico e le stelle indicano il livello (bronzo 1, argento 2, oro 3)
  function distintivo(ctx, b, cx, cy, r, data, t, liv) {
    var ink = b.ink || INK_RISERVA[hash(b.nome) % INK_RISERVA.length];
    ctx.save();
    ctx.translate(cx, cy);
    if (data) {
      var L = LIVELLI[liv];
      if (L) {
        // anello metallico
        var g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, L.chiaro); g.addColorStop(0.5, L.medio); g.addColorStop(1, L.scuro);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, r - 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = L.scuro; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(0, 0, r - 2.4, 0, Math.PI * 2); ctx.stroke();
        icona(ctx, b.icona, r * 1.0, '#f4efe2', ink);
        // stelle sul bordo in basso
        ctx.fillStyle = L.chiaro; ctx.strokeStyle = L.scuro; ctx.lineWidth = 0.5;
        var n = L.stelle, passo = r * 0.42;
        for (var k = 0; k < n; k++) stella(ctx, (k - (n - 1) / 2) * passo, r * 0.98, r * 0.24);
      } else {
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = t.accent; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, r - 2.2, 0, Math.PI * 2); ctx.stroke();
        icona(ctx, b.icona, r * 1.15, '#f4efe2', ink);
      }
    } else {
      ctx.strokeStyle = t.line; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.6;
      icona(ctx, b.icona, r * 1.0, t.muted, t.bg);
      ctx.globalAlpha = 1;
    }
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
   * Tesserino (un solo lato). d: { cognome, nome, callsign, nascita, unita, numero, rilascio (AAAA-MM-GG),
   *   sangue, tier (1-10), tema, photo, photoZoom, photoX, photoY,
   *   brevetti: { <id>: { liv: 'bronzo'|'argento'|'oro', data: 'AAAA-MM-GG' } } (o la sola data = bronzo) }
   * catalogo: elenco brevetti (fino a 10: 2 righe da 5).
   */
  function draw(canvas, d, assets, scale, catalogo) {
    scale = scale || 1;
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.textBaseline = 'alphabetic';
    var t = THEMES[d.tema] || THEMES.notte;
    var up = function (s) { return (s || '').toString().trim().toUpperCase(); };

    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
    logoAt(ctx, assets, t.accent === '#3d3a2b' ? '#1c1c18' : '#c8b68a', 40, 150, 300, t.wm);

    header(ctx, t, assets, 'ASD TAURI SOFTAIR', 'TESSERA DI RICONOSCIMENTO');
    hazard(ctx, 0, H - 6, W, 6, t.accent, t.bg);

    // foto
    var px = 16, py = 78, pw = 112, ph = 144;
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

    // colonna destra
    var rx = 140, rw = W - 16 - rx;
    function small(label, value, y) {
      ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
      spaced(ctx, label, rx, y + 8, 1.5, 'left', rw);
      ctx.fillStyle = t.accent; font(ctx, '700', 14, F_MONO);
      spaced(ctx, value || '—', rx, y + 26, 0.5, 'left', rw);
      ctx.fillStyle = t.line; ctx.fillRect(rx, y + 32, rw, 1);
    }
    small('TESSERA N°', up(d.numero), 78);
    small('DATA DI NASCITA', fmtData(d.nascita), 114);
    small('DATA DI RILASCIO', fmtData(d.rilascio), 150);

    // tier: riquadro grande in evidenza · gruppo sanguigno: riquadro piccolo accanto
    var by = 189, bh = 33, tw2 = 106, sw = rw - tw2 - 7;
    ctx.fillStyle = t.accent; ctx.fillRect(rx, by, tw2, bh);
    // scritta unica e grande: "TIER 1" … "TIER 10", centrata nel riquadro
    var tierTxt = d.tier ? 'TIER ' + d.tier : 'TIER —';
    ctx.fillStyle = t.accentInk;
    var tsz = fitFont(ctx, tierTxt, '400', 24, 10, F_STENCIL, tw2 - 12);
    ctx.textAlign = 'center'; ctx.fillText(tierTxt, rx + tw2 / 2, by + bh / 2 + tsz * 0.36); ctx.textAlign = 'left';
    var sbx = rx + tw2 + 7;
    ctx.fillStyle = t.panel; ctx.fillRect(sbx, by, sw, bh);
    ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(sbx + 0.5, by + 0.5, sw - 1, bh - 1);
    ctx.fillStyle = t.muted; font(ctx, '600', 7, F_COND);
    spaced(ctx, 'GR. SANG.', sbx + sw / 2, by + 10, 1, 'center', sw - 8);
    ctx.fillStyle = t.accent; fitFont(ctx, d.sangue || '—', '700', 13, 7, F_MONO, sw - 8);
    ctx.textAlign = 'center'; ctx.fillText(d.sangue || '—', sbx + sw / 2, by + 28); ctx.textAlign = 'left';

    // dati anagrafici
    var mx = 16, mw = W - 32;
    function field(label, value, y, size, color) {
      ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
      spaced(ctx, label, mx, y + 8, 1.5);
      ctx.fillStyle = color || t.ink; font(ctx, '700', size, F_COND);
      spaced(ctx, value || '—', mx, y + 10 + size * 0.95, 0.5, 'left', mw);
      ctx.fillStyle = t.line; ctx.fillRect(mx, y + 15 + size, mw, 1);
    }
    field('COGNOME', up(d.cognome), 230, 20);
    field('NOME', up(d.nome), 268, 20);
    ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
    spaced(ctx, 'CALLSIGN', mx, 314, 1.5);
    var cs = up(d.callsign) ? '“' + up(d.callsign) + '”' : '—';
    ctx.fillStyle = t.accent; font(ctx, '400', 26, F_STENCIL);
    spaced(ctx, cs, mx, 340, 1, 'left', mw);
    field('UNITÀ DI APPARTENENZA', up(d.unita), 346, 14);

    // brevetti: fino a 10 (2 righe da 5)
    var cat = (catalogo || BREVETTI).slice(0, 10);
    var ok = d.brevetti || {};
    var gy = 382;
    ctx.fillStyle = t.panel; ctx.fillRect(mx, gy, mw, 134);
    ctx.strokeStyle = t.line; ctx.lineWidth = 1; ctx.strokeRect(mx + 0.5, gy + 0.5, mw - 1, 133);
    ctx.fillStyle = t.accent; font(ctx, '700', 8, F_COND);
    spaced(ctx, 'BREVETTI', mx + 8, gy + 12, 2);
    var nOk = cat.filter(function (b) { return ok[b.id]; }).length;
    ctx.fillStyle = t.muted; font(ctx, '600', 7.5, F_COND);
    spaced(ctx, nOk + ' / ' + cat.length, mx + mw - 8, gy + 12, 1, 'right');
    var cols = 5, cw = mw / cols, rowsN = Math.max(1, Math.ceil(cat.length / cols));
    var areaY = gy + 18, areaH = 134 - 22, rh = 58;
    var startY = areaY + (areaH - rowsN * rh) / 2;
    cat.forEach(function (b, k) {
      var c = k % cols, rr = Math.floor(k / cols);
      var inRow = Math.min(cols, cat.length - rr * cols);
      var cx = mx + (cols - inRow) * cw / 2 + c * cw + cw / 2;
      var cy = startY + rr * rh + 17;
      var bv = leggiBrevetto(ok[b.id]);
      distintivo(ctx, b, cx, cy, 15, bv && (bv.data || 'x'), t, bv && bv.liv);
      ctx.fillStyle = bv ? t.ink : t.muted; font(ctx, '700', 7, F_COND);
      spaced(ctx, b.nome.toUpperCase(), cx, cy + 26, 0.4, 'center', cw - 6);
      if (bv) {
        var dd = fmtData(bv.data);
        ctx.fillStyle = t.accent; font(ctx, '700', 6.5, F_MONO);
        spaced(ctx, dd, cx, cy + 35, 0, 'center', cw - 6);
      }
    });
  }

  // distintivo singolo (per l'elenco degli addestramenti)
  function badge(canvas, b, conseguito, px, liv) {
    px = px || 48;
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    canvas.width = Math.round(px * dpr); canvas.height = Math.round(px * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(canvas.width / 40, 0, 0, canvas.height / 40, 0, 0);
    distintivo(ctx, b, 20, 20, liv ? 17 : 18.5, conseguito ? 'x' : '', THEMES.notte, liv);
  }

  root.TauriCard = { draw: draw, badge: badge, W: W, H: H, THEMES: THEMES, BREVETTI: BREVETTI, LIVELLI: LIVELLI, leggiBrevetto: leggiBrevetto };
})(window);
