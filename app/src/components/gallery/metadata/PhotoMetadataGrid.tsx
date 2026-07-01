import { useEffect, useMemo, useState } from 'react';
import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  drawTextCell,
  type CustomCell,
  type CustomRenderer,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type ProvideEditorComponent,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { ImagePlus } from 'lucide-react';
import { TagPicker, type TagOption } from '../../ui/TagPicker';
import { Button } from '../../ui/Button';
import { SUBJECT_DISTANCE_PRESETS } from '../../../lib/subjectDistance';
import {
  ALBUM_VISIBILITY_OPTIONS,
  GALLERY_STATUS_OPTIONS,
  applyMetadataCellValue,
  cameraOptions,
  formatOptions,
  lensOptionsForRow,
  type PhotoMetadataCatalog,
  type PhotoMetadataColumnKey,
  type PhotoMetadataContext,
  type PhotoMetadataOption,
  type PhotoMetadataRow,
} from './photoMetadataModel';

interface Props {
  rows: PhotoMetadataRow[];
  context: PhotoMetadataContext;
  catalog: PhotoMetadataCatalog;
  onRowsChange: (rows: PhotoMetadataRow[]) => void;
  tags?: TagOption[];
  onCreateTag?: (label: string) => Promise<TagOption>;
  selectedRowIds?: Set<string>;
  onSelectedRowIdsChange?: (ids: Set<string>) => void;
  readonlyColumns?: PhotoMetadataColumnKey[];
  minHeight?: number;
  maxHeight?: number;
}

interface MetadataColumn {
  key: PhotoMetadataColumnKey;
  title: string;
  width: number;
  grow?: number;
  editor: 'image' | 'text' | 'select' | 'catalog' | 'tags';
}

interface MetadataCellData {
  type: 'photo-metadata';
  field: PhotoMetadataColumnKey;
  rowId: string;
  editor: 'select' | 'catalog' | 'tags';
  value: string;
  selectedId?: string;
  display: string;
  tags?: string[];
}

type MetadataCustomCell = CustomCell<MetadataCellData>;

const BASE_COLUMNS: MetadataColumn[] = [
  { key: 'preview', title: '', width: 72, editor: 'image' },
  { key: 'title', title: 'Title', width: 180, grow: 1, editor: 'text' },
  { key: 'author', title: 'Author', width: 150, editor: 'text' },
  { key: 'camera', title: 'Camera', width: 220, grow: 1, editor: 'catalog' },
  { key: 'lens', title: 'Lens', width: 240, grow: 1, editor: 'catalog' },
  { key: 'formatId', title: 'Format', width: 142, editor: 'select' },
  { key: 'focal', title: 'Focal', width: 84, editor: 'text' },
  { key: 'aperture', title: 'Aperture', width: 92, editor: 'text' },
  { key: 'subjectPreset', title: 'Framing', width: 164, editor: 'select' },
  { key: 'shutterSpeed', title: 'Shutter', width: 108, editor: 'text' },
  { key: 'iso', title: 'ISO', width: 82, editor: 'text' },
  { key: 'capturedAt', title: 'Captured', width: 120, editor: 'text' },
  { key: 'tags', title: 'Tags', width: 190, editor: 'tags' },
  { key: 'albumVisibility', title: 'Album', width: 142, editor: 'select' },
  { key: 'galleryStatus', title: 'Gallery', width: 132, editor: 'select' },
  { key: 'notes', title: 'Notes', width: 220, grow: 1, editor: 'text' },
];

const COLUMNS_BY_CONTEXT: Record<PhotoMetadataContext, PhotoMetadataColumnKey[]> = {
  album: ['preview', 'title', 'camera', 'lens', 'formatId', 'focal', 'aperture', 'subjectPreset', 'shutterSpeed', 'iso', 'capturedAt', 'tags', 'albumVisibility', 'galleryStatus', 'notes'],
  'gallery-upload': ['preview', 'title', 'author', 'galleryStatus', 'camera', 'lens', 'formatId', 'focal', 'aperture', 'subjectPreset', 'shutterSpeed', 'iso', 'capturedAt', 'tags', 'notes'],
  'admin-edit': ['preview', 'title', 'author', 'galleryStatus', 'camera', 'lens', 'formatId', 'focal', 'aperture', 'subjectPreset', 'shutterSpeed', 'iso', 'capturedAt', 'tags', 'notes'],
};

const emptySelection = (): GridSelection => ({
  columns: CompactSelection.empty(),
  rows: CompactSelection.empty(),
});

