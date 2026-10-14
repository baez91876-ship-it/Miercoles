const SESSION_KEY = 'session_token';
const USERS_PER_PAGE = 5;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const API_BASE_URL = window.HOTEL_API_BASE_URL || '';
const apiState = { users: [], services: [], reservations: [], stats: null };

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem(SESSION_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(body.detail)
      ? body.detail.map((item) => item.msg).join(' ')
      : body.detail || `Error HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return body;
}

function displayApiError(error, target = setMessage) {
  console.error('Falló la solicitud al backend.', error);
  target(error instanceof Error ? error.message : 'No se pudo completar la solicitud.');
}

function getRooms() {
  return apiState.services;
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
const bookingModeInput = document.querySelector('#booking-mode');
const checkinInput = document.querySelector('#search-checkin');
const checkoutInput = document.querySelector('#search-checkout');
const appointmentStartInput = document.querySelector('#search-start-time');
const appointmentEndInput = document.querySelector('#search-end-time');
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
  return apiState.users;
}

function validAccountPassword(password) {
  return passwordPattern.test(password);
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

  if (!validAccountPassword(password)) {
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

async function handleRegistrationSubmit(event) {
  event.preventDefault();
  clearMessages(registerForm);

  const result = validateRegistration();
  if (!result.valid) {
    return;
  }

  try {
    await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nombre: result.name,
        correo: result.email,
        telefono: result.phone,
        password: result.password,
      }),
    });
    registerForm.reset();
    switchView('login');
    setMessage('Cuenta creada. Ya puedes iniciar sesión.', true);
  } catch (error) {
    if (error.message.includes('correo')) {
      setError('register-email', error.message);
    } else {
      displayApiError(error);
    }
  }
}

async function handleLoginSubmit(event) {
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

  try {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo: email, password }),
    });
    localStorage.setItem(SESSION_KEY, result.access_token);
    loginForm.reset();
    await showBookingScreen(result.usuario);
  } catch (error) {
    setError('login-password', error.message);
    setMessage(error.message);
  }
}

/* Reservas */

let currentUser = null;
let editingReservationId = null;
let pendingDeleteId = null;

function getReservations() {
  return apiState.reservations;
}

async function refreshApiData() {
  const [services, reservations, stats] = await Promise.all([
    apiRequest('/api/services'),
    apiRequest('/api/reservations'),
    apiRequest('/api/stats'),
  ]);
  apiState.services = services.items;
  apiState.reservations = reservations.items;
  apiState.stats = stats;
  apiState.users = isAdministrator()
    ? (await apiRequest('/api/users?limit=100')).items
    : [currentUser];
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addCalendarDays(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  return toISODate(new Date(year, month - 1, day + days));
}

function dateForInput(value) {
  return toISODate(new Date(value));
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
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  checkinInput.min = toISODate(today);
  checkoutInput.min = bookingModeInput.value === 'noches' ? toISODate(tomorrow) : toISODate(today);
}

function updateBookingMode() {
  const isAppointment = bookingModeInput.value === 'horario';
  document.querySelectorAll('.appointment-time').forEach((field) => field.classList.toggle('hidden', !isAppointment));
  document.querySelector('#start-date-label').textContent = isAppointment ? 'Fecha de inicio *' : 'Entrada *';
  document.querySelector('#end-date-label').textContent = isAppointment ? 'Fecha de fin *' : 'Salida *';
  appointmentStartInput.required = isAppointment;
  appointmentEndInput.required = isAppointment;
  checkoutInput.min = isAppointment
    ? (checkinInput.value || toISODate(new Date()))
    : addCalendarDays(toISODate(new Date()), 1);
  if (!isAppointment && checkinInput.value && checkoutInput.value <= checkinInput.value) {
    checkoutInput.value = addCalendarDays(checkinInput.value, 1);
  }
  renderRooms();
}

function getSearchCriteria() {
  const checkin = checkinInput.value;
  const checkout = checkoutInput.value;
  const guests = Number(guestsInput.value);
  const today = toISODate(new Date());
  const modalidad = bookingModeInput.value;

  if (!checkin || !checkout) {
    return { valid: false, error: 'Selecciona la fecha de inicio y fin para reservar.' };
  }

  if (modalidad === 'noches' && checkin < today) {
    return { valid: false, error: 'La fecha de entrada no puede ser anterior a hoy.' };
  }

  if (modalidad === 'noches') {
    if (nightsBetween(checkin, checkout) < 1) {
      return { valid: false, error: 'La salida debe ser posterior a la entrada.' };
    }
    return { valid: true, modalidad, checkin, checkout, guests };
  }

  const startTime = appointmentStartInput.value;
  const endTime = appointmentEndInput.value;
  if (!startTime || !endTime) return { valid: false, error: 'Selecciona la hora de inicio y fin de la cita.' };
  const start = new Date(`${checkin}T${startTime}`);
  const end = new Date(`${checkout}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start <= new Date() || end <= start) {
    return { valid: false, error: 'La cita debe comenzar en el futuro y terminar después de su inicio.' };
  }
  return {
    valid: true,
    modalidad,
    checkin,
    checkout,
    start: start.toISOString(),
    end: end.toISOString(),
    guests,
  };
}

