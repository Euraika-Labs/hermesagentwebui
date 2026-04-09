import { NextResponse } from 'next/server';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { listHubMcpServers, searchHubMcpServers } from '@/server/hermes/hub-mcp';
import { listRealExtensions } from '@/server/hermes/real-extensions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');

    let servers;
    let total: number;

    if (q) {
      const result = await searchHubMcpServers(q);
      servers = result.servers;
      total = result.total;
    } else {
      servers = await listHubMcpServers();
      total = servers.length;
    }

    // Filter out already-installed servers
    const profileId = await getSelectedProfileFromCookie();
    const installed = listRealExtensions(profileId);
    const installedNames = new Set(installed.map((e) => e.name));
    const filtered = servers.filter((s) => !installedNames.has(s.name));

    return NextResponse.json({ servers: filtered, total, filtered: filtered.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list hub MCP servers' },
      { status: 500 },
    );
  }
}
