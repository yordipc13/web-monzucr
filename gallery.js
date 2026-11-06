import { getCategories, getGalleryPage } from './catalog.js';
import { artworkUrl, createImage, notify } from './site.js';

function createGalleryItem({ work, photo, photoIndex }, categoryId = null, source = 'gallery') {
  const button = document.createElement('a');
  button.href = artworkUrl(work.id, photoIndex, categoryId, source);
  button.className = 'gallery-item';
  button.setAttribute('aria-label', `Ver detalles de ${work.name}, fotografía ${photoIndex + 1}`);

  const wrap = document.createElement('span');
  wrap.className = 'gallery-image-wrap';
  const image = createImage(photo, work, photoIndex);
  const title = document.createElement('span');
  title.className = 'gallery-item-title';
  title.textContent = work.name;
  wrap.append(image, title);
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
  let categoryId = new URL(window.location.href).searchParams.get('category') || null;
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
      const page = await getGalleryPage({ offset, limit: 12, categoryId });
      if (requestGeneration !== generation) return;
      if (page.hasMore && !page.items.length) throw new Error('La fuente devolvió una página vacía con más resultados pendientes.');
      const pageItems = page.items.map((item) => createGalleryItem(item, categoryId));
      if (offset === 0) gallery.replaceChildren(...pageItems);
      else gallery.append(...pageItems);
      gallery.setAttribute('aria-busy', 'false');
      offset += page.items.length;
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
