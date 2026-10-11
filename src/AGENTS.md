# Frontend decisions

## Interface and state

- Use the fixed language and locale from `LanguageContext` for Worker requests and
  formatting. Do not restore a language toggle or per-language copy tables.
- Resolve stored topics and following labels through canonical IDs. A translated or renamed
  label is presentation, not a new preference or entity.
- Preserve the document-first interface: serif prose, mono metadata, data-derived accents
  and ruled structure. Use existing tokens, component CSS and Phosphor icon weights;
  do not import another design system or icon library for one feature.
- Feature styles use the established component CSS; Tailwind utilities serve the shared
  UI primitives. A polish change does not authorize spreading a second styling approach.
- Shared state needs a genuinely shared lifetime. Local interactions do not need a context,
  and values derivable from the route or existing state do not need a synchronized copy.
- When asynchronous work outlives a route, query or account, cancel it or discard its stale
  result before it can overwrite the new state. A user-scoped storage key alone is not
  enough to prevent an old account's in-flight response from appearing.
- Loading, empty, degraded, error and retry states are part of the feature. Preserve reading
  position and avoid layout shifts when metadata or badges arrive.

## Accessibility

- Use semantic controls, not clickable `div` or `span` elements. Every function must work
  with keyboard alone, including alternatives to dragging and gestures. Use ARIA only
  where native semantics cannot express the behavior.
- Use the existing Dialog, AlertDialog, Sheet and Drawer primitives for focus trapping,
  Escape, restoration and nesting. Preserve visible focus and ensure fixed chrome cannot
  obscure it. Route changes need predictable focus and an announced heading or title.
- Give fields programmatic labels and associate and announce their errors. Give icon-only
  controls accessible names. Announce results, confirmations and failures with live regions.
- Text needs 4.5:1 contrast, or 3:1 for large text; meaningful controls need 3:1. Color cannot
  be the only signal. Pointer targets must be at least 24 by 24 CSS pixels. Keep reflow,
  text resizing and reduced-motion behavior usable.
- Informative images need useful alternative text; decorative images use `alt=""`.
  Mark non-English paper content with `lang` when its language is known.
- Report the affected flows, states, accessibility criteria, keyboard checks and
  screen-reader coverage in the handoff or PR, including anything not verified.
  Do not claim untested states.

## Scientific data and recommendations

- Normalize provider payloads before rendering. Use the existing paper builder and model
  contract rather than a component-specific interpretation of each provider.
- Preserve missing values and metadata provenance. Category and citation enrichment must
  use the same merge rules in every batch; liking or saving cannot select a different merge.
- Recommendation signals must stay bounded and independently inspectable: explicit
  preferences, learned affinities, follows, recency, impact, exploration and diversity.
  Do not collapse them into an unexplained score or let one signal grow without a ceiling.
- Tests for ranking, normalization and deduplication use concrete inputs and independently
  stated expected results. Provider fixtures must resemble the real payload and identify
  whether they are captured or synthetic; neither substitutes for a live-provider check.
