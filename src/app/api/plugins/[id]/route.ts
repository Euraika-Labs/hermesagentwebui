import { NextResponse } from 'next/server';
import { getPluginDetail, removePlugin } from '@/server/hermes/real-plugins';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const plugin = await getPluginDetail(id);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }
    return NextResponse.json({ plugin });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get plugin' },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const plugin = await getPluginDetail(id);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    if (plugin.source === 'builtin') {
      return NextResponse.json({ error: 'Cannot remove a builtin plugin' }, { status: 403 });
    }

    await removePlugin(id);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove plugin' },
      { status: 500 },
    );
  }
}
