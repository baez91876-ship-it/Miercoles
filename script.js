const USERS_KEY = 'usuarios';
const SESSION_KEY = 'session_token';
const SESSION_USER_KEY = 'session_user';
const RESERVATIONS_KEY = 'reservas';
const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 15 * 60 * 1000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const ROOMS = [
  { id: 'std', nombre: 'Habitación Estándar', capacidad: 2, precio: 890, detalle: 'Cama queen, escritorio y wifi de alta velocidad.' },
  { id: 'dbl', nombre: 'Habitación Doble', capacidad: 3, precio: 1150, detalle: 'Dos camas matrimoniales y vista a la ciudad.' },
  { id: 'jr', nombre: 'Suite Junior', capacidad: 4, precio: 1620, detalle: 'Sala independiente, terraza y desayuno incluido.' },
  { id: 'ste', nombre: 'Suite Premium', capacidad: 4, precio: 2340, detalle: 'Jacuzzi, servicio a la habitación 24 h y check-out tardío.' },
];

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

  ROOMS.forEach((room) => {
    const fitsGuests = room.capacidad >= guests;
    const taken = criteria.valid && isRoomTaken(room.id, criteria.checkin, criteria.checkout, reservations);
    const nights = criteria.valid ? nightsBetween(criteria.checkin, criteria.checkout) : 1;
    const available = criteria.valid && fitsGuests && !taken;
    const tag = !criteria.valid
      ? 'Elige fechas'
      : taken
        ? 'Ocupada'
        : fitsGuests
          ? 'Disponible'
          : 'Capacidad insuficiente';

    const card = document.createElement('article');
    card.className = `room-card${available ? '' : ' unavailable'}`;
    card.innerHTML = `
      <div class="room-top">
        <h4>${room.nombre}</h4>
        <span class="room-tag">${tag}</span>
      </div>
      <p class="room-detail">${room.detalle}</p>
      <p class="room-meta">Hasta ${room.capacidad} huéspedes · ${criteria.valid ? `${nights} noche(s)` : 'sin fechas'}</p>
      <div class="room-bottom">
        <span class="room-price">$${room.precio * nights} <small>${criteria.valid ? 'total' : 'por noche'}</small></span>
        <button class="room-button" type="button" data-room="${room.id}" ${available ? '' : 'disabled'}>Reservar</button>
      </div>
    `;

    roomList.append(card);
  });
}

function renderReservations() {
  const reservations = getReservations().filter((reservation) => reservation.correo === currentUser?.correo);
  const today = toISODate(new Date());

  reservationList.innerHTML = '';
  reservationCount.textContent = String(reservations.length);
  clearReservationsButton.classList.toggle('hidden', reservations.length === 0);
  clearReservationsButton.dataset.confirming = 'false';
  clearReservationsButton.textContent = 'Eliminar todas';

  if (!reservations.length) {
    reservationList.innerHTML = '<p class="empty-state">Todavía no tienes reservas.</p>';
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
                ${ROOMS.map(
                  (room) =>
                    `<option value="${room.id}"${room.id === reservation.habitacionId ? ' selected' : ''}>${room.nombre}</option>`,
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
        const estado =
          reservation.salida <= today ? 'Finalizada' : reservation.entrada <= today ? 'En curso' : 'Próxima';
        const confirming = reservation.id === pendingDeleteId;

        item.classList.add(`state-${estado.toLowerCase().replace(' ', '-')}`);
        item.innerHTML = `
          <div>
            <div class="reservation-title">
              <h4>${reservation.habitacion}</h4>
              <span class="reservation-state">${estado}</span>
            </div>
            <p>${formatDate(reservation.entrada)} → ${formatDate(reservation.salida)} · ${nights} noche(s) · ${reservation.huespedes} huésped(es)</p>
            <p class="reservation-code">Código ${reservation.id.toUpperCase()}</p>
          </div>
          <div class="reservation-actions">
            <span class="room-price">$${reservation.total}</span>
            <button class="ghost-button" type="button" data-edit="${reservation.id}">Editar</button>
            ${
              confirming
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
  editingReservationId = reservationId;
  pendingDeleteId = null;
  setBookingMessage('');
  renderReservations();
}

function saveEditedReservation(reservationId, form) {
  const roomId = form.elements.room.value;
  const checkin = form.elements.checkin.value;
  const checkout = form.elements.checkout.value;
  const guests = Number(form.elements.guests.value);
  const room = ROOMS.find((candidate) => candidate.id === roomId);

  if (!checkin || !checkout) {
    setBookingMessage('Selecciona las fechas de entrada y salida.');
    return;
  }

  const nights = nightsBetween(checkin, checkout);

  if (nights < 1) {
    setBookingMessage('La salida debe ser posterior a la entrada.');
    return;
  }

  if (room.capacidad < guests) {
    setBookingMessage(`${room.nombre} admite como máximo ${room.capacidad} huéspedes.`);
    return;
  }

  const reservations = getReservations();

  if (isRoomTaken(roomId, checkin, checkout, reservations, reservationId)) {
    setBookingMessage('Esa habitación ya está ocupada en esas fechas.');
    return;
  }

  const reservation = reservations.find((candidate) => candidate.id === reservationId);
  Object.assign(reservation, {
    habitacionId: room.id,
    habitacion: room.nombre,
    entrada: checkin,
    salida: checkout,
    huespedes: guests,
    total: room.precio * nights,
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

  const room = ROOMS.find((candidate) => candidate.id === roomId);
  const reservations = getReservations();

  if (!room || isRoomTaken(roomId, criteria.checkin, criteria.checkout, reservations)) {
    setBookingMessage('Esa habitación ya no está disponible en esas fechas.');
    renderRooms();
    return;
  }

  const nights = nightsBetween(criteria.checkin, criteria.checkout);

  reservations.push({
    id: `${roomId}-${Date.now()}`,
    correo: currentUser.correo,
    habitacionId: room.id,
    habitacion: room.nombre,
    entrada: criteria.checkin,
    salida: criteria.checkout,
    huespedes: criteria.guests,
    total: room.precio * nights,
  });

  saveReservations(reservations);
  setBookingMessage(`Reserva confirmada: ${room.nombre}.`, true);
  renderRooms();
  renderReservations();
}

function cancelReservation(reservationId) {
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
  pendingDeleteId = reservationId;
  editingReservationId = null;
  setBookingMessage('Confirma para eliminar la reserva definitivamente.');
  renderReservations();
}

function deleteAllReservations() {
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
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
  currentUser = null;
  bookingScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
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
      clearReservationsButton.textContent = 'Eliminar todas';
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
    showBookingScreen(session);
  }
}

bindEvents();
initializeSession();

