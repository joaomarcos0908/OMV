# OMV — Organiza Minha Vida

Aplicação web para controle financeiro pessoal com autenticação e dados salvos em nuvem (PostgreSQL via Neon/Vercel).
Hospedagem: Vercel https://omv-lake.vercel.app/

## Funcionalidades

A aplicação é organizada em **3 páginas**:

- **Página principal (`index.html`)** — tudo que envolve o fluxo mensal em uma única tela:
  - **Resumo mensal** — indicadores de receitas, despesas e saldo do mês
    - Layout em duas colunas: receitas à esquerda, gastos à direita, com resumo mensal centralizado no topo
  - **Receitas** — lançamentos por categoria, tabela com editar/remover e gráfico de distribuição
  - **Gastos** — lançamentos por categoria, suporte a despesas fixas (repetição automática entre meses), tabela com editar/remover e gráfico de distribuição
  - Campos em R$ com máscara automática (1.234,56)
  - **Seletor de mês unificado** — um único filtro controla resumo, tabelas e gráficos
  - Botões de navegação no topo para **Investimentos** e **Metas**
- **Investimentos (`Html/investimentos.html`)** — carteira completa com suporte a:
  - **Ações, FIIs e fundos** — cotação automática em BRL
  - **Criptomoedas** — cotação automática em BRL, convertida pela taxa do Banco Central
  - Cotações buscadas em lote por `api/cotacoes.js`, com cache de 60s no servidor
  - **Renda Fixa** — cálculo automático do valor atual com base em CDI, Selic, taxa prefixada ou IPCA+
  - Gráficos de distribuição da carteira e retorno por ativo
- **Metas (`Html/metas.html`)** — acompanhamento de objetivos financeiros com barra de progresso

## Tecnologias

- HTML5 + CSS3 — design responsivo com tema escuro inspirado no TradingView
- Tipografia Inter, ícones em SVG inline e campos com máscara de moeda
- JavaScript (Vanilla) — sem frameworks ou dependências pesadas
- [Chart.js](https://www.chart.js) — gráficos dinâmicos
- Backend serverless (Vercel Functions) + PostgreSQL — autenticação e persistência por usuário
- APIs públicas: Yahoo Finance (cotações de Ações/FIIs/cripto), CoinGecko (fallback de cripto), Banco Central do Brasil (CDI, Selic, IPCA, dólar)

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
│   ├── cotacoes.js       # Proxy de cotações (Yahoo + fallback CoinGecko)
└── README.md
```

## Cotações

`GET /api/cotacoes?ativos=PETR4,HGLG11,BTC&tipos=Ações,FIIs,Criptomoedas` (exige JWT).

O proxy roda no servidor porque o Yahoo Finance não envia headers CORS e porque
o CoinGecko na versão gratuita responde 429 com frequência. O servidor normaliza
o ticker (`PETR4` → `PETR4.SA`, `BTC` → `BTC-USD`), converte cripto de USD para
BRL com a série 1 do SGS e mantém cache de 60s por símbolo. Ticker inexistente
volta como `null` sem afetar os demais.

## Licença

MIT
