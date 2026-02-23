---
description: Apply the integration merge plan produced by /integration-audit. Applies diffs file by file, verifies each change compiles and does not break adjacent contracts, then produces a final audit log. Run ONLY after /integration-audit has completed. Trigger with /merge-integration.
---

1. Pre-Merge Gate Check
   Before touching any file, verify:
   - Has /integration-audit been run in this session?
   - Is the Phase 7 Merge Execution Plan visible in context?
   If either is NO, output:
   ⛔ PRE-MERGE GATE FAILED
   Run /integration-audit first. Do not proceed.
   If both are YES, output: "Merge plan confirmed. Starting file-by-file merge."

// turbo
2. Snapshot Current File State
   For every file in the merge plan, read its current content and
   output a one-line inventory:
   📄 [filename] — [line count] lines — [last modified if available]
   This snapshot is your rollback reference. Do not modify files until
   all snapshots are logged.

// turbo
3. Apply P1 Critical Fixes
   Apply every P1-CRITICAL diff from the merge plan, one file at a time.
   For each:
   a. Show the diff you are about to apply.
   b. Apply it.
   c. Read the file back and confirm the change is present.
   d. Output: ✓ P1 fix applied: [filename] — [change description]
   If a diff fails to apply cleanly, output:
   ⚠️ MERGE CONFLICT: [filename] — [reason] — Skipping, needs manual review.

// turbo
4. Apply P2 High-Priority Fixes
   Same procedure as Step 3, for all P2-HIGH items.
   After all P2 fixes, output a running tally:
   📊 Merge progress: [N] applied | [N] skipped | [N] remaining

5. Apply P3 Medium-Priority Fixes
   Same procedure as Steps 3-4, for P3-MEDIUM items.
   For P3 items, pause before each and confirm:
   "About to apply P3 fix to [filename]. Proceed? (yes/skip)"
   This gives the developer control over lower-risk changes.

// turbo
6. Post-Merge Contract Re-verification
   After all diffs are applied, re-run a fast contract check:
   Re-read every modified file and verify:
   - No new ❌ MISSING routes were introduced by the changes
   - No field names were changed in a way that creates new mismatches
   - No hardcoded values were accidentally introduced
   Output for each file checked:
   ✅ [filename] — post-merge contract OK
   ❌ [filename] — NEW issue introduced: [description]

// turbo
7. Generate Merge Audit Log
   Produce a final JSON-formatted audit log and save it as:
   .agent/artifacts/merge-audit-[timestamp].json
   
   Structure:
   {
     "audit_date": "[ISO timestamp]",
     "files_modified": [...],
     "p1_fixes_applied": N,
     "p2_fixes_applied": N,
     "p3_fixes_applied": N,
     "skipped_conflicts": [...],
     "new_issues_introduced": [...],
     "manual_review_required": [...],
     "overall_status": "CLEAN | PARTIAL | REQUIRES_REVIEW"
   }

8. Final Merge Status Report
   Output a human-readable summary:

   ╔══════════════════════════════════════════════╗
   ║         INTEGRATION MERGE COMPLETE           ║
   ╠══════════════════════════════════════════════╣
   ║ Files modified:          [N]                 ║
   ║ Fixes applied:           [N]                 ║
   ║ Conflicts skipped:       [N]                 ║
   ║ New issues introduced:   [N]                 ║
   ║ Audit log saved to:      .agent/artifacts/   ║
   ╚══════════════════════════════════════════════╝

   List any items requiring manual developer review.
