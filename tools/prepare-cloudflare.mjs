import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoWorks } from '../assets/js/catalog.js';
import { siteConfig } from '../assets/js/site-config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputParent = path.resolve(process.argv[2] || path.join(root, '.cloudflare-build'));
const files = [
  ['index.html', 'index.html'],
  ['galeria.html', 'galeria.html'],
  ['obra.html', 'obra.html'],
  [path.join('assets', 'css', 'index.css'), path.join('assets', 'css', 'index.css')],
  ...['catalog.js', 'gallery-navigation.js', 'gallery.js', 'index.js', 'obra.js', 'site-config.js', 'site.js', 'supabase-catalog.js']
    .map((name) => [path.join('assets', 'js', name), path.join('assets', 'js', name)]),
  ...[
    path.join('administracion', 'admin.html'),
    path.join('administracion', 'admin.css'),
    path.join('administracion', 'admin.js'),
    path.join('Supabase', 'supabaseClient.js'),
  ].map((file) => [file, file]),
  ...(siteConfig.catalogSource === 'demo'
    ? demoWorks.flatMap((work) => work.images.map((image) => {
      const source = path.relative(root, fileURLToPath(image.src));
      return [source, source];
    }))
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
  for (const [sourcePath, destinationPath] of files) {
    const source = path.resolve(root, sourcePath);
    const sourceReal = await realpath(source);
    if (!sourceReal.startsWith(`${rootReal}${path.sep}`)) {
      throw new Error(`El archivo está fuera del proyecto: ${sourcePath}`);
    }
    if (!(await lstat(source)).isFile()) throw new Error(`No es un archivo normal: ${sourcePath}`);
    const destination = path.join(publicDir, destinationPath);
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
