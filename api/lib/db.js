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
    cotacao_atual   NUMERIC(10,2),
    cotacao_automatica BOOLEAN DEFAULT false,
    ultima_atualizacao DATE,
    quantidade      NUMERIC(10,2),
    preco_medio     NUMERIC(10,2),
    data_aplicacao  DATE,
    valor_aplicado  NUMERIC(10,2),
    tipo_rendimento TEXT,
    taxa            NUMERIC(10,4),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

let prontoSchema = null;
async function garantirSchema() {
  if (!prontoSchema) {
    const p = getOrCreatePool();
    prontoSchema = p
      .query(SQL_SCHEMA)
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