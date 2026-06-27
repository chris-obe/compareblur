import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  busy?: boolean;
}

// Full-width, vertically narrow drop band that sits between the filters and grid.
export function UploadBox({ onFile, busy }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  };

  return (
    <div className="px-6 pt-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          'flex w-full items-center justify-center gap-3 border border-dashed px-4 py-4 text-xs uppercase tracking-wide transition-colors',
          drag ? 'border-line-strong bg-faint' : 'border-line hover:border-line-strong',
        ].join(' ')}
      >
        <Upload size={15} strokeWidth={1.5} className="text-muted" />
        {busy ? 'Reading EXIF…' : 'Drop an image to match its look — or click to upload'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