export function PhotoMetadataGrid({
  rows,
  context,
  catalog,
  onRowsChange,
  tags = [],
  onCreateTag,
  selectedRowIds,
  onSelectedRowIdsChange,
  readonlyColumns = [],
  minHeight = 260,
  maxHeight = 620,
}: Props) {
  const readonly = useMemo(() => new Set<PhotoMetadataColumnKey>(['preview', ...readonlyColumns]), [readonlyColumns]);
  const columns = useMemo(() => columnsForContext(context), [context]);
  const gridColumns = useMemo<GridColumn[]>(
    () => columns.map((column) => ({ id: column.key, title: column.title, width: column.width, grow: column.grow })),
    [columns],
  );
  const rowIdKey = rows.map((row) => row.id).join('|');
  const selectedKey = selectedRowIds ? [...selectedRowIds].sort().join('|') : '';
  const [selection, setSelection] = useState<GridSelection>(emptySelection);

  useEffect(() => {
    if (!selectedRowIds) return;
    let nextRows = CompactSelection.empty();
    rows.forEach((row, index) => {
      if (selectedRowIds.has(row.id)) nextRows = nextRows.add(index);
    });
    setSelection((current) => ({ ...current, rows: nextRows }));
  }, [rowIdKey, selectedKey, rows, selectedRowIds]);

  const customRenderer = useMemo(
    () => createMetadataCellRenderer({
      rows,
      catalog,
      tags,
      onCreateTag,
    }),
    [rows, columns, catalog, tags, onCreateTag],
  );

  const getCellContent = (item: Item): GridCell => {
    const [col, rowIndex] = item;
    const row = rows[rowIndex];
    const column = columns[col];
    if (!row || !column) {
      return { kind: GridCellKind.Text, allowOverlay: false, readonly: true, data: '', displayData: '' };
    }
    if (column.key === 'preview') {
      if (!row.previewSrc) {
        return {
          kind: GridCellKind.Text,
          allowOverlay: false,
          readonly: true,
          data: row.previewLabel ?? row.title,
          displayData: row.previewLabel ? 'image' : '',
          contentAlign: 'center',
        };
      }
      return {
        kind: GridCellKind.Image,
        allowOverlay: false,
        readonly: true,
        data: [row.previewSrc],
        displayData: [row.previewLabel ?? row.title],
        rounding: 0,
      };
    }
    if (column.editor === 'select' || column.editor === 'catalog' || column.editor === 'tags') {
      return metadataCustomCell(row, column);
    }
    const value = stringValueForColumn(row, column.key);
    return {
      kind: GridCellKind.Text,
      allowOverlay: !readonly.has(column.key),
      readonly: readonly.has(column.key),
      data: value,
      displayData: value,
    };
  };

  const applyEdit = (currentRows: PhotoMetadataRow[], location: Item, value: EditableGridCell): PhotoMetadataRow[] => {
    const [col, rowIndex] = location;
    const column = columns[col];
    const current = currentRows[rowIndex];
    if (!column || !current || readonly.has(column.key)) return currentRows;
    const edit = valueFromEditedCell(value);
    const nextRow = applyMetadataCellValue(current, column.key, edit.value, catalog, edit.selectedId);
    return currentRows.map((row, index) => (index === rowIndex ? nextRow : row));
  };

  const onCellEdited = (location: Item, value: EditableGridCell) => {
    onRowsChange(applyEdit(rows, location, value));
  };

  const onCellsEdited = (edits: readonly { location: Item; value: EditableGridCell }[]) => {
    let next = rows;
    for (const edit of edits) next = applyEdit(next, edit.location, edit.value);
    onRowsChange(next);
    return true;
  };

  const height = Math.min(maxHeight, Math.max(minHeight, rows.length * 58 + 44));

  if (rows.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center border border-line bg-faint p-6 text-center text-xs text-muted">
        <ImagePlus size={18} strokeWidth={1.5} className="mb-3" />
        Add photos to edit their details in bulk.
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div>
          <div className="text-xs font-bold">Photo metadata</div>
          <div className="label mt-1">Spreadsheet edits are staged until the parent save or upload action runs</div>
        </div>
        <div className="label">{rows.length} row{rows.length === 1 ? '' : 's'}</div>
      </div>
      <DataEditor
        width="100%"
        height={height}
        rows={rows.length}
        columns={gridColumns}
        getCellContent={getCellContent}
        getCellsForSelection
        onCellEdited={onCellEdited}
        onCellsEdited={onCellsEdited}
        customRenderers={[customRenderer]}
        rowMarkers={{ kind: 'both', checkboxStyle: 'square', width: 42 }}
        rowSelect="multi"
        rangeSelect="multi-rect"
        fillHandle
        allowedFillDirections="orthogonal"
        freezeColumns={2}
        rowHeight={58}
        headerHeight={38}
        gridSelection={selection}
        onGridSelectionChange={(next) => {
          setSelection(next);
          if (!onSelectedRowIdsChange) return;
          onSelectedRowIdsChange(new Set(next.rows.toArray().map((index) => rows[index]?.id).filter((id): id is string => !!id)));
        }}
        smoothScrollX
        smoothScrollY
        theme={{
          accentColor: 'var(--fg)',
          accentFg: 'var(--bg)',
          bgCell: 'var(--surface)',
          bgCellMedium: 'var(--faint)',
          bgHeader: 'var(--faint)',
          bgHeaderHovered: 'var(--line)',
          bgHeaderHasFocus: 'var(--line)',
          textDark: 'var(--fg)',
          textMedium: 'var(--muted)',
          textHeader: 'var(--muted)',
          borderColor: 'var(--line)',
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          headerFontStyle: '10px Helvetica Neue, Helvetica, Arial, sans-serif',
          baseFontStyle: '12px Helvetica Neue, Helvetica, Arial, sans-serif',
        }}
      />
    </div>
  );
}

