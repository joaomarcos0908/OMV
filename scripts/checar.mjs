/**
 * Verificação local do projeto (sem dependências).
 *
 *   node scripts/checar.mjs
 *
 * Roda quatro checagens:
 *   1. sintaxe de todos os arquivos .js/.mjs
 *   2. JSON válido (package.json, vercel.json, manifest)
 *   3. assets referenciados no HTML existem no disco
 *   4. as allowlists do servidor batem com os <option> dos formulários
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let falhas = 0;
const falhar = (msg) => {
  falhas++;
  console.error('  x ' + msg);
};
const ok = (msg) => console.log('  . ' + msg);

function listar(dir, exts) {
  const out = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) continue;
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) out.push(...listar(caminho, exts));
    else if (exts.includes(extname(entrada.name))) out.push(caminho);
  }
  return out;
}

// ---------------------------------------------------------------- 1. sintaxe
console.log('\n[1] Sintaxe dos scripts');
const scripts = [
  ...listar(join(raiz, 'api'), ['.js']),
  ...listar(join(raiz, 'JS'), ['.js']),
  ...listar(join(raiz, 'scripts'), ['.js', '.mjs']),
];
for (const arquivo of scripts) {
  try {
    execFileSync(process.execPath, ['--check', arquivo], { stdio: 'pipe' });
  } catch (err) {
    falhar(`${arquivo.replace(raiz + '\\', '')}: ${String(err.stderr || err.message).trim()}`);
  }
}
if (!falhas) ok(`${scripts.length} arquivos sem erro de sintaxe`);

// ------------------------------------------------------------------ 2. JSON
console.log('\n[2] Arquivos JSON');
for (const arquivo of ['package.json', 'vercel.json', 'assets/site.webmanifest']) {
  try {
    JSON.parse(readFileSync(join(raiz, arquivo), 'utf8'));
    ok(arquivo);
  } catch (err) {
    falhar(`${arquivo}: ${err.message}`);
  }
}

// ---------------------------------------------------------------- 3. assets
console.log('\n[3] Assets referenciados no HTML');
// rotas servidas por rewrite (vercel.json) — não são arquivos no disco
const rotasVirtuais = new Set(['/', '/app', '/app/investimentos', '/app/metas', '/login']);
const htmls = listar(join(raiz, 'Html'), ['.html']).concat([join(raiz, 'index.html')]);
let checados = 0;
for (const html of htmls) {
  const conteudo = readFileSync(html, 'utf8');
  const refs = conteudo.match(/(?:src|href)="(\/[^"#?]*)"/g) || [];
  for (const ref of refs) {
    const caminho = ref.replace(/^(?:src|href)="/, '').replace(/["']$/, '');
    if (!caminho || caminho === '/') continue;
    if (rotasVirtuais.has(caminho)) continue;
    if (caminho.startsWith('/api/')) continue;
    checados++;
    if (!existsSync(join(raiz, caminho))) {
      falhar(`${html.replace(raiz + '\\', '')} -> ${caminho} não existe`);
    }
  }
}
if (!falhas) ok(`${checados} referências resolvem para arquivos existentes`);

// ------------------------------------------------------------- 4. allowlist
console.log('\n[4] Allowlists do servidor vs. <option> dos formulários');const { CATEGORIAS } = (() => {
  const validar = require(join(raiz, 'api', '_lib', 'validar.js'));
  return { CATEGORIAS: validar };
})();

const opcoesDe = (arquivo, idSelect) => {
  const html = readFileSync(join(raiz, arquivo), 'utf8');
  const bloco = html.split(`id="${idSelect}"`)[1];
  if (!bloco) return null;
  const sel = bloco.split('</select>')[0];
  return [...sel.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((m) => m[1].trim());
};

const pares = [
  ['Html/principal.html', 'gasto-categoria', 'categoriaGastoValida'],
  ['Html/principal.html', 'receita-categoria', 'categoriaReceitaValida'],
  ['Html/investimentos.html', 'investimento-tipo', 'tipoInvestimentoValido'],
];

for (const [arquivo, idSelect, fn] of pares) {
  const opcoes = opcoesDe(arquivo, idSelect);
  if (!opcoes) {
    falhar(`${arquivo}: select #${idSelect} não encontrado`);
    continue;
  }
  const invalidas = opcoes.filter((op) => !CATEGORIAS[fn](op));
  if (invalidas.length) {
    falhar(`${fn} rejeita opções do formulário: ${invalidas.join(', ')}`);
  } else {
    ok(`${fn} aceita as ${opcoes.length} opções de #${idSelect}`);
  }
}

// --------------------------------------------------------------- 5. rewrites
console.log('\n[5] Rewrites do vercel.json');
const vercel = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8'));
for (const r of vercel.rewrites || []) {
  const destino = r.destination.replace(/^\//, '');
  if (!existsSync(join(raiz, destino))) {
    falhar(`rewrite ${r.source} -> ${r.destination}: arquivo não existe`);
  } else {
    ok(`${r.source} -> ${r.destination}`);
  }
}
for (const r of vercel.redirects || []) {
  const destino = r.destination.replace(/^\//, '');
  if (destino && !existsSync(join(raiz, destino)) && !rotasVirtuais.has(destino)) {
    falhar(`redirect ${r.source} -> ${r.destination}: destino não existe`);
  }
}

// ------------------------------------------------------------------ resumo
console.log('');
if (falhas) {
  console.error(`FALHOU: ${falhas} problema(s) encontrado(s).`);
  process.exit(1);
}
console.log('Tudo certo.');
