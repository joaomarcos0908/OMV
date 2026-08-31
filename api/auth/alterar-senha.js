const bcrypt = require('bcryptjs');
const { query } = require('../lib/db');
const { autenticar } = require('../lib/autenticar');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
  }

  autenticar(req, res, async () => {
    try {
      const result = await query(
        'SELECT senha_hash FROM usuarios WHERE id = $1',
        [req.usuario.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      const senhaValida = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);

      if (!senhaValida) {
        return res.status(401).json({ erro: 'Senha atual incorreta' });
      }

      const novaSenhaHash = await bcrypt.hash(nova_senha, 12);

      await query(
        'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
        [novaSenhaHash, req.usuario.id]
      );

      return res.status(200).json({ mensagem: 'Senha alterada com sucesso' });
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  });
}

module.exports = handler;