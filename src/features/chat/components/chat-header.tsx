'use client';

import { FolderKanban, Settings2 } from 'lucide-react';
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
  const metadataSummary = [profileLabel, settings.provider, settings.policyPreset, settings.memoryMode]
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
            {runtimeSummary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{runtimeSummary}</p> : null}
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{metadataSummary}</p>
          </div>

          {!hasMessages ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge label={runtimeLabel} tone={connectivityTone(runtimeConnected ? 'healthy' : 'degraded')} />
              <StatusBadge label={profileLabel} tone="accent" icon={<FolderKanban className="h-3.5 w-3.5 text-accent" />} />
            </div>
          ) : null}

          {!hasMessages ? (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-lg border border-border/60 bg-background/55 p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-label text-muted-foreground">Skills in this chat</p>
                {visibleLoadedSkills.length ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {visibleLoadedSkills.length} skill{visibleLoadedSkills.length === 1 ? '' : 's'} added
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {visibleLoadedSkills.slice(0, 2).join(', ')}
                      {visibleLoadedSkills.length > 2 ? ` +${visibleLoadedSkills.length - 2} more` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No skills added to this chat yet. Open Skills to load one when you need reusable instructions or context.</p>
                )}
              </div>
              <div className="min-w-[220px] rounded-lg border border-border/60 bg-background/55 p-3.5">
                <p className="text-2xs font-semibold uppercase tracking-label text-muted-foreground">Chat status</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{isPersisted ? 'Saved chat' : 'New chat'}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Model · {settings.model || 'Default'}</p>
              </div>
            </div>
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
