/* Data Score — gráficos e interações (sem dependências). Lê apenas agregados de data.js */
(function () {
  'use strict';
  var DS = window.DS || {};
  var NS = 'http://www.w3.org/2000/svg';
  var C = { surface: '#1B1F3B', text: '#FFFFFF', text2: '#DFDFDF', muted: '#A9AEC8', grid: '#2A3166',
            green: '#15AD76', greenHi: '#33C690', blue: '#6F7FE6', blueHi: '#8F9CF0', zg4: '#15AD76', zz4: '#E5484D' };
  var nf = new Intl.NumberFormat('pt-BR');
  var F = {
    int: function (n) { return nf.format(Math.round(n)); },
    compact: function (n) {
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
      if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', ',').replace(',0', '') + ' mil';
      return String(Math.round(n));
    },
    brl: function (n) { return 'R$\u00a0' + n.toFixed(2).replace('.', ','); },
    brlc: function (n) {
      if (n >= 1e6) return 'R$\u00a0' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
      return 'R$\u00a0' + nf.format(Math.round(n / 1e3)) + ' mil';
    },
    brlfull: function (n) { return 'R$\u00a0' + nf.format(Math.round(n)); },
    pct: function (n) { return n.toFixed(1).replace('.', ',') + '%'; },
    d2: function (n) { return n.toFixed(2).replace('.', ','); }
  };
  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ---------- util SVG ---------- */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, s, o) {
    o = o || {};
    var t = el('text', { x: x, y: y, fill: o.fill || C.muted, 'font-size': o.size || 11, 'font-weight': o.weight || 400,
      'text-anchor': o.anchor || 'start', 'dominant-baseline': o.base || 'auto' }, parent);
    t.textContent = s;
    return t;
  }
  function niceMax(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    var s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return s * p;
  }
  function topRound(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) +
      'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function rightRound(x, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z';
  }

  /* ---------- tooltip ---------- */
  var tip = document.createElement('div');
  tip.className = 'tip'; tip.setAttribute('role', 'status');
  document.body.appendChild(tip);
  function placeTip(x, y) {
    tip.classList.add('on');
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var nx = x + 14, ny = y - h - 10;
    if (nx + w > window.innerWidth - 8) nx = x - w - 14;
    if (ny < 8) ny = y + 18;
    tip.style.left = Math.max(8, nx) + 'px'; tip.style.top = ny + 'px';
  }
  function showTip(x, y, value, label, sub) {
    tip.textContent = '';
    tip.appendChild(mk('div', 'tv', value));
    tip.appendChild(mk('div', 'tl', label));
    if (sub) tip.appendChild(mk('div', 'ts', sub));
    placeTip(x, y);
  }
  function showTipRows(x, y, title, rows) {
    tip.textContent = '';
    tip.appendChild(mk('div', 'tv', title));
    rows.forEach(function (r) {
      var d = mk('div', 'tl'), i = mk('i'); i.style.cssText = 'display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;background:' + r.color;
      d.appendChild(i); d.appendChild(document.createTextNode(r.text)); tip.appendChild(d);
    });
    placeTip(x, y);
  }
  function hideTip() { tip.classList.remove('on'); }
  function focusTip(node, value, label, sub) {
    var r = node.getBoundingClientRect();
    showTip(r.left + Math.min(r.width, 80), r.top + r.height / 2, value, label, sub);
  }

  /* ---------- gráfico: barras horizontais ---------- */
  function hbar(host, items, o) {
    var W = Math.max(host.clientWidth, 280), rowH = o.rowH || 28, bar = 14, top = 4;
    var maxLab = 0; items.forEach(function (d) { maxLab = Math.max(maxLab, d.label.length); });
    var labW = Math.min(W * 0.42, 170, Math.max(84, maxLab * 6.6 + 8));
    var maxChars = Math.floor((labW - 6) / 6.3);
    var max = o.max || Math.max.apply(null, items.map(function (d) { return d.value; }));
    var valW = Math.max(46, Math.max.apply(null, items.map(function (d) { return o.fmt(d.value).length; })) * 7.2 + 12);
    var H = items.length * rowH + top + (o.ref != null ? 18 : 4);
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.aria }, host);
    var plotW = Math.max(40, W - labW - valW);
    var sx = function (v) { return (v / max) * plotW; };
    if (o.ref != null) {
      var rx = labW + sx(o.ref);
      el('line', { x1: rx, x2: rx, y1: top, y2: H - 18, stroke: C.muted, 'stroke-width': 1 }, svg);
      text(svg, rx, H - 4, o.refLabel, { anchor: 'middle', size: 10.5 });
    }
    items.forEach(function (d, i) {
      var y = top + i * rowH, by = y + (rowH - bar) / 2;
      var g = el('g', { tabindex: 0, 'aria-label': d.label + ': ' + o.fmt(d.value), 'class': 'bar-hit' }, svg);
      el('rect', { x: 0, y: y, width: W, height: rowH, fill: 'transparent' }, g);
      var lab = d.label.length > maxChars ? d.label.slice(0, maxChars - 1) + '…' : d.label;
      text(g, 0, y + rowH / 2, lab, { fill: C.text2, size: 12, base: 'central' });
      var w = Math.max(2, sx(d.value));
      var p = el('path', { d: rightRound(labW, by, w, bar, 4), fill: o.color }, g);
      text(g, labW + w + 8, y + rowH / 2, o.fmt(d.value), { fill: C.text, size: 12, weight: 600, base: 'central' });
      var over = function (ev) { p.setAttribute('fill', o.hi); showTip(ev.clientX, ev.clientY, o.fmt(d.value), d.label, d.sub); };
      g.addEventListener('pointermove', over);
      g.addEventListener('pointerleave', function () { p.setAttribute('fill', o.color); hideTip(); });
      g.addEventListener('focus', function () { p.setAttribute('fill', o.hi); focusTip(p, o.fmt(d.value), d.label, d.sub); });
      g.addEventListener('blur', function () { p.setAttribute('fill', o.color); hideTip(); });
    });
  }

  /* ---------- gráfico: colunas ---------- */
  function col(host, items, o) {
    var W = Math.max(host.clientWidth, 280), H = 230, m = { l: 46, r: 8, t: 22, b: 30 };
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.aria }, host);
    var max = niceMax(Math.max.apply(null, items.map(function (d) { return d.value; })) * 1.04);
    var pw = W - m.l - m.r, ph = H - m.t - m.b, sy = function (v) { return m.t + ph - (v / max) * ph; };
    for (var i = 0; i <= 4; i++) {
      var v = max / 4 * i, y = sy(v);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: C.grid, 'stroke-width': 1 }, svg);
      text(svg, m.l - 8, y, (o.axisFmt || F.compact)(v), { anchor: 'end', size: 10.5, base: 'central' });
    }
    var band = pw / items.length, bw = Math.min(24, band * 0.6);
    var vs = items.map(function (d) { return d.value; }), maxV = Math.max.apply(null, vs), minV = Math.min.apply(null, vs);
    items.forEach(function (d, i) {
      var cx = m.l + band * i + band / 2, y = sy(d.value), h = m.t + ph - y;
      var g = el('g', { tabindex: 0, 'aria-label': d.label + ': ' + o.fmt(d.value), 'class': 'bar-hit' }, svg);
      el('rect', { x: cx - band / 2, y: m.t, width: band, height: ph + m.b, fill: 'transparent' }, g);
      var p = el('path', { d: topRound(cx - bw / 2, y, bw, h, 4), fill: o.color }, g);
      if (items.length <= 8 && (band >= 56 || d.value === maxV || d.value === minV)) text(g, cx, y - 6, o.fmt(d.value), { anchor: 'middle', fill: C.text, size: 11, weight: 600 });
      text(g, cx, H - 10, d.label, { anchor: 'middle', fill: C.text2, size: 11 });
      g.addEventListener('pointermove', function (ev) { p.setAttribute('fill', o.hi); showTip(ev.clientX, ev.clientY, o.fmt(d.value), d.label, d.sub); });
      g.addEventListener('pointerleave', function () { p.setAttribute('fill', o.color); hideTip(); });
      g.addEventListener('focus', function () { p.setAttribute('fill', o.hi); focusTip(p, o.fmt(d.value), d.label, d.sub); });
      g.addEventListener('blur', function () { p.setAttribute('fill', o.color); hideTip(); });
    });
  }

  /* ---------- gráfico: linha ---------- */
  function line(host, items, o) {
    var W = Math.max(host.clientWidth, 280), H = 230, m = { l: 46, r: 58, t: 22, b: 30 };
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.aria }, host);
    var vals = items.map(function (d) { return d.value; });
    var max = niceMax(Math.max.apply(null, vals) * 1.05);
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var sx = function (i) { return m.l + (i / (items.length - 1)) * pw; };
    var sy = function (v) { return m.t + ph - (v / max) * ph; };
    for (var i = 0; i <= 4; i++) {
      var y = sy(max / 4 * i);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: C.grid, 'stroke-width': 1 }, svg);
      text(svg, m.l - 8, y, F.compact(max / 4 * i), { anchor: 'end', size: 10.5, base: 'central' });
    }
    var step = items.length > 20 ? 5 : 2;
    items.forEach(function (d, i) {
      if (i === 0 || (i + 1) % step === 0) text(svg, sx(i), H - 10, d.label, { anchor: 'middle', size: 10.5 });
    });
    var pts = items.map(function (d, i) { return sx(i) + ',' + sy(d.value); });
    el('path', { d: 'M' + pts.join('L') + 'L' + sx(items.length - 1) + ',' + sy(0) + 'L' + sx(0) + ',' + sy(0) + 'Z', fill: o.color, 'fill-opacity': .1 }, svg);
    el('path', { d: 'M' + pts.join('L'), fill: 'none', stroke: o.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    var last = items.length - 1;
    el('circle', { cx: sx(last), cy: sy(items[last].value), r: 4, fill: o.color, stroke: C.surface, 'stroke-width': 2 }, svg);
    text(svg, sx(last) + 8, sy(items[last].value), F.compact(items[last].value), { fill: C.text, size: 11, weight: 600, base: 'central' });
    var cross = el('line', { y1: m.t, y2: m.t + ph, stroke: C.muted, 'stroke-width': 1, opacity: 0 }, svg);
    var dot = el('circle', { r: 4, fill: o.color, stroke: C.surface, 'stroke-width': 2, opacity: 0 }, svg);
    var hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0, 'aria-label': o.aria }, svg);
    var idx = 0;
    function at(i) {
      i = Math.max(0, Math.min(last, i)); idx = i; var d = items[i];
      cross.setAttribute('x1', sx(i)); cross.setAttribute('x2', sx(i)); cross.setAttribute('opacity', 1);
      dot.setAttribute('cx', sx(i)); dot.setAttribute('cy', sy(d.value)); dot.setAttribute('opacity', 1);
      return d;
    }
    hit.addEventListener('pointermove', function (ev) {
      var r = svg.getBoundingClientRect(), d = at(Math.round(((ev.clientX - r.left - m.l) / pw) * last));
      showTip(ev.clientX, ev.clientY, o.fmt(d.value), d.tip, d.sub);
    });
    hit.addEventListener('pointerleave', function () { cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); hideTip(); });
    hit.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault(); var d = at(idx + (ev.key === 'ArrowRight' ? 1 : -1));
        var r = svg.getBoundingClientRect(); showTip(r.left + sx(idx), r.top + sy(d.value), o.fmt(d.value), d.tip, d.sub);
      }
    });
    hit.addEventListener('focus', function () { var d = at(idx); var r = svg.getBoundingClientRect(); showTip(r.left + sx(idx), r.top + sy(d.value), o.fmt(d.value), d.tip, d.sub); });
    hit.addEventListener('blur', function () { cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); hideTip(); });
  }

  /* ---------- gráficos prontos (cards com data-chart) ---------- */
  var REG = {
    'publico-clube': function (top) {
      var rows = DS.clubes.slice().sort(function (a, b) { return b.publico_medio - a.publico_medio; });
      if (top) rows = rows.slice(0, top);
      return { draw: function (h) { hbar(h, rows.map(function (c) { return { label: c.nome, value: c.publico_medio,
          sub: 'Ocupação ' + F.pct(c.ocupacao) + ' · ticket ' + F.brl(c.ticket) }; }),
          { fmt: F.int, color: C.green, hi: C.greenHi, aria: 'Público médio por mandante' }); },
        cols: ['Clube', 'Público médio'], rows: rows.map(function (c) { return [c.nome, F.int(c.publico_medio)]; }) };
    },
    'dia': function () {
      var rows = DS.dia;
      return { draw: function (h) { col(h, rows.map(function (d) { return { label: d.k, value: d.publico_medio, sub: d.jogos + ' jogos · ocupação ' + F.pct(d.ocupacao) }; }),
          { fmt: F.int, color: C.green, hi: C.greenHi, aria: 'Público médio por dia da semana' }); },
        cols: ['Dia', 'Jogos', 'Público médio'], rows: rows.map(function (d) { return [d.k, d.jogos, F.int(d.publico_medio)]; }) };
    },
    'rodada': function () {
      var rows = DS.rodada;
      return { draw: function (h) { line(h, rows.map(function (d) { return { label: String(d.r), value: d.publico_medio, tip: 'Rodada ' + d.r, sub: 'Ticket médio ' + F.brl(d.ticket) }; }),
          { fmt: F.int, color: C.green, aria: 'Público médio por rodada' }); },
        cols: ['Rodada', 'Público médio'], rows: rows.map(function (d) { return [d.r, F.int(d.publico_medio)]; }) };
    }
  };

  function tableOf(spec) {
    var t = mk('table'), th = mk('thead'), trh = mk('tr');
    spec.cols.forEach(function (c) { trh.appendChild(mk('th', null, c)); });
    th.appendChild(trh); t.appendChild(th);
    var tb = mk('tbody');
    spec.rows.forEach(function (r) { var tr = mk('tr'); r.forEach(function (v) { tr.appendChild(mk('td', null, v)); }); tb.appendChild(tr); });
    t.appendChild(tb); return t;
  }
  function mountSpec(card, spec) {
    var host = card.querySelector('.plot'), tblHost = card.querySelector('.tbl-wrap');
    function draw() { hideTip(); host.textContent = ''; spec.draw(host); }
    draw();
    if (tblHost) tblHost.appendChild(tableOf(spec));
    var btn = card.querySelector('[data-toggle]');
    if (btn) btn.addEventListener('click', function () {
      var showT = tblHost.hidden; tblHost.hidden = !showT; host.hidden = showT; btn.textContent = showT ? 'Gráfico' : 'Tabela';
      if (!showT) draw();
    });
    if ('ResizeObserver' in window) {
      var last = host.clientWidth;
      new ResizeObserver(function () { if (!host.hidden && Math.abs(host.clientWidth - last) > 4) { last = host.clientWidth; draw(); } }).observe(host);
    }
    return { redraw: draw, spec: spec };
  }
  document.querySelectorAll('.ccard[data-chart]').forEach(function (card) {
    var key = card.getAttribute('data-chart'), arg = parseInt(card.getAttribute('data-top') || '0', 10) || 0;
    if (REG[key] && DS.clubes) mountSpec(card, REG[key](arg));
  });

  /* ---------- KPIs ---------- */
  document.querySelectorAll('[data-kpi]').forEach(function (n) {
    var k = n.getAttribute('data-kpi'), f = n.getAttribute('data-f') || 'int', v = DS.kpi && DS.kpi[k];
    if (v == null) return; n.textContent = F[f](v);
  });

  /* =====================  CLASSIFICAÇÃO  ===================== */
  var TEAMS = DS.tab ? DS.tab.times : [], RES = DS.tab ? DS.tab.res : {};
  var BASE = DS.tab ? (function (p) { return Date.UTC(+p[0], +p[1] - 1, +p[2]); })(DS.tab.d0.split('-')) : 0;
  function dayISO(d) { return new Date(BASE + d * 864e5).toISOString().slice(0, 10); }
  function isoDay(s) { var p = s.split('-'); return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - BASE) / 864e5); }
  function dm(d) { var s = dayISO(d); return s.slice(8, 10) + '/' + s.slice(5, 7); }
  var NM = {}; TEAMS.forEach(function (t) { NM[t.s] = t.n; });
  /* jogo a jogo: GB[sigla][rodada] = { row, home } */
  var GAMES = DS.g ? DS.g.rows : [], GB = {};
  TEAMS.forEach(function (t) { GB[t.s] = {}; });
  GAMES.forEach(function (g) { GB[TEAMS[g[2]].s][g[0]] = { row: g, home: true }; GB[TEAMS[g[3]].s][g[0]] = { row: g, home: false }; });
  var DMIN = 1e9, DMAX = -1e9; GAMES.forEach(function (g) { DMIN = Math.min(DMIN, g[1]); DMAX = Math.max(DMAX, g[1]); });

  /* bolinhas: padrão aproximado do uniforme (só enfeite, não são escudos) */
  var K = '#111111', W = '#FFFFFF';
  function alt(a, b, n) { var r = []; for (var i = 0; i < n; i++) r.push([i % 2 ? b : a, 1]); return r; }
  var TC = {
    FLA: ['h', alt('#D4001A', K, 6)], PAL: ['h', [['#006437', 1]]], CRU: ['h', [['#0033A0', 1]]],
    COR: ['h', [[W, 3], [K, 1]]], BAH: ['v', [['#0057B8', 1], [W, 1], ['#E4002B', 1]]],
    CEA: ['v', [[W, 3], [K, 1], [W, 3], [K, 1], [W, 3]]], FLU: ['v', [['#7B1E3A', 3], [W, 1], ['#006A4E', 3], [W, 1], ['#7B1E3A', 3], [W, 1], ['#006A4E', 3]]],
    SAO: ['h', [[W, 3], ['#E4002B', 1], [K, 1], [W, 3]]], CAM: ['v', alt(K, W, 5)],
    FOR: ['h', [['#00539F', 1], [W, 1], ['#D2232A', 1], ['#00539F', 1], [W, 1], ['#D2232A', 1]]],
    GRE: ['v', [['#0D80BF', 2], [K, 1], [W, 1], ['#0D80BF', 2], [K, 1], [W, 1]]], INT: ['h', [['#E5050F', 1]]],
    VAS: ['d', [[W, 2], [K, 1], [W, 2]]], VIT: ['v', alt('#D4001A', K, 6)], SAN: ['h', [[W, 1]]],
    BOT: ['v', [[K, 3], [W, 1], [K, 3], [W, 1], [K, 3]]], SPO: ['v', alt('#D4001A', K, 6), '#F2C200'], JUV: ['v', alt('#006437', W, 6)],
    MIR: ['h', [['#FCDD09', 2], ['#00A859', 1]]], RBB: ['h', [[W, 3], ['#D4001A', 1]]]
  };
  function dot(s) {
    var sp = TC[s] || ['h', [['#999999', 1]]], tot = 0, acc = 0, st = [];
    sp[1].forEach(function (p) { tot += p[1]; });
    sp[1].forEach(function (p) { var a0 = acc / tot * 100; acc += p[1]; st.push(p[0] + ' ' + a0.toFixed(2) + '% ' + (acc / tot * 100).toFixed(2) + '%'); });
    var d = mk('span', 'tdot'); d.style.background = 'linear-gradient(' + (sp[0] === 'h' ? 'to bottom' : sp[0] === 'v' ? 'to right' : '135deg') + ',' + st.join(',') + ')';
    if (sp[2]) d.style.background = 'linear-gradient(to bottom,transparent 0 24%,' + sp[2] + ' 24% 36%,transparent 36%),' + d.style.background;
    d.setAttribute('aria-hidden', 'true'); return d;
  }

  /* lo..hi = intervalo de rodadas; cut = dia limite (opcional); mando = todos|casa|fora */
  function standings(lo, hi, mando, cut) {
    var rows = TEAMS.map(function (t) {
      var w = 0, e = 0, d = 0, gp = 0, gc = 0;
      for (var i = lo - 1; i < hi; i++) {
        var r = RES[t.s][i];
        if (cut != null && r[4] > cut) continue;
        if (mando === 'casa' && r[0] !== 1) continue;
        if (mando === 'fora' && r[0] !== 0) continue;
        gp += r[1]; gc += r[2];
        if (r[1] > r[2]) w++; else if (r[1] === r[2]) e++; else d++;
      }
      var j = w + e + d, pts = 3 * w + e;
      return { s: t.s, n: t.n, pts: pts, j: j, v: w, e: e, d: d, gp: gp, gc: gc, sg: gp - gc, ap: j ? pts / (3 * j) * 100 : null };
    });
    // desempate: pontos, vitórias, saldo, gols pró, nome
    rows.sort(function (a, b) { return b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp || a.n.localeCompare(b.n, 'pt'); });
    return rows;
  }
  function gameTitle(sg, r, rod) {
    var me = NM[sg], op = TEAMS[r[3]].n;
    return 'R' + rod + ' · ' + dm(r[4]) + ' · ' + (r[0] ? me + ' ' + r[1] + ' x ' + r[2] + ' ' + op : op + ' ' + r[2] + ' x ' + r[1] + ' ' + me);
  }
  /* últimos 5 jogos até a rodada hi (ou até o dia cut), sem filtro de turno/mando */
  function form(sg, hi, cut) {
    var g = [];
    for (var i = 0; i < 38; i++) { var r = RES[sg][i]; if (cut != null ? r[4] <= cut : i + 1 <= hi) g.push({ i: i, r: r }); }
    g.sort(function (a, b) { return cut != null ? a.r[4] - b.r[4] : a.i - b.i; });
    return g.slice(-5);
  }
  function formCell(sg, hi, cut) {
    var td = mk('td'), box = mk('span', 'form'), g = form(sg, hi, cut);
    for (var k = 0; k < 5; k++) {
      var x = g[k - (5 - g.length)];
      if (!x) { box.appendChild(mk('i', 'fd n')); continue; }
      var c = x.r[1] > x.r[2] ? 'w' : x.r[1] === x.r[2] ? 'e' : 'l', i = mk('i', 'fd ' + c);
      i.title = gameTitle(sg, x.r, x.i + 1) + (c === 'w' ? ' (vitória)' : c === 'e' ? ' (empate)' : ' (derrota)');
      box.appendChild(i);
    }
    td.appendChild(box); return td;
  }

  var stTable = document.getElementById('st-table');
  if (stTable && TEAMS.length) (function () {
    var S = { turno: 'todos', hi: 38, mando: 'todos', date: null };
    var sel = document.getElementById('st-rod'), body = stTable.querySelector('tbody'), zleg = document.getElementById('st-zleg');
    var dIn = document.getElementById('st-date'), dX = document.getElementById('st-date-x');
    var minD = 1e9, maxD = -1e9;
    TEAMS.forEach(function (t) { RES[t.s].forEach(function (r) { minD = Math.min(minD, r[4]); maxD = Math.max(maxD, r[4]); }); });
    dIn.min = dayISO(minD); dIn.max = dayISO(maxD);
    function range() { return S.turno === '2' ? [20, 38] : S.turno === '1' ? [1, 19] : [1, 38]; }
    function fillRod() {
      var r = range(); sel.textContent = '';
      if (S.date != null) { var o0 = mk('option', null, 'Por data'); o0.value = ''; sel.appendChild(o0); }
      for (var i = r[0]; i <= r[1]; i++) { var o = mk('option', null, 'Rodada ' + i); o.value = i; sel.appendChild(o); }
      if (S.hi < r[0] || S.hi > r[1]) S.hi = r[1];
      sel.value = S.date != null ? '' : S.hi;
    }
    function td(cls, txt) { return mk('td', cls, txt); }
    function g1(n) { return n + (n === 1 ? ' gol' : ' gols'); }
    function none(ol) { ol.appendChild(mk('li', 'empty', 'Ainda sem jogos')); }
    function put(id, arr, key) {
      var ol = document.getElementById(id); if (!ol) return; ol.textContent = '';
      if (!arr.length) return none(ol);
      arr.forEach(function (x, i) {
        var li = mk('li'); li.appendChild(mk('span', 'rk', String(i + 1))); li.appendChild(dot(x.s)); li.appendChild(mk('b', null, x.n));
        li.appendChild(mk('span', 'm', g1(x[key]) + ' · ' + F.d2(x[key] / x.j) + ' p/j')); ol.appendChild(li);
      });
    }
    function venue(id, src) {
      var ol = document.getElementById(id); if (!ol) return; ol.textContent = '';
      var nm = function (a, b) { return a.n.localeCompare(b.n, 'pt'); };
      var arr = src.filter(function (x) { return x.j > 0; }).sort(function (a, b) { return b.ap - a.ap || b.pts - a.pts || b.v - a.v || b.sg - a.sg || b.gp - a.gp || nm(a, b); }).slice(0, 3);
      if (!arr.length) return none(ol);
      arr.forEach(function (x, i) {
        var li = mk('li'); li.appendChild(mk('span', 'rk', String(i + 1))); li.appendChild(dot(x.s)); li.appendChild(mk('b', null, x.n));
        li.appendChild(mk('span', 'm ap', F.pct(x.ap)));
        li.appendChild(mk('span', 'm2', x.v + (x.v === 1 ? ' vit' : ' vit') + ' · ' + x.gp + ' GP · ' + x.gc + ' GC'));
        ol.appendChild(li);
      });
    }
    /* ataque e defesa seguem todos os filtros (rows já filtradas) */
    function lists(rows) {
      var pl = rows.filter(function (x) { return x.j > 0; }), nm = function (a, b) { return a.n.localeCompare(b.n, 'pt'); };
      put('st-atk', pl.slice().sort(function (a, b) { return b.gp - a.gp || b.gp / b.j - a.gp / a.j || a.gc - b.gc || nm(a, b); }).slice(0, 3), 'gp');
      put('st-def', pl.slice().sort(function (a, b) { return a.gc - b.gc || a.gc / a.j - b.gc / b.j || b.gp - a.gp || nm(a, b); }).slice(0, 3), 'gc');
    }
    /* destaques: seguem a rodada/data; mandante, visitante e turnos ignoram turno/mando da tabela */
    function highlights(hi, cut) {
      venue('hl-home', standings(1, hi, 'casa', cut)); venue('hl-away', standings(1, hi, 'fora', cut));
      venue('hl-t1', standings(1, Math.min(hi, 19), 'todos', cut));
      venue('hl-t2', hi >= 20 ? standings(20, hi, 'todos', cut) : []);
    }
    function render() {
      var r = range(), hi = S.date != null ? r[1] : S.hi, cut = S.date, rows = standings(r[0], hi, S.mando, cut), zones = S.mando === 'todos';
      body.textContent = '';
      rows.forEach(function (x, i) {
        var tr = mk('tr', zones ? (i < 4 ? 'g4' : i >= 16 ? 'z4' : '') : '');
        var c0 = mk('td'); c0.appendChild(mk('span', 'pos', String(i + 1))); c0.appendChild(dot(x.s)); c0.appendChild(document.createTextNode(x.n)); tr.appendChild(c0);
        tr.appendChild(td('p', x.pts)); tr.appendChild(td('', x.j)); tr.appendChild(td('', x.v)); tr.appendChild(td('', x.e)); tr.appendChild(td('', x.d));
        tr.appendChild(td('', x.gp)); tr.appendChild(td('', x.gc));
        tr.appendChild(td(x.sg > 0 ? 'sgp' : x.sg < 0 ? 'sgn' : '', (x.sg > 0 ? '+' : '') + x.sg));
        tr.appendChild(td('', x.ap == null ? '—' : F.pct(x.ap)));
        tr.appendChild(formCell(x.s, S.hi, cut));
        body.appendChild(tr);
      });
      zleg.querySelectorAll('span:not(.fleg)').forEach(function (s) { s.hidden = !zones; });
      lists(rows); highlights(S.date != null ? 38 : S.hi, cut);
    }
    document.querySelectorAll('[data-seg]').forEach(function (g) {
      var key = g.getAttribute('data-seg');
      g.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', b.classList.contains('on'));
        b.addEventListener('click', function () {
          g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
          S[key] = b.getAttribute('data-v');
          if (key === 'turno') { var r = range(); S.hi = r[1]; fillRod(); }
          render();
        });
      });
    });
    sel.addEventListener('change', function () {
      if (sel.value === '') return;
      S.date = null; dIn.value = ''; dX.hidden = true; S.hi = parseInt(sel.value, 10); fillRod(); render();
    });
    dIn.addEventListener('change', function () {
      if (!dIn.value) { dX.click(); return; }
      S.date = Math.max(minD - 1, Math.min(maxD, isoDay(dIn.value))); dX.hidden = false; fillRod(); render();
    });
    dX.addEventListener('click', function () { S.date = null; dIn.value = ''; dX.hidden = true; S.hi = range()[1]; fillRod(); render(); });
    fillRod(); render();
  })();

  /* ---------- Top 10 clubes (início) ---------- */
  document.querySelectorAll('[data-rank]').forEach(function (box) {
    var k = box.getAttribute('data-rank'), fm = { publico: F.int, renda: F.brlc, ocupacao: F.pct, ticket: F.brl }[k];
    if (!fm || !DS.clubes) return;
    var rows = DS.clubes.slice().sort(function (a, b) { return b[k] - a[k] || a.nome.localeCompare(b.nome, 'pt'); }).slice(0, 10), mx = rows[0][k];
    var ol = box.querySelector('ol'); ol.textContent = '';
    rows.forEach(function (r, i) {
      var li = mk('li'); li.appendChild(mk('span', 'rk', String(i + 1)));
      li.appendChild(dot(r.s));
      var nm = mk('b', null, r.nome); li.appendChild(nm);
      var v = mk('span', 'm', fm(r[k])); if (k === 'renda') v.title = F.brlfull(r[k]); li.appendChild(v);
      var bar = mk('i', 'bar'); bar.style.width = (r[k] / mx * 100).toFixed(1) + '%'; li.appendChild(bar);
      ol.appendChild(li);
    });
  });

  /* =====================  EVOLUÇÃO DE POSIÇÃO  ===================== */
  function evoChart(host, series, o) {
    var W = Math.max(host.clientWidth, 280), H = W < 480 ? 320 : 380, m = { l: 38, r: 16, t: 14, b: 32 };
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.aria }, host);
    var pw = W - m.l - m.r, ph = H - m.t - m.b, N = 38;
    var sx = function (i) { return m.l + (i / (N - 1)) * pw; };
    var sy = function (p) { return m.t + (p - 0.5) / 20 * ph; };
    el('rect', { x: m.l, y: sy(0.5), width: pw, height: sy(4.5) - sy(0.5), fill: C.zg4, 'fill-opacity': .1 }, svg);
    el('rect', { x: m.l, y: sy(16.5), width: pw, height: sy(20.5) - sy(16.5), fill: C.zz4, 'fill-opacity': .12 }, svg);
    [1, 5, 10, 15, 20].forEach(function (p) {
      el('line', { x1: m.l, x2: W - m.r, y1: sy(p), y2: sy(p), stroke: C.grid, 'stroke-width': 1 }, svg);
      text(svg, m.l - 8, sy(p), p + 'º', { anchor: 'end', size: 10.5, base: 'central' });
    });
    [1, 5, 10, 15, 20, 25, 30, 35, 38].forEach(function (r) { text(svg, sx(r - 1), H - 10, String(r), { anchor: 'middle', size: 10.5 }); });
    series.slice().reverse().forEach(function (s) {
      var pts = s.pos.map(function (p, i) { return sx(i) + ',' + sy(p); });
      el('path', { d: 'M' + pts.join('L'), fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      el('circle', { cx: sx(N - 1), cy: sy(s.pos[N - 1]), r: 4.5, fill: s.color, stroke: C.surface, 'stroke-width': 2 }, svg);
    });
    var cross = el('line', { y1: m.t, y2: m.t + ph, stroke: C.muted, 'stroke-width': 1, opacity: 0 }, svg);
    var dots = series.map(function (s) { return el('circle', { r: 5, fill: s.color, stroke: C.surface, 'stroke-width': 2, opacity: 0 }, svg); });
    var hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0, 'aria-label': o.aria + ' Use as setas para percorrer as rodadas.' }, svg);
    var idx = N - 1;
    function at(i) {
      i = Math.max(0, Math.min(N - 1, i)); idx = i;
      cross.setAttribute('x1', sx(i)); cross.setAttribute('x2', sx(i)); cross.setAttribute('opacity', 1);
      series.forEach(function (s, k) { dots[k].setAttribute('cx', sx(i)); dots[k].setAttribute('cy', sy(s.pos[i])); dots[k].setAttribute('opacity', 1); });
      o.onIdx(i);
      return series.map(function (s) { return { color: s.color, text: s.name + ': ' + s.pos[i] + 'º · ' + s.pts[i] + ' pts' }; });
    }
    function off() { cross.setAttribute('opacity', 0); dots.forEach(function (d) { d.setAttribute('opacity', 0); }); hideTip(); o.onIdx(N - 1); }
    hit.addEventListener('pointermove', function (ev) {
      var r = svg.getBoundingClientRect(), rows = at(Math.round(((ev.clientX - r.left - m.l) / pw) * (N - 1)));
      showTipRows(ev.clientX, ev.clientY, 'Rodada ' + (idx + 1), rows);
    });
    hit.addEventListener('pointerleave', off);
    hit.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault(); var rows = at(idx + (ev.key === 'ArrowRight' ? 1 : -1));
        var r = svg.getBoundingClientRect(); showTipRows(r.left + sx(idx), r.top + sy(series[0].pos[idx]), 'Rodada ' + (idx + 1), rows);
      }
    });
    hit.addEventListener('focus', function () { var rows = at(idx); var r = svg.getBoundingClientRect(); showTipRows(r.left + sx(idx), r.top + sy(series[0].pos[idx]), 'Rodada ' + (idx + 1), rows); });
    hit.addEventListener('blur', off);
  }

  var evoCard = document.getElementById('evo');
  if (evoCard && TEAMS.length) (function () {
    var POS = {}, PTS = {}, ROW = [];
    TEAMS.forEach(function (t) { POS[t.s] = []; PTS[t.s] = []; });
    for (var r = 1; r <= 38; r++) { var st = standings(1, r, 'todos'); ROW.push(st); st.forEach(function (x, i) { POS[x.s].push(i + 1); PTS[x.s].push(x.pts); }); }
    var selA = document.getElementById('evo-a'), selB = document.getElementById('evo-b'), leg = document.getElementById('evo-leg'), cmp = document.getElementById('evo-cmp');
    var host = evoCard.querySelector('.plot'), tblHost = evoCard.querySelector('.tbl-wrap'), btn = evoCard.querySelector('[data-toggle]');
    var byName = TEAMS.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'pt'); });
    byName.forEach(function (t) { var a = mk('option', null, t.n); a.value = t.s; selA.appendChild(a); var b = mk('option', null, t.n); b.value = t.s; selB.appendChild(b); });
    var none = mk('option', null, '— nenhum —'); none.value = ''; selB.insertBefore(none, selB.firstChild);
    selA.value = 'FLA'; selB.value = 'PAL';
    var prevA = selA.value, prevB = selB.value, shown = -1;
    function series() {
      var s = [{ id: selA.value, color: C.green }];
      if (selB.value) s.push({ id: selB.value, color: C.blue });
      return s.map(function (x) { return { id: x.id, name: NM[x.id], color: x.color, pos: POS[x.id], pts: PTS[x.id] }; });
    }
    function legend(i, ser) {
      leg.textContent = '';
      ser.forEach(function (s) {
        var sp = mk('span'), sw = mk('i'); sw.style.background = s.color; sp.appendChild(sw);
        sp.appendChild(dot(s.id)); sp.appendChild(document.createTextNode(s.name + ' '));
        sp.appendChild(mk('em', null, s.pos[i] + 'º · ' + s.pts[i] + ' pts (rodada ' + (i + 1) + ')'));
        leg.appendChild(sp);
      });
    }
    function table(ser) {
      tblHost.textContent = '';
      var rows = []; for (var i = 0; i < 38; i++) rows.push([i + 1].concat(ser.map(function (s) { return s.pos[i] + 'º (' + s.pts[i] + ' pts)'; })));
      tblHost.appendChild(tableOf({ cols: ['Rodada'].concat(ser.map(function (s) { return s.name; })), rows: rows }));
    }
    /* comparação: dados dos dois times e confrontos diretos até a rodada i+1 */
    function compare(i, ser) {
      cmp.parentNode.classList.toggle('solo', ser.length < 2);
      if (ser.length < 2) { cmp.hidden = true; cmp.textContent = ''; return; }
      cmp.hidden = false; cmp.textContent = '';
      var A = ser[0], B = ser[1], rows = ROW[i];
      cmp.appendChild(mk('h3', 'bt', 'Comparação após a rodada ' + (i + 1)));
      var t = mk('table', 'lt'), th = mk('thead'), trh = mk('tr');
      ['Time', 'P', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', '%'].forEach(function (c) { trh.appendChild(mk('th', null, c)); });
      th.appendChild(trh); t.appendChild(th); var tb = mk('tbody');
      [A, B].forEach(function (s, n) {
        var pos = POS[s.id][i], x = rows[pos - 1], tr = mk('tr', n ? 'mb' : 'ma'), c0 = mk('td');
        c0.appendChild(mk('span', 'pos', pos + 'º')); c0.appendChild(dot(s.id)); c0.appendChild(document.createTextNode(s.name)); tr.appendChild(c0);
        [x.pts, x.j, x.v, x.e, x.d, x.gp, x.gc, (x.sg > 0 ? '+' : '') + x.sg, F.pct(x.ap)].forEach(function (v, k) { tr.appendChild(mk('td', k === 0 ? 'p' : '', String(v))); });
        tb.appendChild(tr);
      });
      t.appendChild(tb); var box = mk('div', 'tbl-box'), sc = mk('div', 'tbl-scroll'); sc.appendChild(t); box.appendChild(sc); cmp.appendChild(box);
      // confrontos diretos
      var g = [], wa = 0, we = 0, wb = 0, ga = 0, gb = 0, oi = -1;
      TEAMS.forEach(function (tt, k) { if (tt.s === B.id) oi = k; });
      for (var k = 0; k <= i; k++) {
        var r = RES[A.id][k];
        if (r[3] === oi) { g.push({ rod: k + 1, r: r }); ga += r[1]; gb += r[2]; if (r[1] > r[2]) wa++; else if (r[1] === r[2]) we++; else wb++; }
      }
      g.sort(function (x, y) { return x.r[4] - y.r[4]; });
      cmp.appendChild(mk('h3', 'bt h2', 'Confrontos diretos'));
      if (!g.length) { cmp.appendChild(mk('p', 'note', 'Ainda não se enfrentaram até a rodada ' + (i + 1) + '.')); return; }
      var pa = 3 * wa + we, pb = 3 * wb + we, tot = 3 * g.length, lost = tot - pa - pb;
      function pl(n, w) { return n + ' ' + (n === 1 ? w : w + 's'); }
      var h2 = mk('div', 'duo');
      function head(s, cls) { var c = mk('div', 'duo-h ' + cls); c.appendChild(dot(s.id)); c.appendChild(mk('b', null, s.name)); return c; }
      h2.appendChild(head(A, 'l')); h2.appendChild(mk('div', 'duo-m', pl(g.length, 'jogo'))); h2.appendChild(head(B, 'r'));
      [['Pontos', pa, pb, 1], ['Vitórias', wa, wb], ['Gols', ga, gb]].forEach(function (x) {
        var va = mk('div', 'duo-v l' + (x[1] > x[2] ? ' win' : '')), vb = mk('div', 'duo-v r' + (x[2] > x[1] ? ' win' : ''));
        va.textContent = x[1]; vb.textContent = x[2];
        if (x[1] > x[2]) va.style.setProperty('--c', A.color); if (x[2] > x[1]) vb.style.setProperty('--c', B.color);
        h2.appendChild(va); h2.appendChild(mk('div', 'duo-k', x[0])); h2.appendChild(vb);
      });
      h2.appendChild(mk('div', 'duo-v l mid', '')); h2.appendChild(mk('div', 'duo-k wide', pl(we, 'empate'))); h2.appendChild(mk('div', 'duo-v r mid', ''));
      cmp.appendChild(h2);
      // cabo de guerra: pontos de A, pontos de B e pontos que ninguém levou
      var tow = mk('div', 'tow'), bar = mk('div', 'tow-bar'); bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', A.name + ' ' + pa + ' pontos, ' + B.name + ' ' + pb + ' pontos, ' + lost + ' sem dono, de ' + tot + ' em disputa');
      [[pa, A.color, 'a', A.name], [lost, '', 'x', 'Pontos perdidos'], [pb, B.color, 'b', B.name]].forEach(function (s) {
        if (!s[0]) return; var sp = mk('span', s[2], String(s[0])); sp.style.flexGrow = s[0]; if (s[1]) sp.style.background = s[1]; sp.title = s[3] + ': ' + s[0]; bar.appendChild(sp);
      });
      tow.appendChild(bar);
      var lg2 = mk('div', 'tow-leg');
      [[A.color, A.name + ' · ' + pl(pa, 'ponto')], ['', 'Perdidos (ninguém levou) · ' + lost], [B.color, B.name + ' · ' + pl(pb, 'ponto')]].forEach(function (s) {
        var it = mk('span'), sw = mk('i'); if (s[0]) sw.style.background = s[0]; else sw.className = 'x'; it.appendChild(sw); it.appendChild(document.createTextNode(s[1])); lg2.appendChild(it);
      });
      tow.appendChild(lg2); tow.appendChild(mk('div', 'tow-sub', tot + ' pontos em disputa'));
      cmp.appendChild(tow);
      var ul = mk('ul', 'h2h');
      g.forEach(function (x) {
        var home = x.r[0] ? A : B, away = x.r[0] ? B : A, hg = x.r[0] ? x.r[1] : x.r[2], ag = x.r[0] ? x.r[2] : x.r[1];
        var win = x.r[1] > x.r[2] ? 'a' : x.r[1] === x.r[2] ? 'e' : 'b', li = mk('li');
        li.appendChild(mk('span', 'gm', 'R' + x.rod + ' · ' + dm(x.r[4])));
        var m = mk('span', 'gt'); m.appendChild(mk('span', 'tn' + (hg > ag ? ' w' : ''), home.name)); m.appendChild(mk('span', 'sc', hg + ' x ' + ag)); m.appendChild(mk('span', 'tn' + (ag > hg ? ' w' : ''), away.name)); li.appendChild(m);
        var chip = mk('span', 'chip ' + win, win === 'e' ? 'Empate' : (win === 'a' ? A.name : B.name) + ' venceu'); if (win !== 'e') chip.style.setProperty('--c', win === 'a' ? A.color : B.color); li.appendChild(chip);
        ul.appendChild(li);
      });
      cmp.appendChild(ul);
    }
    function draw() {
      var ser = series(); hideTip(); host.textContent = ''; shown = -1;
      var aria = 'Posição na classificação por rodada: ' + ser.map(function (s) { return s.name; }).join(' e ') + '.';
      evoChart(host, ser, { aria: aria, onIdx: function (i) { legend(i, ser); if (i !== shown) { shown = i; compare(i, ser); } } });
      legend(37, ser); compare(37, ser); shown = 37; table(ser); marks();
    }
    selA.addEventListener('change', function () { if (selA.value === selB.value) selB.value = prevA; prevA = selA.value; prevB = selB.value; draw(); });
    selB.addEventListener('change', function () { if (selB.value && selB.value === selA.value) selB.value = prevB; prevB = selB.value; draw(); });
    btn.addEventListener('click', function () {
      var showT = tblHost.hidden; tblHost.hidden = !showT; host.hidden = showT; btn.textContent = showT ? 'Gráfico' : 'Tabela'; if (!showT) draw();
    });
    if ('ResizeObserver' in window) {
      var lastW = host.clientWidth;
      new ResizeObserver(function () { if (!host.hidden && Math.abs(host.clientWidth - lastW) > 4) { lastW = host.clientWidth; draw(); } }).observe(host);
    }

    /* líder de cada rodada: 38 bolinhas, 19 por linha */
    var lead = document.getElementById('lead');
    if (lead) {
      var LS = ROW.map(function (rw) { return rw[0].s; }), cnt = {};
      LS.forEach(function (s) { cnt[s] = (cnt[s] || 0) + 1; });
      [[0, 'turno 1'], [19, 'turno 2']].forEach(function (rg, k) {
        var row = lead.querySelector('[data-lrow="' + k + '"]'); row.textContent = '';
        for (var q = rg[0]; q < rg[0] + 19; q++) {
          var c = mk('div', 'lc'), d = dot(LS[q]); c.setAttribute('data-s', LS[q]); c.tabIndex = 0;
          var ttl = 'Rodada ' + (q + 1) + ' · Líder: ' + NM[LS[q]] + ' (' + ROW[q][0].pts + ' pts)';
          c.title = ttl; c.setAttribute('aria-label', ttl);
          c.appendChild(mk('small', null, String(q + 1))); c.appendChild(d); row.appendChild(c);
        }
      });
      var lg = lead.querySelector('.llegend'); lg.textContent = '';
      Object.keys(cnt).sort(function (x, y) { return cnt[y] - cnt[x] || NM[x].localeCompare(NM[y], 'pt'); }).forEach(function (s) {
        var it = mk('span', 'li2'); it.tabIndex = 0; it.setAttribute('data-s', s); it.appendChild(dot(s)); it.appendChild(document.createTextNode(NM[s] + ' '));
        it.appendChild(mk('em', null, cnt[s] + (cnt[s] === 1 ? ' rodada' : ' rodadas')));
        function on() { lead.setAttribute('data-hl', s); lead.querySelectorAll('.lc').forEach(function (c) { c.classList.toggle('hl', c.getAttribute('data-s') === s); }); }
        function off() { lead.removeAttribute('data-hl'); lead.querySelectorAll('.lc.hl').forEach(function (c) { c.classList.remove('hl'); }); }
        it.addEventListener('mouseenter', on); it.addEventListener('focus', on); it.addEventListener('mouseleave', off); it.addEventListener('blur', off);
        lg.appendChild(it);
      });
    }

    /* rodadas na liderança, G4 e Z4 (todos os times) */
    var fx = document.getElementById('faixas'), fxB = fx ? fx.querySelector('tbody') : null, fxTh = fx ? fx.querySelectorAll('th') : [];
    var COUNT = TEAMS.map(function (t) {
      var p = POS[t.s]; return { s: t.s, n: t.n, lider: p.filter(function (x) { return x === 1; }).length, g4: p.filter(function (x) { return x <= 4; }).length, z4: p.filter(function (x) { return x >= 17; }).length };
    });
    var fk = 'lider', fasc = false, KEYS = ['n', 'lider', 'g4', 'z4'];
    function fxRender() {
      if (!fxB) return;
      var rows = COUNT.slice().sort(function (a, b) {
        if (fk === 'n') return fasc ? a.n.localeCompare(b.n, 'pt') : b.n.localeCompare(a.n, 'pt');
        var d = fasc ? a[fk] - b[fk] : b[fk] - a[fk];
        return d || b.lider - a.lider || b.g4 - a.g4 || a.z4 - b.z4 || a.n.localeCompare(b.n, 'pt');
      });
      fxB.textContent = '';
      rows.forEach(function (x) {
        var tr = mk('tr'); tr.setAttribute('data-s', x.s); var c0 = mk('td'); c0.appendChild(dot(x.s)); c0.appendChild(document.createTextNode(x.n)); tr.appendChild(c0);
        ['lider', 'g4', 'z4'].forEach(function (k) { tr.appendChild(mk('td', (fk === k ? 'hl ' : '') + (x[k] === 0 ? 'zero' : ''), String(x[k]))); });
        fxB.appendChild(tr);
      });
      fxTh.forEach(function (th, i) { th.classList.toggle('s', KEYS[i] === fk); th.classList.toggle('asc', KEYS[i] === fk && fasc); });
      marks();
    }
    function marks() {
      if (!fxB) return;
      fxB.querySelectorAll('tr').forEach(function (tr) {
        var s = tr.getAttribute('data-s'); tr.classList.toggle('ma', s === selA.value); tr.classList.toggle('mb', !!selB.value && s === selB.value);
      });
    }
    fxTh.forEach(function (th, i) { th.tabIndex = 0; th.addEventListener('click', function () { if (fk === KEYS[i]) fasc = !fasc; else { fk = KEYS[i]; fasc = i === 0; } fxRender(); }); });
    draw(); fxRender();
  })();

  /* =====================  STATS · TABELAS DETALHADAS  ===================== */
  /* tabela ordenável: cols = [{h, t(título), v(linha)->valor, f(valor)->texto, s: 'text'|undefined}] */
  function xtable(host, cols, defKey, defAsc) {
    var thead = host.querySelector('thead'), tbody = host.querySelector('tbody'), sk = defKey, asc = !!defAsc, rows = [];
    thead.textContent = ''; var trh = mk('tr');
    cols.forEach(function (c, i) {
      var th = mk('th', null, c.h); if (c.t) th.title = c.t; th.tabIndex = 0; th.setAttribute('role', 'button'); if (!c.s) th.setAttribute('data-num', '1'); else th.style.textAlign = 'left';
      function go() { if (sk === i) asc = !asc; else { sk = i; asc = !!c.s; } draw(); }
      th.addEventListener('click', go); th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    function draw() {
      var data = rows.slice(), c = cols[sk];
      data.sort(function (x, y) {
        var p = c.v(x), q = c.v(y);
        if (p == null) p = -Infinity; if (q == null) q = -Infinity;
        var d = typeof p === 'string' ? p.localeCompare(q, 'pt') : p - q;
        return (asc ? d : -d) || x._i - y._i;
      });
      tbody.textContent = '';
      data.forEach(function (r) {
        var tr = mk('tr');
        cols.forEach(function (cc, i) {
          var v = cc.v(r), td = mk('td', i === sk ? 'hl' : ''); if (cc.s) td.style.textAlign = 'left';
          if (cc.cell) cc.cell(td, r); else td.textContent = v == null ? '—' : (cc.f ? cc.f(v) : String(v));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      thead.querySelectorAll('th').forEach(function (th, i) { th.classList.toggle('s', i === sk); th.classList.toggle('asc', i === sk && asc); th.setAttribute('aria-sort', i === sk ? (asc ? 'ascending' : 'descending') : 'none'); });
    }
    return { set: function (r) { rows = r; rows.forEach(function (x, i) { x._i = i; }); draw(); } };
  }
  function teamCell(td, r) { td.appendChild(dot(r.s)); td.appendChild(document.createTextNode(r.n)); }
  function wireSeg(root, attr, S, onChange) {
    root.querySelectorAll('[' + attr + ']').forEach(function (g) {
      var key = g.getAttribute(attr);
      g.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', b.classList.contains('on'));
        b.addEventListener('click', function () {
          g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
          S[key] = b.getAttribute('data-v'); onChange(key);
        });
      });
    });
  }
  function trange(t) { return t === '2' ? [20, 38] : t === '1' ? [1, 19] : [1, 38]; }
  function rate(n, d) { return d ? n / d : null; }

  /* 0) painel geral do campeonato */
  var ovRoot = document.getElementById('ov');
  if (ovRoot && TEAMS.length && DS.g) (function () {
    var hw = 0, dr = 0, aw = 0, gh = 0, ga = 0, n = 0, T = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    GAMES.forEach(function (g) { for (var q = 2; q < 10; q++) T[q] += g[16 + q] + g[26 + q]; T[1] += g[16] + g[26]; });
    TEAMS.forEach(function (t) {
      RES[t.s].forEach(function (r) { if (r[0] === 1) { n++; gh += r[1]; ga += r[2]; if (r[1] > r[2]) hw++; else if (r[1] === r[2]) dr++; else aw++; } });
    });
    var goals = gh + ga, ph = 3 * hw + dr, pa = 3 * aw + dr;
    function sec(title) { var h = mk('div', 'ov-h', title); ovRoot.appendChild(h); var g = mk('div', 'ov-grid'); ovRoot.appendChild(g); return g; }
    function card(g, label, val, sub) { var c = mk('div', 'ovc'); c.appendChild(mk('div', 'kl', label)); c.appendChild(mk('div', 'kv', val)); if (sub) c.appendChild(mk('div', 'ks', sub)); g.appendChild(c); }
    var g1 = sec('O campeonato');
    card(g1, 'Total de jogos', F.int(n)); card(g1, 'Total de gols', F.int(goals)); card(g1, 'Gols por rodada', F.d2(goals / 38), 'média das 38 rodadas'); card(g1, 'Gols por partida', F.d2(goals / n), 'somando os dois times');
    var g2 = sec('Por partida · somando os dois times');
    [['Finalizações', 2], ['Chutes a gol', 3], ['Escanteios', 5], ['Faltas', 6], ['Desarmes', 7], ['Cartões', 10], ['Cartões amarelos', 8], ['Cartões vermelhos', 9]].forEach(function (x) { card(g2, x[0], F.d2(T[x[1]] / n)); });
    var g3 = sec('Eficiência');
    card(g3, 'Precisão', F.pct(T[3] / T[2] * 100), 'chutes a gol ÷ finalizações'); card(g3, 'Conversão', F.pct(goals / T[2] * 100), 'gols ÷ finalizações');
    card(g3, 'Finalizações por gol', F.d2(T[2] / goals), 'para fazer um gol'); card(g3, 'Chutes a gol por gol', F.d2(T[3] / goals), 'para fazer um gol');
    /* mandante x visitante */
    var h = mk('div', 'ov-h', 'Mandante x visitante'); ovRoot.appendChild(h);
    var row = mk('div', 'mv'); ovRoot.appendChild(row);
    function box(title) { var b = mk('div', 'mvb'); b.appendChild(mk('div', 'flabel', title)); row.appendChild(b); return b; }
    function split(b, x, y, cx, cy) {
      var bar = mk('div', 'sbar'), s1 = mk('span'), s2 = mk('span'); s1.style.flexGrow = x; s2.style.flexGrow = y; s1.style.background = cx; s2.style.background = cy; bar.appendChild(s1); bar.appendChild(s2); b.appendChild(bar);
    }
    // rosca
    var d = box('Resultados dos jogos'), NSV = 'http://www.w3.org/2000/svg', R = 62, CI = 2 * Math.PI * R;
    var parts = [['Vitórias do mandante', hw, C.green], ['Empates', dr, '#A9AEC8'], ['Vitórias do visitante', aw, C.blue]];
    var svg = el('svg', { viewBox: '0 0 180 180', class: 'donut', role: 'img', 'aria-label': 'Vitórias do mandante, empates e vitórias do visitante' }, d), off = 0;
    parts.forEach(function (p) {
      var len = p[1] / n * CI; el('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: p[2], 'stroke-width': 26, 'stroke-dasharray': (len - 2) + ' ' + (CI - len + 2), 'stroke-dashoffset': -off, transform: 'rotate(-90 90 90)' }, svg).appendChild(el('title', {})).textContent = p[0] + ': ' + p[1];
      off += len;
    });
    var c1 = el('text', { x: 90, y: 88, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 800, fill: '#1B1F3B' }, svg); c1.textContent = n;
    var c2 = el('text', { x: 90, y: 107, 'text-anchor': 'middle', 'font-size': 11, fill: '#6B7088' }, svg); c2.textContent = 'jogos';
    var lg = mk('div', 'dleg'); parts.forEach(function (p) {
      var s = mk('div'), i = mk('i'); i.style.background = p[2]; s.appendChild(i); s.appendChild(mk('span', null, p[0])); s.appendChild(mk('b', null, p[1] + ' · ' + F.pct(p[1] / n * 100))); lg.appendChild(s);
    }); d.appendChild(lg);
    // pontos
    var p = box('Pontos do mandante x visitante');
    var pr = mk('div', 'duel'); pr.innerHTML = ''; [['Mandante', ph, C.green], ['Visitante', pa, C.blue]].forEach(function (x, k) {
      var s = mk('div', k ? 'r' : 'l'); s.appendChild(mk('div', 'lab', x[0])); s.appendChild(mk('div', 'big', F.int(x[1]))); s.appendChild(mk('div', 'pc', F.pct(x[1] / (ph + pa) * 100))); pr.appendChild(s);
    }); p.appendChild(pr); split(p, ph, pa, C.green, C.blue);
    p.appendChild(mk('div', 'sub', 'Mandante: ' + hw + ' vitórias × 3 + ' + dr + ' empates. Visitante: ' + aw + ' vitórias × 3 + ' + dr + ' empates.'));
    // gols
    var g = box('Gols do mandante x visitante');
    var gr = mk('div', 'duel'); [['Mandante', gh, C.green], ['Visitante', ga, C.blue]].forEach(function (x, k) {
      var s = mk('div', k ? 'r' : 'l'); s.appendChild(mk('div', 'lab', x[0])); s.appendChild(mk('div', 'big', F.int(x[1]))); s.appendChild(mk('div', 'pc', F.d2(x[1] / n) + ' por partida')); gr.appendChild(s);
    }); g.appendChild(gr); split(g, gh, ga, C.green, C.blue);
    g.appendChild(mk('div', 'sub', F.pct(gh / goals * 100) + ' dos gols saíram do mandante.'));
  })();

  /* 1) classificação completa (rodada, data, turno, mando) */
  var xsRoot = document.getElementById('xs');
  if (xsRoot && TEAMS.length) (function () {
    var S = { turno: 'todos', hi: 38, mando: 'todos', date: null };
    var sel = document.getElementById('xs-rod'), dIn = document.getElementById('xs-date'), dX = document.getElementById('xs-date-x');
    var minD = 1e9, maxD = -1e9;
    TEAMS.forEach(function (t) { RES[t.s].forEach(function (r) { minD = Math.min(minD, r[4]); maxD = Math.max(maxD, r[4]); }); });
    dIn.min = dayISO(minD); dIn.max = dayISO(maxD);
    var rg = function () { return trange(S.turno); };
    function fillRod() {
      var r = rg(); sel.textContent = '';
      if (S.date != null) { var o0 = mk('option', null, 'Por data'); o0.value = ''; sel.appendChild(o0); }
      for (var i = r[0]; i <= r[1]; i++) { var o = mk('option', null, 'Rodada ' + i); o.value = i; sel.appendChild(o); }
      if (S.hi < r[0] || S.hi > r[1]) S.hi = r[1];
      sel.value = S.date != null ? '' : S.hi;
    }
    var f2 = F.d2, P = function (v) { return F.pct(v * 100); };
    var tb = xtable(xsRoot.querySelector('table'), [
      { h: 'Pos', t: 'Posição', v: function (r) { return r.pos; }, cell: function (td, r) { td.textContent = r.pos; } },
      { h: 'Time', s: 1, v: function (r) { return r.n; }, cell: teamCell },
      { h: 'J', t: 'Jogos', v: function (r) { return r.j; } }, { h: 'PTS', t: 'Pontos', v: function (r) { return r.pts; } },
      { h: 'VIT', t: 'Vitórias', v: function (r) { return r.v; } }, { h: 'EMP', t: 'Empates', v: function (r) { return r.e; } }, { h: 'DER', t: 'Derrotas', v: function (r) { return r.d; } },
      { h: 'GP', t: 'Gols pró', v: function (r) { return r.gp; } }, { h: 'GC', t: 'Gols contra', v: function (r) { return r.gc; } },
      { h: 'SG', t: 'Saldo de gols', v: function (r) { return r.sg; } },
      { h: 'GP/J', t: 'Gols pró por jogo', v: function (r) { return rate(r.gp, r.j); }, f: f2 },
      { h: 'GC/J', t: 'Gols contra por jogo', v: function (r) { return rate(r.gc, r.j); }, f: f2 },
      { h: 'GT/J', t: 'Gols totais (pró + contra) por jogo', v: function (r) { return rate(r.gp + r.gc, r.j); }, f: f2 },
      { h: 'APV', t: 'Aproveitamento', v: function (r) { return r.ap == null ? null : r.ap / 100; }, f: P },
      { h: 'PTS/J', t: 'Pontos por jogo', v: function (r) { return rate(r.pts, r.j); }, f: f2 }
    ], 0, true);
    function render() {
      var r = rg(), rows = standings(r[0], S.date != null ? r[1] : S.hi, S.mando, S.date);
      rows.forEach(function (x, i) { x.pos = i + 1; }); tb.set(rows);
    }
    wireSeg(xsRoot, 'data-xseg', S, function (k) { if (k === 'turno') { S.hi = rg()[1]; fillRod(); } render(); });
    sel.addEventListener('change', function () { if (sel.value === '') return; S.date = null; dIn.value = ''; dX.hidden = true; S.hi = parseInt(sel.value, 10); fillRod(); render(); });
    dIn.addEventListener('change', function () { if (!dIn.value) { dX.click(); return; } S.date = Math.max(minD - 1, Math.min(maxD, isoDay(dIn.value))); dX.hidden = false; fillRod(); render(); });
    dX.addEventListener('click', function () { S.date = null; dIn.value = ''; dX.hidden = true; S.hi = rg()[1]; fillRod(); render(); });
    fillRod(); render();
  })();

  /* 2) desempenho em campo por time, em grupos (turno e mando) */
  var pfRoot = document.getElementById('pf');
  if (pfRoot && DS.g) (function () {
    var S = { turno: 'todos', mando: 'todos', grupo: 'ataque' }, fb;
    var f2 = F.d2, P = function (v) { return F.pct(v * 100); };
    var table = pfRoot.querySelector('table'), tb = null, rows = [];
    /* i: 2 FIN, 3 CHG, 5 ESC, 6 FAL, 7 DES, 8 CA, 9 CV, 10 CT; o=1 usa os números do adversário */
    function tot(i, lab, t, o) { return { h: lab, t: t, v: function (r) { return (o ? r.o : r.x)[i]; } }; }
    function pj(i, lab, t, o) { return { h: lab + '/J', t: t + ' por jogo', v: function (r) { return rate((o ? r.o : r.x)[i], r.j); }, f: f2 }; }
    var NAME = { h: 'Time', s: 1, v: function (r) { return r.n; }, cell: teamCell }, J = { h: 'J', t: 'Jogos', v: function (r) { return r.j; } };
    var GROUPS = {
      ataque: { def: 3, asc: false, cols: [NAME, J,
        { h: 'PB', t: 'Posse de bola média', v: function (r) { return rate(r.x[1], r.j); }, f: P },
        { h: 'GP', t: 'Gols pró', v: function (r) { return r.gp; } }, { h: 'GP/J', t: 'Gols pró por jogo', v: function (r) { return rate(r.gp, r.j); }, f: f2 },
        tot(2, 'FIN', 'Finalizações realizadas'), pj(2, 'FIN', 'Finalizações'), tot(3, 'CHG', 'Chutes a gol realizados'), pj(3, 'CHG', 'Chutes a gol'), tot(5, 'ESC', 'Escanteios'), pj(5, 'ESC', 'Escanteios'),
        { h: 'PREC', t: 'Precisão: chutes a gol ÷ finalizações', v: function (r) { return rate(r.x[3], r.x[2]); }, f: P },
        { h: 'CONV', t: 'Conversão: gols ÷ finalizações', v: function (r) { return rate(r.gp, r.x[2]); }, f: P },
        { h: 'FIN/G', t: 'Finalizações para fazer um gol', v: function (r) { return rate(r.x[2], r.gp); }, f: f2 },
        { h: 'CHG/G', t: 'Chutes a gol para fazer um gol', v: function (r) { return rate(r.x[3], r.gp); }, f: f2 }] },
      defesa: { def: 2, asc: true, cols: [NAME, J,
        { h: 'GC', t: 'Gols contra', v: function (r) { return r.gc; } }, { h: 'GC/J', t: 'Gols contra por jogo', v: function (r) { return rate(r.gc, r.j); }, f: f2 },
        tot(2, 'FIN', 'Finalizações cedidas', 1), pj(2, 'FIN', 'Finalizações cedidas', 1), tot(3, 'CHG', 'Chutes a gol cedidos', 1), pj(3, 'CHG', 'Chutes a gol cedidos', 1), tot(5, 'ESC', 'Escanteios cedidos', 1), pj(5, 'ESC', 'Escanteios cedidos', 1),
        { h: 'PREC', t: 'Precisão dos adversários: chutes a gol ÷ finalizações', v: function (r) { return rate(r.o[3], r.o[2]); }, f: P },
        { h: 'CONV', t: 'Conversão dos adversários: gols sofridos ÷ finalizações', v: function (r) { return rate(r.gc, r.o[2]); }, f: P },
        { h: 'FIN/G', t: 'Finalizações cedidas para sofrer um gol', v: function (r) { return rate(r.o[2], r.gc); }, f: f2 },
        { h: 'CHG/G', t: 'Chutes a gol cedidos para sofrer um gol', v: function (r) { return rate(r.o[3], r.gc); }, f: f2 }] },
      disciplina: { def: 2, asc: false, cols: [NAME, J,
        tot(6, 'FAL', 'Faltas cometidas'), pj(6, 'FAL', 'Faltas cometidas'), tot(7, 'DES', 'Desarmes'), pj(7, 'DES', 'Desarmes'),
        tot(10, 'CT', 'Cartões (total)'), pj(10, 'CT', 'Cartões'), tot(8, 'CA', 'Cartões amarelos'), pj(8, 'CA', 'Cartões amarelos'), tot(9, 'CV', 'Cartões vermelhos'), pj(9, 'CV', 'Cartões vermelhos'),
        { h: 'FAL/C', t: 'Faltas por cartão', v: function (r) { return rate(r.x[6], r.x[10]); }, f: f2 }] },
      adversarios: { def: 2, asc: false, cols: [NAME, J,
        tot(6, 'FAL', 'Faltas sofridas (cometidas pelos adversários)', 1), pj(6, 'FAL', 'Faltas sofridas', 1), tot(7, 'DES', 'Desarmes sofridos (feitos pelos adversários)', 1), pj(7, 'DES', 'Desarmes sofridos', 1),
        tot(10, 'CT', 'Cartões dos adversários', 1), pj(10, 'CT', 'Cartões dos adversários', 1), tot(8, 'CA', 'Cartões amarelos dos adversários', 1), pj(8, 'CA', 'Cartões amarelos dos adversários', 1), tot(9, 'CV', 'Cartões vermelhos dos adversários', 1), pj(9, 'CV', 'Cartões vermelhos dos adversários', 1)] }
    };
    function build() { var g = GROUPS[S.grupo]; tb = xtable(table, g.cols, g.def, g.asc); tb.set(rows); }
    function load() {
      rows = TEAMS.map(function (t) {
        var gl = gamesOf(t.s, S.turno, S.mando, fb.hi(), S.date), x = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], o = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], gp = 0, gc = 0;
        gl.forEach(function (g) {
          var h = GB[t.s][g.i + 1].home, w = g.row, a0 = h ? 16 : 26, b0 = h ? 26 : 16;
          for (var q = 0; q < 10; q++) { x[q + 1] += w[a0 + q]; o[q + 1] += w[b0 + q]; }
          gp += g.r[1]; gc += g.r[2];
        });
        x[0] = o[0] = gl.length; return { s: t.s, n: t.n, j: gl.length, x: x, o: o, gp: gp, gc: gc };
      });
    }
    fb = filterBar(pfRoot, S, function (k) { load(); if (k === 'grupo') build(); else tb.set(rows); });
    load(); build();
  })();

  /* 3) árbitros (rodada, data, turno, mando e mínimo de jogos) */
  var arRoot = document.getElementById('ar');
  if (arRoot && DS.g) (function () {
    var S = { turno: 'todos', mando: 'todos' }, f2 = F.d2, min = arRoot.querySelector('.f-min'), fb;
    function pj(k, lab, t) { return { h: lab + '/J', t: t + ' por jogo', v: function (r) { return rate(r[k], r.j); }, f: f2 }; }
    var tb = xtable(arRoot.querySelector('table'), [
      { h: 'Árbitro', s: 1, v: function (r) { return r.n; } },
      { h: 'J', t: 'Jogos apitados', v: function (r) { return r.j; } },
      { h: 'CA', t: 'Cartões amarelos', v: function (r) { return r.ca; } }, pj('ca', 'CA', 'Cartões amarelos'),
      { h: 'CV', t: 'Cartões vermelhos', v: function (r) { return r.cv; } }, pj('cv', 'CV', 'Cartões vermelhos'),
      { h: 'CT', t: 'Cartões (total)', v: function (r) { return r.ct; } }, pj('ct', 'CT', 'Cartões'),
      { h: 'FAL', t: 'Faltas marcadas', v: function (r) { return r.fal; } }, pj('fal', 'FAL', 'Faltas'),
      { h: 'FAL/C', t: 'Faltas por cartão', v: function (r) { return rate(r.fal, r.ct); }, f: f2 }
    ], 1, false);
    function render() {
      var rg = trange(S.turno), hi = fb.hi(), by = {};
      GAMES.forEach(function (g) {
        if (g[0] < rg[0] || g[0] > rg[1] || g[0] > hi || (S.date != null && g[1] > S.date)) return;
        var n = DS.g.ref[g[8]], o = by[n] || (by[n] = { n: n, j: 0, ca: 0, cv: 0, ct: 0, fal: 0 });
        o.j++; [[0, 1], [1, 0]].forEach(function (sd) {
          if ((S.mando === 'casa' && sd[0] !== 0) || (S.mando === 'fora' && sd[0] !== 1)) return;
          var b = 16 + sd[0] * 10; o.ca += g[b + 7]; o.cv += g[b + 8]; o.ct += g[b + 9]; o.fal += g[b + 5];
        });
      });
      tb.set(Object.keys(by).map(function (k) { return by[k]; }).filter(function (r) { return r.j >= parseInt(min.value, 10); }));
    }
    min.addEventListener('change', render);
    fb = filterBar(arRoot, S, render); render();
  })();

  /* =====================  RESULTADOS E GOLS (stats e clube)  ===================== */
  function gsum(list) {
    var o = { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, z: 0, cs: 0, sc: 0, cc: 0, scn: 0, ccn: 0, both: 0, m: [0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0], bw: 0, bl: 0, bestW: null, bestL: null };
    list.forEach(function (g) {
      var r = g.r, gf = r[1], ga = r[2], df = gf - ga; o.j++;
      if (df > 0) o.v++; else if (df === 0) o.e++; else o.d++;
      o.gp += gf; o.gc += ga;
      if (gf === 0 && ga === 0) o.z++;
      if (ga === 0) o.cs++; if (gf > 0) o.sc++; if (ga > 0) o.cc++;
      if (gf > 0 && ga === 0) o.scn++; if (ga > 0 && gf === 0) o.ccn++; if (gf > 0 && ga > 0) o.both++;
      o.m[Math.min(gf, 4)]++; o.s[Math.min(ga, 4)]++;
      if (df >= 3) o.bw++; if (-df >= 3) o.bl++;
      if (df > 0 && (!o.bestW || df > o.bestW.r[1] - o.bestW.r[2] || (df === o.bestW.r[1] - o.bestW.r[2] && gf > o.bestW.r[1]))) o.bestW = g;
      if (df < 0 && (!o.bestL || -df > o.bestL.r[2] - o.bestL.r[1] || (-df === o.bestL.r[2] - o.bestL.r[1] && ga > o.bestL.r[2]))) o.bestL = g;
    });
    o.pts = 3 * o.v + o.e; o.ap = o.j ? o.pts / (3 * o.j) : null; o.sg = o.gp - o.gc; return o;
  }
  function gamesOf(s, turno, mando, hi, cut) {
    var rg = trange(turno || 'todos'), out = []; hi = hi || 38;
    RES[s].forEach(function (r, i) {
      if (i + 1 < rg[0] || i + 1 > rg[1] || i + 1 > hi) return;
      if (cut != null && r[4] > cut) return;
      if (mando === 'casa' && r[0] !== 1) return; if (mando === 'fora' && r[0] !== 0) return;
      out.push({ r: r, i: i, row: GB[s] && GB[s][i + 1] ? GB[s][i + 1].row : null });
    });
    return out;
  }
  /* barra de filtros (rodada, data, turno, mando…) para as tabelas de stats */
  function filterBar(root, S, onChange) {
    var sel = root.querySelector('.f-rod'), dIn = root.querySelector('.f-date'), dX = root.querySelector('.f-date-x');
    S.hi = 38; S.date = null; dIn.min = dayISO(DMIN); dIn.max = dayISO(DMAX);
    function fillRod() {
      var r = trange(S.turno); sel.textContent = '';
      if (S.date != null) { var o0 = mk('option', null, 'Por data'); o0.value = ''; sel.appendChild(o0); }
      for (var i = r[0]; i <= r[1]; i++) { var o = mk('option', null, 'Rodada ' + i); o.value = i; sel.appendChild(o); }
      if (S.hi < r[0] || S.hi > r[1]) S.hi = r[1];
      sel.value = S.date != null ? '' : S.hi;
    }
    wireSeg(root, 'data-xseg', S, function (k) { if (k === 'turno') { S.hi = trange(S.turno)[1]; fillRod(); } onChange(k); });
    sel.addEventListener('change', function () { if (sel.value === '') return; S.date = null; dIn.value = ''; dX.hidden = true; S.hi = parseInt(sel.value, 10); fillRod(); onChange('rod'); });
    dIn.addEventListener('change', function () { if (!dIn.value) { dX.click(); return; } S.date = Math.max(DMIN - 1, Math.min(DMAX, isoDay(dIn.value))); dX.hidden = false; fillRod(); onChange('date'); });
    dX.addEventListener('click', function () { S.date = null; dIn.value = ''; dX.hidden = true; S.hi = trange(S.turno)[1]; fillRod(); onChange('date'); });
    fillRod();
    return { hi: function () { return S.date != null ? 38 : S.hi; } };
  }
  var posCache = {};
  function posBefore(day) {
    if (!posCache[day]) { var m = {}; standings(1, 38, 'todos', day - 1).forEach(function (x, i) { m[x.s] = i + 1; }); posCache[day] = m; }
    return posCache[day];
  }
  var BANDS = [['G4 · 1º ao 4º', function (p) { return p <= 4; }], ['Z4 · 17º ao 20º', function (p) { return p >= 17; }], ['Primeira metade · 1º ao 10º', function (p) { return p <= 10; }], ['Segunda metade · 11º ao 20º', function (p) { return p >= 11; }]];
  function vsBand(games, b) { return games.filter(function (g) { return g.i >= 1 && BANDS[b][1](posBefore(g.r[4])[TEAMS[g.r[3]].s]); }); }
  function smooth(pts) {
    var n = pts.length, i;
    if (n < 3) return 'M' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join('L');
    var dx = [], m = [], t = [];
    for (i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      var p = t[i] / m[i], q = t[i + 1] / m[i], s = p * p + q * q;
      if (s > 9) { var k = 3 / Math.sqrt(s); t[i] = k * p * m[i]; t[i + 1] = k * q * m[i]; }
    }
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (i = 0; i < n - 1; i++) d += 'C' + (pts[i][0] + dx[i] / 3) + ',' + (pts[i][1] + t[i] * dx[i] / 3) + ',' + (pts[i + 1][0] - dx[i] / 3) + ',' + (pts[i + 1][1] - t[i + 1] * dx[i] / 3) + ',' + pts[i + 1][0] + ',' + pts[i + 1][1];
    return d;
  }
  function scoreTxt(g) { return g ? g.r[1] + ' x ' + g.r[2] + ' · ' + TEAMS[g.r[3]].n + ' (R' + (g.i + 1) + ')' : '—'; }

  var grRoot = document.getElementById('gr');
  if (grRoot && TEAMS.length) (function () {
    var S = { turno: 'todos', mando: 'todos', grupo: 'partidas' }, table = grRoot.querySelector('table'), tb = null, rows = [], fb;
    var NAME = { h: 'Time', s: 1, v: function (r) { return r.n; }, cell: teamCell }, J = { h: 'J', t: 'Jogos', v: function (r) { return r.o.j; } };
    function cnt(h, t, f) { return { h: h, t: t, v: function (r) { return f(r.o); }, cell: function (td, r) { var n = f(r.o); td.textContent = n; td.title = r.o.j ? F.pct(n / r.o.j * 100) + ' dos jogos' : ''; } }; }
    var G = {
      partidas: { def: 2, asc: false, cols: [NAME, J, cnt('0 x 0', 'Partidas que terminaram sem gols', function (o) { return o.z; }),
        cnt('Sem sofrer', 'Partidas sem sofrer gols (clean sheets)', function (o) { return o.cs; }), cnt('Marcou', 'Partidas em que marcou', function (o) { return o.sc; }), cnt('Sofreu', 'Partidas em que sofreu gol', function (o) { return o.cc; }),
        cnt('Marcou s/ sofrer', 'Marcou e não sofreu gol', function (o) { return o.scn; }), cnt('Sofreu s/ marcar', 'Sofreu e não marcou', function (o) { return o.ccn; }), cnt('Ambas marcaram', 'Partidas em que os dois times marcaram', function (o) { return o.both; }),
        cnt('Vit. goleada', 'Vitórias por 3 ou mais gols de diferença', function (o) { return o.bw; }), cnt('Der. goleada', 'Derrotas por 3 ou mais gols de diferença', function (o) { return o.bl; })] },
      marcou: { def: 2, asc: true, cols: [NAME, J, cnt('0 gols', 'Partidas em que marcou 0 gols', function (o) { return o.m[0]; }), cnt('1 gol', 'Partidas em que marcou 1 gol', function (o) { return o.m[1]; }), cnt('2 gols', 'Partidas em que marcou 2 gols', function (o) { return o.m[2]; }),
        cnt('3 gols', 'Partidas em que marcou 3 gols', function (o) { return o.m[3]; }), cnt('+ de 3', 'Partidas em que marcou mais de 3 gols', function (o) { return o.m[4]; })] },
      sofreu: { def: 2, asc: false, cols: [NAME, J, cnt('0 gols', 'Partidas em que sofreu 0 gols', function (o) { return o.s[0]; }), cnt('1 gol', 'Partidas em que sofreu 1 gol', function (o) { return o.s[1]; }), cnt('2 gols', 'Partidas em que sofreu 2 gols', function (o) { return o.s[2]; }),
        cnt('3 gols', 'Partidas em que sofreu 3 gols', function (o) { return o.s[3]; }), cnt('+ de 3', 'Partidas em que sofreu mais de 3 gols', function (o) { return o.s[4]; })] },
      goleadas: { def: 2, asc: false, cols: [NAME, J, cnt('Aplicadas', 'Vitórias por 3 ou mais gols de diferença', function (o) { return o.bw; }), cnt('Sofridas', 'Derrotas por 3 ou mais gols de diferença', function (o) { return o.bl; }),
        { h: 'Saldo', t: 'Goleadas aplicadas menos goleadas sofridas', v: function (r) { return r.o.bw - r.o.bl; }, f: function (v) { return (v > 0 ? '+' : '') + v; } },
        { h: 'Maior vitória', t: 'Maior vitória (em diferença de gols)', v: function (r) { return r.o.bestW ? r.o.bestW.r[1] - r.o.bestW.r[2] : 0; }, cell: function (td, r) { td.textContent = scoreTxt(r.o.bestW); } },
        { h: 'Maior derrota', t: 'Maior derrota (em diferença de gols)', v: function (r) { return r.o.bestL ? r.o.bestL.r[2] - r.o.bestL.r[1] : 0; }, cell: function (td, r) { td.textContent = scoreTxt(r.o.bestL); } }] }
    };
    function load() { rows = TEAMS.map(function (t) { return { s: t.s, n: t.n, o: gsum(gamesOf(t.s, S.turno, S.mando, fb.hi(), S.date)) }; }); }
    function build() { var g = G[S.grupo]; tb = xtable(table, g.cols, g.def, g.asc); tb.set(rows); }
    fb = filterBar(grRoot, S, function (k) { load(); if (k === 'grupo') build(); else tb.set(rows); });
    load(); build();
  })();

  /* desempenho de cada time contra faixas da tabela (stats) */
  var bfRoot = document.getElementById('bf');
  if (bfRoot && TEAMS.length) (function () {
    var S = { turno: 'todos', mando: 'todos', faixa: '0' }, table = bfRoot.querySelector('table'), tb = null, rows = [], fb;
    var cols = [{ h: 'Time', s: 1, v: function (r) { return r.n; }, cell: teamCell }, { h: 'J', t: 'Jogos', v: function (r) { return r.o.j; } }, { h: 'V', t: 'Vitórias', v: function (r) { return r.o.v; } }, { h: 'E', t: 'Empates', v: function (r) { return r.o.e; } }, { h: 'D', t: 'Derrotas', v: function (r) { return r.o.d; } },
      { h: 'PTS', t: 'Pontos', v: function (r) { return r.o.pts; } }, { h: 'APV', t: 'Aproveitamento', v: function (r) { return r.o.ap; }, f: function (v) { return F.pct(v * 100); } },
      { h: 'GP', t: 'Gols pró', v: function (r) { return r.o.gp; } }, { h: 'GC', t: 'Gols contra', v: function (r) { return r.o.gc; } }, { h: 'SG', t: 'Saldo de gols', v: function (r) { return r.o.sg; }, f: function (v) { return (v > 0 ? '+' : '') + v; } }];
    function load() {
      rows = TEAMS.map(function (t) { return { s: t.s, n: t.n, o: gsum(vsBand(gamesOf(t.s, S.turno, S.mando, fb.hi(), S.date), +S.faixa)) }; });
      rows.sort(function (x, y) { return (y.o.ap == null ? -1 : y.o.ap) - (x.o.ap == null ? -1 : x.o.ap) || y.o.pts - x.o.pts || y.o.sg - x.o.sg || y.o.gp - x.o.gp || x.n.localeCompare(y.n, 'pt'); });
    }
    tb = xtable(table, cols, 6, false);
    fb = filterBar(bfRoot, S, function () { load(); tb.set(rows); });
    load(); tb.set(rows);
  })();

  /* =====================  PÁGINA DO CLUBE  ===================== */
  var clRoot = document.getElementById('club');
  if (clRoot && TEAMS.length) (function () {
    var sel = document.getElementById('cl-sel'), BYS = {}; (DS.clubes || []).forEach(function (c) { BYS[c.s] = c; });
    var NMS = TEAMS.slice().sort(function (x, y) { return x.n.localeCompare(y.n, 'pt'); });
    NMS.forEach(function (t) { var o = mk('option', null, t.n); o.value = t.s; sel.appendChild(o); });
    function sec(title, sub) { var s = mk('section', 'cl-sec'); s.appendChild(mk('h2', null, title)); if (sub) s.appendChild(mk('p', 'cl-sub', sub)); clRoot.appendChild(s); return s; }
    function cards(parent, list) {
      var g = mk('div', 'ov-grid'); list.forEach(function (x) { var c = mk('div', 'ovc'); c.appendChild(mk('div', 'kl', x[0])); c.appendChild(mk('div', 'kv', x[1])); if (x[2]) c.appendChild(mk('div', 'ks', x[2])); g.appendChild(c); }); parent.appendChild(g); return g;
    }
    function pct(n, d) { return d ? F.pct(n / d * 100) : '—'; }
    function dual(parent, title, la, lb, A, B) {
      var box = mk('div', 'mvb'); box.appendChild(mk('div', 'flabel', title));
      var t = mk('table', 'lt'), th = mk('thead'), trh = mk('tr');
      ['', la, lb].forEach(function (h) { trh.appendChild(mk('th', null, h)); }); th.appendChild(trh); t.appendChild(th);
      var tbd = mk('tbody');
      [['Jogos', 'j'], ['Vitórias', 'v'], ['Empates', 'e'], ['Derrotas', 'd'], ['Pontos', 'pts'], ['Aproveitamento', 'ap'], ['Gols pró', 'gp'], ['Gols contra', 'gc'], ['Saldo de gols', 'sg']].forEach(function (m) {
        var tr = mk('tr'), k = m[1], fa = k === 'ap' ? (A.ap == null ? '—' : F.pct(A.ap * 100)) : (k === 'sg' && A.sg > 0 ? '+' : '') + A[k], fb = k === 'ap' ? (B.ap == null ? '—' : F.pct(B.ap * 100)) : (k === 'sg' && B.sg > 0 ? '+' : '') + B[k];
        tr.appendChild(mk('td', 'rl', m[0])); var ca = mk('td', (k === 'pts' || k === 'ap') ? 'hl' : '', fa), cb = mk('td', (k === 'pts' || k === 'ap') ? 'hl' : '', fb);
        if (typeof A[k] === 'number' && typeof B[k] === 'number' && k !== 'gc' && k !== 'd' && A[k] !== B[k]) (A[k] > B[k] ? ca : cb).classList.add('best');
        if ((k === 'gc' || k === 'd') && A[k] !== B[k]) (A[k] < B[k] ? ca : cb).classList.add('best');
        tr.appendChild(ca); tr.appendChild(cb); tbd.appendChild(tr);
      });
      t.appendChild(tbd); var bx = mk('div', 'tbl-box'), sc = mk('div', 'tbl-scroll'); sc.appendChild(t); bx.appendChild(sc); box.appendChild(bx); parent.appendChild(box);
    }
    function dist(parent, title, arr, j, color) {
      var box = mk('div', 'mvb'); box.appendChild(mk('div', 'flabel', title));
      var ul = mk('ul', 'dist'); ['0 gols', '1 gol', '2 gols', '3 gols', '+ de 3 gols'].forEach(function (lab, k) {
        var li = mk('li'); li.appendChild(mk('span', 'dl', lab)); var tr = mk('span', 'dt2'), b = mk('i'); b.style.width = (j ? arr[k] / j * 100 : 0) + '%'; b.style.background = color; tr.appendChild(b); li.appendChild(tr);
        li.appendChild(mk('b', null, arr[k] + ' · ' + pct(arr[k], j))); ul.appendChild(li);
      }); box.appendChild(ul); parent.appendChild(box);
    }
    /* gráfico: aproveitamento acumulado e média móvel (5 jogos) */
    function apvChart(host, ser, games, tm) {
      var INK = '#6B7088', GR = '#E6E8EF';
      var W = Math.max(host.clientWidth, 280), H = W < 480 ? 280 : 330, m = { l: 42, r: 16, t: 14, b: 32 }, N = games.length;
      var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Aproveitamento de ' + tm.n + ' ao longo dos jogos: acumulado e média móvel de 5 jogos.' }, host);
      var pw = W - m.l - m.r, ph = H - m.t - m.b, sx = function (i) { return m.l + (N > 1 ? i / (N - 1) : 0) * pw; }, sy = function (v) { return m.t + (1 - v / 100) * ph; };
      [0, 25, 50, 75, 100].forEach(function (v) { el('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), stroke: GR, 'stroke-width': 1 }, svg); text(svg, m.l - 8, sy(v), v + '%', { anchor: 'end', size: 10.5, base: 'central', fill: INK }); });
      [1, 5, 10, 15, 20, 25, 30, 35, 38].forEach(function (g) { if (g <= N) text(svg, sx(g - 1), H - 10, String(g), { anchor: 'middle', size: 10.5, fill: INK }); });
      ser.forEach(function (s) {
        var pts = s.v.map(function (v, i) { return [+sx(i).toFixed(1), +sy(v).toFixed(1)]; });
        el('path', { d: smooth(pts), fill: 'none', stroke: s.color, 'stroke-width': 2.75, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      });
      var cross = el('line', { y1: m.t, y2: m.t + ph, stroke: '#A9AEC8', 'stroke-width': 1, opacity: 0 }, svg);
      var dots = ser.map(function (s) { return el('circle', { r: 5, fill: s.color, stroke: '#fff', 'stroke-width': 2, opacity: 0 }, svg); });
      var hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', tabindex: 0, 'aria-label': 'Percorra os jogos com as setas.' }, svg), idx = N - 1;
      function at(i) {
        i = Math.max(0, Math.min(N - 1, i)); idx = i; cross.setAttribute('x1', sx(i)); cross.setAttribute('x2', sx(i)); cross.setAttribute('opacity', 1);
        ser.forEach(function (s, k) { dots[k].setAttribute('cx', sx(i)); dots[k].setAttribute('cy', sy(s.v[i])); dots[k].setAttribute('opacity', 1); });
        var g = games[i], r = g.r, me = tm.n, op = TEAMS[r[3]].n;
        var rows = ser.map(function (s) { return { color: s.color, text: s.name + ': ' + F.pct(s.v[i]) }; });
        rows.push({ color: C.muted, text: 'R' + (g.i + 1) + ' · ' + dm(r[4]) + ' · ' + (r[0] ? me + ' ' + r[1] + ' x ' + r[2] + ' ' + op : op + ' ' + r[2] + ' x ' + r[1] + ' ' + me) });
        return rows;
      }
      function off() { cross.setAttribute('opacity', 0); dots.forEach(function (d) { d.setAttribute('opacity', 0); }); hideTip(); }
      hit.addEventListener('pointermove', function (ev) { var r = svg.getBoundingClientRect(), rows = at(Math.round(((ev.clientX - r.left - m.l) / pw) * (N - 1))); showTipRows(ev.clientX, ev.clientY, 'Jogo ' + (idx + 1), rows); });
      hit.addEventListener('pointerleave', off);
      hit.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); var rows = at(idx + (ev.key === 'ArrowRight' ? 1 : -1)), r = svg.getBoundingClientRect(); showTipRows(r.left + sx(idx), r.top + sy(ser[0].v[idx]), 'Jogo ' + (idx + 1), rows); } });
      hit.addEventListener('blur', off);
    }
    function render(s, opp) {
      clRoot.textContent = ''; hideTip();
      var tm = TEAMS.filter(function (t) { return t.s === s; })[0], info = BYS[s] || {}, all = gamesOf(s), O = gsum(all), pos = standings(1, 38, 'todos').map(function (x) { return x.s; }).indexOf(s) + 1;
      var champ = { goals: 0 }; TEAMS.forEach(function (t) { RES[t.s].forEach(function (r) { if (r[0] === 1) champ.goals += r[1] + r[2]; }); });
      /* cabeçalho */
      var head = mk('div', 'cl-head'), bd = dot(s); bd.className += ' xl'; head.appendChild(bd);
      var ht = mk('div'); ht.appendChild(mk('h2', null, tm.n)); ht.appendChild(mk('p', null, [info.uf, info.estadio].filter(Boolean).join(' · ') + ' · Brasileirão Série A 2025')); head.appendChild(ht); clRoot.appendChild(head);
      cards(clRoot, [['Posição final', pos + 'º', O.pts + ' pontos'], ['Aproveitamento', F.pct(O.ap * 100), O.j + ' jogos'], ['Vitórias · empates · derrotas', O.v + 'V ' + O.e + 'E ' + O.d + 'D'], ['Saldo de gols', (O.sg > 0 ? '+' : '') + O.sg, O.gp + ' pró · ' + O.gc + ' contra']]);
      /* confronto contra um adversário escolhido */
      if (opp) {
        var oi = -1; TEAMS.forEach(function (t2, k) { if (t2.s === opp) oi = k; });
        var mg = all.filter(function (g) { return g.r[3] === oi; }).sort(function (x, y) { return x.r[4] - y.r[4]; }), M = gsum(mg), on = NM[opp];
        var sm = sec(tm.n + ' x ' + on, 'Os jogos do campeonato entre os dois clubes, com público, renda, árbitro e estatísticas de cada equipe.');
        cards(sm, [['Vitórias · empates · derrotas', M.v + 'V ' + M.e + 'E ' + M.d + 'D', M.pts + ' de ' + 3 * M.j + ' pontos · ' + F.pct(M.ap * 100)], ['Gols', M.gp + ' x ' + M.gc, tm.n + ' x ' + on], ['Gols por jogo', F.d2(M.gp / M.j) + ' x ' + F.d2(M.gc / M.j), 'total: ' + F.d2((M.gp + M.gc) / M.j) + ' por jogo'], ['Saldo de gols', (M.sg > 0 ? '+' : '') + M.sg, 'para ' + tm.n]]);
        /* totais dos jogos */
        var TOT = { pub: 0, renda: 0, fin: [0, 0], chg: [0, 0], ct: [0, 0], fal: [0, 0] };
        mg.forEach(function (g) {
          var w = g.row, h = r0(g), a0 = h ? 16 : 26, b0 = h ? 26 : 16; TOT.pub += w[9]; TOT.renda += w[11];
          [['fin', 1], ['chg', 2], ['ct', 9], ['fal', 5]].forEach(function (k) { TOT[k[0]][0] += w[a0 + k[1]]; TOT[k[0]][1] += w[b0 + k[1]]; });
        });
        function r0(g) { return g.r[0] === 1; }
        cards(sm, [['Público nos dois jogos', F.int(TOT.pub), F.int(TOT.pub / mg.length) + ' por jogo'], ['Renda nos dois jogos', F.brlc(TOT.renda), F.brlfull(TOT.renda)],
          ['Finalizações', TOT.fin[0] + ' x ' + TOT.fin[1], tm.n + ' x ' + on], ['Chutes a gol', TOT.chg[0] + ' x ' + TOT.chg[1], tm.n + ' x ' + on], ['Faltas', TOT.fal[0] + ' x ' + TOT.fal[1], tm.n + ' x ' + on], ['Cartões', TOT.ct[0] + ' x ' + TOT.ct[1], tm.n + ' x ' + on]]);
        var gl = mk('div', 'gcards');
        mg.forEach(function (g) {
          var r = g.r, w = g.row, hm = r0(g), home = hm ? tm.n : on, away = hm ? on : tm.n, hg = r[0] ? r[1] : r[2], ag = r[0] ? r[2] : r[1];
          var win = r[1] > r[2] ? 'a' : r[1] === r[2] ? 'e' : 'b', c = mk('div', 'gcard'), d = dayISO(r[4]).split('-');
          var hd = mk('div', 'gc-h'); hd.appendChild(mk('span', 'gm', 'Rodada ' + (g.i + 1) + ' · ' + d[2] + '/' + d[1] + '/' + d[0] + ' · ' + w[6]));
          var chip = mk('span', 'chip ' + win, win === 'e' ? 'Empate' : win === 'a' ? tm.n + ' venceu' : on + ' venceu'); if (win !== 'e') chip.style.setProperty('--c', win === 'a' ? C.green : C.blue); hd.appendChild(chip); c.appendChild(hd);
          var sc = mk('div', 'gc-s'); sc.appendChild(mk('span', 'tn' + (hg > ag ? ' w' : ''), home)); sc.appendChild(mk('span', 'sc big', hg + ' x ' + ag)); sc.appendChild(mk('span', 'tn' + (ag > hg ? ' w' : ''), away)); c.appendChild(sc);
          var meta = mk('div', 'gc-m'); meta.appendChild(mk('span', null, 'Estádio: ' + DS.g.est[w[7]])); meta.appendChild(mk('span', null, 'Árbitro: ' + DS.g.ref[w[8]])); c.appendChild(meta);
          var kp = mk('div', 'gc-k');
          [['Público', F.int(w[9]), F.pct(w[9] / w[15] * 100) + ' de ' + F.int(w[15])], ['Pagantes', w[10] == null ? '—' : F.int(w[10])], ['Renda', F.brlfull(w[11])], ['Ticket médio', F.brl(w[14])], ['Despesa', F.brlfull(w[12])], ['Lucro', F.brlfull(w[13])]].forEach(function (k) {
            var b = mk('div'); b.appendChild(mk('span', 'kl', k[0])); b.appendChild(mk('b', null, k[1])); if (k[2]) b.appendChild(mk('em', null, k[2])); kp.appendChild(b);
          }); c.appendChild(kp);
          var a0 = hm ? 16 : 26, b0 = hm ? 26 : 16, st = mk('div', 'gc-st'), hh = mk('div', 'gc-sh'); hh.appendChild(mk('b', null, tm.n)); hh.appendChild(mk('b', null, on)); st.appendChild(hh);
          [['Posse de bola', 0, 1], ['Finalizações', 1], ['Chutes a gol', 2], ['Defesas do goleiro', 3], ['Escanteios', 4], ['Faltas', 5], ['Desarmes', 6], ['Cartões amarelos', 7], ['Cartões vermelhos', 8], ['Cartões (total)', 9]].forEach(function (s) {
            var va = w[a0 + s[1]], vb = w[b0 + s[1]], row = mk('div', 'srow'), pc = s[2];
            row.appendChild(mk('b', 'l', pc ? F.pct(va * 100) : String(va))); row.appendChild(mk('span', 'lab', s[0])); row.appendChild(mk('b', 'r', pc ? F.pct(vb * 100) : String(vb)));
            var bar = mk('div', 'sb'), x = mk('i'), y = mk('i'); x.style.flexGrow = va; y.style.flexGrow = vb; x.style.background = C.green; y.style.background = C.blue; if (!va && !vb) { x.style.flexGrow = y.style.flexGrow = 1; x.style.background = y.style.background = '#ECEDF2'; } bar.appendChild(x); bar.appendChild(y); row.appendChild(bar); st.appendChild(row);
          }); c.appendChild(st); gl.appendChild(c);
        });
        sm.appendChild(gl);
      }
      /* gols */
      var sg = sec('Gols');
      cards(sg, [['Gols marcados', F.int(O.gp), F.d2(O.gp / O.j) + ' por jogo · ' + F.pct(O.gp / champ.goals * 100) + ' dos gols do campeonato'], ['Gols sofridos', F.int(O.gc), F.d2(O.gc / O.j) + ' por jogo · ' + F.pct(O.gc / champ.goals * 100) + ' dos gols do campeonato'],
        ['Gols nas partidas do clube', F.int(O.gp + O.gc), F.pct((O.gp + O.gc) / champ.goals * 100) + ' dos gols do campeonato · ' + F.d2((O.gp + O.gc) / O.j) + ' por jogo']]);
      /* mandante x visitante, 1º x 2º turno */
      var s2 = sec('Mandante x visitante e 1º x 2º turno'), row = mk('div', 'mv two'); s2.appendChild(row);
      dual(row, 'Mandante x visitante', 'Mandante', 'Visitante', gsum(gamesOf(s, 'todos', 'casa')), gsum(gamesOf(s, 'todos', 'fora')));
      dual(row, '1º turno x 2º turno', '1º turno', '2º turno', gsum(gamesOf(s, '1')), gsum(gamesOf(s, '2')));
      /* gráfico */
      var s3 = sec('Aproveitamento ao longo do campeonato'), card = mk('div', 'lcard'); card.appendChild(mk('h3', null, 'Aproveitamento por partida'));
      card.appendChild(mk('p', 'cs', 'Em ordem cronológica. Passe o mouse (ou use as setas) para ver cada jogo.')); 
      var chrono = all.slice().sort(function (x, y) { return x.r[4] - y.r[4] || x.i - y.i; }), acc = [], mov = [], pts = 0;
      chrono.forEach(function (g, k) {
        var p = g.r[1] > g.r[2] ? 3 : g.r[1] === g.r[2] ? 1 : 0; pts += p; acc.push(pts / (3 * (k + 1)) * 100);
        var from = Math.max(0, k - 4), sm = 0; for (var q = from; q <= k; q++) sm += chrono[q].r[1] > chrono[q].r[2] ? 3 : chrono[q].r[1] === chrono[q].r[2] ? 1 : 0; mov.push(sm / (3 * (k - from + 1)) * 100);
      });
      var ser = [{ name: 'Acumulado', color: '#298463', v: acc }, { name: 'Últimos 5 jogos', color: '#2D3776', v: mov }];
      var lgd = mk('div', 'llg'); ser.forEach(function (x) { var sp = mk('span'), sw = mk('i'); sw.style.background = x.color; sp.appendChild(sw); sp.appendChild(document.createTextNode(x.name)); lgd.appendChild(sp); }); card.appendChild(lgd);
      var host = mk('div', 'plot'); card.appendChild(host); s3.appendChild(card);
      var draw = function () { hideTip(); host.textContent = ''; apvChart(host, ser, chrono, tm); }; draw();
      if ('ResizeObserver' in window) { var lw = host.clientWidth; new ResizeObserver(function () { if (Math.abs(host.clientWidth - lw) > 4) { lw = host.clientWidth; draw(); } }).observe(host); }
      /* contra faixas da tabela */
      var s4 = sec('Desempenho contra faixas da tabela', 'Da melhor para a pior campanha. Considera a posição do adversário antes da partida (tabela atualizada até o dia anterior); a rodada 1 fica de fora.');
      var t = mk('table', 'lt'), th = mk('thead'), trh = mk('tr'); ['Adversário', 'J', 'V', 'E', 'D', 'PTS', 'APV', 'GP', 'GC', 'SG'].forEach(function (h) { trh.appendChild(mk('th', null, h)); }); th.appendChild(trh); t.appendChild(th);
      var tbd = mk('tbody'), brows = BANDS.map(function (b, k) { return { n: b[0], o: gsum(vsBand(all, k)) }; });
      brows.sort(function (x, y) { return (y.o.ap == null ? -1 : y.o.ap) - (x.o.ap == null ? -1 : x.o.ap) || y.o.pts - x.o.pts; });
      brows.forEach(function (b) {
        var o = b.o, tr = mk('tr');
        [b.n, o.j, o.v, o.e, o.d, o.pts, o.ap == null ? '—' : F.pct(o.ap * 100), o.gp, o.gc, (o.sg > 0 ? '+' : '') + o.sg].forEach(function (v, k) { tr.appendChild(mk('td', k === 0 ? 'rl' : k === 5 || k === 6 ? 'hl' : '', String(v))); }); tbd.appendChild(tr);
      });
      t.appendChild(tbd); var bx = mk('div', 'tbl-box'), sc = mk('div', 'tbl-scroll'); sc.appendChild(t); bx.appendChild(sc); s4.appendChild(bx);
      /* resultados */
      var s5 = sec('Resultados e gols'), bar = mk('div', 'tow-bar rbar'); bar.setAttribute('role', 'img');
      var RS = [[O.v, C.green, 'Vitórias'], [O.e, '#A9AEC8', 'Empates'], [O.d, '#D2484F', 'Derrotas']];
      bar.setAttribute('aria-label', RS.map(function (x) { return x[2] + ' ' + pct(x[0], O.j); }).join(', '));
      RS.forEach(function (x) { if (!x[0]) return; var sp = mk('span', null, pct(x[0], O.j)); sp.style.flexGrow = x[0]; sp.style.background = x[1]; sp.title = x[2] + ': ' + x[0]; bar.appendChild(sp); }); s5.appendChild(bar);
      var lg2 = mk('div', 'tow-leg'); RS.forEach(function (x) { var it = mk('span'), sw = mk('i'); sw.style.background = x[1]; it.appendChild(sw); it.appendChild(document.createTextNode(x[2] + ' · ' + x[0])); lg2.appendChild(it); }); s5.appendChild(lg2);
      s5.appendChild(mk('div', 'ov-h', 'Partidas'));
      cards(s5, [['Sem gols (0 x 0)', O.z, pct(O.z, O.j)], ['Sem sofrer gols', O.cs, pct(O.cs, O.j) + ' · clean sheets'], ['Marcou', O.sc, pct(O.sc, O.j)], ['Sofreu', O.cc, pct(O.cc, O.j)],
        ['Marcou sem sofrer', O.scn, pct(O.scn, O.j)], ['Sofreu sem marcar', O.ccn, pct(O.ccn, O.j)], ['Ambas marcaram', O.both, pct(O.both, O.j)],
        ['Vitórias por goleada', O.bw, '3 ou mais gols de diferença'], ['Derrotas por goleada', O.bl, '3 ou mais gols de diferença']]);
      var dr = mk('div', 'mv two'); s5.appendChild(dr);
      dist(dr, 'Gols marcados por partida', O.m, O.j, C.green); dist(dr, 'Gols sofridos por partida', O.s, O.j, C.blue);
      /* público e renda */
      if (info.s) {
        var s6 = sec('Público e renda', 'Considera os ' + info.jogos + ' jogos em que o clube foi mandante.');
        cards(s6, [['Público total', F.int(info.publico)], ['Público médio', F.int(info.publico_medio)], ['Renda total', F.brlc(info.renda), F.brlfull(info.renda)], ['Renda média', F.brlc(info.renda_media)], ['Ocupação', F.pct(info.ocupacao)], ['Ticket médio', F.brl(info.ticket)]]);
      }
    }
    var oppSel = document.getElementById('cl-opp');
    function fillOpp(keep) {
      oppSel.textContent = ''; var o0 = mk('option', null, 'Todos os adversários'); o0.value = ''; oppSel.appendChild(o0);
      NMS.forEach(function (t) { if (t.s !== sel.value) { var o = mk('option', null, t.n); o.value = t.s; oppSel.appendChild(o); } });
      oppSel.value = keep && keep !== sel.value ? keep : '';
    }
    var hh = (location.hash || '').replace('#', '').split('-'), start = BYS[hh[0]] ? hh[0] : 'FLA';
    sel.value = start; fillOpp(hh[1]); render(start, oppSel.value);
    function go() { if (history.replaceState) history.replaceState(null, '', '#' + sel.value + (oppSel.value ? '-' + oppSel.value : '')); render(sel.value, oppSel.value); }
    sel.addEventListener('change', function () { fillOpp(oppSel.value); go(); });
    oppSel.addEventListener('change', go);
  })();

  /* =====================  DADOS · PÚBLICO E RENDA  ===================== */
  var METRICS = [
    { k: 'publico', t: 'Público total', f: F.compact, full: F.int, d: 'Soma do público presente nos jogos.' },
    { k: 'publico_medio', t: 'Público médio', f: F.int, full: F.int, d: 'Média de público presente por jogo.' },
    { k: 'renda', t: 'Renda total', f: F.brlc, full: F.brlfull, d: 'Soma da renda bruta de bilheteria.' },
    { k: 'renda_media', t: 'Renda média', f: F.brlc, full: F.brlfull, d: 'Renda bruta média por jogo.' },
    { k: 'ocupacao', t: 'Ocupação', f: F.pct, full: F.pct, d: 'Média de público presente ÷ capacidade, calculada jogo a jogo.' },
    { k: 'ticket', t: 'Ticket médio', f: F.brl, full: F.brl, d: 'Média do ticket de cada jogo (renda ÷ pagantes; sem registro de pagantes, ÷ presentes).' }
  ];
  var MBY = {}; METRICS.forEach(function (m) { MBY[m.k] = m; });
  var SHORTEST = { 'Estádio Presidente Vargas': 'Presidente Vargas', 'Cícero de Souza Marques': 'Cícero de S. Marques', 'Arena de Pernambuco': 'Arena de Pernambuco' };
  var XP = {
    estados: { rows: function () { return DS.estados; }, who: 'por estado', unit: 'estado',
      label: function (r) { return r.nome + (r.jogos <= 2 ? '*' : ''); },
      sub: function (r) { return r.jogos + ' jogos · ' + r.estadios + (r.estadios > 1 ? ' estádios' : ' estádio'); },
      cols: [['nome', 'Estado', 's'], ['estadios', 'Estádios', 'i'], ['jogos', 'Jogos', 'i'], ['publico', 'Público total', 'i'], ['publico_medio', 'Público médio', 'i'], ['renda', 'Renda total', 'c'], ['ocupacao', 'Ocupação', 'p'], ['ticket', 'Ticket médio', 'b']],
      foot: '* Distrito Federal: apenas 2 jogos. A média de um recorte tão pequeno é frágil.' },
    estadios: { rows: function () { return DS.estadios; }, who: 'por estádio', unit: 'estádio',
      label: function (r) { return (SHORTEST[r.nome] || r.nome) + (r.jogos <= 2 ? '*' : ''); },
      sub: function (r) { return r.uf + ' · capacidade ' + F.int(r.cap) + ' · ' + r.jogos + (r.jogos === 1 ? ' jogo' : ' jogos'); },
      cols: [['nome', 'Estádio', 's'], ['uf', 'UF', 's'], ['cap', 'Capacidade', 'i'], ['jogos', 'Jogos', 'i'], ['publico', 'Público total', 'i'], ['publico_medio', 'Público médio', 'i'], ['renda', 'Renda total', 'c'], ['ocupacao', 'Ocupação', 'p'], ['ticket', 'Ticket médio', 'b']],
      foot: '* Estádios com 1 ou 2 jogos na temporada (usados como alternativa pelos clubes). Médias de recortes tão pequenos são frágeis.' },
    clubes: { rows: function () { return DS.clubes; }, who: 'por clube (como mandante)', unit: 'clube',
      label: function (r) { return r.nome; },
      sub: function (r) { return r.jogos + ' jogos em casa · ' + r.estadio; },
      cols: [['nome', 'Clube', 's'], ['uf', 'UF', 's'], ['estadio', 'Estádio', 's'], ['jogos', 'Jogos', 'i'], ['publico', 'Público total', 'i'], ['publico_medio', 'Público médio', 'i'], ['renda', 'Renda total', 'c'], ['ocupacao', 'Ocupação', 'p'], ['ticket', 'Ticket médio', 'b']],
      foot: 'Considera apenas os jogos em que o clube foi mandante (19 por clube). Os valores são do jogo, não do clube: renda e público pertencem à partida.' }
  };
  var CELL = { s: function (v) { return v; }, i: F.int, c: F.brlc, p: F.pct, b: F.brl };

  function sortableTable(tbl, rows, cols, defKey, hlKey) {
    var thead = tbl.querySelector('thead'), tbody = tbl.querySelector('tbody'), sortK = defKey, asc = false;
    thead.textContent = ''; var trh = mk('tr');
    cols.forEach(function (c, i) {
      var th = mk('th', null, c[1]); th.tabIndex = 0; th.setAttribute('role', 'button'); if (c[2] !== 's') th.setAttribute('data-num', '1');
      function go() { if (sortK === c[0]) asc = !asc; else { sortK = c[0]; asc = c[2] === 's'; } render(); }
      th.addEventListener('click', go); th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    function render() {
      var data = rows().slice().sort(function (a, b) {
        var x = a[sortK], y = b[sortK];
        if (typeof x === 'string') return asc ? x.localeCompare(y, 'pt') : y.localeCompare(x, 'pt');
        return asc ? x - y : y - x;
      });
      tbody.textContent = '';
      data.forEach(function (r) {
        var tr = mk('tr');
        cols.forEach(function (c) {
          var td = mk('td', hlKey && hlKey() === c[0] ? 'hl' : '', CELL[c[2]](r[c[0]]));
          if (c[2] === 'c') td.title = F.brlfull(r[c[0]]);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      thead.querySelectorAll('th').forEach(function (th, i) { var on = cols[i][0] === sortK; th.classList.toggle('s', on); th.classList.toggle('asc', on && asc); th.setAttribute('aria-sort', on ? (asc ? 'ascending' : 'descending') : 'none'); });
    }
    render();
    return { render: render };
  }

  document.querySelectorAll('.xp[data-xp]').forEach(function (root) {
    var cfg = XP[root.getAttribute('data-xp')]; if (!cfg || !DS[root.getAttribute('data-xp')]) return;
    var seg = root.querySelector('.seg'), host = root.querySelector('.plot'), h3 = root.querySelector('.xt'), cs = root.querySelector('.cs'), foot = root.querySelector('.cf');
    var cur = 'publico';
    METRICS.forEach(function (m) {
      var b = mk('button', m.k === cur ? 'on' : '', m.t); b.type = 'button'; b.setAttribute('aria-pressed', m.k === cur);
      b.addEventListener('click', function () { cur = m.k; seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); draw(); tbl.render(); });
      seg.appendChild(b);
    });
    function draw() {
      var m = MBY[cur], rows = cfg.rows().slice().sort(function (a, b) { return b[cur] - a[cur]; });
      h3.textContent = m.t + ' ' + cfg.who; cs.textContent = m.d; foot.textContent = cfg.foot; hideTip(); host.textContent = '';
      hbar(host, rows.map(function (r) { return { label: cfg.label(r), value: r[cur], sub: cfg.sub(r) }; }),
        { fmt: m.f, color: C.green, hi: C.greenHi, aria: m.t + ' ' + cfg.who, rowH: rows.length > 12 ? 26 : 30 });
    }
    var tbl = sortableTable(root.querySelector('table.dt'), cfg.rows, cfg.cols, 'publico', function () { return cur; });
    draw();
    if ('ResizeObserver' in window) { var lw = host.clientWidth; new ResizeObserver(function () { if (Math.abs(host.clientWidth - lw) > 4) { lw = host.clientWidth; draw(); } }).observe(host); }
  });

  /* tops */
  var topsRoot = document.getElementById('tops');
  if (topsRoot && DS.tops) (function () {
    var T = { publico: ['Maiores públicos', 'pub'], renda: ['Maiores rendas', 'renda'], ocupacao: ['Maiores ocupações', 'ocup'], ticket: ['Maiores tickets', 'ticket'] };
    var NOTE = { publico: 'Público presente nos 10 maiores jogos da temporada.', renda: 'Renda bruta de bilheteria dos 10 maiores jogos.',
      ocupacao: 'Público presente ÷ capacidade. Estádios menores ocupam mais facilmente, então compare com o público absoluto.',
      ticket: 'Renda ÷ pagantes (ou presentes, quando não há registro de pagantes). Tickets altos não significam público alto.' };
    var seg = topsRoot.querySelector('.seg'), tbody = topsRoot.querySelector('tbody'), note = topsRoot.querySelector('.note'), cur = 'publico';
    Object.keys(T).forEach(function (k) {
      var b = mk('button', k === cur ? 'on' : '', T[k][0]); b.type = 'button'; b.setAttribute('aria-pressed', k === cur);
      b.addEventListener('click', function () { cur = k; seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); render(); });
      seg.appendChild(b);
    });
    function render() {
      tbody.textContent = ''; var hl = T[cur][1];
      DS.tops[cur].forEach(function (r, i) {
        var tr = mk('tr');
        [[String(i + 1), ''], [r.jogo, ''], [String(r.rod), ''], [r.est, ''], [F.int(r.pub), hl === 'pub'], [F.brlc(r.renda), hl === 'renda'], [F.pct(r.ocup), hl === 'ocup'], [F.brl(r.ticket), hl === 'ticket']]
          .forEach(function (c) { tr.appendChild(mk('td', c[1] ? 'hl' : '', c[0])); });
        tbody.appendChild(tr);
      });
      note.textContent = NOTE[cur];
    }
    render();
  })();

  /* grupos (abas do topo) e sub-abas */
  var gtabs = document.querySelectorAll('.gtab[data-g]');
  function openG(g, push) {
    var ok = false; gtabs.forEach(function (t) { if (t.getAttribute('data-g') === g) ok = true; });
    if (!ok) g = 'publico';
    gtabs.forEach(function (t) { var on = t.getAttribute('data-g') === g; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    document.querySelectorAll('[data-group]').forEach(function (p) { p.hidden = p.getAttribute('data-group') !== g; });
    if (push && history.replaceState) history.replaceState(null, '', '#' + g);
    window.dispatchEvent(new Event('resize'));
  }
  if (gtabs.length) {
    gtabs.forEach(function (t) { t.addEventListener('click', function () { openG(t.getAttribute('data-g'), true); }); });
    openG((location.hash || '').replace('#', ''), false);
  }
  var subs = document.querySelectorAll('[data-sub]');
  subs.forEach(function (b) { b.addEventListener('click', function () {
    subs.forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    document.querySelectorAll('[data-subpanel]').forEach(function (p) { p.hidden = p.getAttribute('data-subpanel') !== b.getAttribute('data-sub'); });
    window.dispatchEvent(new Event('resize'));
  }); });

  /* ---------- tabs de texto (Metodologia) ---------- */
  var ptabs = document.querySelectorAll('.tab[data-p]');
  ptabs.forEach(function (t) { t.addEventListener('click', function () {
    ptabs.forEach(function (x) { x.classList.toggle('on', x === t); });
    document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== t.getAttribute('data-p'); });
  }); });

  /* ---------- menu mobile ---------- */
  var bg = document.querySelector('.burger'), nav = document.querySelector('.nav');
  if (bg && nav) bg.addEventListener('click', function () { var o = nav.classList.toggle('open'); bg.setAttribute('aria-expanded', o); });
})();
