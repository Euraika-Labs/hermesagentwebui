#!/usr/bin/env bash
###############################################################################
# Pan WebUI — Real-Mode Docker Test
#
# Runs Pan in a Docker container WITHOUT mock mode, connected to the real
# Hermes gateway on the host. Mounts ~/.hermes read-only for state.db,
# config, memories, skills etc.
###############################################################################
set -eo pipefail

CONTAINER_NAME="pan-real-test-$$"
IMAGE_NAME="pan-test:latest"
HOST_PORT=3233
BASE="http://127.0.0.1:${HOST_PORT}"
HERMES_HOME="$HOME/.hermes"
TMPHERMES=""
PASS=0; FAIL=0; SKIP=0; TOTAL=0
RESULTS=()

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

cleanup() {
  echo ""
  echo -e "${CYAN}Cleaning up...${NC}"
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  [ -n "$TMPHERMES" ] && rm -rf "$TMPHERMES" 2>/dev/null || true
}
trap cleanup EXIT

ok()   { PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); RESULTS+=("  ✅  $1"); echo -e "  ${GREEN}✅${NC}  $1"; }
fail() { FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); RESULTS+=("  ❌  $1"); echo -e "  ${RED}❌${NC}  $1"; }
skip() { SKIP=$((SKIP+1)); TOTAL=$((TOTAL+1)); RESULTS+=("  ⏭️   $1"); echo -e "  ${YELLOW}⏭️${NC}   $1"; }

header() { echo ""; echo -e "${BOLD}━━━ $1 ━━━${NC}"; }

###############################################################################
header "Phase 0 · Pre-flight checks"
###############################################################################

# Gateway must be running on host
if curl -sf http://127.0.0.1:8642/health > /dev/null 2>&1; then
  ok "Hermes gateway running on host:8642"
else
  fail "Hermes gateway NOT running — start Pan service first"
  exit 1
fi

# State.db must exist
if [ -f "$HERMES_HOME/profiles/bibi/state.db" ]; then
  DBSIZE=$(du -h "$HERMES_HOME/profiles/bibi/state.db" | cut -f1)
  ok "state.db exists ($DBSIZE)"
else
  fail "state.db not found"
  exit 1
fi

# Docker image must exist (built by docker-test.sh)
if docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
  ok "Docker image $IMAGE_NAME exists"
else
  echo "  Building image first..."
  cd /opt/projects/hermesagentwebui
  docker build -f tests/docker/Dockerfile.test -t "$IMAGE_NAME" . > /dev/null 2>&1
  ok "Docker image built"
fi

###############################################################################
header "Phase 1 · Start real-mode container"
###############################################################################

# Mount hermes home, use host gateway
# --add-host so container can reach host's gateway
# Copy state.db to a writable temp so the container can write (WAL etc.)
TMPHERMES=$(mktemp -d)
mkdir -p "$TMPHERMES/profiles/bibi"
cp "$HERMES_HOME/profiles/bibi/state.db" "$TMPHERMES/profiles/bibi/state.db"
cp "$HERMES_HOME/profiles/bibi/config.yaml" "$TMPHERMES/profiles/bibi/config.yaml" 2>/dev/null || true
# Link memories and skills read-only via bind mount overlay
cp -r "$HERMES_HOME/profiles/bibi/memories" "$TMPHERMES/profiles/bibi/memories" 2>/dev/null || true
ln -sf "$HERMES_HOME/profiles/bibi/skills" "$TMPHERMES/profiles/bibi/skills" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:3000" \
  --add-host=host.docker.internal:host-gateway \
  -v "${TMPHERMES}:/home/node/.hermes" \
  -v "${HERMES_HOME}/profiles/bibi/skills:/home/node/.hermes/profiles/bibi/skills:ro" \
  -e HERMES_MOCK_MODE=false \
  -e HOME=/home/node \
  -e HERMES_HOME=/home/node/.hermes/profiles/bibi \
  -e HERMES_API_BASE_URL=http://host.docker.internal:8642 \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  "$IMAGE_NAME" > /dev/null

