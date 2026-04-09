'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import { useHubMcpServers } from '@/features/extensions/api/use-mcp-hub';
import { McpHubCard } from '@/features/extensions/components/mcp-hub-card';
import { McpInstallDialog } from '@/features/extensions/components/mcp-install-dialog';
import type { McpHubServer } from '@/server/hermes/hub-mcp';
import featuredNames from '@/features/extensions/data/featured-mcp-servers.json';

const FEATURED_SET = new Set(featuredNames);

export function McpHub() {
  const [subTab, setSubTab] = useState<'featured' | 'all'>('featured');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [installTarget, setInstallTarget] = useState<McpHubServer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchInput]);

  const hubQuery = useHubMcpServers(debouncedQuery || undefined);
  const allServers = hubQuery.data?.servers ?? [];

  const displayedServers = useMemo(() => {
    if (subTab === 'featured') {
      return allServers.filter((s) => FEATURED_SET.has(s.name) || FEATURED_SET.has(s.npmPackage ?? ''));
    }
    return allServers;
  }, [allServers, subTab]);

  return (
    <div className="space-y-4">
      {/* Sub-tabs and search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab('featured')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              subTab === 'featured'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border/70 text-muted-foreground hover:bg-card'
            }`}
          >
            <Star className="mr-1 inline h-3.5 w-3.5" />
            Featured
          </button>
          <button
            type="button"
            onClick={() => setSubTab('all')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              subTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border/70 text-muted-foreground hover:bg-card'
            }`}
          >
            All Servers
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search MCP servers…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-border/70 bg-background/80 py-2 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Loading */}
      {hubQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card/60"
            />
          ))}
        </div>
      ) : null}

      {/* Error */}
      {hubQuery.isError ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
          Failed to load MCP servers. {hubQuery.error instanceof Error ? hubQuery.error.message : 'Unknown error.'}
        </div>
      ) : null}

      {/* Empty */}
      {!hubQuery.isLoading && !hubQuery.isError && displayedServers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
          {debouncedQuery
            ? `No MCP servers found for "${debouncedQuery}". Try a different search term.`
            : subTab === 'featured'
              ? 'No featured servers found. The MCP hub cache may need to populate — it syncs automatically in the background.'
              : 'No MCP servers found. The hub cache may need to populate — it syncs automatically in the background.'}
        </div>
      ) : null}

      {/* Grid */}
      {!hubQuery.isLoading && displayedServers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayedServers.map((server) => (
            <McpHubCard
              key={server.id}
              server={server}
              onInstall={(s) => setInstallTarget(s)}
            />
          ))}
        </div>
      ) : null}

      {/* Install dialog */}
      <McpInstallDialog
        server={installTarget}
        onClose={() => setInstallTarget(null)}
      />
    </div>
  );
}
