'use client';

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Library, Puzzle, Search, Sparkles, Store, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardSkeletonGrid } from '@/components/feedback/card-skeleton-grid';
import { EmptyState, ErrorState } from '@/components/feedback/states';
import { useMarketplaceSearch } from '@/features/marketplace/api/use-marketplace-search';
import { useHubMcpServers } from '@/features/extensions/api/use-mcp-hub';
import { usePlugins } from '@/features/plugins/api/use-plugins';
import { useHubSkills, type HubSkill } from '@/features/skills/api/use-skills';
import type { Plugin } from '@/lib/types/plugin';
import type { McpHubServer } from '@/server/hermes/hub-mcp';

const McpHub = lazy(() =>
  import('@/features/extensions/components/mcp-hub').then((m) => ({ default: m.McpHub })),
);
const PluginsScreen = lazy(() =>
  import('@/features/plugins/plugins-screen').then((m) => ({ default: m.PluginsScreen })),
);
const SkillsScreen = lazy(() =>
  import('@/features/skills/components/skills-screen').then((m) => ({ default: m.SkillsScreen })),
);

type Tab = 'skills' | 'mcp-servers' | 'plugins';
type MarketplaceView = 'discover' | 'installed';

const tabs: { id: Tab; label: string; icon: typeof Library; discoverLabel: string; inventoryLabel: string }[] = [
  {
    id: 'skills',
    label: 'Skills',
    icon: Library,
    discoverLabel: 'Reusable procedures, references, and templates ready to install.',
    inventoryLabel: 'Review the skills already installed in this workspace.',
  },
  {
    id: 'mcp-servers',
    label: 'MCP servers',
    icon: Bot,
    discoverLabel: 'Connect live tools and external systems through the MCP ecosystem.',
    inventoryLabel: 'See which MCP servers are available to this profile right now.',
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: Puzzle,
    discoverLabel: 'Extend Pan with custom tool bundles, hooks, and integrations.',
    inventoryLabel: 'Manage installed plugins and add more when needed.',
  },
];

function DiscoveryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  onOpen,
}: {
  icon: typeof Library;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-border/70 bg-card/70 p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-card"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xs font-semibold uppercase tracking-label text-muted-foreground">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs font-medium text-foreground">{meta}</p>
    </button>
  );
}

