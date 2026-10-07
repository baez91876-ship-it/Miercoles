# Miercoles

## Publicar en GitHub Pages

Los archivos del sitio están en `docs/`. En el repositorio, configura **Settings → Pages → Deploy from a branch**, selecciona la rama `main` y la carpeta `/docs`. Cada actualización enviada a `main` se publicará automáticamente.

## Pruebas

Requiere Node.js 20 o posterior. Instala las dependencias con `npm ci` y Chromium con
`npx playwright install chromium`. Ejecuta `npm test`: Playwright inicia un
servidor local que solo publica los archivos del sitio y usa un navegador
aislado por prueba, sin alterar los datos de tu navegador habitual.

Las pruebas cubren registro, validaciones, sesión, reservas, persistencia,
edición, eliminación, colores, teclado y anchos de pantalla. Los fallos reales
se mantienen como pruebas fallidas, no se ocultan. Usa `npm run test:report`
para ver el informe y las capturas/trazas de fallos.

Si ya tienes Chrome instalado, puedes evitar la descarga de Chromium:

```powershell
$env:TEST_BROWSER_CHANNEL = 'chrome'
npm test
Remove-Item Env:TEST_BROWSER_CHANNEL
```

Para probar la página publicada desde PowerShell:

```powershell
$env:TEST_BASE_URL = 'https://baez91876-ship-it.github.io/Miercoles/'
npm test
Remove-Item Env:TEST_BASE_URL
```

El sitio almacena cuentas y reservas en `localStorage`; estas pruebas no
certifican un backend, MongoDB ni autenticación segura para producción.