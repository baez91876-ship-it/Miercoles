# Descomposición de Historias de Usuario en tareas — Sistema de Reservas

> ✅ indica que la página actual de Hotel Clara cumple el requisito de forma visible o en su lógica del navegador. No implica que exista implementación en servidor, base de datos o pruebas automatizadas.

> Las marcas QA anteriores de login y reservas corresponden a la ejecución histórica de Playwright. Esta actualización de frontend se verificó en el navegador integrado, como se detalla debajo. Las marcas no certifican MongoDB ni endpoints: la aplicación es estática y usa `localStorage`. Un requisito parcial o una prueba fallida queda sin check.

## Actualización de frontend — 7 de octubre de 2026

- Login sin desbordamiento a 768 px ✅. También se verificaron registro, dashboard, reservas y usuarios a 320, 390, 768, 1024 y 1440 px.
- Dashboard con header, menú de cuenta, navegación, estadísticas locales, reservas recientes, estados y acciones rápidas ✅.
- Gestión de usuarios local con creación, edición por el administrador (nombre, correo, contraseña, rol y estado), eliminación confirmada, búsqueda, filtros y paginación de cinco registros ✅. El administrador no puede cambiar su propio rol/estado.
- Administrador de demostración: `baez91876@gmail.com` / `1234` ✅, creado/configurado automáticamente una sola vez por cuenta, sin registro. Contraseña pública, no apta para producción.
- Administrador puede consultar y editar reservas de todos los clientes ✅, conservando el propietario. Eliminar sigue limitado a las reservas propias.
- Clientes solo ven sus reservas y no acceden a Usuarios/Servicios administrativos ✅. Edición y eliminación de reservas ajenas rechazadas en la lógica del navegador.
- Administrador edita usuarios, puede cambiar su correo conservando la asociación de reservas, y crea cuentas desde el panel ✅.
- Usuarios inactivos no pueden iniciar sesión. No se permite autoeliminación ni cambiar el propio rol/estado. Una cuenta con reservas puede desactivarse, pero no eliminarse; editar el correo conserva sus reservas.
- Validación en navegador integrado mediante archivo local: CRUD, permisos visuales, validaciones, correo duplicado, filtros/paginación, persistencia, cuentas antiguas, error de almacenamiento simulado y edición desde el administrador de un usuario junto con sus reservas asociadas. Datos de prueba retirados. Diagnósticos del editor sin errores.
- Recorrido manual de regresión en navegador local: login válido/inválido, registro de dos clientes, reserva de ambas cuentas, aislamiento de datos, edición administrativa de usuarios y reservas, CRUD de servicios, validaciones y responsive en 320/390/768/1024/1440 px. No es ejecución de Playwright.
- No se ejecutó nuevamente la suite ni se probó GitHub Pages: los comandos quedaron bloqueados por la política de red local del sandbox en Windows. No se restauraron los archivos de pruebas eliminados en la copia de trabajo.

**Alcance:** solo UI/UX y frontend. No se crearon endpoints, integración con API, backend ni BD. Los roles locales no son autorización segura para producción. Las estadísticas de usuarios/todas las reservas se muestran solo al administrador; el usuario normal ve sus reservas. Servicios cuenta los tipos de habitación del catálogo.

## Acceso y criterio de los checks

Los accesos de administrador y los usuarios históricos de demostración están
documentados en [Credenciales de acceso y prueba](./CREDENCIALES_PRUEBA.md).
El administrador local se crea automáticamente; los clientes sí deben
registrarse antes de iniciar sesión. Las contraseñas de prueba de clientes
no implican cuentas precargadas.

✅ marca únicamente lo implementado o probado en el alcance indicado.
Las pruebas locales de dashboard y CRUD de usuarios no certifican una API.
Las tareas de backend, BD, PR y funciones inexistentes quedan sin check.

## Resultado histórico de pruebas — 7 de octubre de 2026 (anterior a esta actualización)

Se ejecutaron **37 pruebas E2E en Chrome**, tanto con servidor local como contra
la página publicada en GitHub Pages. En cada ejecución: **35 aprobadas, 2 fallidas,
0 omitidas**, código de salida **1**. El resultado global **NO está aprobado**.

