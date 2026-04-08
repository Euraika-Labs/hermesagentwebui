'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bot, Library, Puzzle, Search, Store, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceSearch } from '@/features/marketplace/api/use-marketplace-search';

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

const tabs: { id: Tab; label: string; icon: typeof Library }[] = [
  { id: 'skills', label: 'Skills', icon: Library },
  { id: 'mcp-servers', label: 'MCP Servers', icon: Bot },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
];

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card/60"
        />
      ))}
    </div>
  );
}

export function MarketplaceScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('skills');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input by 300ms
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

  return (
    <div className="h-full overflow-y-auto space-y-5 p-4 pb-8 lg:p-6 lg:pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Discover and install extensions
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search skills, MCP servers, and plugins…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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

      {/* Tabs (only shown when not searching) */}
      {!isSearching ? (
        <div className="flex gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition',
                activeTab === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border/70 text-muted-foreground hover:bg-card',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Search results */}
      {isSearching ? (
        <div className="space-y-6">
          {searchQuery.isLoading ? <LoadingGrid /> : null}

          {searchQuery.isError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-foreground">
              Search failed.{' '}
              {searchQuery.error instanceof Error
                ? searchQuery.error.message
                : 'Unknown error.'}
            </div>
          ) : null}

          {searchQuery.data && searchQuery.data.total === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
              No results found for &ldquo;{debouncedQuery}&rdquo;. Try a different search term.
            </div>
          ) : null}

          {searchQuery.data && searchQuery.data.skills.length > 0 ? (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Library className="h-4 w-4 text-primary" />
                Skills
                <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {searchQuery.data.skills.length}
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                  >
                    <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {skill.description}
                    </p>
                    {skill.tags?.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {searchQuery.data && searchQuery.data.mcpServers.length > 0 ? (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bot className="h-4 w-4 text-primary" />
                MCP Servers
                <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {searchQuery.data.mcpServers.length}
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.mcpServers.map((server) => (
                  <div
                    key={server.id}
                    className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                  >
                    <h3 className="truncate text-sm font-semibold">{server.title || server.name}</h3>
                    <p className="mt-0.5 text-2xs text-muted-foreground">{server.author}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {server.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {searchQuery.data && searchQuery.data.plugins.length > 0 ? (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Puzzle className="h-4 w-4 text-primary" />
                Plugins
                <span className="rounded-lg bg-muted/60 px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {searchQuery.data.plugins.length}
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchQuery.data.plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                  >
                    <h3 className="truncate text-sm font-semibold">{plugin.name}</h3>
                    <p className="mt-0.5 text-2xs text-muted-foreground">v{plugin.version}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {plugin.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Tab content (browse mode — not searching) */}
      {!isSearching ? (
        <Suspense fallback={<LoadingGrid />}>
          {activeTab === 'skills' ? <SkillsScreen /> : null}
          {activeTab === 'mcp-servers' ? <McpHub /> : null}
          {activeTab === 'plugins' ? <PluginsScreen /> : null}
        </Suspense>
      ) : null}
    </div>
  );
}
