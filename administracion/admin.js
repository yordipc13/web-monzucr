

import { initializePageTransitions } from '../site.js';

const loginPanel = document.getElementById('login-panel');
const loginForm = document.getElementById('login-form');
const passwordToggle = document.getElementById('toggle-password');
const workspace = document.getElementById('workspace');
const globalStatus = document.getElementById('global-status');
const signOutButton = document.getElementById('sign-out');
const dialog = document.getElementById('art-dialog');
const form = document.getElementById('art-form');
const formStatus = document.getElementById('form-status');
const imageList = document.getElementById('image-list');
const imageInput = document.getElementById('image-files');
const menu = document.getElementById('work-menu');
let supabase;
let categories = [];
let works = [];
let editingId = null;
let images = [];
let originalImages = [];
let dirty = false;
let saving = false;
let deleting = false;
let menuWork = null;
let menuTrigger = null;
let editorPublish = true;
const coverUrls = new Set();

function message(error) {
  return error instanceof Error ? error.message : String(error?.message || error);
}

function requireSuccess(result) {
  if (result.error) throw result.error;
  return result.data;
}

function setGlobalStatus(text, error) {
  globalStatus.textContent = text;
  if (error) console.error(text, error);
}

function setFormStatus(text, error) {
  formStatus.textContent = text;
  if (error) console.error(text, error);
}

function setPasswordVisible(visible) {
  loginForm.elements.password.type = visible ? 'text' : 'password';
  passwordToggle.textContent = visible ? 'Ocultar' : 'Mostrar';
  passwordToggle.setAttribute('aria-label', `${visible ? 'Ocultar' : 'Mostrar'} contraseña`);
  passwordToggle.setAttribute('aria-pressed', String(visible));
}

function getBucket() {
  return supabase.storage.from('monzu-artwork-images');
}

async function downloadImage(path) {
  return requireSuccess(await getBucket().download(path));
}

async function loadCover(image, work) {
  try {
    const blob = await downloadImage(work.images[0].storage_path);
    if (!image.isConnected) return;
    const url = URL.createObjectURL(blob);
    coverUrls.add(url);
    const release = () => {
      URL.revokeObjectURL(url);
      coverUrls.delete(url);
    };
    image.addEventListener('load', release, { once: true });
    image.addEventListener('error', release, { once: true });
    image.src = url;
  } catch (error) {
    setGlobalStatus(`No se pudo cargar la portada de ${work.name}: ${message(error)}`, error);
  }
}

async function authorize() {
  workspace.hidden = true;
  loginPanel.hidden = false;
  signOutButton.hidden = false;
  const result = await supabase.rpc('monzu_is_admin');
  if (result.error?.code === 'PGRST202' && message(result.error).includes('monzu_is_admin')) {
    throw new Error('Supabase no encuentra la función public.monzu_is_admin. Revisa que el esquema de administración esté configurado y que la función esté disponible en la caché del esquema.');
  }
  const allowed = requireSuccess(result);
  if (!allowed) {
    setGlobalStatus('Esta cuenta no tiene permisos de administración. Cierra sesión para usar otra cuenta.');
    return;
  }
  await loadCatalog();
  loginPanel.hidden = true;
  workspace.hidden = false;
}

async function loadCatalog() {
  setGlobalStatus('Cargando catálogo…');
  const [categoryResult, workResult] = await Promise.all([
    supabase.from('monzu_categories').select('id,name').order('name'),
    supabase.from('monzu_artworks')
      .select('id,name,description,status,category_id,created_at,category:monzu_categories(name),images:monzu_images(id,position,storage_path,width,height,alt),featured:monzu_featured(slot,position)')
      .order('created_at', { ascending: false }).order('id', { ascending: false }),
  ]);
  categories = requireSuccess(categoryResult);
  works = requireSuccess(workResult);
  works.forEach((work) => work.images.sort((a, b) => a.position - b.position));
  renderCatalog();
  setGlobalStatus(categories.length ? '' : 'No hay categorías configuradas en Supabase; agrega una antes de publicar una obra.');
}

