const USERS_KEY = 'usuarios';
const SESSION_KEY = 'session_token';
const SESSION_USER_KEY = 'session_user';
const RESERVATIONS_KEY = 'reservas';
const SERVICES_KEY = 'servicios';
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 15 * 60 * 1000;
const ADMIN_EMAIL = 'baez91876@gmail.com';
const DEMO_ADMIN_PASSWORD = '1234';
const USERS_PER_PAGE = 5;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const DEFAULT_ROOMS = [
  { id: 'std', nombre: 'Habitación Estándar', capacidad: 2, precio: 890, detalle: 'Cama queen, escritorio y wifi de alta velocidad.' },
  { id: 'dbl', nombre: 'Habitación Doble', capacidad: 3, precio: 1150, detalle: 'Dos camas matrimoniales y vista a la ciudad.' },
  { id: 'jr', nombre: 'Suite Junior', capacidad: 4, precio: 1620, detalle: 'Sala independiente, terraza y desayuno incluido.' },
  { id: 'ste', nombre: 'Suite Premium', capacidad: 4, precio: 2340, detalle: 'Jacuzzi, servicio a la habitación 24 h y check-out tardío.' },
];

function getRooms() {
  const saved = localStorage.getItem(SERVICES_KEY);
  return saved === null ? DEFAULT_ROOMS.map((room) => ({
    ...room, duracion: 1, categoria: room.id === 'std' || room.id === 'dbl' ? 'Habitación' : 'Suite',
    estado: 'disponible', imagen: '',
  })) : JSON.parse(saved);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const authScreen = document.querySelector('#auth-screen');
const bookingScreen = document.querySelector('#booking-screen');
const bookingUserName = document.querySelector('#booking-user-name');
const bookingMessage = document.querySelector('#booking-message');
const searchForm = document.querySelector('#search-form');
const checkinInput = document.querySelector('#search-checkin');
const checkoutInput = document.querySelector('#search-checkout');
const guestsInput = document.querySelector('#search-guests');
const roomList = document.querySelector('#room-list');
const reservationList = document.querySelector('#reservation-list');
const reservationCount = document.querySelector('#reservation-count');
const clearReservationsButton = document.querySelector('#clear-reservations');
const globalMessage = document.querySelector('#global-message');
const title = document.querySelector('#auth-title');
const subtitle = document.querySelector('#auth-subtitle');
const authTabs = document.querySelectorAll('.auth-tab');
const passwordToggleButtons = document.querySelectorAll('.password-toggle');
const logoutButtons = document.querySelectorAll('[data-action="logout"]');
const forgotButton = document.querySelector('[data-action="forgot"]');

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]').map((user) => ({
    ...user,
    rol: user.rol || (user.correo === ADMIN_EMAIL ? 'administrador' : 'usuario'),
    estado: user.estado || 'activo',
  }));
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function initializeDemoAdministrator() {
  const users = getUsers();
  const admin = users.find((user) => user.correo === ADMIN_EMAIL);
  if (admin?.demoAdminConfigured) return;
  if (admin) {
    Object.assign(admin, { password: DEMO_ADMIN_PASSWORD, rol: 'administrador', estado: 'activo',
      intentosFallidos: 0, bloqueadoHasta: 0, demoAdminConfigured: true });
  } else {
    users.push({ nombre: 'Administrador Hotel Clara', correo: ADMIN_EMAIL, telefono: '',
      password: DEMO_ADMIN_PASSWORD, rol: 'administrador', estado: 'activo',
      intentosFallidos: 0, bloqueadoHasta: 0, fechaRegistro: new Date().toISOString(),
      demoAdminConfigured: true });
  }
  try {
    saveUsers(users);
  } catch (error) {
    console.error('No se pudo configurar el administrador de demostración.', error);
    setMessage('No se pudo configurar el administrador local. Comprueba los permisos y el espacio de almacenamiento.');
  }
}

function validAccountPassword(email, password, role) {
  return passwordPattern.test(password) ||
    (email === ADMIN_EMAIL && role === 'administrador' && password === DEMO_ADMIN_PASSWORD);
}

function setMessage(message, success = false) {
  globalMessage.textContent = message;
  globalMessage.className = `global-message${success ? ' success' : ''}`;
}