| Área comprobada | Resultado |
|---|---|
| Registro, teléfono opcional, campos inválidos, términos y correo duplicado | ✅ |
| Login correcto/incorrecto, bloqueo, expiración, recarga y cierre de sesión | ✅ |
| Crear reserva, total, persistencia, capacidad y prevención de solapamiento | ✅ |
| Consultar reservas propias y estados Próxima / En curso / Finalizada | ✅ |
| Editar habitación y fechas válidas, recalcular precio y descartar cambios | ✅ |
| Rechazar edición con fechas incompletas, orden incorrecto, exceso de huéspedes o habitación ocupada | ✅ |
| Rechazar edición con entrada en el pasado | Falló: permite guardar una fecha anterior a hoy |
| Eliminar con confirmación, abortar y liberar disponibilidad | ✅ (elimina el registro; no lo marca Cancelada) |
| Eliminar todas las reservas propias sin borrar las de otra cuenta | ✅ |
| Recursos, teléfono, teclado, colores de éxito/error y token de paleta informativa | ✅ |
| Login y reservas sin desbordamiento a 320, 390, 1024 y 1440 px | ✅ |
| Login sin desbordamiento a 768 px | Falló: el contenido ocupa 790 px; no se continuó con reservas a ese ancho |

En aquella ejecución, las pruebas estaban en `tests/` y se repetían con `npm test`.
Los archivos de esa suite aparecen eliminados en la copia de trabajo actual.
El reporte
HTML queda en `playwright-report/index.html`, y los resultados JSON, capturas y
trazas de fallos en `test-results/`. Son archivos locales ignorados por Git.

**Límites de aquella ejecución:** no se verificaron otros navegadores, dispositivos físicos ni
conformidad completa de accesibilidad. No existían backend, MongoDB, CRUD
administrativo, buscador/filtros/paginación de reservas, modal de cancelación ni
estado Cancelada persistente. La sesión funciona solo en el navegador, no en un
servidor. Los colores de la paleta declarados en CSS no prueban que exista una
pantalla que utilice cada estado. No se cambiaron funcionalidades para ocultar
los dos fallos.

## Objetivo

Este documento descompone las 9 Historias de Usuario (HUS) del proyecto Full Stack en tareas de UI/UX, Frontend, Backend, Base de Datos, validaciones, pruebas y Git/GitHub.

> **Importante:** La responsabilidad asignada indica quién lidera la tarea durante el Sprint. No significa que solamente esa persona pueda ejecutarla. Los tres aprendices deben participar en el flujo de Git/GitHub.

---

# 1. HUS-01 — Inicio de sesión

**Historia de Usuario**

> Como usuario registrado, quiero iniciar sesión para acceder al sistema según mis permisos.

## Tareas

| ID | Tarea | Área | Responsable sugerido |
|---|---|---|---|
| T01 | Diseñar wireframe de la pantalla de Login | UI/UX | Frontend |
| T02 | Definir paleta de colores y tipografía ✅ | UI/UX | Frontend |
| T03 | Crear estructura HTML/React de Login ✅ | Frontend | Frontend |
| T04 | Diseñar formulario de usuario/correo y contraseña ✅ | UI/UX | Frontend |
| T05 | Implementar validaciones de campos obligatorios ✅ | Frontend | Frontend |
| T06 | Crear endpoint `POST /api/auth/login` | Backend | Backend |
| T07 | Validar credenciales en el servidor | Backend | Backend |
| T08 | Consultar usuario en MongoDB | Base de datos | Backend |
| T09 | Implementar manejo de sesión/token | Backend | Backend |
| T10 | Mostrar mensajes de error y éxito ✅ | Frontend | Frontend |
| T11 | Probar login exitoso ✅ | QA | Integración/DevOps |
| T12 | Probar credenciales incorrectas ✅ | QA | Integración/DevOps |
| T13 | Crear Pull Request | Git/GitHub | Todos |
| T14 | Realizar Code Review | Git/GitHub | Todos |

## UI/UX

### Paleta sugerida

| Elemento | Color |
|---|---|
| Azul principal | `#2563EB` ✅ |
| Azul oscuro | `#1E3A8A` ✅ |
| Fondo | `#F8FAFC` ✅ |
| Blanco | `#FFFFFF` ✅ |
| Éxito | `#16A34A` ✅ |
| Error | `#DC2626` ✅ |
| Texto | `#1E293B` ✅ |

### Elementos de pantalla

