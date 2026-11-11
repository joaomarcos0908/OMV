# OMV — Organiza Minha Vida

Aplicação web para controle financeiro pessoal com autenticação e dados salvos em nuvem (PostgreSQL via Neon/Vercel).
Hospedagem: Vercel https://omv-lake.vercel.app/

## Funcionalidades

A aplicação é organizada em **3 páginas de app** + uma **landing page pública**:

- **Landing (`index.html`, em `/`)** — página pública indexável, com descrição do produto, recursos, passo a passo, FAQ (FAQPage) e chamadas para o login. É o que o Google indexa.
- **Painel (`Html/principal.html`, em `/app`)** — tudo que envolve o fluxo mensal em uma única tela:
  - **Resumo mensal** — indicadores de receitas, despesas e saldo do mês
    - Layout em duas colunas: receitas à esquerda, gastos à direita, com resumo mensal centralizado no topo
  - **Receitas** — lançamentos por categoria, tabela com editar/remover e gráfico de distribuição
  - **Gastos** — lançamentos por categoria, suporte a despesas fixas (repetição automática entre meses), tabela com editar/remover e gráfico de distribuição
  - Campos em R$ com máscara automática (1.234,56)
  - **Seletor de mês unificado** — um único filtro controla resumo, tabelas e gráficos
  - Botões de navegação no topo para **Investimentos** e **Metas**
- **Investimentos (`Html/investimentos.html`, em `/app/investimentos`)** — carteira completa com suporte a:
  - **Ações, FIIs e fundos** — cotação automática em BRL
  - **Criptomoedas** — cotação automática em BRL, convertida pela taxa do Banco Central
  - Cotações buscadas em lote por `api/cotacoes.js`, com cache de 60s no servidor
  - **Renda Fixa** — cálculo automático do valor atual com base em CDI, Selic, taxa prefixada ou IPCA+
  - Gráficos de distribuição da carteira e retorno por ativo
- **Metas (`Html/metas.html`, em `/app/metas`)** — acompanhamento de objetivos financeiros com barra de progresso
- **Login / cadastro (`Html/login.html`, em `/login`)**

As páginas do app e o login são marcadas com `noindex` e bloqueadas no `robots.txt`: só a landing entra no índice do Google.

## Tecnologias

