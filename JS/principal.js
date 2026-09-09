(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const formatarPercentual = (v) => (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
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
  const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const chaveMesAtual = () => new Date().toISOString().slice(0,7);
  const formatarChaveMes = (chave) => {
    const [ano, mes] = chave.split('-');
    return NOMES_MESES[parseInt(mes,10)-1] + ' de ' + ano;
  };
  const CORES_CATEGORIA_GASTO = {
    'Moradia':'#3F5C78','Alimentação':'#9C6F1F','Transporte':'#1F6F54','Lazer':'#B2492E',
    'Saúde':'#6E4F9E','Educação':'#2E7D8F','Outros':'#8A8775'
  };
  const CORES_CATEGORIA_RECEITA = {
    'Salário':'#1F6F54','Estágio':'#3F5C78','Freelance':'#9C6F1F','Outros':'#8A8775'
  };

  if (!auth.isLoggedIn()) {
    window.location.href = '/Html/login.html';
    return;
  }

  function normalizarGasto(r){
    return {
      id: r.id,
      desc: r.descricao || r.desc,
      cat: r.categoria || r.cat,
      valor: Number(r.valor),
      data: (r.data || '').slice(0,10),
      fixa: r.fixa ?? false
    };
  }
  function normalizarReceita(r){
    return {
      id: r.id,
      desc: r.descricao || r.desc,
      cat: r.categoria || r.cat,
      valor: Number(r.valor),
      data: (r.data || '').slice(0,10)
    };
  }

  let estado = { receitas: [], gastos: [] };
  let graficoGastos = null;
  let graficoReceitas = null;
  let editandoGastoId = null;
  let editandoReceitaId = null;

  const mesSelecionado = () => document.getElementById('filtro-mes').value || chaveMesAtual();

  async function carregarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    try{
      const [gastosRes, receitasRes] = await Promise.all([
        auth.apiFetch('/gastos'),
        auth.apiFetch('/receitas')
      ]);
      let listaG = gastosRes && gastosRes.gastos ? gastosRes.gastos : Array.isArray(gastosRes) ? gastosRes : [];
      let listaR = receitasRes && receitasRes.receitas ? receitasRes.receitas : Array.isArray(receitasRes) ? receitasRes : [];
      estado.gastos = listaG.map(normalizarGasto);
      estado.receitas = listaR.map(normalizarReceita);
      statusEl.textContent = 'dados carregados';
    }catch(e){
      statusEl.textContent = 'erro ao carregar dados';
    }
    mascaraData(document.getElementById('gasto-data'));
    mascaraData(document.getElementById('receita-data'));
    const hoje = new Date().toISOString().slice(0,10);
    document.getElementById('gasto-data').value = formatarDataInput(hoje);
    document.getElementById('receita-data').value = formatarDataInput(hoje);
    renderizarTudo();
  }

  function renderizarFiltroMes(){
    const select = document.getElementById('filtro-mes');
    const anterior = select.value;
    const conjuntoMeses = new Set();
    estado.gastos.forEach(g => { if (g.data) conjuntoMeses.add(g.data.slice(0,7)); });
    estado.receitas.forEach(r => { if (r.data) conjuntoMeses.add(r.data.slice(0,7)); });
    conjuntoMeses.add(chaveMesAtual());
    const meses = Array.from(conjuntoMeses).sort().reverse();
    select.innerHTML = meses.map(m=> `<option value="${m}">${formatarChaveMes(m)}</option>`).join('');
    select.value = meses.includes(anterior) ? anterior : chaveMesAtual();
  }

  document.getElementById('filtro-mes').addEventListener('change', renderizarTudo);

  function gerarId(){ return Math.random().toString(36).slice(2, 10); }

  function autoPopularFixas(mes){
    const mesesComDados = [...new Set(estado.gastos.map(g => g.data.slice(0,7)))].sort();
    const mesAnterior = mesesComDados.filter(m => m < mes).pop();
    if (!mesAnterior) return;

    const fixasAnteriores = estado.gastos.filter(g => g.data.slice(0,7) === mesAnterior && g.fixa);
    if (!fixasAnteriores.length) return;

    const descricoesExistentes = new Set(
      estado.gastos.filter(g => g.data.slice(0,7) === mes).map(g => g.desc)
    );

    const novosGastos = [];
    for (const g of fixasAnteriores) {
      if (!descricoesExistentes.has(g.desc)) {
        const novo = {
          id: gerarId(), desc: g.desc, cat: g.cat,
          valor: g.valor, data: mes + '-01', fixa: true
        };
        estado.gastos.push(novo);
        novosGastos.push(novo);
      }
    }
    if (novosGastos.length) {
      const statusEl = document.getElementById('status-salvamento');
      statusEl.textContent = 'salvando...';
      for (const n of novosGastos) {
        auth.apiFetch('/gastos', {
          method: 'POST',
          body: JSON.stringify({ descricao: n.desc, categoria: n.cat, valor: n.valor, data: n.data, fixa: true })
        }).catch(() => {});
      }
      statusEl.textContent = 'tudo salvo';
    }
  }

  function renderizarTudo(){
    renderizarFiltroMes();
    const mes = mesSelecionado();
    autoPopularFixas(mes);
    renderizarResumo(mes);
    renderizarTabelaGastos(mes);
    renderizarTabelaReceitas(mes);
    renderizarGraficoGastos(mes);
    renderizarGraficoReceitas(mes);
  }

  function renderizarResumo(mes){
    const gastosDoMes = estado.gastos.filter(g => g.data && g.data.slice(0,7) === mes);
    const receitasDoMes = estado.receitas.filter(r => r.data && r.data.slice(0,7) === mes);
    const totalDespesas = gastosDoMes.reduce((s,g)=>s+g.valor,0);
    const totalReceitas = receitasDoMes.reduce((s,r)=>s+r.valor,0);
    const saldo = totalReceitas - totalDespesas;

    document.getElementById('resumo-indicadores').innerHTML = `
      <div class="indicador"><div class="indicador-rotulo">Receitas (${formatarChaveMes(mes)})</div><div class="indicador-valor positivo">${formatarMoeda(totalReceitas)}</div></div>
      <div class="indicador"><div class="indicador-rotulo">Despesas (${formatarChaveMes(mes)})</div><div class="indicador-valor negativo">${formatarMoeda(totalDespesas)}</div></div>
      <div class="indicador"><div class="indicador-rotulo">Saldo do mês</div><div class="indicador-valor ${saldo>=0?'positivo':'negativo'}">${formatarMoeda(saldo)}</div></div>
    `;
  }

  // ---------- GASTOS ----------

  async function adicionarOuAtualizarGasto(){
    const desc = document.getElementById('gasto-descricao').value.trim();
    const cat = document.getElementById('gasto-categoria').value;
    const valor = parseFloat(document.getElementById('gasto-valor').value);
    const data = converterDataParaISO(document.getElementById('gasto-data').value) || new Date().toISOString().slice(0,10);
    if(!desc || !valor || valor<=0){ return; }
    const fixa = document.getElementById('gasto-fixa').checked;
    const statusEl = document.getElementById('status-salvamento');

    try{
      if(editandoGastoId){
        await auth.apiFetch('/gastos', {
          method: 'PUT',
          body: JSON.stringify({ id: editandoGastoId, descricao: desc, categoria: cat, valor: valor, data: data, fixa: fixa })
        });
        editandoGastoId = null;
        document.getElementById('gasto-botao-adicionar').textContent = 'Adicionar gasto';
      } else {
        await auth.apiFetch('/gastos', {
          method: 'POST',
          body: JSON.stringify({ descricao: desc, categoria: cat, valor: valor, data: data, fixa: fixa })
        });
        document.getElementById('gasto-descricao').value='';
        document.getElementById('gasto-valor').value='';
      }
      statusEl.textContent = 'salvo';
    }catch(e){
      statusEl.textContent = 'erro ao salvar';
    }
    await carregarEstado();
  }

  document.getElementById('gasto-botao-adicionar').addEventListener('click', adicionarOuAtualizarGasto);

  async function removerGasto(id){
    const statusEl = document.getElementById('status-salvamento');
    try{
      await auth.apiFetch('/gastos', {
        method: 'DELETE',
        body: JSON.stringify({ id: id })
      });
      if(editandoGastoId === id){ editandoGastoId = null; document.getElementById('gasto-botao-adicionar').textContent = 'Adicionar gasto'; }
      statusEl.textContent = 'removido';
      await carregarEstado();
    }catch(e){
      statusEl.textContent = 'erro ao remover';
    }
  }

  function editarGasto(id){
    const g = estado.gastos.find(g => g.id === id);
    if(!g) return;
    document.getElementById('gasto-descricao').value = g.desc;
    document.getElementById('gasto-categoria').value = g.cat;
    document.getElementById('gasto-valor').value = g.valor;
    document.getElementById('gasto-data').value = formatarDataInput(g.data);
    document.getElementById(g.fixa ? 'gasto-fixa' : 'gasto-variavel').checked = true;
    editandoGastoId = id;
    document.getElementById('gasto-botao-adicionar').textContent = 'Salvar alteração';
    document.getElementById('gastos').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function renderizarTabelaGastos(mes){
    const gastosDoMes = estado.gastos.filter(g => g.data.slice(0,7) === mes);
    const corpo = document.getElementById('gasto-tabela-corpo');
    corpo.innerHTML='';
    const ordenados = [...gastosDoMes].sort((a,b)=> b.data.localeCompare(a.data));
    if(ordenados.length===0){
      corpo.innerHTML = '<tr class="linha-vazia"><td colspan="5">Nenhum gasto lançado em ' + formatarChaveMes(mes) + '</td></tr>';
    } else {
      ordenados.forEach(g=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatarDataBR(g.data)}</td>
          <td>${escaparHtml(g.desc)}${g.fixa ? ' <span class="etiqueta etiqueta-fixa">Fixa</span>' : ''}</td>
          <td><span class="etiqueta" style="background:${CORES_CATEGORIA_GASTO[g.cat] || '#8A8775'}26; color:${CORES_CATEGORIA_GASTO[g.cat] || '#8A8775'}">${g.cat}</span></td>
          <td class="numero">${formatarMoeda(g.valor)}</td>
          <td style="text-align:right;">
            <button class="botao-secundario" data-editar="${g.id}">editar</button>
            <button class="botao-secundario" data-id="${g.id}">remover</button>
          </td>
        `;
        tr.querySelector('[data-editar]').addEventListener('click', ()=>editarGasto(g.id));
        tr.querySelector('[data-id]').addEventListener('click', ()=>removerGasto(g.id));
        corpo.appendChild(tr);
      });
    }
  }

  function renderizarGraficoGastos(mes){
    const gastosDoMes = estado.gastos.filter(g => g.data.slice(0,7) === mes);
    const porCategoria={};
    gastosDoMes.forEach(g=> porCategoria[g.cat]=(porCategoria[g.cat]||0)+g.valor);
    const rotulos = Object.keys(porCategoria);
    const dados = Object.values(porCategoria);
    const cores = rotulos.map(l=>CORES_CATEGORIA_GASTO[l]||'#8A8775');

    const ctx = document.getElementById('grafico-gastos');
    if(graficoGastos) graficoGastos.destroy();

    const legenda = document.getElementById('legenda-gastos');
    if(rotulos.length===0){
      legenda.innerHTML = '<span style="font-style:italic; color:var(--texto-fraca);">Nenhum gasto neste mês ainda</span>';
      return;
    }

    graficoGastos = new Chart(ctx, {
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
            titleFont:{ family:'Oxygen, sans-serif', size:12, weight:'600' },
            bodyFont:{ family:'Oxygen, monospace', size:13 },
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
    legenda.innerHTML = rotulos.map((l,i)=>{
      const pct = total? (dados[i]/total*100):0;
      return `<span><span class="ponto-legenda" style="background:${cores[i]}"></span>${l} ${formatarPercentual(pct)}</span>`;
    }).join('');
  }

  // ---------- RECEITAS ----------

  document.getElementById('receita-botao-adicionar').addEventListener('click', async ()=>{
    const desc = document.getElementById('receita-descricao').value.trim();
    const cat = document.getElementById('receita-categoria').value;
    const valor = parseFloat(document.getElementById('receita-valor').value);
    const data = converterDataParaISO(document.getElementById('receita-data').value) || new Date().toISOString().slice(0,10);
    if(!desc || !valor || valor<=0){ return; }
    const statusEl = document.getElementById('status-salvamento');
    try{
      if(editandoReceitaId){
        await auth.apiFetch('/receitas', {
          method: 'PUT',
          body: JSON.stringify({ id: editandoReceitaId, descricao: desc, categoria: cat, valor: valor, data: data })
        });
        editandoReceitaId = null;
        document.getElementById('receita-botao-adicionar').textContent = 'Adicionar receita';
      } else {
        await auth.apiFetch('/receitas', {
          method: 'POST',
          body: JSON.stringify({ descricao: desc, categoria: cat, valor: valor, data: data })
        });
        document.getElementById('receita-descricao').value='';
        document.getElementById('receita-valor').value='';
      }
      statusEl.textContent = 'salvo';
      await carregarEstado();
    }catch(e){
      statusEl.textContent = 'erro ao salvar';
    }
  });

  async function removerReceita(id){
    const statusEl = document.getElementById('status-salvamento');
    try{
      await auth.apiFetch('/receitas', {
        method: 'DELETE',
        body: JSON.stringify({ id: id })
      });
      if(editandoReceitaId === id){ editandoReceitaId = null; document.getElementById('receita-botao-adicionar').textContent = 'Adicionar receita'; }
      statusEl.textContent = 'removido';
      await carregarEstado();
    }catch(e){
      statusEl.textContent = 'erro ao remover';
    }
  }

  function editarReceita(id){
    const r = estado.receitas.find(r => r.id === id);
    if(!r) return;
    document.getElementById('receita-descricao').value = r.desc;
    document.getElementById('receita-categoria').value = r.cat;
    document.getElementById('receita-valor').value = r.valor;
    document.getElementById('receita-data').value = formatarDataInput(r.data);
    editandoReceitaId = id;
    document.getElementById('receita-botao-adicionar').textContent = 'Salvar alteração';
    document.getElementById('receitas').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function renderizarTabelaReceitas(mes){
    const receitasDoMes = estado.receitas.filter(r => r.data.slice(0,7) === mes);
    const corpo = document.getElementById('receita-tabela-corpo');
    corpo.innerHTML='';
    const ordenadas = [...receitasDoMes].sort((a,b)=> b.data.localeCompare(a.data));
    if(ordenadas.length===0){
      corpo.innerHTML = '<tr class="linha-vazia"><td colspan="5">Nenhuma receita lançada em ' + formatarChaveMes(mes) + '</td></tr>';
    } else {
      ordenadas.forEach(r=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatarDataBR(r.data)}</td>
          <td>${escaparHtml(r.desc)}</td>
          <td><span class="etiqueta" style="background:${CORES_CATEGORIA_RECEITA[r.cat] || '#8A8775'}26; color:${CORES_CATEGORIA_RECEITA[r.cat] || '#8A8775'}">${r.cat}</span></td>
          <td class="numero">${formatarMoeda(r.valor)}</td>
          <td style="text-align:right;">
            <button class="botao-secundario" data-editar="${r.id}">editar</button>
            <button class="botao-secundario" data-id="${r.id}">remover</button>
          </td>
        `;
        tr.querySelector('[data-editar]').addEventListener('click', ()=>editarReceita(r.id));
        tr.querySelector('[data-id]').addEventListener('click', ()=>removerReceita(r.id));
        corpo.appendChild(tr);
      });
    }
  }

  function renderizarGraficoReceitas(mes){
    const receitasDoMes = estado.receitas.filter(r => r.data.slice(0,7) === mes);
    const porCategoria={};
    receitasDoMes.forEach(r=> porCategoria[r.cat]=(porCategoria[r.cat]||0)+r.valor);
    const rotulos = Object.keys(porCategoria);
    const dados = Object.values(porCategoria);
    const cores = rotulos.map(l=>CORES_CATEGORIA_RECEITA[l]||'#8A8775');

    const ctx = document.getElementById('grafico-receitas');
    if(graficoReceitas) graficoReceitas.destroy();

    const legenda = document.getElementById('legenda-receitas');
    if(rotulos.length===0){
      legenda.innerHTML = '<span style="font-style:italic; color:var(--texto-fraca);">Nenhuma receita neste mês ainda</span>';
      return;
    }

    graficoReceitas = new Chart(ctx, {
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
            titleFont:{ family:'Oxygen, sans-serif', size:12, weight:'600' },
            bodyFont:{ family:'Oxygen, monospace', size:13 },
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
    legenda.innerHTML = rotulos.map((l,i)=>{
      const pct = total? (dados[i]/total*100):0;
      return `<span><span class="ponto-legenda" style="background:${cores[i]}"></span>${l} ${formatarPercentual(pct)}</span>`;
    }).join('');
  }

  carregarEstado();

})();