- Logo ✅
- Nombre de la aplicación ✅
- Campo de correo electrónico ✅
- Campo de contraseña ✅
- Mostrar/ocultar contraseña ✅
- Botón **Iniciar sesión** ✅
- Enlace **Registrarse** ✅
- Enlace **¿Olvidaste tu contraseña?**, si se implementa ✅
- Mensajes de validación ✅
- Mensajes de error ✅
- Diseño responsive ✅ (verificación actual en navegador local, incluido 768 px)

### Boceto conceptual

```text
┌─────────────────────────────────────┐
│              LOGO                   │
│       Sistema de Reservas           │
│                                     │
│       Correo electrónico            │
│       [____________________]        │
│                                     │
│       Contraseña                    │
│       [____________________] 👁      │
│                                     │
│       [     INICIAR SESIÓN     ]    │
│                                     │
│       ¿No tienes cuenta?            │
│          Registrarse                │
└─────────────────────────────────────┘
```

---

# 2. HUS-02 — Registro de usuario

**Historia de Usuario**

> Como visitante, quiero registrarme para poder utilizar el sistema.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar wireframe de Registro | UI/UX | Frontend |
| T02 | Definir campos del formulario ✅ | UI/UX | Frontend |
| T03 | Crear formulario ✅ | Frontend | Frontend |
| T04 | Validar nombre ✅ | Frontend | Frontend |
| T05 | Validar correo ✅ | Frontend | Frontend |
| T06 | Validar contraseña ✅ | Frontend | Frontend |
| T07 | Crear `POST /api/auth/register` | Backend | Backend |
| T08 | Verificar que el correo no exista | Backend | Backend |
| T09 | Crear modelo Usuario | Backend/BD | Backend |
| T10 | Guardar usuario en MongoDB | BD | Backend |
| T11 | Implementar protección de contraseña | Backend | Backend |
| T12 | Mostrar confirmación de registro ✅ | Frontend | Frontend |
| T13 | Probar registro válido ✅ | QA | Integración/DevOps |
| T14 | Probar correo duplicado ✅ | QA | Integración/DevOps |
| T15 | Crear PR y realizar revisión | Git/GitHub | Todos |

## UI/UX

### Elementos de pantalla

- Logo ✅
- Nombre de aplicación ✅
- Nombre completo ✅
- Correo electrónico ✅
- Teléfono ✅
- Contraseña ✅
- Confirmar contraseña ✅
- Botón **Registrarse** ✅
- Enlace **Volver al Login** ✅
- Mensajes de validación ✅
- Indicador de contraseña segura

### Recomendaciones

- Utilizar verde para confirmaciones. ✅
- Utilizar rojo para errores. ✅
- Utilizar azul para acciones principales (solo al pasar el cursor; el fondo normal es oscuro).
- Mantener etiquetas visibles. ✅
- Mostrar mensajes de validación debajo del campo correspondiente. ✅
- Indicar claramente los campos obligatorios.

---

# 3. HUS-03 — Dashboard

**Historia de Usuario**

> Como usuario autenticado, quiero visualizar un panel principal para consultar rápidamente el estado del sistema.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar estructura del Dashboard ✅ | UI/UX | Frontend |
| T02 | Diseñar menú de navegación ✅ | UI/UX | Frontend |
| T03 | Crear Header ✅ | Frontend | Frontend |
| T04 | Crear Sidebar/Navbar ✅ | Frontend | Frontend |
| T05 | Crear tarjetas estadísticas ✅ (datos locales) | Frontend | Frontend |
| T06 | Mostrar cantidad de usuarios | Backend | Backend |
| T07 | Mostrar cantidad de servicios | Backend | Backend |
| T08 | Mostrar cantidad de reservas | Backend | Backend |
| T09 | Crear endpoint de estadísticas | Backend | Backend |
| T10 | Integrar Dashboard con API | Frontend | Frontend |
| T11 | Implementar responsive ✅ | UI/UX | Frontend |
| T12 | Realizar pruebas ✅ (dashboard local y responsive; sin API) | QA | Integración/DevOps |
| T13 | Crear PR | Git | Todos |

## Paleta sugerida

| Elemento | Color |
|---|---|
| Fondo | `#F1F5F9` |
| Navbar | `#1E3A8A` ✅ |
| Principal | `#2563EB` ✅ |
| Éxito | `#16A34A` ✅ |
| Advertencia | `#F59E0B` ✅ |
| Error | `#DC2626` ✅ |
| Texto | `#1E293B` ✅ |

