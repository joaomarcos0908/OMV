const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../_lib/db');
const { checkRateLimit } = require('../_lib/rateLimit');
const { emailValido, normalizarEmail } = require('../_lib/validar');

// Hash descartável de uma senha que ninguém conhece. Serve para gastar o
// mesmo tempo de bcrypt quando o e-mail não existe na base, para que o
// tempo de resposta não revele quais e-mails têm conta.
const HASH_FALSO = '$2a$12$HAPjJEkyeA7cTCpIOZgdtO4ZuomFaHDnfrYibtPvzvkUU/FqLc1XC';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

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
      'SELECT id, nome, email, senha_hash, token_version, login_falhas, bloqueado_ate FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      await bcrypt.compare(senha, HASH_FALSO);
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const usuario = result.rows[0];

    // Conta bloqueada por excesso de tentativas.
    if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate).getTime() > Date.now()) {
      const minutos = Math.max(
        1,
        Math.ceil((new Date(usuario.bloqueado_ate).getTime() - Date.now()) / 60000)
      );
      return res.status(429).json({
        erro: `Conta bloqueada temporariamente. Tente novamente em ${minutos} min.`
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      const falhas = Number(usuario.login_falhas) + 1;
      if (falhas >= MAX_TENTATIVAS) {
        await query(
          `UPDATE usuarios
              SET login_falhas = 0,
                  bloqueado_ate = now() + make_interval(mins => $2)
            WHERE id = $1`,
          [usuario.id, BLOQUEIO_MINUTOS]
        );
        return res.status(429).json({
          erro: `Conta bloqueada temporariamente por ${BLOQUEIO_MINUTOS} min após ${MAX_TENTATIVAS} tentativas.`
        });
      }
      await query('UPDATE usuarios SET login_falhas = $2 WHERE id = $1', [usuario.id, falhas]);
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    // Login válido: zera o contador de falhas e libera o bloqueio.
    await query(
      'UPDATE usuarios SET login_falhas = 0, bloqueado_ate = NULL WHERE id = $1',
      [usuario.id]
    );

    const tokenVersion = Number(usuario.token_version) || 1;

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome, ver: tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    const { senha_hash, login_falhas, bloqueado_ate, token_version, ...usuarioSemSenha } = usuario;

    return res.status(200).json({ token, usuario: usuarioSemSenha });
  } catch (err) {
    if (err.code === 'ENV_MISSING') {
      console.error('Erro no login: env ausente', err.message);
      return res.status(500).json({ erro: 'Serviço temporariamente indisponível' });
    }
    console.error('Erro no login:', err.code || 'INTERNAL');
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = handler;
