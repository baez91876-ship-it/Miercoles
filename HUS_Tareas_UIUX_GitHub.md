# Descomposición de Historias de Usuario en tareas — Sistema de Reservas

> ✅ indica que la página actual de Hotel Clara cumple el requisito de forma visible o en su lógica del navegador. No implica que exista implementación en servidor, base de datos o pruebas automatizadas.

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
| T09 | Implementar manejo de sesión/token ✅ | Backend | Backend |
| T10 | Mostrar mensajes de error y éxito ✅ | Frontend | Frontend |
| T11 | Probar login exitoso | QA | Integración/DevOps |
| T12 | Probar credenciales incorrectas | QA | Integración/DevOps |
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
- Diseño responsive ✅

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
| T13 | Probar registro válido | QA | Integración/DevOps |
| T14 | Probar correo duplicado | QA | Integración/DevOps |
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
- Utilizar azul para acciones principales. ✅
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
| T01 | Diseñar estructura del Dashboard | UI/UX | Frontend |
| T02 | Diseñar menú de navegación | UI/UX | Frontend |
| T03 | Crear Header | Frontend | Frontend |
| T04 | Crear Sidebar/Navbar | Frontend | Frontend |
| T05 | Crear tarjetas estadísticas | Frontend | Frontend |
| T06 | Mostrar cantidad de usuarios | Backend | Backend |
| T07 | Mostrar cantidad de servicios | Backend | Backend |
| T08 | Mostrar cantidad de reservas | Backend | Backend |
| T09 | Crear endpoint de estadísticas | Backend | Backend |
| T10 | Integrar Dashboard con API | Frontend | Frontend |
| T11 | Implementar responsive | UI/UX | Frontend |
| T12 | Realizar pruebas | QA | Integración/DevOps |
| T13 | Crear PR | Git | Todos |

## Paleta sugerida

| Elemento | Color |
|---|---|
| Fondo | `#F1F5F9` |
| Navbar | `#1E3A8A` |
| Principal | `#2563EB` |
| Éxito | `#16A34A` |
| Advertencia | `#F59E0B` |
| Error | `#DC2626` |
| Texto | `#1E293B` |

## Elementos de pantalla

- Header
- Logo
- Nombre de usuario
- Menú de usuario
- Sidebar/Navbar
- Dashboard
- Tarjetas estadísticas
- Usuarios registrados
- Servicios disponibles
- Reservas
- Reservas recientes
- Estados
- Acciones rápidas

---

# 4. HUS-04 — Gestión de usuarios

**Historia de Usuario**

> Como administrador, quiero gestionar usuarios para mantener actualizada la información del sistema.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar pantalla de usuarios | UI/UX | Frontend |
| T02 | Diseñar tabla de usuarios | UI/UX | Frontend |
| T03 | Diseñar botón Nuevo Usuario | UI/UX | Frontend |
| T04 | Crear formulario Usuario | Frontend | Frontend |
| T05 | Crear `GET /api/users` | Backend | Backend |
| T06 | Crear `POST /api/users` | Backend | Backend |
| T07 | Crear `PUT /api/users/:id` | Backend | Backend |
| T08 | Crear `DELETE /api/users/:id` | Backend | Backend |
| T09 | Crear modelo Usuario | BD | Backend |
| T10 | Implementar búsqueda | Frontend/Backend | Frontend |
| T11 | Implementar confirmación antes de eliminar | UI/UX | Frontend |
| T12 | Mostrar estados | UI/UX | Frontend |
| T13 | Probar CRUD completo | QA | Integración/DevOps |
| T14 | Resolver errores encontrados | Todos | Todos |

## Elementos de pantalla

- Título **Gestión de usuarios**
- Botón `+ Nuevo usuario`
- Buscador
- Filtros
- Tabla
- Nombre
- Correo
- Rol
- Estado
- Fecha de registro
- Acción Editar
- Acción Eliminar
- Paginación, si aplica

## Colores de estado

| Estado | Color |
|---|---|
| Activo | `#16A34A` |
| Inactivo | `#DC2626` |
| Pendiente | `#F59E0B` |

---

# 5. HUS-05 — Gestión de servicios

**Historia de Usuario**

> Como administrador, quiero gestionar los servicios disponibles para que puedan ser utilizados en las reservas.

## Tareas

| ID | Tarea | Área | Responsable |
|---|---|---|---|
| T01 | Diseñar pantalla de servicios | UI/UX | Frontend |
| T02 | Diseñar tarjetas/listado de servicios | UI/UX | Frontend |
| T03 | Diseñar formulario de servicio | UI/UX | Frontend |
| T04 | Crear CRUD de servicios | Backend | Backend |
| T05 | Crear modelo Servicio | BD | Backend |
| T06 | Crear endpoint GET | Backend | Backend |
| T07 | Crear endpoint POST | Backend | Backend |
| T08 | Crear endpoint PUT | Backend | Backend |
| T09 | Crear endpoint DELETE | Backend | Backend |
| T10 | Implementar búsqueda | Frontend | Frontend |
| T11 | Implementar filtro por estado | Frontend | Frontend |
| T12 | Validar precio/duración | Frontend/Backend | Backend |
| T13 | Probar CRUD | QA | Integración/DevOps |
| T14 | Crear PR | Git | Todos |

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

- Nombre
- Descripción
- Precio
- Duración
- Imagen opcional
- Estado
- Categoría

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
| T12 | Mostrar resumen antes de confirmar ✅ | UI/UX | Frontend |
| T13 | Probar reserva | QA | Integración/DevOps |
| T14 | Probar intento de reserva duplicada | QA | Integración/DevOps |

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
| T10 | Probar consultas | QA | Integración/DevOps |

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
| T10 | Probar actualización | QA | Integración/DevOps |
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
- Menú de usuario
- Cerrar sesión ✅

## Menú lateral

Puede contener:

- 🏠 Dashboard
- 👥 Usuarios
- 🛠 Servicios
- 📅 Reservas
- 👤 Mi perfil
- 🚪 Cerrar sesión

## Botones

Se recomienda mantener una convención uniforme:

| Acción | Color |
|---|---|
| Acción principal | Azul |
| Confirmar/activar | Verde |
| Advertencia | Amarillo |
| Eliminar/cancelar | Rojo ✅ |
| Cancelar/volver | Gris ✅ |

## Formularios

Todos deberían contemplar:

- Label ✅
- Input ✅
- Placeholder
- Validación ✅
- Mensaje de error ✅
- Indicador de campo obligatorio `*` ✅
- Botón Guardar ✅
- Botón Cancelar ✅

## Tablas

Las tablas deberían contemplar, cuando corresponda:

- Encabezados
- Datos
- Estado ✅
- Acciones ✅
- Búsqueda
- Filtros
- Paginación
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
