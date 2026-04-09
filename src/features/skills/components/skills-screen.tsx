'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Download, ExternalLink, FolderOpen, Globe, Search, Shield, ShieldAlert, ShieldCheck, Star, X } from 'lucide-react';
import { useContextInspector } from '@/features/memory/api/use-memory';
import { SkillCard } from '@/features/skills/components/skill-card';
import { useSkills, useSkillCategories, useHubSkills, useInstallHubSkill, type HubSkill } from '@/features/skills/api/use-skills';
import { useUIStore } from '@/lib/store/ui-store';

function TrustBadge({ level }: { level: string }) {
  if (level === 'trusted') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-3xs font-medium text-emerald-400"><ShieldCheck className="h-2.5 w-2.5" />Trusted</span>;
  if (level === 'official') return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-3xs font-medium text-blue-400"><Shield className="h-2.5 w-2.5" />Official</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-3xs font-medium text-amber-400"><ShieldAlert className="h-2.5 w-2.5" />Community</span>;
}

function SecurityBadges({ audits }: { audits?: Record<string, string> }) {
  if (!audits) return null;
  return (
    <div className="flex gap-1">
      {Object.entries(audits).map(([name, status]) => (
        <span
          key={name}
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
            status === 'Pass' ? 'bg-emerald-500/15 text-emerald-400' :
            status === 'Warn' ? 'bg-amber-500/15 text-amber-400' :
            'bg-red-500/15 text-red-400'
          }`}
        >
          {name}: {status}
        </span>
      ))}
    </div>
  );
}

type BlockedInstallState = {
  skill: HubSkill;
  message: string;
};

function isForceableInstallError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('use --force to override');
}

function HubSkillCard({ skill, onInstall, installing }: { skill: HubSkill; onInstall: () => void; installing: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
            <TrustBadge level={skill.trustLevel} />
          </div>
          <p className="mt-0.5 text-2xs text-muted-foreground">{skill.repo}</p>
        </div>
        {skill.installs != null ? (
          <span className="shrink-0 rounded-lg bg-muted/50 px-2 py-0.5 text-3xs text-muted-foreground">
            <Download className="mr-0.5 inline h-2.5 w-2.5" />
            {skill.installs.toLocaleString()}
          </span>
        ) : null}
      </div>

      <p className="mt-2 line-clamp-3 flex-1 text-xs leading-5 text-muted-foreground">
        {skill.detail?.summary || skill.description}
      </p>

      {skill.detail?.securityAudits ? (
        <div className="mt-2">
          <SecurityBadges audits={skill.detail.securityAudits} />
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onInstall(); }}
          disabled={installing}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {installing ? 'Installing…' : 'Install'}
        </button>
        {skill.detailUrl ? (
          <a
            href={skill.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/40"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            skills.sh
          </a>
        ) : null}
        {skill.repoUrl ? (
          <a
            href={skill.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/40"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="h-3 w-3" />
            Repo
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function SkillsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSessionId = searchParams.get('session');
  const [tab, setTab] = useState<'installed' | 'discover'>('installed');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [hubSearchInput, setHubSearchInput] = useState('');
  const skillsQuery = useSkills(tab === 'installed');
  const categoriesQuery = useSkillCategories();
  const hubQuery = useHubSkills(hubSearchQuery || undefined);
  const installHubSkill = useInstallHubSkill();
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [blockedInstall, setBlockedInstall] = useState<BlockedInstallState | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const { selectedProfileId, activeSessionId, setActiveSessionId } = useUIStore();

  useEffect(() => {
    if (!requestedSessionId) return;
    if (requestedSessionId !== activeSessionId) {
      setActiveSessionId(requestedSessionId);
    }
    router.replace('/skills', { scroll: false });
  }, [activeSessionId, requestedSessionId, router, setActiveSessionId]);

  const contextQuery = useContextInspector(selectedProfileId, requestedSessionId ?? activeSessionId);
  const loadedSkillIds = new Set(contextQuery.data?.loadedSkillIds?.length ? contextQuery.data.loadedSkillIds : ['skill-authoring']);

  const allSkills = skillsQuery.data ?? [];

  // Derive categories from skills data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const skill of allSkills) {
      if (skill.category) cats.add(skill.category);
    }
    const fromEndpoint = categoriesQuery.data ?? [];
    for (const c of fromEndpoint) cats.add(c);
    return Array.from(cats).sort();
  }, [allSkills, categoriesQuery.data]);

  // Filter installed skills by category and search
  const filteredSkills = useMemo(() => {
    let skills = allSkills;
    if (selectedCategory) {
      skills = skills.filter((s) => s.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags?.some((t) => t.toLowerCase().includes(q)) ||
          s.category?.toLowerCase().includes(q),
      );
    }
    return skills;
  }, [allSkills, selectedCategory, searchQuery]);

  // Hub skills
  const hubSkills = hubQuery.data?.skills ?? [];

  // Stats
  const enabledCount = allSkills.filter((s) => s.enabled).length;
  const withFilesCount = allSkills.filter((s) => s.linkedFiles && s.linkedFiles.length > 0).length;

  async function handleHubInstall(skill: HubSkill, force = false) {
    setInstallingId(skill.id);
    setInstallError(null);
    try {
      await installHubSkill.mutateAsync({ identifier: skill.identifier, force });
      setBlockedInstall(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!force && isForceableInstallError(message)) {
        setBlockedInstall({ skill, message });
        return;
      }
      setInstallError(message);
    } finally {
      setInstallingId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto space-y-5 p-4 pb-8 lg:p-6 lg:pb-10">
      <div>
        <h1 className="text-2xl font-semibold">Skills</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tab === 'installed'
            ? <>Browse {allSkills.length} installed skills across {categories.length} categories.{enabledCount > 0 ? ` ${enabledCount} enabled.` : ''}{withFilesCount > 0 ? ` ${withFilesCount} include references, scripts, or templates.` : ''}</>
            : <>Discover skills from skills.sh and other registries. {hubSkills.length} available to install{hubQuery.data?.total ? ` (${hubQuery.data.total} total, ${hubQuery.data.total - hubSkills.length} already installed)` : ''}.</>}
        </p>
      </div>

      {installError ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-foreground">
          {installError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('installed')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${tab === 'installed' ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border/70 text-muted-foreground hover:bg-card'}`}
          >
            Installed ({allSkills.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('discover')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${tab === 'discover' ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border/70 text-muted-foreground hover:bg-card'}`}
          >
            <Star className="mr-1 inline h-3.5 w-3.5" />
            Discover
          </button>
        </div>

        {tab === 'installed' ? (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills by name, tag, or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-background/80 py-2 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <form
            className="relative flex-1 min-w-[200px] max-w-md"
            onSubmit={(e) => { e.preventDefault(); setHubSearchQuery(hubSearchInput); }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills.sh (e.g. kubernetes, react, python)…"
              value={hubSearchInput}
              onChange={(e) => setHubSearchInput(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-background/80 py-2 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
            />
            {hubSearchInput ? (
              <button type="button" onClick={() => { setHubSearchInput(''); setHubSearchQuery(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </form>
        )}
      </div>

      {/* ─── INSTALLED TAB ─────────────────────── */}
      {tab === 'installed' ? (
        <>
          {/* Category chips */}
          {categories.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${!selectedCategory ? 'bg-primary/15 text-foreground ring-1 ring-primary/30' : 'border border-border/50 text-muted-foreground hover:bg-card'}`}
              >
                All
              </button>
              {categories.map((cat) => {
                const count = allSkills.filter((s) => s.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${selectedCategory === cat ? 'bg-primary/15 text-foreground ring-1 ring-primary/30' : 'border border-border/50 text-muted-foreground hover:bg-card'}`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          ) : null}

          {skillsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading skill data…</p> : null}

          {loadedSkillIds.size ? (
            <div className="rounded-2xl border border-border/70 bg-card/80 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Loaded in current session:</span>
              <span className="ml-2">{Array.from(loadedSkillIds).join(', ')}</span>
            </div>
          ) : null}

          {!skillsQuery.isLoading && filteredSkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
              {searchQuery || selectedCategory
                ? `No skills match "${searchQuery || selectedCategory}". Try a different filter.`
                : 'No installed skills were detected for the current runtime/profile scope.'}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                loadedInCurrentSession={loadedSkillIds.has(skill.id)}
                sessionId={requestedSessionId ?? activeSessionId}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* ─── DISCOVER TAB ─────────────────────── */}
      {tab === 'discover' ? (
        <>
          {blockedInstall ? (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-5 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Security scan blocked this install</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {blockedInstall.skill.name} comes from a community source and triggered a caution verdict. Pan blocked the default install to avoid silently pulling in risky skills.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-border/70 bg-card/60 p-4 text-sm text-foreground">
                  <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{blockedInstall.message}</pre>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  If you trust this skill and understand the findings above, you can force the install once. Otherwise, cancel and pick a different skill.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockedInstall(null)}
                    className="rounded-lg border border-border px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleHubInstall(blockedInstall.skill, true)}
                    disabled={installingId === blockedInstall.skill.id}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {installingId === blockedInstall.skill.id ? 'Installing…' : 'Install anyway'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {hubQuery.isLoading ? <p className="text-sm text-muted-foreground">Searching skills.sh…</p> : null}

          {!hubQuery.isLoading && hubSkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
              {hubSearchQuery
                ? `No skills found for "${hubSearchQuery}". Try a different search term.`
                : 'No discoverable skills found. The skills.sh cache may need to be populated — run `hermes skills browse` in your terminal.'}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hubSkills.map((skill) => (
              <HubSkillCard
                key={skill.id}
                skill={skill}
                onInstall={() => handleHubInstall(skill)}
                installing={installingId === skill.id}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
