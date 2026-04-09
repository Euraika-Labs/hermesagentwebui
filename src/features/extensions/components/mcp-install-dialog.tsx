'use client';

import { useCallback, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import type { McpHubServer } from '@/server/hermes/hub-mcp';
import { useInstallMcpServer } from '@/features/extensions/api/use-mcp-hub';
import { TrustBadge } from '@/features/extensions/components/trust-badge';

type McpInstallDialogProps = {
  server: McpHubServer | null;
  onClose: () => void;
};

type EnvValues = Record<string, string>;

function isSecretKey(name: string): boolean {
  const upper = name.toUpperCase();
  return upper.includes('SECRET') || upper.includes('TOKEN') || upper.includes('KEY');
}

export function McpInstallDialog({ server, onClose }: McpInstallDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [envValues, setEnvValues] = useState<EnvValues>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const installMutation = useInstallMcpServer();

  const requiredEnv = server?.requiredEnv ?? [];
  const hasEnvStep = requiredEnv.length > 0;

  const trustLevel = server?.verified ? 'verified' : 'community';

  const resetState = useCallback(() => {
    setStep(1);
    setEnvValues({});
    setError(null);
    setSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleInstall = useCallback(async () => {
    if (!server) return;
    setError(null);
    try {
      const result = await installMutation.mutateAsync({
        identifier: server.id || server.name,
        env: Object.keys(envValues).length > 0 ? envValues : undefined,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => handleClose(), 1500);
      } else {
        setError(result.error ?? 'Installation failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed.');
    }
  }, [server, envValues, installMutation, handleClose]);

  const handleNext = useCallback(() => {
    if (step === 1) {
      setStep(hasEnvStep ? 2 : 3);
    } else if (step === 2) {
      setStep(3);
    }
  }, [step, hasEnvStep]);

  const handleBack = useCallback(() => {
    if (step === 3) {
      setStep(hasEnvStep ? 2 : 1);
    } else if (step === 2) {
      setStep(1);
    }
  }, [step, hasEnvStep]);

  if (!server) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Install MCP Server</h3>
          <span className="text-xs text-muted-foreground">Step {step} of 3</span>
        </div>

        {/* Step 1: Server details */}
        {step === 1 ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border/70 bg-card/80 p-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{server.title || server.name}</h4>
                <TrustBadge level={trustLevel} />
              </div>
              {server.author ? (
                <p className="mt-1 text-2xs text-muted-foreground">by {server.author}</p>
              ) : null}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {server.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5">
                  Transport: {server.transport}
                </span>
                {server.version !== '0.0.0' ? (
                  <span className="rounded-full border border-border px-2 py-0.5">
                    v{server.version}
                  </span>
                ) : null}
                {server.tools.length > 0 ? (
                  <span className="rounded-full border border-border px-2 py-0.5">
                    {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''}
                  </span>
                ) : null}
                <span className="rounded-full border border-border px-2 py-0.5">
                  {server.category}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Step 2: Environment variables */}
        {step === 2 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Configure required environment variables for this server.
            </p>
            {requiredEnv.map((envVar) => (
              <div key={envVar.name}>
                <label className="block text-xs font-medium text-foreground">
                  {envVar.name}
                </label>
                {envVar.description ? (
                  <p className="mt-0.5 text-3xs text-muted-foreground">{envVar.description}</p>
                ) : null}
                <input
                  type={isSecretKey(envVar.name) ? 'password' : 'text'}
                  value={envValues[envVar.name] ?? ''}
                  onChange={(e) =>
                    setEnvValues((prev) => ({ ...prev, [envVar.name]: e.target.value }))
                  }
                  placeholder={envVar.name}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
            {requiredEnv.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No environment variables required.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Step 3: Confirm */}
        {step === 3 ? (
          <div className="mt-4 space-y-3">
            {success ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{server.title || server.name} installed successfully!</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Ready to install <span className="font-medium text-foreground">{server.title || server.name}</span>.
                </p>
                {server.installCommand ? (
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
                    {server.installCommand}
                  </div>
                ) : null}
                {Object.keys(envValues).length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Environment variables:</p>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(envValues).map(([key, value]) => (
                        <li key={key}>
                          <span className="font-mono">{key}</span> ={' '}
                          {isSecretKey(key) ? '••••••••' : value || '(empty)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}

            {error ? (
              <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
                {error}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Footer buttons */}
        <div className="mt-5 flex justify-between gap-2">
          <div>
            {step > 1 && !success ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-card"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              {success ? 'Done' : 'Cancel'}
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {step === 3 && !success ? (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {installMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Installing…
                  </>
                ) : (
                  'Install'
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
