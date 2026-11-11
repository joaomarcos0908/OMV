(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  // Escapa &, <, >, " e '. O texto escaping só de &, < e > não bastava: os
  // mesmos valores são interpolados dentro de atributos (aria-label="..."), e
  // uma aspa não escapada permitia injetar atributos novos no elemento.
  const escaparHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

  // A máscara precisa remontar o texto a partir dos dígitos digitados, e não a
  // partir do próprio valor já formatado. Reformatar o texto formatado a cada
  // tecla truncava o número: "434857,72" virava "4,04" e o valor era salvo
  // errado. A vírgula é o único separador decimal; o resto é reais.
  function mascaraMoeda(el){
    el.addEventListener('input', function(){
      const limpo = this.value.replace(/[^\d,]/g, '');
      if(!limpo){
        this.value = '';
        return;
      }
      const partes = limpo.split(',');
      const inteiro = (partes.shift() || '').replace(/^0+(?=\d)/, '');
      const centavos = partes.join('').replace(/\D/g, '');
      if(!centavos){
        this.value = inteiro + (limpo.endsWith(',') ? ',' : '');
        return;
      }
      this.value = Number(inteiro || 0).toLocaleString('pt-BR') + ',' + centavos.slice(0, 2);
    });
    el.addEventListener('blur', function(){
      const n = parseDecimal(this.value);
      this.value = Number.isFinite(n)
        ? n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
        : '';
    });
  }

  const ICONE_REMOVER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

  if (!auth.isLoggedIn()) {
    window.location.href = '/login';
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
    if (!nome) { interfaceOMV.invalido('meta-nome', 'Dê um nome à sua meta.'); return; }
    if (!Number.isFinite(valorAlvo) || valorAlvo <= 0) { interfaceOMV.invalido('meta-valor-alvo', 'Informe um valor alvo maior que zero.'); return; }
    if (valorAtual < 0) { interfaceOMV.invalido('meta-valor-atual', 'O valor guardado não pode ser negativo.'); return; }
    if (!interfaceOMV.dataValida('meta-data-limite', true)) return;
    if (dataLimite && dataLimite < new Date().toLocaleDateString('sv-SE')) { interfaceOMV.invalido('meta-data-limite', 'Escolha hoje ou uma data futura.'); return; }
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
    const item = estado.metas.find(item => item.id === id);
    if (!item || !window.confirm('Excluir meta "' + item.nome + '"? Esta ação não pode ser desfeita.')) return;
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
      lista.innerHTML = '<p class="texto-ajuda">Comece pela sua reserva de emergência. Dê um nome à meta e defina quanto quer guardar.</p><button class="botao-secundario" id="criar-primeira-meta">Criar primeira meta</button>';
      document.getElementById('criar-primeira-meta').addEventListener('click', () => document.getElementById('meta-nome').focus());
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
          <p class="meta-progresso">${Math.round(progresso)}% concluído · ${m.valorAtual >= m.valorAlvo ? 'Meta alcançada!' : 'Faltam ' + formatarMoeda(m.valorAlvo - m.valorAtual)}</p>
          <div class="barra-trilho" role="progressbar" aria-label="Progresso de ${escaparHtml(m.nome)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progresso)}">
            <div class="barra-preenchimento" style="width:${progresso}%"></div>
          </div>
          <div class="meta-rodape">
            <span>${m.dataLimite ? 'Limite: '+formatarDataBR(m.dataLimite) : 'Sem data limite'}</span>
            <button class="botao-icone botao-perigo" data-id="${m.id}" title="Remover" aria-label="Remover meta ${escaparHtml(m.nome)}">${ICONE_REMOVER}</button>
          </div>
          <form class="meta-atualizar">
            <div class="campo"><label for="guardado-${m.id}">Total já guardado (R$)</label><input id="guardado-${m.id}" inputmode="decimal" value="${m.valorAtual.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}" required /></div>
            <button class="botao-secundario" type="submit">Atualizar valor</button>
          </form>
        `;
        const campo = div.querySelector('input');
        mascaraMoeda(campo);
        div.querySelector('form').addEventListener('submit', async event => {
          event.preventDefault();
          const valorAtual = parseDecimal(campo.value);
          if (!Number.isFinite(valorAtual) || valorAtual < 0) { interfaceOMV.invalido(campo.id, 'Informe um valor válido, igual ou maior que zero.'); return; }
          const botao = event.currentTarget.querySelector('button');
          botao.disabled = true;
          try {
            const res = await auth.apiFetch('/metas', { method: 'PUT', body: JSON.stringify({ id: m.id, valorAtual }) });
            if (!res) return;
            m.valorAtual = valorAtual;
            renderizarMetas();
            interfaceOMV.mensagem('Valor da meta atualizado.');
            const atualizado = document.getElementById(campo.id);
            if (atualizado) atualizado.focus();
          } catch (erro) {
            interfaceOMV.mensagem('Não foi possível atualizar a meta. Confira sua conexão e tente novamente.', 'erro', div);
          } finally { botao.disabled = false; }
        });
        div.querySelector('button').addEventListener('click', ()=>removerMeta(m.id));
        lista.appendChild(div);
      });
    }
  }

  carregarEstado();

})();