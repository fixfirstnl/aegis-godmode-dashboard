/* ===== AEGIS Auth Module ===== */
const AUTH_KEY = 'aegis_token';
const USER_KEY = 'aegis_user';
const DEMO_KEY = 'aegis_demo';

const API = {
  health: '/api/health',
  login: '/api/auth/login',
  accounts: '/api/accounts',
};

let currentUser = null;
let isDemo = false;

function initAuth() {
  const token = localStorage.getItem(AUTH_KEY);
  const user = localStorage.getItem(USER_KEY);
  const demo = localStorage.getItem(DEMO_KEY);
  if (user) { try { currentUser = JSON.parse(user); } catch(e) {} }
  isDemo = demo === 'true';

  const path = window.location.pathname.split('/').pop() || 'index.html';
  const publicPages = ['index.html', 'register.html', ''];
  const isPublic = publicPages.includes(path);

  if (!token && !isPublic) {
    window.location.href = 'index.html';
    return false;
  }
  if (token && isPublic) {
    window.location.href = 'dashboard.html';
    return false;
  }
  if (token) { setupTokenRefresh(); }
  return true;
}

async function login(username, password, demoMode = false) {
  try {
    if (demoMode) {
      const mockToken = 'demo_' + Date.now();
      const mockUser = { id: 'demo', username: 'Demo Trader', email: 'demo@aegis.local', role: 'trader' };
      localStorage.setItem(AUTH_KEY, mockToken);
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(DEMO_KEY, 'true');
      currentUser = mockUser;
      isDemo = true;
      window.location.href = 'dashboard.html';
      return { success: true };
    }
    const res = await fetch(API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    if (!data.token) throw new Error('No token received');
    localStorage.setItem(AUTH_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user || { username }));
    localStorage.setItem(DEMO_KEY, 'false');
    currentUser = data.user || { username };
    isDemo = false;
    window.location.href = 'dashboard.html';
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEMO_KEY);
  currentUser = null;
  isDemo = false;
  window.location.href = 'index.html';
}

function getToken() { return localStorage.getItem(AUTH_KEY); }
function getUser() { return currentUser; }
function isDemoMode() { return isDemo; }

function authHeaders() {
  const token = getToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function authFetch(url, opts = {}) {
  opts.headers = Object.assign(authHeaders(), opts.headers || {});
  try { return await fetch(url, opts); }
  catch (e) { console.error('Fetch error:', e); throw e; }
}

function setupTokenRefresh() {
  // Token refresh every 10 min
  setInterval(() => {
    const token = getToken();
    if (!token) return;
    // In production, call refresh endpoint
  }, 600000);
}

// Login form
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const demoMode = document.getElementById('demoMode')?.checked || false;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    const result = await login(username, password, demoMode);
    if (!result.success) errEl.textContent = result.error || 'Login failed';
  });
}

// Register form
if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('registerError');
    errEl.textContent = '';
    const pw = document.getElementById('regPassword').value;
    const pw2 = document.getElementById('regPassword2').value;
    if (pw !== pw2) { errEl.textContent = 'Passwords do not match'; return; }
    // Mock registration -> redirect to login
    errEl.textContent = 'Registration successful! Redirecting...';
    errEl.style.color = 'var(--profit)';
    setTimeout(() => window.location.href = 'index.html', 1000);
  });
}

initAuth();
