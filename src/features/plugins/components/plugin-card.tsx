'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plugin } from '@/lib/types/plugin';

type PluginCardProps = {
  plugin: Plugin;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove?: (id: string) => void;
};

const sourceBadgeStyles: Record<Plugin['source'], string> = {
  user: 'bg-blue-500/15 text-blue-400',
  builtin: 'bg-emerald-500/15 text-emerald-400',
  pip: 'bg-amber-500/15 text-amber-400',
};

export function PluginCard({ plugin, onToggle, onRemove }: PluginCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{plugin.name}</h3>
            <span className="shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-2xs text-muted-foreground">
              v{plugin.version}
            </span>
          </div>
          {plugin.author && (
            <p className="mt-0.5 text-xs text-muted-foreground">by {plugin.author}</p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium',
            sourceBadgeStyles[plugin.source],
          )}
        >
          {plugin.source}
        </span>
      </div>

      {plugin.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {plugin.description}
        </p>
      )}

      {plugin.providedTools.length > 0 && (
        <div className="mt-3">
          <p className="text-2xs font-medium uppercase tracking-label text-muted-foreground">Tools</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {plugin.providedTools.map((tool) => (
              <span key={tool} className="rounded-md bg-muted/50 px-1.5 py-0.5 text-2xs text-muted-foreground">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {plugin.providedHooks.length > 0 && (
        <div className="mt-2">
          <p className="text-2xs font-medium uppercase tracking-label text-muted-foreground">Hooks</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {plugin.providedHooks.map((hook) => (
              <span key={hook} className="rounded-md bg-muted/50 px-1.5 py-0.5 text-2xs text-muted-foreground">
                {hook}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
        <label className="flex cursor-pointer items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={plugin.enabled}
            onClick={() => onToggle(plugin.id, !plugin.enabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
              plugin.enabled ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                plugin.enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
              )}
            />
          </button>
          <span className="text-sm text-muted-foreground">
            {plugin.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>

        {plugin.source === 'user' && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(plugin.id)}
            className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-xs text-danger transition hover:bg-danger/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
