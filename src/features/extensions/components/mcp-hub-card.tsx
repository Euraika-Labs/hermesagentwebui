'use client';

import { Download, ExternalLink, Globe } from 'lucide-react';
import type { McpHubServer } from '@/server/hermes/hub-mcp';
import { TrustBadge } from '@/features/extensions/components/trust-badge';

type McpHubCardProps = {
  server: McpHubServer;
  onInstall: (server: McpHubServer) => void;
};

function transportLabel(transport: 'stdio' | 'http'): string {
  return transport === 'stdio' ? 'stdio' : 'HTTP';
}

export function McpHubCard({ server, onInstall }: McpHubCardProps) {
  const trustLevel = server.verified ? 'verified' : 'community';

  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{server.title || server.name}</h3>
            <TrustBadge level={trustLevel} />
          </div>
          {server.author ? (
            <p className="mt-0.5 text-2xs text-muted-foreground">{server.author}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-lg bg-muted/50 px-2 py-0.5 text-3xs text-muted-foreground">
          {transportLabel(server.transport)}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-muted-foreground">
        {server.description}
      </p>

      {server.tools.length > 0 ? (
        <p className="mt-1.5 text-3xs text-muted-foreground">
          {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInstall(server);
          }}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Download className="mr-1 inline h-3 w-3" />
          Install
        </button>
        {server.repository ? (
          <a
            href={server.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/40"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="h-3 w-3" />
            Repo
          </a>
        ) : null}
        {server.websiteUrl ? (
          <a
            href={server.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/40"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            Site
          </a>
        ) : null}
      </div>
    </div>
  );
}
