const { test, expect } = require('@playwright/test');
const { authenticated, futureDate, search, reserve, stored, register, login } = require('./helpers');

test.beforeEach(async ({ page }) => { await authenticated(page); });

test('crear reserva calcula total, muestra datos y persiste tras recarga', async ({ page }) => {
  await expect(page.locator('#reservation-list')).toContainText('Todavía no tienes reservas');
  await search(page);
  await expect(page.locator('[data-room="std"]')).toBeEnabled();
  await reserve(page);
  const reservations = await stored(page, 'reservas');
  expect(reservations).toHaveLength(1);
  expect(reservations[0].total).toBe(1780);
  expect(reservations[0].entrada).toBe(futureDate(30));
  expect(reservations[0].salida).toBe(futureDate(32));
  await expect(page.locator('#reservation-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('.reservation-card')).toContainText('Habitación Estándar');
  await expect(page.locator('.reservation-state')).toHaveText('Próxima');
});

test('fechas vacias y pasadas impiden reservar', async ({ page }) => {
  await page.getByRole('button', { name: 'Buscar', exact: false }).click();
  await expect(page.locator('#booking-message')).toContainText('Selecciona las fechas');
  await expect(page.locator('[data-room="std"]')).toBeDisabled();
  await search(page, futureDate(-2), futureDate(2));
  await expect(page.locator('#booking-message')).toContainText('anterior a hoy');
  expect(await stored(page, 'reservas')).toHaveLength(0);
});

test('salida igual o anterior a entrada se rechaza', async ({ page }) => {
  await search(page, futureDate(30), futureDate(30));
  await expect(page.locator('#booking-message')).toContainText('posterior a la entrada');
  await search(page, futureDate(30), futureDate(29));
  await expect(page.locator('[data-room="std"]')).toBeDisabled();
  expect(await stored(page, 'reservas')).toHaveLength(0);
});

test('capacidad limita habitaciones y duplicado queda deshabilitado', async ({ page }) => {
  await search(page, futureDate(30), futureDate(32), '4');
  await expect(page.locator('[data-room="std"]')).toBeDisabled();
  await expect(page.locator('[data-room="dbl"]')).toBeDisabled();
  await reserve(page, 'jr');
  await expect(page.locator('[data-room="jr"]')).toBeDisabled();
  await expect(page.locator('.room-card').filter({ hasText: 'Suite Junior' })).toContainText('Ocupada');
  expect(await stored(page, 'reservas')).toHaveLength(1);
});

test('reservas contiguas no se solapan', async ({ page }) => {
  await search(page);
  await reserve(page);
  await search(page, futureDate(32), futureDate(34));
  await expect(page.locator('[data-room="std"]')).toBeEnabled();
  await reserve(page);
  expect(await stored(page, 'reservas')).toHaveLength(2);
});

test('editar precarga datos, cambia habitacion y recalcula total persistente', async ({ page }) => {
  await search(page);
  await reserve(page);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.locator('#edit-checkin')).toHaveValue(futureDate(30));
  await expect(page.locator('#edit-room')).toHaveValue('std');
  await page.locator('#edit-room').selectOption('dbl');
  await page.locator('#edit-checkout').fill(futureDate(33));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#booking-message')).toHaveText('Reserva actualizada.');
  expect((await stored(page, 'reservas'))[0].total).toBe(3450);
  await page.reload();
  await expect(page.locator('.reservation-card')).toContainText('Habitación Doble');
});

test('descartar edicion conserva datos', async ({ page }) => {
  await search(page);
  await reserve(page);
  const before = await stored(page, 'reservas');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#edit-room').selectOption('ste');
  await page.getByRole('button', { name: 'Descartar' }).click();
  expect(await stored(page, 'reservas')).toEqual(before);
});

test('editar rechaza fechas incompletas, orden incorrecto y exceso de capacidad', async ({ page }) => {
  await search(page);
  await reserve(page);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#edit-checkout').fill('');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#booking-message')).toContainText('Selecciona las fechas');
  await page.locator('#edit-checkout').fill(futureDate(29));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#booking-message')).toContainText('posterior');
  await page.locator('#edit-checkout').fill(futureDate(32));
  await page.locator('#edit-guests').selectOption('4');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#booking-message')).toContainText('máximo 2');
  expect((await stored(page, 'reservas'))[0].huespedes).toBe(2);
});

test('editar rechaza habitacion ocupada por otra reserva', async ({ page }) => {
  await search(page);
  await reserve(page);
  await reserve(page, 'dbl');
  await page.locator('[data-edit]').first().click();
  await page.locator('#edit-room').selectOption('dbl');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('#booking-message')).toContainText('ya está ocupada');
  expect((await stored(page, 'reservas'))[0].habitacionId).toBe('std');
});

