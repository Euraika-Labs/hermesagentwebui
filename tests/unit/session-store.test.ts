import { describe, expect, it } from 'vitest';
import {
  addAssistantMessage,
  addUserMessage,
  archiveSession,
  createSession,
  forkSession,
  getSession,
  listSessions,
  renameSession,
  updateSessionSettings,
} from '@/server/chat/session-store';

describe('session store', () => {
  it('creates sessions and appends messages', () => {
    const session = createSession();
    addUserMessage(session.id, 'Hello Pan');
    addAssistantMessage(session.id, 'Hi there');

    const updated = getSession(session.id);
    expect(updated?.messages).toHaveLength(2);
    expect(updated?.title).toContain('Hello Pan');
  });

  it('lists sessions in descending updated order', () => {
    const sessions = listSessions();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0]).toHaveProperty('id');
  });

  it('can rename, archive, fork, search, and update settings', () => {
    const session = createSession();
    addUserMessage(session.id, 'Sprint three search term');
    renameSession(session.id, 'Renamed session');
    updateSessionSettings(session.id, { model: 'claude-opus-4.6', policyPreset: 'builder' });
    archiveSession(session.id);

    const updated = getSession(session.id);
    expect(updated?.title).toBe('Renamed session');
    expect(updated?.archived).toBe(true);
    expect(updated?.settings.model).toBe('claude-opus-4.6');
    expect(updated?.settings.policyPreset).toBe('builder');

    const forked = forkSession(session.id);
    expect(forked.parentSessionId).toBe(session.id);
    expect(forked.messages.length).toBe(updated?.messages.length);

    const searched = listSessions('search term');
    expect(searched.some((item) => item.id === session.id)).toBe(true);
  });
});
