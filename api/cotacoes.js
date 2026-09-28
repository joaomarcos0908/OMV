const { autenticar } = require('./_lib/autenticar');
const { checkRateLimit } = require('./_lib/rateLimit');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 60 * 1000;
const CACHE_TTL_DOLAR_MS = 60 * 60 * 1000;
const MAX_ATIVOS = 40;

const CRYPTO_MAP = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', DOGE: 'dogecoin', XRP: 'ripple',
  ADA: 'cardano', DOT: 'polkadot', MATIC: 'matic-network', LINK: 'chainlink',
  UNI: 'uniswap', AVAX: 'avalanche-2', ATOM: 'cosmos', LTC: 'litecoin',
  BCH: 'bitcoin-cash', XLM: 'stellar', TRX: 'tron', FIL: 'filecoin',
  APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', PEPE: 'pepe',
  SHIB: 'shiba-inu', SUI: 'sui', NEAR: 'near', AAVE: 'aave', AXS: 'axie-infinity',
  SAND: 'the-sandbox', MANA: 'decentraland', FTM: 'fantom', ALGO: 'algorand',
  VET: 'vechain', EGLD: 'elrond-erd-2', THETA: 'theta-token', HNT: 'helium',
  ICP: 'internet-computer', RUNE: 'thorchain', CRV: 'curve-dao-token',
  MKR: 'maker', COMP: 'compound', YFI: 'yearn-finance', SNX: 'havven',
  SUSHI: 'sushi', CAKE: 'pancakeswap', KSM: 'kusama', ZEC: 'zcash',
  DASH: 'dash', XMR: 'monero', EOS: 'eos', BNB: 'binancecoin',
  WBTC: 'wrapped-bitcoin', DAI: 'dai', USDC: 'usd-coin', USDT: 'tether',
  TUSD: 'true-usd', BUSD: 'binance-usd', QNT: 'quant-network',
  CHZ: 'chiliz', ENJ: 'enjincoin', BAT: 'basic-attention-token',
  ZIL: 'zilliqa', WAVES: 'waves', XTZ: 'tezos', HBAR: 'hedera-hashgraph',
  FLOW: 'flow', MINA: 'mina-protocol', ROSE: 'oasis-network',
  STX: 'blockstack', FET: 'fetch-ai', GRT: 'the-graph', OCEAN: 'ocean-protocol',
  BAL: 'balancer', '1INCH': '1inch', DYDX: 'dydx', GALA: 'gala',
  ILV: 'illuvium', ALPHA: 'alpha-finance'
};

const cacheCotacao = new Map();
const inflightCotacao = new Map();
let cacheDolar = { valor: null, expiraEm: 0 };
let inflightDolar = null;

// TTL conta a partir da resolução, não do pedido: uma resposta lenta do Yahoo
// não pode consumir a janela de cache antes de devolver o valor. O inflight
// evita que N chamadas simultâneas do mesmo ticker virem N requisições.
function comCache(chave, calcular) {
  const guardado = cacheCotacao.get(chave);
  if (guardado && guardado.expiraEm > Date.now()) return Promise.resolve(guardado.valor);
  if (inflightCotacao.has(chave)) return inflightCotacao.get(chave);
  const promessa = Promise.resolve()
    .then(calcular)
    .then((valor) => {
      cacheCotacao.set(chave, { valor, expiraEm: Date.now() + CACHE_TTL_MS });
      return valor;
    })
    .finally(() => inflightCotacao.delete(chave));
  inflightCotacao.set(chave, promessa);
  return promessa;
}

async function buscarDolar() {
  if (cacheDolar.valor != null && cacheDolar.expiraEm > Date.now()) return cacheDolar.valor;
  if (inflightDolar) return inflightDolar;
  inflightDolar = (async () => {
    try {
      const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1', {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return null;
      const dados = await res.json();
      const valor = dados && dados.length ? parseFloat(dados[0].valor) : null;
      if (valor > 0) {
        cacheDolar = { valor, expiraEm: Date.now() + CACHE_TTL_DOLAR_MS };
        return valor;
      }
      return null;
    } catch (err) {
      return null;
    } finally {
      inflightDolar = null;
    }
  })();
  return inflightDolar;
}

function simboloYahoo(nome, tipo) {
  const t = String(nome).toUpperCase().trim();
  if (!t) return null;
  if (t.includes('-')) return t;
  if (tipo === 'Criptomoedas') return `${t}-USD`;
  if (/^[A-Z]{4}\d{2}$/.test(t)) return `${t}.SA`;
  return `${t}.SA`;
}

