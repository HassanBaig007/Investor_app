---
description: description: Identifies missing, incomplete, or unspecified business logic across your codebase. Cross-references code against specs/tickets, finds unhandled edge cases, incomplete state machines, missing authorization checks, financial logic gaps
---

---
description: Identifies missing, incomplete, or unspecified business logic across your codebase. Cross-references code against specs/tickets, finds unhandled edge cases, incomplete state machines, missing authorization checks, financial logic gaps, and async failure paths. Trigger with /business-logic-audit.
---

// turbo-all

1. Anchor State and Confirm Scope
   Output the state anchor before doing anything else:
   🗂 STATE: BL Phase 1/8 | Starting Business Logic Audit | Open issues: unknown

   Then confirm what is available in context:
   - Is a spec, PRD, user story, or ticket visible? (YES/NO)
   - Are backend service/controller files readable? (YES/NO)
   - Are frontend form handlers and submission logic readable? (YES/NO)

   If spec is missing, output:
   ⚠️ NO SPEC IN CONTEXT — audit will scan code only for internal gaps.
   Business logic completeness against requirements cannot be verified
   without a spec. Paste a PRD, user story, or ticket to unlock full audit.

   Proceed regardless — code-only audit is still valid.

2. Read All Relevant Files
   Use read_file or view_file to load:
   - All service layer files (services/, business/, domain/, use-cases/)
   - All model/entity files with status or state fields
   - All validation files (validators/, schemas/, rules/)
   - All permission/authorization middleware
   - All async workers, jobs, queues, webhooks
   - Any spec, PRD, or requirements file if available

   Output a file manifest table:
   | # | File | Category | Lines | Contains State Machine? |

   Confirm: "File manifest complete. Proceeding to BL Phase 2."

3. BL PHASE 1 — Feature Inventory
   If a spec is available: extract every feature, rule, and condition
   stated in it as a numbered list.

   Then scan all code files and extract every business operation as
   a numbered list.

   Output two parallel tables:

   Spec-Defined Features (if spec available):
   | # | Feature / Rule | Location in Spec | Priority |

   Code-Implemented Operations:
   | # | Function / Method | File | Purpose (inferred from code) |

   Output status: ✓ BL Phase 1 complete | Spec items: [N] | Code items: [N]

4. BL PHASE 2 — Spec vs Code Gap Analysis
   (Skip this phase if no spec was provided — output "⚠️ SKIPPED: No spec")

   Cross-reference Phase 1 tables. For each spec item, find its
   code implementation. Assign one of:
   ✅ IMPLEMENTED — spec feature has clear code implementation
   ❌ MISSING LOGIC — spec feature has NO code implementation
   ⚠️ PARTIAL — code exists but covers only part of the spec requirement
   🔍 UNSPECIFIED — code exists but this operation has no spec coverage

   Gap Analysis Table:
   | Spec Feature | Code Location | Status | Gap Description |

   For every ❌ MISSING LOGIC, produce a stub scaffold showing what
   needs to be built:

   ```
   // FILE: [suggested file location]
   // MISSING: [feature name from spec]
   // REQUIRED BEHAVIOR: [description from spec]
   // INPUTS: [what data it needs]
   // OUTPUTS: [what it should return]
   // SIDE EFFECTS: [what it should change in DB/state]
   // TODO: implement this function
   function [suggestedFunctionName]([params]) {
     throw new Error("NOT IMPLEMENTED: [feature name]");
   }
   ```

   Output status: ✓ BL Phase 2 complete | Missing: [N] | Partial: [N]

5. BL PHASE 3 — Edge Case Coverage Scan
   For every business function identified in Phase 1, check whether
   it handles these edge cases. Flag any that are absent.

   Edge Case Coverage Matrix:
   | Function | Null Input | Zero/Negative | Max Boundary | Invalid State | Concurrent Access |
   | name     | ✅/❌       | ✅/❌          | ✅/❌         | ✅/❌          | ✅/❌              |

   For every ❌ in the matrix, output a specific flag:
   ⚠️ UNHANDLED EDGE: [function] — [exact case] not handled

   Then generate the missing guard code as a diff:
   ```diff
   // FILE: [filename]
   // REASON: add null guard for [function]
   + if (!input || input === undefined) {
   +   throw new ValidationError("[function] requires a valid [input name]");
   + }
   ```

   Output status: ✓ BL Phase 3 complete | Unhandled edges: [N]