function renderCatalog() {
  closeMenu();
  const term = document.getElementById('search').value.trim().toLocaleLowerCase('es');
  const filtered = works.filter((work) =>
    `${work.name} ${work.category?.name || ''}`.toLocaleLowerCase('es').includes(term));
  const grid = document.getElementById('catalog-grid');
  coverUrls.forEach((url) => URL.revokeObjectURL(url));
  coverUrls.clear();
  grid.replaceChildren();
  for (const work of filtered) {
    const card = document.createElement('article');
    card.className = 'work-card';
    const photo = document.createElement('div');
    photo.className = 'work-photo';
    if (work.images.length) {
      const cover = document.createElement('img');
      cover.alt = `Fotografía de ${work.name}`;
      cover.loading = 'lazy';
      cover.addEventListener('error', () => setGlobalStatus(`No se pudo cargar la portada de ${work.name}.`), { once: true });
      photo.append(cover);
      loadCover(cover, work);
    } else {
      photo.textContent = 'Sin imagen';
    }
    const state = document.createElement('span');
    state.className = `state${work.status === 'draft' ? ' draft' : ''}`;
    state.textContent = work.status === 'draft' ? 'Oculta' : 'Publicada';
    photo.append(state);
    const details = document.createElement('div');
    details.className = 'work-details';
    const text = document.createElement('div');
    const name = document.createElement('h3');
    name.textContent = work.name;
    const category = document.createElement('p');
    category.textContent = work.category?.name || 'Sin categoría';
    text.append(name, category);
    const options = document.createElement('button');
    options.type = 'button';
    options.className = 'work-options';
    options.textContent = '⋯';
    options.setAttribute('aria-label', `Opciones de ${work.name}`);
    options.setAttribute('aria-expanded', 'false');
    options.setAttribute('aria-controls', 'work-menu');
    options.addEventListener('click', () => {
      if (menuWork === work && !menu.hidden) return closeMenu();
      const rect = options.getBoundingClientRect();
      openMenu(work, options, rect.right, rect.bottom);
    });
    card.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      openMenu(work, options, event.clientX, event.clientY);
    });
    details.append(text, options);
    card.append(photo, details);
    grid.append(card);
  }
  const totalLabel = `${works.length} ${works.length === 1 ? 'obra' : 'obras'}`;
  document.getElementById('catalog-count').textContent = term
    ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'} de ${totalLabel}`
    : totalLabel;
  const empty = document.getElementById('catalog-empty');
  empty.hidden = filtered.length !== 0;
  empty.textContent = term ? 'No hay obras que coincidan con la búsqueda.' : 'Todavía no hay obras en el catálogo.';
}

function closeMenu(restoreFocus = false) {
  menu.hidden = true;
  if (menuTrigger) {
    menuTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && menuTrigger.isConnected) menuTrigger.focus({ preventScroll: true });
  }
  menuTrigger = null;
  menuWork = null;
}

function openMenu(work, trigger, x, y) {
  closeMenu();
  menuWork = work;
  menuTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  menu.querySelector('[data-action="visibility"]').textContent = work.status === 'published' ? 'Ocultar' : 'Mostrar';
  menu.hidden = false;
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
  menu.querySelector('button').focus({ preventScroll: true });
}

function releaseImages() {
  images.forEach((image) => {
    if (image.objectUrl) URL.revokeObjectURL(image.objectUrl);
  });
}

