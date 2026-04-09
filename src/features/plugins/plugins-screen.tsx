'use client';

import { useState } from 'react';
import { Puzzle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/states';
import { usePlugins, useTogglePlugin, useRemovePlugin } from '@/features/plugins/api/use-plugins';
import { PluginCard } from '@/features/plugins/components/plugin-card';
import { InstallPluginDialog } from '@/features/plugins/components/install-plugin-dialog';

export function PluginsScreen() {
  const pluginsQuery = usePlugins();
  const togglePlugin = useTogglePlugin();
  const removePlugin = useRemovePlugin();
  const [dialogOpen, setDialogOpen] = useState(false);

  const plugins = pluginsQuery.data ?? [];

  function handleToggle(id: string, enabled: boolean) {
    void togglePlugin.mutateAsync({ id, enabled });
  }

  function handleRemove(id: string) {
    void removePlugin.mutateAsync(id);
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 p-4 pb-8 lg:p-6 lg:pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plugins</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Plugins are repo-based extensions for custom hooks and bundled tools. Use MCP servers for live external systems, and use plugins when you need deeper runtime customization.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Install plugin
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/55 p-4 text-sm text-muted-foreground shadow-sm">
        <p className="font-medium text-foreground">How plugins differ from integrations</p>
        <p className="mt-2">
          Integrations and MCP servers focus on what the agent can reach right now. Plugins focus on adding custom hooks, packaged tools, and deeper behavior changes to the runtime.
        </p>
      </div>

      {pluginsQuery.isLoading ? <LoadingState title="Loading plugins…" description="Reading installed plugins and their tool/hook metadata for this workspace." /> : null}

      {pluginsQuery.isError ? (
        <ErrorState
          title="Could not load plugins"
          error={pluginsQuery.error}
          description="Pan could not read the installed plugin inventory right now."
        />
      ) : null}

      {pluginsQuery.isSuccess && plugins.length === 0 ? (
        <EmptyState
          title="No plugins installed"
          description="Plugins are optional and usually come after skills and MCP servers. Install one when you need repo-based hooks, tool bundles, or runtime customization."
          icon={<Puzzle className="h-5 w-5" />}
          primaryAction={
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Install your first plugin
            </button>
          }
        />
      ) : null}

      {pluginsQuery.isSuccess && plugins.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} onToggle={handleToggle} onRemove={handleRemove} />
          ))}
        </div>
      ) : null}

      <InstallPluginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