## Elementos de pantalla

- Header ✅
- Logo ✅
- Nombre de usuario ✅
- Menú de usuario ✅
- Sidebar/Navbar ✅
- Dashboard ✅
- Tarjetas estadísticas ✅ (locales)
- Usuarios registrados ✅ (administrador)
- Servicios disponibles ✅ (servicios activos; disponibilidad por fechas en reservas)
- Reservas ✅ (propias para usuario; totales para administrador)
- Reservas recientes ✅
- Estados ✅
- Acciones rápidas ✅

---

# 4. HUS-04 — Gestión de usuarios

**Historia de Usuario**

> Como administrador, quiero gestionar usuarios para mantener actualizada la información del sistema.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar pantalla de usuarios ✅ | UI/UX | Frontend |
| T02 | Diseñar tabla de usuarios ✅ | UI/UX | Frontend |
| T03 | Diseñar botón Nuevo Usuario ✅ | UI/UX | Frontend |
| T04 | Crear formulario Usuario ✅ | Frontend | Frontend |
| T05 | Crear `GET /api/users` | Backend | Backend |
| T06 | Crear `POST /api/users` | Backend | Backend |
| T07 | Crear `PUT /api/users/:id` | Backend | Backend |
| T08 | Crear `DELETE /api/users/:id` | Backend | Backend |
| T09 | Crear modelo Usuario | BD | Backend |
| T10 | Implementar búsqueda local ✅ (backend pendiente) | Frontend/Backend | Frontend |
| T11 | Implementar confirmación antes de eliminar ✅ | UI/UX | Frontend |
| T12 | Mostrar estados ✅ | UI/UX | Frontend |
| T13 | Probar CRUD completo ✅ (usuarios locales; sin endpoints ni BD) | QA | Integración/DevOps |
| T14 | Resolver errores encontrados | Todos | Todos |

## Elementos de pantalla

- Título **Gestión de usuarios** ✅
- Botón `+ Nuevo usuario` ✅
- Buscador ✅
- Filtros ✅
- Tabla ✅
- Nombre ✅
- Correo ✅
- Rol ✅
- Estado ✅
- Fecha de registro ✅ (nuevos registros; cuentas antiguas sin fecha: No disponible)
- Acción Editar ✅
- Acción Eliminar ✅ (confirmación y protección del historial)
- Paginación ✅

## Colores de estado

| Estado | Color |
|---|---|
| Activo | `#16A34A` ✅ |
| Inactivo | `#DC2626` ✅ |
| Pendiente | `#F59E0B` |

---

# 5. HUS-05 — Gestión de servicios

**Historia de Usuario**

> Como administrador, quiero gestionar los servicios disponibles para que puedan ser utilizados en las reservas.

**Implementación actual: solo frontend.** Las habitaciones se administran como
servicios en `localStorage`, conservando los identificadores del catálogo
original y las reservas existentes. Precio por noche y duración mínima en
noches (no citas por minutos). La capacidad se mantiene entre 1 y 4 huéspedes.
Solo el administrador accede a esta pantalla.

Los servicios inactivos no admiten nuevas reservas. Editar el catálogo no cambia
el nombre ni el total histórico de una reserva; al editar esa reserva se aplican
las condiciones actuales. Un servicio con reservas no se elimina: puede
desactivarse. La eliminación sin reservas requiere confirmación.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar pantalla de servicios ✅ | UI/UX | Frontend |
| T02 | Diseñar tarjetas/listado de servicios ✅ | UI/UX | Frontend |
| T03 | Diseñar formulario de servicio ✅ | UI/UX | Frontend |
| T04 | Crear CRUD de servicios | Backend | Backend |
| T05 | Crear modelo Servicio | BD | Backend |
| T06 | Crear endpoint GET | Backend | Backend |
| T07 | Crear endpoint POST | Backend | Backend |
| T08 | Crear endpoint PUT | Backend | Backend |
| T09 | Crear endpoint DELETE | Backend | Backend |
| T10 | Implementar búsqueda ✅ (nombre, descripción y categoría) | Frontend | Frontend |
| T11 | Implementar filtro por estado ✅ | Frontend | Frontend |
| T12 | Validar precio/duración ✅ solo frontend; backend pendiente | Frontend/Backend | Backend |
| T13 | Probar CRUD ✅ local en navegador; backend/BD no verificados | QA | Integración/DevOps |
| T14 | Crear PR | Git | Todos |