function reservationInterval(reservation) {
  if (reservation.modalidad === 'horario') {
    return [Date.parse(reservation.inicio), Date.parse(reservation.fin)];
  }
  return [
    Date.parse(`${reservation.entrada}T00:00:00Z`),
    Date.parse(`${reservation.salida}T00:00:00Z`),
  ];
}

function isRoomTaken(roomId, criteria, reservations, ignoreId) {
  const candidateStart = criteria.modalidad === 'horario'
    ? Date.parse(criteria.start)
    : Date.parse(`${criteria.checkin}T00:00:00Z`);
  const candidateEnd = criteria.modalidad === 'horario'
    ? Date.parse(criteria.end)
    : Date.parse(`${criteria.checkout}T00:00:00Z`);
  return reservations.some((reservation) => {
    if ((reservation.servicioId || reservation.habitacionId) !== roomId || reservation.id === ignoreId) return false;
    const [start, end] = reservationInterval(reservation);
    return candidateStart < end && candidateEnd > start;
  });
}

function renderRooms() {
  const criteria = getSearchCriteria();
  const reservations = getReservations();
  const guests = Number(guestsInput.value);

  roomList.innerHTML = '';

  getRooms().filter((room) => room.estado === 'disponible').forEach((room) => {
    const fitsGuests = room.capacidad >= guests;
    const taken = criteria.valid && isRoomTaken(room.id, criteria, reservations);
    const nights = criteria.valid && criteria.modalidad === 'noches' ? nightsBetween(criteria.checkin, criteria.checkout) : 1;
    const fitsDuration = criteria.modalidad !== 'noches' || nights >= room.duracion;
    const locallyAvailable = criteria.valid && fitsGuests && fitsDuration && !taken;
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
    card.className = `room-card${locallyAvailable ? '' : ' unavailable'}`;
    card.innerHTML = `
      <div class="room-top">
        <h4>${escapeHTML(room.nombre)}</h4>
        <span class="room-tag">${tag}</span>
      </div>
      <p class="room-detail">${escapeHTML(room.detalle)}</p>
      <p class="room-meta">Hasta ${room.capacidad} huéspedes · ${criteria.modalidad === 'noches' ? `Mínimo ${room.duracion} noche(s)` : 'Reserva por horario'}</p>
      <div class="room-bottom">
        <span class="room-price">$${Math.round(room.precio * nights * 100) / 100} <small>${criteria.modalidad === 'horario' ? 'por cita' : criteria.valid ? 'total' : 'por noche'}</small></span>
        <button class="room-button" type="button" data-room="${escapeHTML(room.id)}" disabled>${locallyAvailable ? 'Comprobando…' : 'Reservar'}</button>
      </div>
    `;

    roomList.append(card);
    if (room.imagen) card.prepend(serviceImage(room));
    if (locallyAvailable) checkRoomAvailability(room.id, criteria, card);
  });
  if (!roomList.children.length) roomList.innerHTML = '<p class="empty-state">No hay servicios disponibles.</p>';
}

