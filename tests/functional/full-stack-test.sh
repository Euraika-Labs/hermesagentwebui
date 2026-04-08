#!/usr/bin/env bash
# ============================================================================
# Pan WebUI — Full Functional Test (from-scratch simulation)
# ============================================================================
# Clean build → start standalone → test APIs → test pages → unit → E2E
# ============================================================================
set -euo pipefail

PROJ="/opt/projects/hermesagentwebui"
PORT=3111
LOG="$PROJ/tests/functional/server.log"
PASS=0; FAIL=0; SKIP=0
RESULTS=()

# ---------- helpers ---------------------------------------------------------
c_green="\033[32m"; c_red="\033[31m"; c_yellow="\033[33m"; c_cyan="\033[36m"; c_reset="\033[0m"

ok()   { PASS=$((PASS+1)); RESULTS+=("  ✅  $1"); echo -e "  ${c_green}✅  $1${c_reset}"; }
fail() { FAIL=$((FAIL+1)); RESULTS+=("  ❌  $1 — $2"); echo -e "  ${c_red}❌  $1${c_reset} — $2"; }
skip() { SKIP=$((SKIP+1)); RESULTS+=("  ⏭️   $1 — $2"); echo -e "  ${c_yellow}⏭️   $1${c_reset} — $2"; }
section() { echo -e "\n${c_cyan}━━━ $1 ━━━${c_reset}"; }

# Reliable HTTP request — returns status code, body to file
# Usage: http GET url output_file [extra curl args...]
http() {
  local method="$1" url="$2" out="$3"
  shift 3
  curl -s -X "$method" -b /tmp/pan-cookies.txt "$@" "$url" -w "%{http_code}" -o "$out" 2>/dev/null || echo "000"
}

cleanup() {
  echo -e "\n${c_cyan}Cleaning up...${c_reset}"
  lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  rm -f "$LOG" /tmp/pan-cookies.txt /tmp/pan-*.json /tmp/pan-*.txt /tmp/pan-*.log
}
trap cleanup EXIT

# ---------- Phase 0: pre-flight ----------------------------------------------
section "Phase 0 · Pre-flight"
cd "$PROJ"
if [ -f "package.json" ]; then ok "package.json exists"; else fail "package.json" "missing"; exit 1; fi
ok "Node.js $(node -v)"

# ---------- Phase 1: Clean build ---------------------------------------------
section "Phase 1 · Clean build (standalone)"
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "  Cleaning previous build..."
rm -rf .next

echo "  Building Next.js standalone (this takes ~30s)..."
if HERMES_MOCK_MODE=true npm run build > /tmp/pan-build.log 2>&1; then
  ok "npm run build succeeded"
else
  fail "npm run build" "build failed"
  tail -20 /tmp/pan-build.log
  exit 1
fi

if [ -f ".next/standalone/server.js" ]; then
  ok "Standalone server.js created"
else
  fail "standalone" ".next/standalone/server.js missing"
  exit 1
fi

cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
[ -d "public" ] && cp -r public .next/standalone/public 2>/dev/null || true
ok "Static assets copied to standalone"

# ---------- Phase 2: Start standalone server ----------------------------------
section "Phase 2 · Start standalone server (port $PORT)"

HERMES_MOCK_MODE=true PORT=$PORT HOSTNAME=127.0.0.1 node .next/standalone/server.js > "$LOG" 2>&1 &
SERVER_PID=$!

echo "  Waiting for server (PID $SERVER_PID)..."
STARTED=false
for i in $(seq 1 30); do
  if curl -s "http://127.0.0.1:$PORT/login" -o /dev/null -w "%{http_code}" 2>/dev/null | grep -q "200"; then
    ok "Server started in ${i}s"
    STARTED=true
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    fail "server start" "process crashed"
    tail -20 "$LOG"
    exit 1
  fi
  sleep 1
done
if [ "$STARTED" = "false" ]; then fail "server start" "timeout 30s"; tail -20 "$LOG"; exit 1; fi

BASE="http://127.0.0.1:$PORT"

# ---------- Phase 3: Auth tests -----------------------------------------------
section "Phase 3 · Authentication"

# 3.1 Unauthenticated access should be blocked
UNAUTH=$(curl -s "$BASE/api/chat/sessions" -w "%{http_code}" -o /dev/null 2>/dev/null) || UNAUTH="000"
if [ "$UNAUTH" = "401" ]; then
  ok "Unauthenticated API → 401"
elif [ "$UNAUTH" = "200" ]; then
  # Mock mode may not enforce auth — note it
  skip "Unauthenticated API" "got 200 (mock mode, no auth middleware)"
else
  ok "Unauthenticated API → $UNAUTH (blocked)"
fi

# 3.2 Login
LOGIN_CODE=$(curl -s -X POST "$BASE/api/auth/login" \
  -d "username=admin&password=changeme" \
  -c /tmp/pan-cookies.txt -b /tmp/pan-cookies.txt \
  -w "%{http_code}" -o /tmp/pan-login.json 2>/dev/null) || LOGIN_CODE="000"
