import { getArtworkById, getGalleryPage, photoSource } from './catalog.js';
import { createGalleryNavigator } from './gallery-navigation.js';
import { artworkUrl, updateSocialMetadata } from './site.js';

const params = new URLSearchParams(window.location.search);
const workId = params.get('id');
const photoParam = params.get('photo');
const photoIndex = photoParam === null ? 0 : Number(photoParam);
const categoryId = params.get('category') || null;
const source = params.get('from') === 'home' ? 'home' : 'gallery';
const scope = params.get('scope') === 'work' ? 'work' : 'gallery';
const back = document.getElementById('detail-back');
const backUrl = new URL(source === 'home' ? './index.html' : './galeria.html', window.location.href);
if (source === 'gallery' && categoryId) backUrl.searchParams.set('category', categoryId);
back.href = backUrl.href;
back.querySelector('span').textContent = source === 'home' ? 'Volver al inicio' : 'Volver a la galería';

const title = document.getElementById('detail-title');
const track = document.getElementById('detail-track');
const status = document.getElementById('detail-status');
const previous = document.getElementById('detail-previous');
const next = document.getElementById('detail-next');
const info = document.getElementById('detail-info');
const category = document.getElementById('detail-category');
const description = document.getElementById('detail-description');
let loading = false;
let sequence = null;
let currentIndex = 0;
let controlsRun = 0;
const slideCache = new Map();
const stage = document.querySelector('.detail-stage');
const zoom = { scale: 1, x: 0, y: 0 };
const MAX_SCALE = 4;
const TAP_ZOOM_SCALE = 2.5;
const SWIPE_THRESHOLD = 50;
const SLIDE_TRANSITION_MS = 520;
const PREFETCH_OFFSETS = [-2, -1, 1, 2];
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
  const maxX = Math.max(0, (width * zoom.scale - box.clientWidth) / 2);
  const maxY = Math.max(0, (height * zoom.scale - box.clientHeight) / 2);
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
  const swipeX = event.clientX - (gesture?.x ?? event.clientX);
  const swipeY = event.clientY - (gesture?.y ?? event.clientY);
  const isSwipe = event.type === 'pointerup' && pointers.size === 1 && gesture && zoom.scale === 1
    && Math.abs(swipeX) > SWIPE_THRESHOLD && Math.abs(swipeX) > Math.abs(swipeY) * 1.5;
  pointers.delete(event.pointerId);
  if (pointers.size === 1) {
    const [remaining] = pointers.values();
    gesture = { x: remaining.x, y: remaining.y, moved: true };
  }
  if (pointers.size === 0) {
    gesture = null;
    stage.classList.remove('is-dragging');
  }
  if (isSwipe) {
    const direction = swipeX < 0 ? 1 : -1;
    if (direction === 1 ? !next.disabled : !previous.disabled) move(direction);
    return;
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

async function updateControls() {
  const run = ++controlsRun;
  previous.disabled = loading || currentIndex <= 0;
  if (loading || !sequence) {
    next.disabled = true;
    return;
  }
  const exists = await sequence.at(currentIndex + 1).catch(() => null);
  if (run !== controlsRun) return;
  next.disabled = loading || !exists;
}

function createWorkSequence(work) {
  return {
    async at(index) {
      if (index < 0 || index >= work.images.length) return null;
      return { work, photo: work.images[index], photoIndex: index };
    },
  };
}

async function createSlide(item, key) {
  const photo = item.photo;
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
  const frame = document.createElement('div');
  frame.className = 'detail-image';
  frame.append(image);
  slide.append(frame);
  slide.addEventListener('click', () => {
    if (slide.dataset.position === 'previous' && !previous.disabled) move(-1);
    if (slide.dataset.position === 'next' && !next.disabled) move(1);
  });
  return slide;
}

async function loadSlide(index, key) {
  const item = await sequence.at(index);
  return item ? createSlide(item, key) : null;
}

function prepareSlide(index) {
  const key = String(index);
  if (!slideCache.has(key)) {
    const pending = loadSlide(index, key);
    slideCache.set(key, pending);
    pending.then((slide) => {
      if (!slide) slideCache.delete(key);
    }, () => slideCache.delete(key));
  }
  return slideCache.get(key);
}

function renderDetails(item) {
  const { work } = item;
  title.textContent = work.name;
  document.title = `${work.name} | Gabriela Monzú`;
  category.textContent = work.category || '';
  description.textContent = work.description || '';
  info.hidden = !work.category && !work.description;
  document.getElementById('site-notice').textContent = '';
  status.textContent = '';
  const detailUrl = artworkUrl(work.id, item.photoIndex, categoryId, source, scope);
  history.replaceState(history.state, '', detailUrl);
  const descriptionText = work.description || `${work.category || 'Obra'} por Gabriela Monzú.`;
  const photo = item.photo;
  let image = '';
  if (photo?.src) image = photo.src;
  else if (photo?.storagePath) {
    import('./supabase-catalog.js').then(({ getPublicImageUrl }) => {
      updateSocialMetadata({ title: `${work.name} | Gabriela Monzú`, description: descriptionText, image: getPublicImageUrl(photo.storagePath), url: detailUrl });
    }).catch((error) => console.error('No se pudo preparar la imagen para compartir.', error));
  }
  updateSocialMetadata({ title: `${work.name} | Gabriela Monzú`, description: descriptionText, image, url: detailUrl });
  document.querySelector('.detail-stage')?.setAttribute('aria-busy', 'false');
  document.querySelector('.detail-skeleton')?.remove();
}

async function prepareWindow(centerIndex) {
  const offsets = [0, ...PREFETCH_OFFSETS];
  const entries = await Promise.all(offsets.map(async (offset) => {
    const index = centerIndex + offset;
    if (index < 0) return null;
    try {
      const slide = await prepareSlide(index);
      return slide ? { offset, slide } : null;
    } catch (error) {
      if (offset === 0) throw error;
      console.error('No se pudo precargar una fotografía cercana.', error);
      status.textContent = 'No se pudieron cargar todas las fotografías cercanas. Puedes seguir navegando.';
      return null;
    }
  }));
  return entries.filter(Boolean);
}

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

async function animateSlides(direction) {
  void track.offsetWidth;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  [...track.children].forEach((slide) => setOffset(slide, Number(slide.dataset.offset) - direction));
  if (!reducedMotion) await new Promise((resolve) => setTimeout(resolve, SLIDE_TRANSITION_MS + 40));
}

async function move(direction) {
  if (loading || !sequence) return;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0) return;
  loading = true;
  updateControls();
  resetZoom(true);
  try {
    const item = await sequence.at(targetIndex);
    if (!item) return;
    const incoming = await prepareSlide(targetIndex);
    if (!incoming) return;
    if (!incoming.isConnected) {
      setOffset(incoming, direction);
      track.append(incoming);
    }
    currentIndex = targetIndex;
    const windowReady = prepareWindow(targetIndex);
    windowReady.catch(() => {});
    try {
      await animateSlides(direction);
    } finally {
      renderDetails(item);
    }
    syncSlides(await windowReady);
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
    if (scope === 'work') {
      const loaded = await getArtworkById(workId);
      if (!loaded || !loaded.images?.length) throw new Error('La obra no existe o no tiene fotografías.');
      if (photoIndex >= loaded.images.length) throw new Error('La fotografía solicitada no existe en esta obra.');
      sequence = createWorkSequence(loaded);
      currentIndex = photoIndex;
    } else {
      sequence = createGalleryNavigator(getGalleryPage, categoryId);
      await sequence.find(workId, photoIndex);
      currentIndex = sequence.position;
    }
    const entries = await prepareWindow(currentIndex);
    renderDetails(await sequence.at(currentIndex));
    syncSlides(entries);
    await updateControls();
  } catch (error) {
    console.error('No se pudo abrir la fotografía.', error);
    status.textContent = `No se pudo abrir la fotografía: ${error.message}`;
  }
}

initialize();
