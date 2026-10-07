# Credenciales de acceso y prueba

## Administrador

| Rol | Correo electronico | Contrasena | Estado |
|---|---|---|---|
| Administrador de demostracion | `baez91876@gmail.com` | `1234` | Creado automaticamente en este navegador al abrir la pagina |

No es necesario registrar al administrador. En la primera carga de esta
actualizacion se crea la cuenta local o se configura la existente con este
correo: rol administrador, estado activo y contrasena de demostracion `1234`.
La configuracion se aplica una sola vez por cuenta; los cambios posteriores
del administrador no se restablecen en cada recarga.

`1234` es una contrasena publica e insegura, exclusiva de esta demostracion.
Las cuentas de clientes mantienen la validacion de contrasena fuerte.

## Usuarios de prueba documentados

Estas son todas las credenciales de demostracion que estaban documentadas.
Son datos historicos de pruebas, no cuentas precargadas ni accesos verificados
en el navegador actual.

| Rol previsto al registrarse | Correo electronico | Contrasena de prueba | Estado |
|---|---|---|---|
| Usuario | `prueba.local@example.com` | `Prueba#2026` | Historica; existencia actual no verificada |
| Usuario | `qa-1790181323065@example.com` | `Prueba#2026` | Historica; existencia actual no verificada |
| Usuario | `qa-completo-1790181441018@example.com` | `Prueba#2026` | Historica; existencia actual no verificada |
| Usuario | `ana@example.com` | `Prueba#2026` | Historica; existencia actual no verificada |
| Usuario | `luis@example.com` | `Prueba#2026` | Historica; existencia actual no verificada |

## Como acceder

1. Abre la pagina.
2. Para administrador, inicia sesion con `baez91876@gmail.com` y `1234`, sin registrarte.
3. Para una demostracion de usuario, registra uno de los correos de prueba de
   la tabla con su contrasena de prueba. No uses esa contrasena para cuentas reales.
4. Acepta los terminos, crea la cuenta e inicia sesion.
5. El administrador tiene acceso a **Usuarios**, **Servicios** y a ver y editar
   todas las reservas locales, conservando su propietario. Los clientes solo
   ven su dashboard y sus propias reservas; no ven los modulos administrativos
   ni los datos de otros clientes. El administrador no recibe permiso para
   eliminar reservas de otros clientes.

## Comprobacion del navegador compartido

Antes de esta actualizacion habia **0 cuentas guardadas** en el navegador
compartido. Ahora la pagina crea el administrador de demostracion al abrirse.
Las cuentas temporales de validacion se retiraron; no se incluyen como accesos
disponibles.

> Las cuentas solo funcionan en el navegador y origen donde se registran,
> porque la aplicacion usa `localStorage`. Abrir el archivo local y abrir
> GitHub Pages no comparte cuentas. No existe un listado central de usuarios.
> Estos datos no certifican accesos en otros navegadores ni en la pagina publicada.
>
> Solo se documentan contrasenas de prueba, nunca contrasenas reales.
> La autenticacion y los roles locales son una demostracion, no seguridad
> de produccion. No se implemento backend.