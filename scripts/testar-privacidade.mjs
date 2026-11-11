import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const validar = require('../api/_lib/validar.js');

function preparar(arquivo = 'me', opcoes = {}) {
  const chamadas = [];
  const modulo = { exports: {} };
  const query = async (sql, params) => {
    chamadas.push({ sql, params: Array.from(params || []) });
    if (opcoes.falha) throw Object.assign(new Error('detalhe privado'), { code: 'TEST' });
    return { rows: opcoes.rows ?? (sql.includes('SELECT senha_hash') ? [{ senha_hash: 'hash-interno' }] : [{ id: 'titular' }]) };
  };
  vm.runInNewContext(readFileSync(new URL(arquivo === 'me' ? '../api/auth/me.js' : '../api/metas.js', import.meta.url), 'utf8'), {
    module: modulo, console: { error() {} }, Date,
    require(nome) {
      if (nome.endsWith('/db')) return { query };
      if (nome.endsWith('/autenticar')) return { autenticar: async (req, res, next) => {
        if (opcoes.semAuth) return res.status(401).json({ erro: 'Sem sessão' });
        req.usuario = { id: 'titular' }; return next();
      } };
      if (nome.endsWith('/rateLimit')) return { checkRateLimit: () => !opcoes.limite };
      if (nome.endsWith('/validar')) return validar;
      if (nome === 'bcryptjs') return { compare: async senha => senha === 'senha-correta' };
      throw new Error('Dependência não prevista: ' + nome);
    }
  });
  return { chamadas, async executar(method, body, query = {}) {
    const resposta = { headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k] = v; }, status(codigo) { this.statusCode = codigo; return this; }, json(dados) { this.body = dados; return this; } };
    await modulo.exports({ method, body, query, headers: {}, url: '/api/auth/me' }, resposta);
    return resposta;
  } };
}
test('sem autenticação não consulta dados', async () => {
  const c = preparar('me', { semAuth: true }); assert.equal((await c.executar('GET')).statusCode, 401); assert.equal(c.chamadas.length, 0);
});
test('perfil usa identidade da sessão e desativa cache', async () => {
  const c = preparar(); const res = await c.executar('GET', { id: 'outro' });
  assert.deepEqual(c.chamadas[0].params, ['titular']); assert.match(res.headers['Cache-Control'], /no-store/);
});
test('exportação inclui apenas dados próprios e nenhuma credencial', async () => {
  const c = preparar('me', { rows: [{ dados: { usuario: { nome: 'Teste' }, receitas: [], despesas: [], metas: [], investimentos: [] } }] });
  const res = await c.executar('GET', null, { exportar: '1' }); assert.equal(res.statusCode, 200);
  assert.equal((c.chamadas[0].sql.match(/usuario_id = \$1/g) || []).length, 4);
  assert.match(c.chamadas[0].sql, /FROM usuarios WHERE id = \$1/);
  assert.doesNotMatch(c.chamadas[0].sql, /senha_hash|token_version|SELECT \*/);
  assert.deepEqual(c.chamadas[0].params, ['titular']);
});
test('exportação respeita limite de requisições', async () => {
  const c = preparar('me', { limite: true }); assert.equal((await c.executar('GET', null, { exportar: '1' })).statusCode, 429); assert.equal(c.chamadas.length, 0);
});
test('correção de nome ignora identidade enviada pelo cliente', async () => {
  const c = preparar(); assert.equal((await c.executar('PUT', { nome: ' Novo nome ', id: 'outro' })).statusCode, 200); assert.deepEqual(c.chamadas[0].params, ['Novo nome', 'titular']);
});
test('nome vazio é rejeitado', async () => {
  const c = preparar(); assert.equal((await c.executar('PUT', { nome: ' ' })).statusCode, 400); assert.equal(c.chamadas.length, 0);
});
test('exclusão exige confirmação e senha', async () => {
  const c = preparar(); assert.equal((await c.executar('DELETE', { confirmacao: 'EXCLUIR' })).statusCode, 400); assert.equal(c.chamadas.length, 0);
});
test('senha incorreta não exclui conta nem invalida sessão', async () => {
  const c = preparar(); assert.equal((await c.executar('DELETE', { senha: 'errada', confirmacao: 'EXCLUIR' })).statusCode, 403); assert.equal(c.chamadas.length, 1); assert.doesNotMatch(c.chamadas[0].sql, /DELETE/);
});
test('exclusão verifica senha e restringe remoção ao titular', async () => {
  const c = preparar(); assert.equal((await c.executar('DELETE', { senha: 'senha-correta', confirmacao: 'EXCLUIR', id: 'outro' })).statusCode, 200);
  assert.match(c.chamadas[1].sql, /WHERE id = \$1 AND senha_hash = \$2/); assert.deepEqual(c.chamadas[1].params, ['titular', 'hash-interno']);
});
test('exclusão respeita limite de tentativas', async () => {
  const c = preparar('me', { limite: true }); assert.equal((await c.executar('DELETE', { senha: 'senha-correta', confirmacao: 'EXCLUIR' })).statusCode, 429); assert.equal(c.chamadas.length, 0);
});
test('erros internos não expõem detalhes', async () => {
  const c = preparar('me', { falha: true }); const res = await c.executar('GET'); assert.equal(res.statusCode, 500); assert.doesNotMatch(JSON.stringify(res.body), /detalhe privado|TEST/);
});
test('métodos não suportados retornam 405', async () => { assert.equal((await preparar().executar('POST')).statusCode, 405); });
test('schema exclui os quatro tipos de registros por cascata', () => {
  const schema = readFileSync(new URL('../api/_lib/db.js', import.meta.url), 'utf8');
  assert.equal((schema.match(/REFERENCES usuarios\(id\) ON DELETE CASCADE/g) || []).length, 4);
});
test('atualização de meta permite zero e restringe por usuário', async () => {
  const c = preparar('metas'); const res = await c.executar('PUT', { id: '00000000-0000-4000-8000-000000000001', valorAtual: 0 });
  assert.equal(res.statusCode, 200); assert.match(c.chamadas[0].sql, /WHERE id = \$2 AND usuario_id = \$3/); assert.equal(c.chamadas[0].params[2], 'titular');
});
test('atualização de meta rejeita valores inválidos e booleanos', async () => {
  for (const valorAtual of [-1, true, null, '', 100000000]) { const c = preparar('metas'); assert.equal((await c.executar('PUT', { id: '00000000-0000-4000-8000-000000000001', valorAtual })).statusCode, 400); assert.equal(c.chamadas.length, 0); }
});
