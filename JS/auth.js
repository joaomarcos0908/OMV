(function(){
  const API_BASE = '/api';
  const TOKEN_KEY = 'omv_token';
  const USUARIO_KEY = 'omv_usuario';
  // URLs canônicas do app. São absolutas porque as páginas são servidas em
  // /app, /app/investimentos e /login (via rewrites do Vercel): um caminho
  // relativo quebraria ao mudar a URL pública.
  const URL_LOGIN = '/login';
  const URL_APP = '/app';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }
  function getUsuario() { return JSON.parse(localStorage.getItem(USUARIO_KEY) || 'null'); }
  function setUsuario(u) { localStorage.setItem(USUARIO_KEY, JSON.stringify(u)); }
  function clearUsuario() { localStorage.removeItem(USUARIO_KEY); }
  function isLoggedIn() { return !!getToken(); }
  function logout() { clearToken(); clearUsuario(); window.location.href = URL_LOGIN; }

  async function apiFetch(path, options) {
    options = options || {};
    const token = getToken();
    // charset=utf-8 é explícito porque sem ele o corpo da requisição já chegou
    // decodificado errado em produção: "Ações" e "Salário" foram salvos com
    // caracteres de substituição (U+FFFD) e ficaram quebrados no banco.
    const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
    let data = null;
    try { data = await res.json(); } catch(e) { data = {}; }
    if (res.status === 401) {
      clearToken(); clearUsuario();
      if (!window.location.pathname.endsWith('/login') && !window.location.pathname.endsWith('/login.html')) {
        window.location.href = URL_LOGIN;
        return null;
      }
    }
    if (!res.ok) {
      const err = new Error((data && data.erro) || 'Erro na requisição');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // O botão "Sair" é ligado aqui em vez de onclick inline: a CSP do projeto
  // não usa 'unsafe-inline' em script-src, e atributo onclick só funciona
  // com ele.
  function ligarBotaoSair() {
    const botao = document.getElementById('botao-sair');
    if (botao) botao.addEventListener('click', logout);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ligarBotaoSair);
  } else {
    ligarBotaoSair();
  }

  window.auth = {
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    getUsuario: getUsuario,
    setUsuario: setUsuario,
    clearUsuario: clearUsuario,
    isLoggedIn: isLoggedIn,
    logout: logout,
    apiFetch: apiFetch
  };
})();