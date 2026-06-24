(function(){

  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const chaveMesAtual = () => new Date().toISOString().slice(0,7);
  const formatarChaveMes = (chave) => {
    const [ano, mes] = chave.split('-');
    return NOMES_MESES[parseInt(mes,10)-1] + ' de ' + ano;
  };

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
    renderizarFiltroMes();
    renderizarResumo();
  }

  function renderizarFiltroMes(){
    const select = document.getElementById('resumo-filtro-mes');
    if (!select) return;
    const anterior = select.value;
    const conjuntoMeses = new Set();
    estado.gastos.forEach(g => { if (g.data) conjuntoMeses.add(g.data.slice(0,7)); });
    estado.receitas.forEach(r => { if (r.data) conjuntoMeses.add(r.data.slice(0,7)); });
    conjuntoMeses.add(chaveMesAtual());
    const meses = Array.from(conjuntoMeses).sort().reverse();
    select.innerHTML = meses.map(m => `<option value="${m}">${formatarChaveMes(m)}</option>`).join('');
    select.value = meses.includes(anterior) ? anterior : chaveMesAtual();
  }

  document.getElementById('resumo-filtro-mes').addEventListener('change', renderizarResumo);

  function renderizarResumo(){
    const mes = document.getElementById('resumo-filtro-mes').value || chaveMesAtual();
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

  carregarEstado();

})();