async function openEditor(work = null) {
  const previews = [];
  try {
    setGlobalStatus(work ? 'Cargando imágenes de la obra…' : '');
    if (work) {
      for (const image of work.images) {
        const objectUrl = URL.createObjectURL(await downloadImage(image.storage_path));
        previews.push({ ...image, objectUrl, src: objectUrl });
      }
    }
    releaseImages();
    form.reset();
    editingId = work?.id || null;
    originalImages = work ? work.images.map((image) => ({ ...image })) : [];
    images = previews;
    document.getElementById('form-title').textContent = work ? 'Editar obra' : 'Agregar obra';
    form.elements.name.value = work?.name || '';
    form.elements.description.value = work?.description || '';
    editorPublish = !work || work.status === 'published';
    const categorySelect = form.elements.category;
    categorySelect.replaceChildren(new Option('Sin categoría', ''));
    categories.forEach((category) => categorySelect.add(new Option(category.name, category.id)));
    categorySelect.value = work?.category_id || '';
    categorySelect.disabled = categories.length === 0;
    document.getElementById('category-help').textContent = categories.length
      ? 'La categoría es obligatoria para publicar.'
      : 'Las categorías están pendientes de configuración en Supabase.';
    document.getElementById('upload-label').hidden = Boolean(work && work.images.length);
    document.getElementById('image-help').textContent = work && work.images.length
      ? 'Las imágenes existentes se conservan al editar los datos.'
      : 'Selecciona una imagen JPG, JPEG o PNG.';
    setFormStatus('');
    dirty = false;
    renderImages();
    setGlobalStatus('');
    dialog.showModal();
    form.elements.name.focus();
  } catch (error) {
    previews.forEach((image) => URL.revokeObjectURL(image.objectUrl));
    setGlobalStatus(`No se pudo abrir la obra: ${message(error)}`, error);
  }
}

function closeEditor() {
  if (saving) return;
  if (dirty && !window.confirm('Hay cambios sin guardar. ¿Deseas descartarlos?')) return;
  releaseImages();
  images = [];
  dialog.close();
}

function renderImages() {
  imageList.replaceChildren();
  document.getElementById('image-empty').hidden = images.length !== 0;
  images.forEach((image, index) => {
    const row = document.createElement('div');
    row.className = 'image-row';
    const preview = document.createElement('img');
    preview.src = image.src;
    preview.alt = '';
    preview.addEventListener('error', () => setFormStatus('No se pudo cargar una vista previa de la imagen.'), { once: true });
    const info = document.createElement('div');
    info.className = 'image-info';
    const title = document.createElement('strong');
    title.textContent = index === 0 ? 'Portada' : `Imagen ${index + 1}`;
    const name = document.createElement('span');
    name.textContent = image.file?.name || 'Imagen guardada';
    info.append(title, name);
    row.append(preview, info);
    imageList.append(row);
  });
}

