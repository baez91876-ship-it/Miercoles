# Miercoles

## Publicar en GitHub Pages

Los archivos del sitio están en `docs/`. En el repositorio, configura **Settings → Pages → Deploy from a branch**, selecciona la rama `main` y la carpeta `/docs`. Cada actualización enviada a `main` se publicará automáticamente.

## Dashboard y gestión de usuarios (solo frontend)

Después de iniciar sesión se muestra el dashboard, con navegación a reservas,
tarjetas estadísticas, reservas recientes y acciones rápidas.

Para acceder como administrador de demostración, inicia sesión con
`baez91876@gmail.com` y `1234`, sin registrarte. Al abrir esta versión se crea
la cuenta local o se configura la existente con ese correo una sola vez:
administrador activo, contraseña `1234` y contador de bloqueo reiniciado.
Las recargas siguientes conservan los cambios de cuenta. **Esta contraseña
pública es insegura y solo sirve para la demostración**; los clientes siguen
necesitando contraseña fuerte.

El administrador ve **Todas las reservas** y puede editar habitación, fechas
y huéspedes de cualquier cliente. Se conserva el propietario y se recalcula
el total con las condiciones actuales. No recibe permiso para borrar reservas
ajenas; la eliminación individual o masiva sigue limitada a las propias.
Se rechaza una entrada anterior a hoy al editar.

Los clientes solo ven sus propias reservas y estadísticas, sin módulos de
usuarios/servicios administrativos ni reservas de otros clientes. Se valida
el rol y la propiedad al editar/eliminar, no solo al mostrar los botones.
Cerrar sesión limpia los listados y formularios administrativos de la interfaz.
Esto no protege `localStorage` frente a manipulación: sin backend no existe
autorización segura ni aislamiento real entre personas que usan el mismo navegador.

### Prueba de regresión completa en navegador local

El 7 de octubre de 2026 se hizo un recorrido manual con el navegador integrado
por login válido e inválido, registro de dos clientes y correo duplicado,
reservas en fechas distintas, visibilidad del administrador frente al cliente,
edición administrativa de reservas (habitación, fechas, huéspedes, precio y
propietario), edición de usuarios y correo con vínculo a sus reservas, creación
de usuarios y catálogo CRUD de servicios. También se recorrieron formularios,
filtros, confirmaciones y las pantallas de los cuatro módulos a 320, 390, 768,
1024 y 1440 px. Se intentaron editar y eliminar reservas ajenas como cliente:
ambas operaciones fueron rechazadas.

La página se abrió como archivo local; no se ejecutó una suite Playwright. El
repositorio local ya tiene eliminados `package.json`, `package-lock.json`,
`playwright.config.js` y `tests/`, de modo que `npm test` no está disponible.
El editor no reportó errores en HTML/CSS/JavaScript. Se retiraron los datos
temporales de prueba y se restauró el estado inicial del navegador. No se
verificó GitHub Pages.

El administrador puede crear y editar usuarios, buscar por nombre/correo,
filtrar por rol/estado y navegar por páginas de cinco registros. La eliminación
requiere confirmación. No puede eliminarse a sí mismo ni modificar su propio
rol/estado. Las cuentas con reservas solo pueden desactivarse, no eliminarse,
para conservar el historial. Cambiar un correo actualiza también sus reservas.
Una cuenta inactiva no puede iniciar sesión.

Los registros nuevos incluyen fecha de registro; en las cuentas antiguas sin
fecha se muestra **No disponible**. Los cambios se guardan en `localStorage`.
Las estadísticas administrativas incluyen todas las reservas locales; un
usuario normal solo ve las propias. **Servicios disponibles** cuenta los
servicios activos del catálogo, no su disponibilidad en fechas concretas.

## Gestión de servicios (solo frontend)

El administrador puede abrir **Servicios** desde la navbar o el dashboard.
El catálogo inicial conserva las cuatro habitaciones y sus identificadores,
por lo que las reservas anteriores siguen referenciando los mismos servicios.
Al guardar cambios, el catálogo se almacena en la clave `servicios` de
`localStorage`; un catálogo vacío no vuelve a crear habitaciones automáticamente.

Se puede crear, editar, buscar por nombre/descripción/categoría, filtrar por
estado y eliminar con confirmación. El formulario incluye nombre, descripción,
precio por noche, duración mínima en noches, capacidad, categoría, estado e
imagen opcional PNG/JPEG/WebP de hasta 1 MB. Las imágenes se guardan localmente,
sin subirse a ningún servidor. Precio: 0.01–1000000, hasta dos decimales;
duración: 1–365 noches completas; capacidad: 1–4 huéspedes.

Solo los servicios **Disponibles** aparecen para nuevas reservas. Se comprueban
la estancia mínima, capacidad y solapamientos. Una reserva existente conserva
su nombre/precio histórico al modificar el catálogo; al editar la reserva se
aplican las condiciones actuales del servicio seleccionado. Si su servicio
está inactivo, se debe seleccionar otro disponible para guardar la edición.
Un servicio con cualquier reserva asociada no se puede eliminar; se puede
desactivar para conservar el historial.

Esta adaptación usa noches, no minutos, porque el sistema reserva estancias de
hotel. No se añadieron citas por hora, endpoints, modelos de BD ni backend.

Se validaron CRUD, persistencia, filtros, campos inválidos, nombre duplicado,
imagen local, confirmación/cancelación, integración con reservas y error de
almacenamiento simulado en el navegador integrado mediante archivo local.
El catálogo no desbordó a 320, 390, 768, 1024 y 1440 px; el formulario se comprobó
a 320 y 768 px. No se verificó HTTP/GitHub Pages ni se ejecutó la suite anterior.

**No hay endpoints, API, servidor de autenticación ni base de datos.** Los roles
y contraseñas guardados en el navegador son solo una demostración, manipulable
desde las herramientas del navegador y no apta para producción.

## Validación de esta actualización

Se comprobó la interfaz mediante el navegador integrado abriendo
`docs/index.html` directamente: registro del administrador, sesión persistente,
CRUD local, errores de validación, correo duplicado, inactivación/reactivación,
restricción por rol, confirmación/cancelación de eliminación, búsqueda, filtros,
paginación, compatibilidad con cuentas antiguas y error de almacenamiento
simulado con restauración de datos.

También se verificó la conservación de reservas al cambiar el correo y la
edición de reservas. Login, registro, dashboard, reservas y usuarios no
desbordaron horizontalmente a **320, 390, 768, 1024 y 1440 px**; la tabla tiene
desplazamiento horizontal dentro de su propio contenedor. Se retiraron los datos
de prueba. El editor no reportó errores en HTML, CSS ni JavaScript.

No se ejecutó la suite anterior ni se comprobó la versión publicada: el sandbox
bloqueó los comandos por su configuración de red local en Windows. Abrir un
archivo local no sustituye la validación por HTTP/GitHub Pages.

## Suite anterior

La copia de trabajo actual tiene eliminados el manifiesto, su lockfile y los
archivos de la suite. No se restauraron en esta actualización. Los siguientes
comandos son la referencia para cuando se restablezca esa herramienta:

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