# Data Score

Site estático do projeto **Data Score** — inteligência de dados do futebol brasileiro (Brasileirão Série A 2025): jogos, desempenho em campo e público & renda, cruzados por uma chave única de partida.

🔗 Site: https://jvictorarj.github.io/datascore/

## O que este repositório contém

- `index.html`, `stats.html`, `renda.html`, `clube.html`, `sobre.html`, `contato.html`, `metodologia.html` — páginas do site
- `assets/style.css`, `assets/app.js` — estilo, classificação e gráficos (SVG, sem dependências)
- `assets/logo.png`, `assets/favicon.png` — identidade visual
- `assets/data.js` — **apenas agregados** (estado, estádio, clube, rodada), os placares usados na classificação e os rankings Top 10

## O que este repositório NÃO contém

As bases completas (jogos, dados de desempenho, público e renda) **não são públicas** e não devem ser versionadas aqui.
O `.gitignore` bloqueia `.xlsx`, `.csv`, `.json` e pastas de dados. Antes de cada `git push`, confira com `git status` e `git diff --cached --stat`.

## Publicação (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Atualizando os números

`assets/data.js` é gerado a partir das bases privadas por um script que fica **fora** deste repositório.
