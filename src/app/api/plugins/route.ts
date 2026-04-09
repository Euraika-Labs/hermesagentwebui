import { NextResponse } from 'next/server';
import { listRealPlugins } from '@/server/hermes/real-plugins';

export async function GET() {
  try {
    const plugins = await listRealPlugins();
    return NextResponse.json({ plugins });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list plugins' },
      { status: 500 },
    );
  }
}
