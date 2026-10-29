/* Data Score — gráficos e interações (sem dependências). Lê apenas agregados de data.js */
(function () {
  'use strict';
  var DS = window.DS || {};
  var NS = 'http://www.w3.org/2000/svg';
  var C = { surface: '#0F172A', text: '#F8FAFC', text2: '#CBD5E1', muted: '#94A3B8', grid: '#1E293B',
            green: '#1ea852', greenHi: '#34d06b', blue: '#3b82f6', blueHi: '#60a5fa' };
  var nf = new Intl.NumberFormat('pt-BR');
  var F = {
    int: function (n) { return nf.format(Math.round(n)); },
    compact: function (n) {
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
      if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', ',').replace(',0', '') + ' mil';
      return String(Math.round(n));
    },
    brl: function (n) { return 'R$ ' + n.toFixed(2).replace('.', ','); },
    pct: function (n) { return n.toFixed(1).replace('.', ',') + '%'; },
    d2: function (n) { return n.toFixed(2).replace('.', ','); }
  };

  /* nomes curtos */
  var SHORT = { FLA: 'Flamengo', CRU: 'Cruzeiro', COR: 'Corinthians', BAH: 'Bahia', PAL: 'Palmeiras', CEA: 'Ceará',
    FLU: 'Fluminense', SAO: 'São Paulo', CAM: 'Atlético-MG', FOR: 'Fortaleza', GRE: 'Grêmio', INT: 'Internacional',
    VAS: 'Vasco', VIT: 'Vitória', SAN: 'Santos', BOT: 'Botafogo', SPO: 'Sport', JUV: 'Juventude', MIR: 'Mirassol', RBB: 'Bragantino' };
  var shortByFull = {};
  (DS.clubes || []).forEach(function (c) { c.nome = SHORT[c.sigla] || c.clube; shortByFull[c.clube] = c.nome; });

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
  function topRound(x, y, w, h, r) { // arredonda só a ponta superior
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) +
      'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function rightRound(x, y, w, h, r) { // arredonda só a ponta direita
    r = Math.min(r, h / 2, w);
    return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z';
  }

  /* ---------- tooltip ---------- */
  var tip = document.createElement('div');
  tip.className = 'tip'; tip.setAttribute('role', 'status');
  document.body.appendChild(tip);
  function showTip(x, y, value, label, sub) {
    tip.textContent = '';
    var v = document.createElement('div'); v.className = 'tv'; v.textContent = value;
    var l = document.createElement('div'); l.className = 'tl'; l.textContent = label;
    tip.appendChild(v); tip.appendChild(l);
    if (sub) { var s = document.createElement('div'); s.className = 'ts'; s.textContent = sub; tip.appendChild(s); }
    tip.classList.add('on');
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var nx = x + 14, ny = y - h - 10;
    if (nx + w > window.innerWidth - 8) nx = x - w - 14;
    if (ny < 8) ny = y + 18;
    tip.style.left = Math.max(8, nx) + 'px'; tip.style.top = ny + 'px';
  }
  function hideTip() { tip.classList.remove('on'); }
  function focusTip(node, value, label, sub) {
    var r = node.getBoundingClientRect();
    showTip(r.left + Math.min(r.width, 80), r.top + r.height / 2, value, label, sub);
  }

  /* ---------- gráfico: barras horizontais ---------- */
  function hbar(host, items, o) {
    var W = Math.max(host.clientWidth, 280), rowH = 28, bar = 14, top = 4;
    var maxLab = 0; items.forEach(function (d) { maxLab = Math.max(maxLab, d.label.length); });
    var labW = Math.min(150, Math.max(84, maxLab * 6.6 + 8)), valW = 58;
    var H = items.length * rowH + top + (o.ref != null ? 18 : 4);
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.aria }, host);
    var max = o.max || Math.max.apply(null, items.map(function (d) { return d.value; }));
    var plotW = W - labW - valW;
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
      text(g, 0, y + rowH / 2, d.label, { fill: C.text2, size: 12, base: 'central' });
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

  /* ---------- gráfico: dispersão ---------- */
  function scatter(host, pts, o) {
    var W = Math.max(host.clientWidth, 280), H = 400, m = { l: 46, r: 16, t: 14, b: 44 };
    var svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.aria }, host);
    var xmax = niceMax(Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.05);
    var ymax = Math.ceil(Math.max.apply(null, pts.map(function (p) { return p.y; })) * 2) / 2 + 0.5;
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var sx = function (v) { return m.l + (v / xmax) * pw; }, sy = function (v) { return m.t + ph - (v / ymax) * ph; };
    for (var i = 0; i <= 4; i++) {
      var yv = ymax / 4 * i, y = sy(yv), xv = xmax / 4 * i;
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: C.grid, 'stroke-width': 1 }, svg);
      text(svg, m.l - 8, y, F.d2(yv).replace(',00', '').replace(/(,\d)0$/, '$1'), { anchor: 'end', size: 10.5, base: 'central' });
      text(svg, sx(xv), H - 26, F.compact(xv), { anchor: 'middle', size: 10.5 });
    }
    text(svg, m.l + pw / 2, H - 6, o.xlabel, { anchor: 'middle', size: 11, fill: C.text2 });
    var yl = text(svg, 12, m.t + ph / 2, o.ylabel, { anchor: 'middle', size: 11, fill: C.text2 });
    yl.setAttribute('transform', 'rotate(-90 12 ' + (m.t + ph / 2) + ')');
    // tendência (mínimos quadrados)
    var n = pts.length, mx = 0, my = 0; pts.forEach(function (p) { mx += p.x / n; my += p.y / n; });
    var sxy = 0, sxx = 0; pts.forEach(function (p) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) * (p.x - mx); });
    var b = sxy / sxx, a = my - b * mx;
    el('line', { x1: sx(0), y1: sy(a), x2: sx(xmax), y2: sy(a + b * xmax), stroke: C.muted, 'stroke-width': 1.5, 'stroke-opacity': .7 }, svg);
    pts.forEach(function (p) { p.res = p.y - (a + b * p.x); });
    var dots = pts.map(function (p) {
      var c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: 5, fill: o.color, stroke: C.surface, 'stroke-width': 2 }, svg);
      return c;
    });
    // rótulos seletivos (maiores desvios + extremos), sem colisão
    var cand = pts.slice().sort(function (p, q) { return Math.abs(q.res) - Math.abs(p.res); }).slice(0, 6);
    pts.slice().sort(function (p, q) { return q.x - p.x; }).slice(0, 2).forEach(function (p) { if (cand.indexOf(p) < 0) cand.push(p); });
    var placed = [];
    cand.forEach(function (p) {
      var w = p.label.length * 6.4 + 4, x = sx(p.x) + 9, y = sy(p.y);
      if (x + w > W - 4) x = sx(p.x) - 9 - w;
      var box = { x: x, y: y - 7, w: w, h: 14 };
      var clash = placed.some(function (q) { return box.x < q.x + q.w && box.x + box.w > q.x && box.y < q.y + q.h && box.y + box.h > q.y; });
      if (clash) return;
      placed.push(box);
      text(svg, x < sx(p.x) ? x + w - 4 : x, y, p.label, { fill: C.text2, size: 11, base: 'central', anchor: x < sx(p.x) ? 'end' : 'start' });
    });
    var hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
    function nearest(ev) {
      var r = svg.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top, best = -1, bd = 28 * 28;
      pts.forEach(function (p, i) { var dx = sx(p.x) - px, dy = sy(p.y) - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      return best;
    }
    var cur = -1;
    function clear() { if (cur >= 0) { dots[cur].setAttribute('r', 5); cur = -1; } }
    hit.addEventListener('pointermove', function (ev) {
      var i = nearest(ev); if (i !== cur) clear();
      if (i < 0) { hideTip(); return; }
      cur = i; dots[i].setAttribute('r', 7);
      showTip(ev.clientX, ev.clientY, pts[i].label, pts[i].tip);
    });
    hit.addEventListener('pointerleave', function () { clear(); hideTip(); });
  }

  /* ---------- registro dos gráficos ---------- */
  function byName(arr, key) { return arr.map(function (d) { return { label: shortByFull[d.clube] || d.clube, v: d }; }); }
  var REG = {
    'publico-clube': function (top) {
      var rows = DS.clubes.slice().sort(function (a, b) { return b.publico_medio - a.publico_medio; });
      if (top) rows = rows.slice(0, top);
      return { draw: function (h) { hbar(h, rows.map(function (c) { return { label: c.nome, value: c.publico_medio,
          sub: 'Ocupação ' + F.pct(c.ocupacao) + ' · ticket ' + F.brl(c.ticket) }; }),
          { fmt: F.int, color: C.green, hi: C.greenHi, aria: 'Público médio por mandante' }); },
        cols: ['Clube', 'Público médio'], rows: rows.map(function (c) { return [c.nome, F.int(c.publico_medio)]; }) };
    },
    'ticket-clube': function () {
      var rows = DS.clubes.slice().sort(function (a, b) { return b.ticket - a.ticket; });
      return { draw: function (h) { hbar(h, rows.map(function (c) { return { label: c.nome, value: c.ticket,
          sub: 'Público médio ' + F.int(c.publico_medio) }; }),
          { fmt: F.brl, color: C.green, hi: C.greenHi, aria: 'Ticket médio por mandante' }); },
        cols: ['Clube', 'Ticket médio'], rows: rows.map(function (c) { return [c.nome, F.brl(c.ticket)]; }) };
    },
    'visitante': function () {
      var rows = DS.atracao_visitante.map(function (d) { return { label: shortByFull[d.clube] || d.clube, value: d.indice }; });
      return { draw: function (h) { hbar(h, rows.map(function (d) { return { label: d.label, value: d.value,
          sub: d.value >= 1 ? (Math.round((d.value - 1) * 100) + '% acima da média do mandante') : (Math.round((1 - d.value) * 100) + '% abaixo da média do mandante') }; }),
          { fmt: F.d2, color: C.blue, hi: C.blueHi, max: 1.5, ref: 1, refLabel: '1,00 = média do mandante', aria: 'Índice de atração do visitante' }); },
        cols: ['Visitante', 'Índice'], rows: rows.map(function (d) { return [d.label, F.d2(d.value)]; }) };
    },
    'dia': function () {
      var rows = DS.dia;
      return { draw: function (h) { col(h, rows.map(function (d) { return { label: d.k, value: d.publico_medio, sub: d.jogos + ' jogos · ocupação ' + F.pct(d.ocupacao) }; }),
          { fmt: F.int, color: C.green, hi: C.greenHi, aria: 'Público médio por dia da semana' }); },
        cols: ['Dia', 'Jogos', 'Público médio'], rows: rows.map(function (d) { return [d.k, d.jogos, F.int(d.publico_medio)]; }) };
    },
    'faixa': function () {
      var rows = DS.faixa_hora;
      return { draw: function (h) { col(h, rows.map(function (d) { return { label: d.k, value: d.publico_medio, sub: d.jogos + ' jogos · ocupação ' + F.pct(d.ocupacao) }; }),
          { fmt: F.int, color: C.green, hi: C.greenHi, aria: 'Público médio por faixa de horário' }); },
        cols: ['Horário', 'Jogos', 'Público médio'], rows: rows.map(function (d) { return [d.k, d.jogos, F.int(d.publico_medio)]; }) };
    },
    'resultado': function () {
      var names = { VM: 'Mandante vence', E: 'Empate', VV: 'Visitante vence' };
      var rows = DS.resultado;
      return { draw: function (h) { col(h, rows.map(function (d) { return { label: names[d.k], value: d.publico_medio, sub: d.jogos + ' jogos' }; }),
          { fmt: F.int, color: C.green, hi: C.greenHi, aria: 'Público médio por resultado' }); },
        cols: ['Resultado', 'Jogos', 'Público médio'], rows: rows.map(function (d) { return [names[d.k], d.jogos, F.int(d.publico_medio)]; }) };
    },
    'regiao': function () {
      var names = { SE: 'Sudeste', NE: 'Nordeste', S: 'Sul' };
      var rows = DS.regiao.filter(function (d) { return names[d.k]; }).sort(function (a, b) { return b.ticket - a.ticket; });
      return { draw: function (h) { col(h, rows.map(function (d) { return { label: names[d.k], value: d.ticket, sub: d.jogos + ' jogos · público médio ' + F.int(d.publico_medio) }; }),
          { fmt: F.brl, axisFmt: function (v) { return 'R$ ' + Math.round(v); }, color: C.green, hi: C.greenHi, aria: 'Ticket médio por região' }); },
        cols: ['Região', 'Jogos', 'Ticket médio'], rows: rows.map(function (d) { return [names[d.k], d.jogos, F.brl(d.ticket)]; }) };
    },
    'rodada': function () {
      var rows = DS.rodada;
      return { draw: function (h) { line(h, rows.map(function (d) { return { label: String(d.r), value: d.publico_medio, tip: 'Rodada ' + d.r, sub: 'Ticket médio ' + F.brl(d.ticket) }; }),
          { fmt: F.int, color: C.green, aria: 'Público médio por rodada' }); },
        cols: ['Rodada', 'Público médio'], rows: rows.map(function (d) { return [d.r, F.int(d.publico_medio)]; }) };
    },
    'scatter': function () {
      var pts = DS.clubes.map(function (c) { return { x: c.publico_medio, y: c.pts_casa_j, label: c.nome,
        tip: F.int(c.publico_medio) + ' de público · ' + F.d2(c.pts_casa_j) + ' pts/jogo em casa' }; });
      return { draw: function (h) { scatter(h, pts, { color: C.green, xlabel: 'Público médio em casa', ylabel: 'Pontos por jogo em casa', aria: 'Público médio versus pontos em casa' }); },
        cols: ['Clube', 'Público médio', 'Pts/jogo em casa'], rows: pts.map(function (p) { return [p.label, F.int(p.x), F.d2(p.y)]; }) };
    }
  };

  function mountCard(card) {
    var key = card.getAttribute('data-chart'), arg = parseInt(card.getAttribute('data-top') || '0', 10) || 0;
    if (!REG[key]) return;
    var spec = REG[key](arg), host = card.querySelector('.plot'), tblHost = card.querySelector('.tbl-wrap');
    function draw() { hideTip(); host.textContent = ''; spec.draw(host); }
    draw();
    // tabela (alternativa acessível)
    if (tblHost) {
      var t = document.createElement('table'), th = document.createElement('thead'), trh = document.createElement('tr');
      spec.cols.forEach(function (c) { var e = document.createElement('th'); e.textContent = c; trh.appendChild(e); });
      th.appendChild(trh); t.appendChild(th);
      var tb = document.createElement('tbody');
      spec.rows.forEach(function (r) { var tr = document.createElement('tr'); r.forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); }); tb.appendChild(tr); });
      t.appendChild(tb); tblHost.appendChild(t);
    }
    var btn = card.querySelector('[data-toggle]');
    if (btn) btn.addEventListener('click', function () {
      var showT = tblHost.hidden; tblHost.hidden = !showT; host.hidden = showT; btn.textContent = showT ? 'Gráfico' : 'Tabela';
      if (!showT) draw();
    });
    if ('ResizeObserver' in window) {
      var last = host.clientWidth;
      new ResizeObserver(function () { if (!host.hidden && Math.abs(host.clientWidth - last) > 4) { last = host.clientWidth; draw(); } }).observe(host);
    }
  }
  document.querySelectorAll('.ccard[data-chart]').forEach(mountCard);

  /* ---------- KPIs ---------- */
  document.querySelectorAll('[data-kpi]').forEach(function (n) {
    var k = n.getAttribute('data-kpi'), f = n.getAttribute('data-f') || 'int', v = DS.kpi && DS.kpi[k];
    if (v == null) return; n.textContent = F[f](v);
  });

  /* ---------- tabela de clubes (agregados) ---------- */
  var tb = document.querySelector('#clubes-table tbody');
  if (tb && DS.clubes) {
    var cols = [
      { k: 'nome', t: function (c) { return c.nome; } }, { k: 'uf', t: function (c) { return c.uf; } },
      { k: 'publico_medio', t: function (c) { return F.int(c.publico_medio); } },
      { k: 'ticket', t: function (c) { return F.brl(c.ticket); } },
      { k: 'ocupacao', t: function (c) { return F.pct(c.ocupacao); } },
      { k: 'margem', t: function (c) { return F.pct(c.margem); }, neg: true },
      { k: 'pts_casa_j', t: function (c) { return F.d2(c.pts_casa_j); } }
    ];
    var sortK = 'publico_medio', asc = false, ths = document.querySelectorAll('#clubes-table th');
    function renderT() {
      var rows = DS.clubes.slice().sort(function (a, b) {
        var x = a[sortK], y = b[sortK]; if (typeof x === 'string') return asc ? x.localeCompare(y, 'pt') : y.localeCompare(x, 'pt');
        return asc ? x - y : y - x; });
      tb.textContent = '';
      rows.forEach(function (c) {
        var tr = document.createElement('tr');
        cols.forEach(function (cl) { var td = document.createElement('td'); td.textContent = cl.t(c); if (cl.neg && c[cl.k] < 0) td.className = 'neg'; tr.appendChild(td); });
        tb.appendChild(tr);
      });
      ths.forEach(function (th, i) { var on = cols[i].k === sortK; th.classList.toggle('s', on); th.classList.toggle('asc', on && asc); });
    }
    ths.forEach(function (th, i) { th.addEventListener('click', function () {
      if (sortK === cols[i].k) asc = !asc; else { sortK = cols[i].k; asc = typeof DS.clubes[0][sortK] === 'string'; } renderT(); }); });
    renderT();
  }

  /* ---------- tabs de filtro (página Dados) ---------- */
  var tabs = document.querySelectorAll('.tab[data-f]');
  tabs.forEach(function (t) { t.addEventListener('click', function () {
    tabs.forEach(function (x) { x.classList.toggle('on', x === t); });
    var f = t.getAttribute('data-f');
    document.querySelectorAll('.ccard[data-cat]').forEach(function (c) {
      var show = f === 'todas' || (' ' + c.getAttribute('data-cat') + ' ').indexOf(' ' + f + ' ') >= 0; c.style.display = show ? '' : 'none';
    });
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
