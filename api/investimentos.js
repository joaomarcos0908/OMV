const { query } = require('../lib/db');
const { autenticar } = require('../lib/autenticar');
const { textoValido, valorOpcionalValido, dataISOopcional, uuidValido } = require('../lib/validar');

async function handler(req, res) {
  autenticar(req, res, async () => {
    const usuarioId = req.usuario.id;

    if (req.method === 'GET') {
      try {
        const result = await query(
          `SELECT id, nome, tipo, cotacao_atual AS cotacaoAtual, cotacao_automatica AS cotacaoAutomatica, ultima_atualizacao AS ultimaAtualizacao, quantidade, preco_medio AS precoMedio, data_aplicacao AS dataAplicacao, valor_aplicado AS valorAplicado, tipo_rendimento AS tipoRendimento, taxa, criado_em FROM investimentos WHERE usuario_id = $1 ORDER BY criado_em DESC`,
          [usuarioId]
        );
        return res.status(200).json({ investimentos: result.rows });
      } catch (err) {
        console.error('Erro ao buscar investimentos:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'POST') {
      const { nome, tipo, cotacaoAtual, cotacaoAutomatica, ultimaAtualizacao, quantidade, precoMedio, dataAplicacao, valorAplicado, tipoRendimento, taxa } = req.body || {};
      if (!nome || !tipo) {
        return res.status(400).json({ erro: 'Nome e tipo são obrigatórios' });
      }
      if (!textoValido(nome, 1, 100)) return res.status(400).json({ erro: 'Nome inválido (1-100)' });
      if (!textoValido(tipo, 1, 50)) return res.status(400).json({ erro: 'Tipo inválido' });
      if (quantidade !== undefined && quantidade !== null && quantidade !== '' && !valorOpcionalValido(quantidade)) return res.status(400).json({ erro: 'Quantidade inválida' });
      if (precoMedio !== undefined && precoMedio !== null && precoMedio !== '' && !valorOpcionalValido(precoMedio)) return res.status(400).json({ erro: 'Preço médio inválido' });
      if (valorAplicado !== undefined && valorAplicado !== null && valorAplicado !== '' && !valorOpcionalValido(valorAplicado)) return res.status(400).json({ erro: 'Valor aplicado inválido' });
      if (cotacaoAtual !== undefined && cotacaoAtual !== null && cotacaoAtual !== '' && !valorOpcionalValido(cotacaoAtual)) return res.status(400).json({ erro: 'Cotação inválida' });
      if (!dataISOopcional(dataAplicacao) || !dataISOopcional(ultimaAtualizacao)) return res.status(400).json({ erro: 'Data inválida' });
      try {
        const result = await query(
          `INSERT INTO investimentos (usuario_id, nome, tipo, cotacao_atual, cotacao_automatica, ultima_atualizacao, quantidade, preco_medio, data_aplicacao, valor_aplicado, tipo_rendimento, taxa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, nome, tipo, cotacao_atual AS cotacaoAtual, cotacao_automatica AS cotacaoAutomatica, ultima_atualizacao AS ultimaAtualizacao, quantidade, preco_medio AS precoMedio, data_aplicacao AS dataAplicacao, valor_aplicado AS valorAplicado, tipo_rendimento AS tipoRendimento, taxa, criado_em`,
          [usuarioId, nome, tipo, cotacaoAtual ?? null, cotacaoAutomatica ?? false, ultimaAtualizacao ?? null, quantidade ?? null, precoMedio ?? null, dataAplicacao ?? null, valorAplicado ?? null, tipoRendimento ?? null, taxa ?? null]
        );
        return res.status(201).json({ investimento: result.rows[0] });
      } catch (err) {
        console.error('Erro ao criar investimento:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    if (req.method === 'PUT') {
      const { id, nome, tipo, cotacaoAtual, cotacaoAutomatica, ultimaAtualizacao, quantidade, precoMedio, dataAplicacao, valorAplicado, tipoRendimento, taxa } = req.body || {};
      if (!id) {
        return res.status(400).json({ erro: 'ID é obrigatório' });
      }
      if (!uuidValido(id)) return res.status(400).json({ erro: 'ID inválido' });
      if (nome !== undefined && !textoValido(nome, 1, 100)) return res.status(400).json({ erro: 'Nome inválido' });
      if (tipo !== undefined && !textoValido(tipo, 1, 50)) return res.status(400).json({ erro: 'Tipo inválido' });
      try {
        const result = await query(
          `UPDATE investimentos SET nome = $1, tipo = $2, cotacao_atual = $3, cotacao_automatica = $4, ultima_atualizacao = $5, quantidade = $6, preco_medio = $7, data_aplicacao = $8, valor_aplicado = $9, tipo_rendimento = $10, taxa = $11 WHERE id = $12 AND usuario_id = $13 RETURNING id, nome, tipo, cotacao_atual AS cotacaoAtual, cotacao_automatica AS cotacaoAutomatica, ultima_atualizacao AS ultimaAtualizacao, quantidade, preco_medio AS precoMedio, data_aplicacao AS dataAplicacao, valor_aplicado AS valorAplicado, tipo_rendimento AS tipoRendimento, taxa, criado_em`,
          [nome, tipo, cotacaoAtual ?? null, cotacaoAutomatica ?? false, ultimaAtualizacao ?? null, quantidade ?? null, precoMedio ?? null, dataAplicacao ?? null, valorAplicado ?? null, tipoRendimento ?? null, taxa ?? null, id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Investimento não encontrado' });
        }
        return res.status(200).json({ investimento: result.rows[0] });
      } catch (err) {
        console.error('Erro ao atualizar investimento:', err);
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
          'DELETE FROM investimentos WHERE id = $1 AND usuario_id = $2 RETURNING id',
          [id, usuarioId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ erro: 'Investimento não encontrado' });
        }
        return res.status(200).json({ mensagem: 'Investimento removido' });
      } catch (err) {
        console.error('Erro ao remover investimento:', err);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
      }
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  });
}

module.exports = handler;