'use client';

import { useMemo, useState } from 'react';
import { Clock3, GitBranch, Pin, Play, Plus } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/feedback/states';
import { SessionSearch } from '@/features/sessions/components/session-search';
import {
  SESSION_SOURCES,
  SessionSourceBadge,
  getSourceMeta,
} from '@/features/sessions/components/session-source-badge';
import type { ChatSessionSummary, SessionSource } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

type SessionSidebarProps = {
  sessions: ChatSessionSummary[];
  selectedSessionId: string | null;
  search: string;
  isLoading?: boolean;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onResumeSession?: (sessionId: string) => void;
};

type SourceFilter = SessionSource | 'all';

function previewText(preview: string | null | undefined) {
  if (!preview) return 'No messages yet.';
  return preview.length > 88 ? `${preview.slice(0, 85)}…` : preview;
}

function formatUpdatedAt(updatedAt: string) {
  return new Date(updatedAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sessionSource(session: ChatSessionSummary): SessionSource {
  return session.source ?? 'unknown';
}

/** A session is "external" when it did not originate in this WebUI. */
function isExternalSession(session: ChatSessionSummary): boolean {
  const src = sessionSource(session);
  return src !== 'webui' && src !== 'unknown';
}

export function SessionSidebar({
  sessions,
  selectedSessionId,
  search,
  isLoading,
  onSearchChange,
  onNewChat,
  onSelectSession,
  onResumeSession,
}: SessionSidebarProps) {
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Sources actually present in the current sessions list, ordered canonically.
  const availableSources = useMemo(() => {
    const present = new Set<SessionSource>();
    for (const s of sessions) present.add(sessionSource(s));
    return SESSION_SOURCES.filter((src) => present.has(src));
  }, [sessions]);

  const showFilter = availableSources.length > 1;

  const filteredSessions = useMemo(() => {
    const base = search.trim() ? sessions.filter((s) => !s.parentSessionId) : sessions;
    if (sourceFilter === 'all') return base;
    return base.filter((s) => sessionSource(s) === sourceFilter);
  }, [sessions, search, sourceFilter]);

  const pinnedSessions = filteredSessions.filter((s) => s.pinned && !s.archived);
  const recentSessions = filteredSessions.filter((s) => !s.pinned && !s.archived);
  const archivedSessions = filteredSessions.filter((s) => s.archived);

  const ARCHIVED_LIMIT = 5;
  const [showAllArchived, setShowAllArchived] = useState(false);

  const groups = [
    { label: 'Pinned', items: pinnedSessions },
    { label: 'Recent', items: recentSessions.slice(0, visibleCount) },
    { label: 'Archived', items: showAllArchived ? archivedSessions : archivedSessions.slice(0, ARCHIVED_LIMIT) },
  ].filter((group) => group.items.length > 0);

  const hasMore = recentSessions.length > visibleCount;
  const hasMoreArchived = !showAllArchived && archivedSessions.length > ARCHIVED_LIMIT;

  return (
    <aside className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-[var(--shadow-soft)]">
      <div className="border-b border-border/60 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-label text-muted-foreground">Chats</p>
        <div className="rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary))/0.16,hsl(var(--accent))/0.12)] p-1">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg brand-gradient px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {filteredSessions.length} chats · {pinnedSessions.length} pinned · {archivedSessions.length} archived
        </p>
      </div>
      <SessionSearch value={search} onChange={onSearchChange} />
      {showFilter ? (
        <div className="border-b border-border/70 px-3 pb-3">
          <div className="mb-1.5 px-1 text-2xs font-semibold uppercase tracking-label text-muted-foreground">
            Source
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-3xs uppercase tracking-label transition',
                sourceFilter === 'all'
                  ? 'border-primary/60 bg-primary/15 text-primary'
                  : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60',
              )}
            >
              All
            </button>
            {availableSources.map((src) => {
              const meta = getSourceMeta(src);
              const Icon = meta.icon;
              const active = sourceFilter === src;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(src)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-3xs uppercase tracking-label transition',
                    active
                      ? meta.classes.replace('/10', '/20').replace('/40', '/60')
                      : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60',
                  )}
                  title={meta.label}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {isLoading ? (
          <LoadingState layout="banner" title="Loading chats…" />
        ) : null}
        {!isLoading && filteredSessions.length === 0 ? (
          <EmptyState
            layout="banner"
            title={sourceFilter === 'all' ? 'No chats found' : `No ${getSourceMeta(sourceFilter).label} chats`}
            description={sourceFilter === 'all' ? 'Try a different search term or start a new chat.' : 'Change the source filter or start a new chat.'}
          />
        ) : null}
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="flex items-center justify-between px-2 text-2xs font-semibold uppercase tracking-label text-muted-foreground">
              <span>{group.label}</span>
              <span>{group.items.length}</span>
            </div>
            {group.items.map((session) => {
              const external = isExternalSession(session);
              const canResume = external && Boolean(onResumeSession);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  aria-label={/\(fork\)/i.test(session.title) && selectedSessionId !== session.id ? session.title : `Open session ${session.id}`}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition',
                    selectedSessionId === session.id
                      ? 'border-primary/15 bg-primary/6'
                      : 'border-border/60 bg-background/70 hover:border-border/70 hover:bg-card/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p aria-hidden="true" className="truncate text-sm font-semibold text-foreground">{session.title}</p>
                        {session.pinned ? <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                        {session.parentSessionId ? <GitBranch className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                      </div>
                      <p aria-hidden="true" className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{previewText(session.preview)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SessionSourceBadge source={sessionSource(session)} />
                      {canResume && selectedSessionId === session.id ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onResumeSession?.(session.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onResumeSession?.(session.id);
                            }
                          }}
                          aria-label={`Resume ${getSourceMeta(sessionSource(session)).label} session`}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-3xs uppercase tracking-label text-primary transition hover:bg-primary/20 cursor-pointer"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatUpdatedAt(session.updatedAt)}
                    </span>
                    {session.workspaceLabel && selectedSessionId === session.id ? <span>{session.workspaceLabel}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {hasMore ? (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="mx-2 mt-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-card"
          >
            Show more ({recentSessions.length - visibleCount} remaining)
          </button>
        ) : null}
        {hasMoreArchived ? (
          <button
            type="button"
            onClick={() => setShowAllArchived(true)}
            className="mx-2 mt-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-card"
          >
            Show all archived ({archivedSessions.length - ARCHIVED_LIMIT} more)
          </button>
        ) : null}
      </div>
    </aside>
  );
}
