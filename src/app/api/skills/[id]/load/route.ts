import { NextResponse } from 'next/server';
import { loadSkillIntoSession } from '@/server/skills/skill-store';
import { updateSession } from '@/server/chat/session-store';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { addRealSessionLoadedSkill, getRealSession } from '@/server/hermes/real-sessions';
import { getRealSkill } from '@/server/hermes/real-skills';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  try {
    const profileId = await getSelectedProfileFromCookie();
    const realSkill = getRealSkill(profileId, id);
    const realSession = getRealSession(profileId, body.sessionId);

    const skill = realSkill
      ? {
          ...realSkill,
          loadedInSessions: Array.from(
            new Set([...(realSkill.loadedInSessions ?? []), body.sessionId]),
          ),
        }
      : loadSkillIntoSession(id, body.sessionId);

    if (realSession) {
      addRealSessionLoadedSkill(profileId, body.sessionId, id);
    } else {
      updateSession(body.sessionId, (session) => {
        const loadedSkillIds = session.loadedSkillIds ?? [];
        if (!loadedSkillIds.includes(id)) {
          session.loadedSkillIds = [id, ...loadedSkillIds];
        }
      });
    }

    return NextResponse.json({ skill });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load skill into session' }, { status: 404 });
  }
}
