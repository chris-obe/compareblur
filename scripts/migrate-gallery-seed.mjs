import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const outDir = '.context/gallery-seed';
const bucket = process.env.GALLERY_BUCKET_NAME ?? 'compareblur-gallery';
const database = process.env.GALLERY_DB_NAME ?? 'compareblur-gallery';

const img = (seed, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const seed = [
  {
    id: 'g1',
    title: 'Window Light',
    author: 'A. Lindqvist',
    src: img('hmb-portrait-1', 800, 1000),
    formatId: 'ff',
    camera: 'Sony A7 IV',
    lens: '85mm f/1.4',
    focal: 85,
    aperture: 1.4,
    tags: ['portrait', 'bokeh', 'indoor'],
  },
  {
    id: 'g2',
    title: 'Crossing',
    author: 'M. Berg',
    src: img('hmb-street-1', 800, 800),
    formatId: 'apsc',
    camera: 'Fujifilm X-T5',
    lens: '23mm f/2',
    focal: 23,
    aperture: 2,
    tags: ['street', 'urban'],
  },
  {
    id: 'g3',
    title: 'Coastal Sweep',
    author: 'J. Holm',
    src: img('hmb-pano-1', 1200, 480),
    formatId: 'xpan',
    camera: 'Hasselblad XPan',
    lens: '90mm f/4',
    focal: 90,
    aperture: 4,
    tags: ['panorama', 'landscape', 'film'],
  },
  {
    id: 'g4',
    title: 'Studio Still',
    author: 'C. Obe',
    src: img('hmb-mf-1', 900, 1100),
    formatId: 'gfx',
    camera: 'Fujifilm GFX 100',
    lens: '110mm f/2',
    focal: 110,
    aperture: 2,
    tags: ['portrait', 'studio', 'bokeh'],
  },
  {
    id: 'g5',
    title: 'Morning Run',
    author: 'S. Falk',
    src: img('hmb-mft-1', 800, 800),
    formatId: 'mft',
    camera: 'OM-1',
    lens: '45mm f/1.8',
    focal: 45,
    aperture: 1.8,
    tags: ['sport', 'outdoor'],
  },
  {
    id: 'g6',
    title: 'Dunes',
    author: 'L. Noren',
    src: img('hmb-617-1', 1400, 460),
    formatId: 'film-617',
    camera: 'Fuji GX617',
    lens: '105mm f/8',
    focal: 105,
    aperture: 8,
    tags: ['panorama', 'landscape', 'film'],
  },
  {
    id: 'g7',
    title: 'Quiet Table',
    author: 'A. Lindqvist',
    src: img('hmb-still-1', 800, 800),
    formatId: 'ff',
    camera: 'Nikon Z6',
    lens: '50mm f/1.8',
    focal: 50,
    aperture: 1.8,
    tags: ['still life', 'minimal'],
  },
  {
    id: 'g8',
    title: 'Rooftops',
    author: 'M. Berg',
    src: img('hmb-street-2', 800, 1000),
    formatId: 'film-67',
    camera: 'Pentax 67',
    lens: '105mm f/2.4',
    focal: 105,
    aperture: 2.4,
    tags: ['film', 'landscape', 'bokeh'],
  },
  {
    id: 'g9',
    title: 'Backlit',
    author: 'J. Holm',
    src: img('hmb-portrait-2', 800, 1000),
    formatId: 'ff',
    camera: 'Canon R5',
    lens: '135mm f/1.8',
    focal: 135,
    aperture: 1.8,
    tags: ['portrait', 'bokeh', 'outdoor'],
  },
  {
    id: 'g10',
    title: 'Market',
    author: 'S. Falk',
    src: img('hmb-street-3', 800, 800),
    formatId: 'apsc',
    camera: 'Fujifilm X100VI',
    lens: '23mm f/2',
    focal: 23,
    aperture: 2,
    tags: ['street', 'urban', 'travel'],
  },
  {
    id: 'g11',
    title: 'Cold Field',
    author: 'L. Noren',
    src: img('hmb-land-1', 900, 700),
    formatId: 'film-45',
    camera: 'Sinar 4x5',
    lens: '150mm f/5.6',
    focal: 150,
    aperture: 5.6,
    tags: ['landscape', 'film', 'large format'],
  },
  {
    id: 'g12',
    title: 'Glass',
    author: 'C. Obe',
    src: img('hmb-min-1', 800, 800),
    formatId: 'ff',
    camera: 'Sony A7 IV',
    lens: '90mm f/2.8 Macro',
    focal: 90,
    aperture: 2.8,
    tags: ['macro', 'minimal', 'still life'],
  },
];

await mkdir(outDir, { recursive: true });

const now = new Date().toISOString();
const values = [];

for (const item of seed) {
  const objectKey = `photos/${item.id}/original.jpg`;
  const filePath = join(outDir, `${item.id}.jpg`);

  if (!existsSync(filePath)) {
    const response = await fetch(item.src, { headers: { 'user-agent': 'compareblur-gallery-migration' } });
    if (!response.ok) throw new Error(`Failed to fetch ${item.src}: ${response.status}`);
    await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  }

  await exec('npm', [
    'exec',
    'wrangler',
    '--',
    'r2',
    'object',
    'delete',
    `${bucket}/${objectKey}`,
    '--remote',
  ]).catch(() => undefined);

  await exec('npm', [
    'exec',
    'wrangler',
    '--',
    'r2',
    'object',
    'put',
    `${bucket}/${objectKey}`,
    '--remote',
    '--file',
    filePath,
  ]);

  values.push(
    `(${[
      sql(item.id),
      sql(item.title),
      sql(item.author),
      sql('approved'),
      sql(objectKey),
      sql('image/jpeg'),
      'NULL',
      'NULL',
      sql(item.formatId),
      sql(item.camera),
      sql(item.lens),
      item.focal,
      item.aperture,
      sql(JSON.stringify(item.tags)),
      sql('seed'),
      sql('Migrated from gallery.seed.ts'),
      sql(now),
      sql(now),
      sql(now),
    ].join(', ')})`,
  );

  console.log(`Uploaded ${item.id} -> ${objectKey}`);
}

const sqlText = `
INSERT INTO gallery_photos (
  id, title, author, status, object_key, content_type, width, height,
  format_id, camera, lens, focal, aperture, tags_json, submitted_by,
  notes, created_at, updated_at, published_at
) VALUES
${values.join(',\n')}
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  author = excluded.author,
  status = excluded.status,
  object_key = excluded.object_key,
  content_type = excluded.content_type,
  format_id = excluded.format_id,
  camera = excluded.camera,
  lens = excluded.lens,
  focal = excluded.focal,
  aperture = excluded.aperture,
  tags_json = excluded.tags_json,
  updated_at = excluded.updated_at,
  published_at = excluded.published_at;
`;

const seedSqlPath = join(outDir, 'seed.sql');
await writeFile(seedSqlPath, sqlText);
await exec('npm', ['exec', 'wrangler', '--', 'd1', 'execute', database, '--remote', '--file', seedSqlPath]);
console.log(`Seeded ${seed.length} gallery photos into ${database}.`);

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
