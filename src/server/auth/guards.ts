import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/server/auth/session';

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    redirect('/chat');
  }
  return session;
}

export async function requireApiAuth() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}
