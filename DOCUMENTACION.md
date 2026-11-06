# Documentación de Monzú

Registro preparado para trasladar los cambios al documento de Drive «Emprendimiento Monzú».

## Base visual y navegación

- **Fecha:** 2026-11-03.
- **Implementación:** estructura pública en HTML, CSS y JavaScript, con cabecera, menú lateral, estilos blanco y cálido intercambiables y diseño adaptable.
- **Explicación:** el portafolio prioriza las obras, permite comparar ambas direcciones visuales y mantiene las secciones futuras identificadas como no disponibles.

## Refinamiento visual

- **Fecha:** 2026-11-06.
- **Implementación:** se reforzó la jerarquía editorial de la portada con acento terracota, titulares de escala estable, ritmo entre secciones y marcos sutiles en la obra. Administración ahora sigue el catálogo real de tarjetas en lugar de reglas de tabla obsoletas; se pulieron login, búsqueda, estados, controles y modal.
- **Explicación:** se conservan el orden del sitio, el contenido y los flujos existentes. El footer compartido incorpora firma de marca, navegación, contacto directo y un símbolo reconocible de WhatsApp agrupado con el teléfono; por compartir implementación, aparece también en la galería. Enlaces a Inicio dentro de la portada desplazan arriba sin recargar mediante una animación explícita de `requestAnimationFrame`, incluso si `prefers-reduced-motion` está activo, por solicitud de diseño. Entre páginas estáticas se usa una transición JavaScript/CSS de salida y entrada que sí respeta `prefers-reduced-motion`; no se depende de View Transitions nativas.

## Datos de prueba y selección de obras

- **Fecha:** 2026-11-03.
- **Implementación:** se preparó un catálogo de demostración de seis obras en `catalog.js`. La fuente actual se indica en `site-config.js`.
- **Explicación:** este catálogo es provisional y no se usa en la configuración pública actual.

## Carruseles y galería

- **Fecha:** 2026-11-03.
- **Implementación:** dos carruseles manuales con Swiper, detalle compartido, galería adaptable, selector de columnas y carga incremental. La vista previa muestra hasta 24 fotografías.
- **Explicación:** el catálogo público muestra una portada por obra. En móviles se mantienen dos espacios por carrusel y dos columnas en la galería.

## Fotografías y vista independiente

- **Fecha:** 2026-11-06.
- **Implementación:** se importaron 23 fotografías de instalaciones a Supabase, una por obra y sin descripciones. El sitio consulta Supabase y los carruseles agrupan fotos independientes de dos en dos. `obra.html` muestra la imagen completa en la misma pestaña, con el nombre arriba y los detalles debajo.
- **Explicación:** las flechas laterales y las del teclado recorren la galería conservando el filtro de categoría; se cargan más resultados cuando se necesitan. El enlace de regreso conserva el filtro o vuelve al inicio según el origen. Los seis videos del archivo no se importaron.
- **Visualización:** las fotografías anterior y siguiente se asoman a los lados y también permiten navegar al seleccionarlas. La transición desplaza las imágenes suavemente, mantiene la fotografía central completa y respeta la preferencia de movimiento reducido. Las imágenes vecinas se descargan y decodifican durante la transición (blobs en caché por sesión), así que aparecen ya cargadas sin verse cargar.
- **Zoom:** un clic sobre la fotografía central la amplía; otro clic, la tecla Escape o un cambio de imagen la restablecen. En táctiles se usa el pellizco y el arrastre para desplazarse; en escritorio, Ctrl + rueda del ratón.

## Contacto

- **Fecha:** 2026-11-06.
- **Implementación:** footer compartido en `site.js` con enlaces a Inicio, Galería, correo y WhatsApp, incluido un símbolo accesible de marca.
- **Explicación:** la composición separa firma, navegación y contacto en escritorio, y se apila en móvil con objetivos táctiles amplios; conserva el tono oscuro y editorial del portafolio.

## Administración de obras

- **Fecha:** 2026-11-03.
- **Implementación:** panel en `administracion` con acceso mediante Supabase Auth, búsqueda, creación, edición, visibilidad y borrado confirmado.
- **Explicación:** los permisos se verifican en el servidor; el panel no considera que un inicio de sesión por sí solo sea suficiente para administrar el catálogo. Las categorías deben configurarse antes de publicar.

## Galería de administración

- **Fecha:** 2026-11-06.
- **Implementación:** cuadrícula de cuatro columnas en escritorio, búsqueda por nombre o categoría/colección, contador de resultados filtrados y menú contextual con edición, ocultación y borrado; el botón de opciones ofrece las mismas acciones en dispositivos táctiles y con teclado. El login permite mostrar u ocultar la contraseña sin modificar el flujo de Auth. Las obras nuevas se crean con una fotografía JPG/JPEG o PNG y se publican al guardarlas.
- **Explicación:** ocultar cambia la obra a borrador privado y mostrar la publica de nuevo; para publicar hacen falta una categoría y una imagen. Categoría y colección utilizan el mismo campo de Supabase. Al editar se conservan las imágenes y selecciones destacadas de las obras existentes, incluso si tienen varias fotos; el formulario modifica únicamente sus datos. Las obras nuevas no se agregan automáticamente a los carruseles.

