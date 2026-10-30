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
  function standings(lo, hi, mando) {
    var rows = TEAMS.map(function (t) {
      var w = 0, e = 0, d = 0, gp = 0, gc = 0;
      for (var i = lo - 1; i < hi; i++) {
        var r = RES[t.s][i];
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

  var stTable = document.getElementById('st-table');
  if (stTable && TEAMS.length) (function () {
    var S = { turno: 'todos', hi: 38, mando: 'todos' };
    var sel = document.getElementById('st-rod'), body = stTable.querySelector('tbody'), note = document.getElementById('st-note'), zleg = document.getElementById('st-zleg');
    function range() { return S.turno === '2' ? [20, 38] : S.turno === '1' ? [1, 19] : [1, 38]; }
    function fillRod() {
      var r = range(); sel.textContent = '';
      for (var i = r[0]; i <= r[1]; i++) { var o = mk('option', null, i === r[1] && r[1] === 38 && r[0] === 1 ? 'Rodada 38 (final)' : 'Rodada ' + i); o.value = i; sel.appendChild(o); }
      if (S.hi < r[0] || S.hi > r[1]) S.hi = r[1];
      sel.value = S.hi;
    }
    function td(cls, txt) { return mk('td', cls, txt); }
    function render() {
      var r = range(), rows = standings(r[0], S.hi, S.mando), zones = S.mando === 'todos';
      body.textContent = '';
      rows.forEach(function (x, i) {
        var tr = mk('tr', zones ? (i < 4 ? 'g4' : i >= 16 ? 'z4' : '') : '');
        var c0 = mk('td'); c0.appendChild(mk('span', 'pos', String(i + 1))); c0.appendChild(document.createTextNode(x.n)); tr.appendChild(c0);
        tr.appendChild(td('p', x.pts)); tr.appendChild(td('', x.j)); tr.appendChild(td('', x.v)); tr.appendChild(td('', x.e)); tr.appendChild(td('', x.d));
        tr.appendChild(td('', x.gp)); tr.appendChild(td('', x.gc));
        tr.appendChild(td(x.sg > 0 ? 'sgp' : x.sg < 0 ? 'sgn' : '', (x.sg > 0 ? '+' : '') + x.sg));
        tr.appendChild(td('', x.ap == null ? '—' : F.pct(x.ap)));
        body.appendChild(tr);
      });
      zleg.hidden = !zones;
      var turnoTxt = S.turno === '1' ? '1º turno' : S.turno === '2' ? '2º turno' : 'campeonato inteiro';
      var mandoTxt = S.mando === 'casa' ? 'somente jogos como mandante' : S.mando === 'fora' ? 'somente jogos como visitante' : 'todos os jogos';
      note.textContent = turnoTxt.charAt(0).toUpperCase() + turnoTxt.slice(1) + ' · rodadas ' + r[0] + ' a ' + S.hi + ' · ' + mandoTxt + '.';
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
    sel.addEventListener('change', function () { S.hi = parseInt(sel.value, 10); render(); });
    fillRod(); render();
  })();

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
    var POS = {}, PTS = {};
    TEAMS.forEach(function (t) { POS[t.s] = []; PTS[t.s] = []; });
    for (var r = 1; r <= 38; r++) standings(1, r, 'todos').forEach(function (x, i) { POS[x.s].push(i + 1); PTS[x.s].push(x.pts); });
    var selA = document.getElementById('evo-a'), selB = document.getElementById('evo-b'), leg = document.getElementById('evo-leg');
    var host = evoCard.querySelector('.plot'), tblHost = evoCard.querySelector('.tbl-wrap'), btn = evoCard.querySelector('[data-toggle]');
    var byName = TEAMS.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'pt'); });
    byName.forEach(function (t) { var a = mk('option', null, t.n); a.value = t.s; selA.appendChild(a); var b = mk('option', null, t.n); b.value = t.s; selB.appendChild(b); });
    var none = mk('option', null, '— nenhum —'); none.value = ''; selB.insertBefore(none, selB.firstChild);
    selA.value = 'FLA'; selB.value = 'PAL';
    var nameOf = {}; TEAMS.forEach(function (t) { nameOf[t.s] = t.n; });
    var prevA = selA.value, prevB = selB.value;
    function series() {
      var s = [{ id: selA.value, color: C.green }];
      if (selB.value) s.push({ id: selB.value, color: C.blue });
      return s.map(function (x) { return { id: x.id, name: nameOf[x.id], color: x.color, pos: POS[x.id], pts: PTS[x.id] }; });
    }
    function legend(i, ser) {
      leg.textContent = '';
      ser.forEach(function (s) {
        var sp = mk('span'), sw = mk('i'); sw.style.background = s.color; sp.appendChild(sw);
        sp.appendChild(document.createTextNode(s.name + ' '));
        sp.appendChild(mk('em', null, s.pos[i] + 'º · ' + s.pts[i] + ' pts' + (i === 37 ? ' (rodada 38)' : ' (rodada ' + (i + 1) + ')')));
        leg.appendChild(sp);
      });
    }
    function table(ser) {
      tblHost.textContent = '';
      var rows = []; for (var i = 0; i < 38; i++) rows.push([i + 1].concat(ser.map(function (s) { return s.pos[i] + 'º (' + s.pts[i] + ' pts)'; })));
      tblHost.appendChild(tableOf({ cols: ['Rodada'].concat(ser.map(function (s) { return s.name; })), rows: rows }));
    }
    function draw() {
      var ser = series(); hideTip(); host.textContent = '';
      var aria = 'Posição na classificação por rodada: ' + ser.map(function (s) { return s.name; }).join(' e ') + '.';
      evoChart(host, ser, { aria: aria, onIdx: function (i) { legend(i, ser); } });
      legend(37, ser); table(ser);
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
    draw();
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
