// Group catalog items by maker, preserving first-seen order, for <optgroup>s.
export function groupByMaker<T extends { maker: string }>(items: T[]): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const arr = m.get(it.maker);
    if (arr) arr.push(it);
    else m.set(it.maker, [it]);
  }
  return [...m.entries()];
}
