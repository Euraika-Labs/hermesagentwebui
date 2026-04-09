import crypto from 'node:crypto';
import type { ChatArtifact, ChatStreamEvent } from '@/lib/types/chat';
import { ensureDb, getDbPath } from '@/server/core/db-bootstrap';
import { execPython, execPythonJson } from '@/server/core/python-exec';

const DB_PATH = getDbPath('runtime');

function ensureRuntimeDb() {
  ensureDb('runtime');
}

function nowIso() {
  return new Date().toISOString();
}

function pyExec(script: string, args: string[] = []) {
  ensureRuntimeDb();
  return execPython(script, [DB_PATH, ...args]);
}

function pyExecJson<T>(script: string, args: string[] = []) {
  ensureRuntimeDb();
  return execPythonJson<T>(script, [DB_PATH, ...args]);
}

export function persistToolEvent(sessionId: string, event: ChatStreamEvent) {
  if (event.type === 'assistant.delta') return;
  const id = crypto.randomUUID();
  const toolCallId = 'toolCallId' in event ? (event.toolCallId ?? null) : null;
  const toolName = 'toolName' in event ? (event.toolName ?? null) : null;
  const summary = event.type === 'tool.awaiting_approval' ? event.summary : event.type === 'run.phase' ? event.label : null;
  const output = event.type === 'tool.completed' ? (event.output ?? null) : event.type === 'source.emitted' ? (event.source.href ?? event.source.snippet ?? null) : null;
  pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("INSERT INTO tool_events (id, session_id, event_type, tool_call_id, tool_name, summary, output, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", tuple(sys.argv[2:11]))
conn.commit()
`, [id, sessionId, event.type, toolCallId || '', toolName || '', summary || '', output || '', JSON.stringify(event), nowIso()]);

  if (event.type === 'tool.awaiting_approval') {
    pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("INSERT OR REPLACE INTO approvals (tool_call_id, session_id, tool_name, summary, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM approvals WHERE tool_call_id=?), ?), ?)", (sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[2], sys.argv[7], sys.argv[8]))
conn.commit()
`, [event.toolCallId, sessionId, event.toolName, event.summary, 'pending', nowIso(), nowIso()]);
  }
}

export function persistArtifact(sessionId: string, artifact: ChatArtifact) {
  const id = crypto.randomUUID();
  pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("INSERT INTO artifacts (id, session_id, artifact_id, artifact_type, label, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", tuple(sys.argv[2:9]))
conn.commit()
`, [id, sessionId, artifact.artifactId, artifact.artifactType, artifact.label, artifact.content || '', nowIso()]);
}

export function setApprovalDecision(toolCallId: string, status: 'approved' | 'rejected') {
  pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("UPDATE approvals SET status=?, updated_at=? WHERE tool_call_id=?", (sys.argv[2], sys.argv[3], sys.argv[4]))
conn.commit()
`, [status, nowIso(), toolCallId]);
  return getApprovalDecision(toolCallId);
}

export function getApprovalDecision(toolCallId: string) {
  return pyExecJson<string | null>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
cur=conn.cursor()
cur.execute("SELECT status FROM approvals WHERE tool_call_id=?", (sys.argv[2],))
r=cur.fetchone()
print(json.dumps(r[0] if r else None))
`, [toolCallId]);
}

export function listTimeline(sessionId: string, query = '') {
  return pyExecJson<ChatStreamEvent[]>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
conn.row_factory=sqlite3.Row
cur=conn.cursor()
q=(sys.argv[3] or '').lower()
cur.execute("SELECT payload_json FROM tool_events WHERE session_id=? ORDER BY created_at ASC", (sys.argv[2],))
rows=[]
for r in cur.fetchall():
    item=json.loads(r['payload_json'])
    hay=json.dumps(item).lower()
    if q and q not in hay:
        continue
    rows.append(item)
print(json.dumps(rows))
`, [sessionId, query]);
}

