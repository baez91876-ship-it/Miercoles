const USERS_KEY = 'usuarios';
const SESSION_KEY = 'session_token';
const SESSION_USER_KEY = 'session_user';
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 15 * 60 * 1000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const dashboard = document.querySelector('#dashboard');
const globalMessage = document.querySelector('#global-message');
const title = document.querySelector('#auth-title');
const subtitle = document.querySelector('#auth-subtitle');
const authTabs = document.querySelectorAll('.auth-tab');
const passwordToggleButtons = document.querySelectorAll('.password-toggle');
const logoutButton = document.querySelector('[data-action="logout"]');
const forgotButton = document.querySelector('[data-action="forgot"]');
const authTabsContainer = document.querySelector('.auth-tabs');
const authHeading = document.querySelector('.auth-heading');

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setMessage(message, success = false) {
  globalMessage.textContent = message;
  globalMessage.className = `global-message${success ? ' success' : ''}`;
}

function clearMessages(form) {
  form.querySelectorAll('.field-error').forEach((error) => {
    error.textContent = '';
  });

  form.querySelectorAll('input').forEach((input) => {
    input.classList.remove('invalid');
  });

  setMessage('');
}

function setError(inputId, message) {
  const input = document.querySelector(`#${inputId}`);
  const error = document.querySelector(`[data-error-for="${inputId}"]`);

  if (input) {
    input.classList.add('invalid');
  }

  if (error) {
    error.textContent = message;
  }
}

function switchView(view) {
  const isRegister = view === 'register';

  loginForm.classList.toggle('hidden', isRegister);
  registerForm.classList.toggle('hidden', !isRegister);
  title.textContent = isRegister ? 'Crea tu cuenta' : 'Inicia sesión';
  subtitle.textContent = isRegister ? 'Empieza a trabajar con claridad.' : 'Continúa donde lo dejaste.';

  authTabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  clearMessages(isRegister ? registerForm : loginForm);
}

function validateRegistration() {
  const name = document.querySelector('#register-name').value.trim();
  const email = document.querySelector('#register-email').value.trim().toLowerCase();
  const password = document.querySelector('#register-password').value;
  const confirm = document.querySelector('#register-confirm').value;
  const terms = document.querySelector('#register-terms').checked;
  let valid = true;

  if (!name) {
    setError('register-name', 'Escribe tu nombre completo.');
    valid = false;
  }

  if (!emailPattern.test(email)) {
    setError('register-email', 'Introduce un correo válido.');
    valid = false;
  }

  if (!passwordPattern.test(password)) {
    setError('register-password', 'Usa 8 caracteres, mayúscula, minúscula, número y símbolo.');
    valid = false;
  }

  if (password !== confirm || !confirm) {
    setError('register-confirm', 'Las contraseñas deben coincidir.');
    valid = false;
  }

  if (!terms) {
    setError('register-terms', 'Debes aceptar los términos.');
    valid = false;
  }

  return { valid, name, email, password };
}

function handleRegistrationSubmit(event) {
  event.preventDefault();
  clearMessages(registerForm);

  const result = validateRegistration();
  if (!result.valid) {
    return;
  }

  const users = getUsers();
  if (users.some((user) => user.correo === result.email)) {
    setError('register-email', 'Ya existe una cuenta con este correo.');
    return;
  }

  users.push({
    nombre: result.name,
    correo: result.email,
    password: result.password,
    intentosFallidos: 0,
    bloqueadoHasta: 0,
  });

  saveUsers(users);
  registerForm.reset();
  switchView('login');
  setMessage('Cuenta creada. Ya puedes iniciar sesión.', true);
}

function handleLoginSubmit(event) {
  event.preventDefault();
  clearMessages(loginForm);

  const email = document.querySelector('#login-email').value.trim().toLowerCase();
  const password = document.querySelector('#login-password').value;
  let valid = true;

  if (!emailPattern.test(email)) {
    setError('login-email', 'Introduce un correo válido.');
    valid = false;
  }

  if (!password) {
    setError('login-password', 'Introduce tu contraseña.');
    valid = false;
  }

  if (!valid) {
    return;
  }

  const users = getUsers();
  const user = users.find((candidate) => candidate.correo === email);

  if (user?.bloqueadoHasta > Date.now()) {
    const minutes = Math.ceil((user.bloqueadoHasta - Date.now()) / 60000);
    setMessage(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutes} minuto(s).`);
    return;
  }

  if (!user || user.password !== password) {
    if (user) {
      user.intentosFallidos += 1;
    }

    if (user?.intentosFallidos >= MAX_ATTEMPTS) {
      user.bloqueadoHasta = Date.now() + LOCK_DURATION;
      user.intentosFallidos = 0;
      setMessage('Demasiados intentos. Tu cuenta está bloqueada durante 15 minutos.');
    } else {
      const remaining = MAX_ATTEMPTS - (user?.intentosFallidos || 0);
      setMessage(`Correo o contraseña incorrectos. Te quedan ${remaining} intento(s).`);
    }

    saveUsers(users);
    setError('login-password', 'No pudimos validar tus datos.');
    return;
  }

  user.intentosFallidos = 0;
  user.bloqueadoHasta = 0;
  saveUsers(users);

  const token = btoa(`${user.correo}${Date.now()}`);
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify({ correo: user.correo, nombre: user.nombre }));

  showDashboard(user.nombre);
}

function showDashboard(name) {
  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  authTabsContainer.classList.add('hidden');
  authHeading.classList.add('hidden');
  dashboard.classList.remove('hidden');
  document.querySelector('#dashboard-name').textContent = `Hola, ${name}`;
  setMessage('');
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
  dashboard.classList.add('hidden');
  authTabsContainer.classList.remove('hidden');
  authHeading.classList.remove('hidden');
  switchView('login');
}

function togglePasswordVisibility(button) {
  const targetId = button.dataset.target;
  const input = document.querySelector(`#${targetId}`);

  if (!input) {
    return;
  }

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  button.textContent = isHidden ? '🙈' : '👁';
  button.setAttribute('aria-label', isHidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

function bindEvents() {
  registerForm.addEventListener('submit', handleRegistrationSubmit);
  loginForm.addEventListener('submit', handleLoginSubmit);

  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  passwordToggleButtons.forEach((button) => {
    button.addEventListener('click', () => togglePasswordVisibility(button));
  });

  logoutButton.addEventListener('click', logout);
  forgotButton.addEventListener('click', () => {
    setMessage('Para recuperar tu acceso, contacta con soporte.');
  });
}

function initializeSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_USER_KEY) || 'null');

  if (session && localStorage.getItem(SESSION_KEY)) {
    showDashboard(session.nombre);
  }
}

bindEvents();
initializeSession();

