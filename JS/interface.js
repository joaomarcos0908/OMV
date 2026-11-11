(function(){
  function mensagem(texto, tipo, alvo) {
    const local = alvo || document.querySelector('.aplicativo');
    if (!local) return;
    let caixa = local.querySelector(':scope > .feedback');
    if (!caixa) {
      caixa = document.createElement('p');
      caixa.className = 'feedback';
      caixa.setAttribute('role', 'status');
      caixa.setAttribute('aria-live', 'polite');
      local.prepend(caixa);
    }
    caixa.dataset.tipo = tipo || 'sucesso';
    caixa.textContent = texto;
  }
  function invalido(id, texto) {
    const campo = document.getElementById(id);
    campo.setAttribute('aria-invalid', 'true');
    const local = campo.closest('.cartao') || campo.parentElement;
    mensagem(texto, 'erro', local);
    const feedback = local.querySelector(':scope > .feedback');
    feedback.id = id + '-erro';
    campo.setAttribute('aria-describedby', feedback.id);
    campo.focus();
  }
  function abrir(id) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const detalhes = alvo.closest('details');
    if (detalhes) detalhes.open = true;
    alvo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    const campo = alvo.querySelector('input');
    if (campo) campo.focus({ preventScroll: true });
  }
  function dataValida(id, opcional) {
    const campo = document.getElementById(id);
    if (!campo.value.trim() && opcional) return true;
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(campo.value);
    const iso = partes && `${partes[3]}-${partes[2]}-${partes[1]}`;
    const data = iso && new Date(iso + 'T12:00:00Z');
    if (!data || !Number.isFinite(data.getTime()) || data.toISOString().slice(0,10) !== iso) {
      invalido(id, 'Informe uma data válida no formato dd/mm/aaaa.');
      return false;
    }
    return true;
  }
  document.querySelectorAll('[data-abrir]').forEach(botao => botao.addEventListener('click', () => abrir(botao.dataset.abrir)));
  document.querySelectorAll('[data-senha]').forEach(botao => botao.addEventListener('click', () => {
    const campo = document.getElementById(botao.dataset.senha);
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.textContent = mostrar ? 'Ocultar senha' : 'Mostrar senha';
    botao.setAttribute('aria-pressed', String(mostrar));
  }));
  document.addEventListener('input', event => {
    if (event.target.matches('[aria-invalid="true"]')) {
      event.target.removeAttribute('aria-invalid');
      event.target.removeAttribute('aria-describedby');
    }
  });
  const original = auth.apiFetch;
  auth.apiFetch = async function(path, options) {
    const botao = document.activeElement;
    const local = botao && botao.closest('.cartao, .meta-item');
    const escrita = options && ['POST','PUT','DELETE'].includes(options.method);
    const bloquear = escrita && botao && botao.tagName === 'BUTTON';
    const desabilitado = bloquear && botao.disabled;
    if (bloquear) botao.disabled = true;
    try {
      const dados = await original(path, options);
      if (escrita && dados && !path.startsWith('/auth/')) mensagem(options.method === 'DELETE' ? 'Item removido.' : 'Alterações salvas.', 'sucesso', local);
      return dados;
    } catch (erro) {
      if (!path.startsWith('/auth/')) mensagem((erro.data && erro.data.erro) || 'Não foi possível concluir a operação. Confira sua conexão e tente novamente. Os campos preenchidos foram mantidos.', 'erro', local);
      throw erro;
    } finally {
      if (bloquear) botao.disabled = desabilitado;
    }
  };
  window.interfaceOMV = { mensagem, invalido, abrir, dataValida };
})();