### Funcionalidad local adicional

- Crear, consultar, editar y eliminar servicios ✅ (no certifica T04 de backend).
- Persistir catálogo e imágenes en este navegador ✅.
- Confirmar eliminación, cancelar y cerrar con Escape ✅.
- Rechazar nombre duplicado, precio/duración/capacidad inválidos e imagen de tipo no permitido ✅.
- Mostrar errores de almacenamiento sin indicar éxito ✅.
- Integrar servicios activos con reservas, precio, capacidad y estancia mínima ✅.
- Conservar historial y bloquear eliminación de servicios con reservas ✅.
- Responsive del catálogo a 320, 390, 768, 1024 y 1440 px ✅; formulario a 320 y 768 px ✅.

Validación mediante archivo local en el navegador integrado; no se ejecutó
la suite anterior ni se verificó GitHub Pages. Las tareas de backend/BD/PR
permanecen sin check.

## Elementos

Cada servicio puede mostrarse como una tarjeta:

```text
┌──────────────────────────┐
│       🖼 Imagen          │
│                          │
│ Corte de cabello        │
│                          │
│ Duración: 45 min        │
│ Precio: $30.000         │
│ Estado: ● Disponible    │
│                          │
│ [Editar] [Eliminar]     │
└──────────────────────────┘
```

### Campos del servicio

- Nombre ✅
- Descripción ✅
- Precio ✅ (por noche)
- Duración ✅ (estancia mínima en noches)
- Imagen opcional ✅ (archivo local PNG/JPEG/WebP hasta 1 MB)
- Estado ✅ (Disponible / Inactivo)
- Categoría ✅
- Capacidad ✅ (huéspedes)

---

# 6. HUS-06 — Crear reserva

**Historia de Usuario**

> Como usuario, quiero crear una reserva seleccionando un servicio, fecha y hora disponibles.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar flujo de reserva ✅ | UI/UX | Frontend |
| T02 | Diseñar selector de servicio | UI/UX | Frontend |
| T03 | Diseñar selector de fecha ✅ | UI/UX | Frontend |
| T04 | Diseñar selector de hora | UI/UX | Frontend |
| T05 | Crear formulario ✅ | Frontend | Frontend |
| T06 | Crear modelo Reserva | BD | Backend |
| T07 | Crear `POST /api/reservations` | Backend | Backend |
| T08 | Validar disponibilidad | Backend | Backend |
| T09 | Evitar reservas duplicadas | Backend | Backend |
| T10 | Guardar reserva | BD | Backend |
| T11 | Mostrar confirmación ✅ | Frontend | Frontend |
| T12 | Mostrar resumen antes de confirmar | UI/UX | Frontend |
| T13 | Probar reserva ✅ | QA | Integración/DevOps |
| T14 | Probar intento de reserva duplicada ✅ | QA | Integración/DevOps |

## Elementos

```text
Nueva reserva

Servicio
[ Seleccione un servicio ▼ ]

Fecha
[ 📅 10/09/2026 ]

Hora
[ 10:30 AM ▼ ]

Observaciones
[________________________]

Resumen
Servicio: Corte de cabello
Fecha: 10/09/2026
Hora: 10:30 AM
Valor: $30.000

[Cancelar] [Confirmar reserva]
```

## UI/UX

Se recomienda utilizar el siguiente flujo:

**Servicio → Fecha → Hora → Confirmación**

El usuario debe poder identificar fácilmente:

1. Qué servicio está reservando.
2. Para qué fecha.
3. A qué hora.
4. Cuánto cuesta, si aplica.
5. Qué debe confirmar.

---

# 7. HUS-07 — Consultar reservas

**Historia de Usuario**

> Como usuario, quiero consultar mis reservas para conocer las fechas, horarios y estados.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar pantalla Mis Reservas ✅ | UI/UX | Frontend |
| T02 | Diseñar tabla/listado ✅ | UI/UX | Frontend |
| T03 | Crear endpoint GET reservas | Backend | Backend |
| T04 | Filtrar reservas por usuario | Backend | Backend |
| T05 | Mostrar estado de reserva ✅ | Frontend | Frontend |
| T06 | Crear filtros por fecha | Frontend | Frontend |
| T07 | Crear filtros por estado | Frontend | Frontend |
| T08 | Crear vista detalle | Frontend | Frontend |
| T09 | Implementar paginación | Frontend | Frontend |
| T10 | Probar consultas ✅ | QA | Integración/DevOps |

