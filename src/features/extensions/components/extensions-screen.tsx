'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardSkeletonGrid } from '@/components/feedback/card-skeleton-grid';
import { DegradedState, EmptyState, ErrorState } from '@/components/feedback/states';
import { useAddMcpExtension, useExtensions } from '@/features/extensions/api/use-extensions';
import { AddMcpServerDialog } from '@/features/extensions/components/add-mcp-server-dialog';
import { ExtensionCard } from '@/features/extensions/components/extension-card';
import { McpHub } from '@/features/extensions/components/mcp-hub';
import { ToolInventory } from '@/features/extensions/components/tool-inventory';
import { McpDiagnosticsPanel } from '@/features/settings/components/mcp-diagnostics';
import { useRuntimeStatus } from '@/features/settings/api/use-runtime-status';
import { describeApprovalPolicy, describeGovernance } from '@/lib/presentation/capability-labels';
import { useUIStore } from '@/lib/store/ui-store';

type ExtensionsTab = 'installed' | 'mcp' | 'tools' | 'approvals' | 'diagnostics' | 'discover';

type TabMeta = {
  label: string;
  title: string;
  description: string;
};

const tabMeta: Record<ExtensionsTab, TabMeta> = {
  installed: {
    label: 'Connected now',
    title: 'Installed integrations',
    description: 'Everything already connected for this workspace, including built-in and MCP-backed integrations.',
  },
  mcp: {
    label: 'MCP servers',
    title: 'Installed MCP servers',
    description: 'Only the MCP servers already configured for the active profile.',
  },
  discover: {
    label: 'MCP Hub',
    title: 'Discover MCP servers',
    description: 'Browse more MCP servers to install without mixing them into the current inventory.',
  },
  tools: {
    label: 'Available tools',
    title: 'Tools the agent can use',
    description: 'This view explains what is currently available everywhere, by profile, or only in this chat.',
  },
  approvals: {
    label: 'Approval rules',
    title: 'Integrations that need extra approval',
    description: 'See which integrations are blocked, approval-gated, or limited by policy before a tool can run.',
  },
  diagnostics: {
    label: 'Diagnostics',
    title: 'Runtime diagnostics',
    description: 'Inspect runtime health when discovery or live checks look incomplete or degraded.',
  },
};

