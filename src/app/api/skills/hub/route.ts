import { NextResponse } from 'next/server';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { listRealSkills } from '@/server/hermes/real-skills';
import { listHubSkills, searchHubSkills } from '@/server/hermes/hub-skills';

export async function GET(request: Request) {
  await getSelectedProfileFromCookie();
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  // If search query provided, trigger a live search first
  let hubSkills = query ? await searchHubSkills(query) : listHubSkills();

  // Filter out already-installed skills
  const profileId = await getSelectedProfileFromCookie();
  const installedSkills = listRealSkills(profileId);
  const installedNames = new Set(installedSkills.map((s) => s.name));

  const discoverable = hubSkills.filter((h) => !installedNames.has(h.name));

  return NextResponse.json({ skills: discoverable, total: hubSkills.length, filtered: discoverable.length });
}
