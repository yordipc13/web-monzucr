import test from 'node:test';
import assert from 'node:assert/strict';
import { demoWorks, getArtworkById, getFeaturedWorks, getGalleryPage, paginateDemo } from '../catalog.js';

test('el catálogo temporal agrupa veinte fotografías en seis obras', async () => {
  assert.equal(demoWorks.length, 6);
  assert.equal(demoWorks.reduce((total, work) => total + work.images.length, 0), 20);
  for (const work of demoWorks) {
    assert.ok(work.images.length >= 2);
    for (const image of work.images) {
      assert.ok(image.width > 0 && image.height > 0);
    }
  }
  assert.equal((await getGalleryPage({ limit: 24 })).items.length, 20);
});

test('las dos selecciones son independientes y muestran obras con dos fotos', async () => {
  const first = await getFeaturedWorks(1);
  const second = await getFeaturedWorks(2);
  assert.equal(first.length, 3);
  assert.equal(second.length, 3);
  assert.ok(first.every((work) => work.images.length >= 2));
  assert.ok(second.every((work) => work.images.length >= 2));
  assert.ok(first.every((work) => !second.some((other) => other.id === work.id)));
  await assert.rejects(getFeaturedWorks(3));
  await assert.rejects(getArtworkById('inexistente'));
});

test('la paginación respeta límite, desplazamiento y categoría', () => {
  const works = Array.from({ length: 30 }, (_, index) => ({
    id: String(index),
    categoryId: index % 2 ? 'b' : 'a',
    images: [{ src: `${index}.jpg` }],
  }));
  const first = paginateDemo(works, 0, 24);
  const second = paginateDemo(works, 24, 24);
  assert.equal(first.items.length, 24);
  assert.equal(first.hasMore, true);
  assert.equal(second.items.length, 6);
  assert.equal(second.hasMore, false);
  assert.equal(paginateDemo(works, 0, 24, 'a').items.length, 15);
});
