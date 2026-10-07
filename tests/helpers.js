const { expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');

const password = 'HotelTest!2026';

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

async function registrationFields(page, email, phone = '+57 300 123 4567') {
  await page.getByRole('tab', { name: 'Crear cuenta' }).click();
  await page.locator('#register-name').fill('Usuario de prueba');
  await page.locator('#register-email').fill(email);
  await page.locator('#register-phone').fill(phone);
  await page.locator('#register-password').fill(password);
  await page.locator('#register-confirm').fill(password);
  await page.locator('#register-terms').check();
}

async function register(page, phone) {
  const email = `qa-${randomUUID()}@example.test`;
  await registrationFields(page, email, phone);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.locator('#global-message')).toHaveText('Cuenta creada. Ya puedes iniciar sesión.');
  return email;
}

async function login(page, email, value = password) {
  await page.getByRole('tab', { name: 'Iniciar sesión' }).click();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(value);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function authenticated(page) {
  await page.goto('./');
  const email = await register(page);
  await login(page, email);
  await expect(page.locator('#booking-screen')).toBeVisible();
  return email;
}

async function search(page, checkin = futureDate(30), checkout = futureDate(32), guests = '2') {
  await page.locator('#search-checkin').fill(checkin);
  await page.locator('#search-checkout').fill(checkout);
  await page.locator('#search-guests').selectOption(guests);
  await page.getByRole('button', { name: 'Buscar', exact: false }).click();
}

async function reserve(page, room = 'std') {
  await page.locator(`[data-room="${room}"]`).click();
  await expect(page.locator('#booking-message')).toContainText('Reserva confirmada');
}

async function stored(page, key) {
  return page.evaluate((name) => JSON.parse(localStorage.getItem(name) || '[]'), key);
}

module.exports = { password, futureDate, registrationFields, register, login, authenticated, search, reserve, stored };
