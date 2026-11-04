const loginPanel = document.getElementById('login-panel');
const loginForm = document.getElementById('login-form');
const workspace = document.getElementById('workspace');
const globalStatus = document.getElementById('global-status');
const signOutButton = document.getElementById('sign-out');
const dialog = document.getElementById('art-dialog');
const form = document.getElementById('art-form');
const formStatus = document.getElementById('form-status');
const imageList = document.getElementById('image-list');
const imageInput = document.getElementById('image-files');
let supabase;
let categories = [];
let works = [];
let editingId = null;
let images = [];
let originalImages = [];
let dirty = false;
let saving = false;
let deleting = false;

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
    image.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    image.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
    image.src = url;
  } catch (error) {
    setGlobalStatus(`No se pudo cargar la portada de ${work.name}: ${message(error)}`, error);
  }
}

async function authorize() {
  const allowed = requireSuccess(await supabase.rpc('monzu_is_admin'));
  if (!allowed) {
    loginPanel.hidden = true;
    workspace.hidden = true;
    signOutButton.hidden = false;
    setGlobalStatus('Esta cuenta no tiene permisos de administración. Cierra sesión para usar otra cuenta.');
    return;
  }
  loginPanel.hidden = true;
  signOutButton.hidden = false;
  await loadCatalog();
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
  setGlobalStatus(categories.length ? '' : 'Las categorías aún no están configuradas; puedes guardar borradores.');
}

function renderCatalog() {
  const term = document.getElementById('search').value.trim().toLocaleLowerCase('es');
  const filtered = works.filter((work) =>
    `${work.name} ${work.category?.name || ''}`.toLocaleLowerCase('es').includes(term));
  const rows = document.getElementById('catalog-rows');
  rows.replaceChildren();
  for (const work of filtered) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'work-name';
    nameCell.textContent = work.name;
    const categoryCell = document.createElement('td');
    categoryCell.textContent = work.category?.name || 'Sin categoría';
    const imageCell = document.createElement('td');
    const imageSummary = document.createElement('div');
    imageSummary.className = 'image-summary';
    if (work.images.length) {
      const cover = document.createElement('img');
      cover.alt = '';
      cover.addEventListener('error', () => setGlobalStatus(`No se pudo cargar la portada de ${work.name}.`), { once: true });
      imageSummary.append(cover);
      loadCover(cover, work);
    }
    imageSummary.append(document.createTextNode(`${work.images.length} ${work.images.length === 1 ? 'imagen' : 'imágenes'}`));
    imageCell.append(imageSummary);
    const stateCell = document.createElement('td');
    const state = document.createElement('span');
    state.className = `state${work.status === 'draft' ? ' draft' : ''}`;
    state.textContent = work.status === 'draft' ? 'Borrador' : 'Publicada';
    stateCell.append(state);
    const actions = document.createElement('td');
    const actionWrap = document.createElement('div');
    actionWrap.className = 'row-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Editar';
    edit.setAttribute('aria-label', `Editar ${work.name}`);
    edit.addEventListener('click', () => openEditor(work));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Eliminar';
    remove.setAttribute('aria-label', `Eliminar ${work.name}`);
    remove.addEventListener('click', () => deleteWork(work));
    actionWrap.append(edit, remove);
    actions.append(actionWrap);
    row.append(nameCell, categoryCell, imageCell, stateCell, actions);
    rows.append(row);
  }
  document.getElementById('catalog-count').textContent = `${works.length} ${works.length === 1 ? 'obra' : 'obras'}`;
  const empty = document.getElementById('catalog-empty');
  empty.hidden = filtered.length !== 0;
  empty.textContent = term ? 'No hay obras que coincidan con la búsqueda.' : 'Todavía no hay obras en el catálogo.';
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
    form.elements.published.checked = work?.status === 'published';
    form.elements.featured1.checked = Boolean(work?.featured.some((item) => item.slot === 1));
    form.elements.featured2.checked = Boolean(work?.featured.some((item) => item.slot === 2));
    const categorySelect = form.elements.category;
    categorySelect.replaceChildren(new Option('Sin categoría', ''));
    categories.forEach((category) => categorySelect.add(new Option(category.name, category.id)));
    categorySelect.value = work?.category_id || '';
    categorySelect.disabled = categories.length === 0;
    document.getElementById('category-help').textContent = categories.length
      ? 'La categoría es obligatoria para publicar.'
      : 'Las categorías están pendientes de configuración. Puedes guardar esta obra como borrador.';
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
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    const addAction = (label, text, disabled, callback) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.setAttribute('aria-label', `${label} imagen ${index + 1}`);
      button.disabled = disabled;
      button.addEventListener('click', callback);
      actions.append(button);
    };
    addAction('Subir', '↑', index === 0, () => {
      [images[index - 1], images[index]] = [images[index], images[index - 1]];
      dirty = true;
      renderImages();
    });
    addAction('Bajar', '↓', index === images.length - 1, () => {
      [images[index + 1], images[index]] = [images[index], images[index + 1]];
      dirty = true;
      renderImages();
    });
    addAction('Retirar', '×', false, () => {
      if (image.objectUrl) URL.revokeObjectURL(image.objectUrl);
      images.splice(index, 1);
      dirty = true;
      renderImages();
    });
    row.append(preview, info, actions);
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

