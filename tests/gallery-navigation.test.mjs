import test from 'node:test';
import assert from 'node:assert/strict';
import { createGalleryNavigator } from '../gallery-navigation.js';

function item(id, photoIndex = 0) {
  return { work: { id }, photo: {}, photoIndex };
}

test('navega por todas las páginas respetando la categoría y sus límites', async () => {
  const items = [item('a'), item('b'), item('c'), item('d'), item('e')];
  const requests = [];
  const navigator = createGalleryNavigator(async (query) => {
    requests.push(query);
    return { items: items.slice(query.offset, query.offset + query.limit), hasMore: query.offset + query.limit < items.length };
  }, 'instalaciones', 2);
  assert.equal((await navigator.find('b', 0)).work.id, 'b');
  assert.equal(navigator.hasPrevious, true);
  assert.equal((await navigator.move(1)).work.id, 'c');
  assert.equal((await navigator.move(-1)).work.id, 'b');
  assert.equal((await navigator.move(-1)).work.id, 'a');
  assert.equal(navigator.hasPrevious, false);
  assert.equal(await navigator.move(-1), null);
  assert.equal((await navigator.move(1)).work.id, 'b');
  assert.equal((await navigator.move(1)).work.id, 'c');
  assert.equal((await navigator.move(1)).work.id, 'd');
  assert.equal((await navigator.move(1)).work.id, 'e');
  assert.equal(navigator.hasNext, false);
  assert.equal(await navigator.move(1), null);
  assert.deepEqual(requests.map(({ offset, categoryId }) => [offset, categoryId]), [
    [0, 'instalaciones'], [2, 'instalaciones'], [4, 'instalaciones'],
  ]);
});

test('encuentra fotografías diferentes de la misma obra en páginas separadas', async () => {
  const items = [item('a', 0), item('a', 1), item('b', 0)];
  const navigator = createGalleryNavigator(async ({ offset, limit }) => ({
    items: items.slice(offset, offset + limit), hasMore: offset + limit < items.length,
  }), null, 1);
  assert.equal((await navigator.find('a', 1)).photoIndex, 1);
  assert.equal((await navigator.move(-1)).photoIndex, 0);
});

test('obtiene imágenes vecinas sin avanzar y comparte la carga en límites de página', async () => {
  const calls = [];
  const items = [item('a'), item('b'), item('c')];
  const navigator = createGalleryNavigator(async ({ offset, limit, categoryId }) => {
    calls.push([offset, categoryId]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { items: items.slice(offset, offset + limit), hasMore: offset + limit < items.length };
  }, 'coleccion', 1);
  await navigator.find('b', 0);
  const [before, after, sameAfter] = await Promise.all([navigator.peek(-1), navigator.peek(1), navigator.peek(1)]);
  assert.equal(before.work.id, 'a');
  assert.equal(after.work.id, 'c');
  assert.equal(sameAfter.work.id, 'c');
  assert.equal((await navigator.move(-1)).work.id, 'a');
  assert.deepEqual(calls, [[0, 'coleccion'], [1, 'coleccion'], [2, 'coleccion']]);
});

test('comunica obras ausentes y permite reintentar un error de carga', async () => {
  let attempts = 0;
  const navigator = createGalleryNavigator(async ({ offset }) => {
    if (offset === 0) return { items: [item('a')], hasMore: true };
    if (++attempts === 1) throw new Error('Error de conexión');
    return { items: [item('b')], hasMore: false };
  }, null, 1);
  await navigator.find('a', 0);
  await assert.rejects(navigator.move(1), /Error de conexión/);
  assert.equal(navigator.hasNext, true);
  assert.equal((await navigator.move(1)).work.id, 'b');
  await assert.rejects(navigator.find('inexistente', 0), /no está disponible/);
});

test('rechaza páginas vacías que declaran más resultados', async () => {
  const navigator = createGalleryNavigator(async () => ({ items: [], hasMore: true }));
  await assert.rejects(navigator.find('a', 0), /página vacía/);
});
