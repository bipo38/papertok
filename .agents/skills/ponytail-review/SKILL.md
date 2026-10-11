---
name: ponytail-review
description: >
  Review a PaperTok task diff for correctness, unsafe contracts and unnecessary
  complexity. Trace affected callers and check for duplicate owners, mirrored
  state, invented fallbacks and speculative layers. Use before handing off
  repository changes, during code review, or for an explicit Ponytail review.
  Reports findings without applying fixes during the review pass.
license: MIT
---

# Ponytail Review

Review the requested behavior against the implementation, not just its size.
Correctness, security, data integrity and accessibility take priority over
deletion. Review without editing during the pass.

## Establish scope

Inspect applicable instructions and the complete task diff: committed branch
changes against the intended base when relevant, staged and unstaged changes,
and the contents of untracked additions. Do not omit new files because ordinary
`git diff` does not show them. Distinguish task changes from user-owned work.

Read affected callers, source contracts and tests. For documentation or skills,
check linked instructions, activation conditions and consistency with the real
commands and code. Do not assume a passing build verifies instructions.

## Check behavior and complexity

- Trace concrete inputs through output, storage, errors and retries. Inspect
  empty, missing and zero values where they have different meanings.
- Look for cross-account state, unverified identity, personal cache reuse,
  unbounded provider work, broken callers and loss of metadata provenance.
- Check whether tests exercise the changed behavior with an independent
  expected result. Mock calls, self-derived expectations and existence-only
  assertions do not establish the user's outcome.
- Identify code or instructions that can be deleted: unused options, speculative
  layers, pass-through wrappers and repeated policy with competing owners.
- Find existing contracts or helpers that replace local copies. Confirm their
  actual semantics before recommending a standard-library or native replacement.
- Inspect state copied from a route, query or store. Keep separate state only
  for an independent interaction or lifecycle.
- Check fallback values and repeated internal validation: expected provider
  downtime needs recovery, while invalid required state needs a visible error
  or a repair at its owner.
- Keep useful boundaries. A single caller, a long function or a file's line
  count alone is not a finding. A shortcut comment does not prove correctness.

## Findings and handoff

Every finding needs a verified location, a concrete trigger or maintenance
cost, the smallest complete fix, and the behavior that must stay protected.
If a replacement's semantics are uncertain, say so rather than blocking on
speculation. Exclude style preferences and unrelated cleanup from task fixes.

Report blocking defects first, then justified simplifications. If there are
none, say "No actionable findings" and name the scope inspected. Identify
self-review honestly; independent review requires another reviewer.

Record whether each finding was repaired, rejected with a reason, or reported
as pre-existing and outside scope. Task-introduced defects must be fixed before
handoff. Recheck any subsequent edits and their affected verification.
A clean review is evidence about the inspected diff, not deployment authority.