async function precoYahoo(nome, tipo) {
  const simbolo = simboloYahoo(nome, tipo);
  if (!simbolo) return null;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?interval=1d&range=1d`;
  let meta;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const corpo = await res.json();
    const resultado = corpo && corpo.chart && corpo.chart.result;
    if (!resultado || !resultado.length || !resultado[0] || !resultado[0].meta) return null;
    meta = resultado[0].meta;
  } catch (err) {
    return null;
  }

  const bruto = meta.regularMarketPrice;
  if (bruto == null || !Number.isFinite(bruto) || bruto <= 0) return null;

  const moeda = meta.currency || (tipo === 'Criptomoedas' ? 'USD' : 'BRL');
  if(moeda === 'BRL') {
    return {
      preco: Number(bruto.toFixed(10)),
      moeda: 'BRL',
      nome: meta.shortName || meta.symbol || simbolo,
      atualizadoEm: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 19)
        : null,
      fonte: 'yahoo'
    };
  }

  const dolar = await buscarDolar();
  if (!dolar) return null;
  return {
    preco: Number((bruto * dolar).toFixed(10)),
    moeda: 'BRL',
    nome: meta.shortName || meta.symbol || simbolo,
    atualizadoEm: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 19)
      : null,
    fonte: 'yahoo',
    convertedDe: { moeda, taxa: dolar }
  };
}

async function precoCoinGecko(nome) {
  const t = String(nome).toUpperCase().trim();
  const id = CRYPTO_MAP[t] || t.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price' +
      `?ids=${encodeURIComponent(id)}&vs_currencies=brl&precision=full`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const dados = await res.json();
    const preco = dados && dados[id] && dados[id].brl;
    if (preco == null || !Number.isFinite(Number(preco)) || Number(preco) <= 0) return null;
    return {
      preco: Number(Number(preco).toFixed(10)),
      moeda: 'BRL',
      nome: t,
      atualizadoEm: new Date().toISOString().slice(0, 19),
      fonte: 'coingecko'
    };
  } catch (err) {
    return null;
  }
}

async function buscarCotacao(nome, tipo) {
  const chave = `${tipo}|${String(nome).toUpperCase().trim()}`;
  return comCache(chave, async () => {
    const viaYahoo = await precoYahoo(nome, tipo);
    if (viaYahoo) return viaYahoo;
    if (tipo === 'Criptomoedas') return precoCoinGecko(nome);
    return null;
  });
}

// A Vercel popula req.query nas functions /api, mas nenhum outro endpoint deste
// projeto usa query string (todos são POST com req.body), então não há
// precedente testado aqui. Parsear req.url como fallback deixa o endpoint
// funcionando independente de como o runtime populate a requisição.
function queryDe(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  const q = String(req.url || '').split('?')[1];
  if (!q) return {};
  const saida = {};
  for (const par of q.split('&')) {
    if (!par) continue;
    const i = par.indexOf('=');
    const chave = i < 0 ? par : par.slice(0, i);
    let valor = i < 0 ? '' : par.slice(i + 1);
    try {
      valor = decodeURIComponent(valor.replace(/\+/g, ' '));
    } catch (err) {
      valor = '';
    }
    saida[chave] = valor;
  }
  return saida;
}

function parseAtivos(req) {
  const q = queryDe(req);
  const brutos = String(q.ativos || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_ATIVOS);
  const tipos = String(q.tipos || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return brutos.map((nome, i) => ({
    nome,
    tipo: tipos[i] || 'Ações'
  }));
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido' });
  }
  if (!checkRateLimit(req, { windowMs: 60000, max: 60 })) {
    return res.status(429).json({ erro: 'Muitas requisições. Tente novamente em instantes.' });
  }
  return autenticar(req, res, async () => {
    const ativos = parseAtivos(req);
    if (ativos.length === 0) {
      return res.status(400).json({ erro: 'Informe ao menos um ativo em ?ativos=' });
    }
    try {
      const pares = await Promise.all(ativos.map((a) => buscarCotacao(a.nome, a.tipo)));
      const cotações = {};
      ativos.forEach((a, i) => {
        cotações[a.nome] = pares[i];
      });
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json({ cotações });
    } catch (err) {
      console.error('Erro ao buscar cotações:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  });
}

module.exports = handler;