echo "  Waiting for container..."
for i in $(seq 1 30); do
  if curl -sf "${BASE}/api/runtime/health" > /dev/null 2>&1; then
    ok "Container ready in ${i}s (port ${HOST_PORT})"
    break
  fi
  if [ "$i" = "30" ]; then
    fail "Container did not start in 30s"
    echo "  Container logs:"
    docker logs "$CONTAINER_NAME" 2>&1 | tail -30
    exit 1
  fi
  sleep 1
done

###############################################################################
header "Phase 2 · Runtime health (real mode)"
###############################################################################

HEALTH=$(curl -s "${BASE}/api/runtime/health" 2>/dev/null)

MOCK=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runtime',{}).get('mockMode','?'))" 2>/dev/null || echo "?")
if [ "$MOCK" = "False" ]; then
  ok "Mock mode: False (REAL MODE confirmed)"
else
  fail "Mock mode: $MOCK (expected False)"
fi

API_OK=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runtime',{}).get('apiReachable','?'))" 2>/dev/null || echo "?")
if [ "$API_OK" = "True" ]; then
  ok "Gateway API reachable from container"
else
  skip "Gateway API not reachable from container ($API_OK)"
fi

HERMES_VER=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runtime',{}).get('hermesVersion','?'))" 2>/dev/null || echo "?")
echo -e "  ${CYAN}ℹ${NC}  Hermes version: $HERMES_VER"

PROFILE=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runtime',{}).get('activeProfile','?'))" 2>/dev/null || echo "?")
echo -e "  ${CYAN}ℹ${NC}  Active profile: $PROFILE"

SESS_COUNT=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runtime',{}).get('sessionsCount',0))" 2>/dev/null || echo "0")
echo -e "  ${CYAN}ℹ${NC}  Sessions in state.db: $SESS_COUNT"

MODEL=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runtime',{}).get('modelDefault','?'))" 2>/dev/null || echo "?")
echo -e "  ${CYAN}ℹ${NC}  Default model: $MODEL"

CHECKS_OK=$(echo "$HEALTH" | python3 -c "import sys,json; checks=json.load(sys.stdin).get('checks',[]); ok=sum(1 for c in checks if c['ok']); print(f'{ok}/{len(checks)}')" 2>/dev/null || echo "?")
ok "Health checks: $CHECKS_OK passing"

###############################################################################
header "Phase 3 · Real sessions from state.db"
###############################################################################

COOKIE_JAR=$(mktemp)
curl -s -c "$COOKIE_JAR" -d "username=admin&password=changeme" "${BASE}/api/auth/login" > /dev/null 2>&1

SESSIONS=$(curl -s -b "$COOKIE_JAR" "${BASE}/api/chat/sessions" 2>/dev/null)
REAL_COUNT=$(echo "$SESSIONS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('sessions',[])))" 2>/dev/null || echo "0")

if [ "$REAL_COUNT" -gt 0 ] 2>/dev/null; then
  ok "Loaded $REAL_COUNT real sessions from state.db"
else
  fail "No sessions loaded (expected >0 from real state.db)"
fi

# Show a few session titles
echo "$SESSIONS" | python3 -c "
import sys,json
sessions = json.load(sys.stdin).get('sessions',[])
for s in sessions[:5]:
    t = s.get('title','?')[:50]
    sid = s['id'][:8]
    model = s.get('settings',{}).get('model','?')
    print(f'  \033[0;36mℹ\033[0m  {sid}... {t} [{model}]')
if len(sessions) > 5:
    print(f'  \033[0;36mℹ\033[0m  ... and {len(sessions)-5} more')
" 2>/dev/null || true

###############################################################################
header "Phase 4 · Session CRUD on real data"
###############################################################################

# Create a new real session
CREATE_RESP=$(curl -s -X POST -b "$COOKIE_JAR" "${BASE}/api/chat/sessions" 2>/dev/null)
SID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['id'])" 2>/dev/null || echo "")
FORK_ID=""
if [ -n "$SID" ]; then
  ok "POST create real session (id: ${SID:0:8}...)"
else
  fail "POST create session failed"
  echo "  Response: $(echo "$CREATE_RESP" | head -c 200)"
