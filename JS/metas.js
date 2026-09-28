(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
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
    let s = String(v == null ? '' : v).trim().replace(/[R$\s ]/g, '');
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

  const ICONE_REMOVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

  if (!auth.isLoggedIn()) {
    window.location.href = '/Html/login.html';
    return;
  }

  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };

  function normalizarMeta(m){
    return {
      id: m.id,
      nome: m.nome,
      valorAlvo: Number(m.valor_alvo ?? m.valorAlvo ?? 0),
      valorAtual: Number(m.valor_atual ?? m.valorAtual ?? 0),
      dataLimite: (m.data_limite ?? m.dataLimite ?? '') ? String(m.data_limite ?? m.dataLimite).slice(0,10) : ''
    };
  }

  async function carregarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    try{
      const res = await auth.apiFetch('/metas');
      let lista = [];
      if (res && res.metas) lista = res.metas;
      else if (res && Array.isArray(res)) lista = res;
      estado.metas = lista.map(normalizarMeta);
      statusEl.textContent = 'dados carregados';
    }catch(e){
      statusEl.textContent = 'erro ao carregar dados';
    }
    renderizarMetas();
  }

  mascaraData(document.getElementById('meta-data-limite'));
  mascaraMoeda(document.getElementById('meta-valor-alvo'));
  mascaraMoeda(document.getElementById('meta-valor-atual'));

  document.getElementById('meta-botao-adicionar').addEventListener('click', async ()=>{
    const nome = document.getElementById('meta-nome').value.trim();
    const valorAlvo = parseDecimal(document.getElementById('meta-valor-alvo').value);
    const valorAtual = parseDecimal(document.getElementById('meta-valor-atual').value) || 0;
    const dataLimite = converterDataParaISO(document.getElementById('meta-data-limite').value);
    if(!nome || !valorAlvo || valorAlvo<=0){ return; }
    if(dataLimite && dataLimite <= new Date().toISOString().slice(0,10)){ return; }
    const statusEl = document.getElementById('status-salvamento');
    try{
      await auth.apiFetch('/metas', {
        method: 'POST',
        body: JSON.stringify({ nome, valorAlvo, valorAtual, dataLimite: dataLimite || null })
      });
      document.getElementById('meta-nome').value='';
      document.getElementById('meta-valor-alvo').value='';
      document.getElementById('meta-valor-atual').value='';
      document.getElementById('meta-data-limite').value='';
      statusEl.textContent = 'salvo';
      await carregarEstado();
    }catch(e){
      statusEl.textContent = 'erro ao salvar';
    }
  });

  async function removerMeta(id){
    const statusEl = document.getElementById('status-salvamento');
    try{
      await auth.apiFetch('/metas', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      statusEl.textContent = 'removido';
      await carregarEstado();
    }catch(e){
      statusEl.textContent = 'erro ao remover';
    }
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
            <button class="botao-icone botao-perigo" data-id="${m.id}" title="Remover" aria-label="Remover meta ${escaparHtml(m.nome)}">${ICONE_REMOVER}</button>
          </div>
        `;
        div.querySelector('button').addEventListener('click', ()=>removerMeta(m.id));
        lista.appendChild(div);
      });
    }
  }

  carregarEstado();

})();