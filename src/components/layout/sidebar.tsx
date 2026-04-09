'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Bot, Brain, FolderTree, Library, MessageSquare, Puzzle, Settings, Store } from 'lucide-react';
import { useUIStore } from '@/lib/store/ui-store';
import { cn } from '@/lib/utils';
import { UpdateBanner } from './update-banner';

const navItems = [
  { href: '/chat', label: 'Chat', icon: MessageSquare, description: 'Your chats and chat history' },
  { href: '/marketplace', label: 'Marketplace', icon: Store, description: 'Discover skills, MCP servers, and plugins before you install them' },
  { href: '/skills', label: 'Skills', icon: Library, description: 'Reusable procedures, references, and local skill edits' },
  { href: '/extensions', label: 'Integrations', icon: Bot, description: 'Live integrations, MCP servers, available tools, approvals, and diagnostics' },
  { href: '/plugins', label: 'Plugins', icon: Puzzle, description: 'Repo-based extensions for custom hooks and bundled tools' },
  { href: '/memory', label: 'Memory', icon: Brain, description: 'User memory, agent memory, context, and chat history' },
  { href: '/profiles', label: 'Profiles', icon: FolderTree, description: 'Active profile, defaults, policies, and access' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Runtime, diagnostics, and environment controls' },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skillPathMatch = pathname.match(/^\/skills\/([^/?#]+)/);
  const loadedSkillHint = skillPathMatch?.[1] ?? searchParams.get('loadedSkill');
  const { mobileNavOpen, toggleMobileNav, activeSessionId } = useUIStore();

  const nav = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground shadow-[var(--shadow-card)] euraika-flow-gradient">
              <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 8h20a14 14 0 0 1 0 28H24v20h-10V8Z" fill="#FEFFEF"/>
                <path d="M24 18h9a6 6 0 0 1 0 12h-9V18Z" fill="#073455" fillOpacity="0.3"/>
                <rect x="14" y="58" width="24" height="4" rx="2" fill="#E9C819"/>
              </svg>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-label text-muted-foreground">by Euraika</p>
            <h1 className="text-lg font-semibold">Pan</h1>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Your AI workspace — chat, skills, integrations, memory, and runtime controls in one place.</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon, description }) => {
          const targetHref = href === '/chat' && activeSessionId
            ? `/chat?session=${encodeURIComponent(activeSessionId)}${loadedSkillHint ? `&loadedSkill=${encodeURIComponent(loadedSkillHint)}` : ''}`
            : href === '/skills' && activeSessionId
              ? `/skills?session=${encodeURIComponent(activeSessionId)}`
              : href;
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={targetHref}
              aria-label={label === 'Integrations' ? 'Integrations' : label === 'Chat' ? 'Workspace chat' : label}
              onClick={() => {
                if (mobileNavOpen) toggleMobileNav();
              }}
              className={cn(
                'group flex items-start gap-3 rounded-2xl px-3 py-3 text-sm transition',
                active
                  ? 'border-l-[3px] border-l-accent bg-primary/8 text-foreground'
                  : 'border-l-[3px] border-l-transparent text-muted-foreground hover:border-border/60 hover:bg-card/40 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl transition',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted/50 text-muted-foreground group-hover:bg-background group-hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{label}</span>
                <span className={cn('mt-1 block text-xs leading-5 text-muted-foreground', active ? 'block' : 'hidden group-hover:block')}>
                  {description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <UpdateBanner />

      <div className="mt-auto px-4 pb-4 pt-2 text-xs leading-5 text-muted-foreground">
        Chat, skills, integrations, profiles, and settings share one workspace shell. Chat history stays separate so the UI feels like a workspace, not a page list.
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-80 shrink-0 border-r border-border/70 bg-surface/70 backdrop-blur-xl lg:block">{nav}</aside>
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden" onClick={toggleMobileNav}>
          <aside className="h-full w-80 border-r border-border/70 bg-background/95 shadow-[var(--shadow-elevated)]" onClick={(e) => e.stopPropagation()}>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
