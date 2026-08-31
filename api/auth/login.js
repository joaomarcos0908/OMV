const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../lib/db');
const { checkRateLimit } = require('../lib/rateLimit');
const { emailValido, normalizarEmail } = require('../lib/validar');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }
  if (!checkRateLimit(req, { windowMs: 60000, max: 20 })) {
    return res.status(429).json({ erro: 'Muitas tentativas, tente novamente em instantes' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não configurada');
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }

  let { email, senha } = req.body || {};
  email = normalizarEmail(email);
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ erro: 'Email inválido' });
  }
  if (typeof senha !== 'string' || senha.length > 128) {
    return res.status(400).json({ erro: 'Senha inválida' });
  }

  try {
    const result = await query(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    const { senha_hash, ...usuarioSemSenha } = usuario;

    return res.status(200).json({ token, usuario: usuarioSemSenha });
  } catch (err) {
    if (err.code === 'ENV_MISSING') {
      console.error('Erro no login: env ausente', err.message);
      return res.status(500).json({ erro: 'Serviço temporariamente indisponível' });
    }
    console.error('Erro no login:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = handler;