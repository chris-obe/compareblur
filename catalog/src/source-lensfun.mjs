export const LENSFUN_TREE_URL = 'https://api.github.com/repos/lensfun/lensfun/git/trees/master?recursive=1';
export const LENSFUN_RAW_BASE = 'https://raw.githubusercontent.com/lensfun/lensfun/master';

export async function fetchLensfun() {
  const treeRes = await fetch(LENSFUN_TREE_URL, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'compareblur-catalog-sync',
    },
  });
  if (!treeRes.ok) throw new Error(`Lensfun tree fetch failed: ${treeRes.status} ${treeRes.statusText}`);
  const treeText = await treeRes.text();
  const tree = JSON.parse(treeText);
  const files = (tree.tree ?? [])
    .filter((item) => item.path?.startsWith('data/db/') && item.path.endsWith('.xml'))
    .map((item) => item.path)
    .sort();

  const xmlFiles = await Promise.all(
    files.map(async (path) => {
      const url = `${LENSFUN_RAW_BASE}/${path}`;
      const res = await fetch(url, { headers: { accept: 'application/xml,text/xml' } });
      if (!res.ok) throw new Error(`Lensfun file fetch failed (${path}): ${res.status} ${res.statusText}`);
      return { path, url, text: await res.text() };
    }),
  );

  const records = xmlFiles.flatMap(parseLensfunFile);
  return {
    source: 'lensfun',
    url: 'https://github.com/lensfun/lensfun/tree/master/data/db',
    fetchedAt: new Date().toISOString(),
    text: JSON.stringify({ tree: JSON.parse(treeText), files: xmlFiles.map(({ path, text }) => ({ path, text })) }),
    files: xmlFiles,
    records,
  };
}

function parseLensfunFile(file) {
  return [
    ...blocks(file.text, 'mount').map((xml) => ({ kind: 'mount', file: file.path, ...parseCommon(xml) })),
    ...blocks(file.text, 'camera').map((xml) => ({ kind: 'camera', file: file.path, ...parseCommon(xml) })),
    ...blocks(file.text, 'lens').map((xml) => ({ kind: 'lens', file: file.path, ...parseCommon(xml) })),
  ];
}

function parseCommon(xml) {
  return {
    maker: tagText(xml, 'maker', 'en') ?? tagText(xml, 'maker'),
    model: tagText(xml, 'model', 'en') ?? tagText(xml, 'model'),
    mount: tagText(xml, 'mount') ?? tagText(xml, 'name'),
    cropfactor: Number(tagText(xml, 'cropfactor')),
  };
}

function blocks(text, tag) {
  return [...text.matchAll(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g'))].map((match) => match[0]);
}

function tagText(xml, tag, lang) {
  const attr = lang ? `\\s+lang=["']${lang}["']` : '(?:\\s+[^>]*)?';
  const match = xml.match(new RegExp(`<${tag}${attr}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : null;
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
