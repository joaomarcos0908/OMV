(function(){
  const loginTab = document.getElementById('login-tab');
  const cadastroTab = document.getElementById('cadastro-tab');
  const alertaLogin = document.getElementById('alerta-login');
  const alertaCadastro = document.getElementById('alerta-cadastro');

  if (auth.isLoggedIn()) {
    window.location.href = 'index.html';
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

  document.getElementById('login-botao').addEventListener('click', async function() {
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
        window.location.href = 'index.html';
      }
    } catch (err) {
      mostrarAlerta(alertaLogin, 'Erro de conexão. Tente novamente.', 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });

  document.getElementById('cadastro-botao').addEventListener('click', async function() {
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
        mostrarAlerta(alertaCadastro, 'Conta criada! Agora faça login.', 'sucesso');
        document.getElementById('cadastro-nome').value = '';
        document.getElementById('cadastro-email').value = '';
        document.getElementById('cadastro-senha').value = '';
        setTimeout(function() {
          cadastroTab.classList.remove('ativo');
          loginTab.classList.add('ativo');
          esconderAlertas();
        }, 2000);
      }
    } catch (err) {
      mostrarAlerta(alertaCadastro, 'Erro de conexão. Tente novamente.', 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Criar conta';
    }
  });
})();