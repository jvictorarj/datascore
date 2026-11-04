/* Data Score — arranque das páginas por temporada. */
(function () {
  'use strict';
  var L = window.L, PG = window.PG; if (!L || !PG) return;
  var bg = document.querySelector('.burger'), nav = document.querySelector('.nav');
  if (bg && nav) bg.addEventListener('click', function () { var o = nav.classList.toggle('open'); bg.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  var yb = document.getElementById('yearbar'); if (yb) L.yearBar(yb);
  var pg = document.body.getAttribute('data-page'), fn = PG.P[pg];
  if (fn) { try { fn(); } catch (e) { console.error(e); } L.onYear(function () { try { fn(); } catch (e) { console.error(e); } }); }
})();
