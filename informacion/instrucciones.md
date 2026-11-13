# Instrucciones del proyecto

## Sitio público

El proyecto `monzucr` es un portafolio informativo y visual para una artista de cerámica. La portada tiene dos carruseles táctiles con dos fotografías visibles, flechas laterales y navegación que no debe bloquear el desplazamiento vertical en móviles. Después de los carruseles aparece una vista previa de la galería con un botón para abrir la galería completa.

La galería completa muestra obras de distintas proporciones en una cuadrícula de tres columnas, con filtros por categoría y un control para cambiar entre tres y cuatro columnas. Debe conservar una composición adaptable en pantallas pequeñas. Las referencias originales incluyen `galeria.png` y `controlador.png`.

La cabecera presenta “Gabriela Monzú” y un menú con Inicio, Instalaciones, Info, CV y Contacto. En esta etapa solo se implementa Inicio; las secciones restantes pueden permanecer identificadas como futuras.

## Contacto e identidad

- WhatsApp: `+506 83242627`.
- Correo: `monzugabrie@gmail.com`.
- Los datos de contacto deben abrir el destino correspondiente al seleccionarlos.
- El footer debe ser profesional, adaptable y coherente con la identidad visual.
- Referencias de inspiración: `https://www.kristinarolander.com` y `https://www.johnbrendanguinan.com`.

## Administración

La administración se mantiene separada del sitio público en `administracion/`, con `admin.html`, `admin.js` y `admin.css`. El panel permite agregar obras mediante un formulario con nombre, categoría fija, descripción e imágenes JPG/JPEG/PNG. Las obras nuevas deben aparecer primero en la galería.

## Tecnología y movimiento

Swiper es la opción recomendada para carruseles táctiles y responsivos. Las transiciones deben ser fluidas, amables y respetar las preferencias de movimiento reducido. Consultar antes de incorporar plugins opcionales; GSAP, Motion o Lottie solo se agregan si aportan valor al diseño.

## Registro

Documentar cada cambio con nombre, fecha, implementación y explicación para poder trasladarlo al documento de Drive “Emprendimiento Monzú”. Mantener `informacion/` como fuente documental del repositorio.
