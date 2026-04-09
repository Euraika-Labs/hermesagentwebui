'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
          <p className="mt-2 text-sm text-muted-foreground">Installed connectors, MCP servers, callable tools, approvals, and diagnostics backed by the runtime.</p>
        </div>
        <button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Add MCP server
        </button>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Extensions</p>
          <p className="mt-2 text-2xl font-semibold">{extensions.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Runtime-visible integrations across builtin, native, and MCP sources.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Callable tools</p>
          <p className="mt-2 text-2xl font-semibold">{tools.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Capabilities normalized into operator-facing tool inventory.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Session scoped</p>
          <p className="mt-2 text-2xl font-semibold">{sessionScopedTools.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Tools limited to {activeSessionId ? 'the active session' : 'a session context'} for safer experimentation.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-label text-muted-foreground">Profile context</p>
          <p className="mt-2 text-lg font-semibold">{runtimeQuery.data?.profileContext?.label ?? runtimeQuery.data?.activeProfile ?? 'Unknown profile'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{profileScopedTools.length} tools respect the current profile boundary.</p>
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        <p className="font-medium text-foreground">Current loading semantics</p>
        <p className="mt-2">Global tools are visible everywhere, profile-scoped tools follow the selected profile, and session-scoped tools only apply to the active chat thread.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['installed', 'Installed'],
          ['mcp', 'MCP Servers'],
          ['discover', 'Discover'],
          ['tools', 'Tools'],
          ['approvals', 'Approvals'],
          ['diagnostics', 'Diagnostics'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm ${tab === key ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {extensionsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading integrations…</p> : null}

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
          {approvalGated.length === 0 ? <p className="text-sm text-muted-foreground">No approval-gated integrations are currently configured.</p> : null}
        </div>
      ) : null}

      {tab === 'installed' || tab === 'mcp' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleExtensions.map((extension) => (
            <ExtensionCard key={extension.id} extension={extension} />
          ))}
        </div>
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
