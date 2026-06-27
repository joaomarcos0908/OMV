# OMV — Organiza Minha Vida

Aplicação web **100% front-end** para controle financeiro pessoal. Funciona diretamente no navegador, sem necessidade de servidor ou banco de dados — os dados ficam salvos no `localStorage`.

## Funcionalidades

- **Gastos** — Lançamentos mensais com categorias, suporte a despesas fixas (repetição automática entre meses), filtro por mês e gráfico de distribuição
- **Receitas** — Controle simples de entradas por categoria
- **Metas** — Acompanhamento de objetivos financeiros com barra de progresso
- **Investimentos** — Carteira completa com suporte a:
  - **Ações e FIIs** — cotação automática via [brapi.dev](https://brapi.dev)
  - **Criptomoedas** — cotação automática via [CoinGecko](https://www.coingecko.com)
  - **Renda Fixa** — cálculo automático do valor atual com base em CDI, Selic, taxa prefixada ou IPCA+
  - Gráficos de distribuição da carteira e retorno por ativo
- Painel inicial com resumo mensal de receitas, despesas e saldo

## Tecnologias

- HTML5 + CSS3 — design responsivo com tema claro
- JavaScript (Vanilla) — sem frameworks ou dependências pesadas
- [Chart.js](https://www.chart.js) — gráficos dinâmicos
- APIs públicas: brapi.dev, CoinGecko, Banco Central do Brasil

## Como usar

1. Acesse a [página inicial](Html/paginaInicial.html) pelo navegador
2. Os dados são salvos automaticamente no navegador (`localStorage`)
3. Navegue entre as seções pelos botões na página principal

> Para hospedar online (GitHub Pages, Vercel, etc.), basta fazer upload de todos os arquivos mantendo a estrutura de pastas.

## Estrutura do projeto

```
OMV/
├── Html/              # Páginas HTML
├── JS/                # Scripts da aplicação
├── CSS/               # Folhas de estilo
└── README.md
```

## Licença

MIT
