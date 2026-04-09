'use client';

import { useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { useInstallPlugin } from '@/features/plugins/api/use-plugins';

type InstallPluginDialogProps = {
  open: boolean;
  onClose: () => void;
};

const REPO_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9._-]+$/;

export function InstallPluginDialog({ open, onClose }: InstallPluginDialogProps) {
  const [repo, setRepo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const installPlugin = useInstallPlugin();

  if (!open) return null;

  const repoValid = REPO_PATTERN.test(repo);

  async function handleSubmit() {
    if (!repo.trim()) {
      setError('Repository is required.');
      return;
    }
    if (!repoValid) {
      setError('Invalid format. Use owner/repo (e.g. nousresearch/hermes-plugin-web).');
      return;
    }
    setError(null);
    try {
      await installPlugin.mutateAsync({ identifier: repo });
      setRepo('');
      setError(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  function handleClose() {
    setRepo('');
    setError(null);
    installPlugin.reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Install Plugin</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Install a plugin from a GitHub repository. Enter the owner and repo name.
        </p>

        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground">GitHub Repository</label>
          <input
            value={repo}
            onChange={(e) => {
              setRepo(e.target.value);
              setError(null);
            }}
            placeholder="owner/repo"
            className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 ${
              error ? 'border-red-500/70' : 'border-input'
            }`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
          />
          {repo && !repoValid && !error && (
            <p className="mt-1 text-xs text-amber-400">
              Format: owner/repo (e.g. nousresearch/hermes-plugin-web)
            </p>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {installPlugin.isSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Plugin installed successfully!
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={installPlugin.isPending || !repo.trim() || !repoValid}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {installPlugin.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {installPlugin.isPending ? 'Installing…' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
}
