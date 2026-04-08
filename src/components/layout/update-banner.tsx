'use client';

import { useEffect, useState } from 'react';
import { ArrowUpCircle, X } from 'lucide-react';

interface UpdateInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  checkedAt: number;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check once on mount, use cached result on server
    const controller = new AbortController();
    fetch('/api/runtime/update-check', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UpdateInfo | null) => {
        if (data?.updateAvailable) setUpdate(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!update || dismissed) return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <ArrowUpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground">
              Pan {update.latest} available
            </p>
            <p className="mt-0.5 text-muted-foreground">
              You&apos;re on {update.current}.{' '}
              <code className="rounded bg-muted/70 px-1 py-0.5 text-[10px] font-mono">
                pan-ui update
              </code>
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="mt-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground transition"
          aria-label="Dismiss update notice"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
