import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AlertTriangle, Plus, RefreshCw, Tags } from 'lucide-react';
import { Button } from '../ui/Button';
import { adminTokenParams } from '../../auth/config';
import {
  archiveAdminGalleryTag,
  createAdminGalleryTag,
  listAdminGalleryTags,
  updateAdminGalleryTag,
  type GalleryTag,
} from '../../lib/galleryApi';

function formatDate(value?: string | null): string {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Self-contained gallery tag CRUD. Loads its own data via the admin API and
// owns its token, so it can be dropped anywhere (here: Settings → Tags).
export function GalleryTagsManager() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [tags, setTags] = useState<GalleryTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const getToken = async () =>
    isAuthenticated ? getAccessTokenSilently({ authorizationParams: adminTokenParams }) : undefined;

  const loadTags = async () => {
    setLoading(true);
    setError(null);
    try {
      setTags(await listAdminGalleryTags(await getToken()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gallery tags API failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const create = async () => {
    if (!draft.trim()) return;
    setBusy('new');
    try {
      await createAdminGalleryTag(draft, await getToken());
      setDraft('');
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tag');
    } finally {
      setBusy(null);
    }
  };

  const update = async (slug: string, updates: Partial<Pick<GalleryTag, 'label' | 'archived'>>) => {
    setBusy(slug);
    try {
      await updateAdminGalleryTag(slug, updates, await getToken());
      setEdits((current) => {
        const copy = { ...current };
        delete copy[slug];
        return copy;
      });
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tag');
    } finally {
      setBusy(null);
    }
  };

  const archive = async (slug: string) => {
    setBusy(slug);
    try {
      await archiveAdminGalleryTag(slug, await getToken());
      await loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive tag');
    } finally {
      setBusy(null);
    }
  };

  const filtered = tags.filter((tag) => {
    const needle = query.trim().toLowerCase();
    return !needle || tag.label.includes(needle) || tag.slug.includes(needle);
  });

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Tags size={16} strokeWidth={1.5} />
        <h3 className="text-sm font-bold tracking-tight">Gallery tags</h3>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="min-w-0 flex-1">
            <span className="label mb-2 block">Search tags</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="portrait, film, large format"
              className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="label mb-2 block">Add tag</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void create();
              }}
              placeholder="new tag"
              className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
            />
          </label>
          <Button onClick={create} disabled={!draft.trim() || busy === 'new'} className="h-9 shrink-0">
            <Plus size={14} strokeWidth={1.5} />
            Add tag
          </Button>
          <Button onClick={loadTags} disabled={loading} className="h-9 shrink-0">
            <RefreshCw size={14} strokeWidth={1.5} />
            Reload tags
          </Button>
        </div>

        {error && (
          <div className="border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {error}
            </span>
          </div>
        )}

        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[42rem] text-left text-xs">
            <thead className="border-b border-line bg-faint text-muted">
              <tr>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Label</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Slug</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">State</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Updated</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((tag) => {
                const edit = edits[tag.slug] ?? tag.label;
                return (
                  <tr key={tag.slug}>
                    <td className="px-3 py-2">
                      <input
                        value={edit}
                        onChange={(event) => setEdits((current) => ({ ...current, [tag.slug]: event.target.value }))}
                        className="w-full border border-line bg-transparent px-2 py-1.5 outline-none focus:border-line-strong"
                      />
                    </td>
                    <td className="px-3 py-2 text-muted">{tag.slug}</td>
                    <td className="px-3 py-2">{tag.archived ? 'Archived' : 'Active'}</td>
                    <td className="px-3 py-2">{formatDate(tag.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => update(tag.slug, { label: edit })}
                          disabled={busy === tag.slug || !edit.trim() || edit === tag.label}
                        >
                          Save
                        </Button>
                        {tag.archived ? (
                          <Button onClick={() => update(tag.slug, { archived: false })} disabled={busy === tag.slug}>
                            Restore
                          </Button>
                        ) : (
                          <Button onClick={() => archive(tag.slug)} disabled={busy === tag.slug}>
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    {loading ? 'Loading tags…' : 'No tags match this search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
