/* Data Score — páginas por temporada (Regiões e estados, Estádios, Clubes, IBF, Dinheiro). */
(function () {
  'use strict';
  var L = window.L, G = window.PG; if (!L || !G) return;
  var F = L.F, mk = L.mk, COL = L.COL, DSC = window.DSC, Y = L.Y, P = G.P, root = G.root, clear = G.clear, scopeR = G.scopeR, prevYear = G.prevYear, METS = G.METS;
  function sortBy(a, f, d) { return a.slice().sort(function (x, y) { return (f(y) - f(x)) * (d || 1); }); }
  function dl(cur, prev, f) { if (prev == null || !prev) return '—'; var d = (cur / prev - 1) * 100; return { t: F.spct(d), c: d >= 0 ? '#15805a' : '#D2484F', b: 1 }; }
  function sameR(y, p) { return p ? Math.min(scopeR(y), scopeR(p)) : scopeR(y); }

  /* ===================== REGIÕES E ESTADOS ===================== */
  P.est = function () {
    var y = L.year(), R = scopeR(y), gs = L.pubGames(y, R), A = L.agg(gs);
    L.partialNote(y, clear(root('est-partial')));
    var mh = clear(root('est-map')), mm = mh._m || 'pub';
    var MM = { pub: ['Público total', 'pub', F.compact], tk: ['Ticket médio', 'tk', F.brl], oc: ['Ocupação média', 'oc', F.pct], rm: ['Renda média por jogo', 'rm', F.brlc], renda: ['Renda total', 'renda', F.brlc] };
    function drawMap() {
      clear(mh); var ctl = mk('div', 'filters'); L.seg(ctl, 'Indicador', Object.keys(MM).map(function (k) { return [k, MM[k][0]]; }), mm, function (v) { mm = v; mh._m = v; drawMap(); }); mh.appendChild(ctl);
      var by = L.groupBy(gs, function (g) { return g.uf; }), U = Object.keys(by).map(function (u) { var a = L.agg(by[u]); a.u = u; return a; }), M = MM[mm], vals = {}; U.forEach(function (a) { vals[a.u] = a[M[1]]; });
      var grid = mk('div', 'map-grid'), mb = mk('div', 'map-box'); grid.appendChild(mb); mh.appendChild(grid);
      L.brMap(mb, vals, M[2], { label: M[0] + ' por estado em ' + y, sub: function (u) { var a = U.filter(function (x) { return x.u === u; })[0]; return a.j + ' jogos · ' + F.int(a.pm) + ' por jogo'; } }); L.legendBar(mb, 'menor', 'maior');
      var rb = mk('div', 'mvb'); rb.appendChild(mk('div', 'flabel', M[0] + ' · do maior para o menor'));
      L.barList(rb, sortBy(U, function (a) { return a[M[1]]; }).map(function (a) { return { n: (L.UFN[a.u] || a.u) + ' (' + a.u + ')', v: a[M[1]], sub: a.j + ' jogos' }; }), M[2]); grid.appendChild(rb);
    }
    drawMap();
    /* regiões */
    var rh = clear(root('est-reg')), by = L.groupBy(gs, function (g) { return L.REG[g.uf]; }), RG = L.REGS.filter(function (r) { return by[r]; }).map(function (r) { var a = L.agg(by[r]); a.r = r; return a; });
    var g = mk('div', 'mv four'); rh.appendChild(g);
    [['Público total', 'pub', F.compact], ['Ticket médio', 'tk', F.brl], ['Ocupação média', 'oc', F.pct], ['Público médio por jogo', 'pm', F.int]].forEach(function (m) { var b = L.box(g, m[0]); L.barList(b, sortBy(RG, function (a) { return a[m[1]]; }).map(function (a) { return { n: a.r, v: a[m[1]], sub: a.j + ' jogos' }; }), m[2]); });
    var tot = A.pub;
    rh.appendChild(L.tbl([['Região'], ['Jogos', 1], ['% do público', 1], ['Público médio', 1], ['Ticket', 1], ['Ocupação', 1], ['Renda total', 1]], sortBy(RG, function (a) { return a.pub; }).map(function (a) { return [a.r, F.int(a.j), F.pct(a.pub / tot * 100), F.int(a.pm), F.brl(a.tk), F.pct(a.oc), F.brlc(a.renda)]; })));
    /* ano a ano por UF */
    var ah = clear(root('est-anos')), am = ah._m || 'pm';
    function drawAnos() {
      clear(ah); var ctl = mk('div', 'filters'); L.seg(ctl, 'Indicador', [['pm', 'Público médio'], ['tk', 'Ticket médio'], ['oc', 'Ocupação'], ['rm', 'Renda média']], am, function (v) { am = v; ah._m = v; drawAnos(); }); ah.appendChild(ctl);
      var rc = G.cmpR(), M = METS[am], ys = L.avail, per = {}, ufs = {};
      ys.forEach(function (a) { per[a] = L.groupBy(L.pubGames(a, rc), function (g) { return g.uf; }); Object.keys(per[a]).forEach(function (u) { ufs[u] = 1; }); });
      var rows = sortBy(Object.keys(ufs), function (u) { var a = per[y] && per[y][u] ? L.agg(per[y][u]) : null; return a ? M[1](a) : -1; }).map(function (u) {
        var r = [(L.UFN[u] || u) + ' (' + u + ')']; var prev = null; ys.forEach(function (a) { var v = per[a][u] ? M[1](L.agg(per[a][u])) : null; r.push(v == null ? '—' : { t: M[2](v), b: String(a) === String(y) }); prev = v; }); return r; });
      ah.appendChild(L.tbl([['Estado']].concat(ys.map(function (a) { return [String(a), 1]; })), rows));
      ah.appendChild(mk('p', 'note', 'Todas as temporadas até a rodada ' + rc + ', para a comparação ser justa. Ano selecionado em negrito. Estados sem jogos no ano aparecem com traço.'));
    }
    drawAnos();
  };

  /* ===================== ESTÁDIOS ===================== */
  P.stad = function () {
    var y = L.year(), R = scopeR(y), p = prevYear(y), Rp = sameR(y, p);
    L.partialNote(y, clear(root('std-partial')));
    var gs = L.pubGames(y, R), mh = clear(root('std-rank')), mm = mh._m || 'pm';
    var MM = { pm: ['Público médio', 'pm', F.int], oc: ['Ocupação média', 'oc', F.pct], tk: ['Ticket médio', 'tk', F.brl], rm: ['Renda média por jogo', 'rm', F.brlc], renda: ['Renda total', 'renda', F.brlc], pub: ['Público total', 'pub', F.compact] };
    var minE = L.isPartial(y) ? 3 : 5;
    function agg2(a, rr) { var by = L.groupBy(L.pubGames(a, rr), function (g) { return g.e; }), o = {}; Object.keys(by).forEach(function (n) { var x = L.agg(by[n]); x.n = n; x.uf = by[n][0].uf; o[n] = x; }); return o; }
    var cur = agg2(y, R), prv = p ? agg2(p, Rp) : {}, cmpCur = p ? agg2(y, Rp) : {};
    function drawRank() {
      clear(mh); var ctl = mk('div', 'filters'); L.seg(ctl, 'Indicador', Object.keys(MM).map(function (k) { return [k, MM[k][0]]; }), mm, function (v) { mm = v; mh._m = v; drawRank(); }); mh.appendChild(ctl);
      var M = MM[mm], E = Object.keys(cur).map(function (n) { return cur[n]; }).filter(function (a) { return a.j >= minE; }), S = sortBy(E, function (a) { return a[M[1]]; });
      var g = mk('div', 'fin-grid'), b = mk('div', 'mvb'); b.appendChild(mk('div', 'flabel', M[0] + ' · estádios com ' + minE + ' jogos ou mais')); L.barList(b, S.slice(0, 15).map(function (a) { return { n: a.n + ' (' + a.uf + ')', v: a[M[1]], sub: a.j + ' jogos' }; }), M[2]); g.appendChild(b);
      var b2 = mk('div', 'mvb'); b2.appendChild(mk('div', 'flabel', 'Menores valores')); L.barList(b2, S.slice(-8).reverse().map(function (a) { return { n: a.n + ' (' + a.uf + ')', v: a[M[1]], sub: a.j + ' jogos' }; }), M[2], { color: COL.gray }); g.appendChild(b2); mh.appendChild(g);
    }
    drawRank();
    var th = clear(root('std-tab')), E = sortBy(Object.keys(cur).map(function (n) { return cur[n]; }), function (a) { return a.pub; });
    var hd = [['Estádio'], ['UF'], ['Jogos', 1], ['Público médio', 1], ['Ocupação', 1], ['Ticket', 1], ['Renda média', 1], ['Público médio vs ' + (p || 'ano anterior'), 1, p ? 'Mesma rodada (até ' + Rp + ') nos dois anos' : '']];
    th.appendChild(L.tbl(hd, E.map(function (a) { var q = prv[a.n], c = cmpCur[a.n]; return [a.n, a.uf, F.int(a.j), F.int(a.pm), F.pct(a.oc), F.brl(a.tk), F.brlc(a.rm), q && c ? dl(c.pm, q.pm) : '—']; })));
    th.appendChild(mk('p', 'note', 'A coluna de variação compara os mesmos jogos disputados até a rodada ' + (p ? Rp : R) + ' nos dois anos. Estádio que não recebeu jogos no ano anterior aparece com traço.'));
  };

  /* ===================== CLUBES ===================== */
  P.clubs = function () {
    var y = L.year(), R = scopeR(y), p = prevYear(y), Rp = sameR(y, p);
    L.partialNote(y, clear(root('cl-partial')));
    var C = L.clubs(y, R), Cp = {}; if (p) L.clubs(p, Rp).forEach(function (c) { Cp[c.s] = c; }); var Cc = {}; if (p) L.clubs(y, Rp).forEach(function (c) { Cc[c.s] = c; });
    var th = clear(root('cl-tab')); th.appendChild(L.tbl([['Clube'], ['UF'], ['Jogos em casa', 1], ['Público médio', 1], ['Ocupação', 1], ['Ticket', 1], ['Renda média', 1], ['Público vs ' + (p || 'ano anterior'), 1]],
      sortBy(C, function (c) { return c.pm; }).map(function (c) { var q = Cp[c.s], d = Cc[c.s]; return [{ node: L.clubCell(c.s, c.n) }, c.uf, F.int(c.j), F.int(c.pm), F.pct(c.oc), F.brl(c.tk), F.brlc(c.rm), q && d ? dl(d.pm, q.pm) : '—']; })));
    th.appendChild(mk('p', 'note', 'Só jogos em que o clube foi mandante. A variação compara os mesmos jogos disputados até a rodada ' + (p ? Rp : R) + ' nos dois anos.'));
    /* detalhe do clube ano a ano */
    var dh = clear(root('cl-det')), all = {}; L.avail.forEach(function (a) { L.clubs(a, G.cmpR()).forEach(function (c) { all[c.s] = c.n; }); });
    var keys = Object.keys(all).sort(function (a, b) { return all[a].localeCompare(all[b], 'pt'); }), sel = dh._s || (C.length ? sortBy(C, function (c) { return c.pm; })[0].s : keys[0]);
    function draw() {
      clear(dh); var ctl = mk('div', 'filters'); L.selectBox(ctl, 'Escolha um clube', 'cl-pick', keys.map(function (k) { return [k, all[k]]; }), sel, function (v) { sel = v; dh._s = v; draw(); }); dh.appendChild(ctl);
      var rc = G.cmpR(), labels = Y.anos.map(String), rowsY = Y.anos.map(function (a) { if (!L.has(a)) return null; var c = L.clubs(a, rc).filter(function (x) { return x.s === sel; })[0]; return c || null; }), ib = Y.anos.map(function (a) { var r = L.ibf(a).filter(function (x) { return x.s === sel; })[0]; return r ? r.ibf : null; });
      var hi = labels.indexOf(String(y)), g = mk('div', 'mv three'); dh.appendChild(g);
      [['Público médio', function (c) { return c.pm; }, F.int], ['Ocupação média', function (c) { return c.oc; }, F.pct], ['Ticket médio', function (c) { return c.tk; }, F.brl], ['Renda média por jogo', function (c) { return c.rm; }, F.brlc], ['Renda por ponto conquistado', function (c) { return c.rpp; }, F.brlc]].forEach(function (m) {
        var c = mk('div', 'lcard'); c.appendChild(mk('h3', null, m[0])); c.appendChild(mk('p', 'cs', all[sel] + ' como mandante, até a rodada ' + rc)); var ph = mk('div', 'plot'); c.appendChild(ph); g.appendChild(c);
        L.onResize(ph, function () { DSC.barChart(ph, labels, rowsY.map(function (r) { return r && m[1](r) != null ? m[1](r) : null; }), { fmt: m[2], hi: hi, h: 200, aria: m[0] }); });
      });
      var c = mk('div', 'lcard'); c.appendChild(mk('h3', null, 'IBF do clube')); c.appendChild(mk('p', 'cs', '100 = clube médio da temporada · quanto o clube eleva a bilheteria de quem o recebe')); var ph = mk('div', 'plot'); c.appendChild(ph); g.appendChild(c);
      L.onResize(ph, function () { DSC.barChart(ph, labels, ib, { fmt: F.d1, hi: hi, h: 200, color: COL.green2, aria: 'IBF por temporada' }); });
      dh.appendChild(mk('p', 'note', 'Clubes que não disputaram a Série A em algum ano aparecem como "em breve" ou sem barra. Renda de anos diferentes está em valores da época.'));
    }
    draw();
  };

  /* ===================== IBF ===================== */
  P.ibf = function () {
    var y = L.year(), I = L.ibf(y), pn = clear(root('ibf-partial')); L.partialNote(y, pn);
    if (L.isPartial(y)) pn.appendChild(mk('span', null, ' O IBF desta edição é provisório e pode mudar.'));
    var rk = clear(root('ibf-rank')), mx = Math.max.apply(null, I.map(function (r) { return r.hi; })) || 1, ul = mk('ol', 'ibf-list'); rk.appendChild(ul);
    var fcol = { Elite: COL.green, Alto: '#4FC79B', 'Médio': COL.gray, Baixo: '#D2484F' };
    var lst = mk('div', 'ibf-list'), MIN = 60, MAX = 180, pp = function (v) { return (v - MIN) / (MAX - MIN) * 100; }; rk.removeChild(ul); rk.appendChild(lst);
    I.forEach(function (r) {
      var row = mk('div', 'ibf-row'); row.appendChild(mk('span', 'rk', r.rk + 'º')); var nm = mk('span', 'nm'); nm.appendChild(L.dot(r.s)); nm.appendChild(mk('b', null, L.nm(r.s))); row.appendChild(nm);
      var tr = mk('div', 'tr'); tr.appendChild(mk('i', 'base')); var bar = mk('i', 'bar'); bar.style.background = r.ibf >= 100 ? (fcol[r.faixa] || COL.green2) : COL.red;
      bar.style.left = Math.min(pp(r.ibf), pp(100)) + '%'; bar.style.width = Math.abs(pp(r.ibf) - pp(100)) + '%'; tr.appendChild(bar);
      var wk = mk('i', 'wsk'); wk.style.left = pp(r.lo) + '%'; wk.style.width = (pp(r.hi) - pp(r.lo)) + '%'; tr.appendChild(wk); row.appendChild(tr);
      row.appendChild(mk('b', 'v', F.d1(r.ibf))); var ch = mk('span', 'fx fx-' + r.faixa.toLowerCase().replace('é', 'e'), r.faixa); row.appendChild(ch);
      row.title = L.nm(r.s) + ' · IBF ' + F.d1(r.ibf) + ' (intervalo ' + F.d1(r.lo) + ' a ' + F.d1(r.hi) + ') · posição entre ' + r.rl + 'º e ' + r.rh + 'º em 90% das simulações'; lst.appendChild(row);
    });
    rk.appendChild(mk('p', 'note', 'Passe o mouse sobre uma linha para ver o intervalo de confiança. Faixas: Elite ≥ 120, Alto ≥ 105, Médio ≥ 95, Baixo < 95.'));
    /* ano a ano */
    var ah = clear(root('ibf-anos')), ys = L.avail.filter(function (a) { return L.ibf(a).length; }), by = {}; ys.forEach(function (a) { L.ibf(a).forEach(function (r) { (by[r.s] = by[r.s] || {})[a] = r; }); });
    var clubsK = sortBy(Object.keys(by), function (s) { return by[s][y] ? by[s][y].ibf : -1; });
    ah.appendChild(L.tbl([['Clube']].concat(ys.map(function (a) { return [String(a) + (L.isPartial(a) ? '*' : ''), 1]; })).concat([['Variação', 1, 'Último ano menos o anterior, em pontos de IBF']]), clubsK.map(function (s) {
      var row = [{ node: L.clubCell(s) }], vs = []; ys.forEach(function (a) { var r = by[s][a]; row.push(r ? { t: F.d1(r.ibf), bg: L.div((r.ibf - 100) / 60), b: String(a) === String(y) } : '—'); vs.push(r ? r.ibf : null); });
      var n = vs.length, d = n > 1 && vs[n - 1] != null && vs[n - 2] != null ? vs[n - 1] - vs[n - 2] : null; row.push(d == null ? '—' : { t: F.sgn(d, F.d1), c: d >= 0 ? '#15805a' : '#D2484F', b: 1 }); return row;
    })));
    ah.appendChild(mk('p', 'note', '* temporada em andamento. O IBF é relativo à média de cada edição (100 = clube médio), então mostra posição relativa e não crescimento absoluto de público.'));
    var lh = clear(root('ibf-line')), ls = lh._s || (I[0] && I[0].s) || clubsK[0];
    function drawLine() {
      clear(lh); var ctl = mk('div', 'filters'); L.selectBox(ctl, 'Acompanhar o clube', 'ibf-pick', clubsK.map(function (s) { return [s, L.nm(s)]; }), ls, function (v) { ls = v; lh._s = v; drawLine(); }); lh.appendChild(ctl);
      var c = mk('div', 'lcard'); c.appendChild(mk('h3', null, 'IBF de ' + L.nm(ls) + ' por temporada')); c.appendChild(mk('p', 'cs', 'Acima de 100, o clube eleva a bilheteria de quem o recebe mais que o clube médio.')); var ph = mk('div', 'plot'); c.appendChild(ph); lh.appendChild(c);
      var labels = Y.anos.map(String), vals = Y.anos.map(function (a) { return by[ls] && by[ls][a] ? by[ls][a].ibf : null; });
      L.onResize(ph, function () { DSC.barChart(ph, labels, vals, { fmt: F.d1, hi: labels.indexOf(String(y)), color: COL.green2, h: 230, aria: 'IBF por temporada' }); });
    }
    drawLine();
    /* efeito por indicador */
    var eh = clear(root('ibf-efeito')); eh.appendChild(L.tbl([['Clube'], ['IBF', 1], ['Efeito na renda', 1], ['Efeito no público', 1], ['Efeito na ocupação', 1], ['Efeito no ticket', 1]], I.map(function (r) {
      function c(v) { return { t: F.spct(v), c: v >= 0 ? '#15805a' : '#D2484F' }; } return [{ node: L.clubCell(r.s) }, F.d1(r.ibf), c(r.ef.renda), c(r.ef.pub), c(r.ef.ocup), c(r.ef.ticket)]; })));
    eh.appendChild(mk('p', 'note', 'Quanto, em média, o indicador do mandante sobe ou desce quando o clube é o visitante, em relação ao normal daquele mandante.'));
    /* dispersão volume x preço */
    var dh = clear(root('ibf-disp')), pts = I.map(function (r) { return { k: r.s, x: r.ef.pub, y: r.ef.ticket, color: fcol[r.faixa] || COL.green2, label: L.nm(r.s), tip: 'Público ' + F.spct(r.ef.pub) + ' · ticket ' + F.spct(r.ef.ticket), sub: 'IBF ' + F.d1(r.ibf) }; });
    L.onResize(dh, function () { L.scatter(dh, pts, { xl: 'Efeito no público (%)', yl: 'Efeito no ticket (%)', fx: function (v) { return v + '%'; }, fy: function (v) { return v + '%'; }, zx: 0, zy: 0, aria: 'Efeito no público e no ticket por clube' }); });
  };

  /* ===================== DINHEIRO ===================== */
  P.money = function () {
    var y = L.year(), R = scopeR(y), p = prevYear(y), Rp = sameR(y, p);
    L.partialNote(y, clear(root('fin-partial')));
    var C = L.clubs(y, R).filter(function (c) { return c.rpp; }), Cp = {}; if (p) L.clubs(p, Rp).forEach(function (c) { Cp[c.s] = c; }); var Cc = {}; if (p) L.clubs(y, Rp).forEach(function (c) { Cc[c.s] = c; });
    var ph = clear(root('fin-ponto')), g = mk('div', 'fin-grid'); ph.appendChild(g);
    var b1 = mk('div', 'mvb'); b1.appendChild(mk('div', 'flabel', 'Quanto de bilheteria cada ponto rendeu')); b1.appendChild(mk('p', 'sub0', 'Renda bruta nos jogos em casa ÷ pontos conquistados na temporada (casa e fora).'));
    L.barList(b1, sortBy(C, function (c) { return c.rpp; }).map(function (c) { return { n: c.n, club: c.s, v: c.rpp, sub: F.brlc(c.renda) + ' ÷ ' + c.pts + ' pontos' }; }), F.brlc); g.appendChild(b1);
    var b2 = mk('div', 'mvb'); b2.appendChild(mk('div', 'flabel', 'Renda × pontos')); var sp = mk('div', 'an-plot'); b2.appendChild(sp); g.appendChild(b2);
    var pts = C.map(function (c) { return { k: c.s, x: c.renda / 1e6, y: c.pts, color: COL.green2, label: c.n, tip: F.brlc(c.renda) + ' · ' + c.pts + ' pontos', sub: F.brlc(c.rpp) + ' por ponto' }; });
    L.onResize(sp, function () { L.scatter(sp, pts, { xl: 'Renda de bilheteria em casa (R$ milhões)', yl: 'Pontos', fx: function (v) { return v; }, fy: function (v) { return v; }, h: 400, aria: 'Renda e pontos por clube' }); });
    ph.appendChild(mk('p', 'note', 'Quem está acima da nuvem converteu pouca renda em muitos pontos; quem está abaixo, o contrário. Bilheteria não é o orçamento do clube, e sim o que o torcedor pagou nos jogos em casa.'));
    /* ano a ano */
    var ah = clear(root('fin-anos')), ys = L.avail, by = {}, rc = G.cmpR(); ys.forEach(function (a) { L.clubs(a, rc).forEach(function (c) { (by[c.s] = by[c.s] || { n: c.n })[a] = c; }); });
    var keys = sortBy(Object.keys(by), function (s) { return by[s][y] && by[s][y].rpp ? by[s][y].rpp : -1; });
    ah.appendChild(L.tbl([['Clube']].concat(ys.map(function (a) { return [String(a), 1]; })), keys.map(function (s) { var row = [{ node: L.clubCell(s, by[s].n) }]; ys.forEach(function (a) { var c = by[s][a]; row.push(c && c.rpp ? { t: F.brlc(c.rpp), b: String(a) === String(y) } : '—'); }); return row; })));
    ah.appendChild(mk('p', 'note', 'Renda de bilheteria por ponto conquistado, até a rodada ' + rc + ' de cada temporada. Valores da época, sem correção pela inflação.'));
    /* custo e lucro, se houver despesa */
    var gs = L.pubGames(y, R).filter(function (g) { return g.desp; }), lh = clear(root('fin-lucro'));
    if (!gs.length) { lh.appendChild(mk('p', 'note', 'Esta temporada ainda não tem despesas de jogo na base.')); return; }
    var by2 = L.groupBy(gs, function (g) { return g.h; }), K = Object.keys(by2).map(function (s) { var a = L.agg(by2[s]); a.s = s; a.n = L.nm(s); return a; });
    var gg = mk('div', 'fin-grid'); lh.appendChild(gg);
    var c1 = mk('div', 'mvb'); c1.appendChild(mk('div', 'flabel', 'Lucro por jogo em casa')); L.barList(c1, sortBy(K, function (a) { return a.lucro / a.j; }).slice(0, 12).map(function (a) { return { n: a.n, club: a.s, v: a.lucro / a.j }; }), F.brlc); gg.appendChild(c1);
    var c2 = mk('div', 'mvb'); c2.appendChild(mk('div', 'flabel', 'Custo por torcedor presente')); L.barList(c2, sortBy(K, function (a) { return a.cpp; }).slice(0, 12).map(function (a) { return { n: a.n, club: a.s, v: a.cpp }; }), F.brl, { color: COL.blue }); gg.appendChild(c2);
  };
})();
