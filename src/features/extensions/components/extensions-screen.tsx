'use client';

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

export function ExtensionsScreen({ initialTab = 'installed' }: { initialTab?: 'installed' | 'mcp' | 'tools' | 'approvals' | 'diagnostics' | 'discover' }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<'installed' | 'mcp' | 'tools' | 'approvals' | 'diagnostics' | 'discover'>(initialTab);
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

  return (
    <div className="h-full overflow-y-auto space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage installed integrations, MCP servers, tools, approvals, and diagnostics in one place.</p>
        </div>
        <button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Add MCP server
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Installed integrations</p>
          <p className="mt-2 text-2xl font-semibold">{extensions.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Connected integrations across built-in, local, and MCP sources.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Available tools</p>
          <p className="mt-2 text-2xl font-semibold">{tools.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tools exposed by your installed integrations and plugins.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Chat scoped</p>
          <p className="mt-2 text-2xl font-semibold">{sessionScopedTools.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tools limited to {activeSessionId ? 'the active chat' : 'a chat context'} for safer experimentation.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Active profile</p>
          <p className="mt-2 text-lg font-semibold">{runtimeQuery.data?.profileContext?.label ?? runtimeQuery.data?.activeProfile ?? 'Unknown profile'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{profileScopedTools.length} tools follow the active profile.</p>
        </div>
      </section>

      <div className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm text-muted-foreground shadow-sm">
        <p className="font-medium text-foreground">How availability works</p>
        <p className="mt-2">Global tools are available everywhere, profile tools follow the active profile, and chat tools only apply to the current chat.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['installed', 'Installed'],
          ['mcp', 'MCP servers'],
          ['discover', 'MCP Hub'],
          ['tools', 'Tools'],
          ['approvals', 'Approvals'],
          ['diagnostics', 'Diagnostics'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm ${tab === key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {runtimeQuery.data?.available && runtimeQuery.data?.apiReachable === false ? (
        <DegradedState
          layout="banner"
          title="Runtime data is currently degraded"
          description="Some integration information is available, but live runtime checks are unavailable right now."
        />
      ) : null}

      {extensionsQuery.isLoading ? (
        <CardSkeletonGrid count={3} cardClassName="h-32" />
      ) : null}

      {extensionsQuery.isError ? (
        <ErrorState
          title="Could not load integrations"
          error={extensionsQuery.error}
          description="Pan could not read the current integrations state from the runtime."
        />
      ) : null}

      {tab === 'tools' ? <ToolInventory tools={tools} /> : null}
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
              title="No approvals needed"
              description="No integrations currently need explicit approval handling."
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
            description={tab === 'mcp'
              ? 'Add an MCP server or browse the MCP Hub to connect one.'
              : 'This profile has no installed integrations yet. Add an MCP server or open discovery to get started.'}
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
