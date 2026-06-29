export const LENSDB_URL = 'https://raw.githubusercontent.com/Luminoid/lens-db/main/data/lenses.json';

export async function fetchLensDb() {
  const res = await fetch(LENSDB_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`LensDB fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return {
    source: 'lens-db',
    url: LENSDB_URL,
    fetchedAt: new Date().toISOString(),
    text,
    records: JSON.parse(text),
  };
}
