---
description: Run a full 7-phase frontend/backend integration audit. Scans all API contracts, data schemas, auth chains, error handling, and environment config. Produces a prioritized fix plan with diffs. Trigger with /integration-audit.
---

// turbo-all

1. Anchor State
   Output the state anchor line before doing anything else:
   🗂 STATE: Phase 1/7 | Starting Integration Audit | Open issues: unknown
   Then confirm: "Integration Audit workflow loaded. Paste your frontend
   and backend code, or specify the files to read. I will not begin
   Phase 1 until code is confirmed in context."

2. Read Project Files
   Use read_file or view_file to load the following if not already pasted:
   - All frontend API call files (services/, api/, hooks/, utils/fetch*)
   - All backend route/controller files
   - Any schema, DTO, or Pydantic model files
   - The environment config files (.env.example, config.ts, settings.py)
   - Auth middleware files
   Output a file manifest:
   | # | File | Type | Lines | Status |
   Confirm: "File manifest complete. Proceeding to Phase 1."

3. PHASE 1 — Inventory Scan
   List every backend route and every frontend API call as two parallel tables.

   Backend Routes Table:
   | # | Route | Method | Auth Required | Response Shape |

   Frontend API Calls Table:
   | # | Call Location | Method | Payload Sent | Expected Response |

   Output status: ✓ Phase 1 complete | Issues flagged: [N] | Next: Phase 2

4. PHASE 2 — Contract Alignment
   Cross-reference Phase 1 tables. For each frontend call, find its
   backend match and assign one status:
   ✅ MATCHED — route, method, and payload are compatible
   ⚠️ PARTIAL — route exists but payload or response shape mismatches
   ❌ MISSING — frontend calls a route not found in backend context
   🔴 ORPHAN  — backend route has no frontend consumer

   Contract Audit Table:
   | Frontend Call | Backend Route | Status | Issue Detail |

   Output status: ✓ Phase 2 complete | Issues flagged: [N] | Next: Phase 3

5. PHASE 3 — Data Schema Audit
   For every ❌ MISSING and ⚠️ PARTIAL item from Phase 2, produce a
   schema diff showing what the frontend sends vs what the backend expects:

   ```diff
   // BOUNDARY: [frontend file] → [backend route]
   - Frontend sends:  { field: type }
   + Backend expects: { field: type }
   ! MISMATCH: [description]
   ```

   Also check response shapes: what backend returns vs what frontend destructures.
   Output status: ✓ Phase 3 complete | Mismatches found: [N] | Next: Phase 4

6. PHASE 4 — Auth & Middleware Chain
   Trace the complete auth flow through both codebases:
   Login Request → Token Generation → Token Storage →
   Token Transmission (header format) → Middleware Validation →
   Protected Route Access → Token Refresh Logic

   For each step, check:
   - Is the token format consistent across the boundary?
   - Are CORS headers present for all protected routes?
   - Is there a refresh mechanism and is it wired on both ends?
   - Are auth errors (401, 403) handled on the frontend?

   Flag broken links as: 🔗 BROKEN CHAIN at [step name]
   Output status: ✓ Phase 4 complete | Chain breaks: [N] | Next: Phase 5

7. PHASE 5 — Error Handling Symmetry
   For every backend error response (4xx, 5xx), check if the frontend
   has a handler. Produce an Error Coverage Matrix:

   | HTTP Code | Backend Sends | Frontend Handler | Coverage |
   | 400       | { detail: str }| catch block?    | ✅/❌    |

   Flag uncovered errors as: 🚨 UNHANDLED ERROR [code]
   Output status: ✓ Phase 5 complete | Uncovered errors: [N] | Next: Phase 6

8. PHASE 6 — Environment & Config Audit
   Scan all files for:
   - Hardcoded API base URLs (should be env vars)
   - Secrets or tokens in frontend code
   - CORS origin values that don't match deployment config
   - Mismatched env var names between frontend and backend

   Flag every violation:
   🔒 CONFIG LEAK: [file] line [N] — [description]
   🌐 ENV MISMATCH: [var name] — frontend uses [X], backend expects [Y]
   Output status: ✓ Phase 6 complete | Config violations: [N] | Next: Phase 7

9. PHASE 7 — Merge Execution Plan
   Produce a prioritized fix table covering ALL flagged issues:

   | Priority | File | Change Required | Risk | Estimated Lines |
   | P1-CRITICAL | ... | ... | HIGH | ... |
   | P2-HIGH     | ... | ... | MED  | ... |
   | P3-MEDIUM   | ... | ... | LOW  | ... |

   Then generate corrected code as minimal diffs for every P1 and P2 item.
   Use the diff format defined in the rules. Do not rewrite full files.

   Output final status:
   ✅ AUDIT COMPLETE — [N] issues found | [N] diffs produced | [N] require manual review
   OR
   ⏸️ AUDIT PARTIAL — Blocked on: [list of missing inputs]