## Elementos

- Título **Mis reservas** ✅
- Buscador
- Filtro por fecha
- Filtro por estado
- Tabla/listado ✅
- Servicio (habitación) ✅
- Fecha ✅
- Hora
- Usuario
- Estado ✅
- Acciones ✅
- Vista detalle

## Estados

| Estado | Color sugerido |
|---|---|
| Confirmada | Verde `#16A34A` |
| Pendiente | Amarillo `#F59E0B` |
| Cancelada | Rojo `#DC2626` |
| Finalizada | Gris/Azul ✅ |

---

# 8. HUS-08 — Actualizar reserva

**Historia de Usuario**

> Como usuario, quiero modificar una reserva para cambiar su fecha, hora o servicio cuando sea necesario.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar botón Editar ✅ | UI/UX | Frontend |
| T02 | Diseñar formulario de edición ✅ | UI/UX | Frontend |
| T03 | Cargar datos existentes ✅ | Frontend | Frontend |
| T04 | Crear `PUT /api/reservations/:id` | Backend | Backend |
| T05 | Validar nueva disponibilidad | Backend | Backend |
| T06 | Evitar modificación de reservas canceladas | Backend | Backend |
| T07 | Actualizar MongoDB | BD | Backend |
| T08 | Mostrar confirmación ✅ | Frontend | Frontend |
| T09 | Mostrar errores ✅ | Frontend | Frontend |
| T10 | Probar actualización ✅ (frontend local: administrador edita reserva ajena; cliente no puede) | QA | Integración/DevOps |
| T11 | Probar horario no disponible | QA | Integración/DevOps |

## Elementos

Formulario:

- Servicio (habitación) ✅
- Fecha ✅
- Hora
- Observaciones
- Estado, si corresponde
- Botón **Guardar cambios** ✅
- Botón **Cancelar** (Descartar edición) ✅

### Confirmación

Antes de guardar:

> ¿Está seguro de actualizar esta reserva?

Botones:

**Cancelar | Confirmar cambios**

---

# 9. HUS-09 — Cancelar reserva

**Historia de Usuario**

> Como usuario, quiero cancelar una reserva para liberar el horario seleccionado.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar botón Cancelar | UI/UX | Frontend |
| T02 | Diseñar modal de confirmación | UI/UX | Frontend |
| T03 | Crear endpoint de cancelación | Backend | Backend |
| T04 | Validar propietario de reserva | Backend | Backend |
| T05 | Cambiar estado a cancelada | Backend | Backend |
| T06 | Liberar disponibilidad | Backend | Backend |
| T07 | Actualizar listado ✅ | Frontend | Frontend |
| T08 | Mostrar mensaje de confirmación ✅ | Frontend | Frontend |
| T09 | Probar cancelación | QA | Integración/DevOps |
| T10 | Probar reserva ya cancelada | QA | Integración/DevOps |
| T11 | Crear PR | Git/GitHub | Todos |

## Modal de confirmación

```text
┌─────────────────────────────────┐
│       ⚠ Cancelar reserva        │
│                                 │
│ ¿Está seguro de cancelar        │
│ esta reserva?                   │
│                                 │
│ Servicio: Corte de cabello      │
│ Fecha: 10/09/2026               │
│ Hora: 10:30 AM                  │
│                                 │
│ [No cancelar] [Sí, cancelar]   │
└─────────────────────────────────┘
```

### Colores

- Acción destructiva: rojo `#DC2626`
- Cancelar proceso: gris `#64748B`
- Advertencia: amarillo `#F59E0B`

---

# 10. Sistema visual general del proyecto

Para que los tres aprendices trabajen sobre una misma aplicación, se recomienda definir desde el Sprint 1 un pequeño **Design System**.

## Paleta general

| Uso | Color | Hex |
|---|---|---|
| Primario | Azul | `#2563EB` ✅ |
| Primario oscuro | Azul oscuro | `#1E3A8A` ✅ |
| Fondo | Gris claro | `#F8FAFC` ✅ |
| Superficie | Blanco | `#FFFFFF` ✅ |
| Texto principal | Gris oscuro | `#1E293B` ✅ |
| Texto secundario | Gris | `#64748B` ✅ |
| Éxito | Verde | `#16A34A` ✅ |
| Advertencia | Amarillo | `#F59E0B` ✅ |
| Error | Rojo | `#DC2626` ✅ |
| Información | Celeste | `#0284C7` ✅ |
| Bordes | Gris | `#CBD5E1` ✅ |

