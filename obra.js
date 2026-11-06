import { getGalleryPage } from './catalog.js';
import { createGalleryNavigator } from './gallery-navigation.js';
import { siteConfig } from './site-config.js';
import { artworkUrl, initializeDetailTheme, updateSocialMetadata } from './site.js';

initializeDetailTheme();

const params = new URLSearchParams(window.location.search);
const workId = params.get('id');
const photoParam = params.get('photo');
const photoIndex = photoParam === null ? 0 : Number(photoParam);
const categoryId = params.get('category') || null;
const source = params.get('from') === 'home' ? 'home' : 'gallery';
const back = document.getElementById('detail-back');
const backUrl = new URL(source === 'home' ? './index.html' : './galeria.html', window.location.href);
if (source === 'gallery' && categoryId) backUrl.searchParams.set('category', categoryId);
back.href = backUrl.href;
back.querySelector('span').textContent = source === 'home' ? 'Volver al inicio' : 'Volver a la galería';

const navigator = createGalleryNavigator(getGalleryPage, categoryId);
const title = document.getElementById('detail-title');
const track = document.getElementById('detail-track');
const status = document.getElementById('detail-status');
const previous = document.getElementById('detail-previous');
const next = document.getElementById('detail-next');
const info = document.getElementById('detail-info');
const category = document.getElementById('detail-category');
const description = document.getElementById('detail-description');
let loading = false;
let currentItem = null;
const slideCache = new Map();
const sourceCache = new Map();
const stage = document.querySelector('.detail-stage');
const zoom = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 4;
const TAP_ZOOM_SCALE = 2.5;
const pointers = new Map();
let gesture = null;
let pinchDistance = 0;

function currentImage() {
  return track.querySelector('.detail-slide[data-position="current"] img');
}

function toStageCenter(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
}

function clampZoom() {
  zoom.scale = Math.min(MAX_SCALE, Math.max(1, zoom.scale));
  const img = currentImage();
  if (!img) {
    zoom.x = 0;
    zoom.y = 0;
    return;
  }
  const box = img.parentElement;
  const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
  const width = Math.min(box.clientWidth, box.clientHeight * ratio);
  const height = Math.min(box.clientHeight, box.clientWidth / ratio);
  const maxX = Math.max(0, (width * zoom.scale - stage.clientWidth) / 2);
  const maxY = Math.max(0, (height * zoom.scale - stage.clientHeight) / 2);
  zoom.x = Math.min(maxX, Math.max(-maxX, zoom.x));
  zoom.y = Math.min(maxY, Math.max(-maxY, zoom.y));
}

