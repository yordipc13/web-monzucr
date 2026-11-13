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
      return { src: new URL(`../demo/${group}-${number}.${extension}`, import.meta.url).href, width, height };
    }),
  };
});

async function getRemoteCatalog() {
  if (siteConfig.catalogSource !== 'supabase') {
    throw new Error(`Origen de catálogo desconocido: ${siteConfig.catalogSource}`);
  }
  return import('./supabase-catalog.js');
}

export async function getHomeWorks() {
  if (siteConfig.catalogSource === 'demo') return [...demoWorks].reverse();
  return (await getRemoteCatalog()).getHomeWorks();
}

export function makeCoverItems(works) {
  return works
    .filter((work) => work.images.length)
    .map((work) => ({ work, photo: work.images[0], photoIndex: 0 }));
}

const sourceCache = new Map();

export function photoSource(photo) {
  if (photo.src) return Promise.resolve(photo.src);
  const key = photo.storagePath;
  if (!sourceCache.has(key)) {
    const pending = getRemoteCatalog()
      .then(({ downloadImage }) => downloadImage(key))
      .then((blob) => URL.createObjectURL(blob));
    sourceCache.set(key, pending);
    pending.catch(() => sourceCache.delete(key));
  }
  return sourceCache.get(key);
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
    const page = paginateDemo([...demoWorks].reverse(), offset, limit, categoryId);
    return { ...page, nextOffset: offset + page.items.length };
  }
  return (await getRemoteCatalog()).getGalleryPage({ offset, limit, categoryId });
}
