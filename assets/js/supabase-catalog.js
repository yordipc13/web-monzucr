import { supabase } from '../../Supabase/supabaseClient.js';

const bucket = supabase.storage.from('monzu-artwork-images');
const artworkFields = 'id,name,description,created_at,category_id,category:monzu_categories(name),images:monzu_images(id,position,storage_path,width,height,alt)';

function hydrateWorks(rows) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    category: row.category?.name || null,
    createdAt: row.created_at,
    images: [...row.images].sort((a, b) => a.position - b.position).map((image) => {
      return {
        id: image.id,
        storagePath: image.storage_path,
        width: image.width,
        height: image.height,
        alt: image.alt,
      };
    }),
  }));
}

export async function downloadImage(path) {
  const { data, error } = await bucket.download(path);
  if (error) throw error;
  return data;
}

export function getPublicImageUrl(path) {
  const { data } = bucket.getPublicUrl(path);
  return data.publicUrl;
}

export async function getCategories() {
  const { data, error } = await supabase.from('monzu_categories').select('id,name').order('name');
  if (error) throw error;
  return data;
}

export async function getHomeWorks() {
  const { data, error } = await supabase.from('monzu_artworks')
    .select(artworkFields)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  return hydrateWorks(data).filter((work) => work.images.length);
}

export async function getArtworkById(id) {
  const { data, error } = await supabase.from('monzu_artworks')
    .select(artworkFields)
    .eq('id', id)
    .eq('status', 'published')
    .single();
  if (error) throw error;
  return (await hydrateWorks([data]))[0];
}

export async function getGalleryPage({ offset, limit, categoryId }) {
  let query = supabase.from('monzu_artworks')
    .select(artworkFields)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) throw error;
  const pageRows = data.slice(0, limit);
  const works = await hydrateWorks(pageRows);
  return {
    items: works.flatMap((work) => {
      if (!work.images.length) throw new Error(`La obra ${work.name} no tiene imágenes.`);
      return work.images.map((photo, photoIndex) => ({ work, photo, photoIndex }));
    }),
    hasMore: data.length > limit,
    nextOffset: offset + pageRows.length,
  };
}
