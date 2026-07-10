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
  const CORES_CATEGORIA = {
    'Moradia':'#3F5C78','Alimentação':'#9C6F1F','Transporte':'#1F6F54','Lazer':'#B2492E',
    'Saúde':'#6E4F9E','Educação':'#2E7D8F','Outros':'#8A8775'
  };
 
  // ---------- estado compartilhado (mesma chave usada por todas as páginas) ----------
  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };
  let graficoCategorias = null;
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
    const elData = document.getElementById('gasto-data');
    mascaraData(elData);
    elData.value = formatarDataInput(new Date().toISOString().slice(0,10));
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
    const data = converterDataParaISO(document.getElementById('gasto-data').value) || new Date().toISOString().slice(0,10);
    if(!desc || !valor || valor<=0){ return; }
    const fixa = document.getElementById('gasto-fixa').checked;
    if(editandoId){
      const idx = estado.gastos.findIndex(g => g.id === editandoId);
      if(idx !== -1) estado.gastos[idx] = {id:editandoId, desc, cat, valor, data, fixa};
      editandoId = null;
      document.getElementById('gasto-botao-adicionar').textContent = 'Adicionar gasto';
    } else {
      estado.gastos.push({id:gerarId(), desc, cat, valor, data, fixa});
    }
    document.getElementById('gasto-descricao').value='';
    document.getElementById('gasto-valor').value='';
    salvarEstado();
    renderizarGastos();
  });
 
  function removerGasto(id){
    estado.gastos = estado.gastos.filter(g=>g.id!==id);
    if(editandoId === id){ editandoId = null; document.getElementById('gasto-botao-adicionar').textContent = 'Adicionar gasto'; }
    salvarEstado();
    renderizarGastos();
  }

  function editarGasto(id){
    const g = estado.gastos.find(g => g.id === id);
    if(!g) return;
    document.getElementById('gasto-descricao').value = g.desc;
    document.getElementById('gasto-categoria').value = g.cat;
    document.getElementById('gasto-valor').value = g.valor;
    document.getElementById('gasto-data').value = formatarDataInput(g.data);
    document.getElementById(g.fixa ? 'gasto-fixa' : 'gasto-variavel').checked = true;
    editandoId = id;
    document.getElementById('gasto-botao-adicionar').textContent = 'Salvar alteração';
    window.scrollTo({top:0, behavior:'smooth'});
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
 
  function autoPopularFixas(mesSelecionado){
    const mesesComDados = [...new Set(estado.gastos.map(g => g.data.slice(0,7)))].sort();
    const mesAnterior = mesesComDados.filter(m => m < mesSelecionado).pop();
    if (!mesAnterior) return;

    const fixasAnteriores = estado.gastos.filter(g => g.data.slice(0,7) === mesAnterior && g.fixa);
    if (!fixasAnteriores.length) return;

    const descricoesExistentes = new Set(
      estado.gastos.filter(g => g.data.slice(0,7) === mesSelecionado).map(g => g.desc)
    );

    let adicionou = false;
    fixasAnteriores.forEach(g => {
      if (!descricoesExistentes.has(g.desc)) {
        estado.gastos.push({
          id: gerarId(), desc: g.desc, cat: g.cat,
          valor: g.valor, data: mesSelecionado + '-01', fixa: true
        });
        adicionou = true;
      }
    });

    if (adicionou) salvarEstado();
  }

  function renderizarGastos(){
    renderizarFiltroMes();
    const mesSelecionado = document.getElementById('gasto-filtro-mes').value;
    autoPopularFixas(mesSelecionado);
    const gastosDoMes = estado.gastos.filter(g => g.data.slice(0,7) === mesSelecionado);

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
          <td>${escaparHtml(g.desc)}${g.fixa ? ' <span class="etiqueta etiqueta-fixa">Fixa</span>' : ''}</td>
          <td><span class="etiqueta">${g.cat}</span></td>
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
    legenda.innerHTML = rotulos.map((l,i)=>{
      const pct = total? (dados[i]/total*100):0;
      return `<span><span class="ponto-legenda" style="background:${cores[i]}"></span>${l} ${formatarPercentual(pct)}</span>`;
    }).join('');
  }
 
  carregarEstado();
 
})();
 