export function listArtifacts(sessionId: string, query = '') {
  return pyExecJson<ChatArtifact[]>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
conn.row_factory=sqlite3.Row
cur=conn.cursor()
q=(sys.argv[3] or '').lower()
cur.execute("SELECT artifact_id, artifact_type, label, content FROM artifacts WHERE session_id=? ORDER BY created_at ASC", (sys.argv[2],))
rows=[]
for r in cur.fetchall():
    hay=f"{r['artifact_id']} {r['artifact_type']} {r['label']} {r['content'] or ''}".lower()
    if q and q not in hay:
        continue
    rows.append({'artifactId':r['artifact_id'],'artifactType':r['artifact_type'],'label':r['label'],'content':r['content']})
print(json.dumps(rows))
`, [sessionId, query]);
}

export function listApprovals(sessionId?: string | null, query = '', status = '') {
  return pyExecJson<Array<Record<string, string>>>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
conn.row_factory=sqlite3.Row
cur=conn.cursor()
session_id=(sys.argv[2] or '').strip()
q=(sys.argv[3] or '').lower()
status_filter=(sys.argv[4] or '').lower()
if session_id:
    cur.execute("SELECT tool_call_id, session_id, tool_name, summary, status, created_at, updated_at FROM approvals WHERE session_id=? ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, updated_at DESC", (session_id,))
else:
    cur.execute("SELECT tool_call_id, session_id, tool_name, summary, status, created_at, updated_at FROM approvals ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, updated_at DESC")
rows=[]
for r in cur.fetchall():
    hay=f"{r['tool_call_id']} {r['session_id']} {r['tool_name']} {r['summary'] or ''} {r['status']}".lower()
    if q and q not in hay:
        continue
    if status_filter and r['status'].lower()!=status_filter:
        continue
    rows.append({'toolCallId':r['tool_call_id'],'sessionId':r['session_id'],'toolName':r['tool_name'],'summary':r['summary'],'status':r['status'],'createdAt':r['created_at'],'updatedAt':r['updated_at']})
print(json.dumps(rows))
`, [sessionId || '', query, status]);
}

export function persistTelemetry(event: string, source: string, payload?: Record<string, unknown>) {
  const id = crypto.randomUUID();
  pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("INSERT INTO telemetry_events (id, event, source, payload_json, created_at) VALUES (?, ?, ?, ?, ?)", tuple(sys.argv[2:7]))
conn.commit()
`, [id, event, source, JSON.stringify(payload || {}), nowIso()]);
}

export function listTelemetry(limit = 200, query = '') {
  return pyExecJson<Array<Record<string, unknown>>>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
conn.row_factory=sqlite3.Row
cur=conn.cursor()
q=(sys.argv[3] or '').lower()
cur.execute("SELECT id, event, source, payload_json, created_at FROM telemetry_events ORDER BY created_at DESC LIMIT ?", (int(sys.argv[2]),))
rows=[]
for r in cur.fetchall():
    payload=json.loads(r['payload_json'] or '{}')
    hay=f"{r['event']} {r['source']} {json.dumps(payload)}".lower()
    if q and q not in hay:
        continue
    rows.append({'id':r['id'],'event':r['event'],'source':r['source'],'payload':payload,'createdAt':r['created_at']})
print(json.dumps(rows))
`, [String(limit), query]);
}

export function persistMcpProbeResult(payload: {
  cacheKey: string;
  profileId?: string | null;
  serverName: string;
  success: boolean;
  tools: Array<{ name: string; description: string }>;
  errorText?: string;
}) {
  pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("INSERT OR REPLACE INTO mcp_probe_results (cache_key, profile_id, server_name, success, tools_json, error_text, probed_at) VALUES (?, ?, ?, ?, ?, ?, ?)", tuple(sys.argv[2:9]))
conn.commit()
`, [payload.cacheKey, payload.profileId || '', payload.serverName, payload.success ? '1' : '0', JSON.stringify(payload.tools), payload.errorText || '', nowIso()]);
}

export function deleteMcpProbeResults(profileId: string | null | undefined, serverName: string) {
  pyExec(`import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.execute("DELETE FROM mcp_probe_results WHERE profile_id=? AND server_name=?", (sys.argv[2], sys.argv[3]))
conn.commit()
`, [profileId || '', serverName]);
}

export function getMcpProbeResult(cacheKey: string) {
  return pyExecJson<Record<string, unknown> | null>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
conn.row_factory=sqlite3.Row
cur=conn.cursor()
cur.execute("SELECT cache_key, profile_id, server_name, success, tools_json, error_text, probed_at FROM mcp_probe_results WHERE cache_key=?", (sys.argv[2],))
r=cur.fetchone()
if not r:
    print('null')
else:
    print(json.dumps({'cacheKey': r['cache_key'], 'profileId': r['profile_id'] or None, 'serverName': r['server_name'], 'success': bool(r['success']), 'tools': json.loads(r['tools_json'] or '[]'), 'errorText': r['error_text'] or None, 'probedAt': r['probed_at']}))
`, [cacheKey]);
}

export function listMcpProbeResults() {
  return pyExecJson<Array<Record<string, unknown>>>(`import sqlite3, json, sys
conn=sqlite3.connect(sys.argv[1])
conn.row_factory=sqlite3.Row
cur=conn.cursor()
cur.execute("SELECT cache_key, profile_id, server_name, success, tools_json, error_text, probed_at FROM mcp_probe_results ORDER BY probed_at DESC")
print(json.dumps([{'cacheKey': r['cache_key'], 'profileId': r['profile_id'] or None, 'serverName': r['server_name'], 'success': bool(r['success']), 'tools': json.loads(r['tools_json'] or '[]'), 'errorText': r['error_text'] or None, 'probedAt': r['probed_at']} for r in cur.fetchall()]))
`);
}
