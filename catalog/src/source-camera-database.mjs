const CAMERA_DATABASE_URL =
  'https://raw.githubusercontent.com/leavestylecode/CameraDatabase/main/data/camera_data.json';

export async function fetchCameraDatabase() {
  const res = await fetch(CAMERA_DATABASE_URL, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CameraDatabase fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return {
    source: 'camera-database',
    url: CAMERA_DATABASE_URL,
    fetchedAt: new Date().toISOString(),
    text,
    records: JSON.parse(text),
  };
}
