import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { ChatSession, ChatSessionSettings, ChatSessionSummary } from '@/lib/types/chat';
import { getProfileConfigPath, getProfileStateDb } from '@/server/hermes/paths';
import { readSqliteJson } from '@/server/hermes/sqlite-bridge';
import { readYamlFile } from '@/server/hermes/yaml-config';

function getProfileSessionDefaults(profileId: string | null | undefined): ChatSessionSettings {
  const config = readYamlFile<{
    model?: { default?: string; provider?: string };
    ui_policy_preset?: ChatSessionSettings['policyPreset'];
  }>(getProfileConfigPath(profileId));
  return {
    model: config.model?.default || 'hermes-agent',
    provider: config.model?.provider || 'real-hermes',
    policyPreset: config.ui_policy_preset || 'safe-chat',
    memoryMode: 'standard',
  };
}

export function listRealSessions(profileId: string | null | undefined, search?: string): ChatSessionSummary[] {
  const dbPath = getProfileStateDb(profileId);
  if (!fs.existsSync(dbPath)) return [];
  const encoded = JSON.stringify(String(search || ''));
  return readSqliteJson<ChatSessionSummary[]>(
    dbPath,
    `import datetime\nq = ${encoded}.strip().lower()\ncur.execute("SELECT s.id, COALESCE(s.title, ''), s.started_at, s.model, s.parent_session_id, s.ended_at, (SELECT m.content FROM messages m WHERE m.session_id=s.id AND m.role='user' ORDER BY m.timestamp ASC LIMIT 1), COALESCE(s.source, 'unknown') FROM sessions s ORDER BY s.started_at DESC LIMIT 100")\nrows = []\nfor r in cur.fetchall():\n    preview = (r[6] or '')[:160] or None\n    title = r[1] or ((r[6] or '')[:40] or 'Untitled session')\n    hay = f"{title} {preview or ''}".lower()\n    if q and q not in hay:\n        continue\n    archived = bool(r[5])\n    source = (r[7] or 'unknown').lower()\n    rows.append({'id': r[0], 'title': title, 'updatedAt': datetime.datetime.fromtimestamp(float(r[2])).isoformat(), 'preview': preview, 'workspaceLabel': 'Archived' if archived else ('Forks' if r[4] else 'Active workspace'), 'pinned': False, 'archived': archived, 'parentSessionId': r[4], 'source': source})\nprint(json.dumps(rows))`,
  );
}

export function getRealSession(profileId: string | null | undefined, sessionId: string): ChatSession | null {
  const dbPath = getProfileStateDb(profileId);
  if (!fs.existsSync(dbPath)) return null;
  const encoded = JSON.stringify(sessionId);
  return readSqliteJson<ChatSession | null>(
    dbPath,
    `import datetime\nsession_id = ${encoded}\ncur.execute("SELECT id, COALESCE(title,''), started_at, model, model_config, parent_session_id, ended_at, COALESCE(source, 'unknown') FROM sessions WHERE id=?", (session_id,))\nrow = cur.fetchone()\nif not row:\n    print('null')\n    raise SystemExit\ncur.execute("SELECT role, content, timestamp FROM messages WHERE session_id=? ORDER BY timestamp ASC", (session_id,))\nmessages = []\nfor idx, m in enumerate(cur.fetchall(), start=1):\n    messages.append({'id': f"{session_id}-{idx}", 'role': m[0], 'content': m[1] or '', 'createdAt': datetime.datetime.fromtimestamp(float(m[2])).isoformat()})\npreview = None\nfor m in messages:\n    if m['role'] == 'user' and m['content']:\n        preview = m['content'][:160]\n        break\nmodel_config = {}\nif row[4]:\n    import json as _j\n    try: model_config = _j.loads(row[4]) or {}\n    except Exception: model_config = {}\nsettings = {'model': row[3] or 'unknown', 'provider': model_config.get('provider','real-hermes'), 'policyPreset': model_config.get('policyPreset','safe-chat'), 'memoryMode': model_config.get('memoryMode','standard')}\nsource = (row[7] or 'unknown').lower()\nprint(json.dumps({'id': row[0], 'title': row[1] or (preview[:40] if preview else 'Untitled session'), 'updatedAt': datetime.datetime.fromtimestamp(float(row[2])).isoformat(), 'preview': preview, 'messages': messages, 'parentSessionId': row[5], 'loadedSkillIds': model_config.get('loadedSkillIds', []), 'archived': bool(row[6]), 'source': source, 'settings': settings}))`,
  );
}

