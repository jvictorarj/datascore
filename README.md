# Data Score

Site estático (HTML/CSS/JS) sobre público e renda do Brasileirão Série A, por temporada (2022–2026).

## Estrutura
- Páginas: index, campeonato, estados, estadios, clubes, ibf, financeiro, sobre, metodologia, contato. (renda.html redireciona para campeonato.html.)
- Arquivo 2025: stats.html e clube.html (estatísticas de campo, usam data.js/app.js).
- assets/anos.js: dados por temporada (`window.DSY`) — gerado por build_years.py a partir das bases.
- assets/lib.js, charts.js, pg1.js, pg2.js, pg.js: biblioteca, gráficos e páginas por temporada.

## Adicionar uma temporada
Colocar as bases do ano em build_years.py, rodar o script (gera anos.js novo) e subir anos.js. As páginas passam a mostrar o ano no seletor automaticamente.
