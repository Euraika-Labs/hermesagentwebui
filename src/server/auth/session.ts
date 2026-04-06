import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'hermes_workspace_session';
const SESSION_SECRET = process.env.HERMES_WORKSPACE_SESSION_SECRET ?? 'dev-secret-change-me';
const DEFAULT_USERNAME = process.env.HERMES_WORKSPACE_USERNAME ?? 'admin';
const DEFAULT_PASSWORD = process.env.HERMES_WORKSPACE_PASSWORD ?? 'changeme';

export type AuthSession = {
  username: string;
  role: 'admin';
};

function signValue(value: string) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

export function createSessionToken(username: string) {
  const signature = signValue(username);
  return `${username}.${signature}`;
}

export function verifyCredentials(username: string, password: string) {
  return username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD;
}

export function parseSessionToken(token?: string | null): AuthSession | null {
  if (!token) return null;
  const [username, signature] = token.split('.');
  if (!username || !signature) return null;
  if (signValue(username) !== signature) return null;
  return { username, role: 'admin' };
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Pan is a local-first tool — always served over HTTP on localhost.
  // Setting secure:true would prevent the auth cookie from being stored.
  secure: false,
  path: '/',
};
