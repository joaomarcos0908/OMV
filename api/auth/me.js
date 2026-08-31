const { query } = require('../lib/db');
const { autenticar } = require('../lib/autenticar');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  autenticar(req, res, async () => {
    try {
      const result = await query(
        'SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1',
        [req.usuario.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }

      return res.status(200).json({ usuario: result.rows[0] });
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  });
}

module.exports = handler;