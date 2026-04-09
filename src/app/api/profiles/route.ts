import { NextResponse } from 'next/server';
import { addAuditEvent } from '@/server/audit/audit-store';
import { PROFILE_COOKIE_NAME, getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { createRealProfile } from '@/server/hermes/real-profile-actions';
import { listRealProfiles } from '@/server/hermes/real-profiles';

export async function GET() {
  const activeProfile = await getSelectedProfileFromCookie();
  return NextResponse.json({ profiles: listRealProfiles(activeProfile) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; policyPreset?: 'safe-chat' | 'research' | 'builder' | 'full-power' };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
  }

  const name = body.name.trim();

  // Validate name format before calling CLI
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) {
    return NextResponse.json({ error: `Invalid profile name '${name}'. Must be lowercase alphanumeric, may include hyphens/underscores, and start with a letter or number (max 64 chars).` }, { status: 400 });
  }

  try {
    const profile = await createRealProfile(name, body.policyPreset);
    addAuditEvent('profile_created', 'profile', profile.id, `Created profile ${profile.name}.`);
    const response = NextResponse.json({ profile }, { status: 201 });
    response.cookies.set(PROFILE_COOKIE_NAME, profile.id, { path: '/' });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create profile';
    const isConflict = message.toLowerCase().includes('already exists');
    return NextResponse.json({ error: message }, { status: isConflict ? 409 : 500 });
  }
}
