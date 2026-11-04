# Conexion a Supabase

El cliente del proyecto se configura en `supabaseClient.js` y se puede importar desde cualquier modulo JavaScript del navegador:

```js
import { supabase } from './Supabase Connection/supabaseClient.js';
```

La pagina debe servirse mediante HTTP o HTTPS para que el navegador pueda cargar el modulo ES de Supabase. No se debe abrir directamente como archivo `file://`.

La publishable key esta pensada para uso en el navegador. Los permisos y la proteccion de los datos deben configurarse en Supabase mediante Row Level Security (RLS) y politicas por tabla. Nunca se debe colocar una `service_role` key en codigo de cliente.

Las categorías y la aplicación del esquema y las políticas de Monzú quedan pendientes.

## Preparación propuesta

`schema.sql` contiene una propuesta de tablas para obras, categorías, fotografías, destacados y administradores, además de políticas RLS y un bucket privado. No se ha ejecutado. Antes de aplicarlo, revisar su contenido, los nombres y los recursos existentes del proyecto; también hay que verificar que ninguna política previa permita acceso adicional al bucket privado. Probar explícitamente los permisos con usuarios anónimos, usuarios autenticados sin privilegios y administradores.

Después de crear un usuario en Supabase Auth, un administrador del proyecto debe añadir su UUID a `public.monzu_admins` mediante una operación autorizada desde el panel de Supabase. No se deben incluir contraseñas ni claves privadas en este repositorio. Las categorías se incorporarán cuando estén definidas.

El sitio usa temporalmente `catalogSource: 'demo'` en `site-config.js`. Cambiarlo a `'supabase'` solo después de aplicar y comprobar el esquema, configurar un administrador y disponer de las categorías y obras correspondientes. El bucket es privado: cada fotografía se descarga bajo las políticas de acceso, sin enlaces públicos persistentes. Las políticas deben impedir el acceso público a los borradores. La administración está en `Guía\administracion\admin.html`.