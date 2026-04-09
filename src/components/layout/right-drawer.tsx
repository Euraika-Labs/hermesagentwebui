'use client';

import { Bot, FileText, Layers3, Search, Sparkles, TerminalSquare, X } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { ArtifactPanel } from '@/features/chat/components/artifact-panel';
import { SourceCard } from '@/features/chat/components/source-card';
import { ToolCard } from '@/features/chat/components/tool-card';
import { useRuntimeArtifacts, useRuntimeTimeline } from '@/features/chat/api/use-runtime-history';
import { useContextInspector } from '@/features/memory/api/use-memory';
import { useRuntimeStatus } from '@/features/settings/api/use-runtime-status';
import { useSession } from '@/features/sessions/api/use-sessions';
import { StatusBadge } from '@/components/feedback/status-badge';
import { useUIStore, type RightDrawerTab } from '@/lib/store/ui-store';
import { governanceTone, humanizeStatus, riskTone, type RiskLevel } from '@/lib/types/runtime-status';
import { cn } from '@/lib/utils';

const tabs: Array<{ id: RightDrawerTab; label: string }> = [
  { id: 'context', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'tools', label: 'Tools' },
  { id: 'output', label: 'Output' },
  { id: 'session', label: 'Thread' },
];

const tabDescriptions: Record<RightDrawerTab, string> = {
  context: 'Current context, loaded skills, and memory that shape the next reply.',
  activity: 'What the agent is doing right now, including approvals and recent events.',
  tools: 'Which tools and runtime surfaces are active in this session.',
  output: 'Artifacts and sources emitted while the run unfolds.',
  session: 'Conversation metadata and thread-level settings.',
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border/50 bg-background/35 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 px-3 py-3">
      <p className="text-2xs uppercase tracking-label text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right text-foreground">{value}</div>
    </div>
  );
}

