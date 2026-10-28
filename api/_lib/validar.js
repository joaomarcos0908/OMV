function emailValido(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function textoValido(v, min, max) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return s.length >= min && s.length <= max;
}
function valorValido(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 999999999.99;
}
function valorOpcionalValido(v) {
  if (v === null || v === undefined || v === '') return true;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 999999999.99;
}
function dataISOValida(v) {
  if (!v) return false;
  // aceita YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
function dataISOopcional(v) {
  if (v === null || v === undefined || v === '') return true;
  return dataISOValida(v);
}
function uuidValido(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
function normalizarEmail(v) {
  return String(v || '').trim().toLowerCase();
}

// As categorias e os tipos vêm de <select> no front, mas a API é pública: sem
// uma lista fechada aqui, qualquer string (inclusive HTML) era aceita e
// depois renderizada na tela. Manter a lista idêntica aos <option> dos HTMLs.
const CATEGORIAS_GASTO = ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros'];
const CATEGORIAS_RECEITA = ['Salário', 'Estágio', 'Freelance', 'Outros'];
const TIPOS_INVESTIMENTO = ['Ações', 'FIIs', 'Renda Fixa', 'Tesouro Direto', 'Criptomoedas', 'Fundos', 'Outros'];

function estaNaLista(v, lista) {
  return typeof v === 'string' && lista.includes(v.trim());
}
function categoriaGastoValida(v) {
  return estaNaLista(v, CATEGORIAS_GASTO);
}
function categoriaReceitaValida(v) {
  return estaNaLista(v, CATEGORIAS_RECEITA);
}
function tipoInvestimentoValido(v) {
  return estaNaLista(v, TIPOS_INVESTIMENTO);
}

module.exports = {
  emailValido,
  textoValido,
  valorValido,
  valorOpcionalValido,
  dataISOValida,
  dataISOopcional,
  uuidValido,
  normalizarEmail,
  categoriaGastoValida,
  categoriaReceitaValida,
  tipoInvestimentoValido,
};
