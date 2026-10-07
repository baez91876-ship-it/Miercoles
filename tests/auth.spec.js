const { test, expect } = require('@playwright/test');
const { password, register, registrationFields, login, stored } = require('./helpers');

test.beforeEach(async ({ page }) => { await page.goto('./'); });

test('registro persiste correo normalizado y telefono; login, recarga y logout', async ({ page }) => {
  const email = await register(page);
  const users = await stored(page, 'usuarios');
  expect(users).toHaveLength(1);
  expect(users[0].telefono).toBe('+57 300 123 4567');
  await login(page, email.toUpperCase());
  await expect(page.locator('#booking-user-name')).toContainText('Usuario de prueba');
  await page.reload();
  await expect(page.locator('#booking-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.locator('#login-form')).toBeVisible();
  await page.reload();
  await expect(page.locator('#booking-screen')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('session_token'))).toBeNull();
});

test('telefono opcional no impide registro ni login', async ({ page }) => {
  const email = await register(page, '');
  expect((await stored(page, 'usuarios'))[0].telefono).toBe('');
  await login(page, email);
  await expect(page.locator('#booking-screen')).toBeVisible();
});

test('registro vacio muestra errores y no guarda usuarios', async ({ page }) => {
  await page.getByRole('tab', { name: 'Crear cuenta' }).click();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  for (const field of ['name', 'email', 'password', 'confirm', 'terms']) {
    await expect(page.locator(`[data-error-for="register-${field}"]`)).not.toBeEmpty();
  }
  expect(await stored(page, 'usuarios')).toHaveLength(0);
});

for (const [field, invalid] of [
  ['name', '   '], ['email', 'correo-invalido'], ['password', 'abc'],
  ['confirm', 'NoCoincide!1'],
]) {
  test(`registro rechaza ${field} invalido y permite corregirlo`, async ({ page }) => {
    await registrationFields(page, 'valid@example.test');
    const original = await page.locator(`#register-${field}`).inputValue();
    await page.locator(`#register-${field}`).fill(invalid);
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
    await expect(page.locator(`[data-error-for="register-${field}"]`)).not.toBeEmpty();
    expect(await stored(page, 'usuarios')).toHaveLength(0);
    await page.locator(`#register-${field}`).fill(original);
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
    expect(await stored(page, 'usuarios')).toHaveLength(1);
  });
}

test('registro exige aceptar terminos', async ({ page }) => {
  await registrationFields(page, 'terms@example.test');
  await page.locator('#register-terms').uncheck();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.locator('[data-error-for="register-terms"]')).not.toBeEmpty();
  expect(await stored(page, 'usuarios')).toHaveLength(0);
});

test('correo duplicado con mayusculas no crea segunda cuenta', async ({ page }) => {
  const email = await register(page);
  await registrationFields(page, email.toUpperCase());
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.locator('[data-error-for="register-email"]')).toContainText('Ya existe');
  expect(await stored(page, 'usuarios')).toHaveLength(1);
});

test('login vacio y usuario desconocido no abren reservas', async ({ page }) => {
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('[data-error-for="login-email"]')).not.toBeEmpty();
  await expect(page.locator('[data-error-for="login-password"]')).not.toBeEmpty();
  await login(page, 'unknown@example.test');
  await expect(page.locator('#global-message')).toContainText('incorrectos');
  await expect(page.locator('#booking-screen')).toBeHidden();
});

test('credencial incorrecta cuenta intentos y bloquea al tercero', async ({ page }) => {
  const email = await register(page);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await login(page, email, 'incorrecta');
    await expect(page.locator('#booking-screen')).toBeHidden();
  }
  await expect(page.locator('#global-message')).toContainText('15 minutos');
  expect((await stored(page, 'usuarios'))[0].bloqueadoHasta).toBeGreaterThan(Date.now());
  await login(page, email, password);
  await expect(page.locator('#global-message')).toContainText('bloqueada temporalmente');
  await expect(page.locator('#booking-screen')).toBeHidden();
});

test('login correcto reinicia intentos fallidos', async ({ page }) => {
  const email = await register(page);
  await login(page, email, 'incorrecta');
  expect((await stored(page, 'usuarios'))[0].intentosFallidos).toBe(1);
  await login(page, email);
  await expect(page.locator('#booking-screen')).toBeVisible();
  expect((await stored(page, 'usuarios'))[0].intentosFallidos).toBe(0);
});

test('bloqueo expira a los 15 minutos y permite volver a iniciar sesion', async ({ page }) => {
  await page.clock.install();
  const email = await register(page);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await login(page, email, 'incorrecta');
  }
  await expect(page.locator('#global-message')).toContainText('15 minutos');
  await page.clock.fastForward(15 * 60 * 1000 + 1000);
  await login(page, email);
  await expect(page.locator('#booking-screen')).toBeVisible();
  expect((await stored(page, 'usuarios'))[0].bloqueadoHasta).toBe(0);
});

test('sin token no restaura acceso aunque exista usuario de sesion', async ({ page }) => {
  const email = await register(page);
  await login(page, email);
  await page.evaluate(() => localStorage.removeItem('session_token'));
  await page.reload();
  await expect(page.locator('#booking-screen')).toBeHidden();
  await expect(page.locator('#login-form')).toBeVisible();
});

test('mostrar/ocultar contrasena y ayuda de recuperacion', async ({ page }) => {
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: '¿La olvidaste?' }).click();
  await expect(page.locator('#global-message')).toContainText('contacta con recepción');
});
