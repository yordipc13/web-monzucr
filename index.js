import { getFeaturedWorks, makeFeaturedSlides } from './catalog.js';
import { renderPreview } from './gallery.js';
import { artworkUrl, createImage, initializeGridControls, initializeSite } from './site.js';

function createSlide(photos) {
  const slide = document.createElement('div');
  slide.className = 'swiper-slide';
  const pair = document.createElement('div');
  pair.className = 'carousel-pair';
  photos.forEach(({ work, photo, index }) => {
    const button = document.createElement('a');
    button.href = artworkUrl(work.id, index, null, 'home');
    button.className = 'carousel-photo';
    button.setAttribute('aria-label', `Ver detalles de ${work.name}, fotografía ${index + 1}`);
    const image = createImage(photo, work, index);
    button.append(image);
    pair.append(button);
  });
  slide.append(pair);
  return slide;
}

async function initializeCarousel(slot) {
  const shell = document.querySelector(`[data-carousel="${slot}"]`);
  const section = shell.closest('section');
  const status = section.querySelector('[data-carousel-status]');
  const caption = section.querySelector('[data-carousel-caption]');
  const count = section.querySelector('[data-carousel-count]');
  const slider = shell.querySelector('.work-swiper');
  const wrapper = slider.querySelector('.swiper-wrapper');
  const previous = shell.querySelector('.carousel-previous');
  const next = shell.querySelector('.carousel-next');
  status.textContent = 'Cargando obras…';
  try {
    const slides = makeFeaturedSlides(await getFeaturedWorks(slot));
    if (!slides.length) {
      slider.setAttribute('aria-busy', 'false');
      status.textContent = 'Todavía no hay obras destacadas en esta selección.';
      previous.hidden = true;
      next.hidden = true;
      return;
    }
    wrapper.replaceChildren(...slides.map(createSlide));
    slider.setAttribute('aria-busy', 'false');
    const firstImages = wrapper.querySelectorAll('.swiper-slide:first-child img');
    firstImages.forEach((image) => { image.loading = 'eager'; });
    const updateCaption = (index) => {
      caption.textContent = [...new Set(slides[index].map(({ work }) => work.name))].join(' / ');
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    };
    updateCaption(0);
    status.textContent = '';
    previous.hidden = slides.length < 2;
    next.hidden = slides.length < 2;

    if (window.Swiper) {
      new window.Swiper(slider, {
        slidesPerView: 1,
        speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550,
        touchAngle: 30,
        navigation: { prevEl: previous, nextEl: next },
        on: { slideChange(swiper) { updateCaption(swiper.activeIndex); } },
      });
    } else {
      console.warn('Swiper no está disponible; se usa navegación táctil simplificada.');
      status.textContent = 'La animación avanzada no está disponible; puedes seguir navegando.';
      slider.classList.add('is-fallback');
      const goTo = (direction) => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        wrapper.scrollBy({ left: direction * wrapper.clientWidth, behavior: reducedMotion ? 'auto' : 'smooth' });
      };
      previous.addEventListener('click', () => goTo(-1));
      next.addEventListener('click', () => goTo(1));
      wrapper.addEventListener('scroll', () => {
        const index = Math.min(slides.length - 1, Math.round(wrapper.scrollLeft / wrapper.clientWidth));
        updateCaption(index);
      }, { passive: true });
    }
  } catch (error) {
    console.error('No se pudo cargar el carrusel.', error);
    slider.setAttribute('aria-busy', 'false');
    status.textContent = 'No se pudieron cargar las obras de esta selección.';
    previous.hidden = true;
    next.hidden = true;
  }
}

function initialize() {
  initializeSite();
  initializeGridControls();
  initializeCarousel(1);
  initializeCarousel(2);
  renderPreview();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
