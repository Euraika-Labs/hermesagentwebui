import { EmptyState } from '@/components/feedback/states';
import { describeApprovalPolicy, describeCapabilityScope, describeRiskLevel } from '@/lib/presentation/capability-labels';
import type { ToolInventoryItem } from '@/lib/types/extension';

type ScopeGroup = {
  id: 'global' | 'profile' | 'session';
  title: string;
  description: string;
};

const scopeGroups: ScopeGroup[] = [
  {
    id: 'global',
    title: 'Available everywhere',
    description: 'These tools are available across chats and do not depend on the active profile or thread.',
  },
  {
    id: 'profile',
    title: 'Follows the active profile',
    description: 'These tools move with the current profile and change when you switch profiles.',
  },
  {
    id: 'session',
    title: 'Only in this chat',
    description: 'These tools are limited to the current conversation for safer, more local experimentation.',
  },
];

export function ToolInventory({ tools }: { tools: ToolInventoryItem[] }) {
  if (tools.length === 0) {
    return (
      <EmptyState
        layout="banner"
        title="No tools available right now"
        description="Nothing is currently exposed to the agent from the active integrations, plugins, profile, and chat context."
      />
    );
  }

  return (
    <div className="space-y-5">
      {scopeGroups.map((group) => {
        const groupedTools = tools.filter((tool) => tool.scope === group.id);
        if (!groupedTools.length) return null;

        return (
          <section key={group.id} className="space-y-3 rounded-2xl border border-border/60 bg-card/55 p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            </div>
            <div className="space-y-3">
              {groupedTools.map((tool) => (
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
                      <span className="rounded-full border border-border px-2 py-1">{tool.enabled ? 'Available now' : 'Blocked'}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{describeCapabilityScope(tool.scope)}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
