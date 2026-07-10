(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const formatarPercentual = (v) => (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '%';
  const gerarId = () => Math.random().toString(36).slice(2, 10);
  const escaparHtml = (s) => {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };
  const formatarDataBR = (iso) => (iso||'').split('-').reverse().join('/');
  const formatarDataInput = (iso) => iso ? iso.split('-').reverse().join('/') : '';
  const converterDataParaISO = (v) => {
    const partes = (v||'').split('/');
    if(partes.length !== 3) return v||'';
    const [d,m,a] = partes;
    return a+'-'+m+'-'+d;
  };
  function mascaraData(el){
    el.addEventListener('input', function(){
      let v = this.value.replace(/\D/g, '');
      if(v.length>2) v = v.slice(0,2)+'/'+v.slice(2);
      if(v.length>5) v = v.slice(0,5)+'/'+v.slice(5);
      if(v.length>10) v = v.slice(0,10);
      this.value = v;
    });
  }

  const CRYPTO_MAP = {
    'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','DOGE':'dogecoin','XRP':'ripple',
    'ADA':'cardano','DOT':'polkadot','MATIC':'matic-network','LINK':'chainlink',
    'UNI':'uniswap','AVAX':'avalanche-2','ATOM':'cosmos','LTC':'litecoin',
    'BCH':'bitcoin-cash','XLM':'stellar','TRX':'tron','FIL':'filecoin',
    'APT':'aptos','ARB':'arbitrum','OP':'optimism','PEPE':'pepe',
    'SHIB':'shiba-inu','SUI':'sui','NEAR':'near','AAVE':'aave','AXS':'axie-infinity',
    'SAND':'the-sandbox','MANA':'decentraland','FTM':'fantom','ALGO':'algorand',
    'VET':'vechain','EGLD':'elrond-erd-2','THETA':'theta-token','HNT':'helium',
    'ICP':'internet-computer','RUNE':'thorchain','CRV':'curve-dao-token',
    'MKR':'maker','COMP':'compound','YFI':'yearn-finance','SNX':'havven',
    'SUSHI':'sushi','CAKE':'pancakeswap','KSM':'kusama','ZEC':'zcash',
    'DASH':'dash','XMR':'monero','EOS':'eos','BNB':'binancecoin',
    'WBTC':'wrapped-bitcoin','DAI':'dai','USDC':'usd-coin','USDT':'tether',
    'TUSD':'true-usd','BUSD':'binance-usd','QNT':'quant-network',
    'CHZ':'chiliz','ENJ':'enjincoin','BAT':'basic-attention-token',
    'ZIL':'zilliqa','WAVES':'waves','XTZ':'tezos','HBAR':'hedera-hashgraph',
    'FLOW':'flow','MINA':'mina-protocol','ROSE':'oasis-network',
    'STX':'blockstack','FET':'fetch-ai','GRT':'the-graph','OCEAN':'ocean-protocol',
    'BAL':'balancer','1INCH':'1inch','DYDX':'dydx','GALA':'gala',
    'ILV':'illuvium','ALPHA':'alpha-finance'
  };

  const CORES_TIPO = {
    'Ações':'#3F5C78','FIIs':'#9C6F1F','Renda Fixa':'#1F6F54',
    'Tesouro Direto':'#2E86AB','Criptomoedas':'#B2492E','Fundos':'#6E4F9E','Outros':'#8A8775'
  };

  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };
  let graficoDistribuicao = null;
  let graficoRetorno = null;
  let editandoId = null;
  const CHAVE_ARMAZENAMENTO = 'organizador-financeiro-data';
  const TEM_ARMAZENAMENTO_WIDGET = typeof window !== 'undefined' && !!window.storage;

  async function carregarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    try{
      let bruto = null;
      if(TEM_ARMAZENAMENTO_WIDGET){
        const res = await window.storage.get(CHAVE_ARMAZENAMENTO);
        bruto = res && res.value;
      } else {
        bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      }
      if(bruto){
        const dados = JSON.parse(bruto);
        estado = Object.assign({receitas:[],gastos:[],metas:[],investimentos:[]}, dados);
      }
      statusEl.textContent = 'dados salvos automaticamente';
    }catch(e){
      statusEl.textContent = 'novo aqui — comece adicionando';
    }
    renderizarTudo();
    atualizarTodasCotacoes();
  }

  let atualizando = false;
  let ultimaAtualizacaoTimestamp = 0;

  async function atualizarTodasCotacoes(){
    if(atualizando) return;
    atualizando = true;
    const temRendaFixa = estado.investimentos.some(i => i.tipo === 'Renda Fixa' || i.tipo === 'Tesouro Direto');
    const temApi = estado.investimentos.some(i => i.tipo !== 'Renda Fixa' && i.tipo !== 'Tesouro Direto' && i.quantidade != null);
    if(!temRendaFixa && !temApi){ atualizando = false; return; }
    const statusEl = document.getElementById('status-salvamento');
    statusEl.textContent = 'atualizando cotações...';
    for(const inv of estado.investimentos){
      if(inv.tipo === 'Renda Fixa' || inv.tipo === 'Tesouro Direto'){
        const valor = await atualizarCotacaoRendaFixa(inv);
        if(valor != null && valor > 0){
          inv.cotacaoAtual = valor;
          inv.cotacaoAutomatica = true;
          inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
        }
      } else if(inv.quantidade != null){
        const cotacao = await buscarCotacao(inv.nome, inv.tipo);
        if(cotacao != null && cotacao > 0){
          inv.cotacaoAtual = cotacao;
          inv.cotacaoAutomatica = true;
          inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
        }
      }
    }
    ultimaAtualizacaoTimestamp = Date.now();
    salvarEstado();
    renderizarTudo();
    atualizando = false;
  }

  let temporizadorSalvar = null;
  function salvarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    statusEl.textContent = 'salvando...';
    clearTimeout(temporizadorSalvar);
    temporizadorSalvar = setTimeout(async ()=>{
      try{
        const payload = JSON.stringify(estado);
        if(TEM_ARMAZENAMENTO_WIDGET){
          await window.storage.set(CHAVE_ARMAZENAMENTO, payload);
        } else {
          localStorage.setItem(CHAVE_ARMAZENAMENTO, payload);
        }
        statusEl.textContent = 'tudo salvo';
      }catch(e){
        statusEl.textContent = 'erro ao salvar — tente novamente';
      }
    }, 300);
  }

  function calcularInvestido(inv){
    if(inv.quantidade != null && inv.precoMedio != null) return inv.quantidade * inv.precoMedio;
    if(inv.valorAplicado != null) return inv.valorAplicado;
    return 0;
  }

  function calcularAtual(inv){
    if(inv.quantidade != null && inv.cotacaoAtual != null) return inv.quantidade * inv.cotacaoAtual;
    if(inv.cotacaoAtual != null) return inv.cotacaoAtual;
    return calcularInvestido(inv);
  }

  function calcularRetorno(inv){
    const investido = calcularInvestido(inv);
    const atual = calcularAtual(inv);
    return { retorno: atual - investido, retornoPct: investido > 0 ? (atual / investido - 1) * 100 : 0 };
  }

  async function buscarCotacaoCripto(ticker){
    const tickerLimpo = ticker.toUpperCase().trim();
    const coinId = CRYPTO_MAP[tickerLimpo] || tickerLimpo.toLowerCase();
    try{
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(coinId) + '&vs_currencies=brl', {
        signal: AbortSignal.timeout(10000)
      });
      if(!res.ok) return null;
      const data = await res.json();
      if(data[coinId] && data[coinId].brl != null) return data[coinId].brl;
      const alt = data[tickerLimpo.toLowerCase()];
      if(alt && alt.brl != null) return alt.brl;
      return null;
    }catch(e){
      return null;
    }
  }

  async function buscarCotacaoAcaoFII(ticker){
    const t = ticker.toUpperCase().trim();
    try{
      const res = await fetch('https://ledev.com.br/api/cotacoes/' + encodeURIComponent(t), {
        signal: AbortSignal.timeout(8000)
      });
      if(!res.ok) return null;
      const data = await res.json();
      if(data && data.price != null) return parseFloat(data.price);
      return null;
    }catch(e){
      return null;
    }
  }

  function pegarCache(chave){
    try{ const v = localStorage.getItem(chave); return v ? parseFloat(v) : null; }catch(e){ return null; }
  }
  function salvarCache(chave, valor){
    try{ localStorage.setItem(chave, valor); }catch(e){}
  }

  async function buscarCDI(){
    try{
      const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1', {
        signal: AbortSignal.timeout(5000)
      });
      if(!res.ok) return pegarCache('cache_cdi');
      const data = await res.json();
      if(data && data.length > 0){
        const valor = parseFloat(data[0].valor);
        if(valor > 0) salvarCache('cache_cdi', valor);
        return valor;
      }
      return pegarCache('cache_cdi');
    }catch(e){
      return pegarCache('cache_cdi');
    }
  }

  async function buscarSelic(){
    try{
      const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/1', {
        signal: AbortSignal.timeout(5000)
      });
      if(!res.ok) return pegarCache('cache_selic');
      const data = await res.json();
      if(data && data.length > 0){
        const valor = parseFloat(data[0].valor);
        if(valor > 0) salvarCache('cache_selic', valor);
        return valor;
      }
      return pegarCache('cache_selic');
    }catch(e){
      return pegarCache('cache_selic');
    }
  }

  async function buscarIPCA12m(){
    try{
      const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1', {
        signal: AbortSignal.timeout(5000)
      });
      if(!res.ok) return null;
      const data = await res.json();
      if(data && data.length > 0) return parseFloat(data[0].valor);
      return null;
    }catch(e){
      return null;
    }
  }

  function contarDiasUteis(dataISO){
    const fim = new Date();
    let count = 0;
    const current = new Date(dataISO);
    current.setDate(current.getDate() + 1);
    while(current <= fim){
      const d = current.getDay();
      if(d !== 0 && d !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  function mesesDecorridos(dataISO){
    const hoje = new Date();
    const app = new Date(dataISO);
    return (hoje.getFullYear() - app.getFullYear()) * 12 + (hoje.getMonth() - app.getMonth());
  }

  async function atualizarCotacaoRendaFixa(inv){
    const diasUteis = inv.dataAplicacao ? contarDiasUteis(inv.dataAplicacao) : 0;
    const meses = inv.dataAplicacao ? mesesDecorridos(inv.dataAplicacao) : 0;
    if(diasUteis < 0 || meses < 0) return inv.valorAplicado;
    if(diasUteis === 0 && meses === 0) return inv.valorAplicado;

    if(inv.tipoRendimento === 'pre' && inv.valorAplicado && inv.dataAplicacao && inv.taxa){
      if(diasUteis === 0) return inv.valorAplicado;
      return inv.valorAplicado * Math.pow(1 + inv.taxa/100, diasUteis/252);
    }

    if(inv.tipoRendimento === 'cdi' && inv.valorAplicado && inv.dataAplicacao && inv.taxa){
      const cdiDiario = await buscarCDI();
      if(cdiDiario != null && cdiDiario > 0){
        if(diasUteis === 0) return inv.valorAplicado;
        const taxaDia = (cdiDiario/100) * (inv.taxa/100);
        return inv.valorAplicado * Math.pow(1 + taxaDia, diasUteis);
      }
      return null;
    }

    if(inv.tipoRendimento === 'selic' && inv.valorAplicado && inv.dataAplicacao && inv.taxa){
      const selicDiaria = await buscarSelic();
      if(selicDiaria != null && selicDiaria > 0){
        if(diasUteis === 0) return inv.valorAplicado;
        const taxaDia = (selicDiaria/100) * (inv.taxa/100);
        return inv.valorAplicado * Math.pow(1 + taxaDia, diasUteis);
      }
      return null;
    }

    if(inv.tipoRendimento === 'ipca' && inv.valorAplicado && inv.dataAplicacao && inv.taxa){
      if(diasUteis === 0) return inv.valorAplicado;
      const ipca12m = await buscarIPCA12m();
      const taxaIPCA = ipca12m != null && ipca12m > 0 ? ipca12m/100 : 0;
      const taxaTotal = (1 + taxaIPCA) * (1 + inv.taxa/100) - 1;
      return inv.valorAplicado * Math.pow(1 + taxaTotal, diasUteis/252);
    }

    return inv.valorAplicado || null;
  }

  function detectarTipo(ticker){
    const t = ticker.toUpperCase().trim();
    if(CRYPTO_MAP[t]) return 'Criptomoedas';
    if(/^[A-Z]{4}11$/.test(t)) return 'FIIs';
    if(/^[A-Z]{4}[0-9]{1,2}$/.test(t)) return 'Ações';
    if(/^[A-Z0-9]{2,10}$/.test(t)) return 'Criptomoedas';
    return null;
  }

  async function buscarCotacao(ticker, tipo){
    if(tipo === 'Criptomoedas') return buscarCotacaoCripto(ticker);
    if(tipo === 'Ações' || tipo === 'FIIs' || tipo === 'Fundos') return buscarCotacaoAcaoFII(ticker);
    return null;
  }

  const nomeInput = document.getElementById('investimento-nome');
  const tipoSelect = document.getElementById('investimento-tipo');
  const grupoPadrao = document.getElementById('grupo-padrao');
  const grupoRendaFixa = document.getElementById('grupo-renda-fixa');
  const rendafixaTaxaRotulo = document.getElementById('rendafixa-taxa-rotulo');
  const textoAjuda = document.getElementById('investimento-texto-ajuda');
  const grupoIpcaInfo = document.getElementById('grupo-ipca-info');
  const ipcaInfoTexto = document.getElementById('ipca-info-texto');
  const rendafixaTaxaInput = document.getElementById('rendafixa-taxa');
  mascaraData(document.getElementById('rendafixa-data-aplicacao'));

  function atualizarFormulario(){
    const tipo = tipoSelect.value;
    if(tipo === 'Renda Fixa' || tipo === 'Tesouro Direto'){
      grupoRendaFixa.style.display = '';
      grupoPadrao.style.display = 'none';
    } else {
      grupoRendaFixa.style.display = 'none';
      grupoPadrao.style.display = '';
    }
    const ajudaTextos = {
      'Ações':'Informe o número de ações compradas e o preço médio. A cotação atual é atualizada automaticamente via brapi.dev.',
      'FIIs':'Informe o número de cotas e o preço médio. A cotação atual é atualizada automaticamente.',
      'Renda Fixa':'Informe os dados da aplicação. O valor atual será calculado com base na taxa informada.',
      'Tesouro Direto':'Informe os dados do título. O valor atual é calculado automaticamente conforme o tipo de rendimento.',
      'Criptomoedas':'Informe a quantidade comprada e o preço médio. A cotação atual é buscada automaticamente via CoinGecko.',
      'Fundos':'Informe a quantidade de cotas e o preço médio.',
      'Outros':'Informe a quantidade e o preço médio.'
    };
    textoAjuda.innerHTML = '<p>' + (ajudaTextos[tipo] || 'Preencha os campos abaixo.') + '</p>';
  }

  tipoSelect.addEventListener('change', atualizarFormulario);

  let ipcaCache = null;

  async function atualizarIpcaInfo(){
    if(ipcaCache == null){
      ipcaCache = await buscarIPCA12m();
    }
    if(ipcaCache != null){
      const taxa = parseFloat(rendafixaTaxaInput.value);
      const ipcaPct = ipcaCache;
      let total = '';
      if(taxa > 0){
        const totalPct = ((1 + ipcaCache/100) * (1 + taxa/100) - 1) * 100;
        total = ` → Total: ${totalPct.toFixed(2).replace('.',',')}% a.a.`;
      }
      ipcaInfoTexto.innerHTML = `<strong>${ipcaPct.toFixed(2).replace('.',',')}%</strong> + sua taxa${total}`;
    } else {
      ipcaInfoTexto.textContent = 'indisponível no momento';
    }
  }

  document.getElementById('rendafixa-tipo-rendimento').addEventListener('change', function(){
    const labels = { 'cdi':'Percentual do CDI (ex: 100)','selic':'Percentual da Selic (ex: 100)','pre':'Taxa fixa % a.a. (ex: 13,5)','ipca':'Taxa IPCA + % a.a. (ex: 5,5)' };
    rendafixaTaxaRotulo.textContent = labels[this.value] || 'Taxa';
    if(this.value === 'ipca'){
      grupoIpcaInfo.style.display = '';
      ipcaCache = null;
      atualizarIpcaInfo();
    } else {
      grupoIpcaInfo.style.display = 'none';
    }
  });

  rendafixaTaxaInput.addEventListener('input', function(){
    if(document.getElementById('rendafixa-tipo-rendimento').value === 'ipca'){
      atualizarIpcaInfo();
    }
  });

  nomeInput.addEventListener('blur', function(){
    const nome = this.value.trim();
    if(!nome) return;
    const detectado = detectarTipo(nome);
    if(detectado){
      tipoSelect.value = detectado;
      atualizarFormulario();
    }
  });

  document.getElementById('investimento-botao-adicionar').addEventListener('click', async function(){
    const nome = nomeInput.value.trim();
    const tipo = tipoSelect.value;
    if(!nome) return;

    const temApi = tipo === 'Ações' || tipo === 'FIIs' || tipo === 'Criptomoedas' || tipo === 'Fundos';

    let inv;
    if(editandoId){
      inv = estado.investimentos.find(i => i.id === editandoId);
      if(!inv) return;
      inv.nome = nome;
      inv.tipo = tipo;
      inv.cotacaoAtual = null;
      inv.cotacaoAutomatica = false;
      inv.ultimaAtualizacao = null;
      inv.quantidade = null;
      inv.precoMedio = null;
      inv.dataAplicacao = null;
      inv.valorAplicado = null;
      inv.tipoRendimento = null;
      inv.taxa = null;
    } else {
      inv = {
        id: gerarId(), nome, tipo,
        cotacaoAtual: null, cotacaoAutomatica: false, ultimaAtualizacao: null,
        quantidade: null, precoMedio: null,
        dataAplicacao: null, valorAplicado: null, tipoRendimento: null, taxa: null
      };
    }

    if(tipo === 'Renda Fixa' || tipo === 'Tesouro Direto'){
      const dataAplicacao = document.getElementById('rendafixa-data-aplicacao').value;
      const valorAplicado = parseFloat(document.getElementById('rendafixa-valor-aplicado').value);
      const tipoRendimento = document.getElementById('rendafixa-tipo-rendimento').value;
      const taxa = parseFloat(document.getElementById('rendafixa-taxa').value);
      if(!dataAplicacao || !valorAplicado || valorAplicado <= 0 || !taxa || taxa <= 0) return;
      inv.dataAplicacao = converterDataParaISO(dataAplicacao);
      inv.valorAplicado = valorAplicado;
      inv.tipoRendimento = tipoRendimento;
      inv.taxa = taxa;
    } else {
      const quantidade = parseFloat(document.getElementById('investimento-quantidade').value);
      const precoMedio = parseFloat(document.getElementById('investimento-preco-medio').value);
      if(!quantidade || quantidade <= 0 || !precoMedio || precoMedio <= 0) return;
      inv.quantidade = quantidade;
      inv.precoMedio = precoMedio;
    }

    if(!editandoId) estado.investimentos.push(inv);

    editandoId = null;
    document.getElementById('investimento-botao-adicionar').textContent = 'Adicionar investimento';

    nomeInput.value = '';
    document.getElementById('investimento-quantidade').value = '1';
    document.getElementById('investimento-preco-medio').value = '';
    document.getElementById('rendafixa-data-aplicacao').value = '';
    document.getElementById('rendafixa-valor-aplicado').value = '';
    document.getElementById('rendafixa-taxa').value = '';
    salvarEstado();
    renderizarTudo();

    const statusEl = document.getElementById('status-salvamento');
    statusEl.textContent = 'buscando cotação...';

    if(tipo === 'Renda Fixa' || tipo === 'Tesouro Direto'){
      const valor = await atualizarCotacaoRendaFixa(inv);
      if(valor != null && valor > 0){
        inv.cotacaoAtual = valor;
        inv.cotacaoAutomatica = true;
        inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
        salvarEstado();
        renderizarTudo();
      }
    } else if(temApi && inv.cotacaoAtual == null){
      const cotacao = await buscarCotacao(nome, tipo);
      if(cotacao != null && cotacao > 0){
        inv.cotacaoAtual = cotacao;
        inv.cotacaoAutomatica = true;
        inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
        salvarEstado();
        renderizarTudo();
      } else {
        statusEl.textContent = 'cotação indisponível — clique ↻ para tentar novamente';
      }
    } else {
      statusEl.textContent = 'tudo salvo';
    }
  });

  function removerInvestimento(id){
    estado.investimentos = estado.investimentos.filter(i => i.id !== id);
    if(editandoId === id){ editandoId = null; document.getElementById('investimento-botao-adicionar').textContent = 'Adicionar investimento'; }
    salvarEstado();
    renderizarTudo();
  }

  function editarInvestimento(id){
    const i = estado.investimentos.find(i => i.id === id);
    if(!i) return;
    nomeInput.value = i.nome;
    tipoSelect.value = i.tipo;
    atualizarFormulario();
    if(i.tipo === 'Renda Fixa' || i.tipo === 'Tesouro Direto'){
      document.getElementById('rendafixa-data-aplicacao').value = formatarDataInput(i.dataAplicacao);
      document.getElementById('rendafixa-valor-aplicado').value = i.valorAplicado;
      document.getElementById('rendafixa-tipo-rendimento').value = i.tipoRendimento;
      document.getElementById('rendafixa-taxa').value = i.taxa;
    } else {
      document.getElementById('investimento-quantidade').value = i.quantidade;
      document.getElementById('investimento-preco-medio').value = i.precoMedio;
    }
    editandoId = i.id;
    document.getElementById('investimento-botao-adicionar').textContent = 'Salvar alteração';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function renderizarTudo(){
    renderizarResumo();
    renderizarCarteira();
    renderizarGraficoDistribuicao();
    renderizarGraficoRetorno();
  }

  function renderizarResumo(){
    const ativos = estado.investimentos;
    const totalInvestido = ativos.reduce((s,i) => s + calcularInvestido(i), 0);
    const totalAtual = ativos.reduce((s,i) => s + calcularAtual(i), 0);
    const retorno = totalAtual - totalInvestido;
    const retornoPct = totalInvestido > 0 ? (retorno / totalInvestido) * 100 : 0;
    document.getElementById('investimento-resumo').innerHTML = `
      <div class="indicador">
        <div class="indicador-rotulo">Patrimônio</div>
        <div class="indicador-valor ${totalAtual > 0 ? 'positivo' : ''}">${formatarMoeda(totalAtual)}</div>
      </div>
      <div class="indicador">
        <div class="indicador-rotulo">Total investido</div>
        <div class="indicador-valor">${formatarMoeda(totalInvestido)}</div>
      </div>
      <div class="indicador">
        <div class="indicador-rotulo">Retorno total</div>
        <div class="indicador-valor ${retorno >= 0 ? 'positivo' : 'negativo'}">${formatarMoeda(retorno)}</div>
      </div>
      <div class="indicador">
        <div class="indicador-rotulo">Rentabilidade</div>
        <div class="indicador-valor ${retornoPct >= 0 ? 'positivo' : 'negativo'}">${formatarPercentual(retornoPct)}</div>
      </div>
      <div class="indicador">
        <div class="indicador-rotulo">Ativos</div>
        <div class="indicador-valor">${ativos.length}</div>
      </div>
    `;
  }

  function renderizarCarteira(){
    const corpo = document.getElementById('investimento-tabela-corpo');
    corpo.innerHTML = '';
    if(estado.investimentos.length === 0){
      corpo.innerHTML = '<tr class="linha-vazia"><td colspan="6">Nenhum ativo cadastrado ainda</td></tr>';
      return;
    }
    estado.investimentos.forEach(i => {
      const investido = calcularInvestido(i);
      const atual = calcularAtual(i);
      const {retorno, retornoPct} = calcularRetorno(i);
      const auto = i.cotacaoAutomatica && i.cotacaoAtual != null;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escaparHtml(i.nome)}${auto ? ' <span class="selo-cotacao automatica">auto</span>' : ' <span class="selo-cotacao manual">manual</span>'}</td>
        <td><span class="etiqueta">${i.tipo}</span></td>
        <td class="numero">${formatarMoeda(investido)}</td>
        <td class="numero">${formatarMoeda(atual)}</td>
        <td class="numero" style="color:${retorno >= 0 ? 'var(--esmeralda-texto)' : 'var(--terracota-texto)'}">${formatarMoeda(retorno)} (${formatarPercentual(retornoPct)})</td>
        <td style="text-align:right;">
          <button class="botao-secundario" data-id="${i.id}" data-acao="atualizar" title="Atualizar cotação">↻</button>
          <button class="botao-secundario" data-id="${i.id}" data-acao="editar">editar</button>
          <button class="botao-secundario" data-id="${i.id}" data-acao="remover">remover</button>
        </td>
      `;
      tr.querySelector('[data-acao="editar"]').addEventListener('click', () => editarInvestimento(i.id));
      tr.querySelector('[data-acao="remover"]').addEventListener('click', () => removerInvestimento(i.id));
      tr.querySelector('[data-acao="atualizar"]').addEventListener('click', () => atualizarCotacao(i.id));
      corpo.appendChild(tr);
    });
  }

  function renderizarGraficoDistribuicao(){
    const ativos = estado.investimentos;
    const porTipo = {};
    ativos.forEach(i => {
      const tipo = i.tipo;
      porTipo[tipo] = (porTipo[tipo] || 0) + calcularAtual(i);
    });
    const rotulos = Object.keys(porTipo);
    const dados = Object.values(porTipo);
    const cores = rotulos.map(r => CORES_TIPO[r] || '#8A8775');
    const ctx = document.getElementById('grafico-distribuicao');
    if(graficoDistribuicao) graficoDistribuicao.destroy();
    const legendaEl = document.getElementById('legenda-distribuicao');
    if(rotulos.length === 0){
      legendaEl.innerHTML = '<span style="font-style:italic; color:var(--tinta-fraca);">Nenhum ativo cadastrado</span>';
      return;
    }
    graficoDistribuicao = new Chart(ctx, {
      type:'doughnut',
      data:{
        labels:rotulos,
        datasets:[{
          data:dados, backgroundColor:cores, borderColor:'#fff', borderWidth:3,
          hoverOffset:10
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{
          legend:{ display:false },
          tooltip:{
            backgroundColor:'rgba(22,34,60,0.92)',
            titleFont:{ family:'Inter, sans-serif', size:12, weight:'600' },
            bodyFont:{ family:'IBM Plex Mono, monospace', size:13 },
            padding:12, cornerRadius:8, displayColors:true,
            callbacks:{
              label:(ctx)=>{
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const pct = total ? ((ctx.raw/total)*100).toFixed(1) : 0;
                return ' ' + formatarMoeda(ctx.raw) + '  (' + pct.replace('.',',') + '%)';
              }
            }
          }
        },
        animation:{ animateRotate:true, duration:500 }
      }
    });
    const total = dados.reduce((a,b)=>a+b,0);
    legendaEl.innerHTML = rotulos.map((l,i)=>{
      const pct = total ? (dados[i]/total*100) : 0;
      return '<span><span class="ponto-legenda" style="background:'+cores[i]+'"></span>'+l+' '+formatarPercentual(pct)+'</span>';
    }).join('');
  }

  function renderizarGraficoRetorno(){
    const ativos = estado.investimentos;
    const ctx = document.getElementById('grafico-retorno');
    if(graficoRetorno) graficoRetorno.destroy();
    if(ativos.length === 0) return;
    const nomes = ativos.map(i => i.nome);
    const retornos = ativos.map(i => calcularRetorno(i).retornoPct);
    const cores = retornos.map(r => r >= 0 ? '#1F6F54' : '#B2492E');
    graficoRetorno = new Chart(ctx, {
      type:'bar',
      data:{
        labels:nomes,
        datasets:[{
          label:'Retorno (%)',
          data:retornos,
          backgroundColor:cores.map(c => c + 'CC'),
          borderColor:cores,
          borderWidth:1,
          borderRadius:5,
          borderSkipped:false,
          hoverBackgroundColor:cores
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{
            backgroundColor:'rgba(22,34,60,0.92)',
            titleFont:{ family:'Inter, sans-serif', size:12, weight:'600' },
            bodyFont:{ family:'IBM Plex Mono, monospace', size:13 },
            padding:12, cornerRadius:8,
            callbacks:{ label:(ctx) => formatarPercentual(ctx.raw) }
          }
        },
        scales:{
          y:{
            beginAtZero:true,
            grid:{ color:'rgba(0,0,0,0.06)', drawBorder:false },
            ticks:{
              callback:(v) => v+'%',
              font:{ family:'IBM Plex Mono, monospace', size:11 },
              color:'#93927F'
            }
          },
          x:{
            grid:{ display:false },
            ticks:{
              maxRotation:45,
              font:{ family:'Inter, sans-serif', size:11 },
              color:'#4D5A78'
            }
          }
        },
        animation:{ duration:500 }
      }
    });
  }

  async function atualizarCotacao(id){
    const inv = estado.investimentos.find(i => i.id === id);
    if(!inv) return;

    const statusEl = document.getElementById('status-salvamento');
    statusEl.textContent = 'buscando cotação...';

    if(inv.tipo === 'Renda Fixa' || inv.tipo === 'Tesouro Direto'){
      const novoValor = await atualizarCotacaoRendaFixa(inv);
      if(novoValor != null && novoValor > 0){
        inv.cotacaoAtual = novoValor;
        inv.cotacaoAutomatica = true;
        inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
        salvarEstado();
        renderizarTudo();
        return;
      }
      statusEl.textContent = 'erro ao calcular renda fixa';
      return;
    }

    if(inv.quantidade == null){
      statusEl.textContent = 'sem quantidade — use o modo padrão';
      return;
    }

    const cotacao = await buscarCotacao(inv.nome, inv.tipo);
    if(cotacao != null && cotacao > 0){
      inv.cotacaoAtual = cotacao;
      inv.cotacaoAutomatica = true;
      inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
      salvarEstado();
      renderizarTudo();
      statusEl.textContent = 'cotação atualizada';
    } else {
      statusEl.textContent = 'cotação indisponível para ' + inv.nome;
    }
  }

  document.getElementById('investimento-botao-atualizar-tudo').addEventListener('click', async function(){
    this.disabled = true;
    this.textContent = 'Atualizando...';
    for(const inv of estado.investimentos){
      await atualizarCotacao(inv.id);
    }
    this.disabled = false;
    this.textContent = 'Atualizar todas as cotações';
  });

  setInterval(() => {
    if(document.visibilityState === 'visible'){
      atualizarTodasCotacoes();
    }
  }, 300000);

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible' && Date.now() - ultimaAtualizacaoTimestamp > 60000){
      atualizarTodasCotacoes();
    }
  });

  atualizarFormulario();
  carregarEstado();

})();
