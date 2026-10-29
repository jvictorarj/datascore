# Data Score

Site estático do projeto **Data Score** — inteligência de dados do futebol brasileiro (Brasileirão Série A 2025): jogos, desempenho em campo e público & renda, cruzados por uma chave única de partida.

🔗 Site: https://jvictorarj.github.io/datascore/

## O que este repositório contém

- `index.html`, `dados.html`, `sobre.html`, `metodologia.html`, `contato.html` — páginas do site
- `assets/style.css`, `assets/app.js` — estilo e gráficos (SVG, sem dependências)
- `assets/data.js` — **apenas indicadores agregados** (por clube, dia, horário, região, rodada)

## O que este repositório NÃO contém

As bases completas (jogos, dados de desempenho, público e renda) **não são públicas** e não devem ser versionadas aqui.
O `.gitignore` bloqueia `.xlsx`, `.csv`, `.json` e pastas de dados. Antes de cada `git push`, confira com `git status` e `git diff --cached --stat`.

## Publicação (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Atualizando os números

`assets/data.js` é gerado a partir das bases privadas por um script que fica **fora** deste repositório.
