# Conexion a Supabase

El cliente del proyecto se configura en `supabaseClient.js` y se puede importar desde cualquier modulo JavaScript del navegador:

```js
import { supabase } from './Supabase Connection/supabaseClient.js';
```

La pagina debe servirse mediante HTTP o HTTPS para que el navegador pueda cargar el modulo ES de Supabase. No se debe abrir directamente como archivo `file://`.

La publishable key esta pensada para uso en el navegador. Los permisos y la proteccion de los datos deben configurarse en Supabase mediante Row Level Security (RLS) y politicas por tabla. Nunca se debe colocar una `service_role` key en codigo de cliente.

El esquema y las políticas de Monzú se aplicaron al proyecto remoto el 2026-11-06. Las tablas están creadas y se importaron las fotografías de instalaciones.

## Estado remoto

`schema.sql` se aplicó después de confirmar que sus tablas, funciones y bucket no existían. Se verificaron la RPC `public.monzu_is_admin()`, la autorización de una cuenta confirmada y el bucket privado `monzu-artwork-images`. El proveedor Email está habilitado y Supabase requiere confirmar el correo antes del primer inicio de sesión.

La cuenta administradora ya está registrada en `public.monzu_admins`. Para autorizar otras cuentas, añade su UUID de Auth mediante una operación autorizada desde el panel de Supabase. No incluyas contraseñas ni claves privadas en este repositorio. El esquema SQL no es idempotente: no vuelvas a ejecutar el archivo completo; prepara una migración específica para cambios futuros.

El sitio usa `catalogSource: 'supabase'` en `site-config.js`. El bucket es privado: cada fotografía se descarga bajo las políticas de acceso, sin enlaces públicos persistentes. Las políticas impiden el acceso público a los borradores. La administración está en `administracion\admin.html`: requiere una cuenta autorizada y categorías existentes para publicar; las obras ocultas se guardan como borradores. La categoría «Instalaciones» contiene 23 obras de una fotografía, importadas sin descripciones.