import { NextResponse } from 'next/server';
import { addAuditEvent } from '@/server/audit/audit-store';
import { PROFILE_COOKIE_NAME } from '@/server/hermes/profile-cookie';
import { activateRealProfile, cloneRealProfile, deleteRealProfile } from '@/server/hermes/real-profile-actions';
import { updateRealProfilePolicy } from '@/server/hermes/real-profiles';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: 'activate' | 'clone'; policyPreset?: 'safe-chat' | 'research' | 'builder' | 'full-power' };

  try {
    if (body.action === 'clone') {
      const profile = await cloneRealProfile(id);
      addAuditEvent('profile_cloned', 'profile', profile.id, `Cloned profile ${profile.name}.`);
      return NextResponse.json({ profile });
    }

    if (body.policyPreset) {
      updateRealProfilePolicy(id, body.policyPreset);
      const profile = { id, name: id, policyPreset: body.policyPreset };
      addAuditEvent('profile_policy_updated', 'profile', profile.id, `Updated policy preset for ${profile.name} to ${body.policyPreset}.`);
      return NextResponse.json({ profile });
    }

    activateRealProfile(id);
    const profile = { id, name: id, active: true };
    addAuditEvent('profile_activated', 'profile', profile.id, `Activated profile ${profile.name}.`);
    const response = NextResponse.json({ profile });
    response.cookies.set(PROFILE_COOKIE_NAME, id, { path: '/' });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update profile' }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteRealProfile(id);
    const profile = { id, name: id };
    addAuditEvent('profile_deleted', 'profile', profile.id, `Deleted profile ${profile.name}.`);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete profile' }, { status: 404 });
  }
}