async function imageDimensions(file) {
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw new Error(`La imagen ${file.name} no tiene dimensiones válidas.`);
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

async function saveWork(event) {
  event.preventDefault();
  if (saving) return;
  const name = form.elements.name.value.trim();
  const categoryId = form.elements.category.value || null;
  const publish = editorPublish;
  if (!name) return setFormStatus('Escribe el nombre de la obra.');
  if (!images.length) return setFormStatus('Selecciona una imagen para la obra.');
  if (publish && (!categoryId || !images.length)) return setFormStatus('Para publicar, elige una categoría y añade al menos una imagen.');
  saving = true;
  const controls = Array.from(form.querySelectorAll('input, select, textarea, button'), (control) => ({
    control, disabled: control.disabled,
  }));
  controls.forEach(({ control }) => { control.disabled = true; });
  setFormStatus('Guardando obra…');
  let workId = editingId;
  try {
    const payload = { name, category_id: categoryId, description: form.elements.description.value.trim() };
    if (workId) {
      requireSuccess(await supabase.from('monzu_artworks').update(payload).eq('id', workId).select('id').single());
    } else {
      const created = requireSuccess(await supabase.from('monzu_artworks').insert({ ...payload, status: 'draft' }).select('id').single());
      workId = created.id;
      editingId = workId;
    }

    let position = originalImages.reduce((max, image) => Math.max(max, image.position), -1) + 1;
    for (const image of images) {
      if (!image.file) continue;
      const dimensions = await imageDimensions(image.file);
      const extension = image.file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${workId}/${crypto.randomUUID()}.${extension}`;
      requireSuccess(await getBucket().upload(path, image.file, { contentType: image.file.type, upsert: false }));
      const result = await supabase.from('monzu_images').insert({
        artwork_id: workId, position, storage_path: path, width: dimensions.width, height: dimensions.height,
      }).select('id,position,storage_path,width,height,alt').single();
      if (result.error) {
        const cleanup = await getBucket().remove([path]);
        if (cleanup.error) throw new Error(`No se pudo guardar la imagen ni limpiar el archivo ${path}: ${message(cleanup.error)}`);
        throw result.error;
      }
      Object.assign(image, result.data);
      image.file = null;
      originalImages.push(result.data);
      document.getElementById('upload-label').hidden = true;
      position += 1;
    }
    if (publish) {
      requireSuccess(await supabase.from('monzu_artworks').update({ status: 'published' }).eq('id', workId).select('id').single());
    }
    dirty = false;
    releaseImages();
    images = [];
    dialog.close();
    try {
      await loadCatalog();
      setGlobalStatus(publish ? 'Obra publicada correctamente.' : 'Borrador guardado correctamente.');
    } catch (refreshError) {
      setGlobalStatus(`La obra se guardó, pero no se pudo actualizar la lista: ${message(refreshError)}`, refreshError);
    }
  } catch (error) {
    const draftNote = workId ? ' Algunos cambios pueden haberse guardado; revisa la obra antes de volver a intentarlo.' : '';
    setFormStatus(`No se pudo completar el guardado: ${message(error)}.${draftNote}`, error);
  } finally {
    saving = false;
    controls.forEach(({ control, disabled }) => { control.disabled = disabled; });
  }
}

async function setVisibility(work) {
  if (deleting) return;
  const publish = work.status === 'draft';
  if (publish && (!work.category_id || !work.images.length)) {
    setGlobalStatus('Para mostrar esta obra, primero añade una categoría y una imagen.');
    return;
  }
  deleting = true;
  const controls = Array.from(workspace.querySelectorAll('button'), (control) => ({
    control, disabled: control.disabled,
  }));
  controls.push({ control: signOutButton, disabled: signOutButton.disabled });
  controls.forEach(({ control }) => { control.disabled = true; });
  try {
    setGlobalStatus(publish ? 'Mostrando obra…' : 'Ocultando obra…');
    requireSuccess(await supabase.from('monzu_artworks')
      .update({ status: publish ? 'published' : 'draft' }).eq('id', work.id).select('id').single());
    try {
      await loadCatalog();
      setGlobalStatus(publish ? 'Obra visible en el catálogo.' : 'Obra oculta del catálogo.');
    } catch (error) {
      setGlobalStatus(`El cambio se guardó, pero no se pudo actualizar la galería: ${message(error)}`, error);
    }
  } catch (error) {
    setGlobalStatus(`No se pudo cambiar la visibilidad: ${message(error)}`, error);
  } finally {
    deleting = false;
    controls.forEach(({ control, disabled }) => { control.disabled = disabled; });
  }
}

async function deleteWork(work) {
  if (deleting) return;
  if (!window.confirm(`¿Eliminar «${work.name}» y todas sus imágenes? Esta acción no se puede deshacer.`)) return;
  deleting = true;
  const controls = Array.from(workspace.querySelectorAll('button'), (control) => ({
    control, disabled: control.disabled,
  }));
  controls.push({ control: signOutButton, disabled: signOutButton.disabled });
  controls.forEach(({ control }) => { control.disabled = true; });
  try {
    setGlobalStatus('Eliminando obra…');
    requireSuccess(await supabase.from('monzu_artworks').update({ status: 'draft' }).eq('id', work.id).select('id').single());
    if (work.images.length) requireSuccess(await getBucket().remove(work.images.map((image) => image.storage_path)));
    requireSuccess(await supabase.from('monzu_artworks').delete().eq('id', work.id));
    await loadCatalog();
    setGlobalStatus('Obra eliminada.');
  } catch (error) {
    let refreshNote = '';
    try {
      await loadCatalog();
    } catch (refreshError) {
      refreshNote = ` Tampoco se pudo actualizar la lista: ${message(refreshError)}.`;
      console.error('No se pudo actualizar la lista después de la eliminación fallida.', refreshError);
    }
    setGlobalStatus(`No se pudo completar la eliminación: ${message(error)}. La obra puede haber quedado como borrador; revisa sus imágenes.${refreshNote}`, error);
  } finally {
    deleting = false;
    controls.forEach(({ control, disabled }) => { control.disabled = disabled; });
  }
}

async function initialize() {
  try {
    ({ supabase } = await import('../Supabase Connection/supabaseClient.js'));
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) await authorize();
    else {
      loginPanel.hidden = false;
      setGlobalStatus('');
    }
  } catch (error) {
    loginPanel.hidden = false;
    workspace.hidden = true;
    setGlobalStatus(`No se pudo conectar o comprobar los permisos. Revisa la configuración de Supabase: ${message(error)}`, error);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    setGlobalStatus('Comprobando acceso…');
    requireSuccess(await supabase.auth.signInWithPassword({
      email: loginForm.elements.email.value.trim(),
      password: loginForm.elements.password.value,
    }));
    loginForm.elements.password.value = '';
    setPasswordVisible(false);
    await authorize();
  } catch (error) {
    loginPanel.hidden = false;
    workspace.hidden = true;
    setGlobalStatus(`No se pudo iniciar sesión o comprobar los permisos: ${message(error)}`, error);
  } finally {
    button.disabled = false;
  }
});

passwordToggle.addEventListener('click', () => {
  setPasswordVisible(loginForm.elements.password.type === 'password');
});

signOutButton.addEventListener('click', async () => {
  try {
    requireSuccess(await supabase.auth.signOut());
    workspace.hidden = true;
    signOutButton.hidden = true;
    loginPanel.hidden = false;
    setGlobalStatus('Sesión cerrada.');
  } catch (error) {
    setGlobalStatus(`No se pudo cerrar la sesión: ${message(error)}`, error);
  }
});
document.getElementById('search').addEventListener('input', renderCatalog);
document.getElementById('add-work').addEventListener('click', () => openEditor());
menu.addEventListener('click', (event) => {
  const action = event.target.closest('button[data-action]');
  if (!action || !menuWork) return;
  const work = menuWork;
  closeMenu(true);
  if (action.dataset.action === 'edit') openEditor(work);
  if (action.dataset.action === 'visibility') setVisibility(work);
  if (action.dataset.action === 'delete') deleteWork(work);
});
document.addEventListener('pointerdown', (event) => {
  if (!menu.hidden && !menu.contains(event.target) && !menuTrigger?.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) {
    event.preventDefault();
    closeMenu(true);
  }
});
window.addEventListener('resize', () => closeMenu());
window.addEventListener('scroll', () => closeMenu(), { passive: true });
document.getElementById('close-form').addEventListener('click', closeEditor);
document.getElementById('cancel-form').addEventListener('click', closeEditor);
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeEditor(); });
form.addEventListener('input', () => { dirty = true; });
form.addEventListener('change', () => { dirty = true; });
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) {
    setFormStatus('Selecciona únicamente imágenes JPG, JPEG o PNG válidas.');
    imageInput.value = '';
    return;
  }
  releaseImages();
  const objectUrl = URL.createObjectURL(file);
  images = [{ file, objectUrl, src: objectUrl }];
  imageInput.value = '';
  setFormStatus('');
  renderImages();
});
form.addEventListener('submit', saveWork);
initializePageTransitions();
initialize();
