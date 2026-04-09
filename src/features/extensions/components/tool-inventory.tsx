import { EmptyState } from '@/components/feedback/states';
import { describeApprovalPolicy, describeCapabilityScope, describeRiskLevel } from '@/lib/presentation/capability-labels';
import type { ToolInventoryItem } from '@/lib/types/extension';

export function ToolInventory({ tools }: { tools: ToolInventoryItem[] }) {
  return (
    <div className="space-y-3">
      {tools.map((tool) => (
        <div key={tool.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{tool.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{tool.sourceExtensionName}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border px-2 py-1">{tool.category}</span>
              <span className="rounded-full border border-border px-2 py-1">{describeRiskLevel(tool.riskLevel)}</span>
              <span className="rounded-full border border-border px-2 py-1">{describeApprovalPolicy(tool.approvalPolicy)}</span>
              <span className="rounded-full border border-border px-2 py-1">{tool.enabled ? 'Enabled' : 'Blocked'}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{describeCapabilityScope(tool.scope)}</p>
        </div>
      ))}
      {tools.length === 0 ? (
        <EmptyState
          layout="banner"
          title="No tools available"
          description="No tools are currently exposed by the active integrations for this profile and chat context."
        />
      ) : null}
    </div>
  );
}
