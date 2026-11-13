# Código del sitio

Las tres páginas públicas están en la raíz del proyecto (`index.html`, `galeria.html`, `obra.html`); sus estilos y módulos están organizados en `assets/css/` y `assets/js/`. El preparador de Cloudflare copia las páginas a la raíz del paquete público y conserva los assets bajo `/assets/`.

- `assets/css/index.css`: estilos compartidos de las páginas públicas.
- `assets/js/`: catálogo, galería, detalle, tema, navegación, configuración e integración con Supabase.
- `../administracion/`: panel independiente; se publica en `/administracion/` y comparte los módulos de `/assets/js/`.

No mantener copias de estos archivos fuera de `web/`. Para preparar la publicación, ejecutar `node tools/prepare-cloudflare.mjs`; `.cloudflare-build/` solo contiene la salida regenerable.

Para previsualizar las páginas fuente, servir la raíz del repositorio y abrir `/index.html`. Para probar el sitio integrado con su URL pública y el retorno del panel, servir la carpeta `public/` del paquete que el preparador genera en `.cloudflare-build/site-*/public/`.
