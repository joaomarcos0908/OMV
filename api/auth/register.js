const bcrypt = require('bcryptjs');
const { query } = require('../lib/db');
const { checkRateLimit } = require('../lib/rateLimit');
const { emailValido, textoValido, normalizarEmail } = require('../lib/validar');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }
  if (!checkRateLimit(req, { windowMs: 60000, max: 10 })) {
    return res.status(429).json({ erro: 'Muitas tentativas, tente novamente em instantes' });
  }

  let { nome, email, senha } = req.body || {};
  email = normalizarEmail(email);
  if (typeof nome === 'string') nome = nome.trim();

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }
  if (!textoValido(nome, 1, 80)) {
    return res.status(400).json({ erro: 'Nome deve ter entre 1 e 80 caracteres' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ erro: 'Email inválido' });
  }
  if (typeof senha !== 'string' || senha.length < 6 || senha.length > 128) {
    return res.status(400).json({ erro: 'A senha deve ter entre 6 e 128 caracteres' });
  }

  try {
    const existing = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ erro: 'Email já está em uso' });
    }

    const senha_hash = await bcrypt.hash(senha, 12);

    await query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3)',
      [nome, email, senha_hash]
    );

    return res.status(201).json({ mensagem: 'Usuário criado com sucesso' });
  } catch (err) {
    if (err.code === 'ENV_MISSING') {
      console.error('Erro no registro: env ausente', err.message);
      return res.status(500).json({ erro: 'Serviço temporariamente indisponível' });
    }
    console.error('Erro no registro:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = handler;