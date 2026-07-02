import { useCallback, useEffect, useRef, useState } from 'react';

const COPY_FLASH_MS = 1200;

// Shared copy-with-flash behaviour: `copy(text)` writes to the clipboard and
// `copied` flips true for a short beat so buttons can show "Copied".
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPY_FLASH_MS);
  }, []);

  return { copied, copy };
}
