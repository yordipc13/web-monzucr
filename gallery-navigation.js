export function createGalleryNavigator(loadPage, categoryId = null, pageSize = 24) {
  const items = [];
  let hasMore = true;
  let current = -1;
  let pending = null;

  async function loadNext() {
    if (!pending) {
      pending = (async () => {
        const page = await loadPage({ offset: items.length, limit: pageSize, categoryId });
        if (page.hasMore && !page.items.length) {
          throw new Error('La fuente devolvió una página vacía con más resultados pendientes.');
        }
        items.push(...page.items);
        hasMore = page.hasMore;
      })();
    }
    try {
      await pending;
    } finally {
      pending = null;
    }
  }

  async function peek(direction) {
    if (current < 0 || ![-1, 1].includes(direction)) throw new Error('Navegación de galería no válida.');
    const target = current + direction;
    if (direction === 1 && target >= items.length && hasMore) await loadNext();
    return items[target] || null;
  }

  return {
    async find(workId, photoIndex) {
      let index;
      do {
        index = items.findIndex((item) => item.work.id === workId && item.photoIndex === photoIndex);
        if (index >= 0) {
          current = index;
          return items[current];
        }
        if (hasMore) await loadNext();
      } while (hasMore);
      index = items.findIndex((item) => item.work.id === workId && item.photoIndex === photoIndex);
      if (index < 0) throw new Error('La fotografía no está disponible en esta galería.');
      current = index;
      return items[current];
    },
    peek,
    async move(direction) {
      const item = await peek(direction);
      if (item) current += direction;
      return item;
    },
    get hasPrevious() { return current > 0; },
    get hasNext() { return current >= 0 && (current + 1 < items.length || hasMore); },
  };
}