function clearMessages(form) {
  form.querySelectorAll('.field-error').forEach((error) => {
    error.textContent = '';
  });

  form.querySelectorAll('input, textarea').forEach((input) => {
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
  subtitle.textContent = isRegister
    ? 'Regístrate para reservar tu habitación.'
    : 'Accede para gestionar tus reservas.';

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
  const phone = document.querySelector('#register-phone').value.trim();
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

  if (!validAccountPassword(email, password, email === ADMIN_EMAIL ? 'administrador' : 'usuario')) {
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

  return { valid, name, email, phone, password };
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
    telefono: result.phone,
    password: result.password,
    intentosFallidos: 0,
    bloqueadoHasta: 0,
    rol: result.email === ADMIN_EMAIL ? 'administrador' : 'usuario',
    estado: 'activo',
    fechaRegistro: new Date().toISOString(),
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

  if (user?.estado === 'inactivo') {
    setMessage('Esta cuenta está inactiva. Contacta con un administrador.');
    return;
  }

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

  loginForm.reset();
  showBookingScreen({ correo: user.correo, nombre: user.nombre });
}

/* Reservas */

let currentUser = null;
let editingReservationId = null;
let pendingDeleteId = null;

function getReservations() {
  return JSON.parse(localStorage.getItem(RESERVATIONS_KEY) || '[]');
}

function saveReservations(reservations) {
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
}

function setBookingMessage(message, success = false) {
  bookingMessage.textContent = message;
  bookingMessage.className = `global-message${success ? ' success' : ''}`;
}

function markDateFields(invalid) {
  checkinInput.classList.toggle('invalid', invalid && !checkinInput.value);
  checkoutInput.classList.toggle('invalid', invalid && !checkoutInput.value);
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function nightsBetween(checkin, checkout) {
  const start = new Date(`${checkin}T00:00:00`).getTime();
  const end = new Date(`${checkout}T00:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

function setDateLimits() {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  checkinInput.min = toISODate(today);
  checkoutInput.min = toISODate(tomorrow);
}

function getSearchCriteria() {
  const checkin = checkinInput.value;
  const checkout = checkoutInput.value;
  const guests = Number(guestsInput.value);
  const today = toISODate(new Date());

  if (!checkin || !checkout) {
    return { valid: false, error: 'Selecciona las fechas de entrada y salida para reservar.' };
  }

  if (checkin < today) {
    return { valid: false, error: 'La fecha de entrada no puede ser anterior a hoy.' };
  }

  if (nightsBetween(checkin, checkout) < 1) {
    return { valid: false, error: 'La salida debe ser posterior a la entrada.' };
  }

  return { valid: true, checkin, checkout, guests };
}

function isRoomTaken(roomId, checkin, checkout, reservations, ignoreId) {
  return reservations.some(
    (reservation) =>
      reservation.habitacionId === roomId &&
      reservation.id !== ignoreId &&
      checkin < reservation.salida &&
      checkout > reservation.entrada,
  );
}

function renderRooms() {
  const criteria = getSearchCriteria();
  const reservations = getReservations();
  const guests = Number(guestsInput.value);

  roomList.innerHTML = '';

  getRooms().filter((room) => room.estado === 'disponible').forEach((room) => {
    const fitsGuests = room.capacidad >= guests;
    const taken = criteria.valid && isRoomTaken(room.id, criteria.checkin, criteria.checkout, reservations);
    const nights = criteria.valid ? nightsBetween(criteria.checkin, criteria.checkout) : 1;
    const fitsDuration = nights >= room.duracion;
    const available = criteria.valid && fitsGuests && fitsDuration && !taken;
    const tag = !criteria.valid
      ? 'Elige fechas'
      : taken
        ? 'Ocupada'
        : !fitsDuration
          ? `Mínimo ${room.duracion} noche(s)`
        : fitsGuests
          ? 'Disponible'
          : 'Capacidad insuficiente';

    const card = document.createElement('article');
    card.className = `room-card${available ? '' : ' unavailable'}`;
    card.innerHTML = `
      <div class="room-top">
        <h4>${escapeHTML(room.nombre)}</h4>
        <span class="room-tag">${tag}</span>
      </div>
      <p class="room-detail">${escapeHTML(room.detalle)}</p>
      <p class="room-meta">Hasta ${room.capacidad} huéspedes · Mínimo ${room.duracion} noche(s) · ${criteria.valid ? `${nights} noche(s)` : 'sin fechas'}</p>
      <div class="room-bottom">
        <span class="room-price">$${Math.round(room.precio * nights * 100) / 100} <small>${criteria.valid ? 'total' : 'por noche'}</small></span>
        <button class="room-button" type="button" data-room="${escapeHTML(room.id)}" ${available ? '' : 'disabled'}>Reservar</button>
      </div>
    `;

    roomList.append(card);
    if (room.imagen) card.prepend(serviceImage(room));
  });
  if (!roomList.children.length) roomList.innerHTML = '<p class="empty-state">No hay servicios disponibles.</p>';
}

function renderReservations() {
  const admin = isAdministrator();
  const reservations = getReservations().filter((reservation) => admin || reservation.correo === currentUser?.correo);
  document.querySelector('#reservations-title').firstChild.textContent = admin ? 'Todas las reservas ' : 'Mis reservas ';
  document.querySelector('#reservations-section').setAttribute('aria-label', admin ? 'Todas las reservas' : 'Mis reservas');

  reservationList.innerHTML = '';
  reservationCount.textContent = String(reservations.length);
  clearReservationsButton.classList.toggle('hidden', !reservations.some((reservation) => reservation.correo === currentUser?.correo));
  clearReservationsButton.dataset.confirming = 'false';
  clearReservationsButton.textContent = admin ? 'Eliminar mis reservas' : 'Eliminar todas';

  if (!reservations.length) {
    reservationList.innerHTML = `<p class="empty-state">${admin ? 'Todavía no hay reservas.' : 'Todavía no tienes reservas.'}</p>`;
    return;
  }

  reservations
    .sort((a, b) => a.entrada.localeCompare(b.entrada))
    .forEach((reservation) => {
      const item = document.createElement('article');
      item.className = 'reservation-card';

      if (reservation.id === editingReservationId) {
        item.classList.add('editing');
        item.innerHTML = `
          <form class="reservation-edit" data-save="${reservation.id}" novalidate>
            <div class="field">
              <label for="edit-room">Habitación</label>
              <select id="edit-room" name="room">
                ${getRooms().filter((room) => room.estado === 'disponible' || room.id === reservation.habitacionId).map(
                  (room) =>
                    `<option value="${escapeHTML(room.id)}"${room.id === reservation.habitacionId ? ' selected' : ''}>${escapeHTML(room.nombre)}${room.estado === 'inactivo' ? ' (inactivo)' : ''}</option>`,
                ).join('')}
              </select>
            </div>
            <div class="field">
              <label for="edit-checkin">Entrada *</label>
              <input id="edit-checkin" name="checkin" type="date" value="${reservation.entrada}" required />
            </div>
            <div class="field">
              <label for="edit-checkout">Salida *</label>
              <input id="edit-checkout" name="checkout" type="date" value="${reservation.salida}" required />
            </div>
            <div class="field">
              <label for="edit-guests">Huéspedes</label>
              <select id="edit-guests" name="guests">
                ${[1, 2, 3, 4]
                  .map((n) => `<option value="${n}"${n === reservation.huespedes ? ' selected' : ''}>${n} huésped(es)</option>`)
                  .join('')}
              </select>
            </div>
            <div class="reservation-actions">
              <button class="room-button" type="submit">Guardar</button>
              <button class="ghost-button" type="button" data-cancel-edit="1">Descartar</button>
            </div>
          </form>
        `;
      } else {
        const nights = nightsBetween(reservation.entrada, reservation.salida);
        const estado = reservationState(reservation);
        const confirming = reservation.id === pendingDeleteId;

        item.classList.add(`state-${estado.toLowerCase().replace(' ', '-')}`);
        item.innerHTML = `
          <div>
            <div class="reservation-title">
              <h4>${escapeHTML(reservation.habitacion)}</h4>
              <span class="reservation-state">${estado}</span>
            </div>
            <p>${formatDate(reservation.entrada)} → ${formatDate(reservation.salida)} · ${nights} noche(s) · ${reservation.huespedes} huésped(es)</p>
            ${admin ? `<p>Cliente: ${escapeHTML(reservation.correo)}</p>` : ''}
            <p class="reservation-code">Código ${reservation.id.toUpperCase()}</p>
          </div>
          <div class="reservation-actions">
            <span class="room-price">$${reservation.total}</span>
            <button class="ghost-button" type="button" data-edit="${reservation.id}">Editar</button>
            ${
              reservation.correo !== currentUser?.correo ? '' : confirming
                ? `<button class="ghost-button danger" type="button" data-confirm-delete="${reservation.id}">Confirmar</button>
                   <button class="ghost-button" type="button" data-abort-delete="1">No</button>`
                : `<button class="ghost-button danger" type="button" data-delete="${reservation.id}">Eliminar</button>`
            }
          </div>
        `;
      }

      reservationList.append(item);
    });
}

function startEditing(reservationId) {
  if (!editableReservation(reservationId)) return;
  editingReservationId = reservationId;
  pendingDeleteId = null;
  setBookingMessage('');
  renderReservations();
}

function editableReservation(id) {
  const user = getUsers().find((candidate) => candidate.correo === currentUser?.correo && candidate.estado === 'activo');
  const reservation = getReservations().find((candidate) => candidate.id === id);
  if (!user || !reservation || (user.rol !== 'administrador' && reservation.correo !== user.correo)) {
    setBookingMessage('No tienes permiso para editar esta reserva o ya no existe.');
    return null;
  }
  return reservation;
}

function ownReservation(id) {
  const user = getUsers().find((candidate) => candidate.correo === currentUser?.correo && candidate.estado === 'activo');
  const reservation = getReservations().find((candidate) => candidate.id === id && candidate.correo === user?.correo);
  if (!user || !reservation) {
    setBookingMessage('No tienes permiso para eliminar esta reserva o ya no existe.');
    return null;
  }
  return reservation;
}

function saveEditedReservation(reservationId, form) {
  const reservation = editableReservation(reservationId);
  if (!reservation) return;
  const roomId = form.elements.room.value;
  const checkin = form.elements.checkin.value;
  const checkout = form.elements.checkout.value;
  const guests = Number(form.elements.guests.value);
  const room = getRooms().find((candidate) => candidate.id === roomId);
  if (!room || !reservation) {
    setBookingMessage('El servicio o la reserva ya no existe.');
    return;
  }
  if (room.estado !== 'disponible') {
    setBookingMessage('El servicio está inactivo. Selecciona uno disponible para actualizar la reserva.');
    return;
  }

  if (!checkin || !checkout) {
    setBookingMessage('Selecciona las fechas de entrada y salida.');
    return;
  }

  const nights = nightsBetween(checkin, checkout);
  if (checkin < toISODate(new Date())) {
    setBookingMessage('La fecha de entrada no puede ser anterior a hoy.');
    return;
  }

  if (nights < room.duracion) {
    setBookingMessage(`La salida debe ser posterior a la entrada y la estancia de al menos ${room.duracion} noche(s).`);
    return;
  }

  if (!Number.isInteger(guests) || guests < 1 || room.capacidad < guests) {
    setBookingMessage(`${room.nombre} admite como máximo ${room.capacidad} huéspedes.`);
    return;
  }

  const reservations = getReservations();

  if (isRoomTaken(roomId, checkin, checkout, reservations, reservationId)) {
    setBookingMessage('Esa habitación ya está ocupada en esas fechas.');
    return;
  }

  const savedReservation = reservations.find((candidate) => candidate.id === reservationId);
  Object.assign(savedReservation, {
    habitacionId: room.id,
    habitacion: room.nombre,
    entrada: checkin,
    salida: checkout,
    huespedes: guests,
    total: Math.round(room.precio * nights * 100) / 100,
  });

  saveReservations(reservations);
  editingReservationId = null;
  setBookingMessage('Reserva actualizada.', true);
  renderRooms();
  renderReservations();
}

function bookRoom(roomId) {
  const criteria = getSearchCriteria();

  if (!criteria.valid) {
    setBookingMessage(criteria.error);
    markDateFields(true);
    return;
  }

  markDateFields(false);

  const room = getRooms().find((candidate) => candidate.id === roomId);
  const reservations = getReservations();

  if (!room || room.estado !== 'disponible' || isRoomTaken(roomId, criteria.checkin, criteria.checkout, reservations)) {
    setBookingMessage('Esa habitación ya no está disponible en esas fechas.');
    renderRooms();
    return;
  }

  const nights = nightsBetween(criteria.checkin, criteria.checkout);
  if (criteria.guests > room.capacidad || nights < room.duracion) {
    setBookingMessage(`El servicio admite hasta ${room.capacidad} huéspedes y requiere al menos ${room.duracion} noche(s).`);
    return;
  }

  reservations.push({
    id: `${roomId}-${Date.now()}`,
    correo: currentUser.correo,
    habitacionId: room.id,
    habitacion: room.nombre,
    entrada: criteria.checkin,
    salida: criteria.checkout,
    huespedes: criteria.guests,
    total: Math.round(room.precio * nights * 100) / 100,
  });

  saveReservations(reservations);
  setBookingMessage(`Reserva confirmada: ${room.nombre}.`, true);
  renderRooms();
  renderReservations();
}

function cancelReservation(reservationId) {
  if (!ownReservation(reservationId)) return;
  const reservations = getReservations().filter((reservation) => reservation.id !== reservationId);
  saveReservations(reservations);

  if (editingReservationId === reservationId) {
    editingReservationId = null;
  }

  pendingDeleteId = null;
  setBookingMessage('Reserva eliminada.', true);
  renderRooms();
  renderReservations();
}

function askDeleteConfirmation(reservationId) {
  if (!ownReservation(reservationId)) return;
  pendingDeleteId = reservationId;
  editingReservationId = null;
  setBookingMessage('Confirma para eliminar la reserva definitivamente.');
  renderReservations();
}

function deleteAllReservations() {
  if (!getUsers().some((user) => user.correo === currentUser?.correo && user.estado === 'activo')) {
    setBookingMessage('No tienes permiso para eliminar reservas.');
    return;
  }
  const others = getReservations().filter((reservation) => reservation.correo !== currentUser?.correo);
  saveReservations(others);
  editingReservationId = null;
  pendingDeleteId = null;
  setBookingMessage('Se eliminaron todas tus reservas.', true);
  renderRooms();
  renderReservations();
}

function showBookingScreen(user) {
  currentUser = user;
  editingReservationId = null;
  pendingDeleteId = null;
  authScreen.classList.add('hidden');
  bookingScreen.classList.remove('hidden');
  bookingUserName.textContent = `Hola, ${user.nombre}`;
  setMessage('');
  setBookingMessage('Selecciona tus fechas para ver la disponibilidad.');
  setDateLimits();
  checkinInput.value = '';
  checkoutInput.value = '';
  renderRooms();
  renderReservations();
  navigateTo('dashboard');
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
  currentUser = null;
  document.querySelector('.user-menu').open = false;
  document.querySelector('#user-form').classList.add('hidden');
  document.querySelector('#delete-user-dialog').close();
  closeServiceEditor();
  document.querySelector('#delete-service-dialog').close();
  editingUserEmail = null;
  deletingUserEmail = null;
  reservationList.replaceChildren();
  document.querySelector('#recent-reservations').replaceChildren();
  document.querySelector('#users-table-body').replaceChildren();
  document.querySelector('#service-list').replaceChildren();
  userForm.reset();
  serviceForm.reset();
  ['users-nav', 'services-nav', 'manage-users-action', 'manage-services-action', 'users-stat-card'].forEach((id) => {
    document.getElementById(id).classList.add('hidden');
  });
  document.querySelector('#stat-users').textContent = '0';
  bookingUserName.textContent = '';
  document.querySelector('#account-role').textContent = '';
  bookingScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  switchView('login');
  document.title = 'Hotel Clara | Acceso';
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

  logoutButtons.forEach((button) => button.addEventListener('click', logout));
  forgotButton.addEventListener('click', () => {
    setMessage('Para recuperar tu acceso, contacta con recepción.');
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const criteria = getSearchCriteria();

    if (!criteria.valid) {
      setBookingMessage(criteria.error);
      markDateFields(true);
      renderRooms();
      return;
    }

    markDateFields(false);
    setBookingMessage('');
    renderRooms();
  });

  checkinInput.addEventListener('change', () => {
    const nextDay = new Date(new Date(`${checkinInput.value}T00:00:00`).getTime() + 86400000);

    if (checkinInput.value) {
      checkoutInput.min = toISODate(nextDay);

      if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = toISODate(nextDay);
      }
    }

    renderRooms();
  });

  checkoutInput.addEventListener('change', renderRooms);
  guestsInput.addEventListener('change', renderRooms);

  roomList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-room]');

    if (button) {
      bookRoom(button.dataset.room);
    }
  });

  reservationList.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete]');
    const confirmButton = event.target.closest('[data-confirm-delete]');
    const abortButton = event.target.closest('[data-abort-delete]');
    const editButton = event.target.closest('[data-edit]');
    const discardButton = event.target.closest('[data-cancel-edit]');

    if (deleteButton) {
      askDeleteConfirmation(deleteButton.dataset.delete);
    } else if (confirmButton) {
      cancelReservation(confirmButton.dataset.confirmDelete);
    } else if (abortButton) {
      pendingDeleteId = null;
      setBookingMessage('');
      renderReservations();
    } else if (editButton) {
      startEditing(editButton.dataset.edit);
    } else if (discardButton) {
      editingReservationId = null;
      renderReservations();
    }
  });

  clearReservationsButton.addEventListener('click', () => {
    if (clearReservationsButton.dataset.confirming === 'true') {
      clearReservationsButton.dataset.confirming = 'false';
      clearReservationsButton.textContent = isAdministrator() ? 'Eliminar mis reservas' : 'Eliminar todas';
      deleteAllReservations();
      return;
    }

    clearReservationsButton.dataset.confirming = 'true';
    clearReservationsButton.textContent = 'Pulsa otra vez para confirmar';
    setBookingMessage('Vas a eliminar todas tus reservas.');
  });

  reservationList.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-save]');

    if (form) {
      event.preventDefault();
      saveEditedReservation(form.dataset.save, form);
    }
  });
}

function initializeSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_USER_KEY) || 'null');

  if (session && localStorage.getItem(SESSION_KEY)) {
    const user = getUsers().find((candidate) => candidate.correo === session.correo);
    if (user && user.estado === 'activo') {
      showBookingScreen(user);
    } else {
      logout();
      setMessage('Tu cuenta ya no está disponible o está inactiva.');
    }
  }
}

let activePage = 'dashboard';
let editingUserEmail = null;
let deletingUserEmail = null;
let usersPage = 1;
const userForm = document.querySelector('#user-form');
const usersMessage = document.querySelector('#users-message');
const deleteUserDialog = document.querySelector('#delete-user-dialog');

function isAdministrator() {
  return getUsers().some((user) => user.correo === currentUser?.correo &&
    user.rol === 'administrador' && user.estado === 'activo');
}

function setUsersMessage(message, success = false) {
  usersMessage.textContent = message;
  usersMessage.className = `global-message${success ? ' success' : ''}`;
}

function requireAdministrator() {
  if (isAdministrator()) return true;
  navigateTo('dashboard');
  document.querySelector('#app-message').textContent = 'No tienes permiso para administrar usuarios o servicios.';
  return false;
}

function navigateTo(page) {
  const user = getUsers().find((candidate) => candidate.correo === currentUser?.correo);
  if (!user || user.estado !== 'activo') {
    logout();
    setMessage('Tu cuenta ya no está disponible o está inactiva.');
    return;
  }
  currentUser = user;
  document.querySelector('#app-message').textContent = '';
  const admin = isAdministrator();
  activePage = ['users', 'services'].includes(page) && !admin ? 'dashboard' : page;
  ['users-nav', 'manage-users-action', 'users-stat-card', 'services-nav', 'manage-services-action'].forEach((id) => {
    document.getElementById(id).classList.toggle('hidden', !admin);
  });
  ['dashboard', 'reservations', 'users', 'services'].forEach((name) => {
    document.getElementById(`${name}-page`).classList.toggle('hidden', name !== activePage);
  });
  document.querySelectorAll('.main-nav [data-page]').forEach((button) => {
    if (button.dataset.page === activePage) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  bookingUserName.textContent = `Hola, ${user.nombre}`;
  document.querySelector('#account-role').textContent = admin ? 'Administrador local' : 'Usuario';
  document.title = `Hotel Clara | ${activePage === 'dashboard' ? 'Dashboard' : activePage === 'users' ? 'Usuarios' : activePage === 'services' ? 'Servicios' : 'Reservas'}`;
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'users') renderUsers();
  if (activePage === 'services') renderServices();
  if (activePage === 'reservations') {
    renderRooms();
    renderReservations();
  }
}

function reservationState(reservation) {
  const today = toISODate(new Date());
  return reservation.salida <= today ? 'Finalizada' : reservation.entrada <= today ? 'En curso' : 'Próxima';
}

function renderDashboard() {
  const admin = isAdministrator();
  const reservations = getReservations().filter((reservation) => admin || reservation.correo === currentUser.correo);
  document.querySelector('#dashboard-greeting').textContent = `Bienvenido, ${currentUser.nombre}. Consulta el estado de ${admin ? 'este sistema local' : 'tus reservas'}.`;
  document.querySelector('#stat-users').textContent = String(getUsers().length);
  document.querySelector('#stat-services').textContent = String(getRooms().filter((room) => room.estado === 'disponible').length);
  document.querySelector('#stat-reservations').textContent = String(reservations.length);
  document.querySelector('#stat-reservations-label').textContent = admin ? 'Reservas totales' : 'Mis reservas';
  const list = document.querySelector('#recent-reservations');
  list.replaceChildren();
  const recent = reservations.slice().reverse().slice(0, 5);
  if (!recent.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Todavía no hay reservas.';
    list.append(empty);
  }
  recent.forEach((reservation) => {
    const card = document.createElement('article');
    const state = reservationState(reservation);
    card.className = `reservation-card state-${state.toLowerCase().replace(' ', '-')}`;
    const description = document.createElement('div');
    const heading = document.createElement('h4');
    heading.textContent = reservation.habitacion;
    const details = document.createElement('p');
    details.textContent = `${formatDate(reservation.entrada)} → ${formatDate(reservation.salida)} · $${reservation.total}${admin ? ` · ${reservation.correo}` : ''}`;
    const badge = document.createElement('span');
    badge.className = 'reservation-state';
    badge.textContent = state;
    description.append(heading, details);
    card.append(description, badge);
    list.append(card);
  });
}

function renderUsers() {
  if (!isAdministrator()) return;
  const query = document.querySelector('#users-search').value.trim().toLocaleLowerCase('es');
  const role = document.querySelector('#users-role-filter').value;
  const status = document.querySelector('#users-status-filter').value;
  const users = getUsers().filter((user) =>
    `${user.nombre} ${user.correo}`.toLocaleLowerCase('es').includes(query) &&
    (!role || user.rol === role) && (!status || user.estado === status));
  const pages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  usersPage = Math.min(usersPage, pages);
  const body = document.querySelector('#users-table-body');
  body.replaceChildren();
  users.slice((usersPage - 1) * USERS_PER_PAGE, usersPage * USERS_PER_PAGE).forEach((user) => {
    const row = document.createElement('tr');
    const date = user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString('es') : 'No disponible';
    [user.nombre, user.correo, user.rol === 'administrador' ? 'Administrador' : 'Usuario', user.estado === 'activo' ? 'Activo' : 'Inactivo', date].forEach((value, index) => {
      const cell = document.createElement('td');
      const text = document.createElement(index === 3 ? 'span' : 'div');
      text.textContent = value;
      if (index === 3) text.className = `user-state ${user.estado}`;
      cell.append(text);
      row.append(cell);
    });
    const actions = document.createElement('td');
    const buttons = document.createElement('div');
    buttons.className = 'quick-actions';
    ['Editar', 'Eliminar'].forEach((label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ghost-button${label === 'Eliminar' ? ' danger' : ''}`;
      button.textContent = label;
      button.setAttribute('aria-label', `${label} a ${user.nombre}`);
      button.addEventListener('click', () => label === 'Editar' ? openUserForm(user.correo) : askUserDeletion(user.correo));
      buttons.append(button);
    });
    actions.append(buttons);
    row.append(actions);
    body.append(row);
  });
  document.querySelector('#users-empty').classList.toggle('hidden', users.length > 0);
  document.querySelector('#users-page-info').textContent = `Página ${usersPage} de ${pages} · ${users.length} usuario(s)`;
  document.querySelector('#users-previous').disabled = usersPage === 1;
  document.querySelector('#users-next').disabled = usersPage === pages;
}

function openUserForm(email = null) {
  if (!requireAdministrator()) return;
  editingUserEmail = email;
  userForm.reset();
  clearMessages(userForm);
  setUsersMessage('');
  const user = email ? getUsers().find((candidate) => candidate.correo === email) : null;
  if (email && !user) {
    setUsersMessage('El usuario ya no existe. Actualiza la lista.');
    renderUsers();
    return;
  }
  document.querySelector('#user-form-title').textContent = user ? 'Editar usuario' : 'Nuevo usuario';
  if (user) {
    ['nombre', 'correo', 'rol', 'estado'].forEach((field) => { userForm.elements[field].value = user[field]; });
  }
  const self = user?.correo === currentUser.correo;
  userForm.elements.rol.disabled = self;
  userForm.elements.estado.disabled = self;
  userForm.elements.password.required = !user;
  userForm.classList.remove('hidden');
  userForm.elements.nombre.focus();
}

function persistUserChanges(users, reservations = null, session = null) {
  const previousUsers = localStorage.getItem(USERS_KEY);
  const previousReservations = localStorage.getItem(RESERVATIONS_KEY);
  const previousSession = localStorage.getItem(SESSION_USER_KEY);
  try {
    if (reservations) saveReservations(reservations);
    saveUsers(users);
    if (session) localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('No se pudieron guardar los cambios de usuarios.', error);
    try {
      if (previousUsers === null) localStorage.removeItem(USERS_KEY);
      else localStorage.setItem(USERS_KEY, previousUsers);
      if (reservations) {
        if (previousReservations === null) localStorage.removeItem(RESERVATIONS_KEY);
        else localStorage.setItem(RESERVATIONS_KEY, previousReservations);
      }
      if (session) {
        if (previousSession === null) localStorage.removeItem(SESSION_USER_KEY);
        else localStorage.setItem(SESSION_USER_KEY, previousSession);
      }
    } catch (rollbackError) {
      console.error('No se pudieron restaurar los datos locales.', rollbackError);
      setUsersMessage('Error de almacenamiento y restauración. Revisa los datos antes de continuar.');
      return false;
    }
    setUsersMessage('No se guardaron los cambios. Comprueba el espacio y los permisos de almacenamiento del navegador.');
    return false;
  }
}

function saveManagedUser(event) {
  event.preventDefault();
  if (!requireAdministrator()) return;
  clearMessages(userForm);
  setUsersMessage('');
  const name = userForm.elements.nombre.value.trim();
  const email = userForm.elements.correo.value.trim().toLowerCase();
  const password = userForm.elements.password.value;
  const role = userForm.elements.rol.value;
  const status = userForm.elements.estado.value;
  const users = getUsers();
  const existing = users.find((user) => user.correo === editingUserEmail);
  let valid = true;
  if (!name) { setError('user-name', 'Escribe el nombre completo.'); valid = false; }
  if (!emailPattern.test(email)) { setError('user-email', 'Introduce un correo válido.'); valid = false; }
  if (users.some((user) => user.correo === email && user.correo !== editingUserEmail)) {
    setError('user-email', 'Ya existe una cuenta con este correo.'); valid = false;
  }
  if ((!editingUserEmail || password) && !validAccountPassword(email, password, role)) {
    setError('user-password', 'Usa 8 caracteres, mayúscula, minúscula, número y símbolo.'); valid = false;
  }
  if (!valid) return;
  if (editingUserEmail && !existing) { setUsersMessage('El usuario ya no existe.'); return; }
  if (!['administrador', 'usuario'].includes(role) || !['activo', 'inactivo'].includes(status)) {
    setUsersMessage('Selecciona un rol y un estado válidos.'); return;
  }
  if (existing?.correo === currentUser.correo && (role !== existing.rol || status !== 'activo')) {
    setUsersMessage('No puedes cambiar tu propio rol ni desactivar tu cuenta.'); return;
  }
  if (existing?.rol === 'administrador' && existing.estado === 'activo' &&
      (role !== 'administrador' || status !== 'activo') &&
      !users.some((user) => user.correo !== existing.correo && user.rol === 'administrador' && user.estado === 'activo')) {
    setUsersMessage('Debe quedar al menos un administrador activo.'); return;
  }
  const updated = {
    ...(existing || { telefono: '', intentosFallidos: 0, bloqueadoHasta: 0, fechaRegistro: new Date().toISOString() }),
    nombre: name, correo: email, rol: role, estado: status,
    password: password || existing.password,
  };
  const nextUsers = existing ? users.map((user) => user.correo === existing.correo ? updated : user) : [...users, updated];
  const reservations = existing && existing.correo !== email
    ? getReservations().map((reservation) => reservation.correo === existing.correo ? { ...reservation, correo: email } : reservation)
    : null;
  const self = existing?.correo === currentUser.correo;
  if (!persistUserChanges(nextUsers, reservations, self ? { correo: email, nombre: name } : null)) return;
  if (self) {
    currentUser = updated;
    bookingUserName.textContent = `Hola, ${name}`;
  }
  userForm.classList.add('hidden');
  editingUserEmail = null;
  renderUsers();
  setUsersMessage(existing ? 'Usuario actualizado.' : 'Usuario creado.', true);
}

function userDeletionError(user) {
  if (!user) return 'El usuario ya no existe.';
  if (user.correo === currentUser.correo) return 'No puedes eliminar tu propia cuenta.';
  if (user.rol === 'administrador' && user.estado === 'activo' &&
      !getUsers().some((candidate) => candidate.correo !== user.correo && candidate.rol === 'administrador' && candidate.estado === 'activo')) {
    return 'Debe quedar al menos un administrador activo.';
  }
  if (getReservations().some((reservation) => reservation.correo === user.correo)) {
    return 'Este usuario tiene reservas. Puedes desactivarlo, pero no eliminarlo para conservar su historial.';
  }
  return '';
}

function askUserDeletion(email) {
  if (!requireAdministrator()) return;
  const user = getUsers().find((candidate) => candidate.correo === email);
  const error = userDeletionError(user);
  if (error) { setUsersMessage(error); return; }
  deletingUserEmail = email;
  document.querySelector('#delete-user-description').textContent = `¿Eliminar definitivamente a ${user.nombre} (${user.correo})? Esta acción no se puede deshacer.`;
  deleteUserDialog.showModal();
}

function confirmUserDeletion() {
  if (!requireAdministrator()) return;
  const users = getUsers();
  const user = users.find((candidate) => candidate.correo === deletingUserEmail);
  const error = userDeletionError(user);
  deleteUserDialog.close();
  if (error) { setUsersMessage(error); return; }
  if (!persistUserChanges(users.filter((candidate) => candidate.correo !== user.correo))) return;
  if (editingUserEmail === user.correo) {
    userForm.classList.add('hidden');
    editingUserEmail = null;
  }
  deletingUserEmail = null;
  renderUsers();
  setUsersMessage('Usuario eliminado.', true);
}

function bindManagementEvents() {
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => navigateTo(button.dataset.page));
  });
  document.querySelector('#new-user').addEventListener('click', () => openUserForm());
  document.querySelector('#cancel-user-edit').addEventListener('click', () => {
    userForm.classList.add('hidden');
    editingUserEmail = null;
    setUsersMessage('');
  });
  userForm.addEventListener('submit', saveManagedUser);
  ['users-search', 'users-role-filter', 'users-status-filter'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => { usersPage = 1; renderUsers(); });
  });
  document.querySelector('#users-previous').addEventListener('click', () => { usersPage -= 1; renderUsers(); });
  document.querySelector('#users-next').addEventListener('click', () => { usersPage += 1; renderUsers(); });
  document.querySelector('#confirm-user-delete').addEventListener('click', confirmUserDeletion);
  document.querySelector('#abort-user-delete').addEventListener('click', () => deleteUserDialog.close());
  deleteUserDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      deleteUserDialog.close();
    }
  });
  deleteUserDialog.addEventListener('close', () => { deletingUserEmail = null; });
  window.addEventListener('storage', (event) => {
    if (!currentUser || ![USERS_KEY, RESERVATIONS_KEY, SERVICES_KEY, SESSION_KEY, SESSION_USER_KEY, null].includes(event.key)) return;
    if (!localStorage.getItem(SESSION_KEY)) { logout(); return; }
    userForm.classList.add('hidden');
    editingUserEmail = null;
    deleteUserDialog.close();
    closeServiceEditor();
    deleteServiceDialog.close();
    navigateTo(activePage);
  });
}