async function updateFeatured(workId) {
  for (const slot of [1, 2]) {
    const entries = requireSuccess(await supabase.from('monzu_featured').select('artwork_id,position').eq('slot', slot));
    const selected = form.elements[`featured${slot}`].checked;
    const exists = entries.some((entry) => entry.artwork_id === workId);
    if (selected && !exists) {
      const position = entries.reduce((max, entry) => Math.max(max, entry.position), -1) + 1;
      requireSuccess(await supabase.from('monzu_featured').insert({ slot, artwork_id: workId, position }));
    } else if (!selected && exists) {
      requireSuccess(await supabase.from('monzu_featured').delete().eq('slot', slot).eq('artwork_id', workId));
    }
  }
}

async function saveWork(event) {
  event.preventDefault();
  if (saving) return;
  const name = form.elements.name.value.trim();
  const categoryId = form.elements.category.value || null;
  const publish = form.elements.published.checked;
  if (!name) return setFormStatus('Escribe el nombre de la obra.');
  if (publish && (!categoryId || !images.length)) return setFormStatus('Para publicar, elige una categoría y añade al menos una imagen.');
  if ((form.elements.featured1.checked || form.elements.featured2.checked) && images.length < 2) {
    return setFormStatus('Una obra destacada debe tener al menos dos imágenes.');
  }
  saving = true;
  const controls = Array.from(form.querySelectorAll('input, select, textarea, button'), (control) => ({
    control, disabled: control.disabled,
  }));
  controls.forEach(({ control }) => { control.disabled = true; });
  setFormStatus('Guardando obra…');
  let workId = editingId;
  try {
    const payload = { name, category_id: categoryId, description: form.elements.description.value.trim(), status: 'draft' };
    if (workId) {
      requireSuccess(await supabase.from('monzu_artworks').update(payload).eq('id', workId).select('id').single());
    } else {
      const created = requireSuccess(await supabase.from('monzu_artworks').insert(payload).select('id').single());
      workId = created.id;
      editingId = workId;
    }

    const removed = originalImages.filter((image) => !images.some((item) => item.id === image.id));
    if (removed.length) {
      requireSuccess(await getBucket().remove(removed.map((image) => image.storage_path)));
      requireSuccess(await supabase.from('monzu_images').delete().in('id', removed.map((image) => image.id)).eq('artwork_id', workId));
      originalImages = originalImages.filter((image) => !removed.some((item) => item.id === image.id));
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
      position += 1;
    }
    if (images.length) {
      requireSuccess(await supabase.rpc('monzu_reorder_images', { p_artwork_id: workId, p_image_ids: images.map((image) => image.id) }));
    }
    await updateFeatured(workId);
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
    const draftNote = workId ? ' La obra puede haber quedado como borrador; revisa sus imágenes antes de volver a publicar.' : '';
    setFormStatus(`No se pudo completar el guardado: ${message(error)}.${draftNote}`, error);
  } finally {
    saving = false;
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
    ({ supabase } = await import('../../Supabase Connection/supabaseClient.js'));
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) await authorize();
    else {
      loginPanel.hidden = false;
      setGlobalStatus('');
    }
  } catch (error) {
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
    await authorize();
  } catch (error) {
    setGlobalStatus(`No se pudo iniciar sesión o comprobar los permisos: ${message(error)}`, error);
  } finally {
    button.disabled = false;
  }
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
document.getElementById('close-form').addEventListener('click', closeEditor);
document.getElementById('cancel-form').addEventListener('click', closeEditor);
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeEditor(); });
form.addEventListener('input', () => { dirty = true; });
form.addEventListener('change', () => { dirty = true; });
imageInput.addEventListener('change', () => {
  const files = Array.from(imageInput.files);
  if (files.some((file) => !['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name))) {
    setFormStatus('Selecciona únicamente imágenes JPG, JPEG o PNG válidas.');
    imageInput.value = '';
    return;
  }
  files.forEach((file) => {
    const objectUrl = URL.createObjectURL(file);
    images.push({ file, objectUrl, src: objectUrl });
  });
  imageInput.value = '';
  setFormStatus('');
  renderImages();
});
form.addEventListener('submit', saveWork);
initialize();
