// Gera os ícones e a imagem de compartilhamento a partir dos SVGs em assets/.
//
// Por que um script e não arquivos prontos: o Google Search não aceita SVG de
// favicon (só BMP, GIF, ICO, PNG, JPEG, PPM, TIFF), então a marca precisa sair
// em PNG/ICO. Mantendo a conversão no repositório, qualquer mudança no SVG
// regenera tudo com um comando e não diverge entre deploys.
//
// Uso: npm run gerar-icones
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(RAIZ, 'assets');
const MARCA = join(ASSETS, 'marca.svg');

const FUNDO = '#0E1013';
const CIANO = '#4C8DFF';

function renderizar(svg, largura) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: largura },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
    background: 'transparent',
  });
  return resvg.render().asPng();
}

function arquivo(nome, buffer) {
  const caminho = join(ASSETS, nome);
  writeFileSync(caminho, buffer);
  console.log(`  ${nome}  (${(buffer.length / 1024).toFixed(1)} kB)`);
}

// --- Ícone quadrado (favicon, apple-touch, PWA) ---
const svgMarca = readFileSync(MARCA, 'utf8');
const tamanhos = [16, 32, 48, 180, 192, 512];
const pngs = new Map();
for (const t of tamanhos) {
  pngs.set(t, renderizar(svgMarca, t));
}

// --- favicon.ico ---
// Container ICO clássico: 6 bytes de diretório + 16 bytes por entrada +
// as imagens. O payload pode ser PNG (Vista em diante lê PNG dentro de ICO),
// o que evita ter que implementar um encoder BMP.
function montarIco(entradas) {
  const n = entradas.length;
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(n, 4);

  const diretorio = Buffer.alloc(16 * n);
  let deslocamento = cabecalho.length + diretorio.length;
  entradas.forEach((entrada, i) => {
    const o = i * 16;
    diretorio[o] = entrada.tamanho >= 256 ? 0 : entrada.tamanho;
    diretorio[o + 1] = entrada.tamanho >= 256 ? 0 : entrada.tamanho;
    diretorio[o + 2] = 0;
    diretorio[o + 3] = 0;
    diretorio.writeUInt16LE(1, o + 4);
    diretorio.writeUInt16LE(32, o + 6);
    diretorio.writeUInt32LE(entrada.png.length, o + 8);
    diretorio.writeUInt32LE(deslocamento, o + 12);
    deslocamento += entrada.png.length;
  });

  return Buffer.concat([cabecalho, diretorio, ...entradas.map((e) => e.png)]);
}

// --- Imagem de compartilhamento (Open Graph) ---
// 1200x630 é o tamanho que o WhatsApp/LinkedIn/Twitter recortam sem perder
// as bordas. O texto usa fontes do sistema porque o SVG é renderizado aqui,
// uma única vez, e o PNG resultante é versionado.
function svgOg() {
  const barras = [0, 1, 2, 3, 4, 5, 6, 7]
    .map((i) => {
      const altura = 40 + i * 34;
      const x = 690 + i * 56;
      return `<rect x="${x}" y="${560 - altura}" width="28" height="${altura}" rx="6" fill="${CIANO}" opacity="${0.16 + i * 0.09}"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" fill="none">
  <defs>
    <linearGradient id="og-fundo" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${FUNDO}"/>
      <stop offset="1" stop-color="#151B24"/>
    </linearGradient>
    <linearGradient id="omv-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6AA0FF"/>
      <stop offset="1" stop-color="#3E7BEC"/>
    </linearGradient>
    <radialGradient id="og-brilho" cx="0" cy="0" r="1" gradientTransform="translate(300 300) rotate(90) scale(520)">
      <stop offset="0" stop-color="${CIANO}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${CIANO}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og-fundo)"/>
  <rect width="1200" height="630" fill="url(#og-brilho)"/>
  ${barras}
  <g transform="translate(96 148) scale(2.75)">
    <rect width="64" height="64" rx="15" fill="url(#omv-grad)"/>
    <path d="M15 45 25.5 34 32.5 40.5 47 24" stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M38.5 24H47v8.5" stroke="#FFFFFF" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="96" y="420" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="92" font-weight="700" fill="#E7E9EC" letter-spacing="2">OMV</text>
  <text x="96" y="482" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="32" font-weight="600" fill="${CIANO}" letter-spacing="7">ORGANIZA MINHA VIDA</text>
  <text x="96" y="546" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="27" font-weight="400" fill="#9AA0A8">Controle financeiro pessoal: receitas, despesas, investimentos e metas.</text>
</svg>`;
}

export { svgOg };

async function main() {
  mkdirSync(ASSETS, { recursive: true });

  console.log('Gerando ícones em assets/');
  for (const t of tamanhos) {
    const nome = t === 180 ? 'apple-touch-icon.png' : t === 192 ? 'icon-192.png' : t === 512 ? 'icon-512.png' : `favicon-${t}.png`;
    arquivo(nome, pngs.get(t));
  }
  arquivo('favicon.ico', montarIco([16, 32, 48].map((t) => ({ tamanho: t, png: pngs.get(t) }))));
  arquivo('og-image.png', renderizar(svgOg(), 1200));
  console.log('Pronto.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
