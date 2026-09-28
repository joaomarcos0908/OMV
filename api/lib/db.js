const { Pool } = require('pg');

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error('DATABASE_URL não configurada'), { code: 'ENV_MISSING' });
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
  });
}

let _pool = null;
function getOrCreatePool() {
  if (!_pool) _pool = getPool();
  return _pool;
}

const SQL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL,
    email       VARCHAR(190) NOT NULL UNIQUE,
    senha_hash  TEXT NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS gastos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    descricao   TEXT NOT NULL,
    categoria   TEXT NOT NULL,
    valor       NUMERIC(10,2) NOT NULL,
    data        DATE NOT NULL,
    fixa        BOOLEAN DEFAULT false,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS receitas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    descricao   TEXT NOT NULL,
    categoria   TEXT NOT NULL,
    valor       NUMERIC(10,2) NOT NULL,
    data        DATE NOT NULL,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS metas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome        TEXT NOT NULL,
    valor_alvo  NUMERIC(10,2) NOT NULL,
    valor_atual NUMERIC(10,2) DEFAULT 0,
    data_limite DATE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS investimentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome            TEXT NOT NULL,
    tipo            TEXT NOT NULL,
    cotacao_atual   NUMERIC(24,10),
    cotacao_automatica BOOLEAN DEFAULT false,
    ultima_atualizacao DATE,
    quantidade      NUMERIC(24,10),
    preco_medio     NUMERIC(24,10),
    data_aplicacao  DATE,
    valor_aplicado  NUMERIC(14,2),
    tipo_rendimento TEXT,
    taxa            NUMERIC(10,4),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

// colunas que já nasceram com escala insuficiente para cripto (0,0005 BTC) e
// preços de centavos de real. CREATE TABLE IF NOT EXISTS não altera tabela
// existente, então o widen precisa ser explícito e idempotente.
const COLUNAS_NUMERICAS = {
  quantidade: [24, 10],
  preco_medio: [24, 10],
  cotacao_atual: [24, 10],
  valor_aplicado: [14, 2]
};

async function aplicarMigracoesInvestimentos(p) {
  const { rows } = await p.query(
    `SELECT column_name, numeric_precision AS p, numeric_scale AS s
       FROM information_schema.columns
      WHERE table_name = 'investimentos'`
  );
  const atual = new Map(rows.map((r) => [r.column_name, [r.p, r.s]]));
  for (const [coluna, [precisao, escala]] of Object.entries(COLUNAS_NUMERICAS)) {
    const definida = atual.get(coluna);
    // coluna ausente (banco ainda sem a tabela) ou já no formato novo
    if (!definida || (definida[0] === precisao && definida[1] === escala)) continue;
    await p.query(
      `ALTER TABLE investimentos
         ALTER COLUMN ${coluna} TYPE NUMERIC(${precisao},${escala}) USING ${coluna}::NUMERIC(${precisao},${escala})`
    );
  }
}

let prontoSchema = null;
async function garantirSchema() {
  if (!prontoSchema) {
    const p = getOrCreatePool();
    prontoSchema = p
      .query(SQL_SCHEMA)
      .then(() => aplicarMigracoesInvestimentos(p))
      .then(() => true)
      .catch((err) => {
        prontoSchema = null;
        throw err;
      });
  }
  return prontoSchema;
}

async function query(text, params) {
  await garantirSchema();
  return getOrCreatePool().query(text, params);
}

module.exports = { get pool() { return getOrCreatePool(); }, query };