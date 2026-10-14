# Hotel Clara — Sistema de reservas

Interfaz web y API REST en FastAPI para usuarios, catálogo de servicios y
reservas persistidas en MongoDB.

## Ejecutar localmente

1. Inicia MongoDB local (`mongodb://localhost:27017/`).
2. En VS Code ejecuta la tarea **Crear configuración local segura**. Crea
   `.env` con secretos aleatorios solo si aún no existe; no reemplaza una
   configuración existente. `.env` está excluido de Git.
3. Ejecuta la tarea **Iniciar API Hotel Clara**.
4. Abre `http://localhost:8000/`. La documentación de la API está en
   `http://localhost:8000/docs` y `http://localhost:8000/health` verifica la
   conexión a la base `hotel`.

Para crear el primer administrador, abre `/docs`, ejecuta
`POST /api/auth/bootstrap-admin` una sola vez y envía nombre, correo,
contraseña y el valor local de `ADMIN_SETUP_KEY` en `.env`. Después inicia
sesión desde la página. No hay cuenta ni contraseña de demostración.

Si no usas las tareas de VS Code, crea un entorno virtual e instala las
dependencias desde la raíz:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn PETICIONES.API:app --reload
```

Antes de ejecutar el servidor manualmente, configura `JWT_SECRET` (mínimo 32
caracteres) y `ADMIN_SETUP_KEY` en `.env`. No compartas ni subas ese archivo.

## Funcionalidad

- Registro de clientes, login con JWT y sesión validada por el servidor.
- Dashboard con estadísticas y reservas recientes, limitado por el rol.
- CRUD administrativo de usuarios y servicios, con búsqueda, filtros,
  paginación y validaciones. La API protege roles e historial.
- Reservas de dos modalidades: alojamiento por noches o cita por horario con
  fecha y hora de inicio y fin. El servidor valida disponibilidad, capacidad,
  servicio activo, fechas y solapamientos; calcula el total según el precio
  actual del servicio.
- Clientes consultan y gestionan sus reservas. Los administradores consultan
  todas y pueden modificarlas; no pueden eliminar las reservas ajenas.
- Catálogo estándar sembrado una sola vez en una base nueva. No se vuelve a
  recrear si se elimina posteriormente.

La página está conectada a la API cuando se sirve desde FastAPI. GitHub Pages
solo aloja archivos estáticos, por lo que no puede ejecutar esta API ni acceder
a MongoDB. Para publicar la interfaz hay que desplegar también el backend,
definir `window.HOTEL_API_BASE_URL` con su URL HTTPS y configurar `CORS_ORIGINS`
con los dominios autorizados.

## Rutas principales

- Autenticación: `POST /api/auth/bootstrap-admin`, `/api/auth/register`,
  `/api/auth/login`, `GET /api/auth/me`.
- Dashboard: `GET /api/stats`.
- Usuarios: `GET`, `POST`, `PUT` y `DELETE /api/users`.
- Servicios: `GET`, `POST`, `PUT` y `DELETE /api/services`.
- Reservas: `GET`, `POST`, `PUT` y `DELETE /api/reservations`;
  `GET /api/reservations/availability`.

Las operaciones administrativas requieren un token Bearer. Los endpoints
`GET /api/services` y `GET /api/reservations` aplican las reglas de acceso del
usuario autenticado.

## Pruebas

Instala las dependencias de desarrollo y ejecuta las pruebas unitarias y HTTP:

```powershell
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

Para probar persistencia real, en VS Code ejecuta **Probar API contra MongoDB
temporal**. La prueba usa una base `hotel_test_<id>` aislada y la elimina al
finalizar; no modifica `hotel`.

La tarea **Validar JavaScript del frontend** revisa la sintaxis del cliente.