export function ExtensionsScreen({ initialTab = 'installed' }: { initialTab?: ExtensionsTab }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<ExtensionsTab>(initialTab);
  const { activeSessionId } = useUIStore();
  const extensionsQuery = useExtensions();
  const runtimeQuery = useRuntimeStatus();
  const addMcp = useAddMcpExtension();
  const extensions = extensionsQuery.data?.extensions ?? [];
  const tools = extensionsQuery.data?.tools ?? [];
  const visibleExtensions = tab === 'mcp' ? extensions.filter((extension) => extension.type === 'mcp') : extensions;
  const approvalGated = extensions.filter((extension) => extension.governance === 'approval-gated' || extension.approvalPolicy !== 'auto');
  const sessionScopedTools = tools.filter((tool) => tool.scope === 'session');
  const profileScopedTools = tools.filter((tool) => tool.scope === 'profile');
  const globalTools = tools.filter((tool) => tool.scope === 'global');
  const needsAttention = extensions.filter((extension) => extension.health !== 'healthy' || extension.authState === 'needs-auth' || extension.authState === 'expired');
  const activeProfileLabel = runtimeQuery.data?.profileContext?.label ?? runtimeQuery.data?.activeProfile ?? 'Unknown profile';
  const currentTab = tabMeta[tab];

  return (
    <div className="h-full space-y-6 overflow-y-auto p-4 lg:p-6">
      <section className="space-y-4 rounded-3xl border border-border/70 bg-card/60 p-5 shadow-[var(--shadow-elevated)] lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Understand what is installed, what the agent can use right now, and what still needs setup. MCP servers live here; repo-based plugins stay on the separate Plugins page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Add MCP server
            </button>
            <Link href="/plugins" className="rounded-lg border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-foreground">
              Open plugins
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-label text-muted-foreground">Installed now</p>
            <p className="mt-2 text-2xl font-semibold">{extensions.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Connected integrations across built-in and MCP sources.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-label text-muted-foreground">Available tools</p>
            <p className="mt-2 text-2xl font-semibold">{tools.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Tools the agent can reach from the current workspace context.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-label text-muted-foreground">Needs attention</p>
            <p className="mt-2 text-2xl font-semibold">{needsAttention.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Integrations that are degraded, blocked, or missing auth.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-label text-muted-foreground">Active profile</p>
            <p className="mt-2 text-lg font-semibold">{activeProfileLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{profileScopedTools.length} tools follow the active profile.</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">What is an integration?</p>
            <p className="mt-2">An integration is a connected capability Pan can inspect and the agent can call. MCP servers show up here because they expose live tools.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">What are tools?</p>
            <p className="mt-2">Tools are the actions the agent can actually run. Some are global, some follow the active profile, and some only apply to the current chat.</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">Where do plugins fit?</p>
            <p className="mt-2">Plugins are deeper repo-based extensions. They can add hooks and tool bundles, but they are managed separately so this page can stay focused on live availability.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(Object.entries(tabMeta) as Array<[ExtensionsTab, TabMeta]>).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm ${tab === key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card/55 p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{currentTab.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{currentTab.description}</p>
        </div>

        {runtimeQuery.data?.available && runtimeQuery.data?.apiReachable === false ? (
          <DegradedState
            layout="banner"
            title="Runtime data is currently degraded"
            description="Some integration information is still readable, but live runtime checks are unavailable right now."
          />
        ) : null}

        {extensionsQuery.isLoading ? <CardSkeletonGrid count={3} cardClassName="h-32" /> : null}

        {extensionsQuery.isError ? (
          <ErrorState
            title="Could not load integrations"
            error={extensionsQuery.error}
            description="Pan could not read the current integrations state from the runtime."
          />
        ) : null}

        {tab === 'tools' ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs uppercase tracking-label text-muted-foreground">Available everywhere</p>
                <p className="mt-2 text-2xl font-semibold">{globalTools.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Tools that do not depend on profile or chat scope.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs uppercase tracking-label text-muted-foreground">Follows profile</p>
                <p className="mt-2 text-2xl font-semibold">{profileScopedTools.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Changes when you switch the active profile.</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs uppercase tracking-label text-muted-foreground">Only this chat</p>
                <p className="mt-2 text-2xl font-semibold">{sessionScopedTools.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">{activeSessionId ? 'Limited to the active chat for safer experimentation.' : 'These appear once a chat-level tool is attached.'}</p>
              </div>
            </div>
            <ToolInventory tools={tools} />
          </>
        ) : null}

        {tab === 'diagnostics' ? <McpDiagnosticsPanel /> : null}

        {tab === 'approvals' ? (
          <div className="space-y-3">
            {approvalGated.map((extension) => (
              <div key={extension.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{extension.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-2 py-1">{describeGovernance(extension.governance)}</span>
                    <span className="rounded-full border border-border px-2 py-1">{describeApprovalPolicy(extension.approvalPolicy)}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{extension.description}</p>
              </div>
            ))}
            {approvalGated.length === 0 ? (
              <EmptyState
                layout="banner"
                title="No extra approval rules right now"
                description="No installed integrations currently need explicit approval handling beyond the default runtime posture."
              />
            ) : null}
          </div>
        ) : null}

        {tab === 'installed' || tab === 'mcp' ? (
          visibleExtensions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleExtensions.map((extension) => (
                <ExtensionCard key={extension.id} extension={extension} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={tab === 'mcp' ? 'No MCP servers installed' : 'No integrations installed'}
              description={
                tab === 'mcp'
                  ? 'Add an MCP server directly or browse the MCP Hub to connect one.'
                  : 'This profile has no connected integrations yet. Start with an MCP server, then inspect tools and approvals once it is live.'
              }
              primaryAction={
                <button type="button" onClick={() => setDialogOpen(true)} className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Add MCP server
                </button>
              }
              secondaryAction={
                <button type="button" onClick={() => setTab('discover')} className="rounded-2xl border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-foreground">
                  Browse MCP Hub
                </button>
              }
            />
          )
        ) : null}

        {tab === 'discover' ? <McpHub /> : null}
      </section>

      <AddMcpServerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (payload) => {
          const { extension } = await addMcp.mutateAsync(payload);
          setDialogOpen(false);
          router.push(`/extensions/${extension.id}`);
        }}
      />
    </div>
  );
}
