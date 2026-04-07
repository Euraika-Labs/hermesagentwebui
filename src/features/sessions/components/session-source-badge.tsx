'use client';

import {
  Globe,
  Hash,
  HelpCircle,
  Mail,
  MessageCircle,
  MessageSquare,
  Monitor,
  Phone,
  Send,
  Terminal,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { SessionSource } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

type SourceMeta = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tailwind classes for the badge wrapper (ring + bg + fg). */
  classes: string;
};

const SOURCE_META: Record<SessionSource, SourceMeta> = {
  webui: {
    label: 'WebUI',
    icon: Monitor,
    classes: 'border-border/60 bg-muted/60 text-muted-foreground',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  },
  discord: {
    label: 'Discord',
    icon: Hash,
    classes: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  },
  telegram: {
    label: 'Telegram',
    icon: Send,
    classes: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  },
  signal: {
    label: 'Signal',
    icon: MessageSquare,
    classes: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  },
  slack: {
    label: 'Slack',
    icon: Hash,
    classes: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300',
  },
  matrix: {
    label: 'Matrix',
    icon: MessageSquare,
    classes: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
  },
  mattermost: {
    label: 'Mattermost',
    icon: MessageSquare,
    classes: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  },
  sms: {
    label: 'SMS',
    icon: Phone,
    classes: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  email: {
    label: 'Email',
    icon: Mail,
    classes: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  },
  cli: {
    label: 'CLI',
    icon: Terminal,
    classes: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  },
  api: {
    label: 'API',
    icon: Globe,
    classes: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  },
  unknown: {
    label: 'Unknown',
    icon: HelpCircle,
    classes: 'border-border/50 bg-muted/40 text-muted-foreground',
  },
};

export function getSourceMeta(source: SessionSource | undefined): SourceMeta {
  const key = (source ?? 'unknown') as SessionSource;
  return SOURCE_META[key] ?? SOURCE_META.unknown;
}

/** All known sources, used for filter chips. `webui` is always first. */
export const SESSION_SOURCES: SessionSource[] = [
  'webui',
  'whatsapp',
  'discord',
  'telegram',
  'signal',
  'slack',
  'matrix',
  'mattermost',
  'sms',
  'email',
  'cli',
  'api',
  'unknown',
];

type SessionSourceBadgeProps = {
  source: SessionSource | undefined;
  /** If true, renders only the icon in a compact square badge. */
  iconOnly?: boolean;
  className?: string;
};

export function SessionSourceBadge({ source, iconOnly, className }: SessionSourceBadgeProps) {
  const meta = getSourceMeta(source);
  const Icon = meta.icon;
  return (
    <span
      title={meta.label}
      aria-label={`Session source: ${meta.label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-3xs uppercase tracking-label',
        meta.classes,
        iconOnly && 'h-5 w-5 justify-center px-0',
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {iconOnly ? null : <span>{meta.label}</span>}
    </span>
  );
}