const serviceForm = document.querySelector('#service-form');
const servicesMessage = document.querySelector('#services-message');
const deleteServiceDialog = document.querySelector('#delete-service-dialog');
let editingServiceId = null;
let deletingServiceId = null;
let serviceImageData = '';
let imageReader = null;
let imageLoading = false;
let imageError = '';

function setServicesMessage(message, success = false) {
  servicesMessage.textContent = message;
  servicesMessage.className = `global-message${success ? ' success' : ''}`;
}

function serviceImage(service) {
  const image = document.createElement('img');
  image.className = 'service-image';
  image.src = service.imagen;
  image.alt = service.nombre;
  image.loading = 'lazy';
  return image;
}

function renderServices() {
  if (!isAdministrator()) return;
  const query = document.querySelector('#services-search').value.trim().toLocaleLowerCase('es');
  const status = document.querySelector('#services-status-filter').value;
  const services = getRooms().filter((service) =>
    (!status || service.estado === status) &&
    `${service.nombre} ${service.detalle} ${service.categoria}`.toLocaleLowerCase('es').includes(query));
  const list = document.querySelector('#service-list');
  list.replaceChildren();
  if (!services.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No hay servicios que coincidan con los filtros.';
    list.append(empty);
  }
  services.forEach((service) => {
    const card = document.createElement('article');
    card.className = 'room-card service-card';
    if (service.imagen) card.append(serviceImage(service));
    const title = document.createElement('h3');
    title.textContent = service.nombre;
    const description = document.createElement('p');
    description.className = 'room-detail';
    description.textContent = service.detalle;
    const meta = document.createElement('p');
    meta.className = 'room-meta';
    meta.textContent = `${service.categoria} · Mínimo ${service.duracion} noche(s) · Hasta ${service.capacidad} huéspedes`;
    const price = document.createElement('strong');
    price.className = 'room-price';
    price.textContent = `$${service.precio.toFixed(2)} por noche`;
    const state = document.createElement('span');
    state.className = `user-state ${service.estado === 'disponible' ? 'activo' : 'inactivo'}`;
    state.textContent = service.estado === 'disponible' ? 'Disponible' : 'Inactivo';
    const actions = document.createElement('div');
    actions.className = 'quick-actions';
    ['Editar', 'Eliminar'].forEach((label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ghost-button${label === 'Eliminar' ? ' danger' : ''}`;
      button.textContent = label;
      button.setAttribute('aria-label', `${label} servicio ${service.nombre}`);
      button.addEventListener('click', () => label === 'Editar' ? openServiceForm(service.id) : askServiceDeletion(service.id));
      actions.append(button);
    });
    card.append(title, description, meta, price, state, actions);
    list.append(card);
  });
}

function clearServiceImage() {
  if (imageReader?.readyState === FileReader.LOADING) imageReader.abort();
  imageReader = null;
  imageLoading = false;
  imageError = '';
  serviceImageData = '';
  document.querySelector('#service-image').value = '';
  const preview = document.querySelector('#service-image-preview');
  preview.removeAttribute('src');
  preview.classList.add('hidden');
}

function closeServiceEditor() {
  clearServiceImage();
  serviceForm.classList.add('hidden');
  editingServiceId = null;
}

function openServiceForm(id = null) {
  if (!requireAdministrator()) return;
  closeServiceEditor();
  serviceForm.reset();
  clearMessages(serviceForm);
  setServicesMessage('');
  const service = id ? getRooms().find((candidate) => candidate.id === id) : null;
  if (id && !service) { setServicesMessage('El servicio ya no existe.'); renderServices(); return; }
  editingServiceId = id;
  document.querySelector('#service-form-title').textContent = service ? 'Editar servicio' : 'Nuevo servicio';
  if (service) {
    ['nombre', 'detalle', 'precio', 'duracion', 'capacidad', 'categoria', 'estado'].forEach((field) => {
      serviceForm.elements[field].value = service[field];
    });
    serviceImageData = service.imagen;
    if (serviceImageData) {
      document.querySelector('#service-image-preview').src = serviceImageData;
      document.querySelector('#service-image-preview').classList.remove('hidden');
    }
  } else {
    serviceForm.elements.duracion.value = '1';
    serviceForm.elements.capacidad.value = '2';
  }
  serviceForm.classList.remove('hidden');
  serviceForm.elements.nombre.focus();
}

function readServiceImage() {
  const file = document.querySelector('#service-image').files[0];
  clearServiceImage();
  document.querySelector('[data-error-for="service-image"]').textContent = '';
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
    imageError = 'Selecciona PNG, JPEG o WebP de hasta 1 MB.';
    setError('service-image', imageError);
    return;
  }
  const reader = new FileReader();
  imageReader = reader;
  imageLoading = true;
  reader.addEventListener('load', () => {
    if (imageReader !== reader) return;
    imageLoading = false;
    serviceImageData = String(reader.result);
    const preview = document.querySelector('#service-image-preview');
    preview.src = serviceImageData;
    preview.classList.remove('hidden');
  });
  reader.addEventListener('error', () => {
    imageLoading = false;
    console.error('No se pudo leer la imagen del servicio.', reader.error);
    imageError = 'No se pudo leer la imagen. Selecciona otro archivo.';
    setError('service-image', imageError);
  });
  reader.readAsDataURL(file);
}

function saveServices(services) {
  try {
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
    return true;
  } catch (error) {
    console.error('No se pudieron guardar los servicios.', error);
    setServicesMessage('No se guardaron los cambios. Comprueba el almacenamiento del navegador o reduce el tamaño de las imágenes.');
    return false;
  }
}

function saveManagedService(event) {
  event.preventDefault();
  if (!requireAdministrator()) return;
  clearMessages(serviceForm);
  setServicesMessage('');
  if (imageError) { setError('service-image', imageError); return; }
  if (imageLoading) { setServicesMessage('Espera a que termine de cargarse la imagen.'); return; }
  const fields = serviceForm.elements;
  const nombre = fields.nombre.value.trim();
  const detalle = fields.detalle.value.trim();
  const categoria = fields.categoria.value.trim();
  const precio = Number(fields.precio.value);
  const duracion = Number(fields.duracion.value);
  const capacidad = Number(fields.capacidad.value);
  const estado = fields.estado.value;
  let valid = true;
  const errors = [
    ['service-name', !nombre || nombre.length > 100, 'Escribe un nombre de hasta 100 caracteres.'],
    ['service-description', !detalle || detalle.length > 500, 'Escribe una descripción de hasta 500 caracteres.'],
    ['service-category', !categoria || categoria.length > 60, 'Escribe una categoría de hasta 60 caracteres.'],
    ['service-price', !Number.isFinite(precio) || precio < 0.01 || precio > 1000000 || Math.abs(precio * 100 - Math.round(precio * 100)) > 0.000001, 'Introduce un precio entre 0.01 y 1000000, con hasta dos decimales.'],
    ['service-duration', !Number.isInteger(duracion) || duracion < 1 || duracion > 365, 'Introduce entre 1 y 365 noches completas.'],
    ['service-capacity', !Number.isInteger(capacidad) || capacidad < 1 || capacidad > 4, 'Introduce entre 1 y 4 huéspedes.'],
  ];
  errors.forEach(([id, invalid, message]) => { if (invalid) { setError(id, message); valid = false; } });
  if (!valid) return;
  if (!['disponible', 'inactivo'].includes(estado)) { setServicesMessage('Selecciona un estado válido.'); return; }
  const services = getRooms();
  const existing = services.find((service) => service.id === editingServiceId);
  if (editingServiceId && !existing) { setServicesMessage('El servicio ya no existe.'); return; }
  if (services.some((service) => service.id !== editingServiceId && service.nombre.toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'))) {
    setError('service-name', 'Ya existe un servicio con este nombre.');
    return;
  }
  const updated = { id: existing?.id || crypto.randomUUID(), nombre, detalle, categoria, precio, duracion, capacidad, estado, imagen: serviceImageData };
  const next = existing ? services.map((service) => service.id === existing.id ? updated : service) : [...services, updated];
  if (!saveServices(next)) return;
  closeServiceEditor();
  renderServices();
  setServicesMessage(existing ? 'Servicio actualizado. Las reservas existentes conservan sus datos; al editarlas se aplican las condiciones actuales.' : 'Servicio creado.', true);
}

function askServiceDeletion(id) {
  if (!requireAdministrator()) return;
  const service = getRooms().find((candidate) => candidate.id === id);
  if (!service) { setServicesMessage('El servicio ya no existe.'); renderServices(); return; }
  if (getReservations().some((reservation) => reservation.habitacionId === id)) {
    setServicesMessage('Este servicio tiene reservas. Puedes desactivarlo, pero no eliminarlo para conservar el historial.');
    return;
  }
  deletingServiceId = id;
  document.querySelector('#delete-service-description').textContent = `¿Eliminar definitivamente ${service.nombre}? Esta acción no se puede deshacer.`;
  deleteServiceDialog.showModal();
}

function confirmServiceDeletion() {
  if (!requireAdministrator()) return;
  const id = deletingServiceId;
  deleteServiceDialog.close();
  const services = getRooms();
  if (!services.some((service) => service.id === id)) { setServicesMessage('El servicio ya no existe.'); return; }
  if (getReservations().some((reservation) => reservation.habitacionId === id)) {
    setServicesMessage('El servicio ahora tiene reservas. Desactívalo en lugar de eliminarlo.');
    return;
  }
  if (!saveServices(services.filter((service) => service.id !== id))) return;
  if (editingServiceId === id) closeServiceEditor();
  renderServices();
  setServicesMessage('Servicio eliminado.', true);
}

function bindServiceEvents() {
  document.querySelector('#new-service').addEventListener('click', () => openServiceForm());
  document.querySelector('#cancel-service-edit').addEventListener('click', closeServiceEditor);
  serviceForm.addEventListener('submit', saveManagedService);
  document.querySelector('#service-image').addEventListener('change', readServiceImage);
  document.querySelector('#remove-service-image').addEventListener('click', () => {
    clearServiceImage();
    document.querySelector('[data-error-for="service-image"]').textContent = '';
  });
  ['services-search', 'services-status-filter'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderServices);
  });
  document.querySelector('#confirm-service-delete').addEventListener('click', confirmServiceDeletion);
  document.querySelector('#abort-service-delete').addEventListener('click', () => deleteServiceDialog.close());
  deleteServiceDialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); deleteServiceDialog.close(); }
  });
  deleteServiceDialog.addEventListener('close', () => { deletingServiceId = null; });
}

bindEvents();
bindManagementEvents();
bindServiceEvents();
initializeDemoAdministrator();
initializeSession();
