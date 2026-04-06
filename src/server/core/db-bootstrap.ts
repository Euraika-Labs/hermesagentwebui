import fs from 'node:fs';
import path from 'node:path';
import { execPython } from '@/server/core/python-exec';

const DATA_DIR = '/opt/projects/pan-ui/.data';

type MigrationTarget = 'runtime' | 'audit';

const runtimeSchema = `
CREATE TABLE IF NOT EXISTS schema_migrations (target TEXT PRIMARY KEY, version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL, started_at TEXT NOT NULL, updated_at TEXT NOT NULL, finished_at TEXT, last_error TEXT);
CREATE TABLE IF NOT EXISTS tool_events (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, event_type TEXT NOT NULL, tool_call_id TEXT, tool_name TEXT, summary TEXT, output TEXT, payload_json TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, artifact_id TEXT NOT NULL, artifact_type TEXT NOT NULL, label TEXT NOT NULL, content TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approvals (tool_call_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, tool_name TEXT NOT NULL, summary TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS telemetry_events (id TEXT PRIMARY KEY, event TEXT NOT NULL, source TEXT NOT NULL, payload_json TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mcp_probe_results (cache_key TEXT PRIMARY KEY, profile_id TEXT, server_name TEXT NOT NULL, success INTEGER NOT NULL, tools_json TEXT NOT NULL, error_text TEXT, probed_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_runs_session_started ON runs(session_id, started_at);
CREATE INDEX IF NOT EXISTS idx_tool_events_session_created ON tool_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_session_created ON artifacts(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_approvals_session_created ON approvals(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at);
INSERT INTO schema_migrations(target, version) VALUES ('runtime', 1)
  ON CONFLICT(target) DO UPDATE SET version=excluded.version;
`;

const auditSchema = `
CREATE TABLE IF NOT EXISTS schema_migrations (target TEXT PRIMARY KEY, version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, detail TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at);
INSERT INTO schema_migrations(target, version) VALUES ('audit', 1)
  ON CONFLICT(target) DO UPDATE SET version=excluded.version;
`;

function dbPath(target: MigrationTarget) {
  return path.join(DATA_DIR, `${target}.db`);
}

export function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function ensureDb(target: MigrationTarget) {
  ensureDataDir();
  const schema = target === 'runtime' ? runtimeSchema : auditSchema;
  execPython(
    `import sqlite3, sys
conn=sqlite3.connect(sys.argv[1])
conn.executescript(sys.argv[2])
conn.commit()
`,
    [dbPath(target), schema],
  );
  return dbPath(target);
}

export function getDbPath(target: MigrationTarget) {
  return dbPath(target);
}
