import Link from 'next/link';
import { FileCode, FolderOpen, Tag } from 'lucide-react';
import { describeSkillProvenance, describeSkillScope } from '@/lib/presentation/capability-labels';
import type { Skill } from '@/lib/types/skill';

export function SkillCard({ skill, loadedInCurrentSession = false, sessionId }: { skill: Skill; loadedInCurrentSession?: boolean; sessionId?: string | null }) {
  const href = sessionId ? `/skills/${skill.id}?session=${encodeURIComponent(sessionId)}` : `/skills/${skill.id}`;
  const fileGroups = skill.linkedFiles?.reduce(
    (acc, f) => {
      acc[f.group] = (acc[f.group] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Link href={href} aria-label={skill.id} className="block rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
            {skill.category ? (
              <span className="hidden shrink-0 items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
                <FolderOpen className="h-2.5 w-2.5" />
                {skill.category}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{skill.description}</p>
        </div>
        <div className="space-y-1.5 text-right text-[10px]">
          <p className="rounded-full border border-border/60 px-2 py-0.5">{describeSkillScope(skill.scope, skill.ownerProfileId)}</p>
          <p className="rounded-full border border-border/60 px-2 py-0.5">{describeSkillProvenance(skill.provenance)}</p>
        </div>
      </div>

      {/* Tags */}
      {skill.tags && skill.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
          {skill.tags.length > 4 ? (
            <span className="rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">+{skill.tags.length - 4}</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded-full px-2 py-0.5 ${skill.enabled ? 'bg-success/15 text-foreground' : 'bg-muted text-muted-foreground'}`}>
          {skill.enabled ? 'Enabled' : skill.installed ? 'Installed' : 'Available'}
        </span>
        {loadedInCurrentSession ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-foreground">Loaded</span> : null}
        {fileGroups && Object.keys(fileGroups).length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-muted-foreground">
            <FileCode className="h-3 w-3" />
            {Object.entries(fileGroups)
              .map(([g, n]) => `${n} ${g}`)
              .join(', ')}
          </span>
        ) : null}
        {skill.updatedAt ? (
          <span className="rounded-full border border-border/50 px-2 py-0.5 text-muted-foreground">
            {new Date(skill.updatedAt).toLocaleDateString()}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
