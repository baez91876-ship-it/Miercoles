const USERS_KEY = 'clara-users';
const SESSION_KEY = 'clara-session';
const LOCK_KEY = 'clara-login-lock';
const MAX_ATTEMPTS = 5;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const dashboard = document.querySelector('#dashboard');
const globalMessage = document.querySelector('#global-message');
const title = document.querySelector('#auth-title');
const subtitle = document.querySelector('#auth-subtitle');

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function setMessage(message, success = false) {
    globalMessage.textContent = message;
    globalMessage.className = `global-message${success ? ' success' : ''}`;
}

function clearMessages(form) {
    form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
    form.querySelectorAll('input').forEach((input) => input.classList.remove('invalid'));
    setMessage('');
}

function setError(inputId, message) {
    const input = document.querySelector(`#${inputId}`);
    const error = document.querySelector(`[data-error-for="${inputId}"]`);
    if (input) input.classList.add('invalid');
    if (error) error.textContent = message;
}

function switchView(view) {
    const isRegister = view === 'register';
    loginForm.classList.toggle('hidden', isRegister);
    registerForm.classList.toggle('hidden', !isRegister);
    title.textContent = isRegister ? 'Crea tu cuenta' : 'Inicia sesión';
    subtitle.textContent = isRegister ? 'Empieza a trabajar con claridad.' : 'Continúa donde lo dejaste.';
    document.querySelectorAll('.auth-tab').forEach((tab) => {
        const active = tab.dataset.view === view;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active);
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
    if (!name) { setError('register-name', 'Escribe tu nombre completo.'); valid = false; }
    if (!emailPattern.test(email)) { setError('register-email', 'Introduce un correo válido.'); valid = false; }
    if (!passwordPattern.test(password)) { setError('register-password', 'Usa 8 caracteres, mayúscula, minúscula, número y símbolo.'); valid = false; }
    if (password !== confirm || !confirm) { setError('register-confirm', 'Las contraseñas deben coincidir.'); valid = false; }
    if (!terms) { setError('register-terms', 'Debes aceptar los términos.'); valid = false; }
    return { valid, name, email, password };
}

registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessages(registerForm);
    const result = validateRegistration();
    if (!result.valid) return;
    const users = getUsers();
    if (users.some((user) => user.email === result.email)) {
        setError('register-email', 'Ya existe una cuenta con este correo.');
        return;
    }
    users.push({ name: result.name, email: result.email, password: result.password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    registerForm.reset();
    switchView('login');
    setMessage('Cuenta creada. Ya puedes iniciar sesión.', true);
});

function getLockState() {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '{"attempts":0,"lockedUntil":0}');
}

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearMessages(loginForm);
    const email = document.querySelector('#login-email').value.trim().toLowerCase();
    const password = document.querySelector('#login-password').value;
    let valid = true;
    if (!emailPattern.test(email)) { setError('login-email', 'Introduce un correo válido.'); valid = false; }
    if (!password) { setError('login-password', 'Introduce tu contraseña.'); valid = false; }
    if (!valid) return;

    const lock = getLockState();
    if (lock.lockedUntil > Date.now()) {
        const minutes = Math.ceil((lock.lockedUntil - Date.now()) / 60000);
        setMessage(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutes} minuto(s).`);
        return;
    }
    const user = getUsers().find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) {
        lock.attempts += 1;
        if (lock.attempts >= MAX_ATTEMPTS) {
            lock.lockedUntil = Date.now() + 5 * 60 * 1000;
            lock.attempts = 0;
            setMessage('Demasiados intentos. Tu acceso está bloqueado durante 5 minutos.');
        } else {
            const remaining = MAX_ATTEMPTS - lock.attempts;
            setMessage(`Correo o contraseña incorrectos. Te quedan ${remaining} intento(s).`);
        }
        localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
        setError('login-password', 'No pudimos validar tus datos.');
        return;
    }
    localStorage.removeItem(LOCK_KEY);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, name: user.name, createdAt: Date.now() }));
    showDashboard(user.name);
});

function showDashboard(name) {
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    document.querySelector('.auth-tabs').classList.add('hidden');
    document.querySelector('.auth-heading').classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.querySelector('#dashboard-name').textContent = `Hola, ${name}`;
    setMessage('');
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    dashboard.classList.add('hidden');
    document.querySelector('.auth-tabs').classList.remove('hidden');
    document.querySelector('.auth-heading').classList.remove('hidden');
    switchView('login');
}

document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
document.querySelector('[data-action="logout"]').addEventListener('click', logout);
document.querySelector('[data-action="forgot"]').addEventListener('click', () => setMessage('Para recuperar tu acceso, contacta con soporte.'));

const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
if (session) showDashboard(session.name);