function columnsForContext(context: PhotoMetadataContext): MetadataColumn[] {
  const allowed = new Set(COLUMNS_BY_CONTEXT[context]);
  return BASE_COLUMNS.filter((column) => allowed.has(column.key));
}

function metadataCustomCell(row: PhotoMetadataRow, column: MetadataColumn): MetadataCustomCell {
  const display = displayValueForColumn(row, column.key);
  return {
    kind: GridCellKind.Custom,
    allowOverlay: true,
    readonly: false,
    copyData: column.key === 'tags' ? row.tags.join(', ') : stringValueForColumn(row, column.key),
    data: {
      type: 'photo-metadata',
      field: column.key,
      rowId: row.id,
      editor: column.editor as MetadataCellData['editor'],
      value: stringValueForColumn(row, column.key),
      selectedId: column.key === 'camera' ? row.cameraCatalogId : column.key === 'lens' ? row.lensCatalogId : undefined,
      display,
      tags: column.key === 'tags' ? row.tags : undefined,
    },
  };
}

function createMetadataCellRenderer({
  rows,
  catalog,
  tags,
  onCreateTag,
}: {
  rows: PhotoMetadataRow[];
  catalog: PhotoMetadataCatalog;
  tags: TagOption[];
  onCreateTag?: (label: string) => Promise<TagOption>;
}): CustomRenderer<MetadataCustomCell> {
  return {
    kind: GridCellKind.Custom,
    isMatch: (cell: CustomCell): cell is MetadataCustomCell => (cell.data as Partial<MetadataCellData> | undefined)?.type === 'photo-metadata',
    draw: (args, cell) => {
      drawTextCell(args, cell.data.display || '—', cell.contentAlign);
      if (cell.data.editor === 'select' || cell.data.editor === 'catalog') {
        const { ctx, rect, theme } = args;
        ctx.fillStyle = theme.textMedium;
        ctx.font = theme.baseFontStyle;
        ctx.fillText('v', rect.x + rect.width - 14, rect.y + Math.round(rect.height / 2) + 4);
      }
    },
    provideEditor: (cell) => {
      const row = rows.find((item) => item.id === cell.data.rowId);
      if (!row) return undefined;
      if (cell.data.editor === 'tags') {
        return tagEditor(tags, onCreateTag);
      }
      if (cell.data.editor === 'catalog') {
        const options = cell.data.field === 'camera' ? cameraOptions(catalog.cameras) : lensOptionsForRow(row, catalog);
        return catalogEditor(options);
      }
      return selectEditor(optionsForField(cell.data.field));
    },
    onPaste: (value, data) => ({
      ...data,
      value,
      selectedId: undefined,
      display: value,
      tags: data.field === 'tags' ? value.split(',').map((item) => item.trim()).filter(Boolean) : data.tags,
    }),
  };
}

