import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function runHermes(args: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync('hermes', args, { encoding: 'utf-8', timeout: 15000 });
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const combined = [e.stderr, e.stdout, e.message].filter(Boolean).join('\n');
    // Look for "Error: ..." line from the CLI
    const match = combined.match(/Error:\s*(.+)/);
    if (match) return { ok: false, error: match[1].replace(/\s+at\s+\/.*$/, '').trim() };
    return { ok: false, error: combined.slice(0, 200) };
  }
}

export async function createRealProfile(name: string, _policyPreset: 'safe-chat' | 'research' | 'builder' | 'full-power' = 'safe-chat') {
  const result = await runHermes(['profile', 'create', name]);
  if (!result.ok) throw new Error(result.error ?? 'Failed to create profile');
  return { id: name, name, policyPreset: _policyPreset };
}

export async function cloneRealProfile(profileId: string) {
  const cloneName = `${profileId}-copy`;
  const result = await runHermes(['profile', 'create', cloneName, '--clone-from', profileId, '--clone-all', '--no-alias']);
  if (!result.ok) throw new Error(result.error ?? 'Failed to clone profile');
  return { id: cloneName, name: cloneName };
}

export async function deleteRealProfile(profileId: string) {
  const result = await runHermes(['profile', 'delete', profileId, '-y']);
  if (!result.ok) throw new Error(result.error ?? 'Failed to delete profile');
}

export async function activateRealProfile(profileId: string) {
  const result = await runHermes(['profile', 'use', profileId]);
  if (!result.ok) throw new Error(result.error ?? 'Failed to activate profile');
}