---

# 11. Elementos comunes en todas las pantallas

## Header

Debe contener:

- Logo/nombre de aplicación ✅
- Nombre de usuario ✅
- Avatar opcional
- Menú de usuario ✅
- Cerrar sesión ✅

## Menú lateral

Puede contener:

- 🏠 Dashboard ✅ (navbar)
- 👥 Usuarios ✅ (navbar; solo administrador)
- 🛠 Servicios ✅ (navbar; solo administrador)
- 📅 Reservas ✅ (navbar)
- 👤 Mi perfil
- 🚪 Cerrar sesión ✅ (menú de cuenta)

## Botones

Se recomienda mantener una convención uniforme:

| Acción | Color |
|---|---|
| Acción principal | Azul |
| Confirmar/activar | Verde |
| Advertencia | Amarillo |
| Eliminar/cancelar | Rojo ✅ |
| Cancelar/volver | Gris |

## Formularios

Todos deberían contemplar:

- Label ✅
- Input ✅
- Placeholder
- Validación ✅
- Mensaje de error ✅
- Indicador de campo obligatorio `*` (fechas y nombre/correo de gestión de usuarios; falta en registro/login)
- Botón Guardar ✅
- Botón Cancelar ✅

## Tablas

Las tablas deberían contemplar, cuando corresponda:

- Encabezados ✅ (tabla de usuarios)
- Datos ✅ (tabla de usuarios)
- Estado ✅
- Acciones ✅
- Búsqueda ✅ (usuarios; pendiente en reservas)
- Filtros ✅ (rol/estado de usuarios; pendientes en reservas)
- Paginación ✅ (usuarios; pendiente en reservas)
- Mensaje cuando no existan registros ✅

---

# 12. Responsabilidad de los tres aprendices

La responsabilidad debe rotarse durante los tres Sprint.

| Sprint | Aprendiz 1 | Aprendiz 2 | Aprendiz 3 |
|---|---|---|---|
| Sprint 1 | Frontend | Backend | Integración/DevOps |
| Sprint 2 | Backend | Integración/DevOps | Frontend |
| Sprint 3 | Integración/DevOps | Frontend | Backend |

## Regla fundamental

**Responsable ≠ único encargado.**

Los tres aprendices deben participar en el flujo completo:

```text
Issue
  ↓
Branch
  ↓
Desarrollo
  ↓
Commit
  ↓
Push
  ↓
Pull Request
  ↓
Code Review
  ↓
Pruebas
  ↓
GitHub Actions
  ↓
Merge
  ↓
Develop
  ↓
Main
```

---

# 13. Estructura recomendada en GitHub Projects

Cada HUS puede convertirse en una **Issue principal**, y las tareas en subtareas.

Ejemplo:

```text
HUS-06 - Crear reserva
│
├── TASK-01 Diseñar wireframe
├── TASK-02 Diseñar selector de servicio
├── TASK-03 Diseñar selector de fecha
├── TASK-04 Diseñar selector de hora
├── TASK-05 Crear formulario Frontend
├── TASK-06 Crear modelo Reserva
├── TASK-07 Crear endpoint POST
├── TASK-08 Validar disponibilidad
├── TASK-09 Guardar reserva
├── TASK-10 Integrar Frontend + Backend
├── TASK-11 Pruebas
├── TASK-12 Code Review
└── TASK-13 Integración
```

## Flujo de las tareas

```text
Backlog
   ↓
Pendiente
   ↓
En Desarrollo
   ↓
Code Review
   ↓
Pruebas
   ↓
Finalizado
```

---

# 14. Flujo pedagógico completo

La estructura recomendada para cada Historia de Usuario es:

```text
Historia de Usuario
        ↓
Criterios de aceptación
        ↓
Diseño UI/UX
        ↓
Tareas Frontend
        ↓
Tareas Backend
        ↓
Tareas Base de Datos
        ↓
Tareas de pruebas
        ↓
Issue
        ↓
Branch
        ↓
Commit
        ↓
Push
        ↓
Pull Request
        ↓
Code Review
        ↓
GitHub Actions
        ↓
Merge
        ↓
Finalizado
```
