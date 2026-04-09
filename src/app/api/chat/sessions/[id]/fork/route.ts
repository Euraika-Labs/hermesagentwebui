import { NextResponse } from 'next/server';
import { forkSession } from '@/server/chat/session-store';
import { requireApiAuth } from '@/server/auth/guards';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { forkRealSession, getRealSession } from '@/server/hermes/real-sessions';

const mockMode = process.env.HERMES_MOCK_MODE === 'true';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const profileId = await getSelectedProfileFromCookie();
    const realSession = getRealSession(profileId, id);
    const session = realSession ? forkRealSession(profileId, id).session : mockMode ? forkSession(id) : null;
    if (!session) throw new Error('Session not found');
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to fork session' }, { status: 404 });
  }
}
