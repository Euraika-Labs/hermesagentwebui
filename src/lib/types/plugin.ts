export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  source: 'user' | 'builtin' | 'pip';
  installed: boolean;
  enabled: boolean;
  requiredEnv: string[];
  providedTools: string[];
  providedHooks: string[];
  gitUrl?: string;
  path: string;
}
