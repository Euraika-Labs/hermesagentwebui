'use client';

import { useEffect, useState } from 'react';
import { Globe, User } from 'lucide-react';
import { useMemory, useUpdateMemory } from '@/features/memory/api/use-memory';

export function MemoryEditor({ scope }: { scope: 'user' | 'agent' }) {
  const memoryQuery = useMemory(scope);
  const updateMemory = useUpdateMemory(scope);
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);

  const data = memoryQuery.data;
  const profileEntries = data?.entries ?? [];
  const globalEntries = data?.globalEntries ?? [];
  const profileRaw = data?.raw ?? '';

  useEffect(() => {
    setValue(profileRaw);
  }, [profileRaw]);

  async function handleSave() {
    await updateMemory.mutateAsync(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Global memory (read-only view) */}
      {globalEntries.length > 0 ? (
        <section className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <h2 className="text-lg font-semibold">Global {scope === 'user' ? 'user' : 'agent'} memory</h2>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">shared</span>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-muted-foreground">
              <strong className="text-foreground">{globalEntries.length}</strong> {globalEntries.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Applies to all profiles. Stored at ~/.hermes/memories/. Read-only in this view.
          </p>
          <div className="mt-3 space-y-2">
            {globalEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/50 bg-background/60 p-3 text-sm leading-relaxed text-muted-foreground">
                {entry.content}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Profile-scoped memory (editable) */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Profile {scope === 'user' ? 'user' : 'agent'} memory</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scoped to the current profile. Editable. Use § on its own line to separate entries.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Entries:</strong> {profileEntries.length}</p>
            <p><strong className="text-foreground">Audience:</strong> {scope === 'user' ? 'About the user' : 'About Hermes and the environment'}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
          {scope === 'user'
            ? 'Keep only stable user preferences and facts that reduce future repetition. Avoid transient task details.'
            : 'Keep stable environment notes, conventions, and recurring workflow facts. Avoid one-off progress notes.'}
        </div>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-4 min-h-64 w-full rounded-2xl border border-border bg-background p-4 font-mono text-sm leading-6 outline-none focus:border-primary"
        />
        <div className="mt-4 flex items-center justify-end gap-3">
          {saved ? <span className="text-sm text-emerald-400">✓ Saved</span> : null}
          {updateMemory.isPending ? <span className="text-sm text-muted-foreground">Saving…</span> : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateMemory.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save {scope} memory
          </button>
        </div>
      </section>
    </div>
  );
}
