export function sourceRef({
  id,
  recordId,
  url,
  license,
  fetchedAt,
  confidence = 1,
  fields,
}) {
  return compactObject({
    id,
    recordId,
    url,
    license,
    fetchedAt,
    confidence,
    fields,
  });
}

export function externalProvenance(source) {
  return {
    source: source.id,
    sourceType: 'external',
    sources: [source],
  };
}

export function curatedProvenance(recordId, reason, fields) {
  return {
    source: 'curated-gear',
    sourceType: 'curated',
    curatedReason: reason,
    sources: [
      sourceRef({
        id: 'curated-gear',
        recordId,
        license: 'Project curated data',
        confidence: 0.6,
        fields,
      }),
    ],
  };
}

export function derivedProvenance(primary, derivedFrom, source = primary.id) {
  return {
    source,
    sourceType: 'derived',
    derivedFrom: derivedFrom.map((item) => item.id),
    sources: mergeSources([primary, ...derivedFrom]),
  };
}

export function mergeProvenance(base, extra) {
  const sources = mergeSources([...(base.sources ?? []), ...(extra.sources ?? [])]);
  const sourceType = chooseSourceType(base.sourceType, extra.sourceType);
  const primary = sources.find((source) => source.id !== 'curated-gear') ?? sources[0];
  const derivedFrom =
    sourceType === 'derived'
      ? [...new Set([...(base.derivedFrom ?? []), ...(extra.derivedFrom ?? []), ...sources.map((source) => source.id)])]
      : [...new Set([...(base.derivedFrom ?? []), ...(extra.derivedFrom ?? [])])];
  return compactObject({
    source: primary?.id ?? base.source ?? extra.source,
    sourceType,
    sources,
    curatedReason: sourceType === 'curated' ? (base.curatedReason ?? extra.curatedReason) : undefined,
    derivedFrom,
  });
}

export function mergeSources(sources) {
  const map = new Map();
  for (const source of sources.filter(Boolean)) {
    const key = `${source.id}:${source.recordId ?? ''}`;
    map.set(key, { ...(map.get(key) ?? {}), ...source });
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id) || String(a.recordId ?? '').localeCompare(String(b.recordId ?? '')));
}

function chooseSourceType(a, b) {
  if (a === 'derived' || b === 'derived') return 'derived';
  if (a === 'external' && b === 'external') return 'external';
  if (a === 'external' || b === 'external') return 'derived';
  return a ?? b ?? 'curated';
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item != null && (!Array.isArray(item) || item.length > 0)),
  );
}
