const bcrypt = require('bcryptjs');
const { query } = require('../lib/db');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
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
    console.error('Erro no registro:', err);
    return res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

module.exports = handler;