function runWrite(profileId: string | null | undefined, pythonBody: string) {
  const dbPath = getProfileStateDb(profileId);
  if (!fs.existsSync(dbPath)) throw new Error('state.db not found for selected profile');
  return readSqliteJson<Record<string, object | string | number | boolean | null>>(
    dbPath,
    pythonBody,
  );
}

export function createRealSession(profileId: string | null | undefined) {
  const sessionId = randomUUID();
  const title = `New chat ${sessionId.slice(0, 8)}`;
  const defaults = getProfileSessionDefaults(profileId);
  const initialConfig = { ...defaults, loadedSkillIds: ['skill-authoring'] };
  return runWrite(
    profileId,
    `import time, json, datetime\nsession_id=${JSON.stringify(sessionId)}\nsettings=${JSON.stringify(initialConfig)}\nnow = time.time()\ncur.execute("INSERT INTO sessions (id, source, model, model_config, started_at, title) VALUES (?, ?, ?, ?, ?, ?)", (session_id, 'webui', settings['model'], json.dumps(settings), now, ${JSON.stringify(title)}))\nconn.commit()\nreturned_settings={k: v for k, v in settings.items() if k != 'loadedSkillIds'}\nprint(json.dumps({'session': {'id': session_id, 'title': ${JSON.stringify(title)}, 'updatedAt': datetime.datetime.fromtimestamp(now).isoformat(), 'preview': 'Start chatting with Hermes.', 'messages': [], 'loadedSkillIds': settings.get('loadedSkillIds', []), 'settings': returned_settings}}))`,
  ) as { session: ChatSession };
}

export function renameRealSession(profileId: string | null | undefined, sessionId: string, title: string) {
  return runWrite(
    profileId,
    `import time, json, datetime\nsession_id=${JSON.stringify(sessionId)}\nbase_title=${JSON.stringify(title)}\nnow=time.time()\ncur.execute("SELECT id FROM sessions WHERE title=? AND id<>?", (base_title, session_id))\nfor row in cur.fetchall():\n    cur.execute("UPDATE sessions SET title=? WHERE id=?", (f"{base_title} [dup {row[0][:8]}]", row[0]))\ncur.execute("UPDATE sessions SET title=?, started_at=? WHERE id=?", (base_title, now, session_id))\nconn.commit()\ncur.execute("SELECT COALESCE(title,''), started_at, model, model_config, parent_session_id, ended_at FROM sessions WHERE id=?", (session_id,))\nr=cur.fetchone()\nmc={}\nimport json as _j\nif r[3]:\n    try: mc=_j.loads(r[3]) or {}\n    except Exception: mc={}\nprint(json.dumps({'session': {'id': session_id, 'title': r[0] or base_title, 'updatedAt': datetime.datetime.fromtimestamp(float(r[1])).isoformat(), 'preview': None, 'parentSessionId': r[4], 'archived': bool(r[5]), 'messages': [], 'settings': {'model': r[2] or 'unknown', 'provider': mc.get('provider','real-hermes'), 'policyPreset': mc.get('policyPreset','safe-chat'), 'memoryMode': mc.get('memoryMode','standard')}}}))`,
  ) as { session: ChatSession };
}

