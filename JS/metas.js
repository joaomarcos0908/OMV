(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
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

  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };
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
    mascaraData(document.getElementById('meta-data-limite'));
    renderizarMetas();
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

  document.getElementById('meta-botao-adicionar').addEventListener('click', ()=>{
    const nome = document.getElementById('meta-nome').value.trim();
    const valorAlvo = parseFloat(document.getElementById('meta-valor-alvo').value);
    const valorAtual = parseFloat(document.getElementById('meta-valor-atual').value) || 0;
    const dataLimite = converterDataParaISO(document.getElementById('meta-data-limite').value);
    if(!nome || !valorAlvo || valorAlvo<=0){ return; }
    if(dataLimite && dataLimite <= new Date().toISOString().slice(0,10)){ return; }
    estado.metas.push({id:gerarId(), nome, valorAlvo, valorAtual, dataLimite});
    document.getElementById('meta-nome').value='';
    document.getElementById('meta-valor-alvo').value='';
    document.getElementById('meta-valor-atual').value='';
    document.getElementById('meta-data-limite').value='';
    salvarEstado();
    renderizarMetas();
  });

  function removerMeta(id){
    estado.metas = estado.metas.filter(m=>m.id!==id);
    salvarEstado();
    renderizarMetas();
  }

  function renderizarMetas(){
    const lista = document.getElementById('meta-lista');
    lista.innerHTML='';
    const ordenadas = [...estado.metas].sort((a,b)=>{
      if(a.dataLimite && b.dataLimite) return a.dataLimite.localeCompare(b.dataLimite);
      if(a.dataLimite) return -1;
      if(b.dataLimite) return 1;
      return 0;
    });
    if(ordenadas.length===0){
      lista.innerHTML = '<p class="texto-ajuda">Nenhuma meta cadastrada ainda</p>';
    } else {
      ordenadas.forEach(m=>{
        const progresso = m.valorAlvo>0 ? Math.min(100, (m.valorAtual/m.valorAlvo)*100) : 0;
        const div = document.createElement('div');
        div.className='meta-item';
        div.innerHTML = `
          <div class="meta-cabecalho">
            <span class="meta-nome">${escaparHtml(m.nome)}</span>
            <span class="meta-valores">${formatarMoeda(m.valorAtual)} / ${formatarMoeda(m.valorAlvo)}</span>
          </div>
          <div class="barra-trilho">
            <div class="barra-preenchimento" style="width:${progresso}%"></div>
          </div>
          <div class="meta-rodape">
            <span>${m.dataLimite ? 'Limite: '+formatarDataBR(m.dataLimite) : 'Sem data limite'}</span>
            <button class="botao-secundario" data-id="${m.id}">remover</button>
          </div>
        `;
        div.querySelector('button').addEventListener('click', ()=>removerMeta(m.id));
        lista.appendChild(div);
      });
    }
  }

  carregarEstado();

})();
