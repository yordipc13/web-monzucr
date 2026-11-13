# Información del proyecto

Esta carpeta agrupa todo lo que es documentación, referencias y contexto del proyecto, y deja la parte funcional del sitio separada.

## Estructura

- `DOCUMENTACION.md`: historial técnico del proyecto.
- `instrucciones.md`: requisitos funcionales y guía de diseño.
- `supabase.md`: estado y configuración de Supabase.
- `referencias/`: referencias visuales e inspiraciones del proyecto.
- `imagenes/`: recursos visuales de apoyo y material no funcional.
- `historial/`: registro de cambios y evolución del proyecto.

## Regla

Todo lo que es solo información debe quedarse aquí. El código público vive en `web/`, el panel permanece en `administracion/`, las pruebas en `tests/`, las herramientas en `tools/` y los artefactos de base de datos en `Supabase/`. La salida temporal de publicación está en `.cloudflare-build/` y no se usa para guardar fuentes.
