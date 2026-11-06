const THEME_KEY = 'monzu-theme';
const GRID_KEY = 'monzu-gallery-columns';
const PAGE_TRANSITION_KEY = 'monzu-page-transition';

function isHomePath(path) {
  const normalizedPath = path.replace(/\/+$/, '');
  return !normalizedPath || normalizedPath.endsWith('/index.html');
}

function scrollToTop() {
  const scrollingElement = document.scrollingElement || document.documentElement;
  const startPosition = scrollingElement.scrollTop;
  if (startPosition <= 0) {
    scrollingElement.scrollTop = 0;
    return;
  }

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  const duration = Math.min(650, Math.max(320, startPosition * 0.35));
  let startTime;
  root.style.scrollBehavior = 'auto';

  const step = (timestamp) => {
    startTime ??= timestamp;
    const progress = Math.min(1, (timestamp - startTime) / duration);
    const eased = 1 - (1 - progress) ** 3;
    scrollingElement.scrollTop = startPosition * (1 - eased);
    if (progress < 1) requestAnimationFrame(step);
    else root.style.scrollBehavior = previousScrollBehavior;
  };

  requestAnimationFrame(step);
}

function bindHomeScrollLinks(container) {
  container.querySelectorAll('a[href="./index.html"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const targetPath = new URL(link.href, window.location.href).pathname;
      if (!isHomePath(window.location.pathname) || !isHomePath(targetPath)) return;
      event.preventDefault();
      link.closest('dialog[open]')?.close();
      scrollToTop();
    });
  });
}

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

export function initializePageTransitions() {
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    const destination = sessionStorage.getItem(PAGE_TRANSITION_KEY);
    sessionStorage.removeItem(PAGE_TRANSITION_KEY);
    if (destination === window.location.pathname && !reducedMotion()) {
      document.body.classList.add('page-entering');
      document.body.addEventListener('animationend', () => document.body.classList.remove('page-entering'), { once: true });
    }
  } catch (error) {
    console.warn('No se pudo preparar la transición de navegación.', error);
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) document.body.classList.remove('page-leaving', 'page-entering');
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.relList.contains('external')) return;

    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;

    if (isHomePath(window.location.pathname) && isHomePath(destination.pathname)) return;

    if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash === window.location.hash) return;
    if (reducedMotion()) return;

    try {
      sessionStorage.setItem(PAGE_TRANSITION_KEY, destination.pathname);
    } catch (error) {
      console.warn('No se pudo guardar el destino de navegación.', error);
      return;
    }

    event.preventDefault();
    document.body.classList.remove('page-entering');
    document.body.classList.add('page-leaving');
    window.setTimeout(() => window.location.assign(destination.href), 220);
  }, true);
}

export function updateSocialMetadata({ title = document.title, description = '', image = '', url = window.location.href } = {}) {
  const setMeta = (attribute, name, value) => {
    let meta = [...document.head.querySelectorAll('meta')].find((item) => item.getAttribute(attribute) === name);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      document.head.append(meta);
    }
    meta.setAttribute('content', value);
  };
  const absoluteUrl = new URL(url, window.location.href).href;
  document.querySelector('link[rel="canonical"]')?.remove();
  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = absoluteUrl;
  document.head.append(canonical);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', absoluteUrl);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  if (image) {
    const absoluteImage = new URL(image, window.location.href).href;
    setMeta('property', 'og:image', absoluteImage);
    setMeta('name', 'twitter:image', absoluteImage);
  }
}

