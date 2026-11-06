import test from 'node:test';
import assert from 'node:assert/strict';
import { demoWorks, makeFeaturedSlides, paginateDemo } from '../catalog.js';

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

test('los carruseles agrupan fotos independientes y conservan las obras con varias fotos', () => {
  const single = (id) => ({ id, images: [{ src: `${id}.jpg` }] });
  const multi = { id: 'multi', images: [{ src: '1.jpg' }, { src: '2.jpg' }, { src: '3.jpg' }] };
  const slides = makeFeaturedSlides([single('a'), single('b'), multi, single('c')]);
  assert.deepEqual(slides.map((slide) => slide.map(({ work, index }) => [work.id, index])), [
    [['a', 0], ['b', 0]], [['multi', 0], ['multi', 1]], [['c', 0]],
  ]);
  assert.deepEqual(makeFeaturedSlides([single('a'), multi, single('b')]).map((slide) => slide.length), [1, 2, 1]);
  assert.deepEqual(makeFeaturedSlides([{ id: 'empty', images: [] }]), []);
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
