const jwt = require('jsonwebtoken');
const { query } = require('./db');

async function autenticar(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não configurada');
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido' });
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !parts[1]) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido' });
  }
  const token = parts[1];
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decode || !decode.id) {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }

    // A claim "ver" carrega o token_version do usuário no momento em que o
    // token foi emitido. Comparar com o valor atual do banco revoga na hora
    // todos os tokens emitidos antes de uma troca de senha (ou de um
    // "sair de todos os dispositivos"). Sem isso, o token antigo continuava
    // válido por até 7 dias.
    const { rows } = await query(
      'SELECT token_version FROM usuarios WHERE id = $1',
      [decode.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
    const versionAtual = Number(rows[0].token_version) || 1;
    const versionDoToken = Number(decode.ver);
    if (!versionDoToken || versionDoToken !== versionAtual) {
      return res.status(401).json({ erro: 'Sessão expirada, faça login novamente' });
    }

    req.usuario = decode;
    req.tokenVersion = versionAtual;
    try {
      return await next();
    } catch (err) {
      console.error('Erro no handler autenticado:', err.code || 'INTERNAL');
      if (!res.headersSent) {
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
      return undefined;
    }
  } catch (err) {
    if (err.code === 'ENV_MISSING') {
      console.error('Erro na autenticação: env ausente', err.message);
      return res.status(500).json({ erro: 'Serviço temporariamente indisponível' });
    }
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido ou expirado';
    return res.status(401).json({ erro: msg });
  }
}

module.exports = { autenticar };