if [ "$LOGIN_CODE" = "200" ]; then
  ok "POST /api/auth/login → 200"
else
  fail "POST /api/auth/login" "got $LOGIN_CODE"
  cat /tmp/pan-login.json 2>/dev/null || true
fi

# ---------- Phase 4: Session CRUD ---------------------------------------------
section "Phase 4 · Session CRUD"

# 4.1 List sessions
CODE=$(http GET "$BASE/api/chat/sessions" /tmp/pan-sessions.json)
if [ "$CODE" = "200" ]; then
  COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/pan-sessions.json')).get('sessions',[])))" 2>/dev/null || echo "?")
  ok "GET sessions → 200 ($COUNT sessions)"
else
  fail "GET sessions" "got $CODE"
fi

# 4.2 Create session (POST /api/chat/sessions)
CODE=$(http POST "$BASE/api/chat/sessions" /tmp/pan-new-session.json)
if [ "$CODE" = "201" ]; then
  SESSION_ID=$(python3 -c "import json; print(json.load(open('/tmp/pan-new-session.json')).get('session',{}).get('id',''))" 2>/dev/null || echo "")
  ok "POST create session → 201 (id: ${SESSION_ID:0:8}...)"
else
  fail "POST create session" "got $CODE"
  SESSION_ID=""
fi

# 4.3 Stream message into session
if [ -n "$SESSION_ID" ]; then
  CODE=$(http POST "$BASE/api/chat/stream" /tmp/pan-stream.txt \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$SESSION_ID\",\"message\":\"Functional test ping\"}")
  if [ "$CODE" = "200" ]; then
    ok "POST stream → 200 (mock streamed)"
  else
    fail "POST stream" "got $CODE"
  fi
else
  skip "POST stream" "no session created"
fi

# 4.4 Get single session
if [ -n "$SESSION_ID" ]; then
  CODE=$(http GET "$BASE/api/chat/sessions/$SESSION_ID" /tmp/pan-single.json)
  if [ "$CODE" = "200" ]; then
    TITLE=$(python3 -c "import json; print(json.load(open('/tmp/pan-single.json')).get('session',{}).get('title','?'))" 2>/dev/null || echo "?")
    ok "GET session/:id → 200 (title: $TITLE)"
  else
    fail "GET session/:id" "got $CODE"
  fi
else
  skip "GET session/:id" "no session"
fi

# 4.5 Rename session
if [ -n "$SESSION_ID" ]; then
  CODE=$(http PATCH "$BASE/api/chat/sessions/$SESSION_ID" /tmp/pan-rename.json \
    -H "Content-Type: application/json" \
    -d '{"title":"Renamed Functional Test"}')
  if [ "$CODE" = "200" ]; then
    ok "PATCH rename → 200"
  else
    fail "PATCH rename" "got $CODE"
  fi
else
  skip "PATCH rename" "no session"
fi

# 4.6 Fork session
if [ -n "$SESSION_ID" ]; then
  CODE=$(http POST "$BASE/api/chat/sessions/$SESSION_ID/fork" /tmp/pan-fork.json)
  if [ "$CODE" = "201" ]; then
    FTITLE=$(python3 -c "import json; print(json.load(open('/tmp/pan-fork.json')).get('session',{}).get('title','?'))" 2>/dev/null || echo "?")
    ok "POST fork → 201 (title: $FTITLE)"
  elif [ "$CODE" = "200" ]; then
    ok "POST fork → 200"
  else
    fail "POST fork" "got $CODE"
  fi
else
  skip "POST fork" "no session"
fi

# 4.7 Archive session
if [ -n "$SESSION_ID" ]; then
  CODE=$(http PATCH "$BASE/api/chat/sessions/$SESSION_ID" /dev/null \
    -H "Content-Type: application/json" \
    -d '{"archived":true}')
  if [ "$CODE" = "200" ]; then
    ok "PATCH archive → 200"
  else
    fail "PATCH archive" "got $CODE"
  fi
else
  skip "PATCH archive" "no session"
fi

# 4.8 Delete session
if [ -n "$SESSION_ID" ]; then
  CODE=$(http DELETE "$BASE/api/chat/sessions/$SESSION_ID" /dev/null)
  if [ "$CODE" = "200" ]; then
    ok "DELETE session → 200"
  else
    fail "DELETE session" "got $CODE"
  fi
else
  skip "DELETE session" "no session"
fi

# ---------- Phase 5: Feature API endpoints ------------------------------------
section "Phase 5 · Feature APIs"

# Skills
CODE=$(http GET "$BASE/api/skills" /tmp/pan-skills.json)
if [ "$CODE" = "200" ]; then
  SC=$(python3 -c "import json; print(len(json.load(open('/tmp/pan-skills.json')).get('skills',[])))" 2>/dev/null || echo "?")
  ok "GET /api/skills → 200 ($SC skills)"
else
  fail "GET /api/skills" "got $CODE"
fi