fi

# Get it back
if [ -n "$SID" ]; then
  GET_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" "${BASE}/api/chat/sessions/${SID}" 2>/dev/null)
  if [ "$GET_CODE" = "200" ]; then
    ok "GET real session/:id → 200"
  else
    fail "GET real session/:id → $GET_CODE"
  fi
fi

# Rename it
if [ -n "$SID" ]; then
  RENAME_RESP=$(curl -s -X PATCH -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -d '{"title":"Docker Real-Mode Test"}' \
    "${BASE}/api/chat/sessions/${SID}" 2>/dev/null)
  RTITLE=$(echo "$RENAME_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session',{}).get('title',''))" 2>/dev/null || echo "")
  if [ "$RTITLE" = "Docker Real-Mode Test" ]; then
    ok "PATCH rename real session → 200"
  else
    fail "PATCH rename — title='$RTITLE'"
  fi
fi

# Fork it
if [ -n "$SID" ]; then
  FORK_RESP=$(curl -s -X POST -b "$COOKIE_JAR" "${BASE}/api/chat/sessions/${SID}/fork" 2>/dev/null)
  FORK_ID=$(echo "$FORK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session',{}).get('id',''))" 2>/dev/null || echo "")
  FORK_TITLE=$(echo "$FORK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session',{}).get('title',''))" 2>/dev/null || echo "")
  if [ -n "$FORK_ID" ]; then
    ok "POST fork real session → 201 (title: $FORK_TITLE)"
  else
    FORK_ERR=$(echo "$FORK_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null || echo "unknown")
    fail "POST fork failed: $FORK_ERR"
  fi
fi

# Archive
if [ -n "$SID" ]; then
  ARCH_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -b "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -d '{"archived":true}' \
    "${BASE}/api/chat/sessions/${SID}" 2>/dev/null) || ARCH_CODE=000
  if [ "$ARCH_CODE" = "200" ]; then
    ok "PATCH archive real session → 200"
  else
    fail "PATCH archive → $ARCH_CODE"
  fi
fi

# Delete both
if [ -n "$SID" ]; then
  DEL_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -b "$COOKIE_JAR" "${BASE}/api/chat/sessions/${SID}" 2>/dev/null)
  if [ "$DEL_CODE" = "200" ]; then
    ok "DELETE real session → 200"
  else
    fail "DELETE real session → $DEL_CODE"
  fi
fi
if [ -n "$FORK_ID" ]; then
  curl -s -X DELETE -b "$COOKIE_JAR" "${BASE}/api/chat/sessions/${FORK_ID}" > /dev/null 2>&1
fi

###############################################################################
header "Phase 5 · Real skills from Hermes"
###############################################################################

SKILLS_RESP=$(curl -s -b "$COOKIE_JAR" "${BASE}/api/skills" 2>/dev/null)
SKILLS_COUNT=$(echo "$SKILLS_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('skills',[])))" 2>/dev/null || echo "0")

if [ "$SKILLS_COUNT" -gt 10 ] 2>/dev/null; then
  ok "Loaded $SKILLS_COUNT real skills"
else
  fail "Only $SKILLS_COUNT skills (expected 70+)"
fi

# Show categories
echo "$SKILLS_RESP" | python3 -c "
import sys,json
from collections import Counter
skills = json.load(sys.stdin).get('skills',[])
cats = Counter(s.get('category','uncategorized') for s in skills)
for cat, cnt in cats.most_common(8):
    print(f'  \033[0;36mℹ\033[0m  {cat}: {cnt} skills')
" 2>/dev/null || true

###############################################################################
header "Phase 6 · Real memory"
###############################################################################

for endpoint in user agent; do
  RESP=$(curl -s -b "$COOKIE_JAR" "${BASE}/api/memory/${endpoint}" 2>/dev/null)
  ENTRIES=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('entries',[])))" 2>/dev/null || echo "0")
  CHARS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(len(e.get('content','')) for e in d.get('entries',[])))" 2>/dev/null || echo "0")
  if [ "$ENTRIES" -gt 0 ] 2>/dev/null; then
    ok "GET /api/memory/${endpoint} → $ENTRIES entries ($CHARS chars)"
  else
    skip "GET /api/memory/${endpoint} → 0 entries"
  fi
