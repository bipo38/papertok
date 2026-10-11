---
name: ponytail
description: >
  Choose the smallest complete implementation for coding, refactoring,
  architecture and dependency decisions in PaperTok. Reuse existing owners,
  contracts and platform features before adding code. Use before planning
  or implementing code, or when asked for Ponytail or YAGNI.
license: MIT
---

# Ponytail

Optimize for fewer concepts and owners while completing the requested behavior.
A shorter diff that hides a bug, removes a useful boundary or needs decoding is
not simpler.

## Before editing

Read the request, applicable instructions, current owner and affected callers.
Trace changes to the paper contract, user state, persistence or Worker response
through their consumers. Name the actual gap before choosing a new abstraction.

Choose the first option that fully satisfies the task:

1. Omit functionality or flexibility with no current requirement.
2. Reuse the existing owner, helper, component or service and its conventions.
3. Use the platform or standard library when its semantics fit; existing shared
   UI components still own focus, dismissal and interaction behavior.
4. Use an installed dependency's supported API before adding a wrapper.
5. Write the minimum clear implementation for the remaining gap.

## During implementation

- Fix behavior where it originates and update affected consumers. Do not patch
  each caller with a guard that leaves the same defect in the shared owner.
- A layer with one caller can own a real boundary. Keep it when it protects a
  current contract; avoid factories, options and registries for imagined uses.
- Preserve the normalized paper contract. Do not copy provider shapes into UI,
  mirror derived state or fill missing scientific facts with plausible defaults.
- Delete code made obsolete by this task. Existing unrelated debt does not
  justify a cleanup, formatting sweep or rewrite of tests.
- Comments explain a constraint or reason the code cannot show. Do not add
  narration, section banners or a mandatory shortcut marker.
- Never remove trust-boundary validation, data-loss protection, accessibility,
  required compatibility or requested behavior to reduce line count.

## Verification and intensity

Use [Repo QA](../repo-qa/SKILL.md) to choose checks. Add tests only for changed
behavior through the existing tools; do not invent production self-checks,
demo files or a new framework as a universal minimum.

Default to `full`, which applies the decisions above. In `lite`, mention a
smaller alternative when useful. In `ultra`, also challenge speculative scope
with a concrete alternative. Respect the user's chosen level until they change
it or say "stop ponytail" or "normal mode". Keep unrelated requests outside
this mode.

Before handing off, run [Ponytail Review](../ponytail-review/SKILL.md) on the
complete final diff. Loading it in the author's context is self-review.
Report the result and actual verification; the skill grants no permission
to publish, merge, deploy or repair unrelated code.