export function archiveRealSession(profileId: string | null | undefined, sessionId: string) {
  return runWrite(
    profileId,
    `import time, json, datetime\nsession_id=${JSON.stringify(sessionId)}\ncur.execute("UPDATE sessions SET ended_at=?, end_reason=? WHERE id=?", (time.time(), 'archived', session_id))\nconn.commit()\ncur.execute("SELECT COALESCE(title,''), started_at, model, model_config, parent_session_id, ended_at FROM sessions WHERE id=?", (session_id,))\nr=cur.fetchone()\nmc={}\nimport json as _j\nif r[3]:\n    try: mc=_j.loads(r[3]) or {}\n    except Exception: mc={}\nprint(json.dumps({'session': {'id': session_id, 'title': r[0] or 'Untitled session', 'updatedAt': datetime.datetime.fromtimestamp(float(r[1])).isoformat(), 'preview': None, 'parentSessionId': r[4], 'archived': bool(r[5]), 'messages': [], 'settings': {'model': r[2] or 'unknown', 'provider': mc.get('provider','real-hermes'), 'policyPreset': mc.get('policyPreset','safe-chat'), 'memoryMode': mc.get('memoryMode','standard')}}}))`,
  ) as { session: ChatSession };
}

export function updateRealSessionSettings(profileId: string | null | undefined, sessionId: string, settings: Partial<ChatSessionSettings>) {
  return runWrite(
    profileId,
    `import time, json, datetime\nsession_id=${JSON.stringify(sessionId)}\npatch=${JSON.stringify(settings)}\ncur.execute("SELECT model, model_config FROM sessions WHERE id=?", (session_id,))\nr=cur.fetchone()\nif not r: raise Exception('Session not found')\nmodel = patch.get('model') or r[0] or 'unknown'\nconfig = {}\nif r[1]:\n    try: config = json.loads(r[1]) or {}\n    except Exception: config = {}\nconfig.update(patch)\ncur.execute("UPDATE sessions SET model=?, model_config=? WHERE id=?", (model, json.dumps(config), session_id))\nconn.commit()\ncur.execute("SELECT COALESCE(title,''), started_at, model, model_config, parent_session_id, ended_at FROM sessions WHERE id=?", (session_id,))\nr=cur.fetchone()\nmc=json.loads(r[3]) if r[3] else {}\nprint(json.dumps({'session': {'id': session_id, 'title': r[0] or 'Untitled session', 'updatedAt': datetime.datetime.fromtimestamp(float(r[1])).isoformat(), 'preview': None, 'parentSessionId': r[4], 'archived': bool(r[5]), 'messages': [], 'settings': {'model': r[2] or 'unknown', 'provider': mc.get('provider','real-hermes'), 'policyPreset': mc.get('policyPreset','safe-chat'), 'memoryMode': mc.get('memoryMode','standard')}}}))`,
  ) as { session: ChatSession };
}

export function deleteRealSession(profileId: string | null | undefined, sessionId: string) {
  runWrite(
    profileId,
    `import json\nsession_id=${JSON.stringify(sessionId)}\ncur.execute("DELETE FROM messages WHERE session_id=?", (session_id,))\ncur.execute("DELETE FROM sessions WHERE id=?", (session_id,))\nconn.commit()\nprint(json.dumps({'ok': True}))`,
  );
}