test('editar debe rechazar entrada en el pasado', async ({ page }) => {
  await search(page);
  await reserve(page);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#edit-checkin').fill(futureDate(-5));
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await stored(page, 'reservas'))[0].entrada).toBe(futureDate(30));
});

test('eliminar exige confirmacion, permite abortar y libera disponibilidad', async ({ page }) => {
  await search(page);
  await reserve(page);
  await page.locator('[data-delete]').click();
  expect(await stored(page, 'reservas')).toHaveLength(1);
  await page.locator('[data-abort-delete]').click();
  expect(await stored(page, 'reservas')).toHaveLength(1);
  await page.locator('[data-delete]').click();
  await page.locator('[data-confirm-delete]').click();
  await expect(page.locator('#booking-message')).toHaveText('Reserva eliminada.');
  await expect(page.locator('#reservation-count')).toHaveText('0');
  await expect(page.locator('[data-room="std"]')).toBeEnabled();
  await page.reload();
  expect(await stored(page, 'reservas')).toHaveLength(0);
  await expect(page.locator('#reservation-list')).toContainText('Todavía no tienes reservas');
});

test('cada cuenta ve lo suyo y eliminar todas conserva reservas ajenas', async ({ page }) => {
  await search(page);
  await reserve(page);
  const first = (await stored(page, 'reservas'))[0];
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  const secondEmail = await register(page);
  await login(page, secondEmail);
  await expect(page.locator('#reservation-count')).toHaveText('0');
  await search(page);
  await expect(page.locator('[data-room="std"]')).toBeDisabled();
  await reserve(page, 'dbl');
  await page.locator('#clear-reservations').click();
  expect(await stored(page, 'reservas')).toHaveLength(2);
  await page.locator('#clear-reservations').click();
  expect(await stored(page, 'reservas')).toEqual([first]);
  await expect(page.locator('#reservation-count')).toHaveText('0');
});

test('borrar fecha de entrada no genera excepcion de JavaScript', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await search(page);
  await page.locator('#search-checkin').fill('');
  await page.locator('#search-checkout').focus();
  await expect(page.locator('[data-room="std"]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('reservas muestran estados proxima, en curso y finalizada segun fechas', async ({ page }) => {
  await search(page);
  await reserve(page);
  const base = (await stored(page, 'reservas'))[0];
  const fixtures = [
    base,
    { ...base, id: 'qa-current', entrada: futureDate(-1), salida: futureDate(1) },
    { ...base, id: 'qa-finished', entrada: futureDate(-4), salida: futureDate(-2) },
  ];
  await page.evaluate((reservations) => localStorage.setItem('reservas', JSON.stringify(reservations)), fixtures);
  await page.reload();
  await expect(page.locator('#reservation-count')).toHaveText('3');
  await expect(page.locator('.state-próxima .reservation-state')).toHaveText('Próxima');
  await expect(page.locator('.state-en-curso .reservation-state')).toHaveText('En curso');
  await expect(page.locator('.state-finalizada .reservation-state')).toHaveText('Finalizada');
  await expect(page.locator('.state-finalizada .reservation-state')).toHaveCSS('background-color', 'rgb(100, 116, 139)');
});
