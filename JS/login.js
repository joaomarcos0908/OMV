(function(){
  const loginTab = document.getElementById('login-tab');
  const cadastroTab = document.getElementById('cadastro-tab');
  const alertaLogin = document.getElementById('alerta-login');
  const alertaCadastro = document.getElementById('alerta-cadastro');

  if (auth.isLoggedIn()) {
    window.location.href = '/app';
    return;
  }

  function mostrarAlerta(el, msg, tipo) {
    el.textContent = msg;
    el.className = 'alerta ' + tipo;
    el.style.display = 'block';
  }

  function esconderAlertas() {
    alertaLogin.style.display = 'none';
    alertaCadastro.style.display = 'none';
  }

  document.getElementById('link-cadastro').addEventListener('click', function() {
    loginTab.classList.remove('ativo');
    cadastroTab.classList.add('ativo');
    esconderAlertas();
  });

  document.getElementById('link-login').addEventListener('click', function() {
    cadastroTab.classList.remove('ativo');
    loginTab.classList.add('ativo');
    esconderAlertas();
  });

  loginTab.addEventListener('submit', async function(event) {
    event.preventDefault();
    esconderAlertas();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    if (!email || !senha) {
      mostrarAlerta(alertaLogin, 'Email e senha são obrigatórios', 'erro');
      return;
    }

    const botao = document.getElementById('login-botao');
    botao.disabled = true;
    botao.textContent = 'Entrando...';

    try {
      const dados = await auth.apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha })
      });

      if (dados) {
        auth.setToken(dados.token);
        auth.setUsuario(dados.usuario);
        window.location.href = '/app';
      }
    } catch (err) {
      const msg = (err && err.data && err.data.erro) || err.message || 'Erro de conexão. Tente novamente.';
      mostrarAlerta(alertaLogin, msg, 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });

  cadastroTab.addEventListener('submit', async function(event) {
    event.preventDefault();
    esconderAlertas();
    const nome = document.getElementById('cadastro-nome').value.trim();
    const email = document.getElementById('cadastro-email').value.trim();
    const senha = document.getElementById('cadastro-senha').value;

    if (!nome || !email || !senha) {
      mostrarAlerta(alertaCadastro, 'Nome, email e senha são obrigatórios', 'erro');
      return;
    }

    const botao = document.getElementById('cadastro-botao');
    botao.disabled = true;
    botao.textContent = 'Criando...';

    try {
      const dados = await auth.apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha })
      });

      if (dados) {
        document.getElementById('login-email').value = email;
        document.getElementById('cadastro-senha').value = '';
        cadastroTab.classList.remove('ativo');
        loginTab.classList.add('ativo');
        mostrarAlerta(alertaLogin, 'Conta criada! Digite sua senha para entrar.', 'sucesso');
        document.getElementById('login-senha').focus();
      }
    } catch (err) {
      const msg = (err && err.data && err.data.erro) || err.message || 'Erro de conexão. Tente novamente.';
      mostrarAlerta(alertaCadastro, msg, 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Criar conta';
    }
  });
})();