export function forkRealSession(profileId: string | null | undefined, sessionId: string) {
  const newId = randomUUID();
  return runWrite(
    profileId,
    `import time, json, datetime\nold_id=${JSON.stringify(sessionId)}\nnew_id=${JSON.stringify(newId)}\ncur.execute("SELECT source, user_id, model, model_config, system_prompt, title FROM sessions WHERE id=?", (old_id,))\nr=cur.fetchone()\nif not r: raise Exception('Session not found')\nbase_title=(r[5] or 'Untitled session') + ' (fork)'\ncur.execute("SELECT id FROM sessions WHERE title=?", (base_title,))\nfor row in cur.fetchall():\n    cur.execute("UPDATE sessions SET title=? WHERE id=?", (f"{base_title} [dup {row[0][:8]}]", row[0]))\nnew_title=base_title\nnow = time.time()\ncur.execute("INSERT INTO sessions (id, source, user_id, model, model_config, system_prompt, parent_session_id, started_at, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (new_id, r[0], r[1], r[2], r[3], r[4], old_id, now, new_title))\ncur.execute("SELECT role, content, tool_call_id, tool_calls, tool_name, timestamp, token_count, finish_reason, reasoning, reasoning_details, codex_reasoning_items FROM messages WHERE session_id=? ORDER BY timestamp ASC", (old_id,))\nfor m in cur.fetchall():\n    cur.execute("INSERT INTO messages (session_id, role, content, tool_call_id, tool_calls, tool_name, timestamp, token_count, finish_reason, reasoning, reasoning_details, codex_reasoning_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (new_id, m[0], m[1], m[2], m[3], m[4], time.time(), m[6], m[7], m[8], m[9], m[10]))\nconn.commit()\nmc={}\nif r[3]:\n    try: mc=json.loads(r[3]) or {}\n    except Exception: mc={}\nprint(json.dumps({'session': {'id': new_id, 'title': new_title, 'updatedAt': datetime.datetime.fromtimestamp(now).isoformat(), 'preview': None, 'parentSessionId': old_id, 'loadedSkillIds': mc.get('loadedSkillIds', []), 'archived': False, 'messages': [], 'settings': {'model': r[2] or 'unknown', 'provider': mc.get('provider','real-hermes'), 'policyPreset': mc.get('policyPreset','safe-chat'), 'memoryMode': mc.get('memoryMode','standard'}}}))`,
  ) as { session: ChatSession };
}

export function addRealSessionLoadedSkill(profileId: string | null | undefined, sessionId: string, skillId: string) {
  runWrite(
    profileId,
    `import json\nsession_id=${JSON.stringify(sessionId)}\nskill_id=${JSON.stringify(skillId)}\ncur.execute("SELECT model_config FROM sessions WHERE id=?", (session_id,))\nr=cur.fetchone()\nif not r: raise Exception('Session not found')\nconfig={}\nif r[0]:\n    try: config=json.loads(r[0]) or {}\n    except Exception: config={}\nloaded=config.get('loadedSkillIds', [])\nif skill_id not in loaded:\n    loaded.append(skill_id)\nconfig['loadedSkillIds']=loaded\ncur.execute("UPDATE sessions SET model_config=? WHERE id=?", (json.dumps(config), session_id))\nconn.commit()\nprint(json.dumps({'ok': True}))`,
  );
}

export function appendRealSessionMessage(
  profileId: string | null | undefined,
  sessionId: string,
  payload: {
    role: 'user' | 'assistant' | 'tool';
    content?: string;
    toolCallId?: string;
    toolName?: string;
    toolCalls?: unknown;
    finishReason?: string;
  },
) {
  const toolCallsSerialized = payload.toolCalls ? JSON.stringify(payload.toolCalls) : '';
  runWrite(
    profileId,
    `import json, time\nsession_id=${JSON.stringify(sessionId)}\nrole=${JSON.stringify(payload.role)}\ncontent=${JSON.stringify(payload.content || '')}\ntool_call_id=${JSON.stringify(payload.toolCallId || '')}\ntool_name=${JSON.stringify(payload.toolName || '')}\ntool_calls=${JSON.stringify(toolCallsSerialized)}\nfinish_reason=${JSON.stringify(payload.finishReason || '')}\ncur.execute("INSERT INTO messages (session_id, role, content, tool_call_id, tool_calls, tool_name, timestamp, finish_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (session_id, role, content, tool_call_id or None, tool_calls or None, tool_name or None, time.time(), finish_reason or None))\ncur.execute("UPDATE sessions SET message_count = message_count + 1, tool_call_count = tool_call_count + ? WHERE id = ?", (1 if role=='tool' or tool_calls else 0, session_id))\nconn.commit()\nprint(json.dumps({'ok': True}))`,
  );
}
