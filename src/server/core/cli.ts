import { execFileSync } from 'node:child_process';
import { ServerBridgeError } from '@/server/core/python-exec';

/**
 * Allowlist of CLI executables that may be invoked by the server bridge.
 * Prevents shell-command-injection via environment or user input (CodeQL js/shell-command-injection-from-environment).
 */
const ALLOWED_COMMANDS = new Set(['hermes', 'bash', 'python3', 'node']);

export function execCli(command: string, args: string[], options?: { timeout?: number; suppressStderr?: boolean }) {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new ServerBridgeError('CLI execution blocked: command not in allowlist', { command, args });
  }
  try {
    return execFileSync(command, args, {
      encoding: 'utf-8',
      timeout: options?.timeout,
      stdio: options?.suppressStderr ? ['ignore', 'pipe', 'ignore'] : undefined,
    });
  } catch (error) {
    throw new ServerBridgeError('CLI execution failed', {
      command,
      args,
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
