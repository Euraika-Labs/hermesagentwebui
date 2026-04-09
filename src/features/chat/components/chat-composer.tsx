'use client';

import { ChevronDown, Paperclip, SendHorizonal, Shield, Wrench } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { trackClientEvent } from '@/lib/telemetry/client';
import type { MessageAttachment } from '@/lib/types/message';
import { useUploadAttachment } from '@/features/chat/api/use-upload';
import { AttachmentChip } from '@/features/chat/components/attachment-chip';
import { MicButton } from '@/features/chat/components/mic-button';

type ComposerChip = {
  key: string;
  label: string;
};

export function ChatComposer({
  disabled,
  statusNote,
  chips = [],
  starterPrompts = [],
  onSend,
}: {
  disabled?: boolean;
  statusNote?: string;
  chips?: ComposerChip[];
  starterPrompts?: string[];
  onSend: (message: string, attachmentIds?: string[]) => Promise<void> | void;
}) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAttachment = useUploadAttachment();
  const visibleChips = advancedOpen ? chips : chips.slice(0, 3);

  const handleFile = async (file: File) => {
    const attachment = await uploadAttachment.mutateAsync(file);
    setAttachments((current) => [...current, attachment]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    const attachmentIds = attachments.map((item) => item.id);
    setValue('');
    setAttachments([]);
    trackClientEvent('chat.send', { attachmentCount: attachmentIds.length });
    await onSend(trimmed || 'Sent with attachments only.', attachmentIds);
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-border/70 bg-background/80 p-2 md:p-3">
      <div
        className="rounded-xl border border-border/70 card-default p-3 shadow-[var(--shadow-soft)]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {visibleChips.map((chip) => (
            <span key={chip.key} className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
              {chip.label}
            </span>
          ))}
          {chips.length > visibleChips.length ? <span className="text-xs text-muted-foreground">+{chips.length - visibleChips.length} more in details</span> : null}
          <button
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            aria-expanded={advancedOpen}
            aria-controls="chat-composer-details"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            Details
            <ChevronDown className={`h-3.5 w-3.5 transition ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {advancedOpen ? (
          <div id="chat-composer-details" className="mb-3 grid gap-3 rounded-lg border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground md:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="font-semibold text-foreground">Prompt first</p>
              <p className="mt-1">Keep the ask short and outcome-oriented. Pan can gather tools, files, and approvals as the run unfolds.</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="font-semibold text-foreground">Visible context</p>
              <p className="mt-1">Model, mode, tools, files, and profile stay inspectable without turning the composer into a dashboard.</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/60 p-3">
              <p className="font-semibold text-foreground">Attachments</p>
              <p className="mt-1">Drop a file anywhere on the composer or use Attach to add screenshots, notes, and code snippets.</p>
            </div>
          </div>
        ) : null}

        {attachments.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <AttachmentChip key={attachment.id} attachment={attachment} onRemove={(attachmentId) => setAttachments((current) => current.filter((item) => item.id !== attachmentId))} />
            ))}
          </div>
        ) : null}

        {!value.trim() && attachments.length === 0 && starterPrompts.length > 0 ? (
          <div className="mb-3 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">Try one of these</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setValue(prompt)}
                  className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-left text-xs font-medium leading-5 text-foreground transition hover:bg-card"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
            }
          }}
          placeholder={disabled ? 'Agent is unavailable right now.' : 'Ask Pan to research, plan, debug, or build…'}
          className="min-h-14 w-full resize-none bg-transparent px-3 text-sm leading-7 outline-none placeholder:text-muted-foreground"
          disabled={disabled}
        />

        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await handleFile(file);
                event.currentTarget.value = '';
              }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-foreground">
              <Paperclip className="h-4 w-4" />
              Attach
            </button>
            <MicButton disabled={disabled} onTranscript={(text) => setValue((current) => `${current}${current ? ' ' : ''}${text}`)} />
            {statusNote ? <p className="text-xs text-muted-foreground">{statusNote}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex">
              <Shield className="h-3.5 w-3.5" />
              Context stays visible
            </span>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:inline-flex">
              <Wrench className="h-3.5 w-3.5" />
              Tools stay inspectable
            </span>
            <button
              type="submit"
              disabled={disabled || (!value.trim() && attachments.length === 0)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl brand-gradient px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendHorizonal className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