- HTML5 + CSS3 — design responsivo com tema escuro inspirado no TradingView
- Tipografia Inter, ícones em SVG inline e campos com máscara de moeda
- JavaScript (Vanilla) — sem frameworks ou dependências pesadas
- [Chart.js](https://www.chart.js) — gráficos dinâmicos
- Backend serverless (Vercel Functions) + PostgreSQL — autenticação e persistência por usuário
- APIs públicas: Yahoo Finance (cotações de Ações/FIIs/cripto), CoinGecko (fallback de cripto), Banco Central do Brasil (CDI, Selic, IPCA, dólar)

## Rotas

O `vercel.json` expõe URLs amigáveis com `rewrites` (os arquivos em `Html/` continuam existindo com os mesmos nomes):

| URL pública          | Arquivo servido         |
| -------------------- | ----------------------- |
| `/`                  | `index.html` (landing)  |
| `/app`               | `Html/principal.html`   |
| `/app/investimentos` | `Html/investimentos.html`|
| `/app/metas`         | `Html/metas.html`       |
| `/login`             | `Html/login.html`       |

Por isso, **todos os caminhos de asset e link nos HTMLs e JS são absolutos** (`/CSS/...`, `/JS/...`, `/app`, `/login`).

## Segurança

- Senhas com hash **bcrypt** (custo 12); nunca retornadas pela API
- **JWT HS256** com claim `ver` = `token_version` do usuário. Trocar a senha incrementa o `token_version` e **revoga na hora todos os tokens emitidos antes** (inclusive sessões abertas em outros dispositivos)
- **Bloqueio de conta**: 5 tentativas erradas travam o login por 15 minutos; o login válido zera o contador
- **Rate limit** por IP nas rotas de autenticação
- **Allowlist de categorias e tipos** no servidor (`api/_lib/validar.js`), idêntica às opções dos formulários — a API não aceita mais texto livre nesses campos
- **Escape de HTML** em todo dado vindo do banco antes de ir para `innerHTML` (inclusive aspas, para não quebrar `aria-label` e permitir injeção de atributos)
- **CSP** sem `unsafe-inline` em `script-src`: nenhum `onclick` inline no código
- Cabeçalhos: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`

## SEO

- Landing em `/` com title, description, canonical, Open Graph e Twitter Card
- JSON-LD: `WebSite`, `SoftwareApplication` e `FAQPage`
- `robots.txt` e `sitemap.xml` na raiz
- Ícones: `favicon.ico`, PNGs de 16/32/48/180/192/512, `apple-touch-icon`, `site.webmanifest` e `og-image.png` (1200×630)
- Os ícones são gerados a partir de `assets/marca.svg` com `npm run gerar-icones`

## Como usar

1. Acesse a landing page em `/` e clique em **Criar conta grátis** (vai para `/login`)
2. Faça login ou cadastro
3. Navegue entre as páginas pelos botões no topo
4. O seletor de mês filtra todos os dados da página principal de uma vez

## Desenvolvimento

```bash
npm install          # dependências
npm run checar       # sintaxe, JSON, assets e allowlists
npm run gerar-icones # regenera PNGs/ICO/OG a partir de assets/marca.svg
```

Variáveis de ambiente (Vercel): `DATABASE_URL` e `JWT_SECRET`.

> Para hospedar online (Vercel, etc.), basta fazer upload de todos os arquivos mantendo a estrutura de pastas.

## Estrutura do projeto

```
OMV/
├── index.html            # Landing page pública (indexável)
├── robots.txt
├── sitemap.xml
├── vercel.json           # Rewrites, redirects e cabeçalhos (CSP)
├── Html/
│   ├── principal.html    # Painel: resumo + receitas + gastos
│   ├── login.html        # Login / cadastro
│   ├── investimentos.html# Carteira de investimentos
│   └── metas.html        # Metas financeiras
├── JS/                   # Scripts da aplicação
│   ├── auth.js           # Autenticação e cliente da API
│   ├── principal.js      # Lógica da página principal
│   ├── investimentos.js
│   ├── metas.js
│   ├── login.js
│   └── landing.js
├── CSS/                  # Folhas de estilo
├── assets/               # Marca, ícones e imagem social
├── scripts/
│   ├── gerar-icones.mjs  # Gera favicons/PNG/ICO/OG a partir do SVG
│   └── checar.mjs        # Verificações locais
├── api/                  # Backend serverless (Vercel Functions)
│   ├── _lib/
│   │   ├── db.js         # Pool Postgres + migrações idempotentes
│   │   ├── autenticar.js # Valida JWT e token_version
│   │   ├── rateLimit.js
│   │   └── validar.js    # Validações e allowlists
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── alterar-senha.js
│   │   └── me.js
│   ├── cotacoes.js       # Proxy de cotações (Yahoo + fallback CoinGecko)
│   ├── gastos.js
│   ├── receitas.js
│   ├── investimentos.js
│   └── metas.js
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

## Privacidade e direitos dos titulares

- `/privacidade`: pol�tica p�blica com identifica��o do controlador e contato.
- `/app/privacidade`: corre��o do nome, exporta��o JSON e exclus�o autenticada da conta.
- `npm test`: testes isolados dos controles de acesso e opera��es de privacidade, sem conex�o com o banco real.
- `docs/adequacao-lgpd.md`: invent�rio, an�lise t�cnica e pend�ncias de adequa��o.
- `docs/procedimentos-privacidade.md`: atendimento, reten��o, fornecedores e incidentes.

O Chart.js 4.4.0 � servido de `assets/vendor/`, com licen�a inclu�da. As p�ginas usam fontes locais do sistema e n�o dependem de Google Fonts. A adequa��o integral depende tamb�m de contratos, regi�es, reten��o e procedimentos operacionais documentados no relat�rio.
