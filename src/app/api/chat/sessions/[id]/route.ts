import { NextResponse } from 'next/server';
import { archiveSession, deleteSession, getSession, renameSession, updateSessionSettings } from '@/server/chat/session-store';
import { requireApiAuth } from '@/server/auth/guards';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { archiveRealSession, deleteRealSession, getRealSession, renameRealSession, updateRealSessionSettings } from '@/server/hermes/real-sessions';

const mockMode = process.env.HERMES_MOCK_MODE === 'true';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const profileId = await getSelectedProfileFromCookie();
  const session = getRealSession(profileId, id) ?? (mockMode ? getSession(id) : null);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    archived?: boolean;
    settings?: { model?: string; provider?: string; policyPreset?: 'safe-chat' | 'research' | 'builder' | 'full-power'; memoryMode?: 'standard' | 'minimal' };
  };

  try {
    const profileId = await getSelectedProfileFromCookie();
    const isReal = Boolean(getRealSession(profileId, id));
    let session = isReal ? getRealSession(profileId, id) : mockMode ? getSession(id) : null;
    if (!session && !isReal) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (typeof body.title === 'string') {
      session = isReal ? renameRealSession(profileId, id, body.title).session : renameSession(id, body.title);
    }

    if (body.archived === true) {
      session = isReal ? archiveRealSession(profileId, id).session : archiveSession(id);
    }

    if (body.settings) {
      session = isReal ? updateRealSessionSettings(profileId, id, body.settings).session : updateSessionSettings(id, body.settings);
    }

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update session' }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const profileId = await getSelectedProfileFromCookie();
    if (getRealSession(profileId, id)) {
      deleteRealSession(profileId, id);
    } else if (mockMode) {
      deleteSession(id);
    } else {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete session' }, { status: 404 });
  }
}
