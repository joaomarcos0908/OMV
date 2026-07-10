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
    const elData = document.getElementById('receita-data');
    mascaraData(elData);
    elData.value = formatarDataInput(new Date().toISOString().slice(0,10));
    renderizarReceitas();
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

  document.getElementById('receita-botao-adicionar').addEventListener('click', ()=>{
    const desc = document.getElementById('receita-descricao').value.trim();
    const cat = document.getElementById('receita-categoria').value;
    const valor = parseFloat(document.getElementById('receita-valor').value);
    const data = converterDataParaISO(document.getElementById('receita-data').value) || new Date().toISOString().slice(0,10);
    if(!desc || !valor || valor<=0){ return; }
    if(editandoId){
      const idx = estado.receitas.findIndex(r => r.id === editandoId);
      if(idx !== -1) estado.receitas[idx] = {id:editandoId, desc, cat, valor, data};
      editandoId = null;
      document.getElementById('receita-botao-adicionar').textContent = 'Adicionar receita';
    } else {
      estado.receitas.push({id:gerarId(), desc, cat, valor, data});
    }
    document.getElementById('receita-descricao').value='';
    document.getElementById('receita-valor').value='';
    salvarEstado();
    renderizarReceitas();
  });

  function removerReceita(id){
    estado.receitas = estado.receitas.filter(r=>r.id!==id);
    if(editandoId === id){ editandoId = null; document.getElementById('receita-botao-adicionar').textContent = 'Adicionar receita'; }
    salvarEstado();
    renderizarReceitas();
  }

  function editarReceita(id){
    const r = estado.receitas.find(r => r.id === id);
    if(!r) return;
    document.getElementById('receita-descricao').value = r.desc;
    document.getElementById('receita-categoria').value = r.cat;
    document.getElementById('receita-valor').value = r.valor;
    document.getElementById('receita-data').value = formatarDataInput(r.data);
    editandoId = id;
    document.getElementById('receita-botao-adicionar').textContent = 'Salvar alteração';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function renderizarReceitas(){
    const corpo = document.getElementById('receita-tabela-corpo');
    corpo.innerHTML='';
    const ordenadas = [...estado.receitas].sort((a,b)=> b.data.localeCompare(a.data));
    if(ordenadas.length===0){
      corpo.innerHTML = '<tr class="linha-vazia"><td colspan="5">Nenhuma receita lançada ainda</td></tr>';
    } else {
      ordenadas.forEach(r=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatarDataBR(r.data)}</td>
          <td>${escaparHtml(r.desc)}</td>
          <td><span class="etiqueta">${r.cat}</span></td>
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

  carregarEstado();

})();
