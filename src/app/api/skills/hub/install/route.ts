import { NextResponse } from 'next/server';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { installHubSkill } from '@/server/hermes/hub-skills';

export async function POST(request: Request) {
  await getSelectedProfileFromCookie();
  const body = await request.json() as { identifier: string; category?: string };

  if (!body.identifier) {
    return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
  }

  const result = await installHubSkill(body.identifier, body.category);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Install failed' }, { status: 500 });
  }
  return NextResponse.json({ success: true, identifier: body.identifier });
}
