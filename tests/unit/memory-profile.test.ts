import { describe, expect, it } from 'vitest';
import { getContextInspector, getMemory, sessionSearch, updateMemory } from '@/server/memory/memory-store';
import { activateProfile, createProfile, listProfiles, updateProfilePolicy } from '@/server/profiles/profile-store';
import { createSession, updateSessionSettings } from '@/server/chat/session-store';

describe('memory and profile stores', () => {
  it('updates and returns memory entries', () => {
    const entries = updateMemory('user', 'first line\nsecond line');
    expect(entries).toHaveLength(2);
    expect(getMemory('user')[0].content).toBe('first line');
  });

  it('supports session search and context inspector', () => {
    const session = createSession();
    updateSessionSettings(session.id, { model: 'claude-opus-4.6', policyPreset: 'builder' });
    const results = sessionSearch('new chat');
    expect(Array.isArray(results)).toBe(true);

    const context = getContextInspector('profile-1', session.id);
    expect(context.activeSessionId).toBe(session.id);
    expect(context.model).toBe('claude-opus-4.6');
  });

  it('creates, activates, and updates profile policy', () => {
    const profile = createProfile('research-lab', 'research');
    expect(listProfiles().some((item) => item.id === profile.id)).toBe(true);
    const activated = activateProfile(profile.id);
    expect(activated.active).toBe(true);
    const updated = updateProfilePolicy(profile.id, 'full-power');
    expect(updated.policyPreset).toBe('full-power');
  });
});
