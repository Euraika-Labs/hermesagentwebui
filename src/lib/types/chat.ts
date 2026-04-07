import type { Message } from '@/lib/types/message';
import type { ChatSource } from '@/lib/types/source';
import type { GovernanceStatus, ProvenanceLabel, RiskLevel } from '@/lib/types/runtime-status';

export type SessionSource =
  | 'webui'
  | 'whatsapp'
  | 'discord'
  | 'telegram'
  | 'signal'
  | 'slack'
  | 'matrix'
  | 'mattermost'
  | 'sms'
  | 'email'
  | 'cli'
  | 'api'
  | 'unknown';

export type ChatSessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
  preview?: string;
  workspaceLabel?: string;
  pinned?: boolean;
  archived?: boolean;
  parentSessionId?: string;
  source?: SessionSource;
};

export type ChatSessionSettings = {
  model: string;
  provider: string;
  policyPreset: 'safe-chat' | 'research' | 'builder' | 'full-power';
  memoryMode: 'standard' | 'minimal';
};

export type ChatSession = ChatSessionSummary & {
  messages: Message[];
  archived?: boolean;
  parentSessionId?: string;
  loadedSkillIds?: string[];
  settings: ChatSessionSettings;
};

export type ChatArtifact = {
  artifactId: string;
  artifactType: string;
  label: string;
  content?: string;
};

export type ChatSourceEvent = {
  type: 'source.emitted';
  source: ChatSource;
};

export type ChatStreamEvent =
  | { type: 'assistant.delta'; delta: string }
  | { type: 'run.phase'; phase: 'drafting' | 'tool-started' | 'waiting-approval' | 'completed'; label: string }
  | { type: 'tool.started'; toolCallId: string; toolName: string; riskLevel?: RiskLevel; provenance?: ProvenanceLabel }
  | {
      type: 'tool.awaiting_approval';
      toolCallId: string;
      toolName: string;
      summary: string;
      riskLevel?: RiskLevel;
      governance?: GovernanceStatus;
    }
  | { type: 'tool.completed'; toolCallId: string; toolName: string; output?: string; riskLevel?: RiskLevel }
  | ({ type: 'artifact.emitted' } & ChatArtifact)
  | ChatSourceEvent
  | { type: 'error'; message: string };
