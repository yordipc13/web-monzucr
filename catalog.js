import { siteConfig } from './site-config.js';

const demoImageDimensions = [
  [[463, 309], [424, 283], [462, 206]],
  [[1920, 1166], [1920, 1166], [1920, 1280]],
  [[1920, 1280], [1920, 1280], [1920, 1280]],
  [[1920, 1280], [1280, 1920], [1280, 1920], [1280, 1920]],
  [[1440, 1920], [1440, 1920], [1440, 1920], [1440, 1920]],
  [[1278, 1920], [1920, 1080], [1920, 1080]],
];

export const demoWorks = demoImageDimensions.map((dimensions, groupIndex) => {
  const group = String(groupIndex + 1).padStart(2, '0');
  return {
    id: `demo-${group}`,
    name: `Obra ${group}`,
    category: null,
    categoryId: null,
    description: '',
    createdAt: null,
    images: dimensions.map(([width, height], imageIndex) => {
      const number = String(imageIndex + 1).padStart(2, '0');
      const extension = groupIndex === 0 && imageIndex === 2 ? 'png' : 'jpg';
      return { src: new URL(`./assets/demo/${group}-${number}.${extension}`, import.meta.url).href, width, height };
    }),
  };
});

async function getRemoteCatalog() {
  if (siteConfig.catalogSource !== 'supabase') {
    throw new Error(`Origen de catálogo desconocido: ${siteConfig.catalogSource}`);
  }
  return import('./supabase-catalog.js');
}

export async function getFeaturedWorks(slot) {
  if (siteConfig.catalogSource === 'demo') {
    if (slot !== 1 && slot !== 2) throw new Error('La selección del carrusel no es válida.');
    return demoWorks.slice((slot - 1) * 3, slot * 3);
  }
  return (await getRemoteCatalog()).getFeaturedWorks(slot);
}

export function makeFeaturedSlides(works) {
  const slides = [];
  let single = null;
  for (const work of works) {
    if (!work.images.length) continue;
    const photos = work.images.slice(0, 2).map((photo, index) => ({ work, photo, index }));
    if (photos.length === 2) {
      if (single) {
        slides.push([single]);
        single = null;
      }
      slides.push(photos);
    } else if (single) {
      slides.push([single, photos[0]]);
      single = null;
    } else {
      single = photos[0];
    }
  }
  if (single) slides.push([single]);
  return slides;
}

export async function getCategories() {
  if (siteConfig.catalogSource === 'demo') return [];
  return (await getRemoteCatalog()).getCategories();
}

export async function getArtworkById(id) {
  if (siteConfig.catalogSource === 'demo') {
    const work = demoWorks.find((item) => item.id === id);
    if (!work) throw new Error('La obra solicitada no existe.');
    return work;
  }
  return (await getRemoteCatalog()).getArtworkById(id);
}

export function paginateDemo(works, offset, limit, categoryId = null) {
  const items = works
    .filter((work) => !categoryId || work.categoryId === categoryId)
    .flatMap((work) => work.images.map((photo, photoIndex) => ({ work, photo, photoIndex })));
  return {
    items: items.slice(offset, offset + limit),
    hasMore: offset + limit < items.length,
  };
}

export async function getGalleryPage({ offset = 0, limit = 12, categoryId = null } = {}) {
  if (siteConfig.catalogSource === 'demo') {
    return paginateDemo([...demoWorks].reverse(), offset, limit, categoryId);
  }
  return (await getRemoteCatalog()).getGalleryPage({ offset, limit, categoryId });
}