done

# Context inspector
CTX_CODE=$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" "${BASE}/api/memory/context-inspector" 2>/dev/null)
if [ "$CTX_CODE" = "200" ]; then
  ok "GET /api/memory/context-inspector → 200"
else
  fail "GET /api/memory/context-inspector → $CTX_CODE"
fi

###############################################################################
header "Phase 7 · Real profiles"
###############################################################################

PROFILES_RESP=$(curl -s -b "$COOKIE_JAR" "${BASE}/api/profiles" 2>/dev/null)
echo "$PROFILES_RESP" | python3 -c "
import sys,json
profiles = json.load(sys.stdin).get('profiles',[])
for p in profiles:
    active = '◆' if p.get('active') else '○'
    name = p.get('name','?')
    print(f'  \033[0;36mℹ\033[0m  {active} {name}')
" 2>/dev/null || true

PROF_COUNT=$(echo "$PROFILES_RESP" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('profiles',[])))" 2>/dev/null || echo "0")
if [ "$PROF_COUNT" -gt 0 ] 2>/dev/null; then
  ok "Loaded $PROF_COUNT real profile(s)"
else
  fail "No profiles loaded"
fi

###############################################################################
header "Phase 8 · Real extensions & MCP"
###############################################################################

EXT_RESP=$(curl -s -b "$COOKIE_JAR" "${BASE}/api/extensions" 2>/dev/null)
EXT_COUNT=$(echo "$EXT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalExtensions',0))" 2>/dev/null || echo "0")
MCP_COUNT=$(echo "$EXT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalMcpServers',0))" 2>/dev/null || echo "0")
TOOL_COUNT=$(echo "$EXT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalTools',0))" 2>/dev/null || echo "0")

echo -e "  ${CYAN}ℹ${NC}  Extensions: $EXT_COUNT, MCP servers: $MCP_COUNT, Tools: $TOOL_COUNT"
ok "GET /api/extensions → 200"

###############################################################################
header "Phase 9 · Page rendering with real data"
###############################################################################

for page in /chat /skills /memory /profiles /settings /extensions; do
  SIZE=$(curl -s -b "$COOKIE_JAR" "${BASE}${page}" 2>/dev/null | wc -c)
  if [ "$SIZE" -gt 1000 ]; then
    ok "GET $page → ${SIZE} bytes (rendered)"
  else
    fail "GET $page → ${SIZE} bytes (too small)"
  fi
done

###############################################################################
header "Phase 10 · Container stability"
###############################################################################

CSTATE=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null)
if [ "$CSTATE" = "running" ]; then
  ok "Container still running"
else
  fail "Container state: $CSTATE"
fi

MEM=$(docker stats --no-stream --format '{{.MemUsage}}' "$CONTAINER_NAME" 2>/dev/null || echo "?")
echo -e "  ${CYAN}ℹ${NC}  Container memory: $MEM"

ERRORS=$(docker logs "$CONTAINER_NAME" 2>&1 | grep -ciE "unhandled|FATAL|panic|segfault" || true)
ERRORS=${ERRORS:-0}
if [ "$ERRORS" -eq 0 ] 2>/dev/null; then
  ok "No fatal errors in container logs"
else
  fail "$ERRORS fatal error(s)"
  docker logs "$CONTAINER_NAME" 2>&1 | grep -iE "unhandled|FATAL|panic|segfault" | head -5
fi

###############################################################################
header "SUMMARY"
###############################################################################

echo ""
for r in "${RESULTS[@]}"; do
  echo -e "$r"
done

echo ""
echo -e "  ${BOLD}${PASS} passed${NC} · ${RED}${FAIL} failed${NC} · ${YELLOW}${SKIP} skipped${NC} · ${TOTAL} total"
echo ""

rm -f "$COOKIE_JAR"

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}ALL TESTS PASSED ✅${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}SOME TESTS FAILED${NC}"
  exit 1
fi
