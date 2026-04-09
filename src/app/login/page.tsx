import { redirect } from 'next/navigation';
import { Bot, FolderTree, Library, Puzzle, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/login-form';
import { getAuthSession } from '@/server/auth/session';

const workspaceConcepts = [
  {
    title: 'Skills',
    description: 'Reusable procedures, references, and templates you can load into a chat when the task needs structure.',
    icon: Library,
  },
  {
    title: 'MCP servers',
    description: 'Live tool connections that let the agent reach external systems and actions.',
    icon: Bot,
  },
  {
    title: 'Plugins',
    description: 'Repo-based runtime extensions for deeper hooks, packaged tools, and custom behavior.',
    icon: Puzzle,
  },
  {
    title: 'Profiles',
    description: 'Separate defaults, memory, and runtime posture so different contexts stay cleanly isolated.',
    icon: FolderTree,
  },
];

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) {
    redirect('/chat');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 opacity-[0.12] euraika-flow-gradient" />

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,420px)] lg:items-center">
        <section className="hidden rounded-3xl border border-border/70 bg-card/55 p-8 shadow-[var(--shadow-elevated)] lg:block">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">Pan by Euraika</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">A calmer AI workspace for real work</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Pan keeps chat, runtime visibility, memory, and installable capabilities in one place so you can move from question to execution without losing context.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {workspaceConcepts.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-[var(--shadow-card)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Need a quick mental model?</p>
                <p className="mt-1 leading-6">
                  Start in Chat for the actual task, use Marketplace to discover what to add, open Integrations for live availability, and use Plugins only when you need deeper runtime customization.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative w-full rounded-3xl border border-border/70 bg-card px-6 pb-8 pt-7 shadow-[var(--shadow-elevated)] sm:px-8 lg:max-w-[420px] lg:justify-self-end">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--euraika-flow-gradient)' }}>
                <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 8h20a14 14 0 0 1 0 28H24v20h-10V8Z" fill="#FEFFEF" />
                  <path d="M24 18h9a6 6 0 0 1 0 12h-9V18Z" fill="#073455" fillOpacity="0.3" />
                  <rect x="14" y="58" width="24" height="4" rx="2" fill="#E9C819" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Pan</h2>
                <p className="text-2xs font-medium uppercase tracking-label text-muted-foreground">by Euraika</p>
              </div>
            </div>

            <h3 className="text-2xl font-semibold">Sign in</h3>
            <p className="mt-2 text-sm text-muted-foreground">Access your workspace for chat, memory, runtime visibility, and installable capabilities.</p>
          </div>

          <LoginForm />

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/70 p-4 text-xs leading-5 text-muted-foreground lg:hidden">
            <p className="font-medium text-foreground">What you will see inside</p>
            <p className="mt-2">Chat for the task itself, Marketplace for discovery, Integrations for live tool availability, Plugins for deeper runtime extensions, and Profiles for separate defaults and memory.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
