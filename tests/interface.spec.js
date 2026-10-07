const { test, expect } = require('@playwright/test');
const { authenticated, search, reserve } = require('./helpers');

test('pagina y recursos locales cargan sin errores de JavaScript', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('./');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('Hotel Clara | Acceso');
  for (const asset of ['script.js', 'styles.css']) {
    const resource = await page.request.get(asset);
    expect(resource.status()).toBe(200);
  }
  await page.getByRole('tab', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('textbox', { name: 'Teléfono' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`login y reservas no desbordan horizontalmente a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await authenticated(page);
    await search(page);
    await reserve(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible();
  });
}

test('paleta CSS y colores de mensajes reflejan exito y error', async ({ page }) => {
  await page.goto('./');
  const colors = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return ['--primary', '--success', '--error', '--warning', '--info'].map((key) => css.getPropertyValue(key).trim());
  });
  expect(colors).toEqual(['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#0284c7']);
  await authenticated(page);
  await page.getByRole('button', { name: 'Buscar', exact: false }).click();
  await expect(page.locator('#booking-message')).toHaveCSS('background-color', 'rgb(220, 38, 38)');
  await search(page);
  await reserve(page);
  await expect(page.locator('#booking-message')).toHaveCSS('background-color', 'rgb(22, 163, 74)');
});

test('tabulacion alcanza correo y etiquetas estan asociadas a campos', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('tab', { name: 'Iniciar sesión' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tab', { name: 'Crear cuenta' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toBeFocused();
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.locator('[data-error-for="login-email"]')).not.toBeEmpty();
});