function catalogEditor(options: PhotoMetadataOption[]): ProvideEditorComponent<MetadataCustomCell> {
  function CatalogEditor({ value, onFinishedEditing }: Parameters<ProvideEditorComponent<MetadataCustomCell>>[0]) {
    const [draft, setDraft] = useState(value.data.value);
    const filtered = useMemo(() => {
      const needle = draft.trim().toLowerCase();
      return options
        .filter((option) => !needle || `${option.maker ?? ''} ${option.label} ${option.detail ?? ''}`.toLowerCase().includes(needle))
        .slice(0, 80);
    }, [draft]);

    const finish = (nextValue = draft, selectedId?: string) => {
      onFinishedEditing({
        ...value,
        copyData: nextValue,
        data: {
          ...value.data,
          value: nextValue,
          display: nextValue || '—',
          selectedId,
        },
      });
    };

    return (
      <div className="w-80 border border-line bg-surface shadow-none">
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') finish();
            if (event.key === 'Escape') onFinishedEditing(undefined);
          }}
          className="h-9 w-full border-b border-line bg-transparent px-2 text-xs outline-none"
          placeholder="Search catalog or type free text"
        />
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => finish(option.label, option.value)}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-faint"
            >
              <span className="block truncate font-bold">{option.label}</span>
              <span className="label mt-1 block truncate">{[option.maker, option.detail].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <button type="button" onClick={() => finish()} className="block w-full px-3 py-3 text-left text-xs text-muted hover:bg-faint">
              Keep “{draft}” as manual text
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line p-2">
          <Button type="button" onClick={() => finish()}>
            Use text
          </Button>
        </div>
      </div>
    );
  }
  return CatalogEditor;
}

function selectEditor(options: PhotoMetadataOption[]): ProvideEditorComponent<MetadataCustomCell> {
  function SelectEditor({ value, onFinishedEditing }: Parameters<ProvideEditorComponent<MetadataCustomCell>>[0]) {
    return (
      <div className="w-56 border border-line bg-surface">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onFinishedEditing({
              ...value,
              copyData: option.value,
              data: {
                ...value.data,
                value: option.value,
                display: option.label,
                selectedId: option.value,
              },
            })}
            className={[
              'block w-full px-3 py-2 text-left text-xs hover:bg-faint',
              option.value === value.data.value ? 'font-bold' : '',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
  return SelectEditor;
}

function tagEditor(tags: TagOption[], onCreateTag?: (label: string) => Promise<TagOption>): ProvideEditorComponent<MetadataCustomCell> {
  function TagEditor({ value, onFinishedEditing }: Parameters<ProvideEditorComponent<MetadataCustomCell>>[0]) {
    const [selected, setSelected] = useState(value.data.tags ?? []);
    return (
      <div className="w-96 border border-line bg-surface p-3">
        <TagPicker tags={tags} value={selected} onChange={setSelected} onCreateTag={onCreateTag} />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" onClick={() => onFinishedEditing(undefined)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={() => onFinishedEditing({
              ...value,
              copyData: selected.join(', '),
              data: {
                ...value.data,
                value: selected.join(', '),
                display: selected.length ? selected.join(', ') : 'No tags',
                tags: selected,
              },
            })}
          >
            Apply
          </Button>
        </div>
      </div>
    );
  }
  return TagEditor;
}

function optionsForField(field: PhotoMetadataColumnKey): PhotoMetadataOption[] {
  if (field === 'formatId') return formatOptions();
  if (field === 'subjectPreset') return SUBJECT_DISTANCE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }));
  if (field === 'albumVisibility') return ALBUM_VISIBILITY_OPTIONS;
  if (field === 'galleryStatus') return GALLERY_STATUS_OPTIONS;
  return [];
}

function displayValueForColumn(row: PhotoMetadataRow, field: PhotoMetadataColumnKey): string {
  if (field === 'formatId') return optionsForField(field).find((option) => option.value === row.formatId)?.label ?? row.formatId;
  if (field === 'subjectPreset') return optionsForField(field).find((option) => option.value === row.subjectPreset)?.label ?? row.subjectPreset;
  if (field === 'albumVisibility') return optionsForField(field).find((option) => option.value === row.albumVisibility)?.label ?? row.albumVisibility ?? '';
  if (field === 'galleryStatus') return optionsForField(field).find((option) => option.value === row.galleryStatus)?.label ?? row.galleryStatus ?? '';
  if (field === 'tags') return row.tags.length ? row.tags.join(', ') : 'No tags';
  return stringValueForColumn(row, field);
}

function stringValueForColumn(row: PhotoMetadataRow, field: PhotoMetadataColumnKey): string {
  if (field === 'preview') return '';
  const value = row[field];
  if (Array.isArray(value)) return value.join(', ');
  return typeof value === 'string' ? value : '';
}

function valueFromEditedCell(cell: EditableGridCell): { value: string | string[]; selectedId?: string } {
  if (cell.kind === GridCellKind.Custom && (cell.data as Partial<MetadataCellData>).type === 'photo-metadata') {
    const data = cell.data as MetadataCellData;
    return { value: data.tags ?? data.value, selectedId: data.selectedId };
  }
  if (cell.kind === GridCellKind.Number) return { value: cell.data == null ? '' : String(cell.data) };
  if ('data' in cell) return { value: Array.isArray(cell.data) ? cell.data.join(', ') : String(cell.data ?? '') };
  return { value: '' };
}
