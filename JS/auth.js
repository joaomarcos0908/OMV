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
  function logout() { clearToken(); clearUsuario(); }

  async function apiFetch(path, options) {
    options = options || {};
    const token = getToken();
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
    if (res.status === 401) {
      logout();
      window.location.href = 'index.html';
      return null;
    }
    return res.json();
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