# Data Score

Site estático do projeto **Data Score** — inteligência de dados do futebol brasileiro (Brasileirão Série A 2025): jogos, desempenho em campo e público & renda, cruzados por uma chave única de partida.

🔗 Site: https://jvictorarj.github.io/datascore/

## O que este repositório contém

- `index.html`, `stats.html`, `renda.html`, `clube.html`, `sobre.html`, `contato.html`, `metodologia.html` — páginas do site
- `assets/style.css`, `assets/app.js` — estilo, classificação e gráficos (SVG, sem dependências)
- `assets/logo.png`, `assets/favicon.png` — identidade visual
- `assets/data.js` — dados da temporada 2025: jogo a jogo (placar, data, estádio, árbitro, público, renda e estatísticas de cada equipe) e agregados por estado, estádio e clube

## Planilhas

As planilhas originais (`.xlsx`) não são versionadas aqui; o `.gitignore` bloqueia `.xlsx`, `.csv` e `.json`.

## Publicação (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Atualizando os números

`assets/data.js` é gerado a partir das planilhas por um script que fica fora deste repositório.
