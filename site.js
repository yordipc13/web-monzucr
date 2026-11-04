const THEME_KEY = 'monzu-theme';
const GRID_KEY = 'monzu-gallery-columns';

function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    console.warn('No se pudo leer la preferencia del navegador.', error);
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    notify('No se pudo guardar la preferencia en este navegador.', error);
  }
}

export function notify(message, error) {
  if (error) console.error(message, error);
  const notice = document.getElementById('site-notice');
  if (notice) notice.textContent = message;
}

export function initializeSite() {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  header.innerHTML = `
    <header class="site-header">
      <div class="page-width header-inner">
        <a class="brand" href="./index.html" aria-label="Gabriela Monzú, inicio">Gabriela Monzú<span>.</span></a>
        <div class="header-actions">
          <button class="theme-toggle" type="button" aria-pressed="false" aria-label="Cambiar propuesta visual">
            <span class="theme-dot" aria-hidden="true"></span><span class="theme-text"></span>
          </button>
          <button class="menu-trigger" type="button" aria-haspopup="dialog" aria-controls="menu-dialog">
            Menú <span class="menu-lines" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <p class="page-width site-notice" id="site-notice" role="status"></p>
    </header>
    <dialog class="menu-dialog" id="menu-dialog" aria-labelledby="menu-title">
      <div class="drawer-top">
        <span class="drawer-label" id="menu-title">Explorar</span>
        <button class="icon-button menu-close" type="button" aria-label="Cerrar menú">×</button>
      </div>
      <nav class="menu-nav" aria-label="Navegación principal">
        <a href="./index.html">Inicio <small>01</small></a>
        <button type="button" disabled>Instalaciones <small>Próximamente</small></button>
        <button type="button" disabled>Info <small>Próximamente</small></button>
        <button type="button" disabled>CV <small>Próximamente</small></button>
        <button type="button" disabled>Contacto <small>Próximamente</small></button>
      </nav>
      <p class="drawer-note">Gabriela Monzú · Portafolio</p>
    </dialog>`;
  footer.innerHTML = `
    <footer class="site-footer">
      <div class="page-width footer-inner">
        <div class="footer-main">
          <div>
            <p class="eyebrow"><span class="eyebrow-line"></span> HABLEMOS</p>
            <h2 class="footer-heading">Sigamos en <em>contacto.</em></h2>
          </div>
          <div class="footer-contact">
            <p>Escríbeme</p>
            <a href="mailto:monzugabrie@gmail.com">monzugabrie@gmail.com ↗</a>
            <a href="https://wa.me/50683242627" target="_blank" rel="noopener noreferrer">WhatsApp · +506 8324 2627 ↗</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Gabriela Monzú. Todos los derechos reservados.</span>
          <a href="./index.html">Volver a Inicio ↑</a>
        </div>
      </div>
    </footer>`;

  const menu = document.getElementById('menu-dialog');
  header.querySelector('.menu-trigger').addEventListener('click', () => menu.showModal());
  menu.querySelector('.menu-close').addEventListener('click', () => menu.close());
  menu.addEventListener('click', (event) => {
    if (event.target === menu) menu.close();
  });

  const toggle = header.querySelector('.theme-toggle');
  const applyTheme = (theme) => {
    const warm = theme === 'warm';
    document.documentElement.dataset.theme = warm ? 'warm' : 'light';
    toggle.setAttribute('aria-pressed', String(warm));
    toggle.querySelector('.theme-text').textContent = warm ? 'Estilo cálido' : 'Estilo claro';
  };
  applyTheme(readPreference(THEME_KEY, 'light'));
  toggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'warm' ? 'light' : 'warm';
    applyTheme(next);
    savePreference(THEME_KEY, next);
  });

  const dialog = document.getElementById('artwork-dialog');
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

export function createImage(photo, work, index = 0) {
  const image = document.createElement('img');
  image.alt = photo.alt || `Fotografía ${index + 1} de ${work.name}`;
  if (photo.width && photo.height) {
    image.width = photo.width;
    image.height = photo.height;
  }
  image.loading = 'lazy';
  image.decoding = 'async';
  if (photo.src) {
    image.src = photo.src;
  } else if (photo.storagePath) {
    const load = async () => {
      try {
        const { downloadImage } = await import('./supabase-catalog.js');
        const blob = await downloadImage(photo.storagePath);
        const url = URL.createObjectURL(blob);
        if (!image.isConnected) {
          URL.revokeObjectURL(url);
          return;
        }
        image.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
        image.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
        image.src = url;
      } catch (error) {
        notify(`No se pudo cargar una imagen de ${work.name}.`, error);
      }
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      }, { rootMargin: '300px' });
      observer.observe(image);
    } else {
      load();
    }
  } else {
    notify(`Falta la imagen de ${work.name}.`);
  }
  image.addEventListener('error', () => {
    notify(`No se pudo cargar una imagen de ${work.name}.`);
    console.error('Error al cargar la imagen:', photo.src || photo.storagePath);
  }, { once: true });
  return image;
}

export async function showArtwork(initialWork) {
  let work;
  try {
    const { getArtworkById } = await import('./catalog.js');
    work = await getArtworkById(initialWork.id);
  } catch (error) {
    notify('No se pudo abrir la obra. Inténtalo de nuevo más tarde.', error);
    return;
  }
  const dialog = document.getElementById('artwork-dialog');
  dialog.replaceChildren();

  const top = document.createElement('div');
  top.className = 'artwork-dialog-top';
  const label = document.createElement('span');
  label.className = 'artwork-dialog-label';
  label.textContent = 'Detalle de la obra';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'icon-button';
  close.setAttribute('aria-label', 'Cerrar detalle de la obra');
  close.textContent = '×';
  close.addEventListener('click', () => dialog.close());
  top.append(label, close);

  const content = document.createElement('div');
  content.className = 'artwork-content';
  const title = document.createElement('h2');
  title.id = 'artwork-dialog-title';
  title.textContent = work.name;
  content.append(title);
  if (work.category) {
    const category = document.createElement('p');
    category.className = 'artwork-meta';
    category.textContent = work.category;
    content.append(category);
  }
  if (work.description) {
    const description = document.createElement('p');
    description.className = 'artwork-description';
    description.textContent = work.description;
    content.append(description);
  }
  const images = document.createElement('div');
  images.className = 'artwork-images';
  work.images.forEach((photo, index) => images.append(createImage(photo, work, index)));
  content.append(images);
  dialog.append(top, content);
  dialog.showModal();
  close.focus();
}

export function initializeGridControls() {
  const controls = document.querySelectorAll('[data-grid-control]');
  let columns = readPreference(GRID_KEY, '3') === '4' ? '4' : '3';
  const applyColumns = () => {
    document.documentElement.style.setProperty('--grid-columns', columns);
    controls.forEach((control) => {
      control.querySelectorAll('button').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.columns === columns));
      });
    });
  };

  controls.forEach((control) => {
    control.className = 'grid-control';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', 'Columnas de la galería');
    const label = document.createElement('span');
    label.className = 'grid-control-label';
    label.textContent = 'Vista';
    control.append(label);
    [3, 4].forEach((count) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.columns = String(count);
      button.setAttribute('aria-label', `Mostrar ${count} columnas`);
      const icon = document.createElement('span');
      icon.className = 'grid-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.style.setProperty('--icon-columns', count);
      for (let i = 0; i < count * count; i += 1) icon.append(document.createElement('i'));
      button.append(icon);
      button.addEventListener('click', () => {
        columns = String(count);
        applyColumns();
        savePreference(GRID_KEY, columns);
      });
      control.append(button);
    });
  });
  applyColumns();
}
