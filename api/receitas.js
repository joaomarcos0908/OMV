const { query } = require('./lib/db');
const { autenticar } = require('./lib/autenticar');
const { textoValido, valorValido, dataISOValida, uuidValido } = require('./lib/validar');

async function handler(req, res) {
  autenticar(req, res, async () => {
    const usuarioId = req.usuario.id;

    if (req.method === 'GET') {
      try {
        const result = await query(
          'SELECT id, descricao, categoria, valor, data, criado_em FROM receitas WHERE usuario_id = $1 ORDER BY criado_em DESC',
          [usuarioId]
        );
        return res.status(200).json({ receitas: result.rows });
      } catch (err) {
        console.error('Erro ao buscar receitas:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'POST') {
      const { descricao, categoria, valor, data } = req.body || {};
      if (!descricao || !categoria || valor === undefined || valor === null || !data) {
        return res.status(400).json({ erro: 'Descrição, categoria, valor e data são obrigatórios' });
      }
      if (!textoValido(descricao, 1, 200)) return res.status(400).json({ erro: 'Descrição inválida (1-200)' });
      if (!textoValido(categoria, 1, 50)) return res.status(400).json({ erro: 'Categoria inválida' });
      if (!valorValido(valor)) return res.status(400).json({ erro: 'Valor inválido' });
      if (!dataISOValida(data)) return res.status(400).json({ erro: 'Data inválida (YYYY-MM-DD)' });
      try {
        const result = await query(
          'INSERT INTO receitas (usuario_id, descricao, categoria, valor, data) VALUES ($1, $2, $3, $4, $5) RETURNING id, descricao, categoria, valor, data, criado_em',
          [usuarioId, String(descricao).trim(), String(categoria).trim(), Number(valor), data]
        );
        return res.status(201).json({ receita: result.rows[0] });
      } catch (err) {
        console.error('Erro ao criar receita:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'PUT') {
      const { id, descricao, categoria, valor, data } = req.body || {};
      if (!id) {
        return res.status(400).json({ erro: 'ID é obrigatório' });
      }
      if (!uuidValido(id)) return res.status(400).json({ erro: 'ID inválido' });
      if (descricao !== undefined && !textoValido(descricao, 1, 200)) return res.status(400).json({ erro: 'Descrição inválida' });
      if (categoria !== undefined && !textoValido(categoria, 1, 50)) return res.status(400).json({ erro: 'Categoria inválida' });
      if (valor !== undefined && !valorValido(valor)) return res.status(400).json({ erro: 'Valor inválido' });
      if (data !== undefined && !dataISOValida(data)) return res.status(400).json({ erro: 'Data inválida' });
      try {
        const result = await query(
          'UPDATE receitas SET descricao = $1, categoria = $2, valor = $3, data = $4 WHERE id = $5 AND usuario_id = $6 RETURNING id, descricao, categoria, valor, data, criado_em',
          [descricao ? String(descricao).trim() : descricao, categoria ? String(categoria).trim() : categoria, Number(valor), data, id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Receita não encontrada' });
        }
        return res.status(200).json({ receita: result.rows[0] });
      } catch (err) {
        console.error('Erro ao atualizar receita:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = (req.body || {});
      if (!id) {
        return res.status(400).json({ erro: 'ID é obrigatório' });
      }
      if (!uuidValido(id)) return res.status(400).json({ erro: 'ID inválido' });
      try {
        const result = await query(
          'DELETE FROM receitas WHERE id = $1 AND usuario_id = $2 RETURNING id',
          [id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Receita não encontrada' });
        }
        return res.status(200).json({ mensagem: 'Receita removida' });
      } catch (err) {
        console.error('Erro ao remover receita:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  });
}

module.exports = handler;