export function RightDrawer() {
  const {
    rightDrawerOpen,
    closeRightDrawer,
    rightDrawerTab,
    setRightDrawerTab,
    runEvents,
    artifacts,
    selectedArtifactId,
    selectArtifact,
    activeSessionId,
    selectedProfileId,
  } = useUIStore();

  const runtimeTimelineQuery = useRuntimeTimeline(activeSessionId);
  const runtimeArtifactsQuery = useRuntimeArtifacts(activeSessionId);
  const sessionQuery = useSession(activeSessionId);
  const runtimeQuery = useRuntimeStatus();
  const contextQuery = useContextInspector(selectedProfileId, activeSessionId);

  const allEvents = useMemo(() => [...(runtimeTimelineQuery.data ?? []), ...runEvents], [runEvents, runtimeTimelineQuery.data]);
  const displayedArtifacts = useMemo(() => {
    const merged = [...(runtimeArtifactsQuery.data ?? []), ...artifacts];
    return merged.filter((artifact, index) => merged.findIndex((candidate) => candidate.artifactId === artifact.artifactId) === index);
  }, [artifacts, runtimeArtifactsQuery.data]);

  const sourceEvents = allEvents.filter((event) => event.type === 'source.emitted');
  const toolEvents = allEvents.filter((event) => event.type === 'tool.started' || event.type === 'tool.completed');
  const approvalEvents = allEvents.filter((event) => event.type === 'tool.awaiting_approval');
  const phaseEvents = allEvents.filter((event) => event.type === 'run.phase');
  const latestPhase = phaseEvents.at(-1);
  const skillIds = Array.from(
    new Set([...(contextQuery.data?.loadedSkillIds ?? []), ...(sessionQuery.data?.loadedSkillIds ?? [])].filter(Boolean)),
  );
  const toolNames = Array.from(new Set(toolEvents.map((event) => event.toolName)));
  const toolRiskLevels = Array.from(
    new Set(toolEvents.map((event) => event.riskLevel).filter((risk): risk is RiskLevel => Boolean(risk))),
  );

  return (
    <aside
      className={cn(
        'fixed inset-x-3 bottom-3 z-30 flex max-h-[70vh] min-h-[320px] flex-col rounded-xl border border-border/50 bg-card/95 shadow-[var(--shadow-elevated)] backdrop-blur-xl transition-all duration-200 xl:inset-x-auto xl:bottom-auto xl:right-4 xl:top-[calc(1rem+72px)] xl:h-[calc(100vh-5.75rem)] xl:max-h-none xl:w-[360px]',
        rightDrawerOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Inspector</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{tabDescriptions[rightDrawerTab]}</p>
        </div>
        <button
          type="button"
          onClick={closeRightDrawer}
          className="rounded-2xl border border-border/70 bg-background/80 p-2 text-muted-foreground shadow-[var(--shadow-card)]"
          aria-label="Close details panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border/60 px-3 py-3">
          <div className="grid grid-cols-5 gap-1 rounded-2xl bg-background/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRightDrawerTab(tab.id)}
              className={cn(
                'rounded-[1rem] px-2 py-2 text-xs font-medium text-muted-foreground transition',
                rightDrawerTab === tab.id && 'bg-card/80 text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {rightDrawerTab === 'context' ? (
          <div className="space-y-4">
            <Section title="Current context" description="The main ingredients shaping the next answer.">
              <div className="grid grid-cols-2 gap-3">
                <SummaryMetric label="Profile" value={contextQuery.data?.activeProfileId ?? runtimeQuery.data?.activeProfile ?? 'default'} />
                <SummaryMetric label="Memory" value={contextQuery.data?.memoryMode ?? sessionQuery.data?.settings.memoryMode ?? 'standard'} />
                <SummaryMetric label="Policy" value={contextQuery.data?.policyPreset ?? sessionQuery.data?.settings.policyPreset ?? 'safe-chat'} />
                <SummaryMetric label="Skills" value={skillIds.length || 'None'} />
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
                <p className="text-2xs font-semibold uppercase tracking-label text-muted-foreground">Active thread</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{contextQuery.data?.activeSessionTitle ?? sessionQuery.data?.title ?? 'No active session'}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{contextQuery.data?.activeSessionPreview ?? sessionQuery.data?.preview ?? 'Start chatting to build a richer working context.'}</p>
              </div>
            </Section>

            <Section title="Loaded skills" description="Reusable procedures and references already attached to this conversation.">
              {skillIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {skillIds.map((skillId) => (
                    <StatusBadge key={skillId} label={skillId} tone="success" icon={<Sparkles className="h-3.5 w-3.5 text-success" />} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No explicit skills are attached yet. Open Skills when you want reusable procedures or references.</p>
              )}
            </Section>

            <Section title="Memory snippets" description="Compact recall currently visible to the agent.">
              <div className="grid grid-cols-2 gap-3">
                <SummaryMetric label="User memory" value={contextQuery.data?.userMemory.length ?? 0} />
                <SummaryMetric label="Agent memory" value={contextQuery.data?.agentMemory.length ?? 0} />
              </div>
              <div className="space-y-2">
                {[...(contextQuery.data?.userMemory ?? []), ...(contextQuery.data?.agentMemory ?? [])].slice(0, 4).map((entry, index) => (
                  <div key={`${entry}-${index}`} className="rounded-2xl border border-border/60 bg-card/50 p-3 text-sm leading-6 text-muted-foreground">
                    {entry}
                  </div>
                ))}
                {!contextQuery.data?.userMemory.length && !contextQuery.data?.agentMemory.length ? (
                  <p className="text-sm text-muted-foreground">No memory snippets surfaced for this session yet.</p>
                ) : null}
              </div>
            </Section>
          </div>
        ) : null}

        {rightDrawerTab === 'activity' ? (
          <div className="space-y-4">
            <Section title="What is happening now" description="Use this tab when you want the agent's live status without leaving the chat.">
              <div className="grid grid-cols-2 gap-3">
                <SummaryMetric label="Phase" value={latestPhase?.label ?? 'Idle'} />
                <SummaryMetric label="Approvals" value={approvalEvents.length ? `${approvalEvents.length} waiting` : 'None'} />
              </div>
              <div className="flex flex-wrap gap-2">
                {latestPhase ? <StatusBadge label={latestPhase.phase} tone="accent" /> : <StatusBadge label="No active run" tone="muted" />}
                <StatusBadge label={`${allEvents.length} events`} tone="muted" />
              </div>
            </Section>

            {approvalEvents.length ? (
              <Section title="Approval queue" description="High-visibility requests that need human confirmation.">
                <div className="space-y-3">
                  {approvalEvents.map((event) => (
                    <div key={event.toolCallId} className="rounded-2xl border border-approval/35 bg-approval/10 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{event.toolName}</p>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={event.governance ?? 'approval-gated'} tone={governanceTone(event.governance ?? 'approval-gated')} />
                          {event.riskLevel ? <StatusBadge label={event.riskLevel} tone={riskTone(event.riskLevel)} /> : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.summary}</p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Tool timeline" description="Latest tool and phase events emitted by the agent.">
              <div className="space-y-3">
                {allEvents.length ? (
                  allEvents
                    .filter((event) => event.type !== 'assistant.delta')
                    .slice(-10)
                    .reverse()
                    .map((event, index) => {
                    if (event.type === 'tool.started' || event.type === 'tool.completed') {
                      return <ToolCard key={`${event.toolCallId}-${event.type}-${index}`} event={event} />;
                    }

                    if (event.type === 'run.phase') {
                      return (
                        <div key={`${event.type}-${event.phase}-${index}`} className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-[var(--shadow-card)]">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-label text-muted-foreground">Run phase</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{event.label}</p>
                            </div>
                            <StatusBadge label={humanizeStatus(event.phase)} tone="accent" />
                          </div>
                        </div>
                      );
                    }

                    if (event.type === 'source.emitted') {
                      return (
                        <div key={`${event.type}-${event.source.id}-${index}`} className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-[var(--shadow-card)]">
                          <p className="text-xs uppercase tracking-label text-muted-foreground">Source captured</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{event.source.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.source.snippet}</p>
                        </div>
                      );
                    }

                    if (event.type === 'artifact.emitted') {
                      return (
                        <div key={`${event.type}-${event.artifactId}-${index}`} className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-[var(--shadow-card)]">
                          <p className="text-xs uppercase tracking-label text-muted-foreground">Output created</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{event.label}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.artifactType}</p>
                        </div>
                      );
                    }

                    if (event.type === 'tool.awaiting_approval') {
                      return (
                        <div key={`${event.type}-${event.toolCallId}-${index}`} className="rounded-lg border border-approval/35 bg-approval/10 p-4 shadow-[var(--shadow-card)]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{event.toolName}</p>
                            <StatusBadge label="approval-gated" tone="warning" />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.summary}</p>
                        </div>
                      );
                    }

                    if (event.type === 'error') {
                      return (
                        <div key={`${event.type}-${index}`} className="rounded-lg border border-danger/35 bg-danger/8 p-4 shadow-[var(--shadow-card)]">
                          <p className="text-xs uppercase tracking-label text-danger">Runtime error</p>
                          <p className="mt-1 text-sm leading-6 text-foreground">{event.message}</p>
                        </div>
                      );
                    }

                    return null;
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet. Start a run to populate the timeline.</p>
                )}
              </div>
            </Section>
          </div>
        ) : null}

        {rightDrawerTab === 'tools' ? (
          <div className="space-y-4">
            <Section title="Tool posture" description="What kinds of actions the current run is using and how risky they are.">
              <div className="grid grid-cols-2 gap-3">
                <SummaryMetric label="Distinct tools" value={toolNames.length} />
                <SummaryMetric label="Artifacts" value={displayedArtifacts.length} />
              </div>
              <div className="flex flex-wrap gap-2">
                {toolRiskLevels.length ? toolRiskLevels.map((risk) => <StatusBadge key={risk} label={`${risk} risk`} tone={riskTone(risk)} />) : <StatusBadge label="Read-only so far" tone="muted" />}
              </div>
            </Section>

            <Section title="Seen tools" description="Quick inventory of tool families already used in this session.">
              {toolNames.length ? (
                <div className="flex flex-wrap gap-2">
                  {toolNames.map((toolName) => (
                    <StatusBadge key={toolName} label={toolName} tone="accent" icon={<TerminalSquare className="h-3.5 w-3.5 text-accent" />} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tools have executed yet for this session.</p>
              )}
            </Section>

            <Section title="Connected runtime resources" description="Runtime-provided MCP servers and execution surfaces.">
              <div className="space-y-2">
                {runtimeQuery.data?.mcpServers.length ? (
                  runtimeQuery.data.mcpServers.map((server) => (
                    <div key={server.name} className="rounded-2xl border border-border/70 bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{server.name}</p>
                        <StatusBadge label={server.url ? 'remote' : 'local'} tone={server.url ? 'success' : 'accent'} />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{server.url ?? server.command ?? 'No endpoint metadata available.'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No MCP servers reported by the runtime.</p>
                )}
              </div>
            </Section>
          </div>
        ) : null}

        {rightDrawerTab === 'output' ? (
          <div className="space-y-4">
            <Section title="Generated output" description="Artifacts, plans, files, and structured content emitted during the run.">
              <ArtifactPanel artifacts={displayedArtifacts} selectedArtifactId={selectedArtifactId} onSelect={selectArtifact} />
            </Section>
            <Section title="Sources and citations" description="Retrieved pages, references, and snippets surfaced by the agent.">
              <div className="space-y-3">
                {sourceEvents.length ? (
                  sourceEvents.map((event, index) => <SourceCard key={`${event.source.id}-${index}`} source={event.source} />)
                ) : (
                  <p className="text-sm text-muted-foreground">No sources have been emitted for this session yet.</p>
                )}
              </div>
            </Section>
          </div>
        ) : null}

        {rightDrawerTab === 'session' ? (
          <div className="space-y-4">
            <Section title="Thread summary" description="Core metadata for the active conversation thread.">
              <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
                <p className="text-2xs uppercase tracking-label text-muted-foreground">Title</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{sessionQuery.data?.title ?? 'Unsaved chat'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SummaryMetric label="Messages" value={sessionQuery.data?.messages.length ?? 0} />
                <SummaryMetric
                  label="Updated"
                  value={sessionQuery.data?.updatedAt ? new Date(sessionQuery.data.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not saved'}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={sessionQuery.data?.settings.model ?? runtimeQuery.data?.modelDefault ?? 'default model'} tone="accent" icon={<Bot className="h-3.5 w-3.5 text-accent" />} />
                <StatusBadge label={sessionQuery.data?.settings.provider ?? runtimeQuery.data?.provider ?? 'provider'} tone="success" />
                <StatusBadge label={sessionQuery.data?.archived ? 'archived' : 'active'} tone={sessionQuery.data?.archived ? 'muted' : 'success'} />
              </div>
            </Section>

            <Section title="Thread settings" description="Runtime behavior selected for this conversation.">
              <div className="space-y-2">
                <KeyValueRow label="Policy preset" value={<StatusBadge label={sessionQuery.data?.settings.policyPreset ?? 'safe-chat'} tone="warning" />} />
                <KeyValueRow label="Memory mode" value={<StatusBadge label={sessionQuery.data?.settings.memoryMode ?? 'standard'} tone="muted" />} />
                <KeyValueRow label="Artifacts" value={<StatusBadge label={`${displayedArtifacts.length}`} tone="accent" icon={<FileText className="h-3.5 w-3.5 text-accent" />} />} />
                <KeyValueRow label="Sources" value={<StatusBadge label={`${sourceEvents.length}`} tone="success" icon={<Search className="h-3.5 w-3.5 text-success" />} />} />
              </div>
            </Section>

            <Section title="Workspace linkage" description="How this thread relates to the broader workspace.">
              <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Layers3 className="h-4 w-4 text-accent" />
                  <p className="text-sm font-semibold">{sessionQuery.data?.parentSessionId ? 'Forked thread' : 'Primary thread'}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {sessionQuery.data?.parentSessionId ? `Derived from ${sessionQuery.data.parentSessionId}. Forking preserves the old run while letting you branch.` : 'This session is the main line for its current workspace context.'}
                </p>
              </div>
            </Section>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
