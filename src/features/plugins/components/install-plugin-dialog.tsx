'use client';

import { useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { useInstallPlugin } from '@/features/plugins/api/use-plugins';

type InstallPluginDialogProps = {
  open: boolean;
  onClose: () => void;
};

const REPO_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9._-]+$/;

function normalizeInstallError(error: string) {
  const lower = error.toLowerCase();

  if (lower.includes('plugin.yaml')) {
    return 'This repository cloned successfully, but it is not a valid Hermes plugin yet. A valid plugin repo must include a plugin.yaml manifest.';
  }

  if (lower.includes('__init__.py')) {
    return 'This repository is missing the required __init__.py plugin entrypoint, so Pan cannot treat it as a real plugin.';
  }

  if (lower.includes('already exists') || lower.includes('already installed')) {
    return 'That plugin is already installed in this workspace.';
  }

  return error;
}

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
      setError('Invalid format. Use owner/repo (for example nousresearch/hermes-plugin-web).');
      return;
    }
    setError(null);
    try {
      await installPlugin.mutateAsync({ identifier: repo.trim() });
      setRepo('');
      setError(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(normalizeInstallError(msg));
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
          <h3 className="text-lg font-semibold">Install plugin</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Install a repo-based plugin when you need custom hooks or tool bundles beyond MCP servers and built-in integrations.
        </p>

        <div className="mt-4 rounded-xl border border-border/70 bg-card/60 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What counts as a valid plugin repo?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
            <li>Use the GitHub format <span className="font-medium text-foreground">owner/repo</span>.</li>
            <li>The repository must contain a <span className="font-medium text-foreground">plugin.yaml</span> manifest.</li>
            <li>The repository must also include the required <span className="font-medium text-foreground">__init__.py</span> entrypoint.</li>
          </ul>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-muted-foreground">GitHub repository</label>
          <input
            value={repo}
            onChange={(event) => {
              setRepo(event.target.value);
              setError(null);
            }}
            placeholder="owner/repo"
            className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 ${
              error ? 'border-red-500/70' : 'border-input'
            }`}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSubmit();
            }}
          />
          {repo && !repoValid && !error ? (
            <p className="mt-1 text-xs text-amber-400">Format: owner/repo (for example nousresearch/hermes-plugin-web)</p>
          ) : null}
          {!repo && !error ? (
            <p className="mt-1 text-xs text-muted-foreground">Pan validates the repo before counting the install as successful.</p>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {installPlugin.isSuccess ? (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Plugin installed successfully.
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={handleClose} className="rounded-lg border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={installPlugin.isPending || !repo.trim() || !repoValid}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {installPlugin.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {installPlugin.isPending ? 'Installing…' : 'Install plugin'}
          </button>
        </div>
      </div>
    </div>
  );
}
