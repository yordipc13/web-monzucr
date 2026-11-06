import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoWorks } from '../catalog.js';
import { siteConfig } from '../site-config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputParent = path.resolve(process.argv[2] || path.join(root, '.cloudflare-build'));
const files = [
  'index.html', 'index.css', 'index.js', 'galeria.html', 'gallery.js', 'gallery-page.js',
  'obra.html', 'obra.js', 'gallery-navigation.js',
  'catalog.js', 'site.js', 'site-config.js', 'supabase-catalog.js',
  path.join('administracion', 'admin.html'),
  path.join('administracion', 'admin.css'),
  path.join('administracion', 'admin.js'),
  path.join('Supabase Connection', 'supabaseClient.js'),
  ...(siteConfig.catalogSource === 'demo'
    ? demoWorks.flatMap((work) => work.images.map((image) => path.relative(root, fileURLToPath(image.src))))
    : []),
];

try {
  await mkdir(outputParent, { recursive: true });
  const parentInfo = await lstat(outputParent);
  if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    throw new Error('El directorio de salida debe ser una carpeta real, no un enlace simbólico.');
  }
  const rootReal = await realpath(root);
  const output = await mkdtemp(path.join(outputParent, 'site-'));
  const publicDir = path.join(output, 'public');
  await mkdir(publicDir);
  for (const relativePath of files) {
    const source = path.resolve(root, relativePath);
    const sourceReal = await realpath(source);
    if (!sourceReal.startsWith(`${rootReal}${path.sep}`)) {
      throw new Error(`El archivo está fuera del proyecto: ${relativePath}`);
    }
    if (!(await lstat(source)).isFile()) throw new Error(`No es un archivo normal: ${relativePath}`);
    const destination = path.join(publicDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
  const config = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  config.assets.directory = './public';
  const configPath = path.join(output, 'wrangler.jsonc');
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  console.log(`Se prepararon ${files.length} archivos estáticos en ${publicDir}`);
  console.log(`Para desplegar después de revisar el contenido: npx wrangler deploy --config "${configPath}"`);
} catch (error) {
  console.error('No se pudo preparar el contenido para Cloudflare:', error);
  process.exitCode = 1;
}
