const { query } = require('../lib/db');
const { autenticar } = require('../lib/autenticar');

async function handler(req, res) {
  autenticar(req, res, async () => {
    const usuarioId = req.usuario.id;

    if (req.method === 'GET') {
      try {
        const result = await query(
          'SELECT id, descricao, categoria, valor, data, fixa, criado_em FROM gastos WHERE usuario_id = $1 ORDER BY criado_em DESC',
          [usuarioId]
        );
        return res.status(200).json({ gastos: result.rows });
      } catch (err) {
        console.error('Erro ao buscar gastos:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'POST') {
      const { descricao, categoria, valor, data, fixa } = req.body;
      if (!descricao || !categoria || !valor || !data) {
        return res.status(400).json({ erro: 'Descrição, categoria, valor e data são obrigatórios' });
      }
      try {
        const result = await query(
          'INSERT INTO gastos (usuario_id, descricao, categoria, valor, data, fixa) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, descricao, categoria, valor, data, fixa, criado_em',
          [usuarioId, descricao, categoria, parseFloat(valor), data, fixa || false]
        );
        return res.status(201).json({ gasto: result.rows[0] });
      } catch (err) {
        console.error('Erro ao criar gasto:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'PUT') {
      const { id, descricao, categoria, valor, data, fixa } = req.body;
      if (!id) {
        return res.status(400).json({ erro: 'ID é obrigatório' });
      }
      try {
        const result = await query(
          'UPDATE gastos SET descricao = $1, categoria = $2, valor = $3, data = $4, fixa = $5 WHERE id = $6 AND usuario_id = $7 RETURNING id, descricao, categoria, valor, data, fixa, criado_em',
          [descricao, categoria, parseFloat(valor), data, fixa, id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Gasto não encontrado' });
        }
        return res.status(200).json({ gasto: result.rows[0] });
      } catch (err) {
        console.error('Erro ao atualizar gasto:', err);
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
          'DELETE FROM gastos WHERE id = $1 AND usuario_id = $2 RETURNING id',
          [id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Gasto não encontrado' });
        }
        return res.status(200).json({ mensagem: 'Gasto removido' });
      } catch (err) {
        console.error('Erro ao remover gasto:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  });
}

module.exports = handler;