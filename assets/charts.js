/* Data Score — gráficos de linha e de barras+linha (sem dependências). Expõe window.DSC. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', INK = '#1B1F3B', MUTE = '#6B7088', GRID = '#E6E8EF';
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function tx(parent, x, y, s, o) {
    o = o || {}; var t = el('text', { x: x, y: y, fill: o.fill || MUTE, 'font-size': o.size || 11, 'font-weight': o.weight || 400, 'text-anchor': o.anchor || 'start', 'dominant-baseline': o.base || 'auto', 'font-family': 'Inter,sans-serif' }, parent);
    t.textContent = s; return t;
  }
  function smooth(p) {
    if (p.length < 3) return 'M' + p.map(function (a) { return a[0] + ' ' + a[1]; }).join('L');
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function range(v, zero) {
    var a = Math.min.apply(null, v), b = Math.max.apply(null, v);
    if (zero) a = Math.min(a, 0);
    var pad = (b - a) * .14 || 1; return [zero ? a : a - pad, b + pad];
  }
  function tip(ev, node, title, label, sub) {
    var X = window.DSX; if (!X) return; var r = node.getBoundingClientRect();
    X.showTip(ev && ev.type !== 'focus' ? ev.clientX : r.left + r.width / 2, ev && ev.type !== 'focus' ? ev.clientY : r.top, title, label, sub);
  }
  function hide() { if (window.DSX) window.DSX.hideTip(); }

  /* linha suave com pontos e rótulos. o: color, fmt, avg, avgLabel, every (rótulo do eixo x), labels (valores nos pontos), h, tipLabel */
  function lineChart(host, labels, vals, o) {
    o = o || {}; host.textContent = '';
    var fmt = o.fmt || String, W = Math.max(host.clientWidth, 280), H = o.h || 250, m = { l: 30, r: o.avg != null ? 54 : 30, t: 26, b: 30 }, N = vals.length;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': o.aria || 'Gráfico de linha' }, host);
    var ys = vals.filter(function (v) { return v != null; }).concat(o.avg != null ? [o.avg] : []), ex = range(ys, o.zero), pw = W - m.l - m.r, ph = H - m.t - m.b;
    var sx = function (i) { return m.l + (N > 1 ? i / (N - 1) : .5) * pw; }, sy = function (v) { var u = (v - ex[0]) / (ex[1] - ex[0]); return m.t + (o.invert ? u : 1 - u) * ph; };
    el('line', { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, stroke: '#C9CDDB', 'stroke-width': 1 }, svg);
    var ev = o.every || Math.ceil(N / 12);
    labels.forEach(function (l, i) { if (i % ev === 0 || i === N - 1 && N <= 14) tx(svg, sx(i), H - 9, String(l), { anchor: 'middle', size: 10.5 }); });
    if (o.avg != null) { el('line', { x1: m.l, x2: W - m.r + 4, y1: sy(o.avg), y2: sy(o.avg), stroke: '#B4B9CE', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg); tx(svg, W - m.r + 8, sy(o.avg), o.avgLabel || fmt(o.avg), { size: 10.5, weight: 700, base: 'central', fill: MUTE }); }
    var pts = []; vals.forEach(function (v, i) { if (v != null) pts.push([+sx(i).toFixed(1), +sy(v).toFixed(1)]); });
    el('path', { d: smooth(pts), fill: 'none', stroke: o.color || '#298463', 'stroke-width': 2.75, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    vals.forEach(function (v, i) {
      if (v == null) return; var cx = sx(i), cy = sy(v);
      el('circle', { cx: cx, cy: cy, r: 3.6, fill: o.color || '#298463', stroke: '#fff', 'stroke-width': 1.5 }, svg);
      if (o.labels !== false && (N <= 14 || o.labels === true)) tx(svg, cx, cy - 10, (o.labFmt || fmt)(v), { anchor: 'middle', size: 10.5, weight: 700, fill: INK });
      var h = el('circle', { cx: cx, cy: cy, r: Math.max(8, Math.min(16, pw / N / 2)), fill: 'transparent', tabindex: 0, 'aria-label': labels[i] + ': ' + fmt(v) }, svg);
      var show = function (e) { tip(e, h, fmt(v), (o.tipLabel || '') + labels[i]); };
      h.addEventListener('pointermove', show); h.addEventListener('focus', show); h.addEventListener('pointerleave', hide); h.addEventListener('blur', hide);
    });
  }

  /* barras (clube) + linha suave (adversário). o: barColor, lineColor, fmt, barName, lineName, h */
  function comboChart(host, labels, bars, line, o) {
    o = o || {}; host.textContent = '';
    var fmt = o.fmt || String, W = Math.max(host.clientWidth, 280), H = o.h || 250, m = { l: 12, r: 12, t: 28, b: 30 }, N = labels.length;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': o.aria || 'Gráfico de barras e linha' }, host);
    var mxv = Math.max.apply(null, bars.concat(line)) * 1.22 || 1, pw = W - m.l - m.r, ph = H - m.t - m.b, band = pw / N, bw = Math.min(30, band * .5);
    var cx = function (i) { return m.l + band * (i + .5); }, sy = function (v) { return m.t + (1 - v / mxv) * ph; };
    el('line', { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, stroke: '#C9CDDB', 'stroke-width': 1 }, svg);
    labels.forEach(function (l, i) { tx(svg, cx(i), H - 9, l, { anchor: 'middle', size: 10.5, weight: 600 }); });
    bars.forEach(function (v, i) {
      var y = sy(v), r = el('rect', { x: cx(i) - bw / 2, y: y, width: bw, height: Math.max(0, m.t + ph - y), rx: 3, fill: o.barColor || '#2D3776' }, svg);
      if (v > 0 && m.t + ph - y > 16) tx(svg, cx(i), m.t + ph - 7, fmt(bars[i]), { anchor: 'middle', size: 10.5, weight: 700, fill: '#fff' });
      var show = function (e) { tip(e, r, (o.barName || 'Clube') + ': ' + fmt(v), (o.lineName || 'Adversário') + ': ' + fmt(line[i]), labels[i]); };
      var hit = el('rect', { x: cx(i) - band / 2, y: m.t, width: band, height: ph, fill: 'transparent', tabindex: 0, 'aria-label': labels[i] + ': clube ' + fmt(v) + ', adversário ' + fmt(line[i]) }, svg);
      hit.addEventListener('pointermove', show); hit.addEventListener('focus', show); hit.addEventListener('pointerleave', hide); hit.addEventListener('blur', hide);
    });
    var pts = line.map(function (v, i) { return [+cx(i).toFixed(1), +sy(v).toFixed(1)]; });
    el('path', { d: smooth(pts), fill: 'none', stroke: o.lineColor || '#15AD76', 'stroke-width': 2.75, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'pointer-events': 'none' }, svg);
    line.forEach(function (v, i) { el('circle', { cx: cx(i), cy: sy(v), r: 3.4, fill: o.lineColor || '#15AD76', stroke: '#fff', 'stroke-width': 1.5, 'pointer-events': 'none' }, svg); tx(svg, cx(i), sy(v) - 9, fmt(v), { anchor: 'middle', size: 10.5, weight: 700, fill: INK }); });
  }
  function redraw(host, fn) {
    fn(); if ('ResizeObserver' in window) { var lw = host.clientWidth; new ResizeObserver(function () { if (Math.abs(host.clientWidth - lw) > 4) { lw = host.clientWidth; fn(); } }).observe(host); }
  }
  window.DSC = { lineChart: lineChart, comboChart: comboChart, smooth: smooth, redraw: redraw };
})();
