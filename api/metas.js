const { query } = require('../lib/db');
const { autenticar } = require('../lib/autenticar');

async function handler(req, res) {
  autenticar(req, res, async () => {
    const usuarioId = req.usuario.id;

    if (req.method === 'GET') {
      try {
        const result = await query(
          'SELECT id, nome, valor_alvo, valor_atual, data_limite, criado_em FROM metas WHERE usuario_id = $1 ORDER BY data_limite',
          [usuarioId]
        );
        return res.status(200).json({ metas: result.rows });
      } catch (err) {
        console.error('Erro ao buscar metas:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'POST') {
      const { nome, valorAlvo, valorAtual, dataLimite } = req.body;
      if (!nome || !valorAlvo) {
        return res.status(400).json({ erro: 'Nome e valor alvo são obrigatórios' });
      }
      try {
        const result = await query(
          'INSERT INTO metas (usuario_id, nome, valor_alvo, valor_atual, data_limite) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, valor_alvo, valor_atual, data_limite, criado_em',
          [usuarioId, nome, parseFloat(valorAlvo), parseFloat(valorAtual) || 0, dataLimite || null]
        );
        return res.status(201).json({ meta: result.rows[0] });
      } catch (err) {
        console.error('Erro ao criar meta:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ erro: 'ID é obrigatório' });
      }
      try {
        const result = await query(
          'DELETE FROM metas WHERE id = $1 AND usuario_id = $2 RETURNING id',
          [id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Meta não encontrada' });
        }
        return res.status(200).json({ mensagem: 'Meta removida' });
      } catch (err) {
        console.error('Erro ao remover meta:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  });
}

module.exports = handler;