export function initializeSite() {
  initializePageTransitions();
  const defaultDescription = document.querySelector('meta[name="description"]')?.content || '';
  updateSocialMetadata({ title: document.title, description: defaultDescription });
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  header.innerHTML = `
    <header class="site-header">
      <div class="page-width header-inner">
        <a class="brand" href="./index.html" aria-label="Gabriela Monzú, inicio"><span class="brand-name">Gabriela Monzú</span><span class="brand-mark" aria-hidden="true">.</span></a>
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
    <footer class="site-footer" aria-labelledby="footer-heading">
      <div class="page-width footer-inner">
        <div class="footer-main">
          <div class="footer-intro">
            <p class="eyebrow"><span class="eyebrow-line"></span> HABLEMOS</p>
            <h2 class="footer-heading" id="footer-heading">Sigamos en <em>contacto.</em></h2>
            <a class="footer-brand" href="./index.html" aria-label="Gabriela Monzú, inicio">Gabriela Monzú<span>.</span></a>
          </div>
          <nav class="footer-navigation" aria-label="Navegación del pie de página">
            <p class="footer-column-title">Explorar</p>
            <a href="./index.html"><span>Inicio</span><span class="footer-nav-number" aria-hidden="true">01</span></a>
            <a href="./galeria.html"><span>Galería</span><span class="footer-nav-number" aria-hidden="true">02</span></a>
          </nav>
          <div class="footer-contact" aria-labelledby="footer-contact-title">
            <p class="footer-column-title" id="footer-contact-title">Escríbeme</p>
            <a class="footer-contact-link" href="mailto:monzugabrie@gmail.com">
              <span class="footer-link-copy"><span class="footer-link-label">Correo electrónico</span><span class="footer-link-value">monzugabrie@gmail.com</span></span>
              <span class="footer-link-arrow" aria-hidden="true">↗</span>
            </a>
            <a class="footer-contact-link" href="https://wa.me/50683242627" target="_blank" rel="noopener noreferrer">
              <span class="footer-link-copy"><span class="footer-link-label">WhatsApp</span><span class="footer-whatsapp-value">
                <svg class="footer-whatsapp-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                  <path d="M16 2.6A13.3 13.3 0 0 0 4.5 22.5L3 29l6.7-1.8A13.3 13.3 0 1 0 16 2.6Zm0 23.9c-2 0-4-.5-5.7-1.6l-.4-.2-4 .9.9-3.9-.3-.4A10.6 10.6 0 1 1 16 26.5Z"/>
                  <path class="footer-whatsapp-handset" d="M22.4 18.2c-.3-.15-1.8-.9-2.1-1-.3-.1-.5-.15-.7.15-.2.3-.8 1-.95 1.2-.17.2-.35.23-.65.08-.3-.15-1.3-.48-2.45-1.52-.9-.8-1.5-1.8-1.7-2.1-.18-.3-.02-.47.13-.62.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.53.07-.81.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z"/>
                </svg>
                <span class="footer-link-value">+506 8324 2627</span>
              </span></span>
              <span class="footer-link-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Gabriela Monzú. Todos los derechos reservados.</span>
          <a href="./index.html">Volver al inicio <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </footer>`;
  bindHomeScrollLinks(header);
  bindHomeScrollLinks(footer);

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

}

export function initializeDetailTheme() {
  document.documentElement.dataset.theme = readPreference(THEME_KEY, 'light') === 'warm' ? 'warm' : 'light';
}

export function artworkUrl(workId, photoIndex = 0, categoryId = null, source = 'gallery') {
  const url = new URL('./obra.html', window.location.href);
  url.searchParams.set('id', workId);
  if (photoIndex) url.searchParams.set('photo', String(photoIndex));
  if (categoryId) url.searchParams.set('category', categoryId);
  if (source === 'home') url.searchParams.set('from', 'home');
  return url.href;
}

export function createImage(photo, work, index = 0) {
  const image = document.createElement('img');
  image.classList.add('media-loading');
  image.addEventListener('load', () => {
    image.classList.remove('media-loading');
    image.classList.add('media-loaded');
  }, { once: true });
  image.addEventListener('error', () => image.classList.remove('media-loading'), { once: true });
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
        if (image.isConnected) notify(`No se pudo cargar una imagen de ${work.name}.`, error);
        else console.error(`No se pudo cargar una imagen de ${work.name}.`, error);
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
    if (!image.isConnected) return;
    notify(`No se pudo cargar una imagen de ${work.name}.`);
    console.error('Error al cargar la imagen:', photo.src || photo.storagePath);
  }, { once: true });
  return image;
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
