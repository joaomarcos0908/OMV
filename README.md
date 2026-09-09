# OMV — Organiza Minha Vida

Aplicação web para controle financeiro pessoal com autenticação e dados salvos em nuvem (PostgreSQL via Neon/Vercel).
Hospedagem: Vercel https://omv-lake.vercel.app/

## Funcionalidades

A aplicação é organizada em **3 páginas**:

- **Página principal (`index.html`)** — tudo que envolve o fluxo mensal em uma única tela:
  - **Resumo mensal** — indicadores de receitas, despesas e saldo do mês
  - **Receitas** — lançamentos por categoria, tabela com editar/remover e gráfico de distribuição
  - **Gastos** — lançamentos por categoria, suporte a despesas fixas (repetição automática entre meses), tabela com editar/remover e gráfico de distribuição
  - **Seletor de mês unificado** — um único filtro controla resumo, tabelas e gráficos
  - Botões de navegação no topo para **Investimentos** e **Metas**
- **Investimentos (`Html/investimentos.html`)** — carteira completa com suporte a:
  - **Ações e FIIs** — cotação automática via API externa
  - **Criptomoedas** — cotação automática via [CoinGecko](https://www.coingecko.com)
  - **Renda Fixa** — cálculo automático do valor atual com base em CDI, Selic, taxa prefixada ou IPCA+
  - Gráficos de distribuição da carteira e retorno por ativo
- **Metas (`Html/metas.html`)** — acompanhamento de objetivos financeiros com barra de progresso

## Tecnologias

- HTML5 + CSS3 — design responsivo com tema escuro
- JavaScript (Vanilla) — sem frameworks ou dependências pesadas
- [Chart.js](https://www.chart.js) — gráficos dinâmicos
- Backend serverless (Vercel Functions) + PostgreSQL — autenticação e persistência por usuário
- APIs públicas: CoinGecko, Banco Central do Brasil

## Como usar

1. Acesse a aplicação e faça login (a raiz redireciona para `Html/login.html`)
2. Livre para navegar entre as páginas pelos botões no topo
3. O seletor de mês filtra todos os dados da página principal de uma vez

> Para hospedar online (Vercel, etc.), basta fazer upload de todos os arquivos mantendo a estrutura de pastas.

## Estrutura do projeto

```
OMV/
├── index.html            # Página principal  (resumo + receitas + gastos)
├── Html/
│   ├── login.html        # Login / cadastro
│   ├── investimentos.html# Carteira de investimentos
│   └── metas.html        # Metas financeiras
├── JS/                   # Scripts da aplicação
│   ├── auth.js           # Autenticação e cliente da API
│   ├── principal.js      # Lógica da página principal
│   ├── investimentos.js
│   ├── metas.js
│   └── login.js
├── CSS/                  # Folhas de estilo
├── api/                  # Backend serverless (Vercel Functions)
└── README.md
```

## Licença

MIT
