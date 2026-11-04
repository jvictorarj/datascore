/* Data Score — páginas de análises: IBF, estados e regiões (mapa), custos e lucro. */
(function () {
  'use strict';
  var DS = window.DS || {}, A = window.DSA || {}, X = window.DSX;
  if (!DS.g || !X) return;
  var F = X.F, mk = X.mk, el = X.el, dot = X.dot;
  var TM = DS.tab.times, ROWS = DS.g.rows;
  var NM = {}; TM.forEach(function (t) { NM[t.s] = t.n; });
  var CUF = {}; DS.clubes.forEach(function (c) { CUF[c.s] = c.uf; });
  var ESTUF = {}; DS.estadios.forEach(function (e) { ESTUF[e.nome] = e.uf; });
  var UFN = {}; if (A.br) for (var k in A.br.loc) UFN[k] = A.br.loc[k].n;
  var REG = { SP: 'Sudeste', RJ: 'Sudeste', MG: 'Sudeste', ES: 'Sudeste', PR: 'Sul', SC: 'Sul', RS: 'Sul',
    BA: 'Nordeste', CE: 'Nordeste', PE: 'Nordeste', MA: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', PB: 'Nordeste', AL: 'Nordeste', SE: 'Nordeste',
    DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
    AM: 'Norte', PA: 'Norte', AC: 'Norte', RO: 'Norte', RR: 'Norte', AP: 'Norte', TO: 'Norte' };
  var COL = { ink: '#1B1F3B', green: '#15AD76', green2: '#298463', blue: '#2D3776', blueHi: '#6F7FE6', red: '#D2484F', gray: '#A9AEC8', grid: '#E6E8EF', mute: '#6B7088' };
  var G = ROWS.map(function (w) {
    return { w: w, rod: w[0], h: TM[w[2]].s, a: TM[w[3]].s, gh: w[4], ga: w[5], pub: w[9], renda: w[11], desp: w[12], lucro: w[13], tk: w[14], cap: w[15],
      uf: ESTUF[DS.g.est[w[7]]], est: DS.g.est[w[7]], turno: w[0] <= 19 ? 1 : 2 };
  });

  /* ---------- utilidades ---------- */
  function sgn(n, f) { return (n > 0 ? '+' : n < 0 ? '−' : '') + f(Math.abs(n)); }
  function pc1(n) { return F.pct(n); }
  function d1(n) { return n.toFixed(1).replace('.', ','); }
  function spct(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1).replace('.', ',') + '%'; }
  function seg(parent, label, opts, cur, cb) {
    var wrap = mk('div', 'fgroup'); if (label) wrap.appendChild(mk('span', 'flabel', label));
    var s = mk('div', 'seg'); s.setAttribute('role', 'group'); if (label) s.setAttribute('aria-label', label);
    opts.forEach(function (o) {
      var b = mk('button', o[0] === cur ? 'on' : '', o[1]); b.type = 'button'; b.setAttribute('aria-pressed', o[0] === cur ? 'true' : 'false');
      b.addEventListener('click', function () {
        [].forEach.call(s.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); cb(o[0]);
      }); s.appendChild(b);
    }); wrap.appendChild(s); parent.appendChild(wrap); return wrap;
  }
  function selectBox(parent, label, id, opts, cur, cb) {
    var wrap = mk('div', 'fgroup'), lb = mk('label', 'flabel', label), s = mk('select', 'sel'); lb.setAttribute('for', id); s.id = id;
    opts.forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; s.appendChild(op); }); s.value = cur;
    s.addEventListener('change', function () { cb(s.value); }); wrap.appendChild(lb); wrap.appendChild(s); parent.appendChild(wrap); return s;
  }
  function onResize(host, draw) {
    draw(); if ('ResizeObserver' in window) { var lw = host.clientWidth; new ResizeObserver(function () { if (Math.abs(host.clientWidth - lw) > 4) { lw = host.clientWidth; draw(); } }).observe(host); }
  }
  function box(parent, title, sub) {
    var b = mk('div', 'mvb'); if (title) b.appendChild(mk('div', 'flabel', title)); if (sub) b.appendChild(mk('p', 'sub0', sub)); parent.appendChild(b); return b;
  }
  function clubCell(s, text) { var sp = mk('span', 'cn'); sp.appendChild(dot(s)); sp.appendChild(document.createTextNode(text || NM[s])); return sp; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  function sum(a, f) { var t = 0; a.forEach(function (x) { t += f(x); }); return t; }
  function agg(gs) {
    var n = gs.length, pub = sum(gs, function (g) { return g.pub; }), renda = sum(gs, function (g) { return g.renda; }), desp = sum(gs, function (g) { return g.desp; });
    return { j: n, pub: pub, renda: renda, desp: desp, lucro: renda - desp, pm: n ? pub / n : 0, rm: n ? renda / n : 0,
      tk: n ? mean(gs.map(function (g) { return g.tk; })) : 0, oc: n ? mean(gs.map(function (g) { return g.pub / g.cap; })) * 100 : 0,
      cpp: pub ? desp / pub : 0, lpp: pub ? (renda - desp) / pub : 0, mg: renda ? (renda - desp) / renda * 100 : 0 };
  }
  function lerp(c1, c2, t) {
    var a = [1, 3, 5].map(function (i) { return parseInt(c1.substr(i, 2), 16); }), b = [1, 3, 5].map(function (i) { return parseInt(c2.substr(i, 2), 16); });
    return '#' + a.map(function (v, i) { var x = Math.round(v + (b[i] - v) * t).toString(16); return x.length < 2 ? '0' + x : x; }).join('');
  }
  function ramp(t) { return t < .5 ? lerp('#E1F4EB', '#4FC79B', t * 2) : lerp('#4FC79B', '#0B6B4B', (t - .5) * 2); }
  function div(t) { /* t em [-1,1]: vermelho ← neutro → verde */ return t >= 0 ? lerp('#F2F3F7', '#15AD76', Math.min(1, t)) : lerp('#F2F3F7', '#D2484F', Math.min(1, -t)); }
  function tbl(heads, rows, o) {
    o = o || {};
    var bx = mk('div', 'tbl-box'), sc = mk('div', 'tbl-scroll'), t = mk('table', 'dt an-t'), th = mk('thead'), tr = mk('tr');
    heads.forEach(function (h, i) { var c = mk('th', null, h[0]); if (h[1]) c.setAttribute('data-num', ''); if (h[2]) c.title = h[2]; tr.appendChild(c); });
    th.appendChild(tr); t.appendChild(th); var tb = mk('tbody');
    rows.forEach(function (r) {
      var rr = mk('tr'); r.forEach(function (c, i) {
        var td = mk('td'); if (heads[i][1]) td.setAttribute('data-num', '');
        if (c && c.nodeType) td.appendChild(c); else if (c && typeof c === 'object') { if (c.node) td.appendChild(c.node); else td.textContent = c.t; if (c.bg) td.style.background = c.bg; if (c.c) td.style.color = c.c; if (c.b) td.style.fontWeight = 700; if (c.title) td.title = c.title; } else td.textContent = c;
        rr.appendChild(td);
      }); tb.appendChild(rr);
    }); t.appendChild(tb); sc.appendChild(t); bx.appendChild(sc); return bx;
  }

  /* ---------- mapa do Brasil ---------- */
  /* vals: { UF: número }; fmt: formata; hi: UFs com contorno */
  function brMap(host, vals, fmt, o) {
    o = o || {}; host.textContent = '';
    var vs = Object.keys(vals).map(function (u) { return vals[u]; }), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
    var svg = el('svg', { viewBox: A.br.vb, class: 'brmap', role: 'img', 'aria-label': o.label || 'Mapa do Brasil por estado' }, host);
    var lab = [];
    Object.keys(A.br.loc).forEach(function (u) {
      var L = A.br.loc[u], has = vals[u] != null, t = has && mx > mn ? (vals[u] - mn) / (mx - mn) : has ? 1 : 0;
      var p = el('path', { d: L.d, fill: has ? (o.div ? div(vals[u] / Math.max(Math.abs(mn), Math.abs(mx))) : ramp(t)) : '#EEF0F5', stroke: '#fff', 'stroke-width': 1.2, tabindex: has ? 0 : -1, 'data-uf': u }, svg);
      if (has) {
        p.style.cursor = 'pointer';
        var show = function (ev) { var r = p.getBoundingClientRect(); X.showTip(ev && ev.clientX != null && ev.type !== 'focus' ? ev.clientX : r.left + r.width / 2, ev && ev.clientY != null && ev.type !== 'focus' ? ev.clientY : r.top + r.height / 2, fmt(vals[u]), L.n + ' (' + u + ')', o.sub ? o.sub(u) : ''); p.setAttribute('stroke', COL.ink); p.setAttribute('stroke-width', 2); svg.appendChild(p); };
        var off = function () { X.hideTip(); p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', 1.2); };
        p.addEventListener('pointermove', show); p.addEventListener('pointerleave', off); p.addEventListener('focus', show); p.addEventListener('blur', off);
        lab.push([u, p, t]);
      }
    });
    lab.forEach(function (x) {
      var bb = x[1].getBBox(), tx = el('text', { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 14, 'font-weight': 800, fill: x[2] > .55 ? '#fff' : COL.ink, 'pointer-events': 'none' }, svg);
      tx.textContent = x[0];
    });
    return svg;
  }
  function legendBar(parent, mnTxt, mxTxt, divg) {
    var lg = mk('div', 'maplg'); lg.appendChild(mk('span', null, mnTxt)); var b = mk('i');
    b.style.background = divg ? 'linear-gradient(90deg,#D2484F,#F2F3F7,#15AD76)' : 'linear-gradient(90deg,#E1F4EB,#4FC79B,#0B6B4B)'; lg.appendChild(b); lg.appendChild(mk('span', null, mxTxt));
    var na = mk('span', 'na'), ni = mk('i'); na.appendChild(ni); na.appendChild(document.createTextNode('sem jogos')); lg.appendChild(na); parent.appendChild(lg);
  }
  function barList(parent, items, fmt, o) {
    o = o || {}; var ul = mk('ol', 'barlist'), mx = Math.max.apply(null, items.map(function (x) { return Math.abs(x.v); })) || 1;
    items.forEach(function (x, i) {
      var li = mk('li'); li.appendChild(mk('span', 'bn', String(i + 1))); var nm = mk('span', 'bl'); if (x.club) nm.appendChild(dot(x.club)); nm.appendChild(document.createTextNode(x.n)); li.appendChild(nm);
      var tr = mk('span', 'bt'), b = mk('i'); b.style.width = (Math.abs(x.v) / mx * 100) + '%'; b.style.background = o.div ? (x.v >= 0 ? COL.green : COL.red) : (o.color || COL.green2); tr.appendChild(b); li.appendChild(tr);
      li.appendChild(mk('b', 'bv', fmt(x.v))); if (x.sub) li.title = x.sub; ul.appendChild(li);
    }); parent.appendChild(ul); return ul;
  }

  /* ---------- dispersão ---------- */
  /* pts: [{k,label,x,y,color,tip}] */
  function scatter(host, pts, o) {
    host.textContent = '';
    var W = Math.max(host.clientWidth, 300), H = o.h || Math.min(520, Math.max(340, W * .62)), m = { l: 58, r: 22, t: 16, b: 50 };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-label': o.aria || 'Gráfico de dispersão' }, host);
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    function ext(v, z) { var a = Math.min.apply(null, v), b = Math.max.apply(null, v); if (z) { a = Math.min(a, 0); b = Math.max(b, 0); } var pad = (b - a) * .08 || 1; return [a - pad, b + pad]; }
    var ex = o.ex || ext(xs, o.zero), ey = o.ey || ext(ys, o.zero);
    var pw = W - m.l - m.r, ph = H - m.t - m.b, sx = function (v) { return m.l + (v - ex[0]) / (ex[1] - ex[0]) * pw; }, sy = function (v) { return m.t + (1 - (v - ey[0]) / (ey[1] - ey[0])) * ph; };
    function ticks(a, b) { var span = b - a, st = Math.pow(10, Math.floor(Math.log10(span / 5))), r = span / 5 / st; st *= r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1; var t = [], v = Math.ceil(a / st) * st; for (; v <= b + 1e-9; v += st) t.push(+v.toFixed(6)); return t; }
    ticks(ex[0], ex[1]).forEach(function (v) { el('line', { x1: sx(v), x2: sx(v), y1: m.t, y2: m.t + ph, stroke: COL.grid, 'stroke-width': 1 }, svg); var t = el('text', { x: sx(v), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: COL.mute }, svg); t.textContent = o.fx(v); });
    ticks(ey[0], ey[1]).forEach(function (v) { el('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), stroke: COL.grid, 'stroke-width': 1 }, svg); var t = el('text', { x: m.l - 8, y: sy(v), 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': 11, fill: COL.mute }, svg); t.textContent = o.fy(v); });
    if (o.zx != null && o.zx > ex[0] && o.zx < ex[1]) el('line', { x1: sx(o.zx), x2: sx(o.zx), y1: m.t, y2: m.t + ph, stroke: '#9AA0BC', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
    if (o.zy != null && o.zy > ey[0] && o.zy < ey[1]) el('line', { x1: m.l, x2: W - m.r, y1: sy(o.zy), y2: sy(o.zy), stroke: '#9AA0BC', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
    if (o.diag) el('line', { x1: sx(Math.max(ex[0], ey[0])), y1: sy(Math.max(ex[0], ey[0])), x2: sx(Math.min(ex[1], ey[1])), y2: sy(Math.min(ex[1], ey[1])), stroke: '#9AA0BC', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
    var xl = el('text', { x: m.l + pw / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: COL.ink }, svg); xl.textContent = o.xl;
    var yl = el('text', { x: 14, y: m.t + ph / 2, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: COL.ink, transform: 'rotate(-90 14 ' + (m.t + ph / 2) + ')' }, svg); yl.textContent = o.yl;
    (o.quad || []).forEach(function (q) { var t = el('text', { x: q[0] === 'r' ? W - m.r - 8 : m.l + 8, y: q[1] === 't' ? m.t + 16 : m.t + ph - 8, 'text-anchor': q[0] === 'r' ? 'end' : 'start', 'font-size': 11, 'font-weight': 700, fill: '#B4B9CE' }, svg); t.textContent = q[2]; });
    var r = o.r || 6, placed = [];
    function freeY(x, y, w) { var offs = [0, 11, -11, 22, -22, 33, -33]; for (var i = 0; i < offs.length; i++) { var yy = y + offs[i], ok = true; for (var j = 0; j < placed.length; j++) { var q = placed[j]; if (Math.abs(q[1] - yy) < 11 && x < q[0] + q[2] && q[0] < x + w) { ok = false; break; } } if (ok) { placed.push([x, yy, w]); return yy; } } placed.push([x, y, w]); return y; }
    pts.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (p) { p._ly = null; });
    pts.forEach(function (p) {
      var g = el('g', { tabindex: 0, class: 'sp', 'aria-label': p.label + ': ' + p.tip }, svg), cx = sx(p.x), cy = sy(p.y);
      el('circle', { cx: cx, cy: cy, r: p.r || r, fill: p.color, 'fill-opacity': o.alpha || .9, stroke: '#fff', 'stroke-width': 1.5 }, g);
      if (o.labels !== false) { var lx = cx + (p.r || r) + 4, ly = freeY(lx, cy, p.k.length * 7 + 4); var t = el('text', { x: lx, y: ly, 'dominant-baseline': 'central', 'font-size': 10.5, 'font-weight': 700, fill: COL.ink, 'pointer-events': 'none' }, g); t.textContent = p.k; }
      var show = function (ev) { var b = g.getBoundingClientRect(); X.showTip(ev.type === 'focus' ? b.left + b.width / 2 : ev.clientX, ev.type === 'focus' ? b.top : ev.clientY, p.label, p.tip, p.sub); };
      g.addEventListener('pointermove', show); g.addEventListener('focus', show); g.addEventListener('pointerleave', X.hideTip); g.addEventListener('blur', X.hideTip);
    });
  }
  function legend(parent, items) {
    var lg = mk('div', 'llg an-lg'); items.forEach(function (x) { var sp = mk('span'), sw = mk('i'); sw.style.background = x[1]; sp.appendChild(sw); sp.appendChild(document.createTextNode(x[0])); lg.appendChild(sp); }); parent.appendChild(lg); return lg;
  }

  /* =====================  IBF  ===================== */
  var ibfRoot = document.getElementById('ibf-root');
  if (ibfRoot && A.ibf) (function () {
    var D = A.ibf.slice(), FX = { Elite: COL.green, Alto: '#4FC79B', 'Médio': COL.gray, Baixo: COL.red };
    var FXN = { Elite: 'Elite', Alto: 'Alto', 'Médio': 'Médio', Baixo: 'Baixo' };
    var view = 'ibf', sortK = 'ibf', sortD = -1;
    var host = document.getElementById('ibf-rank');
    /* efeitos por indicador, constância e dispersão preenchem blocos próprios */
    function chip(f) { var c = mk('span', 'fx fx-' + f.toLowerCase().replace('é', 'e'), FXN[f]); return c; }
    function renderRank() {
      host.textContent = '';
      var ctl = mk('div', 'filters'); seg(ctl, 'Visão', [['ibf', 'IBF (índice final)'], ['dec', 'Decomposto: IBI · Z · T']], view, function (v) { view = v; renderRank(); }); host.appendChild(ctl);
      if (view === 'ibf') {
        var lg = mk('div', 'zleg an-fx'); [['Elite', '120 ou mais'], ['Alto', '105 a 119'], ['Médio', '95 a 104'], ['Baixo', 'abaixo de 95']].forEach(function (f) { var sp = mk('span'), i = mk('i'); i.style.background = FX[f[0]]; sp.appendChild(i); sp.appendChild(document.createTextNode(f[0] + ' · ' + f[1])); lg.appendChild(sp); });
        var sp2 = mk('span', 'wk'); sp2.innerHTML = '<s></s>intervalo de confiança de 90%'; lg.appendChild(sp2); host.appendChild(lg);
        var list = mk('div', 'ibf-list'), MIN = 60, MAX = 180, p = function (v) { return (v - MIN) / (MAX - MIN) * 100; };
        D.forEach(function (d) {
          var r = mk('div', 'ibf-row'); r.appendChild(mk('span', 'rk', String(d.rk) + 'º')); var nm = mk('span', 'nm'); nm.appendChild(dot(d.s)); nm.appendChild(mk('b', null, d.n)); r.appendChild(nm);
          var tr = mk('div', 'tr'); tr.appendChild(mk('i', 'base')); var b = mk('i', 'bar'); b.style.background = d.ibf >= 100 ? FX[d.faixa] : COL.red;
          var l = Math.min(p(d.ibf), p(100)), w = Math.abs(p(d.ibf) - p(100)); b.style.left = l + '%'; b.style.width = w + '%'; tr.appendChild(b);
          var wk = mk('i', 'wsk'); wk.style.left = p(d.lo) + '%'; wk.style.width = (p(d.hi) - p(d.lo)) + '%'; tr.appendChild(wk);
          r.appendChild(tr); r.appendChild(mk('b', 'v', d1(d.ibf))); r.appendChild(chip(d.faixa));
          r.title = d.n + ' · IBF ' + d1(d.ibf) + ' (intervalo ' + d1(d.lo) + ' a ' + d1(d.hi) + ') · posição entre ' + d.rl + 'º e ' + d.rh + 'º em 90% das simulações';
          list.appendChild(r);
        }); host.appendChild(list);
        host.appendChild(mk('p', 'note', '100 é o clube médio do campeonato. Acima de 100, o clube eleva a bilheteria de quem o recebe; abaixo, não. A linha fina é o intervalo de confiança de 90% (simulação com reamostragem dos mandantes): quando dois clubes têm intervalos que se sobrepõem, a diferença entre eles não é conclusiva. Passe o mouse sobre uma linha para ver a faixa de posições possíveis.'));
      } else {
        var heads = [['#'], ['Clube'], ['IBI', 1, 'Índice de impacto inicial: quanto o clube eleva a bilheteria em relação à média do mandante (100 = clube médio)'], ['Z', 1, 'Desvio padrão: quantos desvios acima do normal do mandante o jogo costuma ficar'], ['T', 1, 'Teste t: tamanho do efeito em relação à oscilação do clube. T a partir de 2 indica efeito real'], ['IBF', 1, 'Índice final: 40% IBI + 40% Z + 20% T (Z e T na mesma régua do IBI)'], ['Faixa']];
        var keys = ['rk', 'n', 'ibi', 'z', 't', 'ibf', 'faixa'];
        function build() {
          var rows = D.slice().sort(function (a, b) { var x = a[sortK], y = b[sortK]; return (typeof x === 'string' ? x.localeCompare(y, 'pt-BR') : x - y) * sortD; });
          var mxI = 100, bars = function (v, base, scale, col) { var w = mk('span', 'mbar'), i = mk('i'); i.style.width = Math.min(100, Math.abs(v - base) / scale * 100) + '%'; i.style.background = v >= base ? col : COL.red; w.appendChild(i); return w; };
          var bx = tbl(heads, rows.map(function (d, i) {
            function cellv(txt, v, base, sc) { var w = mk('div', 'mcell'); w.appendChild(mk('b', null, txt)); w.appendChild(bars(v, base, sc, COL.green2)); return { node: w }; }
            return [String(D.indexOf(d) + 1 === d.rk ? d.rk : d.rk), { node: clubCell(d.s, d.n) }, cellv(d1(d.ibi), d.ibi, 100, 60), cellv(sgn(d.z, function (x) { return x.toFixed(2).replace('.', ','); }), d.zi, 100, 60), cellv(sgn(d.t, function (x) { return x.toFixed(2).replace('.', ','); }), d.ti, 100, 60), { t: d1(d.ibf), b: 1 }, { node: chip(d.faixa) }];
          }));
          return bx;
        }
        var bx = build(); bx.classList.add('an-dec');
        [].forEach.call(bx.querySelectorAll('th'), function (th, i) { th.classList.add('sortable'); th.tabIndex = 0; th.addEventListener('click', function () { var k = keys[i]; sortD = sortK === k ? -sortD : (k === 'n' ? 1 : (k === 'rk' ? 1 : -1)); sortK = k; var nb = build(); nb.classList.add('an-dec'); host.replaceChild(nb, bx); bx = nb; wire(); }); });
        function wire() { [].forEach.call(bx.querySelectorAll('th'), function (th, i) { th.classList.add('sortable'); th.addEventListener('click', function () { var k = keys[i]; sortD = sortK === k ? -sortD : (k === 'n' || k === 'rk' ? 1 : -1); sortK = k; var nb = build(); nb.classList.add('an-dec'); host.replaceChild(nb, bx); bx = nb; wire(); }); }); }
        host.appendChild(bx);
        host.appendChild(mk('p', 'note', 'IBI, Z e T são as três leituras iniciais do impacto; o IBF as combina. As barras mostram, para cada indicador, a distância até 100 (Z e T já reescalados na mesma régua do IBI). Clique no título de uma coluna para ordenar.'));
      }
    }
    renderRank();

    /* efeito por indicador */
    var eh = document.getElementById('ibf-efeito'), emode = 'ef';
    function renderEf() {
      eh.textContent = '';
      var ctl = mk('div', 'filters'); seg(ctl, 'Leitura', [['ef', 'Efeito médio'], ['co', 'Constância']], emode, function (v) { emode = v; renderEf(); }); eh.appendChild(ctl);
      var heads = [['Clube'], ['Ocupação', 1], ['Ticket médio', 1], ['Público', 1], ['Renda', 1]], ks = ['ocup', 'ticket', 'pub', 'renda'];
      var rows = D.map(function (d) {
        return [{ node: clubCell(d.s, d.n) }].concat(ks.map(function (k) {
          if (emode === 'ef') { var v = d.ef[k]; return { t: spct(v), bg: div(Math.max(-1, Math.min(1, v / 40))), c: Math.abs(v) > 28 ? '#fff' : COL.ink, b: 1 }; }
          var c = d.co[k]; return { t: c + '%', bg: div(Math.max(-1, Math.min(1, (c - 50) / 40))), c: Math.abs(c - 50) > 32 ? '#fff' : COL.ink, b: 1 };
        }));
      });
      eh.appendChild(tbl(heads, rows));
      eh.appendChild(mk('p', 'note', emode === 'ef'
        ? 'Variação média da bilheteria do mandante quando o clube é o visitante, em relação à média daquele mandante nos outros jogos em casa. Ocupação e ticket já neutralizam o tamanho do estádio; público e renda ficam de fora quando o jogo foi em estádio diferente do habitual.'
        : 'Em quantos por cento dos mandantes o clube levou a bilheteria acima da média daquele mandante. Flamengo, por exemplo, elevou o ticket em 95% dos estádios que visitou. 50% é o ponto neutro.'));
    }
    renderEf();

    /* dispersão */
    var sh = document.getElementById('ibf-disp');
    var RESV = {}; TM.forEach(function (t) { RESV[t.s] = { j: 0, p: 0, pub: [] }; });
    G.forEach(function (g) { var r = RESV[g.a]; r.j++; r.p += g.gh < g.ga ? 3 : g.gh === g.ga ? 1 : 0; r.pub.push(g.pub); });
    var MET = {
      ocup: ['Efeito na ocupação', function (d) { return d.ef.ocup; }, spct, 1], ticket: ['Efeito no ticket médio', function (d) { return d.ef.ticket; }, spct, 1],
      pub: ['Efeito no público', function (d) { return d.ef.pub; }, spct, 1], renda: ['Efeito na renda', function (d) { return d.ef.renda; }, spct, 1],
      ibf: ['IBF', function (d) { return d.ibf; }, d1, 0], pm: ['Público médio como visitante', function (d) { return mean(RESV[d.s].pub); }, function (v) { return F.int(v); }, 0],
      apv: ['Aproveitamento como visitante', function (d) { return RESV[d.s].p / (3 * RESV[d.s].j) * 100; }, pc1, 0]
    };
    var sx = 'ticket', sy = 'ocup';
    function renderDisp() {
      sh.textContent = '';
      var ctl = mk('div', 'filters'), opts = Object.keys(MET).map(function (k) { return [k, MET[k][0]]; });
      selectBox(ctl, 'Eixo horizontal', 'ibf-x', opts, sx, function (v) { sx = v; draw(); }); selectBox(ctl, 'Eixo vertical', 'ibf-y', opts, sy, function (v) { sy = v; draw(); }); sh.appendChild(ctl);
      legend(sh, [['Elite', FX.Elite], ['Alto', FX.Alto], ['Médio', FX['Médio']], ['Baixo', FX.Baixo]]);
      var ph = mk('div', 'plot an-plot'); sh.appendChild(ph);
      sh.appendChild(mk('p', 'note', 'Cada ponto é um clube jogando como visitante. Nos eixos de efeito, 0% é a média do mandante: à direita o clube eleva aquele indicador, à esquerda reduz. Com ocupação no eixo vertical e ticket no horizontal, o canto superior direito reúne os clubes que enchem o estádio e ainda encarecem o ingresso.'));
      function draw() {
        var mx = MET[sx], my = MET[sy];
        var pts = D.map(function (d) { var xv = mx[1](d), yv = my[1](d); return { k: d.s, label: d.n, x: xv, y: yv, color: FX[d.faixa], tip: mx[0] + ': ' + mx[2](xv) + ' · ' + my[0] + ': ' + my[2](yv), sub: 'IBF ' + d1(d.ibf) + ' · ' + d.faixa }; });
        onResize(ph, function () {
          scatter(ph, pts, { xl: mx[0], yl: my[0], fx: function (v) { return mx[3] ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(0) + '%' : (sx === 'pm' ? F.compact(v) : sx === 'apv' ? v.toFixed(0) + '%' : v.toFixed(0)); },
            fy: function (v) { return my[3] ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(0) + '%' : (sy === 'pm' ? F.compact(v) : sy === 'apv' ? v.toFixed(0) + '%' : v.toFixed(0)); },
            zx: mx[3] ? 0 : sx === 'ibf' ? 100 : null, zy: my[3] ? 0 : sy === 'ibf' ? 100 : null, aria: 'Dispersão dos clubes: ' + mx[0] + ' por ' + my[0] });
        });
      }
      draw();
    }
    renderDisp();
  })();

  /* =====================  ESTADOS E REGIÕES  ===================== */
  var ufRoot = document.getElementById('uf-root');
  if (ufRoot && A.br) (function () {
    var role = 'mand', met = { mand: 'pub', vis: 'pm', clu: 'ppj' };
    var byUF = {}; G.forEach(function (g) { (byUF[g.uf] = byUF[g.uf] || []).push(g); });
    var byVis = {}; G.forEach(function (g) { var u = CUF[g.a]; (byVis[u] = byVis[u] || []).push(g); });
    var byClu = {}; /* jogos de todos os clubes do estado */
    G.forEach(function (g) {
      [[g.h, g.gh, g.ga], [g.a, g.ga, g.gh]].forEach(function (x) { var u = CUF[x[0]], o = byClu[u] = byClu[u] || { j: 0, p: 0, gp: 0, gc: 0 }; o.j++; o.p += x[1] > x[2] ? 3 : x[1] === x[2] ? 1 : 0; o.gp += x[1]; o.gc += x[2]; });
    });
    var MD = {
      mand: { t: 'Jogos disputados no estado', d: 'Onde os jogos aconteceram: estádios de cada estado.', m: {
        pub: ['Público total', function (a) { return a.pub; }, F.int], renda: ['Renda total', function (a) { return a.renda; }, F.brlc], tk: ['Ticket médio', function (a) { return a.tk; }, F.brl],
        oc: ['Ocupação', function (a) { return a.oc; }, pc1], pm: ['Público médio', function (a) { return a.pm; }, F.int], rm: ['Renda média por jogo', function (a) { return a.rm; }, F.brlc], j: ['Jogos', function (a) { return a.j; }, F.int] }, src: byUF, ag: agg },
      vis: { t: 'Clubes do estado como visitantes', d: 'Bilheteria dos jogos em que um clube do estado jogou fora de casa.', m: {
        pm: ['Público médio', function (a) { return a.pm; }, F.int], tk: ['Ticket médio', function (a) { return a.tk; }, F.brl], oc: ['Ocupação', function (a) { return a.oc; }, pc1], rm: ['Renda média por jogo', function (a) { return a.rm; }, F.brlc], renda: ['Renda total gerada', function (a) { return a.renda; }, F.brlc] }, src: byVis, ag: agg },
      clu: { t: 'Desempenho dos clubes do estado', d: 'Resultados de todos os clubes do estado, em casa e fora.', m: {
        ppj: ['Pontos por jogo', function (a) { return a.p / a.j; }, F.d2], apv: ['Aproveitamento', function (a) { return a.p / (3 * a.j) * 100; }, pc1], gp: ['Gols pró por jogo', function (a) { return a.gp / a.j; }, F.d2], gc: ['Gols contra por jogo', function (a) { return a.gc / a.j; }, F.d2], sg: ['Saldo de gols por jogo', function (a) { return (a.gp - a.gc) / a.j; }, function (v) { return sgn(v, F.d2); }] }, src: byClu, ag: function (a) { return a; } }
    };
    var mh = document.getElementById('uf-map');
    function subOf(u) {
      var M = MD[role], a = M.ag(M.src[u]);
      if (role === 'clu') return a.j + ' jogos · ' + a.p + ' pontos';
      return a.j + ' jogos · público médio ' + F.int(a.pm) + ' · ticket ' + F.brl(a.tk);
    }
    function renderMap() {
      mh.textContent = '';
      var M = MD[role], keys = Object.keys(M.m);
      if (!M.m[met[role]]) met[role] = keys[0];
      var ctl = mk('div', 'filters'); seg(ctl, 'O que mostrar', [['mand', 'Onde o jogo foi'], ['vis', 'Clubes como visitantes'], ['clu', 'Desempenho dos clubes']], role, function (v) { role = v; renderMap(); });
      seg(ctl, 'Indicador', keys.map(function (k) { return [k, M.m[k][0]]; }), met[role], function (v) { met[role] = v; renderMap(); }); mh.appendChild(ctl);
      mh.appendChild(mk('p', 'sub0', M.d));
      var cur = M.m[met[role]], vals = {}, list = [];
      Object.keys(M.src).forEach(function (u) { var a = M.ag(M.src[u]); vals[u] = cur[1](a); list.push({ n: UFN[u] || u, v: vals[u], u: u, sub: subOf(u) }); });
      list.sort(function (a, b) { return b.v - a.v; });
      var g = mk('div', 'map-grid'), mb = mk('div', 'map-box'), lb = mk('div', 'map-list'); g.appendChild(mb); g.appendChild(lb); mh.appendChild(g);
      var host = mk('div', 'map-host'); mb.appendChild(host);
      var mn = Math.min.apply(null, list.map(function (x) { return x.v; })), mx = Math.max.apply(null, list.map(function (x) { return x.v; }));
      var mp = brMap(host, vals, cur[2], { sub: subOf, label: cur[0] + ' por estado' });
      legendBar(mb, cur[2](mn), cur[2](mx));
      lb.appendChild(mk('div', 'flabel', cur[0] + ' · ranking dos estados'));
      barList(lb, list, cur[2]); lb.querySelectorAll('li').forEach(function (li, i) { li.addEventListener('mouseenter', function () { var p = mp.querySelector('[data-uf="' + list[i].u + '"]'); if (p) { p.setAttribute('stroke', COL.ink); p.setAttribute('stroke-width', 2.2); mp.appendChild(p); } }); li.addEventListener('mouseleave', function () { var p = mp.querySelector('[data-uf="' + list[i].u + '"]'); if (p) { p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', 1.2); } }); });
      /* regiões */
      var rg = mk('div', 'reg-box'); rg.appendChild(mk('div', 'flabel', 'Por região · ' + cur[0]));
      var regs = {}; Object.keys(M.src).forEach(function (u) { var r = REG[u] || 'Outras'; (regs[r] = regs[r] || { src: [] }); if (role === 'clu') { var o = M.src[u]; var x = regs[r].o = regs[r].o || { j: 0, p: 0, gp: 0, gc: 0 }; x.j += o.j; x.p += o.p; x.gp += o.gp; x.gc += o.gc; } else regs[r].src = regs[r].src.concat(M.src[u]); });
      var rl = Object.keys(regs).map(function (r) { var a = role === 'clu' ? regs[r].o : M.ag(regs[r].src); return { n: r, v: cur[1](a), sub: role === 'clu' ? a.j + ' jogos' : a.j + ' jogos' }; }).sort(function (a, b) { return b.v - a.v; });
      barList(rg, rl, cur[2], { color: COL.blue }); lb.appendChild(rg);
      var nt = 'Estados sem clube na Série A 2025 (ou sem jogos no recorte) aparecem em cinza. ';
      mh.appendChild(mk('p', 'note', nt + (role === 'mand' ? 'Ticket médio e ocupação são médias dos jogos. Há 2 jogos em Brasília (Mané Garrincha), o que deixa o Distrito Federal com poucos dados.' : role === 'vis' ? 'Considera todos os jogos fora de casa dos clubes do estado; o estado do clube é o da sede.' : 'Pontos e gols de todos os clubes do estado somados, em casa e fora.') + ' Mapa: @svg-maps/brazil (CC BY 4.0).'));
    }
    renderMap();

    /* contra regiões / estados */
    var ch = document.getElementById('uf-contra'), cmode = 'reg', cmando = 'todos', cmet = 'apv';
    function renderContra() {
      ch.textContent = '';
      var ctl = mk('div', 'filters');
      seg(ctl, 'Agrupar adversários por', [['reg', 'Região'], ['uf', 'Estado']], cmode, function (v) { cmode = v; renderContra(); });
      seg(ctl, 'Mando de campo', [['todos', 'Todos'], ['casa', 'Mandante'], ['fora', 'Visitante']], cmando, function (v) { cmando = v; renderContra(); });
      seg(ctl, 'Indicador', [['apv', 'Aproveitamento'], ['ppj', 'Pontos por jogo'], ['sg', 'Saldo por jogo']], cmet, function (v) { cmet = v; renderContra(); }); ch.appendChild(ctl);
      var grp = function (s) { return cmode === 'reg' ? REG[CUF[s]] : CUF[s]; };
      var cats = {}; TM.forEach(function (t) { cats[grp(t.s)] = 1; });
      var cl = Object.keys(cats).sort(function (a, b) { return cmode === 'reg' ? (['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte'].indexOf(a) - ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte'].indexOf(b)) : a.localeCompare(b); });
      var data = {}; TM.forEach(function (t) { data[t.s] = {}; cl.forEach(function (c) { data[t.s][c] = { j: 0, p: 0, gp: 0, gc: 0 }; }); });
      G.forEach(function (g) {
        [[g.h, g.a, g.gh, g.ga, 'casa'], [g.a, g.h, g.ga, g.gh, 'fora']].forEach(function (x) {
          if (cmando !== 'todos' && x[4] !== cmando) return; var o = data[x[0]][grp(x[1])]; o.j++; o.p += x[2] > x[3] ? 3 : x[2] === x[3] ? 1 : 0; o.gp += x[2]; o.gc += x[3];
        });
      });
      function val(o) { return o.j ? (cmet === 'apv' ? o.p / (3 * o.j) * 100 : cmet === 'ppj' ? o.p / o.j : (o.gp - o.gc) / o.j) : null; }
      function fmtv(v) { return cmet === 'apv' ? pc1(v) : cmet === 'ppj' ? F.d2(v) : sgn(v, F.d2); }
      var mid = cmet === 'apv' ? 50 : cmet === 'ppj' ? 1.5 : 0, rngv = cmet === 'apv' ? 50 : cmet === 'ppj' ? 1.5 : 1.5;
      var heads = [['Clube']].concat(cl.map(function (c) { return [cmode === 'reg' ? c : (UFN[c] ? c : c), 1, UFN[c] || c]; }));
      var rows = TM.map(function (t) {
        return [{ node: clubCell(t.s, t.n) }].concat(cl.map(function (c) {
          var o = data[t.s][c], v = val(o); if (v == null) return { t: '—', c: '#B4B9CE' };
          var tt = Math.max(-1, Math.min(1, (v - mid) / rngv)); return { t: fmtv(v) + ' ', bg: div(tt), c: Math.abs(tt) > .6 ? '#fff' : COL.ink, b: 1, title: o.j + (o.j === 1 ? ' jogo' : ' jogos') + ' · ' + o.p + ' pts · ' + o.gp + ' GP · ' + o.gc + ' GC' };
        }));
      });
      ch.appendChild(tbl(heads, rows));
      ch.appendChild(mk('p', 'note', 'Desempenho de cada clube contra adversários de cada ' + (cmode === 'reg' ? 'região' : 'estado') + '. Inclui os clubes do próprio estado ou região do clube. Passe o mouse sobre uma célula para ver jogos, pontos e gols. Verde: acima da referência (50% de aproveitamento, 1,5 ponto por jogo ou saldo zero); vermelho: abaixo.'));
    }
    renderContra();
  })();

  /* =====================  CUSTOS E LUCRO  ===================== */
  var finRoot = document.getElementById('fin-root');
  if (finRoot) (function () {
    var T = agg(G);
    var kp = document.getElementById('fin-kpis');
    [['Renda total', F.brlc(T.renda), 'bilheteria dos 380 jogos'], ['Despesa total', F.brlc(T.desp), 'custos de organização dos jogos'], ['Lucro total', F.brlc(T.lucro), 'margem de ' + pc1(T.mg)],
      ['Custo por presente', F.brl(T.cpp), 'despesa ÷ público presente'], ['Lucro por presente', F.brl(T.lpp), 'lucro ÷ público presente'], ['Jogos com prejuízo', F.int(G.filter(function (g) { return g.lucro < 0; }).length), 'de ' + G.length + ' jogos']].forEach(function (k) {
      var c = mk('div', 'kpi'); c.appendChild(mk('div', 'kl', k[0])); c.appendChild(mk('div', 'kv', k[1])); c.appendChild(mk('div', 'ks', k[2])); kp.appendChild(c);
    });
    var byH = {}; G.forEach(function (g) { (byH[g.h] = byH[g.h] || []).push(g); });
    var CL = TM.map(function (t) { var a = agg(byH[t.s]); a.s = t.s; a.n = t.n; return a; });

    /* clubes: gráfico + tabela */
    var ch = document.getElementById('fin-clubes'), cm = 'desp';
    var CM = { desp: ['Maiores custos', function (a) { return a.desp; }, F.brlc, 'Despesa total'], lucro: ['Maiores lucros', function (a) { return a.lucro; }, function (v) { return sgn(v, F.brlc); }, 'Lucro total'],
      mg: ['Maior margem', function (a) { return a.mg; }, pc1, 'Margem de lucro'], cpp: ['Custo por presente', function (a) { return a.cpp; }, F.brl, 'Custo por presente'], lpp: ['Lucro por presente', function (a) { return a.lpp; }, function (v) { return sgn(v, F.brl); }, 'Lucro por presente'] };
    function renderClubes() {
      ch.textContent = '';
      var ctl = mk('div', 'filters'); seg(ctl, 'Ranking', Object.keys(CM).map(function (k) { return [k, CM[k][0]]; }), cm, function (v) { cm = v; renderClubes(); }); ch.appendChild(ctl);
      var M = CM[cm], items = CL.map(function (a) { return { n: a.n, club: a.s, v: M[1](a), sub: a.j + ' jogos como mandante' }; }).sort(function (a, b) { return cm === 'cpp' ? b.v - a.v : b.v - a.v; });
      var g = mk('div', 'fin-grid'), l = mk('div', 'mvb'); l.appendChild(mk('div', 'flabel', M[3] + ' · clubes como mandantes')); barList(l, items, M[2], { div: cm === 'lucro' || cm === 'mg' || cm === 'lpp' }); g.appendChild(l);
      var r = mk('div', 'mvb'); r.appendChild(mk('div', 'flabel', 'Renda × despesa por clube')); var ph = mk('div', 'plot an-plot'); r.appendChild(ph); g.appendChild(r); ch.appendChild(g);
      var pts = CL.map(function (a) { return { k: a.s, label: a.n, x: a.desp / 1e6, y: a.renda / 1e6, color: a.lucro >= 0 ? COL.green2 : COL.red, tip: 'Renda ' + F.brlc(a.renda) + ' · despesa ' + F.brlc(a.desp), sub: 'Lucro ' + sgn(a.lucro, F.brlc) + ' · margem ' + pc1(a.mg) }; });
      onResize(ph, function () { scatter(ph, pts, { xl: 'Despesa total (R$ milhões)', yl: 'Renda total (R$ milhões)', fx: function (v) { return v.toFixed(0); }, fy: function (v) { return v.toFixed(0); }, diag: true, h: 400, aria: 'Renda por despesa de cada clube como mandante', ex: [0, Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.1], ey: [0, Math.max.apply(null, pts.map(function (p) { return p.y; })) * 1.1] }); });
      ch.appendChild(mk('p', 'note', 'Só jogos em que o clube foi mandante (é quem arrecada a renda e arca com a despesa). Acima da linha tracejada, a renda cobre a despesa; abaixo, o clube teve prejuízo.'));
      var heads = [['Clube'], ['Jogos', 1], ['Renda', 1], ['Despesa', 1], ['Lucro', 1], ['Margem', 1], ['Custo/presente', 1], ['Lucro/presente', 1], ['Ticket', 1]];
      var rows = CL.slice().sort(function (a, b) { return b.lucro - a.lucro; }).map(function (a) { return [{ node: clubCell(a.s, a.n) }, String(a.j), F.brlc(a.renda), F.brlc(a.desp), { t: sgn(a.lucro, F.brlc), c: a.lucro >= 0 ? COL.green2 : COL.red, b: 1 }, pc1(a.mg), F.brl(a.cpp), sgn(a.lpp, F.brl), F.brl(a.tk)]; });
      ch.appendChild(tbl(heads, rows));
    }
    renderClubes();

    /* mapa por UF */
    var mh = document.getElementById('fin-map'), mm = 'lucro';
    var byUF = {}; G.forEach(function (g) { (byUF[g.uf] = byUF[g.uf] || []).push(g); });
    var UM = { lucro: ['Lucro total', function (a) { return a.lucro; }, function (v) { return sgn(v, F.brlc); }, 1], desp: ['Despesa total', function (a) { return a.desp; }, F.brlc], cpp: ['Custo por presente', function (a) { return a.cpp; }, F.brl], lpp: ['Lucro por presente', function (a) { return a.lpp; }, function (v) { return sgn(v, F.brl); }, 1], mg: ['Margem de lucro', function (a) { return a.mg; }, pc1, 1] };
    function renderMap() {
      mh.textContent = '';
      var ctl = mk('div', 'filters'); seg(ctl, 'Indicador', Object.keys(UM).map(function (k) { return [k, UM[k][0]]; }), mm, function (v) { mm = v; renderMap(); }); mh.appendChild(ctl);
      var M = UM[mm], vals = {}, list = []; Object.keys(byUF).forEach(function (u) { var a = agg(byUF[u]); vals[u] = M[1](a); list.push({ n: UFN[u] || u, v: vals[u], sub: a.j + ' jogos' }); }); list.sort(function (a, b) { return b.v - a.v; });
      var g = mk('div', 'map-grid'), mb = mk('div', 'map-box'), lb = mk('div', 'map-list'); g.appendChild(mb); g.appendChild(lb); mh.appendChild(g);
      var host = mk('div', 'map-host'); mb.appendChild(host);
      brMap(host, vals, M[2], { div: !!M[3], sub: function (u) { return agg(byUF[u]).j + ' jogos'; }, label: M[0] + ' por estado' });
      var mn = Math.min.apply(null, list.map(function (x) { return x.v; })), mx = Math.max.apply(null, list.map(function (x) { return x.v; }));
      legendBar(mb, M[2](mn), M[2](mx), !!M[3]);
      lb.appendChild(mk('div', 'flabel', M[0] + ' · ranking dos estados')); barList(lb, list, M[2], { div: !!M[3] });
      mh.appendChild(mk('p', 'note', 'Estado onde o jogo foi disputado. Mapa: @svg-maps/brazil (CC BY 4.0).'));
    }
    renderMap();

    /* jogos: maiores custos e lucros */
    var gh = document.getElementById('fin-jogos'), gm = 'desp';
    var GM = { desp: ['Maiores custos', function (g) { return g.desp; }, -1], lucro: ['Maiores lucros', function (g) { return g.lucro; }, -1], prej: ['Maiores prejuízos', function (g) { return g.lucro; }, 1], cpp: ['Maior custo por presente', function (g) { return g.desp / g.pub; }, -1] };
    function renderJogos() {
      gh.textContent = '';
      var ctl = mk('div', 'filters'); seg(ctl, 'Ranking de jogos', Object.keys(GM).map(function (k) { return [k, GM[k][0]]; }), gm, function (v) { gm = v; renderJogos(); }); gh.appendChild(ctl);
      var M = GM[gm], L = G.slice().sort(function (a, b) { return (M[1](a) - M[1](b)) * M[2]; }).slice(0, 10);
      var heads = [['#'], ['Jogo'], ['Rodada', 1], ['Estádio'], ['Público', 1], ['Renda', 1], ['Despesa', 1], ['Lucro', 1], ['Custo/presente', 1]];
      gh.appendChild(tbl(heads, L.map(function (g, i) {
        var jg = mk('span', 'cn'); jg.appendChild(dot(g.h)); jg.appendChild(mk('b', null, g.h)); jg.appendChild(mk('em', null, g.gh + ' x ' + g.ga)); jg.appendChild(mk('b', null, g.a)); jg.appendChild(dot(g.a));
        return [String(i + 1), { node: jg }, String(g.rod), g.est, F.int(g.pub), F.brlfull(g.renda), F.brlfull(g.desp), { t: sgn(g.lucro, F.brlfull), c: g.lucro >= 0 ? COL.green2 : COL.red, b: 1 }, F.brl(g.desp / g.pub)];
      })));
    }
    renderJogos();

    /* dispersão: renda x despesa por jogo */
    var sh = document.getElementById('fin-disp'), sp = mk('div', 'plot an-plot'); sh.appendChild(sp);
    sh.appendChild(mk('p', 'note', 'Cada ponto é um dos 380 jogos. Abaixo da linha tracejada, a despesa superou a renda (prejuízo); passe o mouse para ver o jogo. Em vermelho, os jogos com prejuízo.'));
    var pts = G.map(function (g) { return { k: g.h, label: g.h + ' ' + g.gh + ' x ' + g.ga + ' ' + g.a, x: g.desp / 1e6, y: g.renda / 1e6, color: g.lucro >= 0 ? COL.green2 : COL.red, r: 4.2, tip: 'Renda ' + F.brlfull(g.renda) + ' · despesa ' + F.brlfull(g.desp), sub: g.est + ' · rodada ' + g.rod }; });
    onResize(sp, function () { scatter(sp, pts, { xl: 'Despesa do jogo (R$ milhões)', yl: 'Renda do jogo (R$ milhões)', fx: function (v) { return v.toFixed(1).replace('.', ','); }, fy: function (v) { return v.toFixed(1).replace('.', ','); }, diag: true, labels: false, r: 4.2, alpha: .72, h: 420, aria: 'Renda por despesa de cada jogo', ex: [0, Math.max.apply(null, pts.map(function (p) { return p.x; })) * 1.06], ey: [0, Math.max.apply(null, pts.map(function (p) { return p.y; })) * 1.06] }); });

    /* estádios: custo por presente */
    var eh = document.getElementById('fin-estadios'), byE = {}; G.forEach(function (g) { (byE[g.est] = byE[g.est] || []).push(g); });
    var ER = Object.keys(byE).map(function (n) { var a = agg(byE[n]); a.n = n; a.uf = ESTUF[n]; return a; }).filter(function (a) { return a.j >= 5; }).sort(function (a, b) { return b.cpp - a.cpp; });
    eh.appendChild(tbl([['Estádio'], ['UF'], ['Jogos', 1], ['Público médio', 1], ['Renda', 1], ['Despesa', 1], ['Lucro', 1], ['Custo/presente', 1], ['Lucro/presente', 1]], ER.map(function (a) { return [a.n, a.uf, String(a.j), F.int(a.pm), F.brlc(a.renda), F.brlc(a.desp), { t: sgn(a.lucro, F.brlc), c: a.lucro >= 0 ? COL.green2 : COL.red, b: 1 }, F.brl(a.cpp), sgn(a.lpp, F.brl)]; })));
    eh.appendChild(mk('p', 'note', 'Estádios com 5 jogos ou mais, do maior para o menor custo por presente (despesa ÷ público).'));
  })();

  /* =====================  STATS: GOLS POR RODADA E RANKINGS  ===================== */
  var golRoot = document.getElementById('gols-root');
  if (golRoot && window.DSC) (function () {
    var tur = 'todos', man = 'todos';
    var gh = document.getElementById('gols-rodada'), rk = document.getElementById('gols-rank');
    function renderRod() {
      gh.textContent = '';
      var tot = []; for (var r = 1; r <= 38; r++) tot.push(0);
      G.forEach(function (g) { tot[g.rod - 1] += g.gh + g.ga; });
      var avg = mean(tot), c = mk('div', 'lcard'); c.appendChild(mk('h3', null, 'Gols por rodada')); c.appendChild(mk('p', 'cs', 'Total de gols de cada rodada. Tracejado: média do campeonato (' + F.d2(avg) + ').'));
      var ph = mk('div', 'plot'); c.appendChild(ph); gh.appendChild(c);
      DSC.redraw(ph, function () { DSC.lineChart(ph, tot.map(function (_, i) { return String(i + 1); }), tot, { avg: avg, avgLabel: F.d2(avg).replace(',0', ''), color: COL.green2, h: 260, every: 1, labels: true, tipLabel: 'Rodada ', fmt: function (v) { return String(v); }, aria: 'Gols por rodada' }); });
    }
    function renderRank() {
      rk.textContent = '';
      var ctl = mk('div', 'filters');
      seg(ctl, 'Turno', [['todos', 'Todos'], ['1', '1º turno'], ['2', '2º turno']], tur, function (v) { tur = v; renderRank(); });
      seg(ctl, 'Mando de campo', [['todos', 'Todos'], ['casa', 'Mandante'], ['fora', 'Visitante']], man, function (v) { man = v; renderRank(); }); rk.appendChild(ctl);
      var S = {}; TM.forEach(function (t) { S[t.s] = { s: t.s, n: t.n, gp: 0, gc: 0, j: 0 }; });
      G.forEach(function (g) {
        if (tur !== 'todos' && String(g.turno) !== tur) return;
        if (man !== 'fora') { var o = S[g.h]; o.gp += g.gh; o.gc += g.ga; o.j++; }
        if (man !== 'casa') { var q = S[g.a]; q.gp += g.ga; q.gc += g.gh; q.j++; }
      });
      var L = Object.keys(S).map(function (k) { return S[k]; }), g3 = mk('div', 'mv three');
      [['Melhores ataques', 'Gols pró', function (a) { return a.gp; }, -1], ['Melhores defesas', 'Gols contra', function (a) { return a.gc; }, 1], ['Gols em jogos', 'Gols pró + contra', function (a) { return a.gp + a.gc; }, -1]].forEach(function (c) {
        var b = mk('div', 'mvb'); b.appendChild(mk('div', 'flabel', c[0])); var ol = mk('ol', 'rk3');
        L.slice().sort(function (x, y) { return (c[2](x) - c[2](y)) * c[3] || (y.gp - x.gp); }).forEach(function (a, i) {
          var li = mk('li'); li.appendChild(mk('span', 'p', String(i + 1) + 'º')); var n = mk('span', 'n'); n.appendChild(dot(a.s)); n.appendChild(document.createTextNode(a.n)); li.appendChild(n); li.appendChild(mk('b', 'v', String(c[2](a)))); ol.appendChild(li);
        }); b.appendChild(ol); g3.appendChild(b);
      }); rk.appendChild(g3);
      rk.appendChild(mk('p', 'note', 'Gols em jogos soma os gols marcados e sofridos nas partidas do clube. Quando o filtro de mando é aplicado, vale só para os jogos do clube como mandante ou como visitante.'));
    }
    renderRod(); renderRank();
  })();

  /* =====================  RENDA: RODADA A RODADA E QUANDO OS JOGOS ACONTECEM  ===================== */
  var rodRoot = document.getElementById('rod-root');
  if (rodRoot && window.DSC) (function () {
    var lh = document.getElementById('rod-lines'), wh = document.getElementById('rod-when'), mode = 'dia', wm = 'pm';
    var rs = []; for (var r = 1; r <= 38; r++) rs.push(agg(G.filter(function (g) { return g.rod === r; })));
    var lab = rs.map(function (_, i) { return String(i + 1); });
    var gr = mk('div', 'mv three'); lh.appendChild(gr);
    [['Público médio por rodada', function (a) { return a.pm; }, F.int, F.int(T0('pm')), '#298463'], ['Ticket médio por rodada', function (a) { return a.tk; }, F.brl, '', '#2D3776'], ['Ocupação por rodada', function (a) { return a.oc; }, pc1, '', '#15AD76']].forEach(function (c) {
      var vals = rs.map(c[1]), avg = mean(vals), card = mk('div', 'lcard'); card.appendChild(mk('h3', null, c[0])); card.appendChild(mk('p', 'cs', 'Tracejado: média das 38 rodadas (' + c[2](avg) + ').'));
      var ph = mk('div', 'plot'); card.appendChild(ph); gr.appendChild(card);
      DSC.redraw(ph, function () { DSC.lineChart(ph, lab, vals, { avg: avg, avgLabel: '', color: c[4], fmt: c[2], every: 5, labels: false, h: 230, tipLabel: 'Rodada ', aria: c[0] }); });
    });
    function T0(k) { return agg(G)[k]; }
    var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    function dayName(g) { var d = new Date(Date.UTC(2025, 0, 1) + g.w[1] * 864e5); return DIAS[d.getUTCDay()]; }
    function slot(g) { var h = parseInt(g.w[6].slice(0, 2), 10); return h < 16 ? 'Até 15h59' : h < 18 ? '16h às 17h59' : h < 20 ? '18h às 19h59' : '20h ou mais'; }
    function renderWhen() {
      wh.textContent = '';
      var ctl = mk('div', 'filters'); seg(ctl, 'Agrupar por', [['dia', 'Dia da semana'], ['hora', 'Horário da partida']], mode, function (v) { mode = v; renderWhen(); });
      seg(ctl, 'Indicador', [['pm', 'Público médio'], ['tk', 'Ticket médio'], ['oc', 'Ocupação'], ['rm', 'Renda média']], wm, function (v) { wm = v; renderWhen(); }); wh.appendChild(ctl);
      var order = mode === 'dia' ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] : ['Até 15h59', '16h às 17h59', '18h às 19h59', '20h ou mais'], by = {}; order.forEach(function (k) { by[k] = []; });
      G.forEach(function (g) { by[mode === 'dia' ? dayName(g) : slot(g)].push(g); });
      var M = { pm: ['Público médio', F.int, 'pm'], tk: ['Ticket médio', F.brl, 'tk'], oc: ['Ocupação', pc1, 'oc'], rm: ['Renda média por jogo', F.brlc, 'rm'] }[wm];
      var items = order.filter(function (k) { return by[k].length; }).map(function (k) { var a = agg(by[k]); return { n: k, v: a[M[2]], a: a }; });
      var g = mk('div', 'fin-grid'), l = mk('div', 'mvb'); l.appendChild(mk('div', 'flabel', M[0] + ' · por ' + (mode === 'dia' ? 'dia da semana' : 'horário'))); var mxv = Math.max.apply(null, items.map(function (x) { return x.v; })) || 1, ul = mk('ol', 'barlist');
      items.forEach(function (x) { var li = mk('li'); li.appendChild(mk('span', 'bn', '')); li.appendChild(mk('span', 'bl', x.n)); var tr = mk('span', 'bt'), b = mk('i'); b.style.width = (x.v / mxv * 100) + '%'; b.style.background = COL.green2; tr.appendChild(b); li.appendChild(tr); li.appendChild(mk('b', 'bv', M[1](x.v))); li.title = x.a.j + ' jogos'; ul.appendChild(li); });
      l.appendChild(ul); g.appendChild(l);
      var r2 = mk('div', 'mvb'); r2.appendChild(mk('div', 'flabel', 'Resumo'));
      r2.appendChild(tbl([[mode === 'dia' ? 'Dia' : 'Horário'], ['Jogos', 1], ['Público médio', 1], ['Ticket', 1], ['Ocupação', 1]], items.map(function (x) { return [x.n, String(x.a.j), F.int(x.a.pm), F.brl(x.a.tk), pc1(x.a.oc)]; }))); g.appendChild(r2);
      wh.appendChild(g);
    }
    renderWhen();
  })();

  /* =====================  STATS: POSIÇÃO RODADA A RODADA (por clube, com rótulos)  ===================== */
  var evoPos = document.getElementById('evo-pos'), evoA = document.getElementById('evo-a'), evoB = document.getElementById('evo-b');
  if (evoPos && evoA && window.DSC) (function () {
    var tab = {}; TM.forEach(function (t) { tab[t.s] = { s: t.s, p: 0, v: 0, sg: 0, gp: 0 }; });
    var byR = {}; G.forEach(function (g) { (byR[g.rod] = byR[g.rod] || []).push(g); });
    var POS = {}; TM.forEach(function (t) { POS[t.s] = []; });
    for (var r = 1; r <= 38; r++) {
      (byR[r] || []).forEach(function (g) {
        [[g.h, g.gh, g.ga], [g.a, g.ga, g.gh]].forEach(function (x) { var o = tab[x[0]]; o.p += x[1] > x[2] ? 3 : x[1] === x[2] ? 1 : 0; o.v += x[1] > x[2] ? 1 : 0; o.sg += x[1] - x[2]; o.gp += x[1]; });
      });
      Object.keys(tab).map(function (k) { return tab[k]; }).sort(function (a, b) { return b.p - a.p || b.v - a.v || b.sg - a.sg || b.gp - a.gp; }).forEach(function (o, i) { POS[o.s].push(i + 1); });
    }
    var lab = []; for (var q = 1; q <= 38; q++) lab.push(String(q));
    function render() {
      evoPos.textContent = '';
      var ids = [evoA.value, evoB && evoB.value].filter(function (v, i, a) { return v && a.indexOf(v) === i; });
      var gr = mk('div', ids.length > 1 ? 'mv two' : 'mv'); evoPos.appendChild(gr);
      ids.forEach(function (id, k) {
        var card = mk('div', 'lcard'); card.appendChild(mk('h3', null, NM[id])); card.appendChild(mk('p', 'cs', 'Posição na classificação após cada rodada.')); var ph = mk('div', 'plot'); card.appendChild(ph); gr.appendChild(card);
        DSC.redraw(ph, function () { DSC.lineChart(ph, lab, POS[id], { color: k ? COL.blueHi : COL.green2, invert: true, every: 1, labels: true, h: 250, fmt: function (v) { return v + 'º'; }, labFmt: String, tipLabel: 'Rodada ', aria: 'Posição de ' + NM[id] + ' por rodada' }); });
      });
    }
    evoA.addEventListener('change', render); if (evoB) evoB.addEventListener('change', render);
    setTimeout(render, 0); setTimeout(render, 400);
  })();
})();
