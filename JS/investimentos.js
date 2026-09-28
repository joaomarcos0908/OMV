(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const formatarPercentual = (v) => (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + '%';
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

  const parseDecimal = (v) => {
    if(typeof v === 'number') return v;
    let s = String(v == null ? '' : v).trim().replace(/[R$\s ]/g, '');
    if(!s) return NaN;
    if(s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    s = s.replace(/[^\d.-]/g, '');
    if(!s || s === '-' || s === '.' || s === '-.') return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  function mascaraMoeda(el){
    el.addEventListener('input', function(){
      const cursorNoFim = this.selectionStart === this.value.length;
      const n = parseDecimal(this.value);
      this.value = Number.isFinite(n)
        ? n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
        : '';
      if(cursorNoFim){
        const l = this.value.length;
        this.setSelectionRange(l, l);
      }
    });
  }

  const ICONE_BASE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  const ICONES = {
    atualizar: '<svg ' + ICONE_BASE + '><path d="M20.5 12a8.5 8.5 0 1 1-2.49-6.01"/><polyline points="20.5 3 20.5 8.5 15 8.5"/></svg>',
    editar: '<svg ' + ICONE_BASE + '><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    remover: '<svg ' + ICONE_BASE + '><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };

  if (!auth.isLoggedIn()) {
    window.location.href = '/Html/login.html';
    return;
  }

  const CRYPTO_CONHECIDOS = {
    BTC:1, ETH:1, SOL:1, DOGE:1, XRP:1, ADA:1, DOT:1, MATIC:1, LINK:1, UNI:1,
    AVAX:1, ATOM:1, LTC:1, BCH:1, XLM:1, TRX:1, FIL:1, APT:1, ARB:1, OP:1,
    PEPE:1, SHIB:1, SUI:1, NEAR:1, AAVE:1, AXS:1, SAND:1, MANA:1, FTM:1,
    ALGO:1, VET:1, EGLD:1, THETA:1, HNT:1, ICP:1, RUNE:1, CRV:1, MKR:1,
    COMP:1, YFI:1, SNX:1, SUSHI:1, CAKE:1, KSM:1, ZEC:1, DASH:1, XMR:1,
    EOS:1, BNB:1, WBTC:1, DAI:1, USDC:1, USDT:1, TUSD:1, BUSD:1, QNT:1,
    CHZ:1, ENJ:1, BAT:1, ZIL:1, WAVES:1, XTZ:1, HBAR:1, FLOW:1, MINA:1,
    ROSE:1, STX:1, FET:1, GRT:1, OCEAN:1, BAL:1, DYDX:1, GALA:1, ILV:1
  };

  const CORES_TIPO = {
    'Ações':'#3F5C78','FIIs':'#9C6F1F','Renda Fixa':'#1F6F54',
    'Tesouro Direto':'#2E86AB','Criptomoedas':'#B2492E','Fundos':'#6E4F9E','Outros':'#8A8775'
  };

  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };
  let graficoDistribuicao = null;
  let graficoRetorno = null;
  let editandoId = null;

  function normalizarInvestimento(r){
    return {
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      cotacaoAtual: r.cotacaoAtual != null ? Number(r.cotacaoAtual) : r.cotacao_atual != null ? Number(r.cotacao_atual) : null,
      cotacaoAutomatica: r.cotacaoAutomatica ?? r.cotacao_automatica ?? false,
      ultimaAtualizacao: (r.ultimaAtualizacao || r.ultima_atualizacao || '') ? String(r.ultimaAtualizacao || r.ultima_atualizacao).slice(0,10) : null,
      quantidade: r.quantidade != null ? Number(r.quantidade) : null,
      precoMedio: r.precoMedio != null ? Number(r.precoMedio) : r.preco_medio != null ? Number(r.preco_medio) : null,
      dataAplicacao: (r.dataAplicacao || r.data_aplicacao || '') ? String(r.dataAplicacao || r.data_aplicacao).slice(0,10) : null,
      valorAplicado: r.valorAplicado != null ? Number(r.valorAplicado) : r.valor_aplicado != null ? Number(r.valor_aplicado) : null,
      tipoRendimento: r.tipoRendimento || r.tipo_rendimento || null,
      taxa: r.taxa != null ? Number(r.taxa) : null
    };
  }

  async function carregarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    try{
      const res = await auth.apiFetch('/investimentos');
      let lista = [];
      if (res && res.investimentos) lista = res.investimentos;
      else if (res && Array.isArray(res)) lista = res;
      estado.investimentos = lista.map(normalizarInvestimento);
      statusEl.textContent = 'dados carregados';
    }catch(e){
      statusEl.textContent = 'erro ao carregar dados';
    }
    renderizarTudo();
    atualizarTodasCotacoes();
  }

  let atualizando = false;
  let ultimaAtualizacaoTimestamp = 0;

  async function persistirInvestimento(inv){
    try{
      await auth.apiFetch('/investimentos', {
        method: 'PUT',
        body: JSON.stringify({
          id: inv.id,
          nome: inv.nome,
          tipo: inv.tipo,
          cotacaoAtual: inv.cotacaoAtual,
          cotacaoAutomatica: inv.cotacaoAutomatica,
          ultimaAtualizacao: inv.ultimaAtualizacao,
          quantidade: inv.quantidade,
          precoMedio: inv.precoMedio,
          dataAplicacao: inv.dataAplicacao,
          valorAplicado: inv.valorAplicado,
          tipoRendimento: inv.tipoRendimento,
          taxa: inv.taxa
        })
      });
    }catch(e){}
  }

  async function atualizarTodasCotacoes(){
    if(atualizando) return;
    atualizando = true;
    try{
      const statusEl = document.getElementById('status-salvamento');
      const temRendaFixa = estado.investimentos.some(i => i.tipo === 'Renda Fixa' || i.tipo === 'Tesouro Direto');
      const temApi = estado.investimentos.some(i => TIPOS_COM_COTACAO.includes(i.tipo) && i.quantidade != null);
      if(!temRendaFixa && !temApi) return;

      statusEl.textContent = 'atualizando cotações...';
      const hoje = new Date().toISOString().slice(0, 10);

      const cotações = await buscarCotacoesEmLote(estado.investimentos);
      const atualizados = await Promise.all(estado.investimentos.map(async (inv) => {
        if(inv.tipo === 'Renda Fixa' || inv.tipo === 'Tesouro Direto'){
          const valor = await atualizarCotacaoRendaFixa(inv);
          if(valor == null || !(valor > 0)) return false;
          inv.cotacaoAtual = valor;
          inv.cotacaoAutomatica = true;
          inv.ultimaAtualizacao = hoje;
          await persistirInvestimento(inv);
          return true;
        }
        const dados = cotações[inv.nome];
        const preco = dados && dados.preco;
        if(preco == null || !(preco > 0)) return false;
        inv.cotacaoAtual = preco;
        inv.cotacaoAutomatica = true;
        inv.ultimaAtualizacao = hoje;
        await persistirInvestimento(inv);
        return true;
      }));

      ultimaAtualizacaoTimestamp = Date.now();
      const falhas = atualizados.filter(Boolean).length;
      statusEl.textContent = falhas
        ? falhas + ' ativo(s) sem cotação'
        : 'tudo salvo';
      renderizarTudo();
    }catch(e){
      document.getElementById('status-salvamento').textContent = 'erro ao atualizar cotações';
    }finally{
      atualizando = false;
    }
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

  const TIPOS_COM_COTACAO = ['Ações','FIIs','Criptomoedas','Fundos'];

  // Uma única chamada para todos os ativos. O endpoint /api/cotacoes faz o
  // proxy no servidor, com cache e sem rate limit por ativo — antes era uma
  // requisição por item, o que estourava o limite do CoinGecko e travava tudo.
  async function buscarCotacoesEmLote(ativos){
    const alvo = ativos.filter(a => TIPOS_COM_COTACAO.includes(a.tipo) && a.quantidade != null);
    if(alvo.length === 0) return {};
    const nomes = alvo.map(a => a.nome);
    const tipos = alvo.map(a => a.tipo);
    const res = await auth.apiFetch(
      '/cotacoes?ativos=' + encodeURIComponent(nomes.join(',')) +
      '&tipos=' + encodeURIComponent(tipos.join(','))
    );
    return (res && res.cotações) || {};
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
    if(CRYPTO_CONHECIDOS[t]) return 'Criptomoedas';
    if(/^[A-Z]{4}11$/.test(t)) return 'FIIs';
    if(/^[A-Z]{4}[0-9]{1,2}$/.test(t)) return 'Ações';
    if(/^[A-Z0-9]{2,10}$/.test(t)) return 'Criptomoedas';
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
  const inputPrecoMedio = document.getElementById('investimento-preco-medio');
  const inputValorAplicado = document.getElementById('rendafixa-valor-aplicado');
  mascaraData(document.getElementById('rendafixa-data-aplicacao'));
  mascaraMoeda(inputPrecoMedio);
  mascaraMoeda(inputValorAplicado);

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
      'Ações':'Informe a quantidade de ações e o preço médio. A cotação é buscada automaticamente.',
      'FIIs':'Informe a quantidade de cotas e o preço médio. A cotação é buscada automaticamente.',
      'Renda Fixa':'Informe os dados da aplicação. O valor atual é calculado com base na taxa informada.',
      'Tesouro Direto':'Informe os dados do título. O valor atual é calculado automaticamente conforme o tipo de rendimento.',
      'Criptomoedas':'Informe a quantidade comprada e o preço médio. A cotação é buscada automaticamente.',
      'Fundos':'Informe a quantidade de cotas e o preço médio. A cotação é buscada automaticamente.',
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

    const temApi = TIPOS_COM_COTACAO.includes(tipo);

    let payload = { nome, tipo, cotacaoAtual: null, cotacaoAutomatica: false, ultimaAtualizacao: null, quantidade: null, precoMedio: null, dataAplicacao: null, valorAplicado: null, tipoRendimento: null, taxa: null };

    if(tipo === 'Renda Fixa' || tipo === 'Tesouro Direto'){
      const dataAplicacao = document.getElementById('rendafixa-data-aplicacao').value;
      const valorAplicado = parseDecimal(document.getElementById('rendafixa-valor-aplicado').value);
      const tipoRendimento = document.getElementById('rendafixa-tipo-rendimento').value;
      const taxa = parseFloat(document.getElementById('rendafixa-taxa').value);
      if(!dataAplicacao || !valorAplicado || valorAplicado <= 0 || !taxa || taxa <= 0) return;
      payload.dataAplicacao = converterDataParaISO(dataAplicacao);
      payload.valorAplicado = valorAplicado;
      payload.tipoRendimento = tipoRendimento;
      payload.taxa = taxa;
    } else {
      const quantidade = parseFloat(document.getElementById('investimento-quantidade').value);
      const precoMedio = parseDecimal(document.getElementById('investimento-preco-medio').value);
      if(!quantidade || quantidade <= 0 || !precoMedio || precoMedio <= 0) return;
      payload.quantidade = quantidade;
      payload.precoMedio = precoMedio;
    }

    const statusEl = document.getElementById('status-salvamento');
    try{
      let inv;
      if(editandoId){
        payload.id = editandoId;
        const res = await auth.apiFetch('/investimentos', { method: 'PUT', body: JSON.stringify(payload) });
        inv = res && res.investimento ? normalizarInvestimento(res.investimento) : null;
        if(inv){
          const idx = estado.investimentos.findIndex(i => i.id === editandoId);
          if(idx !== -1) estado.investimentos[idx] = inv; else estado.investimentos.push(inv);
        }
        editandoId = null;
        document.getElementById('investimento-botao-adicionar').textContent = 'Adicionar investimento';
      } else {
        const res = await auth.apiFetch('/investimentos', { method: 'POST', body: JSON.stringify(payload) });
        inv = res && res.investimento ? normalizarInvestimento(res.investimento) : null;
        if(inv) estado.investimentos.push(inv);
      }

      nomeInput.value = '';
      document.getElementById('investimento-quantidade').value = '1';
      document.getElementById('investimento-preco-medio').value = '';
      document.getElementById('rendafixa-data-aplicacao').value = '';
      document.getElementById('rendafixa-valor-aplicado').value = '';
      document.getElementById('rendafixa-taxa').value = '';
      renderizarTudo();

      if(inv){
        statusEl.textContent = 'buscando cotação...';
        if(tipo === 'Renda Fixa' || tipo === 'Tesouro Direto'){
          const valor = await atualizarCotacaoRendaFixa(inv);
          if(valor != null && valor > 0){
            inv.cotacaoAtual = valor;
            inv.cotacaoAutomatica = true;
            inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
            await persistirInvestimento(inv);
            renderizarTudo();
          }
        } else if(temApi){
          const cotações = await buscarCotacoesEmLote([{ nome, tipo, quantidade: payload.quantidade }]);
          const dados = cotações[nome];
          const preco = dados && dados.preco;
          if(preco != null && preco > 0){
            inv.cotacaoAtual = preco;
            inv.cotacaoAutomatica = true;
            inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
            await persistirInvestimento(inv);
            renderizarTudo();
          } else {
            statusEl.textContent = 'cotação indisponível para ' + nome + ' — use o ↻ para tentar de novo';
            return;
          }
        }
        statusEl.textContent = 'tudo salvo';
      }
    }catch(e){
      statusEl.textContent = 'erro ao salvar';
    }
  });

  async function removerInvestimento(id){
    const statusEl = document.getElementById('status-salvamento');
    try{
      await auth.apiFetch('/investimentos', { method: 'DELETE', body: JSON.stringify({ id }) });
      estado.investimentos = estado.investimentos.filter(i => i.id !== id);
      if(editandoId === id){ editandoId = null; document.getElementById('investimento-botao-adicionar').textContent = 'Adicionar investimento'; }
      statusEl.textContent = 'removido';
      renderizarTudo();
    }catch(e){
      statusEl.textContent = 'erro ao remover';
    }
  }

  const formatarMoedaInput = (v) => {
    const n = Number(v);
    if(!Number.isFinite(n)) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
  };

  function editarInvestimento(id){
    const i = estado.investimentos.find(i => i.id === id);
    if(!i) return;
    nomeInput.value = i.nome;
    tipoSelect.value = i.tipo;
    atualizarFormulario();
    if(i.tipo === 'Renda Fixa' || i.tipo === 'Tesouro Direto'){
      document.getElementById('rendafixa-data-aplicacao').value = formatarDataInput(i.dataAplicacao);
      document.getElementById('rendafixa-valor-aplicado').value = formatarMoedaInput(i.valorAplicado);
      document.getElementById('rendafixa-tipo-rendimento').value = i.tipoRendimento;
      document.getElementById('rendafixa-taxa').value = i.taxa;
    } else {
      document.getElementById('investimento-quantidade').value = i.quantidade;
      document.getElementById('investimento-preco-medio').value = formatarMoedaInput(i.precoMedio);
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
        <td><span class="etiqueta" style="background:${CORES_TIPO[i.tipo] || '#8A8775'}26; color:${CORES_TIPO[i.tipo] || '#8A8775'}">${i.tipo}</span></td>
        <td class="numero">${formatarMoeda(investido)}</td>
        <td class="numero">${formatarMoeda(atual)}</td>
        <td class="numero ${retorno >= 0 ? 'positivo' : 'negativo'}">${formatarMoeda(retorno)} (${formatarPercentual(retornoPct)})</td>
        <td class="celula-acoes">
          <button class="botao-icone" data-id="${i.id}" data-acao="atualizar" title="Atualizar cotação" aria-label="Atualizar cotação de ${escaparHtml(i.nome)}">${ICONES.atualizar}</button>
          <button class="botao-icone" data-id="${i.id}" data-acao="editar" title="Editar" aria-label="Editar ${escaparHtml(i.nome)}">${ICONES.editar}</button>
          <button class="botao-icone botao-perigo" data-id="${i.id}" data-acao="remover" title="Remover" aria-label="Remover ${escaparHtml(i.nome)}">${ICONES.remover}</button>
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
      legendaEl.innerHTML = '<span style="font-style:italic; color:var(--texto-fraca);">Nenhum ativo cadastrado</span>';
      return;
    }
    graficoDistribuicao = new Chart(ctx, {
      type:'doughnut',
      data:{
        labels:rotulos,
        datasets:[{
          data:dados, backgroundColor:cores, borderColor:'var(--fundo-card)', borderWidth:3,
          hoverOffset:10
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins:{
          legend:{ display:false },
          tooltip:{
            backgroundColor:'rgba(20,23,33,0.94)',
            titleFont:{ family:"'Inter', sans-serif", size:12, weight:'600' },
            bodyFont:{ family:"'Inter', sans-serif", size:13 },
            padding:12, cornerRadius:6, displayColors:true,
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
    const cores = retornos.map(r => r >= 0 ? '#3DD68C' : '#F2555A');
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
            backgroundColor:'rgba(20,23,33,0.94)',
            titleFont:{ family:"'Inter', sans-serif", size:12, weight:'600' },
            bodyFont:{ family:"'Inter', sans-serif", size:13 },
            padding:12, cornerRadius:6,
            callbacks:{ label:(ctx) => formatarPercentual(ctx.raw) }
          }
        },
        scales:{
          y:{
            beginAtZero:true,
            grid:{ color:'#23272E', drawBorder:false },
            ticks:{
              callback:(v) => v+'%',
              font:{ family:"'Inter', sans-serif", size:11 },
              color:'#9AA0A8'
            }
          },
          x:{
            grid:{ display:false },
            ticks:{
              maxRotation:45,
              font:{ family:"'Inter', sans-serif", size:11 },
              color:'#9AA0A8'
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
        await persistirInvestimento(inv);
        renderizarTudo();
        statusEl.textContent = 'cotação atualizada';
        return;
      }
      statusEl.textContent = 'erro ao calcular renda fixa';
      return;
    }

    if(!TIPOS_COM_COTACAO.includes(inv.tipo)){
      statusEl.textContent = 'tipo "' + inv.tipo + '" não tem cotação automática';
      return;
    }

    if(inv.quantidade == null){
      statusEl.textContent = 'sem quantidade — use o modo padrão';
      return;
    }

    try{
      const cotações = await buscarCotacoesEmLote([inv]);
      const dados = cotações[inv.nome];
      const preco = dados && dados.preco;
      if(preco != null && preco > 0){
        inv.cotacaoAtual = preco;
        inv.cotacaoAutomatica = true;
        inv.ultimaAtualizacao = new Date().toISOString().slice(0,10);
        await persistirInvestimento(inv);
        renderizarTudo();
        statusEl.textContent = 'cotação atualizada';
      } else {
        statusEl.textContent = 'cotação indisponível para ' + inv.nome;
      }
    }catch(e){
      statusEl.textContent = 'erro ao buscar cotação de ' + inv.nome;
    }
  }

  document.getElementById('investimento-botao-atualizar-tudo').addEventListener('click', async function(){
    this.disabled = true;
    this.textContent = 'Atualizando...';
    await atualizarTodasCotacoes();
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