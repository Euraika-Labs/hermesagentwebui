import { NextResponse } from 'next/server';
import { installHubMcpServer } from '@/server/hermes/hub-mcp';

const IDENTIFIER_RE = /^[a-zA-Z0-9@][a-zA-Z0-9._/-]*$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      identifier: string;
      name?: string;
      env?: Record<string, string>;
    };

    if (!body.identifier || !IDENTIFIER_RE.test(body.identifier)) {
      return NextResponse.json(
        { error: 'Invalid or missing identifier' },
        { status: 400 },
      );
    }

    const result = await installHubMcpServer(body.identifier, { env: body.env });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Install failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, identifier: body.identifier });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to install MCP server' },
      { status: 500 },
    );
  }
}
