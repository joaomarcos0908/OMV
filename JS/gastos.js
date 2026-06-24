(function(){
 
  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const formatarPercentual = (v) => (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
  const gerarId = () => Math.random().toString(36).slice(2, 10);
  const escaparHtml = (s) => {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };
  const formatarDataBR = (iso) => (iso||'').split('-').reverse().join('/');
  const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const chaveMesAtual = () => new Date().toISOString().slice(0,7);
  const formatarChaveMes = (chave) => {
    const [ano, mes] = chave.split('-');
    return NOMES_MESES[parseInt(mes,10)-1] + ' de ' + ano;
  };
  const CORES_CATEGORIA = {
    'Moradia':'#3F5C78','Alimentação':'#9C6F1F','Transporte':'#1F6F54','Lazer':'#B2492E',
    'Saúde':'#6E4F9E','Educação':'#2E7D8F','Outros':'#8A8775'
  };
 
  // ---------- estado compartilhado (mesma chave usada por todas as páginas) ----------
  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };
  let graficoCategorias = null;
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
    document.getElementById('gasto-data').value = new Date().toISOString().slice(0,10);
    renderizarGastos();
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
 
  // ---------- gastos ----------
  document.getElementById('gasto-botao-adicionar').addEventListener('click', ()=>{
    const desc = document.getElementById('gasto-descricao').value.trim();
    const cat = document.getElementById('gasto-categoria').value;
    const valor = parseFloat(document.getElementById('gasto-valor').value);
    const data = document.getElementById('gasto-data').value || new Date().toISOString().slice(0,10);
    if(!desc || !valor || valor<=0){ return; }
    estado.gastos.push({id:gerarId(), desc, cat, valor, data});
    document.getElementById('gasto-descricao').value='';
    document.getElementById('gasto-valor').value='';
    salvarEstado();
    renderizarGastos();
  });
 
  function removerGasto(id){
    estado.gastos = estado.gastos.filter(g=>g.id!==id);
    salvarEstado();
    renderizarGastos();
  }
 
  function renderizarFiltroMes(){
    const select = document.getElementById('gasto-filtro-mes');
    const anterior = select.value;
    const conjuntoMeses = new Set(estado.gastos.map(g=> g.data.slice(0,7)));
    conjuntoMeses.add(chaveMesAtual());
    const meses = Array.from(conjuntoMeses).sort().reverse();
    select.innerHTML = meses.map(m=> `<option value="${m}">${formatarChaveMes(m)}</option>`).join('');
    select.value = meses.includes(anterior) ? anterior : chaveMesAtual();
  }
  document.getElementById('gasto-filtro-mes').addEventListener('change', renderizarGastos);
 
  function renderizarGastos(){
    renderizarFiltroMes();
    const mesSelecionado = document.getElementById('gasto-filtro-mes').value;
    const gastosDoMes = estado.gastos.filter(g => g.data.slice(0,7) === mesSelecionado);
   
    const receitasDoMes = estado.receitas.filter(r => r.data.slice(0,7) === mesSelecionado);
 
    const corpo = document.getElementById('gasto-tabela-corpo');
    corpo.innerHTML='';
    const ordenados = [...gastosDoMes].sort((a,b)=> b.data.localeCompare(a.data));
    if(ordenados.length===0){
      corpo.innerHTML = '<tr class="linha-vazia"><td colspan="5">Nenhum gasto lançado em ' + formatarChaveMes(mesSelecionado) + '</td></tr>';
    } else {
      ordenados.forEach(g=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatarDataBR(g.data)}</td>
          <td>${escaparHtml(g.desc)}</td>
          <td><span class="etiqueta">${g.cat}</span></td>
          <td class="numero">${formatarMoeda(g.valor)}</td>
          <td style="text-align:right;"><button class="botao-secundario" data-id="${g.id}">remover</button></td>
        `;
        tr.querySelector('button').addEventListener('click', ()=>removerGasto(g.id));
        corpo.appendChild(tr);
      });
    }
 
    const totalDespesasMes = gastosDoMes.reduce((s,g)=>s+g.valor,0);
    const totalReceitasMes = receitasDoMes.reduce((s,r)=>s+r.valor,0);
    const saldoMes = totalReceitasMes - totalDespesasMes;
 
    document.getElementById('gasto-resumo').innerHTML = `
      <div class="indicador"><div class="indicador-rotulo">Receitas (${formatarChaveMes(mesSelecionado)})</div><div class="indicador-valor positivo">${formatarMoeda(totalReceitasMes)}</div></div>
      <div class="indicador"><div class="indicador-rotulo">Despesas (${formatarChaveMes(mesSelecionado)})</div><div class="indicador-valor negativo">${formatarMoeda(totalDespesasMes)}</div></div>
      <div class="indicador"><div class="indicador-rotulo">Saldo do mês</div><div class="indicador-valor ${saldoMes>=0?'positivo':'negativo'}">${formatarMoeda(saldoMes)}</div></div>
    `;
 
    renderizarGraficoCategorias(gastosDoMes);
  }
 
  function renderizarGraficoCategorias(gastosDoMes){
    const porCategoria={};
    gastosDoMes.forEach(g=> porCategoria[g.cat]=(porCategoria[g.cat]||0)+g.valor);
    const rotulos = Object.keys(porCategoria);
    const dados = Object.values(porCategoria);
    const cores = rotulos.map(l=>CORES_CATEGORIA[l]||'#8A8775');
 
    const ctx = document.getElementById('grafico-categorias');
    if(graficoCategorias) graficoCategorias.destroy();
 
    const legenda = document.getElementById('legenda-categorias');
    if(rotulos.length===0){
      legenda.innerHTML = '<span style="font-style:italic; color:var(--tinta-fraca);">Nenhum gasto neste mês ainda</span>';
      return;
    }
 
    graficoCategorias = new Chart(ctx, {
      type:'pie',
      data:{ labels:rotulos, datasets:[{ data:dados, backgroundColor:cores, borderColor:'#fff', borderWidth:2 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
    });
 
    const total = dados.reduce((a,b)=>a+b,0);
    legenda.innerHTML = rotulos.map((l,i)=>{
      const pct = total? (dados[i]/total*100):0;
      return `<span><span class="ponto-legenda" style="background:${cores[i]}"></span>${l} ${formatarPercentual(pct)}</span>`;
    }).join('');
  }
 
  carregarEstado();
 
})();
 