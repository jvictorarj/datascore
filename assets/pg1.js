/* Data Score — páginas por temporada (Início, Campeonato). */
(function () {
  'use strict';
  var L = window.L; if (!L) return;
  var F = L.F, mk = L.mk, COL = L.COL, DSC = window.DSC, Y = L.Y, P = {};
  function root(id) { return document.getElementById(id); }
  function clear(n) { if (n) n.textContent = ''; return n; }
  function scopeR(y) { return L.isPartial(y) ? L.lastFull(y) : 38; }
  function cmpR() { var r = 38; L.avail.forEach(function (a) { r = Math.min(r, scopeR(a)); }); return r; }
  function prevYear(y) { var p = null; L.avail.forEach(function (a) { if (+a < +y) p = a; }); return p; }
  function kpi(parent, label, value, sub) { var c = mk('div', 'kpi'); c.appendChild(mk('div', 'kl', label)); c.appendChild(mk('div', 'kv', value)); if (sub != null) { var s = mk('div', 'ks'); if (sub.nodeType) s.appendChild(sub); else s.textContent = sub; c.appendChild(s); } parent.appendChild(c); return c; }
  function deltaEl(cur, prev, pctMode, labelY, rodTxt) {
    var s = mk('span', 'dl');
    if (prev == null || !prev) { s.textContent = 'sem ano anterior para comparar'; return s; }
    var d = pctMode ? cur - prev : (cur / prev - 1) * 100, b = mk('b', d >= 0 ? 'up' : 'dn', (d >= 0 ? '▲ ' : '▼ ') + (pctMode ? Math.abs(d).toFixed(1).replace('.', ',') + ' p.p.' : F.pct(Math.abs(d))));
    s.appendChild(b); s.appendChild(document.createTextNode(' vs ' + labelY + (rodTxt || ''))); return s;
  }
  var METS = {
    oc: ['Ocupação média', function (a) { return a.oc; }, F.pct], tk: ['Ticket médio', function (a) { return a.tk; }, F.brl], rm: ['Renda média por jogo', function (a) { return a.rm; }, F.brlc],
    pm: ['Público médio por jogo', function (a) { return a.pm; }, F.int], renda: ['Renda total', function (a) { return a.renda; }, F.brlc], pub: ['Público total', function (a) { return a.pub; }, F.compact]
  };
  function weekday(n) { return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][n]; }
  function slot(g) { var h = parseInt((g.hora || '0').slice(0, 2), 10); return h < 16 ? 'Até 15h59' : h < 18 ? '16h às 17h59' : h < 20 ? '18h às 19h59' : '20h ou mais'; }
  function jogoCell(g) { var sp = mk('span', 'cn'); sp.appendChild(L.dot(g.h)); sp.appendChild(mk('b', null, g.h)); sp.appendChild(mk('em', null, g.gh != null ? g.gh + ' x ' + g.ga : 'x')); sp.appendChild(mk('b', null, g.a)); sp.appendChild(L.dot(g.a)); sp.title = L.nm(g.h) + ' x ' + L.nm(g.a); return sp; }
  window.PG = { P: P, root: root, clear: clear, scopeR: scopeR, cmpR: cmpR, prevYear: prevYear, kpi: kpi, deltaEl: deltaEl, METS: METS, weekday: weekday, slot: slot, jogoCell: jogoCell };

  /* ===================== INÍCIO ===================== */
  P.home = function () {
    var y = L.year(), R = scopeR(y), gs = L.pubGames(y, R), A = L.agg(gs), p = prevYear(y), kp = clear(root('home-kpis')), nw = clear(root('home-news'));
    var hd = root('home-ano'); if (hd) hd.textContent = y;
    var pn = root('home-partial'); clear(pn); L.partialNote(y, pn);
    var Rp = p ? Math.min(R, scopeR(p)) : null, Ap = p ? L.agg(L.pubGames(p, Rp)) : null, Ac = p ? L.agg(L.pubGames(y, Rp)) : null, rt = p && Rp < 38 ? ' (até a rodada ' + Rp + ')' : '';
    kpi(kp, 'Público total', F.int(A.pub), p ? deltaEl(Ac.pub, Ap.pub, false, p, rt) : A.j + ' jogos'); kpi(kp, 'Renda total', F.brlc(A.renda), p ? deltaEl(Ac.renda, Ap.renda, false, p, rt) : F.brlfull(A.renda));
    kpi(kp, 'Ocupação média', F.pct(A.oc), p ? deltaEl(Ac.oc, Ap.oc, true, p, rt) : 'público ÷ capacidade'); kpi(kp, 'Ticket médio', F.brl(A.tk), p ? deltaEl(Ac.tk, Ap.tk, false, p, rt) : 'média do ticket dos jogos');
    /* manchetes */
    var minE = L.isPartial(y) ? 3 : 5, byE = L.groupBy(gs, function (g) { return g.e; }), E = Object.keys(byE).map(function (n) { var a = L.agg(byE[n]); a.n = n; a.uf = byE[n][0].uf; return a; }).filter(function (a) { return a.j >= minE; });
    var byU = L.groupBy(gs, function (g) { return g.uf; }), U = Object.keys(byU).map(function (u) { var a = L.agg(byU[u]); a.u = u; return a; });
    function top(arr, f, dir) { return arr.slice().sort(function (a, b) { return (f(b) - f(a)) * (dir || 1); })[0]; }
    var news = [], gP = top(gs, function (g) { return g.pub; }), gR = top(gs, function (g) { return g.renda; }), gO = top(gs, function (g) { return g.pub / g.cap; }, -1);
    if (gP) news.push(['Maior público', F.int(gP.pub), L.nm(gP.h) + ' x ' + L.nm(gP.a) + ', no ' + gP.e + ' (rodada ' + gP.rod + ').', 'campeonato.html#tops']);
    if (gR) news.push(['Maior renda', F.brlc(gR.renda), 'Em ' + L.nm(gR.h) + ' x ' + L.nm(gR.a) + ', no ' + gR.e + ', com ticket médio de ' + F.brl(gR.tk) + '.', 'campeonato.html#tops']);
    if (E.length) { var e1 = top(E, function (a) { return a.oc; }), e2 = top(E, function (a) { return a.tk; }); news.push(['Estádio mais cheio', F.pct(e1.oc), e1.n + ' (' + e1.uf + '): é a ocupação média nos ' + e1.j + ' jogos do ano.', 'estadios.html']); news.push(['Ingresso mais caro', F.brl(e2.tk), 'Ticket médio no ' + e2.n + ' (' + e2.uf + '), o mais alto entre os estádios do ano.', 'estadios.html']); }
    if (U.length) { var u1 = top(U, function (a) { return a.pub; }); news.push(['Estado que mais leva gente', F.compact(u1.pub), (L.UFN[u1.u] || u1.u) + ' reuniu ' + F.pct(u1.pub / A.pub * 100) + ' de todo o público do campeonato.', 'estados.html']); }
    var ib = L.ibf(y)[0]; if (ib) news.push(['Quem mais mexe com a bilheteria', 'IBF ' + F.d1(ib.ibf), L.nm(ib.s) + ' é o clube que mais eleva ticket e público de quem o recebe (100 é a média).', 'ibf.html']);
    var C = L.clubs(y, R).filter(function (c) { return c.rpp; });
    if (C.length) { var c1 = top(C, function (c) { return c.rpp; }), c2 = top(C, function (c) { return c.rpp; }, -1); news.push(['Ponto mais caro (em bilheteria)', F.brlc(c1.rpp), 'Cada ponto do ' + c1.n + ' rendeu isso de bilheteria nos jogos em casa. O ponto mais "barato" foi do ' + c2.n + ': ' + F.brlc(c2.rpp) + '.', 'financeiro.html#ponto']); }
    if (gO) news.push(['Estádio mais vazio', F.pct(gO.pub / gO.cap * 100), L.nm(gO.h) + ' x ' + L.nm(gO.a) + ' (rodada ' + gO.rod + ') teve a menor ocupação do ano, no ' + gO.e + '.', 'campeonato.html#tops']);
    news.forEach(function (n) { var c = mk('a', 'news'); c.href = n[3]; c.appendChild(mk('div', 'nk', n[0])); c.appendChild(mk('div', 'nv', n[1])); c.appendChild(mk('p', 'nt', n[2])); c.appendChild(mk('span', 'nl', 'Ver mais →')); nw.appendChild(c); });
  };

  /* ===================== CAMPEONATO ===================== */
  P.camp = function () {
    var y = L.year(), R = scopeR(y), gs = L.pubGames(y, R), A = L.agg(gs), p = prevYear(y);
    var pn = clear(root('camp-partial')); L.partialNote(y, pn);
    var kp = clear(root('camp-kpis')); kp.className = 'kpis six';
    var Rp = p ? Math.min(R, scopeR(p)) : null, Ap = p ? L.agg(L.pubGames(p, Rp)) : null, Ac = p ? L.agg(L.pubGames(y, Rp)) : null, rt = p && Rp < 38 ? ' (até a rodada ' + Rp + ')' : '';
    [['Público total', F.compact(A.pub), 'pub', false], ['Renda total', F.brlc(A.renda), 'renda', false], ['Ocupação média', F.pct(A.oc), 'oc', true], ['Ticket médio', F.brl(A.tk), 'tk', false], ['Renda média por jogo', F.brlc(A.rm), 'rm', false], ['Público médio por jogo', F.int(A.pm), 'pm', false]].forEach(function (k) {
      kpi(kp, k[0], k[1], p ? deltaEl(Ac[k[2]], Ap[k[2]], k[3], p, rt) : A.j + ' jogos analisados');
    });
    /* ano a ano */
    var ah = clear(root('camp-anos')), mode = ah._mode || (L.avail.some(function (a) { return L.isPartial(a); }) ? 'mesma' : 'toda');
    function drawAnos() {
      clear(ah); var rc = cmpR(), partialAny = L.avail.some(function (a) { return L.isPartial(a); });
      var ctl = mk('div', 'filters'); if (partialAny) L.seg(ctl, 'Comparar', [['mesma', 'Até a mesma rodada (' + rc + ')'], ['toda', 'Temporada inteira disponível']], mode, function (v) { mode = v; ah._mode = v; drawAnos(); }); ah.appendChild(ctl);
      var labels = Y.anos.map(String), data = Y.anos.map(function (a) { return L.has(a) ? L.agg(L.pubGames(a, mode === 'mesma' ? rc : null)) : null; }), hi = labels.indexOf(String(y)), partial = []; Y.anos.forEach(function (a, i) { if (mode === 'toda' && L.has(a) && L.isPartial(a)) partial.push(i); });
      var g = mk('div', 'mv three'); ah.appendChild(g);
      ['oc', 'tk', 'rm', 'pm', 'renda', 'pub'].forEach(function (k) {
        var M = METS[k], c = mk('div', 'lcard'); c.appendChild(mk('h3', null, M[0])); var tot = k === 'renda' || k === 'pub'; c.appendChild(mk('p', 'cs', tot && mode === 'toda' && partial.length ? '* temporada parcial: total ainda incompleto' : (mode === 'mesma' ? 'Todas as temporadas até a rodada ' + rc : 'Todas as rodadas com dados')));
        var ph = mk('div', 'plot'); c.appendChild(ph); g.appendChild(c);
        L.onResize(ph, function () { DSC.barChart(ph, labels, data.map(function (a) { return a ? M[1](a) : null; }), { fmt: M[2], hi: hi, partial: partial, h: 210, aria: M[0] + ' por temporada' }); });
      });
      var rows = Y.anos.map(function (a, i) { var d = data[i], pd = i > 0 ? data[i - 1] : null; if (!d) return [String(a), '—', '—', '—', '—', '—', '—']; var dl = pd ? { t: F.spct((d.renda / pd.renda - 1) * 100), c: d.renda >= pd.renda ? '#15805a' : '#D2484F', b: 1 } : '—'; return [String(a) + (L.isPartial(a) && mode === 'toda' ? ' (parcial)' : ''), F.int(d.j), F.pct(d.oc), F.brl(d.tk), F.int(d.pm), F.brlc(d.renda), dl]; });
      ah.appendChild(L.tbl([['Temporada'], ['Jogos', 1], ['Ocupação', 1], ['Ticket médio', 1], ['Público médio', 1], ['Renda total', 1], ['Renda vs ano anterior', 1]], rows));
      ah.appendChild(mk('p', 'note', 'Temporadas sem dados aparecem como "em breve" e entram aqui assim que as bases forem carregadas. Para comparar de forma justa uma temporada em andamento, use "Até a mesma rodada". A renda de anos diferentes está em valores da época (sem correção pela inflação).'));
    }
    drawAnos();
    /* rodada a rodada */
    var rh = clear(root('camp-rod')), rs = []; for (var r = 1; r <= 38; r++) rs.push(L.agg(gs.filter(function (g) { return g.rod === r; })));
    var lab = rs.map(function (_, i) { return String(i + 1); }), gr = mk('div', 'mv three'); rh.appendChild(gr);
    [['Público médio por rodada', 'pm', F.int, '#298463'], ['Ticket médio por rodada', 'tk', F.brl, '#2D3776'], ['Ocupação por rodada', 'oc', F.pct, '#15AD76']].forEach(function (c) {
      var vals = rs.map(function (a) { return a.j ? METS[c[1]][1](a) : null; }), vv = vals.filter(function (v) { return v != null; }), avg = L.mean(vv), card = mk('div', 'lcard');
      card.appendChild(mk('h3', null, c[0])); card.appendChild(mk('p', 'cs', 'Tracejado: média da temporada (' + c[2](avg) + ').')); var ph = mk('div', 'plot'); card.appendChild(ph); gr.appendChild(card);
      L.onResize(ph, function () { DSC.lineChart(ph, lab, vals, { avg: avg, avgLabel: '', color: c[3], fmt: c[2], every: 5, labels: false, h: 230, tipLabel: 'Rodada ', aria: c[0] }); });
    });
    /* quando */
    var wh = clear(root('camp-when')), wmode = wh._m || 'dia', wm = wh._k || 'pm';
    function drawWhen() {
      clear(wh); var ctl = mk('div', 'filters');
      L.seg(ctl, 'Agrupar por', [['dia', 'Dia da semana'], ['hora', 'Horário da partida']], wmode, function (v) { wmode = v; wh._m = v; drawWhen(); });
      L.seg(ctl, 'Indicador', [['pm', 'Público médio'], ['tk', 'Ticket médio'], ['oc', 'Ocupação'], ['rm', 'Renda média']], wm, function (v) { wm = v; wh._k = v; drawWhen(); }); wh.appendChild(ctl);
      var order = wmode === 'dia' ? [1, 2, 3, 4, 5, 6, 0] : ['Até 15h59', '16h às 17h59', '18h às 19h59', '20h ou mais'], by = L.groupBy(gs, function (g) { return wmode === 'dia' ? g.dow : slot(g); });
      var M = METS[wm], items = order.filter(function (k) { return by[k]; }).map(function (k) { var a = L.agg(by[k]); return { n: wmode === 'dia' ? weekday(k) : k, v: M[1](a), a: a }; });
      var g = mk('div', 'fin-grid'), l = mk('div', 'mvb'); l.appendChild(mk('div', 'flabel', M[0] + ' · por ' + (wmode === 'dia' ? 'dia da semana' : 'horário'))); L.barList(l, items, M[2], { noRank: true }); g.appendChild(l);
      var r2 = mk('div', 'mvb'); r2.appendChild(mk('div', 'flabel', 'Resumo')); r2.appendChild(L.tbl([[wmode === 'dia' ? 'Dia' : 'Horário'], ['Jogos', 1], ['Público médio', 1], ['Ticket', 1], ['Ocupação', 1]], items.map(function (x) { return [x.n, F.int(x.a.j), F.int(x.a.pm), F.brl(x.a.tk), F.pct(x.a.oc)]; }))); g.appendChild(r2); wh.appendChild(g);
    }
    drawWhen();
    /* maiores jogos */
    var th = clear(root('camp-tops')), tm = th._m || 'pub';
    function drawTops() {
      clear(th); var ctl = mk('div', 'filters'), TM = { pub: ['Maior público', function (g) { return g.pub; }, -1], renda: ['Maior renda', function (g) { return g.renda; }, -1], oc: ['Maior ocupação', function (g) { return g.pub / g.cap; }, -1], tk: ['Maior ticket', function (g) { return g.tk; }, -1], vazio: ['Menor ocupação', function (g) { return g.pub / g.cap; }, 1] };
      L.seg(ctl, 'Ranking de jogos', Object.keys(TM).map(function (k) { return [k, TM[k][0]]; }), tm, function (v) { tm = v; th._m = v; drawTops(); }); th.appendChild(ctl);
      var M = TM[tm], Ls = gs.slice().sort(function (a, b) { return (M[1](a) - M[1](b)) * M[2]; }).slice(0, 10);
      th.appendChild(L.tbl([['#'], ['Jogo'], ['Rodada', 1], ['Estádio'], ['Público', 1], ['Renda', 1], ['Ocupação', 1], ['Ticket', 1]], Ls.map(function (g, i) { return [String(i + 1), { node: jogoCell(g) }, String(g.rod), g.e, F.int(g.pub), F.brlfull(g.renda), F.pct(g.pub / g.cap * 100), F.brl(g.tk)]; })));
    }
    drawTops();
  };
})();
