export const OPENMVG_SENSOR_URL =
  'https://raw.githubusercontent.com/openMVG/CameraSensorSizeDatabase/master/sensor_database.csv';
export const EMBERLIGHT_TREE_URL =
  'https://api.github.com/repos/EmberLightVFX/Camera-Sensor-Database/git/trees/main?recursive=1';

export async function fetchSensorSourceSummaries() {
  const [openMvg, emberLight] = await Promise.allSettled([
    fetchTextSource('openmvg-camera-sensor-size-database', OPENMVG_SENSOR_URL, 'MIT'),
    fetchEmberLightTree(),
  ]);

  return [openMvg, emberLight].map((result) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          id: 'unknown-sensor-source',
          status: 'unavailable',
          error: result.reason?.message ?? String(result.reason),
        },
  );
}

async function fetchTextSource(id, url, license) {
  const res = await fetch(url, { headers: { accept: 'text/plain,text/csv' } });
  if (!res.ok) throw new Error(`${id} fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  return {
    id,
    url,
    license,
    status: 'available',
    fetchedAt: new Date().toISOString(),
    records: Math.max(0, text.trim().split(/\r?\n/).length - 1),
    fields: ['maker', 'model', 'sensorWidth'],
    role: 'sensor-size-supplement-candidate',
  };
}

async function fetchEmberLightTree() {
  const res = await fetch(EMBERLIGHT_TREE_URL, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'compareblur-catalog-sync',
    },
  });
  if (!res.ok) throw new Error(`emberlight tree fetch failed: ${res.status} ${res.statusText}`);
  const tree = await res.json();
  const dataFiles = (tree.tree ?? []).filter((item) => item.path?.startsWith('data/') && /\.(json|csv|ya?ml)$/i.test(item.path));
  return {
    id: 'emberlight-camera-sensor-database',
    url: 'https://github.com/EmberLightVFX/Camera-Sensor-Database/tree/main/data',
    license: 'MIT',
    status: 'available',
    fetchedAt: new Date().toISOString(),
    records: dataFiles.length,
    fields: ['maker', 'model', 'sensor dimensions'],
    role: 'sensor-size-supplement-candidate',
  };
}