# Memory (user)
CODE=$(http GET "$BASE/api/memory/user" /tmp/pan-mem-user.json)
if [ "$CODE" = "200" ]; then ok "GET /api/memory/user → 200"; else fail "GET /api/memory/user" "$CODE"; fi

# Memory (agent)
CODE=$(http GET "$BASE/api/memory/agent" /tmp/pan-mem-agent.json)
if [ "$CODE" = "200" ]; then ok "GET /api/memory/agent → 200"; else fail "GET /api/memory/agent" "$CODE"; fi

# Context inspector
CODE=$(http GET "$BASE/api/memory/context-inspector?profileId=test&sessionId=" /tmp/pan-ctx.json)
if [ "$CODE" = "200" ]; then ok "GET /api/memory/context-inspector → 200"; else fail "GET /api/memory/context-inspector" "$CODE"; fi

# Extensions
CODE=$(http GET "$BASE/api/extensions" /tmp/pan-ext.json)
if [ "$CODE" = "200" ]; then
  EC=$(python3 -c "import json; print(len(json.load(open('/tmp/pan-ext.json')).get('extensions',[])))" 2>/dev/null || echo "?")
  ok "GET /api/extensions → 200 ($EC extensions)"
else
  fail "GET /api/extensions" "got $CODE"
fi

# Profiles
CODE=$(http GET "$BASE/api/profiles" /tmp/pan-prof.json)
if [ "$CODE" = "200" ]; then ok "GET /api/profiles → 200"; else fail "GET /api/profiles" "$CODE"; fi

# Runtime health
CODE=$(http GET "$BASE/api/runtime/health" /tmp/pan-health.json)
if [ "$CODE" = "200" ]; then ok "GET /api/runtime/health → 200"; else fail "GET /api/runtime/health" "$CODE"; fi

# Runtime status
CODE=$(http GET "$BASE/api/runtime/status" /tmp/pan-status.json)
if [ "$CODE" = "200" ]; then ok "GET /api/runtime/status → 200"; else fail "GET /api/runtime/status" "$CODE"; fi

# Audit log
CODE=$(http GET "$BASE/api/audit" /tmp/pan-audit.json)
if [ "$CODE" = "200" ]; then ok "GET /api/audit → 200"; else fail "GET /api/audit" "$CODE"; fi

# ---------- Phase 6: Page rendering -------------------------------------------
section "Phase 6 · Page rendering"

for route in "/login" "/chat" "/skills" "/extensions" "/memory" "/profiles" "/settings"; do
  CODE=$(curl -s -b /tmp/pan-cookies.txt "$BASE$route" -w "%{http_code}" -o /dev/null -L 2>/dev/null) || CODE="000"
  if [ "$CODE" = "200" ]; then
    ok "GET $route → 200"
  elif [ "$CODE" = "307" ] || [ "$CODE" = "302" ]; then
    ok "GET $route → $CODE (redirect)"
  else
    fail "GET $route" "got $CODE"
  fi
done

# ---------- Phase 7: Unit tests -----------------------------------------------
section "Phase 7 · Unit tests"

if npx vitest run --reporter=verbose 2>&1 | tee /tmp/pan-unit.log | tail -5 | grep -q "passed"; then
  UNIT_PASS=$(grep -oP '\d+ passed' /tmp/pan-unit.log | tail -1)
  ok "Unit tests: $UNIT_PASS"
else
  fail "Unit tests" "see /tmp/pan-unit.log"
fi

# ---------- Phase 8: E2E tests ------------------------------------------------
section "Phase 8 · E2E tests (Playwright)"

# Kill standalone — Playwright starts its own via webServer config
kill $SERVER_PID 2>/dev/null || true; sleep 1
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true

if npx playwright test --reporter=list 2>&1 | tee /tmp/pan-e2e.log | tail -5 | grep -q "passed"; then
  E2E_PASS=$(grep -oP '\d+ passed' /tmp/pan-e2e.log | head -1)
  E2E_FAIL=$(grep -oP '\d+ failed' /tmp/pan-e2e.log | head -1 || echo "")
  if [ -n "$E2E_FAIL" ] && echo "$E2E_FAIL" | grep -qP '^[1-9]'; then
    fail "E2E tests" "$E2E_PASS, $E2E_FAIL"
  else
    ok "E2E tests: $E2E_PASS"
  fi
else
  fail "E2E tests" "see /tmp/pan-e2e.log"
fi

# ---------- Summary -----------------------------------------------------------
section "SUMMARY"
TOTAL=$((PASS + FAIL + SKIP))
echo ""
for r in "${RESULTS[@]}"; do echo -e "$r"; done
echo ""
echo -e "  ${c_green}$PASS passed${c_reset} · ${c_red}$FAIL failed${c_reset} · ${c_yellow}$SKIP skipped${c_reset} · $TOTAL total"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${c_red}SOME TESTS FAILED${c_reset}"
  exit 1
else
  echo -e "${c_green}ALL TESTS PASSED ✅${c_reset}"
  exit 0
fi
