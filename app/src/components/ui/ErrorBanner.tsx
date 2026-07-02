import { AlertTriangle } from 'lucide-react';

// The standard inline error strip.
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-line bg-faint p-3 text-xs">
      <span className="inline-flex items-center gap-2">
        <AlertTriangle size={14} strokeWidth={1.5} />
        {message}
      </span>
    </div>
  );
}