## Preparación de Supabase

- **Fecha:** 2026-11-06.
- **Implementación:** esquema de `Supabase Connection\schema.sql` aplicado al proyecto remoto después de comprobar que las tablas y el bucket no existían. Se habilitó la RPC `monzu_is_admin`, se registró una cuenta Auth confirmada como administradora y se creó el bucket privado.
- **Explicación:** se verificaron la RPC, la pertenencia de la cuenta a `monzu_admins` y la privacidad del bucket. El archivo SQL no es idempotente y no debe volver a ejecutarse completo.

## Preparación de Cloudflare Workers

- **Fecha:** 2026-11-03.
- **Implementación:** configuración base en `wrangler.jsonc` y preparación de un directorio estático mediante la lista explícita de `tools\prepare-cloudflare.mjs`.
- **Explicación:** se excluyen las fotografías y los videos originales, las referencias, las pruebas y el esquema SQL. El script copia archivos sin compilar ni modificar el sitio y crea una configuración de despliegue en un directorio nuevo. No se debe servir la raíz del proyecto directamente: en Windows Wrangler no respetó el filtro de exclusión durante la prueba.

## Verificación y manejo de errores

- **Fecha:** 2026-11-03.
- **Implementación:** pruebas de catálogo, navegador de escritorio y móvil, administración simulada, políticas SQL en PostgreSQL local y preparación de Cloudflare sin despliegue. Se añadieron dimensiones para reservar espacio a las fotografías, navegación alternativa si Swiper no carga y recuperación explícita ante fallos parciales de administración.
- **Explicación:** las pruebas cubren el funcionamiento local y permisos simulados. El 2026-11-06 se verificaron objetos y permisos del proyecto remoto; falta probar el flujo completo desde el navegador con una sesión de la cuenta administradora.

## Ejecución y pendientes

- Servir la raíz del proyecto mediante HTTP/HTTPS; por ejemplo, ejecutar `python -m http.server 8765` y abrir `http://localhost:8765`.
- Con Node.js 24, ejecutar `node --test tests\catalog.test.mjs tests\gallery-navigation.test.mjs tests\cloudflare.test.mjs` para comprobar el catálogo, la navegación y los archivos preparados para Cloudflare.
- Para preparar un despliegue, ejecutar `node tools\prepare-cloudflare.mjs`, revisar los archivos generados y usar la configuración indicada por el script. Cada ejecución crea una carpeta nueva en `.cloudflare-build`; el `wrangler.jsonc` de la raíz apunta deliberadamente a una ruta inexistente para evitar publicar la raíz por accidente. Este paso solo copia archivos: no es necesario para ejecutar el sitio localmente.
- La interfaz pública utiliza Swiper 11.2.10 y tipografías de Google Fonts; si Swiper no carga, se muestra un aviso y queda disponible una navegación simplificada.
- El estado de Supabase se describe en `Supabase Connection\README.md`. El esquema está aplicado y una cuenta está autorizada; faltan las categorías, las obras definitivas y la prueba de extremo a extremo del acceso desde el navegador.
- La publicación en Cloudflare Workers, las redes sociales, los datos ampliados de las obras y las secciones Instalaciones, Info, CV y Contacto quedan para más adelante.
- La publicación en Cloudflare Workers, las redes sociales, los datos ampliados de las obras y las secciones Instalaciones, Info, CV y Contacto quedan para más adelante.
- Servir la raíz del proyecto mediante HTTP/HTTPS; por ejemplo, ejecutar `python -m http.server 8765` y abrir `http://localhost:8765`.
- Con Node.js 24, ejecutar `node --test tests\catalog.test.mjs tests\cloudflare.test.mjs` para comprobar el catálogo y los archivos preparados para Cloudflare.
- Para preparar un despliegue, ejecutar `node tools\prepare-cloudflare.mjs`, revisar los archivos generados y usar la configuración indicada por el script. Cada ejecución crea una carpeta nueva en `.cloudflare-build`; el `wrangler.jsonc` de la raíz apunta deliberadamente a una ruta inexistente para evitar publicar la raíz por accidente. Este paso solo copia archivos: no es necesario para ejecutar el sitio localmente.
- La interfaz pública utiliza Swiper 11.2.10 y tipografías de Google Fonts; si Swiper no carga, se muestra un aviso y queda disponible una navegación simplificada.
- El estado de Supabase se describe en `Supabase Connection\README.md`. El catálogo ya contiene las instalaciones importadas; queda pendiente definir el contenido definitivo y una interfaz para cambiar las selecciones de los carruseles.
- La publicación en Cloudflare Workers, las redes sociales, los datos ampliados de las obras y las secciones Instalaciones, Info, CV y Contacto quedan para más adelante.
