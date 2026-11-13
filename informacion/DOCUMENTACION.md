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
- **Implementación:** se preparó un catálogo de demostración de seis obras en `catalog.js`. La fuente actual se indica en `web/assets/js/site-config.js`.
- **Explicación:** este catálogo es provisional y no se usa en la configuración pública actual.

## Carruseles y galería

- **Fecha:** 2026-11-03.
- **Implementación:** dos carruseles manuales con Swiper, detalle compartido, galería adaptable, selector de columnas y carga incremental. La vista previa muestra hasta 24 fotografías.
- **Explicación:** el catálogo público muestra una portada por obra. En móviles se mantienen dos espacios por carrusel y dos columnas en la galería.

## Fotografías y vista independiente

- **Fecha:** 2026-11-06.
- **Implementación:** se importaron 23 fotografías de instalaciones a Supabase, una por obra y sin descripciones. El sitio consulta Supabase y los carruseles agrupan fotos independientes de dos en dos. `obra.html` muestra la imagen completa en la misma pestaña, con el nombre arriba y los detalles debajo.
- **Explicación:** las flechas laterales y las del teclado recorren la galería conservando el filtro de categoría; se cargan más resultados cuando se necesitan. El enlace de regreso conserva el filtro o vuelve al inicio según el origen. Los seis videos del archivo no se importaron.
- **Visualización:** las fotografías anterior y siguiente se asoman a los lados y también permiten navegar al seleccionarlas. La transición desplaza las imágenes suavemente, mantiene la fotografía central completa y respeta la preferencia de movimiento reducido. El visor precarga hasta cinco fotografías: la central y las dos vecinas de cada lado (blobs en caché por sesión); en los extremos de la galería habrá menos vecinas disponibles.
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
- **Implementación:** esquema de `Supabase\schema.sql` aplicado al proyecto remoto después de comprobar que las tablas y el bucket no existían. Se habilitó la RPC `monzu_is_admin`, se registró una cuenta Auth confirmada como administradora y se creó el bucket privado.
- **Explicación:** se verificaron la RPC, la pertenencia de la cuenta a `monzu_admins` y la privacidad del bucket. El archivo SQL no es idempotente y no debe volver a ejecutarse completo.

## Preparación de Cloudflare Workers

- **Fecha:** 2026-11-03.
- **Implementación:** configuración base en `wrangler.jsonc` y preparación de un directorio estático mediante la lista explícita de `tools\prepare-cloudflare.mjs`.
- **Explicación:** se excluyen las fotografías y los videos originales, las referencias, las pruebas y el esquema SQL. El script copia archivos sin compilar ni modificar el sitio y crea una configuración de despliegue en un directorio nuevo. En la prueba de 2026-11-03 Wrangler no respetó el filtro al ejecutarse en Windows, por lo que la raíz se dejó sin publicar.

## Despliegue mediante paquete

- **Fecha:** 2026-11-06.
- **Implementación:** `tools\prepare-cloudflare.mjs` copia las páginas desde `web/` a la raíz del paquete, conserva los assets bajo `web/assets/`, y añade `administracion/` y el cliente de Supabase. Wrangler usa la configuración generada dentro de `.cloudflare-build/`; esa carpeta es salida temporal, no fuente.
- **Explicación:** preparar el paquete antes de publicar mantiene `/`, `/galeria.html`, `/obra.html` y `/administracion/admin.html`, y excluye documentación, pruebas, herramientas y `Supabase/schema.sql`. Usar el comando de despliegue que imprime el preparador con su configuración generada; no desplegar la raíz directamente. Como antecedente, el 2026-11-06 se probó publicar desde la raíz y se documentó que la ruta `.cloudflare-build/prepare-first` no existía y el script no corría automáticamente; este flujo sustituye ese intento.

## Verificación y manejo de errores

- **Fecha:** 2026-11-03.
- **Implementación:** pruebas de catálogo, navegador de escritorio y móvil, administración simulada, políticas SQL en PostgreSQL local y preparación de Cloudflare sin despliegue. Se añadieron dimensiones para reservar espacio a las fotografías, navegación alternativa si Swiper no carga y recuperación explícita ante fallos parciales de administración.
- **Explicación:** las pruebas cubren el funcionamiento local y permisos simulados. El 2026-11-06 se verificaron objetos y permisos del proyecto remoto; falta probar el flujo completo desde el navegador con una sesión de la cuenta administradora.

## Ejecución y pendientes

- Para revisar las páginas fuente en local, servir la raíz del proyecto por HTTP/HTTPS y abrir `http://localhost:8765/web/index.html`; las rutas del paquete desplegado publican las páginas en `/`.
- Con Node.js 24, ejecutar `node --test tests\catalog.test.mjs tests\gallery-navigation.test.mjs tests\cloudflare.test.mjs` para comprobar el catálogo, la navegación y el paquete.
- Ejecutar `node tools\prepare-cloudflare.mjs` para generar un paquete en `.cloudflare-build/`; el script indica la configuración que se usa al desplegar.
- La interfaz pública utiliza Swiper 11.2.10 y tipografías de Google Fonts; si Swiper no carga, se muestra un aviso y queda disponible una navegación simplificada.
- El estado de Supabase se describe en `informacion\supabase.md`. El esquema está aplicado y una cuenta está autorizada; faltan las categorías, las obras definitivas y la prueba de extremo a extremo del acceso desde el navegador.
- La publicación en Cloudflare Workers, las redes sociales, los datos ampliados de las obras y las secciones Instalaciones, Info, CV y Contacto quedan para más adelante.

## Organización del proyecto

- **Fecha:** 2026-11-10.
- **Implementación:** páginas y módulos públicos agrupados en `web/`; el panel permanece en `administracion/` y conserva `/administracion/admin.html`. El esquema y el cliente de Supabase se agrupan en `Supabase/`; la documentación se consolida en `informacion/`.
- **Explicación:** el preparador de `tools/prepare-cloudflare.mjs` mantiene las URLs públicas copiando las páginas de `web/` a la raíz del paquete, conserva los assets bajo `/web/assets/`, e incluye el panel y el cliente de Supabase sin publicar el esquema ni la documentación. `.cloudflare-build/` es una salida temporal generada, no una carpeta fuente. Se conservaron las notas técnicas anteriores durante la consolidación.