function SkillDiscoveryCard({ skill }: { skill: HubSkill }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{skill.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{skill.repo}</p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-2xs font-medium text-foreground">
          {skill.trustLevel}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{skill.detail?.summary || skill.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {skill.installs != null ? (
          <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{skill.installs.toLocaleString()} installs</span>
        ) : null}
        {skill.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function McpDiscoveryCard({ server }: { server: McpHubServer }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{server.title || server.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{server.author || server.category}</p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-2xs font-medium text-foreground">
          {server.verified ? 'verified' : server.transport}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{server.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{server.transport}</span>
        <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{server.category}</span>
        {server.tools.length ? (
          <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{server.tools.length} tools</span>
        ) : null}
      </div>
    </div>
  );
}

function PluginDiscoveryCard({ plugin }: { plugin: Plugin }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{plugin.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">v{plugin.version}</p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-2xs font-medium text-foreground">
          {plugin.enabled ? 'enabled' : 'installed'}
        </span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{plugin.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{plugin.source}</span>
        {plugin.providedTools.length ? (
          <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{plugin.providedTools.length} tools</span>
        ) : null}
        {plugin.providedHooks.length ? (
          <span className="rounded-full bg-muted/60 px-2 py-1 text-2xs text-muted-foreground">{plugin.providedHooks.length} hooks</span>
        ) : null}
      </div>
    </div>
  );
}

export function MarketplaceScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const [view, setView] = useState<MarketplaceView>('discover');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchInput]);

  const isSearching = debouncedQuery.length > 0;
  const searchQuery = useMarketplaceSearch(debouncedQuery);
  const hubSkillsQuery = useHubSkills();
  const hubMcpQuery = useHubMcpServers();
  const pluginsQuery = usePlugins();

  const featuredSkills = useMemo(() => (hubSkillsQuery.data?.skills ?? []).slice(0, 3), [hubSkillsQuery.data?.skills]);
  const featuredMcp = useMemo(
    () => (hubMcpQuery.data?.servers ?? []).filter((server) => server.verified).slice(0, 3),
    [hubMcpQuery.data?.servers],
  );
  const installedPlugins = useMemo(() => (pluginsQuery.data ?? []).slice(0, 3), [pluginsQuery.data]);
  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="h-full space-y-5 overflow-y-auto p-4 pb-8 lg:p-6 lg:pb-10">
      <section className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(7,52,85,0.14),rgba(9,70,104,0.08),rgba(233,200,25,0.08))] p-5 shadow-[var(--shadow-elevated)] lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">Marketplace</p>
                <h1 className="text-2xl font-semibold text-foreground">Discover what to add next</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Browse skills, MCP servers, and plugins from one place. Use the search bar for the full marketplace, then switch into a section only when you want local filters and deeper inventory controls.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <DiscoveryCard
              icon={Library}
              eyebrow="Skills"
              title="Reusable know-how"
              description="Install proven procedures, references, and templates for recurring work."
              meta={`${hubSkillsQuery.data?.skills.length ?? 0} discoverable now`}
              onOpen={() => {
                setView('discover');
                setActiveTab('skills');
              }}
            />
            <DiscoveryCard
              icon={Bot}
              eyebrow="MCP servers"
              title="Live tools"
              description="Connect external systems and tool surfaces through the MCP ecosystem."
              meta={`${hubMcpQuery.data?.servers.length ?? 0} listed right now`}
              onOpen={() => {
                setView('discover');
                setActiveTab('mcp-servers');
              }}
            />
            <DiscoveryCard
              icon={Puzzle}
              eyebrow="Plugins"
              title="Agent extensions"
              description="Add custom tool bundles, hooks, and runtime integrations when you need them."
              meta={`${pluginsQuery.data?.length ?? 0} installed in this workspace`}
              onOpen={() => {
                setView('installed');
                setActiveTab('plugins');
              }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">Marketplace search</p>
          <p className="mt-1 text-sm text-muted-foreground">This searches across skills, MCP servers, and plugins. Any extra search controls below only filter the current section.</p>
        </div>
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search the full marketplace catalog…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background/80 py-2.5 pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      {isSearching ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Searching across the marketplace</span>
            <span className="text-sm text-muted-foreground">Results for “{debouncedQuery}” are grouped by type so discovery and inventory do not blur together.</span>
          </div>

          {searchQuery.isLoading ? <CardSkeletonGrid /> : null}

          {searchQuery.isError ? (
            <ErrorState
              title="Search failed"
              error={searchQuery.error}
              description="We could not load marketplace results right now. Try again in a moment."
            />
          ) : null}

          {searchQuery.data && searchQuery.data.total === 0 ? (
            <EmptyState
              title="No marketplace results"
              description={<>No results found for “{debouncedQuery}”. Try a broader term or clear the marketplace search.</>}
            />
          ) : null}

          {searchQuery.data && searchQuery.data.skills.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Library className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Skills</h2>
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-2xs text-muted-foreground">{searchQuery.data.skills.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.skills.map((skill) => (
                  <SkillDiscoveryCard key={skill.id} skill={skill} />
                ))}
              </div>
            </div>
          ) : null}

          {searchQuery.data && searchQuery.data.mcpServers.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">MCP servers</h2>
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-2xs text-muted-foreground">{searchQuery.data.mcpServers.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.mcpServers.map((server) => (
                  <McpDiscoveryCard key={server.id} server={server} />
                ))}
              </div>
            </div>
          ) : null}

          {searchQuery.data && searchQuery.data.plugins.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Plugins</h2>
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-2xs text-muted-foreground">{searchQuery.data.plugins.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.plugins.map((plugin) => (
                  <PluginDiscoveryCard key={plugin.id} plugin={plugin} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setView('discover')}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition',
                view === 'discover' ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border/70 text-muted-foreground hover:bg-card',
              )}
            >
              <Sparkles className="h-4 w-4" />
              Discover
            </button>
            <button
              type="button"
              onClick={() => setView('installed')}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition',
                view === 'installed' ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border/70 text-muted-foreground hover:bg-card',
              )}
            >
              <Wrench className="h-4 w-4" />
              Installed inventory
            </button>
          </section>

          {view === 'discover' ? (
            <div className="space-y-6">
              <section className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-3 xl:col-span-2">
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Featured skills</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Start with reusable instructions and references before you reach for lower-level wiring.</p>
                  {hubSkillsQuery.isLoading ? <CardSkeletonGrid /> : null}
                  {!hubSkillsQuery.isLoading && featuredSkills.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {featuredSkills.map((skill) => (
                        <SkillDiscoveryCard key={skill.id} skill={skill} />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Plugin posture</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Plugins are the most opinionated extensions. Keep them secondary to discovery, but visible when you need deeper customization.</p>
                  {installedPlugins.length ? (
                    <div className="space-y-4">
                      {installedPlugins.map((plugin) => (
                        <PluginDiscoveryCard key={plugin.id} plugin={plugin} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No plugins installed yet"
                      description="Use plugins when you need custom tool bundles, lifecycle hooks, or repo-based extensions. They stay secondary to skills and MCP discovery by design."
                    />
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Recommended MCP servers</h2>
                </div>
                <p className="text-sm text-muted-foreground">These cards surface trust, transport, and tool scope before you dive into the full catalog.</p>
                {hubMcpQuery.isLoading ? <CardSkeletonGrid /> : null}
                {!hubMcpQuery.isLoading && featuredMcp.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {featuredMcp.map((server) => (
                      <McpDiscoveryCard key={server.id} server={server} />
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-[var(--shadow-card)]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition',
                      activeTab === id ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border/70 text-muted-foreground hover:bg-card',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {view === 'discover' ? currentTab.discoverLabel : currentTab.inventoryLabel} Local controls below only affect this section.
              </p>
            </div>

            <Suspense fallback={<CardSkeletonGrid />}>
              {activeTab === 'skills' ? <SkillsScreen /> : null}
              {activeTab === 'mcp-servers' ? <McpHub /> : null}
              {activeTab === 'plugins' ? <PluginsScreen /> : null}
            </Suspense>
          </section>
        </>
      )}
    </div>
  );
}
