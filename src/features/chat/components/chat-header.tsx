'use client';

import { Settings2 } from 'lucide-react';
import { SessionActionsMenu } from '@/features/sessions/components/session-actions-menu';
import { ModelSwitcher } from '@/features/settings/components/model-switcher';
import { StatusBadge } from '@/components/feedback/status-badge';
import type { ChatSessionSettings } from '@/lib/types/chat';
import { connectivityTone } from '@/lib/types/runtime-status';
import { cn } from '@/lib/utils';

export function ChatHeader({
  title,
  settings,
  profileLabel,
  loadedSkillIds,
  runtimeConnected,
  controlsDisabled,
  isPersisted,
  archived,
  runtimeSummary,
  hasMessages,
  onOpenSettings,
  onRename,
  onArchive,
  onDelete,
  onFork,
  onModelChange,
}: {
  title: string;
  settings: ChatSessionSettings;
  profileLabel: string;
  loadedSkillIds?: string[];
  runtimeConnected: boolean;
  controlsDisabled?: boolean;
  isPersisted: boolean;
  archived?: boolean;
  runtimeSummary?: string;
  hasMessages?: boolean;
  onOpenSettings: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onFork: () => void;
  onModelChange: (model: string, provider: string) => void;
}) {
  const visibleLoadedSkills = (loadedSkillIds ?? []).filter((skillId) => skillId !== 'skill-authoring');
  const runtimeLabel = runtimeConnected ? 'Runtime connected' : 'Runtime degraded';
  const metadataSummary = [
    profileLabel && `Profile ${profileLabel}`,
    settings.model ? `Model ${settings.model}` : 'Default model',
    settings.policyPreset && `Mode ${settings.policyPreset}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn('shrink-0 border-b border-border/60 bg-card/70 px-5', hasMessages ? 'py-2.5' : 'py-4')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">Chat</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h2>
              {archived ? <StatusBadge label="Archived" tone="warning" /> : null}
              {isPersisted ? <StatusBadge label="Saved chat" tone="success" /> : <StatusBadge label="New chat" tone="warning" />}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{metadataSummary}</p>
            {hasMessages && runtimeSummary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{runtimeSummary}</p> : null}
          </div>

          {!hasMessages ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge label={runtimeLabel} tone={connectivityTone(runtimeConnected ? 'healthy' : 'degraded')} />
              {visibleLoadedSkills.length ? <StatusBadge label={`${visibleLoadedSkills.length} skill${visibleLoadedSkills.length === 1 ? '' : 's'} loaded`} tone="accent" /> : null}
            </div>
          ) : null}

          {!hasMessages ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Start with one clear request. Attach a file or load a skill only when the task needs more context.
              {visibleLoadedSkills.length ? ` Loaded: ${visibleLoadedSkills.slice(0, 2).join(', ')}${visibleLoadedSkills.length > 2 ? ` +${visibleLoadedSkills.length - 2} more` : ''}.` : ''}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:max-w-[360px] lg:justify-end">
          <ModelSwitcher value={settings.model} provider={settings.provider} onChange={onModelChange} ariaLabel="Header model switcher" disabled={controlsDisabled} />
          <button
            type="button"
            onClick={onOpenSettings}
            disabled={controlsDisabled}
            aria-label="Settings"
            className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </button>
          <SessionActionsMenu onRename={onRename} onArchive={onArchive} onDelete={onDelete} onFork={onFork} />
        </div>
      </div>
    </div>
  );
}
