(function(){
  if (!auth.isLoggedIn()) { window.location.href = '/login'; return; }
  const nome = document.getElementById('perfil-nome');
  const email = document.getElementById('perfil-email');
  const perfil = document.getElementById('perfil-form');
  const excluir = document.getElementById('excluir-form');
  const baixar = document.getElementById('baixar-dados');
  async function carregar() {
    try {
      const dados = await auth.apiFetch('/auth/me');
      if (!dados) return;
      nome.value = dados.usuario.nome;
      email.textContent = dados.usuario.email;
      perfil.querySelector('button').disabled = false;
    } catch (erro) { interfaceOMV.mensagem('Não foi possível carregar seu perfil. Recarregue a página para tentar novamente.', 'erro'); }
  }
  perfil.addEventListener('submit', async event => {
    event.preventDefault();
    const botao = perfil.querySelector('button');
    botao.disabled = true;
    try {
      const dados = await auth.apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify({ nome: nome.value.trim() }) });
      if (!dados) return;
      auth.setUsuario(dados.usuario);
      interfaceOMV.mensagem('Nome atualizado.', 'sucesso', perfil);
    } catch (erro) { interfaceOMV.mensagem(erro.message, 'erro', perfil); }
    finally { botao.disabled = false; }
  });
  baixar.addEventListener('click', async () => {
    baixar.disabled = true;
    try {
      const dados = await auth.apiFetch('/auth/me?exportar=1');
      if (!dados) return;
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'omv-meus-dados.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      interfaceOMV.mensagem('Download iniciado. Guarde o arquivo em um local seguro: ele contém seus dados pessoais e financeiros.');
    } catch (erro) { interfaceOMV.mensagem(erro.message, 'erro'); }
    finally { baixar.disabled = false; }
  });
  excluir.addEventListener('submit', async event => {
    event.preventDefault();
    if (!window.confirm('Excluir definitivamente sua conta e todos os registros financeiros? Baixe uma cópia antes de continuar.')) return;
    const botao = excluir.querySelector('button');
    botao.disabled = true;
    try {
      const dados = await auth.apiFetch('/auth/me', { method: 'DELETE', body: JSON.stringify({ senha: document.getElementById('excluir-senha').value, confirmacao: document.getElementById('excluir-confirmacao').value }) });
      if (!dados) return;
      document.getElementById('excluir-senha').value = '';
      auth.logout();
    } catch (erro) { interfaceOMV.mensagem(erro.message, 'erro', excluir); }
    finally { botao.disabled = false; }
  });
  carregar();
})();
