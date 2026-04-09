'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Menu, PanelRightOpen, Plus, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ProfileSwitcher } from '@/features/profiles/components/profile-switcher';
import { useRuntimeStatus } from '@/features/settings/api/use-runtime-status';
import { useUIStore } from '@/lib/store/ui-store';
import { cn } from '@/lib/utils';

const pageMeta: Record<string, { eyebrow: string; title: string; description: string }> = {
  '/': {
    eyebrow: 'Workspace',
    title: 'Pan workspace',
    description: 'Chat, tools, approvals, skills, and runtime context stay visible in one place.',
  },
  '/chat': {
    eyebrow: 'Workspace',
    title: 'Pan workspace',
    description: 'Chat, tools, approvals, skills, and runtime context stay visible in one place.',
  },
  '/skills': {
    eyebrow: 'Library',
    title: 'Skills and reusable workflows',
    description: 'Browse, inspect, and curate skills without losing runtime visibility.',
  },
  '/extensions': {
    eyebrow: 'Extensions',
    title: 'Plugins and MCP integrations',
    description: 'See extension health, auth posture, and runtime compatibility at a glance.',
  },
  '/memory': {
    eyebrow: 'Memory',
    title: 'User and agent memory',
    description: 'Understand what the agent remembers and what context is active in chat.',
  },
  '/settings': {
    eyebrow: 'Settings',
    title: 'Runtime and governance controls',
    description: 'Configuration, approvals, and runtime diagnostics.',
  },
};

function resolvePageMeta(pathname: string) {
  if (pathname.startsWith('/settings')) return pageMeta['/settings'];
  return pageMeta[pathname] ?? pageMeta['/'];
}

export function Topbar() {
  const pathname = usePathname();
  const { toggleMobileNav, openRightDrawer, activeSessionId } = useUIStore();
  const runtimeQuery = useRuntimeStatus();
  const runtimeConnected = runtimeQuery.data?.apiReachable ?? false;
  const runtime = runtimeQuery.data;
  const meta = resolvePageMeta(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 card-default px-4 py-3 shadow-[var(--shadow-soft)] lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggleMobileNav}
            className="rounded-2xl border border-border/70 bg-background/80 p-2 text-muted-foreground shadow-[var(--shadow-card)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]">
            H
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xs font-semibold uppercase tracking-label text-muted-foreground">{meta.eyebrow}</p>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium',
                  runtimeConnected ? 'border-success/30 bg-success/10 text-foreground' : 'border-warning/30 bg-warning/10 text-foreground',
                )}
              >
                <Activity className={cn('h-3 w-3', runtimeConnected ? 'text-success' : 'text-warning')} />
                {runtimeConnected ? 'Runtime live' : 'Runtime degraded'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-2xs font-medium text-foreground">
                <ShieldCheck className="h-3 w-3 text-approval" />
                {runtime?.profileContext?.label || 'Profile context loading'}
              </span>
              {activeSessionId ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                  Saved session
                </span>
              ) : null}
            </div>
            <div className="space-y-0.5">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{meta.title}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {runtime?.modelDefault
                  ? `${meta.description} Default model: ${runtime.modelDefault}${runtime.provider ? ` via ${runtime.provider}` : ''}.`
                  : meta.description}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ProfileSwitcher />
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)]"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Link>
          <span className="hidden h-5 w-px bg-border/70 lg:block" />
          <Link href="/settings/approvals" className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)]">
            Approvals
          </Link>
          <Link href="/settings/health" className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-card)]">
            Diagnostics
          </Link>
          <span className="hidden h-5 w-px bg-border/70 lg:block" />
          <button
            type="button"
            onClick={() => openRightDrawer('activity')}
            className="rounded-2xl border border-border/70 bg-background/80 p-2.5 text-muted-foreground shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:bg-card"
            aria-label="Open inspector"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
