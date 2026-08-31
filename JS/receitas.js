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

  if (!auth.isLoggedIn()) {
    window.location.href = '/Html/login.html';
    return;
  }

  let estado = { receitas:[], gastos:[], metas:[], investimentos:[] };
  let editandoId = null;

  function normalizarReceita(r){
    return {
      id: r.id,
      desc: r.descricao || r.desc,
      cat: r.categoria || r.cat,
      valor: Number(r.valor),
      data: (r.data || '').slice(0,10)
    };
  }

  async function carregarEstado(){
    const statusEl = document.getElementById('status-salvamento');
    try{
      const res = await auth.apiFetch('/receitas');
      let lista = [];
      if (res && res.receitas) lista = res.receitas;
      else if (res && Array.isArray(res)) lista = res;
      estado.receitas = lista.map(normalizarReceita);
      statusEl.textContent = 'dados carregados';
    }catch(e){
      statusEl.textContent = 'erro ao carregar dados';
    }
    const elData = document.getElementById('receita-data');
    mascaraData(elData);
    elData.value = formatarDataInput(new Date().toISOString().slice(0,10));
    renderizarReceitas();
  }

  document.getElementById('receita-botao-adicionar').addEventListener('click', async ()=>{
    const desc = document.getElementById('receita-descricao').value.trim();
    const cat = document.getElementById('receita-categoria').value;
    const valor = parseFloat(document.getElementById('receita-valor').value);
    const data = converterDataParaISO(document.getElementById('receita-data').value) || new Date().toISOString().slice(0,10);
    if(!desc || !valor || valor<=0){ return; }
    const statusEl = document.getElementById('status-salvamento');
    try{
      if(editandoId){
        await auth.apiFetch('/receitas', {
          method: 'PUT',
          body: JSON.stringify({ id: editandoId, descricao: desc, categoria: cat, valor: valor, data: data })
        });
        editandoId = null;
        document.getElementById('receita-botao-adicionar').textContent = 'Adicionar receita';
        statusEl.textContent = 'salvo';
      } else {
        await auth.apiFetch('/receitas', {
          method: 'POST',
          body: JSON.stringify({ descricao: desc, categoria: cat, valor: valor, data: data })
        });
        statusEl.textContent = 'salvo';
      }
      document.getElementById('receita-descricao').value='';
      document.getElementById('receita-valor').value='';
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
      if(editandoId === id){ editandoId = null; document.getElementById('receita-botao-adicionar').textContent = 'Adicionar receita'; }
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