import { getCategories, getGalleryPage } from './catalog.js';
import { artworkUrl, createImage, notify } from './site.js';

function createGalleryItem({ work, photo, photoIndex }, categoryId = null, source = 'gallery', scope = 'gallery', showCount = false) {
  const button = document.createElement('a');
  button.href = artworkUrl(work.id, photoIndex, categoryId, source, scope);
  button.className = 'gallery-item';
  button.setAttribute('aria-label', `Ver detalles de ${work.name}, fotografía ${photoIndex + 1}`);

  const wrap = document.createElement('span');
  wrap.className = 'gallery-image-wrap';
  const image = createImage(photo, work, photoIndex);
  const title = document.createElement('span');
  title.className = 'gallery-item-title';
  title.textContent = work.name;
  wrap.append(image);
  if (showCount) {
    const count = document.createElement('span');
    count.className = 'gallery-item-count';
    count.textContent = `${work.images.length} ${work.images.length === 1 ? 'imagen' : 'imágenes'}`;
    count.setAttribute('aria-label', count.textContent);
    wrap.append(count);
  }
  wrap.append(title);
  button.append(wrap);
  return button;
}

export async function renderPreview() {
  const gallery = document.getElementById('gallery-preview');
  const status = document.getElementById('gallery-preview-status');
  status.textContent = 'Cargando obras…';
  try {
    const { items } = await getGalleryPage({ limit: 24 });
    gallery.replaceChildren(...items.map((item) => createGalleryItem(item, null, 'home')));
    gallery.setAttribute('aria-busy', 'false');
    status.textContent = items.length ? '' : 'Todavía no hay obras para mostrar.';
    gallery.setAttribute('aria-busy', 'false');
  } catch (error) {
    console.error('No se pudo cargar la vista previa de la galería.', error);
    status.textContent = 'No se pudo cargar la galería. Inténtalo de nuevo más tarde.';
  }
}

export async function initializeGalleryPage() {
  const gallery = document.getElementById('gallery');
  const status = document.getElementById('gallery-status');
  const filters = document.getElementById('category-filters');
  const moreWrap = document.getElementById('gallery-more-wrap');
  const moreButton = document.getElementById('gallery-more');
  const sentinel = document.getElementById('gallery-sentinel');
  let offset = 0;
  const categoryParam = new URL(window.location.href).searchParams.get('category') || null;
  let categoryId = categoryParam;
  let detailScope = 'gallery';
  let hasMore = true;
  let loading = false;
  let generation = 0;
  let observer = null;

  async function loadNext() {
    if (loading || !hasMore) return;
    loading = true;
    const requestGeneration = generation;
    status.textContent = 'Cargando obras…';
    moreButton.disabled = true;
    try {
      const page = await getGalleryPage({
        offset,
        limit: 12,
        categoryId,
        coverOnly: detailScope === 'work',
      });
      if (requestGeneration !== generation) return;
      if (page.hasMore && !page.items.length) throw new Error('La fuente devolvió una página vacía con más resultados pendientes.');
      const pageItems = page.items.map((item) => createGalleryItem(item, categoryId, 'gallery', detailScope, detailScope === 'work'));
      if (offset === 0) gallery.replaceChildren(...pageItems);
      else gallery.append(...pageItems);
      gallery.setAttribute('aria-busy', 'false');
      offset = page.nextOffset;
      hasMore = page.hasMore;
      moreWrap.hidden = !hasMore;
      status.textContent = offset ? '' : 'Todavía no hay obras en esta categoría.';
      if (hasMore && observer) {
        requestAnimationFrame(() => {
          if (sentinel.getBoundingClientRect().top <= window.innerHeight + 400) loadNext();
        });
      }
    } catch (error) {
      if (requestGeneration !== generation) return;
      console.error('No se pudo cargar la galería.', error);
      status.textContent = 'No se pudo cargar la galería. Puedes intentarlo de nuevo.';
      moreWrap.hidden = false;
    } finally {
      if (requestGeneration === generation) {
        loading = false;
        moreButton.disabled = false;
      }
    }
  }

  function chooseCategory(id) {
    categoryId = id;
    const selectedCategory = [...filters.querySelectorAll('button')].find((button) => (button.dataset.category || null) === id);
    detailScope = selectedCategory?.textContent === 'Instalaciones' ? 'work' : 'gallery';
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('category', id);
    else url.searchParams.delete('category');
    history.replaceState(history.state, '', url);
    generation += 1;
    offset = 0;
    hasMore = true;
    loading = false;
    gallery.replaceChildren();
    filters.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String((button.dataset.category || null) === id));
    });
    loadNext();
  }

  function addFilter(label, id) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.category = id || '';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(id === categoryId));
    button.addEventListener('click', () => chooseCategory(id));
    filters.append(button);
  }

  addFilter('Todas', null);
  try {
    const categories = await getCategories();
    categories.forEach((category) => addFilter(category.name, category.id));
    const categoryMatch = categoryParam
      ? categories.find((category) => category.id === categoryParam || category.name.localeCompare(categoryParam, 'es', { sensitivity: 'accent' }) === 0)
      : null;
    if (categoryMatch) {
      categoryId = categoryMatch.id;
      detailScope = categoryMatch.name === 'Instalaciones' ? 'work' : 'gallery';
      const url = new URL(window.location.href);
      url.searchParams.set('category', categoryMatch.id);
      history.replaceState(history.state, '', url);
      filters.querySelectorAll('button').forEach((button) => {
        button.setAttribute('aria-pressed', String((button.dataset.category || null) === categoryId));
      });
    }
  } catch (error) {
    notify('No se pudieron cargar las categorías. La galería se mostrará sin filtros.', error);
  }
  moreButton.addEventListener('click', loadNext);
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadNext();
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
  }
  await loadNext();
}

export function initializeHomeGallery() {
  const expandButton = document.getElementById('gallery-expand');
  const expandWrap = document.getElementById('gallery-expand-wrap');
  const preview = document.getElementById('gallery-preview');
  const full = document.getElementById('gallery-full');
  const section = document.getElementById('galeria');
  let started = false;

  function showFullGallery({ scroll }) {
    if (!started) {
      started = true;
      initializeGalleryPage();
    }
    preview.hidden = true;
    expandWrap.hidden = true;
    full.hidden = false;
    if (window.location.hash !== '#galeria') history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}#galeria`);
    if (scroll) section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  expandButton.addEventListener('click', () => showFullGallery({ scroll: true }));
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#galeria') showFullGallery({ scroll: true });
  });
  showFullGallery({ scroll: false });
}