function applyZoom(animated = false) {
  clampZoom();
  const img = currentImage();
  const isZoomed = zoom.scale > 1;
  stage.classList.toggle('is-zoomed', isZoomed);
  if (!img) return;
  img.style.transition = animated
    ? 'transform 260ms cubic-bezier(.22, 1, .36, 1), object-position 520ms cubic-bezier(.22, 1, .36, 1)'
    : '';
  img.style.transform = isZoomed ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` : '';
  img.style.cursor = isZoomed ? 'zoom-out' : 'zoom-in';
}

function zoomAt(scale, pivotX, pivotY, animated = false) {
  const next = Math.min(MAX_SCALE, Math.max(1, scale));
  const ratio = next / zoom.scale;
  zoom.x = pivotX - (pivotX - zoom.x) * ratio;
  zoom.y = pivotY - (pivotY - zoom.y) * ratio;
  zoom.scale = next;
  applyZoom(animated);
}

function resetZoom(animated = false) {
  zoom.scale = 1;
  zoom.x = 0;
  zoom.y = 0;
  applyZoom(animated);
}

function pinchMetrics() {
  const [a, b] = [...pointers.values()];
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    center: toStageCenter((a.x + b.x) / 2, (a.y + b.y) / 2),
  };
}

function handlePointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (!event.target.closest('.detail-slide[data-position="current"]')) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  stage.setPointerCapture(event.pointerId);
  if (pointers.size === 1) gesture = { x: event.clientX, y: event.clientY, moved: false };
  if (pointers.size === 2 && gesture) {
    gesture.moved = true;
    pinchDistance = pinchMetrics().distance;
  }
}

function handlePointerMove(event) {
  if (!pointers.has(event.pointerId)) return;
  const previous = pointers.get(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && gesture) {
    const { distance, center } = pinchMetrics();
    if (pinchDistance > 0) zoomAt(zoom.scale * (distance / pinchDistance), center.x, center.y);
    pinchDistance = distance;
    gesture.moved = true;
    return;
  }
  if (!gesture || pointers.size !== 1) return;
  if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
  if (zoom.scale > 1 && gesture.moved) {
    zoom.x += event.clientX - previous.x;
    zoom.y += event.clientY - previous.y;
    stage.classList.add('is-dragging');
    applyZoom();
  }
}

function handlePointerEnd(event) {
  if (!pointers.has(event.pointerId)) return;
  const isTap = event.type === 'pointerup' && pointers.size === 1 && gesture && !gesture.moved;
  pointers.delete(event.pointerId);
  if (pointers.size === 1) {
    const [remaining] = pointers.values();
    gesture = { x: remaining.x, y: remaining.y, moved: true };
  }
  if (pointers.size === 0) {
    gesture = null;
    stage.classList.remove('is-dragging');
  }
  if (isTap) {
    if (zoom.scale > 1) {
      resetZoom(true);
    } else {
      const point = toStageCenter(event.clientX, event.clientY);
      zoomAt(TAP_ZOOM_SCALE, point.x, point.y, true);
    }
  }
}

stage.addEventListener('pointerdown', handlePointerDown);
stage.addEventListener('pointermove', handlePointerMove);
stage.addEventListener('pointerup', handlePointerEnd);
stage.addEventListener('pointercancel', handlePointerEnd);
stage.addEventListener('wheel', (event) => {
  if (!event.ctrlKey || !currentImage()) return;
  event.preventDefault();
  const point = toStageCenter(event.clientX, event.clientY);
  zoomAt(zoom.scale * Math.exp(-event.deltaY * 0.01), point.x, point.y);
}, { passive: false });

function updateControls() {
  previous.disabled = loading || !navigator.hasPrevious;
  next.disabled = loading || !navigator.hasNext;
}

function slideKey(item) {
  return JSON.stringify([item.work.id, item.photoIndex]);
}

function photoSource(photo) {
  if (photo.src) return Promise.resolve(photo.src);
  const key = photo.storagePath;
  if (!sourceCache.has(key)) {
    const pending = import('./supabase-catalog.js')
      .then(({ downloadImage }) => downloadImage(key))
      .then((blob) => URL.createObjectURL(blob));
    sourceCache.set(key, pending);
    pending.catch(() => sourceCache.delete(key));
  }
  return sourceCache.get(key);
}

async function createSlide(item, key) {
  const photo = item.work.images[item.photoIndex];
  if (!photo) throw new Error('La fotografía seleccionada no está disponible.');
  const url = await photoSource(photo);
  const image = new Image();
  image.alt = photo.alt || `Fotografía ${item.photoIndex + 1} de ${item.work.name}`;
  image.decoding = 'async';
  image.draggable = false;
  if (photo.width && photo.height) {
    image.width = photo.width;
    image.height = photo.height;
  }
  image.src = url;
  await image.decode();
  const slide = document.createElement('div');
  slide.className = 'detail-slide';
  slide.dataset.key = key;
  slide.append(image);
  slide.addEventListener('click', () => {
    if (slide.dataset.position === 'previous' && !previous.disabled) move(-1);
    if (slide.dataset.position === 'next' && !next.disabled) move(1);
  });
  return slide;
}

function prepareSlide(item) {
  const key = slideKey(item);
  if (!slideCache.has(key)) {
    const pending = createSlide(item, key);
    slideCache.set(key, pending);
    pending.catch(() => slideCache.delete(key));
  }
  return slideCache.get(key);
}

function renderDetails(item) {
  title.textContent = item.work.name;
  document.title = `${item.work.name} | Gabriela Monzú`;
  category.textContent = item.work.category || '';
  description.textContent = item.work.description || '';
  info.hidden = !item.work.category && !item.work.description;
  document.getElementById('site-notice').textContent = '';
  status.textContent = '';
  const detailUrl = artworkUrl(item.work.id, item.photoIndex, categoryId, source);
  history.replaceState(history.state, '', detailUrl);
  const descriptionText = item.work.description || `${item.work.category || 'Obra'} por Gabriela Monzú.`;
  let image = '';
  if (item.work.images[item.photoIndex]?.src) image = item.work.images[item.photoIndex].src;
  else if (item.work.images[item.photoIndex]?.storagePath) {
    import('./supabase-catalog.js').then(({ getPublicImageUrl }) => {
      updateSocialMetadata({ title: `${item.work.name} | Gabriela Monzú`, description: descriptionText, image: getPublicImageUrl(item.work.images[item.photoIndex].storagePath), url: detailUrl });
    }).catch((error) => console.error('No se pudo preparar la imagen para compartir.', error));
  }
  updateSocialMetadata({ title: `${item.work.name} | Gabriela Monzú`, description: descriptionText, image, url: detailUrl });
  document.querySelector('.detail-stage')?.setAttribute('aria-busy', 'false');
  document.querySelector('.detail-skeleton')?.remove();
}

async function prepareWindow(item) {
  const before = await navigator.peek(-1);
  let after = null;
  try {
    after = await navigator.peek(1);
  } catch (error) {
    console.error('No se pudo cargar la vista previa de la siguiente fotografía.', error);
    status.textContent = 'No se pudo cargar la siguiente vista previa. Puedes intentar avanzar.';
  }
  const sides = [
    { item: before, position: 'previous' },
    { item: after, position: 'next' },
  ].filter((side) => side.item);
  const prepared = await Promise.all([item, ...sides.map((side) => side.item)].map((entry) => prepareSlide(entry)));
  return [
    { item, position: 'current', slide: prepared[0] },
    ...sides.map((side, index) => ({ ...side, slide: prepared[index + 1] })),
  ];
}

function syncSlides(entries) {
  const keys = new Set(entries.map(({ item }) => slideKey(item)));
  for (const slide of [...track.children]) {
    if (!keys.has(slide.dataset.key)) slide.remove();
  }
  for (const key of [...slideCache.keys()]) {
    if (!keys.has(key)) slideCache.delete(key);
  }
  entries.forEach(({ slide, position }) => {
    if (!slide.isConnected) track.append(slide);
    slide.dataset.position = position;
    slide.setAttribute('aria-hidden', String(position !== 'current'));
  });
}

async function animateSlides(direction) {
  const positions = direction === 1
    ? { previous: 'out-left', current: 'previous', next: 'current' }
    : { previous: 'current', current: 'next', next: 'out-right' };
  const moving = [...track.children];
  const start = moving.map((slide) => getComputedStyle(slide).transform);
  moving.forEach((slide) => { slide.dataset.position = positions[slide.dataset.position]; });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || moving.some((slide) => typeof slide.animate !== 'function')) return;
  const animations = moving.map((slide, index) => slide.animate(
    [{ transform: start[index] }, { transform: getComputedStyle(slide).transform }],
    { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' },
  ));
  await Promise.all(animations.map((animation) => animation.finished));
}

async function move(direction) {
  if (loading) return;
  loading = true;
  updateControls();
  resetZoom(true);
  try {
    const item = await navigator.move(direction);
    if (item) {
      const incoming = await prepareSlide(item);
      if (!incoming.isConnected) {
        incoming.dataset.position = direction === 1 ? 'next' : 'previous';
        track.append(incoming);
      }
      currentItem = item;
      const windowReady = prepareWindow(item);
      windowReady.catch(() => {});
      try {
        await animateSlides(direction);
      } finally {
        renderDetails(item);
      }
      syncSlides(await windowReady);
    }
  } catch (error) {
    console.error('No se pudo navegar por la galería.', error);
    status.textContent = 'No se pudo cargar la fotografía. Inténtalo de nuevo.';
  } finally {
    loading = false;
    updateControls();
  }
}

previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'Escape' && zoom.scale > 1) {
    event.preventDefault();
    resetZoom(true);
  } else if (event.key === 'ArrowLeft' && !previous.disabled) {
    event.preventDefault();
    move(-1);
  } else if (event.key === 'ArrowRight' && !next.disabled) {
    event.preventDefault();
    move(1);
  }
});

async function initialize() {
  try {
    if (!workId || !Number.isSafeInteger(photoIndex) || photoIndex < 0 || (photoParam !== null && !/^\d+$/.test(photoParam))) {
      throw new Error('El enlace de la fotografía no es válido.');
    }
    const galleryIndex = siteConfig.catalogSource === 'demo' ? photoIndex : 0;
    const item = await navigator.find(workId, galleryIndex);
    currentItem = { ...item, photoIndex };
    const entries = await prepareWindow(currentItem);
    renderDetails(currentItem);
    syncSlides(entries);
    updateControls();
  } catch (error) {
    console.error('No se pudo abrir la fotografía.', error);
    status.textContent = `No se pudo abrir la fotografía: ${error.message}`;
  }
}

initialize();
