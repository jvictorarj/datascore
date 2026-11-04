/* Data Score — biblioteca comum das páginas por temporada (dados, ano, componentes). Expõe window.L e window.DSX. */
(function () {
  'use strict';
  var Y = window.DSY || {}, BR = window.DSB || { loc: {}, vb: '0 0 10 10' };
  var NS = 'http://www.w3.org/2000/svg';
  var COL = { ink: '#1B1F3B', green: '#15AD76', green2: '#298463', blue: '#2D3776', blueHi: '#6F7FE6', red: '#D2484F', gray: '#A9AEC8', grid: '#E6E8EF', mute: '#6B7088' };
  var nf = new Intl.NumberFormat('pt-BR');
  var F = {
    int: function (n) { return nf.format(Math.round(n)); },
    compact: function (n) { if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' mi'; if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.', ',').replace(',0', '') + ' mil'; return String(Math.round(n)); },
    brl: function (n) { return 'R$ ' + n.toFixed(2).replace('.', ','); },
    brlc: function (n) { var a = Math.abs(n), s = n < 0 ? '−' : ''; if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toFixed(1).replace('.', ',') + ' mi'; return s + 'R$ ' + nf.format(Math.round(a / 1e3)) + ' mil'; },
    brlfull: function (n) { return (n < 0 ? '−' : '') + 'R$ ' + nf.format(Math.round(Math.abs(n))); },
    pct: function (n) { return n.toFixed(1).replace('.', ',') + '%'; },
    d1: function (n) { return n.toFixed(1).replace('.', ','); },
    d2: function (n) { return n.toFixed(2).replace('.', ','); },
    spct: function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1).replace('.', ',') + '%'; },
    sgn: function (n, f) { return (n > 0 ? '+' : n < 0 ? '−' : '') + f(Math.abs(n)); }
  };
  function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  function sum(a, f) { var t = 0; a.forEach(function (x) { t += f(x); }); return t; }

  /* ---------- tooltip ---------- */
  var tip = mk('div', 'tip'); tip.setAttribute('role', 'status'); document.body.appendChild(tip);
  function place(x, y) { tip.classList.add('on'); var w = tip.offsetWidth, h = tip.offsetHeight, nx = x + 14, ny = y - h - 10; if (nx + w > innerWidth - 8) nx = x - w - 14; if (ny < 8) ny = y + 18; tip.style.left = Math.max(8, nx) + 'px'; tip.style.top = ny + 'px'; }
  function showTip(x, y, value, label, sub) { tip.textContent = ''; tip.appendChild(mk('div', 'tv', value)); tip.appendChild(mk('div', 'tl', label)); if (sub) tip.appendChild(mk('div', 'ts', sub)); place(x, y); }
  function hideTip() { tip.classList.remove('on'); }

  /* ---------- cores dos clubes (só enfeite, não são escudos) ---------- */
  var K = '#111111', W = '#FFFFFF';
  function alt(a, b, n) { var r = []; for (var i = 0; i < n; i++) r.push([i % 2 ? b : a, 1]); return r; }
  var TC = {
    FLA: ['h', alt('#D4001A', K, 6)], PAL: ['h', [['#006437', 1]]], CRU: ['h', [['#0033A0', 1]]], COR: ['h', [[W, 3], [K, 1]]],
    BAH: ['v', [['#0057B8', 1], [W, 1], ['#E4002B', 1]]], CEA: ['v', [[W, 3], [K, 1], [W, 3], [K, 1], [W, 3]]],
    FLU: ['v', [['#7B1E3A', 3], [W, 1], ['#006A4E', 3], [W, 1], ['#7B1E3A', 3], [W, 1], ['#006A4E', 3]]], SAO: ['h', [[W, 3], ['#E4002B', 1], [K, 1], [W, 3]]],
    CAM: ['v', alt(K, W, 5)], FOR: ['h', [['#00539F', 1], [W, 1], ['#D2232A', 1], ['#00539F', 1], [W, 1], ['#D2232A', 1]]],
    GRE: ['v', [['#0D80BF', 2], [K, 1], [W, 1], ['#0D80BF', 2], [K, 1], [W, 1]]], INT: ['h', [['#E5050F', 1]]], VAS: ['d', [[W, 2], [K, 1], [W, 2]]],
    VIT: ['v', alt('#D4001A', K, 6)], SAN: ['h', [[W, 1]]], BOT: ['v', [[K, 3], [W, 1], [K, 3], [W, 1], [K, 3]]], SPO: ['v', alt('#D4001A', K, 6), '#F2C200'],
    JUV: ['v', alt('#006437', W, 6)], MIR: ['h', [['#FCDD09', 2], ['#00A859', 1]]], RBB: ['h', [[W, 3], ['#D4001A', 1]]],
    CFC: ['v', [['#00553A', 1], [W, 1]]], CAP: ['v', alt('#C8102E', K, 6)], CHA: ['h', [['#00A859', 1]]], REM: ['h', [['#0A3A8C', 3], [W, 1]]]
  };
  function dot(s) {
    var sp = TC[s] || ['h', [['#999999', 1]]], tot = 0, acc = 0, st = [];
    sp[1].forEach(function (p) { tot += p[1]; });
    sp[1].forEach(function (p) { var a0 = acc / tot * 100; acc += p[1]; st.push(p[0] + ' ' + a0.toFixed(2) + '% ' + (acc / tot * 100).toFixed(2) + '%'); });
    var d = mk('span', 'tdot'); d.style.background = 'linear-gradient(' + (sp[0] === 'h' ? 'to bottom' : sp[0] === 'v' ? 'to right' : '135deg') + ',' + st.join(',') + ')';
    if (sp[2]) d.style.background = 'linear-gradient(to bottom,transparent 0 24%,' + sp[2] + ' 24% 36%,transparent 36%),' + d.style.background;
    d.setAttribute('aria-hidden', 'true'); return d;
  }
  window.DSX = { dot: dot, F: F, mk: mk, el: el, showTip: showTip, hideTip: hideTip };

  /* ---------- geografia ---------- */
  var REG = { SP: 'Sudeste', RJ: 'Sudeste', MG: 'Sudeste', ES: 'Sudeste', PR: 'Sul', SC: 'Sul', RS: 'Sul', BA: 'Nordeste', CE: 'Nordeste', PE: 'Nordeste', MA: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', PB: 'Nordeste', AL: 'Nordeste', SE: 'Nordeste', DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste', AM: 'Norte', PA: 'Norte', AC: 'Norte', RO: 'Norte', RR: 'Norte', AP: 'Norte', TO: 'Norte' };
  var REGS = ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte'];
  var UFN = {}; for (var k in BR.loc) UFN[k] = BR.loc[k].n;
  function nm(s) { return Y.times[s] ? Y.times[s][0] : s; }
  function cuf(s) { return Y.times[s] ? Y.times[s][1] : ''; }

  /* ---------- dados por temporada ---------- */
  var cache = {};
  function games(y) {
    y = String(y); if (cache[y]) return cache[y];
    var raw = (Y.jogos || {})[y] || [];
    cache[y] = raw.map(function (r) {
      var d = new Date(r[1] + 'T12:00:00Z');
      return { rod: r[0], date: r[1], hora: r[2], h: r[3], a: r[4], e: Y.est[r[5]][0], uf: Y.est[r[5]][1], gh: r[6], ga: r[7], pub: r[8], pag: r[9], renda: r[10], desp: r[11], tk: r[12], cap: r[13],
        played: r[6] != null, has: r[8] != null && r[10] != null, turno: r[0] <= 19 ? 1 : 2, dow: d.getUTCDay() };
    });
    return cache[y];
  }
  function has(y) { return !!((Y.jogos || {})[String(y)]); }
  function pubGames(y, maxRod) { return games(y).filter(function (g) { return g.has && (maxRod == null || g.rod <= maxRod); }); }
  function lastFull(y) { /* última rodada em que todos os jogos já têm público e renda */
    var gs = games(y), r = 0; for (var i = 1; i <= 38; i++) { var rr = gs.filter(function (g) { return g.rod === i; }); if (rr.length && rr.every(function (g) { return g.has; })) r = i; else break; } return r;
  }
  function isPartial(y) { return lastFull(y) < 38; }
  function agg(gs) {
    var n = gs.length, pub = sum(gs, function (g) { return g.pub; }), renda = sum(gs, function (g) { return g.renda; }), desp = sum(gs, function (g) { return g.desp || 0; });
    return { j: n, pub: pub, renda: renda, desp: desp, lucro: renda - desp, pm: n ? pub / n : 0, rm: n ? renda / n : 0,
      tk: n ? mean(gs.map(function (g) { return g.tk; })) : 0, oc: n ? mean(gs.map(function (g) { return g.pub / g.cap; })) * 100 : 0,
      cpp: pub ? desp / pub : 0, lpp: pub ? (renda - desp) / pub : 0, mg: renda ? (renda - desp) / renda * 100 : 0 };
  }
  function pts(g, side) { var a = side === 'h' ? g.gh : g.ga, b = side === 'h' ? g.ga : g.gh; return a > b ? 3 : a === b ? 1 : 0; }
  function groupBy(gs, f) { var o = {}; gs.forEach(function (g) { var k = f(g); (o[k] = o[k] || []).push(g); }); return o; }
  /* tabela de clubes de uma temporada (como mandante) + pontos até a rodada maxRod */
  function clubs(y, maxRod) {
    var all = games(y).filter(function (g) { return maxRod == null || g.rod <= maxRod; }), byH = groupBy(all.filter(function (g) { return g.has; }), function (g) { return g.h; }), P = {}, out = [];
    all.forEach(function (g) { if (!g.played) return; P[g.h] = P[g.h] || { p: 0, j: 0, gp: 0, gc: 0 }; P[g.a] = P[g.a] || { p: 0, j: 0, gp: 0, gc: 0 };
      P[g.h].p += pts(g, 'h'); P[g.a].p += pts(g, 'a'); P[g.h].j++; P[g.a].j++; P[g.h].gp += g.gh; P[g.h].gc += g.ga; P[g.a].gp += g.ga; P[g.a].gc += g.gh; });
    Object.keys(byH).forEach(function (s) { var a = agg(byH[s]), q = P[s] || { p: 0, j: 0, gp: 0, gc: 0 }; a.s = s; a.n = nm(s); a.uf = cuf(s); a.pts = q.p; a.pj = q.j; a.rpp = q.p ? a.renda / q.p : null; a.dpp = q.p ? a.desp / q.p : null; out.push(a); });
    return out;
  }
  function ibf(y) { return ((Y.ibf || {})[String(y)]) || []; }

  /* ---------- ano selecionado ---------- */
  var avail = (Y.anos || []).filter(has), def = (function () { var c = avail.filter(function (y) { return !isPartial(y); }); return String(c.length ? c[c.length - 1] : avail[avail.length - 1]); })();
  var cur = def, subs = [];
  try { var q = /[?&]ano=(\d{4})/.exec(location.search), sv = q ? q[1] : localStorage.getItem('ds_ano'); if (sv && has(sv)) cur = String(sv); } catch (e) { }
  function setYear(y) { y = String(y); if (!has(y) || y === cur) return; cur = y; try { localStorage.setItem('ds_ano', y); } catch (e) { } subs.forEach(function (f) { f(cur); }); }
  function yearBar(host) {
    host.textContent = ''; host.classList.add('yearbar');
    host.appendChild(mk('span', 'yl', 'Temporada'));
    var seg = mk('div', 'yseg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Escolher a temporada');
    (Y.anos || []).forEach(function (y) {
      var ok = has(y), b = mk('button', (String(y) === cur ? 'on' : '') + (ok ? '' : ' off'), String(y)); b.type = 'button';
      if (!ok) { b.disabled = true; b.title = 'Em breve'; b.appendChild(mk('small', null, 'em breve')); } else if (isPartial(y)) { b.appendChild(mk('small', null, 'parcial')); b.title = 'Temporada em andamento (até a rodada ' + lastFull(y) + ' com público e renda)'; }
      b.addEventListener('click', function () { setYear(y); }); seg.appendChild(b);
    });
    host.appendChild(seg);
    subs.push(function (y) { [].forEach.call(seg.children, function (b) { b.classList.toggle('on', b.firstChild.textContent === y); }); });
  }

  /* ---------- componentes de interface ---------- */
  function seg(parent, label, opts, curv, cb) {
    var wrap = mk('div', 'fgroup'); if (label) wrap.appendChild(mk('span', 'flabel', label));
    var s = mk('div', 'seg'); s.setAttribute('role', 'group'); if (label) s.setAttribute('aria-label', label);
    opts.forEach(function (o) { var b = mk('button', o[0] === curv ? 'on' : '', o[1]); b.type = 'button'; b.setAttribute('aria-pressed', o[0] === curv ? 'true' : 'false');
      b.addEventListener('click', function () { [].forEach.call(s.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); }); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); cb(o[0]); }); s.appendChild(b); });
    wrap.appendChild(s); parent.appendChild(wrap); return wrap;
  }
  function selectBox(parent, label, id, opts, curv, cb) {
    var wrap = mk('div', 'fgroup'), lb = mk('label', 'flabel', label), s = mk('select', 'sel'); lb.setAttribute('for', id); s.id = id;
    opts.forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; s.appendChild(op); }); s.value = curv; s.addEventListener('change', function () { cb(s.value); });
    wrap.appendChild(lb); wrap.appendChild(s); parent.appendChild(wrap); return s;
  }
  function onResize(host, draw) { draw(); if ('ResizeObserver' in window) { var lw = host.clientWidth; new ResizeObserver(function () { if (Math.abs(host.clientWidth - lw) > 4) { lw = host.clientWidth; draw(); } }).observe(host); } }
  function box(parent, title, sub) { var b = mk('div', 'mvb'); if (title) b.appendChild(mk('div', 'flabel', title)); if (sub) b.appendChild(mk('p', 'sub0', sub)); parent.appendChild(b); return b; }
  function clubCell(s, text) { var sp = mk('span', 'cn'); sp.appendChild(dot(s)); sp.appendChild(document.createTextNode(text || nm(s))); return sp; }
  function lerp(c1, c2, t) { var a = [1, 3, 5].map(function (i) { return parseInt(c1.substr(i, 2), 16); }), b = [1, 3, 5].map(function (i) { return parseInt(c2.substr(i, 2), 16); }); return '#' + a.map(function (v, i) { var x = Math.round(v + (b[i] - v) * t).toString(16); return x.length < 2 ? '0' + x : x; }).join(''); }
  function ramp(t) { return t < .5 ? lerp('#E1F4EB', '#4FC79B', t * 2) : lerp('#4FC79B', '#0B6B4B', (t - .5) * 2); }
  function div(t) { return t >= 0 ? lerp('#F2F3F7', '#15AD76', Math.min(1, t)) : lerp('#F2F3F7', '#D2484F', Math.min(1, -t)); }
  function tbl(heads, rows, o) {
    o = o || {}; var bx = mk('div', 'tbl-box'), sc = mk('div', 'tbl-scroll'), t = mk('table', 'dt an-t'), th = mk('thead'), tr = mk('tr');
    heads.forEach(function (h) { var c = mk('th', null, h[0]); if (h[1]) c.setAttribute('data-num', ''); if (h[2]) c.title = h[2]; tr.appendChild(c); }); th.appendChild(tr); t.appendChild(th);
    var tb = mk('tbody');
    rows.forEach(function (r) { var rr = mk('tr'); r.forEach(function (c, i) { var td = mk('td'); if (heads[i][1]) td.setAttribute('data-num', '');
      if (c && c.nodeType) td.appendChild(c); else if (c && typeof c === 'object') { if (c.node) td.appendChild(c.node); else td.textContent = c.t; if (c.bg) td.style.background = c.bg; if (c.c) td.style.color = c.c; if (c.b) td.style.fontWeight = 700; if (c.title) td.title = c.title; } else td.textContent = c == null ? '—' : c;
      rr.appendChild(td); }); tb.appendChild(rr); });
    t.appendChild(tb); sc.appendChild(t); bx.appendChild(sc); return bx;
  }
  function barList(parent, items, fmt, o) {
    o = o || {}; var ul = mk('ol', 'barlist'), mx = Math.max.apply(null, items.map(function (x) { return Math.abs(x.v); })) || 1;
    items.forEach(function (x, i) {
      var li = mk('li'); li.appendChild(mk('span', 'bn', o.noRank ? '' : String(i + 1))); var n = mk('span', 'bl'); if (x.club) n.appendChild(dot(x.club)); n.appendChild(document.createTextNode(x.n)); li.appendChild(n);
      var tr = mk('span', 'bt'), b = mk('i'); b.style.width = (Math.abs(x.v) / mx * 100) + '%'; b.style.background = o.div ? (x.v >= 0 ? COL.green : COL.red) : (o.color || COL.green2); tr.appendChild(b); li.appendChild(tr);
      li.appendChild(mk('b', 'bv', fmt(x.v))); if (x.sub) li.title = x.sub; ul.appendChild(li);
    }); parent.appendChild(ul); return ul;
  }
  function legend(parent, items) { var lg = mk('div', 'llg an-lg'); items.forEach(function (x) { var sp = mk('span'), sw = mk('i'); sw.style.background = x[1]; sp.appendChild(sw); sp.appendChild(document.createTextNode(x[0])); lg.appendChild(sp); }); parent.appendChild(lg); return lg; }
  function legendBar(parent, a, b, divg) {
    var lg = mk('div', 'maplg'); lg.appendChild(mk('span', null, a)); var i0 = mk('i'); i0.style.background = divg ? 'linear-gradient(90deg,#D2484F,#F2F3F7,#15AD76)' : 'linear-gradient(90deg,#E1F4EB,#4FC79B,#0B6B4B)'; lg.appendChild(i0); lg.appendChild(mk('span', null, b));
    var na = mk('span', 'na'), ni = mk('i'); na.appendChild(ni); na.appendChild(document.createTextNode('sem jogos')); lg.appendChild(na); parent.appendChild(lg);
  }
  function brMap(host, vals, fmt, o) {
    o = o || {}; host.textContent = '';
    var vs = Object.keys(vals).map(function (u) { return vals[u]; }), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
    var svg = el('svg', { viewBox: BR.vb, class: 'brmap', role: 'img', 'aria-label': o.label || 'Mapa do Brasil por estado' }, host), lab = [];
    Object.keys(BR.loc).forEach(function (u) {
      var Lc = BR.loc[u], hv = vals[u] != null, t = hv && mx > mn ? (vals[u] - mn) / (mx - mn) : hv ? 1 : 0;
      var p = el('path', { d: Lc.d, fill: hv ? (o.div ? div(vals[u] / (Math.max(Math.abs(mn), Math.abs(mx)) || 1)) : ramp(t)) : '#EEF0F5', stroke: '#fff', 'stroke-width': 1.2, tabindex: hv ? 0 : -1, 'data-uf': u }, svg);
      if (hv) { p.style.cursor = 'pointer';
        var show = function (ev) { var r = p.getBoundingClientRect(), f = ev && ev.type !== 'focus'; showTip(f ? ev.clientX : r.left + r.width / 2, f ? ev.clientY : r.top + r.height / 2, fmt(vals[u]), Lc.n + ' (' + u + ')', o.sub ? o.sub(u) : ''); p.setAttribute('stroke', COL.ink); p.setAttribute('stroke-width', 2); svg.appendChild(p); };
        var off = function () { hideTip(); p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', 1.2); };
        p.addEventListener('pointermove', show); p.addEventListener('pointerleave', off); p.addEventListener('focus', show); p.addEventListener('blur', off); lab.push([u, p, t]); }
    });
    lab.forEach(function (x) { var bb = x[1].getBBox(), tx = el('text', { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 14, 'font-weight': 800, fill: x[2] > .55 ? '#fff' : COL.ink, 'pointer-events': 'none' }, svg); tx.textContent = x[0]; });
    return svg;
  }
  function scatter(host, pts, o) {
    host.textContent = '';
    var Wd = Math.max(host.clientWidth, 300), H = o.h || Math.min(520, Math.max(340, Wd * .62)), m = { l: 58, r: 22, t: 16, b: 50 };
    var svg = el('svg', { viewBox: '0 0 ' + Wd + ' ' + H, width: Wd, height: H, role: 'img', 'aria-label': o.aria || 'Gráfico de dispersão' }, host);
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    function ext(v, z) { var a = Math.min.apply(null, v), b = Math.max.apply(null, v); if (z) { a = Math.min(a, 0); b = Math.max(b, 0); } var pad = (b - a) * .08 || 1; return [a - pad, b + pad]; }
    var ex = o.ex || ext(xs, o.zero), ey = o.ey || ext(ys, o.zero), pw = Wd - m.l - m.r, ph = H - m.t - m.b;
    var sx = function (v) { return m.l + (v - ex[0]) / (ex[1] - ex[0]) * pw; }, sy = function (v) { return m.t + (1 - (v - ey[0]) / (ey[1] - ey[0])) * ph; };
    function ticks(a, b) { var span = b - a, st = Math.pow(10, Math.floor(Math.log10(span / 5))), r = span / 5 / st; st *= r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1; var t = [], v = Math.ceil(a / st) * st; for (; v <= b + 1e-9; v += st) t.push(+v.toFixed(6)); return t; }
    ticks(ex[0], ex[1]).forEach(function (v) { el('line', { x1: sx(v), x2: sx(v), y1: m.t, y2: m.t + ph, stroke: COL.grid, 'stroke-width': 1 }, svg); var t = el('text', { x: sx(v), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: COL.mute }, svg); t.textContent = o.fx(v); });
    ticks(ey[0], ey[1]).forEach(function (v) { el('line', { x1: m.l, x2: Wd - m.r, y1: sy(v), y2: sy(v), stroke: COL.grid, 'stroke-width': 1 }, svg); var t = el('text', { x: m.l - 8, y: sy(v), 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 11, fill: COL.mute }, svg); t.textContent = o.fy(v); });
    if (o.zx != null && o.zx > ex[0] && o.zx < ex[1]) el('line', { x1: sx(o.zx), x2: sx(o.zx), y1: m.t, y2: m.t + ph, stroke: '#9AA0BC', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
    if (o.zy != null && o.zy > ey[0] && o.zy < ey[1]) el('line', { x1: m.l, x2: Wd - m.r, y1: sy(o.zy), y2: sy(o.zy), stroke: '#9AA0BC', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
    if (o.diag) { var a0 = Math.max(ex[0], ey[0]), b0 = Math.min(ex[1], ey[1]); el('line', { x1: sx(a0), y1: sy(a0), x2: sx(b0), y2: sy(b0), stroke: '#9AA0BC', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg); }
    var xl = el('text', { x: m.l + pw / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: COL.ink }, svg); xl.textContent = o.xl;
    var yl = el('text', { x: 14, y: m.t + ph / 2, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: COL.ink, transform: 'rotate(-90 14 ' + (m.t + ph / 2) + ')' }, svg); yl.textContent = o.yl;
    var r = o.r || 6, placed = [];
    function freeY(x, y, w) { var offs = [0, 11, -11, 22, -22, 33, -33]; for (var i = 0; i < offs.length; i++) { var yy = y + offs[i], ok = true; for (var j = 0; j < placed.length; j++) { var q = placed[j]; if (Math.abs(q[1] - yy) < 11 && x < q[0] + q[2] && q[0] < x + w) { ok = false; break; } } if (ok) { placed.push([x, yy, w]); return yy; } } placed.push([x, y, w]); return y; }
    pts.forEach(function (p) {
      var g = el('g', { tabindex: 0, class: 'sp', 'aria-label': p.label + ': ' + p.tip }, svg), cx = sx(p.x), cy = sy(p.y);
      el('circle', { cx: cx, cy: cy, r: p.r || r, fill: p.color, 'fill-opacity': o.alpha || .9, stroke: '#fff', 'stroke-width': 1.5 }, g);
      if (o.labels !== false) { var lx = cx + (p.r || r) + 4, ly = freeY(lx, cy, p.k.length * 7 + 4), t = el('text', { x: lx, y: ly, 'dominant-baseline': 'central', 'font-size': 10.5, 'font-weight': 700, fill: COL.ink, 'pointer-events': 'none' }, g); t.textContent = p.k; }
      var show = function (ev) { var b = g.getBoundingClientRect(), f = ev.type !== 'focus'; showTip(f ? ev.clientX : b.left + b.width / 2, f ? ev.clientY : b.top, p.label, p.tip, p.sub); };
      g.addEventListener('pointermove', show); g.addEventListener('focus', show); g.addEventListener('pointerleave', hideTip); g.addEventListener('blur', hideTip);
    });
  }
  /* aviso de temporada parcial */
  function partialNote(y, parent) {
    if (!isPartial(y)) return null; var p = mk('p', 'partial', 'Temporada ' + y + ' em andamento: os números de público e renda valem até a rodada ' + lastFull(y) + '.'); parent.appendChild(p); return p;
  }
  window.L = { Y: Y, BR: BR, COL: COL, F: F, mk: mk, el: el, mean: mean, sum: sum, dot: dot, showTip: showTip, hideTip: hideTip, REG: REG, REGS: REGS, UFN: UFN, nm: nm, cuf: cuf,
    games: games, pubGames: pubGames, has: has, lastFull: lastFull, isPartial: isPartial, agg: agg, pts: pts, groupBy: groupBy, clubs: clubs, ibf: ibf, avail: avail,
    year: function () { return cur; }, setYear: setYear, onYear: function (f) { subs.push(f); }, yearBar: yearBar,
    seg: seg, selectBox: selectBox, onResize: onResize, box: box, clubCell: clubCell, div: div, ramp: ramp, tbl: tbl, barList: barList, legend: legend, legendBar: legendBar, brMap: brMap, scatter: scatter, partialNote: partialNote };
})();
