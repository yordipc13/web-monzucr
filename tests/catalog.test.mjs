import test from 'node:test';
import assert from 'node:assert/strict';
import { demoWorks, makeCoverItems, paginateDemo } from '../assets/js/catalog.js';

test('el catálogo temporal agrupa veinte fotografías en seis obras', () => {
  assert.equal(demoWorks.length, 6);
  assert.equal(demoWorks.reduce((total, work) => total + work.images.length, 0), 20);
  for (const work of demoWorks) {
    assert.ok(work.images.length >= 2);
    for (const image of work.images) {
      assert.ok(image.width > 0 && image.height > 0);
    }
  }
  assert.equal(paginateDemo(demoWorks, 0, 24).items.length, 20);
});

test('las dos selecciones temporales son independientes y muestran obras con dos fotos', () => {
  const first = demoWorks.slice(0, 3);
  const second = demoWorks.slice(3, 6);
  assert.equal(first.length, 3);
  assert.equal(second.length, 3);
  assert.ok(first.every((work) => work.images.length >= 2));
  assert.ok(second.every((work) => work.images.length >= 2));
  assert.ok(first.every((work) => !second.some((other) => other.id === work.id)));
});

test('los carruseles del inicio muestran una portada por obra y omiten obras sin fotos', () => {
  const works = [
    { id: 'a', images: [{ src: 'a1.jpg' }, { src: 'a2.jpg' }] },
    { id: 'empty', images: [] },
    { id: 'b', images: [{ src: 'b1.jpg' }] },
  ];
  const covers = makeCoverItems(works);
  assert.deepEqual(covers.map(({ work, photoIndex }) => [work.id, photoIndex]), [['a', 0], ['b', 0]]);
  assert.equal(covers[0].photo.src, 'a1.jpg');
  assert.deepEqual(makeCoverItems([]), []);
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
  const covers = paginateDemo(works, 0, 24, 'a', true);
  assert.equal(covers.items.length, 15);
  assert.ok(covers.items.every(({ photoIndex }) => photoIndex === 0));
});
