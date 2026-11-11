const bcrypt = require('bcryptjs');
const { query } = require('../_lib/db');
const { autenticar } = require('../_lib/autenticar');
const { checkRateLimit } = require('../_lib/rateLimit');
const { textoValido } = require('../_lib/validar');

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ erro: 'Método não permitido' });
  }
  return autenticar(req, res, async () => {
    const usuarioId = req.usuario.id;
    try {
      if (req.method === 'GET' && req.query?.exportar === '1') {
        if (!checkRateLimit(req, { windowMs: 60000, max: 5 })) {
          return res.status(429).json({ erro: 'Aguarde um minuto antes de baixar novamente.' });
        }
        // Uma única consulta mantém uma visão consistente dos dados do titular.
        const result = await query(`SELECT json_build_object(
          'usuario', (SELECT row_to_json(u) FROM (SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1) u),
          'receitas', COALESCE((SELECT json_agg(r) FROM (SELECT id, descricao, categoria, valor, data, criado_em FROM receitas WHERE usuario_id = $1 ORDER BY criado_em) r), '[]'::json),
          'despesas', COALESCE((SELECT json_agg(g) FROM (SELECT id, descricao, categoria, valor, data, fixa, criado_em FROM gastos WHERE usuario_id = $1 ORDER BY criado_em) g), '[]'::json),
          'metas', COALESCE((SELECT json_agg(m) FROM (SELECT id, nome, valor_alvo, valor_atual, data_limite, criado_em FROM metas WHERE usuario_id = $1 ORDER BY criado_em) m), '[]'::json),
          'investimentos', COALESCE((SELECT json_agg(i) FROM (SELECT id, nome, tipo, cotacao_atual, cotacao_automatica, ultima_atualizacao, quantidade, preco_medio, data_aplicacao, valor_aplicado, tipo_rendimento, taxa, criado_em FROM investimentos WHERE usuario_id = $1 ORDER BY criado_em) i), '[]'::json)
        ) AS dados`, [usuarioId]);
        if (!result.rows[0]?.dados?.usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
        return res.status(200).json({ exportadoEm: new Date().toISOString(), ...result.rows[0].dados });
      }
      if (req.method === 'GET') {
        const result = await query('SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1', [usuarioId]);
        if (!result.rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
        return res.status(200).json({ usuario: result.rows[0] });
      }
      if (req.method === 'PUT') {
        const { nome } = req.body || {};
        if (!textoValido(nome, 1, 80)) return res.status(400).json({ erro: 'Nome deve ter entre 1 e 80 caracteres' });
        const result = await query('UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING id, nome, email, criado_em', [nome.trim(), usuarioId]);
        if (!result.rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
        return res.status(200).json({ usuario: result.rows[0] });
      }
      if (!checkRateLimit(req, { windowMs: 60000, max: 5 })) {
        return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto.' });
      }
      const { senha, confirmacao } = req.body || {};
      if (confirmacao !== 'EXCLUIR' || typeof senha !== 'string' || !senha || senha.length > 128) {
        return res.status(400).json({ erro: 'Digite EXCLUIR e informe sua senha atual.' });
      }
      const result = await query('SELECT senha_hash FROM usuarios WHERE id = $1', [usuarioId]);
      if (!result.rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
      const hash = result.rows[0].senha_hash;
      if (!await bcrypt.compare(senha, hash)) return res.status(403).json({ erro: 'Senha atual incorreta.' });
      // O CASCADE do schema remove os registros financeiros na mesma operação.
      // Comparar o hash também evita excluir após uma troca concorrente de senha.
      const removido = await query('DELETE FROM usuarios WHERE id = $1 AND senha_hash = $2 RETURNING id', [usuarioId, hash]);
      if (!removido.rows.length) return res.status(409).json({ erro: 'A conta mudou. Entre novamente e repita a solicitação.' });
      return res.status(200).json({ mensagem: 'Conta e registros financeiros excluídos da base ativa.' });
    } catch (err) {
      console.error('Falha na operação de privacidade:', err.code || 'INTERNAL');
      return res.status(500).json({ erro: 'Não foi possível concluir a operação. Tente novamente.' });
    }
  });
}
module.exports = handler;
