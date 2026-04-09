import { NextResponse } from 'next/server';
import { getPluginDetail, togglePluginEnabled } from '@/server/hermes/real-plugins';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = (await request.json()) as { enabled: boolean };

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid "enabled" field' }, { status: 400 });
    }

    const plugin = await getPluginDetail(id);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    await togglePluginEnabled(id, body.enabled);
    return NextResponse.json({ success: true, id, enabled: body.enabled });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle plugin' },
      { status: 500 },
    );
  }
}
