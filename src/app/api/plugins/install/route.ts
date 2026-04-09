import { NextResponse } from 'next/server';
import { installPlugin } from '@/server/hermes/real-plugins';

const IDENTIFIER_RE = /^[a-zA-Z0-9@][a-zA-Z0-9._/-]*$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { identifier?: string; repo?: string };
    const identifier = body.identifier ?? body.repo;

    if (!identifier || !IDENTIFIER_RE.test(identifier)) {
      return NextResponse.json(
        { error: 'Invalid or missing identifier' },
        { status: 400 },
      );
    }

    await installPlugin(identifier);
    return NextResponse.json({ success: true, identifier });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to install plugin' },
      { status: 500 },
    );
  }
}
