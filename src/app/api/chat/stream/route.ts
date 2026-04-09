import { NextResponse } from 'next/server';
import type { ChatSession } from '@/lib/types/chat';
import { addAssistantMessage, addUserMessage, getSession } from '@/server/chat/session-store';
import { requireApiAuth } from '@/server/auth/guards';
import { hermesFetch } from '@/server/hermes/client';
import { HermesConnectionError, HermesResponseError } from '@/server/hermes/errors';
import { parseSSEChunk } from '@/server/hermes/stream-parser';
import { appendRealSessionMessage, getRealSession } from '@/server/hermes/real-sessions';
import { getSelectedProfileFromCookie } from '@/server/hermes/profile-cookie';
import { gateEventsUntilApproved } from '@/server/hermes/live-approval-bridge';
import { trackServerEvent } from '@/lib/telemetry/server';
import { getUpload } from '@/server/uploads/upload-store';
import { getApprovalDecision, persistArtifact, persistToolEvent } from '@/server/runtime/runtime-store';
import { createRun, updateRunStatus } from '@/server/runtime/run-orchestrator';

const encoder = new TextEncoder();

function toSSE(data: unknown) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function mockResponseFor(message: string, attachmentNames: string[]) {
  const attachmentNote = attachmentNames.length ? `\n\nAttachments received: ${attachmentNames.join(', ')}.` : '';
  return `Mock mode is active. You said: ${message}${attachmentNote}\n\nSprint 8 now includes attachments, voice tools, and mobile polish on top of the earlier agent UI.`;
}

function sessionInputFromHistory(session: ChatSession) {
  return session.messages
    .filter((item) => (item.role === 'user' || item.role === 'assistant') && item.content.trim())
    .map((item) => ({ role: item.role, content: item.content }));
}

function buildHermesInstructions(session: ChatSession, attachmentNames: string[]) {
  const lines = [
    `Policy preset: ${session.settings.policyPreset}`,
    `Memory mode: ${session.settings.memoryMode}`,
    `Preferred provider: ${session.settings.provider}`,
  ];
  if (session.loadedSkillIds?.length) lines.push(`Loaded skills: ${session.loadedSkillIds.join(', ')}`);
  if (attachmentNames.length) lines.push(`Attachment names provided by the WebUI: ${attachmentNames.join(', ')}`);
  return lines.join('\n');
}

async function waitForApproval(toolCallId: string, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = getApprovalDecision(toolCallId);
    if (status === 'approved' || status === 'rejected') return status;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return 'pending';
}

