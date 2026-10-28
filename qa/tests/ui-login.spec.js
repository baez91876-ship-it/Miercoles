const { test, expect } = require('@playwright/test');

const VIEWPORTS = [320, 390, 768, 1024, 1440];

for (const width of VIEWPORTS) {
  test(`login page stays within the viewport at ${width}px`, async ({ page }) => {
    const fileUrl = 'file://' + require('path').resolve(__dirname, '../../frontend/index.html');
    await page.goto(fileUrl);
    await page.setViewportSize({ width, height: 960 });

    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#register-form')).toBeHidden();

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1);

    const labels = await page.locator('label').allTextContents();
    expect(labels).toEqual(expect.arrayContaining([
      expect.stringContaining('Correo electrónico *'),
      expect.stringContaining('Contraseña *'),
      expect.stringContaining('Nombre completo *')
    ]));

    await expect(page.locator('#login-email')).toHaveAttribute('required', '');
    await expect(page.locator('#login-password')).toHaveAttribute('required', '');
    await expect(page.locator('#register-name')).toHaveAttribute('required', '');
  });
}
