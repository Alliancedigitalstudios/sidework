# Side Work — context for Claude Code

Tip-tracking + budgeting app for restaurant servers, bartenders and food runners. First user: a Cheesecake Factory server/food runner paid daily to a pay card. Brand: "Side Work: Tips & Budget" (working name; trademark check pending).

## Read first
- docs/SPEC.md — product spec (onboarding, floor projection, buckets, reconciliation)
- docs/SECURITY.md — threat model, risk register, Plaid controls. Non-negotiable.
- docs/DESIGN_BRIEF.md — screens, flows, visual system
- docs/BUILD_PLAN.md — stack, architecture, data model, Plaid flow, milestones
Full living versions of these docs are Claude Docs; links are at the top of each file.

## Rules
- Local-first. Shifts, tips, bills, profile never leave the phone. Backend exists only for Plaid.
- No ads, no tracking SDKs. Export (CSV/PDF) is always free.
- Plaid: products = transactions only, depository filter, token server-side only, encrypted per user. Never log tokens or amounts.
- The domain engine (packages/engine) is pure TypeScript, no I/O, fully unit-tested. UI reads from it; never duplicate math in screens.
- WorkProfile drives visibility: single role → no role picker; direction=receive → no tip-out field; no bills → safe-to-spend hidden.
- iOS first, Android from the same Expo codebase. Dark mode first.
- Never commit secrets. `.env` is gitignored; Plaid secrets live in `supabase secrets`.

## Commands
- `npm install` · `npm test` · `npm run typecheck` · `npm run mobile`