6. BL PHASE 4 — State Machine Completeness
   Find every entity with a status, state, or stage field.
   For each, map all possible states and all transitions.

   State Machine Map (one per entity):
   Entity: [name]
   | From State   | To State     | Trigger Function | Enforced? |
   | pending      | active       | activateUser()   | ✅/❌      |
   | active       | suspended    | suspendUser()    | ✅/❌      |
   | suspended    | deleted      | ???              | ❌ MISSING |

   For every ❌ MISSING or unenforced transition, generate the guard:
   ```diff
   // FILE: [filename]
   // REASON: enforce [entity] transition [A → B] is only reachable from [valid states]
   + const VALID_TRANSITIONS = {
   +   [State.PENDING]: [State.ACTIVE, State.CANCELLED],
   +   [State.ACTIVE]:  [State.SUSPENDED, State.COMPLETED],
   + };
   + if (!VALID_TRANSITIONS[current]?.includes(next)) {
   +   throw new InvalidStateTransitionError(`Cannot move from ${current} to ${next}`);
   + }
   ```

   Output status: ✓ BL Phase 4 complete | Incomplete machines: [N]

7. BL PHASE 5 — Authorization Gap Scan
   For every function that reads, modifies, or deletes data:
   Check whether it verifies BOTH:
   - Authentication: is the user logged in? (who they are)
   - Authorization: do they OWN or have ROLE permission for this? (what they can do)

   Authorization Coverage Table:
   | Function | Reads/Writes | Auth Check | Ownership Check | Role Check | Status |

   Flag every gap as:
   🔐 MISSING AUTHZ: [function] — [specific check absent]

   Generate the missing check as a diff where possible.

   Output status: ✓ BL Phase 5 complete | Authz gaps: [N]

8. BL PHASE 6 — Financial Logic Audit
   Search for any code involving: price, amount, total, discount, tax,
   refund, credit, billing, invoice, payment, balance, fee, rate.

   For every financial function found:
   - Flag it with: 💰 FINANCIAL LOGIC: [function] — requires human review
   - Check if currency is handled as float (flag as ❌ USE DECIMAL/INTEGER)
   - Check if discounts can stack beyond 100% (flag if yes)
   - Check if refunds validate against original payment amount
   - Check if tax logic handles multiple jurisdictions

   Financial Logic Table:
   | Function | File | Risk | Issue Found |

   Output status: ✓ BL Phase 6 complete | Financial functions: [N] | Risks: [N]

9. BL PHASE 7 — Async Operation Completeness
   Find all: background jobs, queue consumers, webhooks, cron tasks,
   event listeners, setTimeout/setInterval, celery tasks, Bull jobs.

   For each async operation check:
   - ✅/❌ Has a failure handler (catch / on('failed'))
   - ✅/❌ Has a retry strategy with backoff
   - ✅/❌ Has a dead-letter queue or fallback
   - ✅/❌ Has a status queryable endpoint
   - ✅/❌ Has a timeout that prevents infinite hang

   Async Completeness Table:
   | Operation | File | Failure Handler | Retry | DLQ | Status Query | Timeout |

   Flag every gap as: ⏱️ INCOMPLETE ASYNC: [operation] — [missing component]

   Output status: ✓ BL Phase 7 complete | Async gaps: [N]

10. BL PHASE 8 — Business Logic Gap Report
    Produce a final consolidated report of ALL findings:

    CRITICAL (must fix before shipping):
    | # | Type | Location | Description | Suggested Fix |

    HIGH (fix before next release):
    | # | Type | Location | Description | Suggested Fix |

    MEDIUM (schedule for backlog):
    | # | Type | Location | Description | Suggested Fix |

    Summary Banner:
    ╔══════════════════════════════════════════════════════╗
    ║         BUSINESS LOGIC AUDIT COMPLETE                ║
    ╠══════════════════════════════════════════════════════╣
    ║ Missing spec implementations:  [N]                   ║
    ║ Unhandled edge cases:          [N]                   ║
    ║ Incomplete state machines:     [N]                   ║
    ║ Authorization gaps:            [N]                   ║
    ║ Financial logic risks:         [N]                   ║
    ║ Async completeness gaps:       [N]                   ║
    ║ Total issues found:            [N]                   ║
    ╚══════════════════════════════════════════════════════╝

    Output final status:
    ✅ BL AUDIT COMPLETE — [N] total issues | [N] critical blockers
    OR
    ⏸️ BL AUDIT PARTIAL — Blocked on: [list of missing inputs]
