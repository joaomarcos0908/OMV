(function(){
  const formatarMoeda = (v) => 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const chaveMesAtual = () => new Date().toISOString().slice(0,7);
  const formatarChaveMes = (chave) => {
    const [ano, mes] = chave.split('-');
    return NOMES_MESES[parseInt(mes,10)-1] + ' de ' + ano;
  };

  if (!auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };

  async function carregarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    try{
      const gastosData = await auth.apiFetch('/api/gastos');
      const receitasData = await auth.apiFetch('/api/receitas');
      if (gastosData) estado.gastos = gastosData.gastos || [];
      if (receitasData) estado.receitas = receitasData.receitas || [];
      statusEl.textContent = 'dados carregados';
    }catch(e){
      statusEl.textContent = 'erro ao carregar dados';
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
    select.innerHTML = meses.map(m=> `<option value="${m}">${formatarChaveMes(m)}</option>`).join('');
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