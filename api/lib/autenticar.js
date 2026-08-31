const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
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
    req.usuario = decode;
    return next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido ou expirado';
    return res.status(401).json({ erro: msg });
  }
}

module.exports = { autenticar };