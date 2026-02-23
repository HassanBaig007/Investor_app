# Skill: Integration Auditor
# Location: .agent/skills/integration-auditor/SKILL.md
# Loaded when: user intent involves API contracts, frontend/backend
# integration, route mismatches, schema drift, or auth chain issues.
# This skill is NOT loaded for unrelated tasks.

## PURPOSE

This skill equips the agent with the full methodology for auditing
and merging frontend and backend integration without hallucinating,
assuming, or silently skipping issues.

It is the brain. The /integration-audit workflow is the trigger.
MCP file tools (read_file, edit_file) are the hands.

---

## TRIGGER PATTERNS

Load this skill automatically when the user says things like:
- "my API calls are failing"
- "frontend and backend are out of sync"
- "the endpoint is returning the wrong shape"
- "my auth isn't working between React and FastAPI"
- "check if my routes match"
- "audit my integration"
- "merge my frontend and backend changes"
- "my schema changed and now things break"

Do NOT load this skill for unrelated backend-only or frontend-only tasks.

---

## DOMAIN KNOWLEDGE

### API Contract Anatomy
A frontend/backend contract consists of:
1. Route + HTTP Method (must be identical on both sides)
2. Request payload shape (field names, types, required/optional)
3. Response shape (field names, types, error envelope format)
4. Auth mechanism (header name, token format, placement)
5. Error codes and their response bodies

All five must match for a contract to be ✅ MATCHED.

### Common Mismatch Patterns (Gemini 3 Flash Hallucination Sources)

**Snake_case vs camelCase drift**
Backend (Python/Go): user_id, access_token, created_at
Frontend (JS/TS):    userId, accessToken, createdAt
These appear identical at a glance but break at runtime.
Always check field naming convention across the boundary.

**Type coercion traps**
Backend UUID field vs frontend string field — silently works until
a UUID validator is added. Always check types, not just field names.

**Optional vs required drift**
Backend adds a required field to a Pydantic model.
Frontend still sends the old payload without it.
The 422 error only surfaces at runtime.

**Auth header format inconsistency**
Frontend sends: Authorization: token abc123
Backend expects: Authorization: Bearer abc123
The middleware rejects it with a 401 but the diff is invisible to a
model that doesn't explicitly check both sides of the header.

**CORS misconfiguration**
Dev CORS: allow all origins (*)
Prod CORS: specific domain list
Frontend hits a route that works in dev but silently fails in prod
because the origin wasn't added to the allowlist.

**Env variable name drift**
Frontend: NEXT_PUBLIC_API_URL
Backend:  API_BASE_URL
Both exist but neither uses the other's value. Hardcoded fallbacks
mask this at dev time.

### Auth Chain Failure Points
The most common auth integration failures occur at:
1. Token storage: localStorage (XSS risk) vs httpOnly cookie
2. Token transmission: Axios interceptor not applied to all instances
3. Token refresh: 401 handler exists but refresh endpoint is wrong URL
4. Backend middleware: Applied to router but not sub-routers
5. CORS: Credentials flag not set on both fetch and CORS config

---

## METHODOLOGY SCRIPTS

### Contract Table Generator (conceptual)
When reading a backend file, extract:
  route = decorator string (e.g., @app.get("/users/{id}"))
  method = HTTP verb
  auth = presence of Depends(get_current_user) or similar
  response_model = Pydantic response model name

When reading a frontend file, extract:
  url = string passed to fetch/axios
  method = HTTP method string
  payload = object passed as body or params
  expected = what the .then() or await destructures

Cross-reference: url string must resolve to route, accounting for
base URL prefix. This is where most mismatches are found.

### Diff Quality Rules
- Only change what is broken.
- Never rename a working field to "improve" style.
- Never add a dependency that wasn't in package.json / requirements.txt
  unless the diff also adds the install step.
- Always keep diff scope to the minimum change that fixes the issue.

### When to Stop vs When to Infer
STOP and ask when:
- A file is referenced but not readable (not in context, not on disk)
- Two files have the same name but different content (version drift)
- An env var is used but .env.example doesn't define it
- Auth middleware chain cannot be fully traced

INFER only when:
- The pattern is a standard framework convention AND no explicit
  contradicting code is visible (e.g., FastAPI's standard 422 response)
- The inference is clearly labeled as: "[INFERRED - verify manually]"

---

## OUTPUT CONTRACTS

This skill requires all outputs to use:
- Tables for any comparative data (never prose comparisons)
- Diff blocks for any code changes (never inline rewrites)
- Status icons: ✅ ⚠️ ❌ 🔴 🔗 🚨 🔒 🌐 ⏸️ for instant scanning
- Phase headers before each audit section
- State anchors at the start of every reply

These are non-negotiable. Deviation indicates the skill was not loaded.
