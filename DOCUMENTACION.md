# Documentación de Monzú

Registro preparado para trasladar los cambios al documento de Drive «Emprendimiento Monzú».

## Base visual y navegación

- **Fecha:** 2026-11-03.
- **Implementación:** estructura pública en HTML, CSS y JavaScript, con cabecera, menú lateral, estilos blanco y cálido intercambiables y diseño adaptable.
- **Explicación:** el portafolio prioriza las obras, permite comparar ambas direcciones visuales y mantiene las secciones futuras identificadas como no disponibles.

## Datos de prueba y selección de obras

- **Fecha:** 2026-11-03.
- **Implementación:** seis obras provisionales y veinte fotografías agrupadas en `catalog.js`; las copias optimizadas están en `assets\demo`, sin modificar las imágenes originales. `site-config.js` selecciona la fuente de demostración.
- **Explicación:** las fotos pertenecen a instalaciones y se utilizan solo como contenido temporal. Se emplean nombres genéricos y no se inventan categorías ni descripciones.

## Carruseles y galería

- **Fecha:** 2026-11-03.
- **Implementación:** dos carruseles manuales con Swiper, detalle compartido, galería adaptable, selector de columnas y carga incremental. La vista previa muestra hasta 24 fotografías.
- **Explicación:** durante las pruebas se muestra cada foto por separado; el catálogo definitivo mostrará una portada por obra. En móviles se mantienen dos fotos por carrusel y dos columnas en la galería.

## Contacto

- **Fecha:** 2026-11-03.
- **Implementación:** pie de página con enlaces directos de correo y WhatsApp.
- **Explicación:** la comunicación queda disponible sin anticipar páginas ni redes sociales que todavía no se han definido.

## Administración de obras

- **Fecha:** 2026-11-03.
- **Implementación:** panel en `Guía\administracion` con acceso mediante Supabase Auth, búsqueda, creación, edición, borrado confirmado, borradores y selección de destacados. El formulario permite ordenar imágenes JPG/JPEG y PNG y utiliza la primera como portada.
- **Explicación:** los permisos se verifican en el servidor; el panel no considera que un inicio de sesión por sí solo sea suficiente para administrar el catálogo. Las categorías deben configurarse antes de publicar.

## Preparación de Supabase

- **Fecha:** 2026-11-03.
- **Implementación:** propuesta de esquema, políticas RLS, almacenamiento privado y conexión de lectura en `Supabase Connection\schema.sql` y `supabase-catalog.js`. La fuente pública sigue configurada como demostración.
- **Explicación:** el esquema debe revisarse y probarse antes de aplicarlo en el proyecto remoto. Las imágenes se descargan mediante las políticas de acceso, de forma que los borradores no dependan de enlaces públicos permanentes. No se han modificado ni publicado recursos remotos.

## Preparación de Cloudflare Workers

- **Fecha:** 2026-11-03.
- **Implementación:** configuración base en `wrangler.jsonc` y preparación de un directorio estático mediante la lista explícita de `tools\prepare-cloudflare.mjs`.
- **Explicación:** se excluyen las fotografías y los videos originales, las referencias, las pruebas y el esquema SQL. El script copia archivos sin compilar ni modificar el sitio y crea una configuración de despliegue en un directorio nuevo. No se debe servir la raíz del proyecto directamente: en Windows Wrangler no respetó el filtro de exclusión durante la prueba.

## Verificación y manejo de errores

- **Fecha:** 2026-11-03.
- **Implementación:** pruebas de catálogo, navegador de escritorio y móvil, administración simulada, políticas SQL en PostgreSQL local y preparación de Cloudflare sin despliegue. Se añadieron dimensiones para reservar espacio a las fotografías, navegación alternativa si Swiper no carga y recuperación explícita ante fallos parciales de administración.
- **Explicación:** estas comprobaciones cubren el funcionamiento local y los permisos simulados; no sustituyen la revisión del proyecto de Supabase ni la prueba de extremo a extremo con sus tablas y usuarios reales.

## Ejecución y pendientes

- Servir la raíz del proyecto mediante HTTP/HTTPS; por ejemplo, ejecutar `python -m http.server 8765` y abrir `http://localhost:8765`.
- Con Node.js 24, ejecutar `node --test tests\catalog.test.mjs tests\cloudflare.test.mjs` para comprobar el catálogo y los archivos preparados para Cloudflare.
- Para preparar un despliegue, ejecutar `node tools\prepare-cloudflare.mjs`, revisar los archivos generados y usar la configuración indicada por el script. Cada ejecución crea una carpeta nueva en `.cloudflare-build`; el `wrangler.jsonc` de la raíz apunta deliberadamente a una ruta inexistente para evitar publicar la raíz por accidente. Este paso solo copia archivos: no es necesario para ejecutar el sitio localmente.
- La interfaz pública utiliza Swiper 11.2.10 y tipografías de Google Fonts; si Swiper no carga, se muestra un aviso y queda disponible una navegación simplificada.
- La configuración y los pasos previos para Supabase se describen en `Supabase Connection\README.md`. Falta revisar y aplicar el esquema, autorizar una cuenta, definir las categorías y sustituir las obras temporales.
- La publicación en Cloudflare Workers, las redes sociales, los datos ampliados de las obras y las secciones Instalaciones, Info, CV y Contacto quedan para más adelante.
