(function(){
  const API_BASE = '/api';
  const TOKEN_KEY = 'omv_token';
  const USUARIO_KEY = 'omv_usuario';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }
  function getUsuario() { return JSON.parse(localStorage.getItem(USUARIO_KEY) || 'null'); }
  function setUsuario(u) { localStorage.setItem(USUARIO_KEY, JSON.stringify(u)); }
  function clearUsuario() { localStorage.removeItem(USUARIO_KEY); }
  function isLoggedIn() { return !!getToken(); }
  function logout() { clearToken(); clearUsuario(); window.location.href = '/Html/login.html'; }

  async function apiFetch(path, options) {
    options = options || {};
    const token = getToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
    let data = null;
    try { data = await res.json(); } catch(e) { data = {}; }
    if (res.status === 401) {
      clearToken(); clearUsuario();
      if (!window.location.pathname.endsWith('/Html/login.html') && !window.location.pathname.endsWith('/login.html')) {
        window.location.href = '/Html/login.html';
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