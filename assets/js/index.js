import { getHomeWorks, makeCoverItems, photoSource } from './catalog.js';
import { renderPreview } from './gallery.js';
import { artworkUrl, initializeGridControls, initializeSite } from './site.js';

const SLIDE_TRANSITION_MS = 520;
const PREFETCH_OFFSETS = [-2, -1, 1, 2];
const SWIPE_THRESHOLD = 50;
const WHEEL_THRESHOLD = 40;
const DRAG_TOLERANCE = 10;

function positionFor(offset) {
  if (offset === 0) return 'current';
  if (offset === -1) return 'previous';
  if (offset === 1) return 'next';
  if (offset === -2) return 'far-previous';
  if (offset === 2) return 'far-next';
  return offset < 0 ? 'out-left' : 'out-right';
}

function setOffset(slide, offset) {
  slide.dataset.offset = String(offset);
  slide.dataset.position = positionFor(offset);
  slide.setAttribute('aria-hidden', String(offset !== 0));
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createCarousel(section, covers) {
  const stage = section.querySelector('.home-carousel-stage');
  const track = section.querySelector('[data-carousel-track]');
  const previous = section.querySelector('.detail-previous');
  const next = section.querySelector('.detail-next');
  const caption = section.querySelector('[data-carousel-caption]');
  const count = section.querySelector('[data-carousel-count]');
  const status = section.querySelector('[data-carousel-status]');
  const slideCache = new Map();
  let index = 0;
  let busy = false;
  let pointerStart = null;
  let dragged = false;
  let wheelAccumulated = 0;
  let wheelLocked = false;
  let wheelTimer = null;

  function updateControls() {
    previous.hidden = covers.length < 2;
    next.hidden = covers.length < 2;
    previous.disabled = busy || index <= 0;
    next.disabled = busy || index >= covers.length - 1;
  }

  function updateCaption() {
    caption.textContent = covers[index].work.name;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(covers.length).padStart(2, '0')}`;
  }

  async function createSlide(position) {
    const { work, photo } = covers[position];
    const url = await photoSource(photo);
    const image = new Image();
    image.alt = photo.alt || `Portada de ${work.name}`;
    image.decoding = 'async';
    image.draggable = false;
    if (photo.width && photo.height) {
      image.width = photo.width;
      image.height = photo.height;
    }
    image.src = url;
    await image.decode();
    const link = document.createElement('a');
    link.className = 'detail-image home-carousel-link';
    link.href = artworkUrl(work.id, 0, null, 'home', 'work');
    link.setAttribute('aria-label', `Ver ${work.name}`);
    link.append(image);
    const slide = document.createElement('div');
    slide.className = 'detail-slide';
    slide.dataset.key = String(position);
    slide.append(link);
    link.addEventListener('click', (event) => {
      if (dragged) {
        event.preventDefault();
        return;
      }
      const offset = Number(slide.dataset.offset);
      if (offset === 0) return;
      event.preventDefault();
      if (Math.abs(offset) === 1) move(offset);
    });
    return slide;
  }

  function getSlide(position) {
    const key = String(position);
    if (!slideCache.has(key)) {
      const pending = createSlide(position);
      slideCache.set(key, pending);
      pending.catch(() => slideCache.delete(key));
    }
    return slideCache.get(key);
  }

  async function prepareWindow(center) {
    const offsets = [0, ...PREFETCH_OFFSETS].filter((offset) => center + offset >= 0 && center + offset < covers.length);
    const entries = await Promise.all(offsets.map(async (offset) => {
      try {
        return { offset, slide: await getSlide(center + offset) };
      } catch (error) {
        if (offset === 0) throw error;
        console.error('No se pudo precargar una portada cercana.', error);
        return null;
      }
    }));
    return entries.filter(Boolean);
  }

  function syncSlides(entries) {
    const keys = new Set(entries.map(({ slide }) => slide.dataset.key));
    for (const slide of [...track.children]) {
      if (!keys.has(slide.dataset.key)) slide.remove();
    }
    for (const key of [...slideCache.keys()]) {
      if (!keys.has(key)) slideCache.delete(key);
    }
    entries.forEach(({ slide, offset }) => {
      if (!slide.isConnected) track.append(slide);
      setOffset(slide, offset);
    });
  }

  async function move(offset) {
    const target = index + offset;
    if (busy || target < 0 || target >= covers.length) return;
    busy = true;
    updateControls();
    try {
      const incoming = await getSlide(target);
      if (!incoming.isConnected) {
        setOffset(incoming, offset);
        track.append(incoming);
      }
      index = target;
      const windowReady = prepareWindow(target);
      windowReady.catch(() => {});
      void track.offsetWidth;
      [...track.children].forEach((slide) => setOffset(slide, Number(slide.dataset.offset) - offset));
      updateCaption();
      status.textContent = '';
      if (!reducedMotion()) await new Promise((resolve) => setTimeout(resolve, SLIDE_TRANSITION_MS + 40));
      syncSlides(await windowReady);
    } catch (error) {
      console.error('No se pudo cambiar de obra.', error);
      status.textContent = 'No se pudo cargar la obra. Inténtalo de nuevo.';
    } finally {
      busy = false;
      updateControls();
    }
  }

  async function initialize() {
    try {
      if (covers.length) {
        syncSlides(await prepareWindow(0));
        updateCaption();
      } else {
        status.textContent = 'Todavía no hay obras publicadas.';
      }
    } catch (error) {
      console.error('No se pudo cargar el carrusel.', error);
      status.textContent = 'No se pudieron cargar las obras de esta selección.';
    } finally {
      stage.setAttribute('aria-busy', 'false');
      stage.querySelector('.detail-skeleton')?.remove();
      updateControls();
    }
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  stage.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    dragged = false;
  });
  stage.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.hypot(dx, dy) > DRAG_TOLERANCE) dragged = true;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
  stage.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    wheelAccumulated += event.deltaX;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelAccumulated = 0;
      wheelLocked = false;
    }, 200);
    if (!wheelLocked && Math.abs(wheelAccumulated) >= WHEEL_THRESHOLD) {
      wheelLocked = true;
      move(wheelAccumulated > 0 ? 1 : -1);
      wheelAccumulated = 0;
    }
  }, { passive: false });

  updateControls();
  initialize();

  return { stage, move };
}

async function initializeCarousels() {
  const sections = [...document.querySelectorAll('.home-carousel')];
  let covers;
  try {
    covers = makeCoverItems(await getHomeWorks());
  } catch (error) {
    console.error('No se pudieron cargar las obras del inicio.', error);
    sections.forEach((section) => {
      section.querySelector('[data-carousel-status]').textContent = 'No se pudieron cargar las obras.';
      section.querySelector('.detail-skeleton')?.remove();
    });
    return;
  }
  const carousels = sections.map((section) => createCarousel(section, covers));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const visible = carousels
      .map((carousel) => {
        const rect = carousel.stage.getBoundingClientRect();
        return { carousel, height: Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0) };
      })
      .filter(({ height }) => height > 0)
      .sort((a, b) => b.height - a.height)[0];
    if (!visible) return;
    event.preventDefault();
    visible.carousel.move(event.key === 'ArrowLeft' ? -1 : 1);
  });
}

function initialize() {
  initializeSite();
  initializeGridControls();
  initializeCarousels();
  renderPreview();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