function createMockStream(runId: string, profileId: string | null | undefined, sessionId: string, message: string, attachmentNames: string[], persistToRealSession: boolean) {
  const responseText = mockResponseFor(message, attachmentNames);
  const words = responseText.split(/(\s+)/).filter(Boolean);

  return new ReadableStream({
    async start(controller) {
      let assembled = '';
      updateRunStatus(runId, 'running');
      const drafting = { type: 'run.phase', phase: 'drafting', label: 'Hermes is drafting a response from the active workspace context.' } as const;
      persistToolEvent(sessionId, drafting);
      controller.enqueue(toSSE(drafting));
      await new Promise((resolve) => setTimeout(resolve, 15));

      const started = { type: 'tool.started', toolCallId: 'tool-web-search', toolName: 'web_search', riskLevel: 'read', provenance: 'verified' } as const;
      persistToolEvent(sessionId, started);
      controller.enqueue(toSSE(started));
      await new Promise((resolve) => setTimeout(resolve, 15));

      const approval = {
        type: 'tool.awaiting_approval',
        toolCallId: 'tool-terminal-approval',
        toolName: 'terminal',
        summary: 'Hermes wants approval to run a safe planning command in the workspace.',
        riskLevel: 'execute',
        governance: 'approval-gated',
      } as const;
      persistToolEvent(sessionId, approval);
      controller.enqueue(toSSE(approval));
      await new Promise((resolve) => setTimeout(resolve, 15));

      updateRunStatus(runId, 'waiting_approval');
      const waiting = { type: 'run.phase', phase: 'waiting-approval', label: 'Execution is paused until you approve the requested tool action.' } as const;
      persistToolEvent(sessionId, waiting);
      controller.enqueue(toSSE(waiting));
      const decision = await waitForApproval(approval.toolCallId);
      updateRunStatus(runId, decision === 'approved' ? 'running' : 'failed', decision === 'rejected' ? 'Approval rejected' : decision === 'pending' ? 'Approval timed out' : '');
      if (decision !== 'approved') {
        const rejected = {
          type: 'error',
          message: decision === 'rejected' ? 'Tool execution rejected by user approval queue.' : 'Tool execution timed out waiting for approval.',
        } as const;
        persistToolEvent(sessionId, rejected);
        controller.enqueue(toSSE(rejected));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        return;
      }

      const mockSource = {
        type: 'source.emitted',
        source: {
          id: 'mock-source-workspace-plan',
          title: 'Mock workspace planning note',
          sourceType: 'workspace',
          provenance: 'custom',
          label: 'Fallback source',
          note: 'Rendered only because HERMES_MOCK_MODE is enabled.',
          snippet: 'Mock mode is active, so this provenance card is a labeled fallback rather than a real citation.',
        },
      } as const;
      persistToolEvent(sessionId, mockSource);
      controller.enqueue(toSSE(mockSource));
      await new Promise((resolve) => setTimeout(resolve, 15));

      const artifact = {
        type: 'artifact.emitted',
        artifactId: 'artifact-plan',
        artifactType: 'text/markdown',
        label: 'Implementation sketch',
        content: `# Pan Workspace\n\nUser prompt: ${message}\n\n- Research references gathered\n- Initial plan drafted\n- Ready for deeper implementation`,
      } as const;
      persistArtifact(sessionId, artifact);
      controller.enqueue(toSSE(artifact));
      await new Promise((resolve) => setTimeout(resolve, 15));

      const completedPhase = { type: 'run.phase', phase: 'completed', label: 'Hermes finished the current streamed run.' } as const;
      persistToolEvent(sessionId, completedPhase);
      controller.enqueue(toSSE(completedPhase));
      await new Promise((resolve) => setTimeout(resolve, 15));

      const completed = {
        type: 'tool.completed',
        toolCallId: 'tool-web-search',
        toolName: 'web_search',
        output: 'Collected reference UI patterns and surfaced a draft implementation sketch.',
        riskLevel: 'read',
      } as const;
      persistToolEvent(sessionId, completed);
      controller.enqueue(toSSE(completed));
      await new Promise((resolve) => setTimeout(resolve, 15));

      for (const part of words) {
        assembled += part;
        controller.enqueue(toSSE({ type: 'assistant.delta', delta: part }));
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      if (persistToRealSession) {
        appendRealSessionMessage(profileId, sessionId, { role: 'assistant', content: assembled, finishReason: 'stop' });
      } else {
        addAssistantMessage(sessionId, assembled);
      }
      updateRunStatus(runId, 'completed');
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createPassthroughPersistentStream(runId: string, profileId: string, sessionId: string, upstream: ReadableStream<Uint8Array>) {
  const reader = upstream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assistantBuffer = '';

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      updateRunStatus(runId, 'running');
      let doneReading = false;
      while (!doneReading) {
        const { value, done } = await reader.read();
        doneReading = done;
        if (done) break;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const events = parseSSEChunk(`${chunk}\n\n`);
          if (events.some((event) => event.type === 'tool.awaiting_approval')) {
            updateRunStatus(runId, 'waiting_approval');
          }
          const gate = await gateEventsUntilApproved(events);
          if (events.some((event) => event.type === 'tool.awaiting_approval') && gate.approved) {
            updateRunStatus(runId, 'running');
          }
          for (const event of gate.released) {
            if (event.type === 'assistant.delta') {
              assistantBuffer += event.delta;
            } else {
              persistToolEvent(sessionId, event);
              if (event.type === 'artifact.emitted') persistArtifact(sessionId, event);
              if (event.type === 'tool.started') {
                appendRealSessionMessage(profileId, sessionId, {
                  role: 'assistant',
                  content: '',
                  toolCalls: [{ id: event.toolCallId, function: { name: event.toolName, arguments: '{}' } }],
                });
              }
              if (event.type === 'tool.completed') {
                appendRealSessionMessage(profileId, sessionId, {
                  role: 'tool',
                  content: event.output || '',
                  toolCallId: event.toolCallId,
                  toolName: event.toolName,
                });
              }
            }
            controller.enqueue(toSSE(event));
          }
          if (!gate.approved) {
            controller.enqueue(toSSE({ type: 'error', message: 'Execution blocked pending or rejected approval.' }));
            updateRunStatus(runId, 'failed', 'Blocked pending or rejected approval');
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }
        }
      }
      if (assistantBuffer.trim()) {
        appendRealSessionMessage(profileId, sessionId, { role: 'assistant', content: assistantBuffer, finishReason: 'stop' });
      }
      updateRunStatus(runId, 'completed');
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

/**
 * Creates a streaming bridge that translates OpenAI Chat Completions SSE
 * (data: {"choices":[{"delta":{"content":"..."}}]}) into the WebUI's internal
 * event format (data: {"type":"assistant.delta","delta":"..."}).
 *
 * Falls back to parsing a non-streaming JSON response body when the upstream
 * returns application/json instead of text/event-stream.
 */
function createChatCompletionsStream(
  runId: string,
  profileId: string,
  sessionId: string,
  upstream: Response,
) {
  const contentType = upstream.headers.get('content-type') ?? '';
  const isSSE = contentType.includes('text/event-stream');

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      updateRunStatus(runId, 'running');

      const drafting = { type: 'run.phase', phase: 'drafting', label: 'Hermes is drafting a response.' } as const;
      persistToolEvent(sessionId, drafting);
      controller.enqueue(toSSE(drafting));

      if (isSSE && upstream.body) {
        /* ── Streaming SSE path ── */
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantBuffer = '';
        let doneReading = false;

        while (!doneReading) {
          const { value, done } = await reader.read();
          doneReading = done;
          if (done || !value) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const segment of lines) {
            const trimmed = segment.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            const dataLine = trimmed.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            const jsonStr = dataLine.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const chunk = JSON.parse(jsonStr) as {
                choices?: Array<{
                  delta?: { content?: string; role?: string; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> };
                  finish_reason?: string | null;
                }>;
              };

              const choice = chunk.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (delta?.content) {
                assistantBuffer += delta.content;
                controller.enqueue(toSSE({ type: 'assistant.delta', delta: delta.content }));
              }

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.id && tc.function?.name) {
                    const toolStarted = {
                      type: 'tool.started',
                      toolCallId: tc.id,
                      toolName: tc.function.name,
                      riskLevel: 'read',
                      provenance: 'verified',
                    } as const;
                    persistToolEvent(sessionId, toolStarted);
                    controller.enqueue(toSSE(toolStarted));
                  }
                }
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }

        if (assistantBuffer.trim()) {
          appendRealSessionMessage(profileId, sessionId, { role: 'assistant', content: assistantBuffer, finishReason: 'stop' });
        }
      } else {
        /* ── Non-streaming JSON fallback ── */
        const body = await upstream.json().catch(() => null) as {
          output?: Array<{
            type?: string;
            role?: string;
            content?: Array<{ type?: string; text?: string }>;
          }>;
          choices?: Array<{
            message?: { role?: string; content?: string };
          }>;
        } | null;

        let text = '';
        // Responses API format
        if (body?.output) {
          for (const item of body.output) {
            if (item.type === 'message' && item.content) {
              for (const block of item.content) {
                if (block.type === 'output_text' && block.text) {
                  text += block.text;
                }
              }
            }
          }
        }
        // Chat Completions non-streaming format
        if (!text && body?.choices) {
          text = body.choices[0]?.message?.content ?? '';
        }

        if (text) {
          // Simulate streaming word-by-word for smooth UX
          const words = text.split(/([\s]+)/).filter(Boolean);
          for (const word of words) {
            controller.enqueue(toSSE({ type: 'assistant.delta', delta: word }));
            await new Promise((resolve) => setTimeout(resolve, 8));
          }
          appendRealSessionMessage(profileId, sessionId, { role: 'assistant', content: text, finishReason: 'stop' });
        }
      }

      const completedPhase = { type: 'run.phase', phase: 'completed', label: 'Hermes finished the current run.' } as const;
      persistToolEvent(sessionId, completedPhase);
      controller.enqueue(toSSE(completedPhase));

      updateRunStatus(runId, 'completed');
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { sessionId, message, attachmentIds } = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    message?: string;
    attachmentIds?: string[];
  };

  if (!sessionId || !message?.trim()) {
    return NextResponse.json({ error: 'sessionId and message are required' }, { status: 400 });
  }

  const profileId = await getSelectedProfileFromCookie();
  const run = createRun(sessionId);
  const attachments = (attachmentIds ?? [])
    .map((id) => getUpload(id))
    .filter((item): item is NonNullable<ReturnType<typeof getUpload>> => Boolean(item))
    .map((item) => ({ id: item.id, name: item.name, size: item.size, type: item.type }));
  const attachmentNames = attachments.map((item) => item.name);
  const mockMode = process.env.HERMES_MOCK_MODE === 'true';
  const realSessionBeforeSend = getRealSession(profileId, sessionId);

  if (realSessionBeforeSend) {
    appendRealSessionMessage(profileId, sessionId, { role: 'user', content: message });
  } else {
    addUserMessage(sessionId, message, attachments);
  }
  trackServerEvent('chat.stream.start', { sessionId, attachmentCount: attachments.length });
  if (mockMode) {
      return new NextResponse(createMockStream(run.id, profileId, sessionId, message, attachmentNames, Boolean(realSessionBeforeSend)), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  }

  try {
    const realSession = getRealSession(profileId, sessionId);
    const mockSession = getSession(sessionId);
    const session = realSession ?? mockSession;
    if (!session) {
      updateRunStatus(run.id, 'failed', 'Session not found');
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const history = sessionInputFromHistory(session);
    const instructions = buildHermesInstructions(session, attachmentNames);

    // Try /v1/chat/completions first (supports streaming SSE)
    const messages = [
      { role: 'system' as const, content: instructions },
      ...history,
    ];

    const hermesResponse = await hermesFetch('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'X-Hermes-Session-Id': sessionId,
      },
      body: JSON.stringify({
        model: session.settings.model,
        messages,
        stream: true,
      }),
    });

    return new NextResponse(createChatCompletionsStream(run.id, profileId, sessionId, hermesResponse), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof HermesResponseError) {
      updateRunStatus(run.id, 'failed', error.message);
      return NextResponse.json({ error: error.message, status: error.status }, { status: error.status });
    }

    if (error instanceof HermesConnectionError) {
      updateRunStatus(run.id, 'failed', error.message);
      return NextResponse.json({ error: error.message, status: 503 }, { status: 503 });
    }

    updateRunStatus(run.id, 'failed', 'Unknown streaming failure');
    return NextResponse.json({ error: 'Unknown streaming failure' }, { status: 500 });
  }
}