async function checkRoomAvailability(roomId, criteria, card) {
  const params = new URLSearchParams({ servicio_id: roomId, modalidad: criteria.modalidad });
  if (criteria.modalidad === 'noches') {
    params.set('entrada', criteria.checkin);
    params.set('salida', criteria.checkout);
  } else {
    params.set('inicio', criteria.start);
    params.set('fin', criteria.end);
  }
  const button = card.querySelector('[data-room]');
  const tag = card.querySelector('.room-tag');
  try {
    await apiRequest(`/api/reservations/availability?${params}`);
    if (!button.isConnected) return;
    button.disabled = false;
    button.textContent = 'Reservar';
    tag.textContent = 'Disponible';
    card.classList.remove('unavailable');
  } catch (error) {
    if (!button.isConnected) return;
    if (error.message.includes('reservado') || error.message.includes('ocupada') || error.message.includes('ocupado')) {
      button.disabled = true;
      button.textContent = 'No disponible';
      tag.textContent = 'Ocupada';
      card.classList.add('unavailable');
      return;
    }
    displayApiError(error, setBookingMessage);
  }
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
    .sort((a, b) => String(a.inicio || a.entrada).localeCompare(String(b.inicio || b.entrada)))
    .forEach((reservation) => {
      const item = document.createElement('article');
      item.className = 'reservation-card';

      if (reservation.id === editingReservationId) {
        item.classList.add('editing');
        item.innerHTML = `
          <form class="reservation-edit" data-save="${reservation.id}" novalidate>
            <div class="field">
              <label for="edit-mode">Tipo de reserva</label>
              <select id="edit-mode" name="modalidad">
                <option value="noches"${reservation.modalidad !== 'horario' ? ' selected' : ''}>Por noches</option>
                <option value="horario"${reservation.modalidad === 'horario' ? ' selected' : ''}>Por horario</option>
              </select>
            </div>
            <div class="field">
              <label for="edit-room">Habitación</label>
              <select id="edit-room" name="room">
                ${getRooms().filter((room) => room.estado === 'disponible' || room.id === (reservation.servicioId || reservation.habitacionId)).map(
                  (room) =>
                    `<option value="${escapeHTML(room.id)}"${room.id === (reservation.servicioId || reservation.habitacionId) ? ' selected' : ''}>${escapeHTML(room.nombre)}${room.estado === 'inactivo' ? ' (inactivo)' : ''}</option>`,
                ).join('')}
              </select>
            </div>
            <div class="field">
              <label for="edit-checkin">Fecha de inicio / entrada *</label>
              <input id="edit-checkin" name="checkin" type="date" value="${reservation.modalidad === 'horario' ? dateForInput(reservation.inicio) : reservation.entrada}" required />
            </div>
            <div class="field">
              <label for="edit-checkout">Fecha de fin / salida *</label>
              <input id="edit-checkout" name="checkout" type="date" value="${reservation.modalidad === 'horario' ? dateForInput(reservation.fin) : reservation.salida}" required />
            </div>
            <div class="field">
              <label for="edit-start-time">Hora de inicio (para horario)</label>
              <input id="edit-start-time" name="startTime" type="time" value="${reservation.inicio ? new Date(reservation.inicio).toTimeString().slice(0, 5) : ''}" />
            </div>
            <div class="field">
              <label for="edit-end-time">Hora de fin (para horario)</label>
              <input id="edit-end-time" name="endTime" type="time" value="${reservation.fin ? new Date(reservation.fin).toTimeString().slice(0, 5) : ''}" />
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
        const nights = reservation.modalidad === 'horario' ? 0 : nightsBetween(reservation.entrada, reservation.salida);
        const dateLabel = reservation.modalidad === 'horario'
          ? `${new Date(reservation.inicio).toLocaleString('es-ES')} → ${new Date(reservation.fin).toLocaleString('es-ES')} · Cita`
          : `${formatDate(reservation.entrada)} → ${formatDate(reservation.salida)} · ${nights} noche(s)`;
        const estado = reservationState(reservation);
        const confirming = reservation.id === pendingDeleteId;

        item.classList.add(`state-${estado.toLowerCase().replace(' ', '-')}`);
        item.innerHTML = `
          <div>
            <div class="reservation-title">
              <h4>${escapeHTML(reservation.habitacion)}</h4>
              <span class="reservation-state">${estado}</span>
            </div>
            <p>${dateLabel} · ${reservation.huespedes} huésped(es)</p>
            ${reservation.observaciones ? `<p>${escapeHTML(reservation.observaciones)}</p>` : ''}
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
  const reservation = getReservations().find((candidate) => candidate.id === id);
  if (!currentUser || currentUser.estado !== 'activo' || !reservation ||
      (currentUser.rol !== 'administrador' && reservation.correo !== currentUser.correo)) {
    setBookingMessage('No tienes permiso para editar esta reserva o ya no existe.');
    return null;
  }
  return reservation;
}

function ownReservation(id) {
  const reservation = getReservations().find((candidate) => candidate.id === id && candidate.correo === currentUser?.correo);
  if (!currentUser || currentUser.estado !== 'activo' || !reservation) {
    setBookingMessage('No tienes permiso para eliminar esta reserva o ya no existe.');
    return null;
  }
  return reservation;
}

async function saveEditedReservation(reservationId, form) {
  const reservation = editableReservation(reservationId);
  if (!reservation) return;
  const roomId = form.elements.room.value;
  const modalidad = form.elements.modalidad.value;
  const checkin = form.elements.checkin.value;
  const checkout = form.elements.checkout.value;
  const startTime = form.elements.startTime.value;
  const endTime = form.elements.endTime.value;
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

  let reservationPayload;
  let nights = 0;
  if (modalidad === 'noches') {
    nights = nightsBetween(checkin, checkout);
    if (checkin < toISODate(new Date())) {
      setBookingMessage('La fecha de entrada no puede ser anterior a hoy.');
      return;
    }
    if (nights < room.duracion) {
      setBookingMessage(`La salida debe ser posterior a la entrada y la estancia de al menos ${room.duracion} noche(s).`);
      return;
    }
    reservationPayload = { servicioId: roomId, modalidad, entrada: checkin, salida: checkout, huespedes: guests, observaciones: reservation.observaciones || '' };
  } else {
    if (!startTime || !endTime) {
      setBookingMessage('Selecciona la hora de inicio y fin de la cita.');
      return;
    }
    const appointmentStart = new Date(`${checkin}T${startTime}`);
    const appointmentEnd = new Date(`${checkout}T${endTime}`);
    if (Number.isNaN(appointmentStart.getTime()) || Number.isNaN(appointmentEnd.getTime()) ||
        appointmentStart <= new Date() || appointmentEnd <= appointmentStart) {
      setBookingMessage('La cita debe comenzar en el futuro y terminar después de su inicio.');
      return;
    }
    reservationPayload = {
      servicioId: roomId,
      modalidad,
      inicio: appointmentStart.toISOString(),
      fin: appointmentEnd.toISOString(),
      huespedes: guests,
      observaciones: reservation.observaciones || '',
    };
  }

  if (!Number.isInteger(guests) || guests < 1 || room.capacidad < guests) {
    setBookingMessage(`${room.nombre} admite como máximo ${room.capacidad} huéspedes.`);
    return;
  }

  const reservations = getReservations();

  const criteria = modalidad === 'noches'
    ? { modalidad, checkin, checkout }
    : { modalidad, start: reservationPayload.inicio, end: reservationPayload.fin };
  if (isRoomTaken(roomId, criteria, reservations, reservationId)) {
    setBookingMessage('Esa habitación ya está ocupada en esas fechas.');
    return;
  }

  try {
    const updated = await apiRequest(`/api/reservations/${encodeURIComponent(reservationId)}`, {
      method: 'PUT',
      body: JSON.stringify(reservationPayload),
    });
    apiState.reservations = reservations.map((candidate) => candidate.id === reservationId ? updated.reserva : candidate);
    editingReservationId = null;
    setBookingMessage('Reserva actualizada.', true);
    renderRooms();
    renderReservations();
  } catch (error) {
    displayApiError(error, setBookingMessage);
  }
}

async function bookRoom(roomId) {
  const criteria = getSearchCriteria();

  if (!criteria.valid) {
    setBookingMessage(criteria.error);
    markDateFields(true);
    return;
  }

  markDateFields(false);

  const room = getRooms().find((candidate) => candidate.id === roomId);
  const reservations = getReservations();

  if (!room || room.estado !== 'disponible' || isRoomTaken(roomId, criteria, reservations)) {
    setBookingMessage('Esa habitación ya no está disponible en esas fechas.');
    renderRooms();
    return;
  }

  const nights = criteria.modalidad === 'noches' ? nightsBetween(criteria.checkin, criteria.checkout) : 1;
  if (criteria.guests > room.capacidad || (criteria.modalidad === 'noches' && nights < room.duracion)) {
    setBookingMessage(`El servicio admite hasta ${room.capacidad} huéspedes${criteria.modalidad === 'noches' ? ` y requiere al menos ${room.duracion} noche(s)` : ''}.`);
    return;
  }
  const payload = criteria.modalidad === 'noches'
    ? { servicioId: room.id, modalidad: 'noches', entrada: criteria.checkin, salida: criteria.checkout, huespedes: criteria.guests, observaciones: document.querySelector('#reservation-notes').value.trim() }
    : { servicioId: room.id, modalidad: 'horario', inicio: criteria.start, fin: criteria.end, huespedes: criteria.guests, observaciones: document.querySelector('#reservation-notes').value.trim() };
  try {
    const created = await apiRequest('/api/reservations', { method: 'POST', body: JSON.stringify(payload) });
    apiState.reservations.push(created.reserva);
    setBookingMessage(`Reserva confirmada: ${room.nombre}.`, true);
    renderRooms();
    renderReservations();
    renderDashboard();
  } catch (error) {
    displayApiError(error, setBookingMessage);
  }
}

async function cancelReservation(reservationId) {
  if (!ownReservation(reservationId)) return;
  try {
    await apiRequest(`/api/reservations/${encodeURIComponent(reservationId)}`, { method: 'DELETE' });
    apiState.reservations = getReservations().filter((reservation) => reservation.id !== reservationId);
  } catch (error) {
    displayApiError(error, setBookingMessage);
    return;
  }

  if (editingReservationId === reservationId) {
    editingReservationId = null;
  }

  pendingDeleteId = null;
  setBookingMessage('Reserva eliminada.', true);
  renderRooms();
  renderReservations();
  renderDashboard();
}

function askDeleteConfirmation(reservationId) {
  if (!ownReservation(reservationId)) return;
  pendingDeleteId = reservationId;
  editingReservationId = null;
  setBookingMessage('Confirma para eliminar la reserva definitivamente.');
  renderReservations();
}

async function deleteAllReservations() {
  try {
    await apiRequest('/api/reservations', { method: 'DELETE' });
    apiState.reservations = getReservations().filter((reservation) => reservation.correo !== currentUser?.correo);
    editingReservationId = null;
    pendingDeleteId = null;
    setBookingMessage('Se eliminaron todas tus reservas.', true);
    renderRooms();
    renderReservations();
    renderDashboard();
  } catch (error) {
    displayApiError(error, setBookingMessage);
  }
}

async function showBookingScreen(user) {
  currentUser = user;
  apiState.users = [user];
  try {
    await refreshApiData();
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    displayApiError(error);
    return;
  }
  editingReservationId = null;
  pendingDeleteId = null;
  authScreen.classList.add('hidden');
  bookingScreen.classList.remove('hidden');
  bookingUserName.textContent = `Hola, ${user.nombre}`;
  setMessage('');
  setBookingMessage('Selecciona fechas u horario para consultar disponibilidad.');
  setDateLimits();
  checkinInput.value = '';
  checkoutInput.value = '';
  renderRooms();
  renderReservations();
  navigateTo('dashboard');
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  apiState.users = [];
  apiState.services = [];
  apiState.reservations = [];
  apiState.stats = null;
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

  bookingModeInput.addEventListener('change', updateBookingMode);

  checkinInput.addEventListener('change', () => {
    if (checkinInput.value) {
      if (bookingModeInput.value === 'noches') {
        checkoutInput.min = addCalendarDays(checkinInput.value, 1);
        if (checkoutInput.value && checkoutInput.value <= checkinInput.value) checkoutInput.value = checkoutInput.min;
      } else {
        checkoutInput.min = checkinInput.value;
        if (checkoutInput.value && checkoutInput.value < checkinInput.value) checkoutInput.value = checkinInput.value;
      }
    }

    renderRooms();
  });

  checkoutInput.addEventListener('change', renderRooms);
  appointmentStartInput.addEventListener('change', renderRooms);
  appointmentEndInput.addEventListener('change', renderRooms);
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

async function initializeSession() {
  if (!localStorage.getItem(SESSION_KEY)) return;
  try {
    const result = await apiRequest('/api/auth/me');
    await showBookingScreen(result.usuario);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      logout();
      setMessage('');
      return;
    }
    setMessage('No se pudo comprobar la sesión. Verifica tu conexión e inténtalo de nuevo.');
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
  return currentUser?.rol === 'administrador' && currentUser?.estado === 'activo';
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
  const user = currentUser;
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
  document.querySelector('#account-role').textContent = admin ? 'Administrador' : 'Usuario';
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
  const status = String(reservation.estado || '').toLowerCase();
  if (status === 'pendiente') return 'Pendiente';
  if (status === 'cancelada') return 'Cancelada';

  const end = reservation.modalidad === 'horario'
    ? Date.parse(reservation.fin)
    : Date.parse(`${reservation.salida}T00:00:00`);
  const start = reservation.modalidad === 'horario'
    ? Date.parse(reservation.inicio)
    : Date.parse(`${reservation.entrada}T00:00:00`);
  if (end <= Date.now()) return 'Finalizada';
  if (status === 'confirmada') return 'Confirmada';
  return start <= Date.now() ? 'En curso' : 'Próxima';
}

function renderDashboard() {
  const admin = isAdministrator();
  const reservations = getReservations().filter((reservation) => admin || reservation.correo === currentUser.correo);
  document.querySelector('#dashboard-greeting').textContent = `Bienvenido, ${currentUser.nombre}. Consulta el estado de ${admin ? 'Hotel Clara' : 'tus reservas'}.`;
  document.querySelector('#stat-users').textContent = String(apiState.stats?.usuarios ?? 0);
  document.querySelector('#stat-services').textContent = String(apiState.stats?.servicios ?? 0);
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
    details.textContent = `${reservation.modalidad === 'horario'
      ? `${new Date(reservation.inicio).toLocaleString('es-ES')} → ${new Date(reservation.fin).toLocaleString('es-ES')}`
      : `${formatDate(reservation.entrada)} → ${formatDate(reservation.salida)}`} · $${reservation.total}${admin ? ` · ${reservation.correo}` : ''}`;
    const badge = document.createElement('span');
    badge.className = 'reservation-state';
    badge.textContent = state;
    description.append(heading, details);
    card.append(description, badge);
    list.append(card);
  });
}

async function renderUsers() {
  if (!isAdministrator()) return;
  const query = document.querySelector('#users-search').value.trim();
  const role = document.querySelector('#users-role-filter').value;
  const status = document.querySelector('#users-status-filter').value;
  const params = new URLSearchParams({ skip: String((usersPage - 1) * USERS_PER_PAGE), limit: String(USERS_PER_PAGE) });
  if (query) params.set('q', query);
  if (role) params.set('rol', role);
  if (status) params.set('estado', status);
  try {
    const result = await apiRequest(`/api/users?${params}`);
    const users = result.items;
    apiState.users = users;
    const pages = Math.max(1, Math.ceil(result.total / USERS_PER_PAGE));
    if (usersPage > pages) {
      usersPage = pages;
      await renderUsers();
      return;
    }
    const body = document.querySelector('#users-table-body');
    body.replaceChildren();
    users.forEach((user) => {
    const row = document.createElement('tr');
    const date = user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString('es') : 'No disponible';
    const stateLabel = { activo: 'Activo', inactivo: 'Inactivo', pendiente: 'Pendiente' }[user.estado] || user.estado;
    [user.nombre, user.correo, user.rol === 'administrador' ? 'Administrador' : 'Usuario', stateLabel, date].forEach((value, index) => {
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
      button.addEventListener('click', () => label === 'Editar' ? openUserForm(user.correo) : askUserDeletion(user.id));
      buttons.append(button);
    });
    actions.append(buttons);
    row.append(actions);
    body.append(row);
  });
    document.querySelector('#users-empty').classList.toggle('hidden', result.total > 0);
    document.querySelector('#users-page-info').textContent = `Página ${usersPage} de ${pages} · ${result.total} usuario(s)`;
    document.querySelector('#users-previous').disabled = usersPage === 1;
    document.querySelector('#users-next').disabled = usersPage === pages;
  } catch (error) {
    displayApiError(error, setUsersMessage);
  }
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

async function saveManagedUser(event) {
  event.preventDefault();
  if (!requireAdministrator()) return;
  clearMessages(userForm);
  setUsersMessage('');
  const name = userForm.elements.nombre.value.trim();
  const email = userForm.elements.correo.value.trim().toLowerCase();
  const password = userForm.elements.password.value;
  const role = userForm.elements.rol.value;
  const status = userForm.elements.estado.value;
  const existing = getUsers().find((user) => user.correo === editingUserEmail);
  let valid = true;
  if (!name) { setError('user-name', 'Escribe el nombre completo.'); valid = false; }
  if (!emailPattern.test(email)) { setError('user-email', 'Introduce un correo válido.'); valid = false; }
  if ((!editingUserEmail || password) && !validAccountPassword(password)) {
    setError('user-password', 'Usa 8 caracteres, mayúscula, minúscula, número y símbolo.'); valid = false;
  }
  if (!valid) return;
  if (editingUserEmail && !existing) { setUsersMessage('El usuario ya no existe.'); return; }
  if (!['administrador', 'usuario'].includes(role) || !['activo', 'inactivo', 'pendiente'].includes(status)) {
    setUsersMessage('Selecciona un rol y un estado válidos.'); return;
  }
  if (existing?.correo === currentUser.correo && (role !== existing.rol || status !== 'activo')) {
    setUsersMessage('No puedes cambiar tu propio rol ni estado.'); return;
  }
  const payload = { nombre: name, correo: email, rol, estado };
  if (password) payload.password = password;
  if (!existing && !password) { setError('user-password', 'La contraseña es obligatoria al crear.'); return; }
  try {
    if (existing) {
      const result = await apiRequest(`/api/users/${encodeURIComponent(existing.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (currentUser.id === result.usuario.id) {
        currentUser = result.usuario;
        bookingUserName.textContent = `Hola, ${result.usuario.nombre}`;
      }
    } else {
      await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(payload) });
    }
    await refreshApiData();
    userForm.classList.add('hidden');
    editingUserEmail = null;
    await renderUsers();
    setUsersMessage(existing ? 'Usuario actualizado.' : 'Usuario creado.', true);
  } catch (error) {
    displayApiError(error, setUsersMessage);
  }
}

function askUserDeletion(userId) {
  if (!requireAdministrator()) return;
  const user = getUsers().find((candidate) => candidate.id === userId);
  if (!user) { setUsersMessage('El usuario ya no está en la página actual.'); return; }
  if (user.correo === currentUser.correo) { setUsersMessage('No puedes eliminar tu propia cuenta.'); return; }
  deletingUserEmail = userId;
  document.querySelector('#delete-user-description').textContent = `¿Eliminar definitivamente a ${user.nombre} (${user.correo})? Esta acción no se puede deshacer.`;
  deleteUserDialog.showModal();
}

async function confirmUserDeletion() {
  if (!requireAdministrator()) return;
  const user = getUsers().find((candidate) => candidate.id === deletingUserEmail);
  deleteUserDialog.close();
  if (!user) { setUsersMessage('El usuario ya no existe.'); return; }
  if (editingUserEmail === user.correo) {
    userForm.classList.add('hidden');
    editingUserEmail = null;
  }
  try {
    await apiRequest(`/api/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    await refreshApiData();
    deletingUserEmail = null;
    await renderUsers();
    setUsersMessage('Usuario eliminado.', true);
  } catch (error) {
    displayApiError(error, setUsersMessage);
  }
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
    if (!currentUser || event.key !== SESSION_KEY) return;
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

async function renderServices() {
  if (!isAdministrator()) return;
  const query = document.querySelector('#services-search').value.trim();
  const status = document.querySelector('#services-status-filter').value;
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (status) params.set('estado', status);
  let services;
  try {
    const result = await apiRequest(`/api/services${params.size ? `?${params}` : ''}`);
    services = result.items;
  } catch (error) {
    displayApiError(error, setServicesMessage);
    return;
  }
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
    meta.textContent = `${service.categoria} · ${service.duracion} noche(s) mínimo · Hasta ${service.capacidad} huéspedes`;
    const price = document.createElement('strong');
    price.className = 'room-price';
    price.textContent = `$${service.precio.toFixed(2)} por ${service.duracion === 0 ? 'cita' : 'noche'}`;
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

async function saveManagedService(event) {
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
  const existing = getRooms().find((service) => service.id === editingServiceId);
  const payload = { nombre, detalle, categoria, precio, duracion, capacidad, estado, imagen: serviceImageData };
  try {
    if (existing) {
      await apiRequest(`/api/services/${encodeURIComponent(existing.id)}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiRequest('/api/services', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeServiceEditor();
    await refreshApiData();
    await renderServices();
    setServicesMessage(existing ? 'Servicio actualizado. Las reservas existentes conservan sus datos; al editarlas se aplican las condiciones actuales.' : 'Servicio creado.', true);
  } catch (error) {
    displayApiError(error, setServicesMessage);
  }
}

function askServiceDeletion(id) {
  if (!requireAdministrator()) return;
  const service = getRooms().find((candidate) => candidate.id === id);
  if (!service) { setServicesMessage('El servicio ya no existe.'); renderServices(); return; }
  deletingServiceId = id;
  document.querySelector('#delete-service-description').textContent = `¿Eliminar definitivamente ${service.nombre}? Esta acción no se puede deshacer.`;
  deleteServiceDialog.showModal();
}

async function confirmServiceDeletion() {
  if (!requireAdministrator()) return;
  const id = deletingServiceId;
  deleteServiceDialog.close();
  try {
    await apiRequest(`/api/services/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (editingServiceId === id) closeServiceEditor();
    await refreshApiData();
    await renderServices();
    setServicesMessage('Servicio eliminado.', true);
  } catch (error) {
    displayApiError(error, setServicesMessage);
  }
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
initializeSession();
