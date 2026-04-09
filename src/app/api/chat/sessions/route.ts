import { NextResponse } from 'next/server';
import { createSession, listSessions } from '@/server/chat/session-store';
import { requireApiAuth } from '@/server/auth/guards';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { createRealSession, listRealSessions } from '@/server/hermes/real-sessions';

const mockMode = process.env.HERMES_MOCK_MODE === 'true';

export async function GET(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const profileId = await getSelectedProfileFromCookie();
  const realSessions = listRealSessions(profileId, search);
  if (realSessions.length > 0 || !mockMode) {
    return NextResponse.json({ sessions: realSessions });
  }
  return NextResponse.json({ sessions: listSessions(search) });
}

export async function POST() {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const profileId = await getSelectedProfileFromCookie();
  try {
    const { session } = createRealSession(profileId);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (!mockMode) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create session' }, { status: 503 });
    }
    const session = createSession();
    return NextResponse.json({ session }, { status: 201 });
  }
}
