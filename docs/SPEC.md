# Product Spec (snapshot) — full: https://claude.ai/artifact/Q2mVGNDR7gHSExJSCcoXK2

**Thesis.** Shift is the core object, Deposit is the second, reconciliation between them is the feature nobody ships. Budget, floor projection, tax ledger are views over those two, shaped by an onboarding WorkProfile.

**Onboarding (<3 min, skippable):** workplace+state → roles (Server, Food Runner, Bartender, Busser, Host, custom; always ask "do you ever bartend?"; "mostly…" slider) → pay per role → tip-out rules per role (pay/receive/both; basis sales|tips; recipients %; Cheesecake preset 2.2/1.0/1.0 of sales) → how money arrives (card tips → pay card next day; cash stays cash; wages biweekly + payday; pay card vendor) → bills + "bad night / great night" per role + optional goal.

**Core:** role-aware 10-second log with templates; tip-out engine; real hourly by role; expected deposit per shift; pay-card reconciliation (manual, CSV, Plaid); paycheck explainer with mismatch flag; heat-map calendar; CSV/PDF export; import from ServerLife/Just The Tips/TipSee/Checkout. All free, never paywalled.

**Budget:** Holding → weekly salary release (floor week of season) → Spend; surplus → Buffer → Goals. Bills calendar; safe-to-spend = Spend − bills due before next deposit. Tax reserve per deposit. Slow Season Fund swept from strong months, prompted 8 weeks before Jan–Feb.

**Floor projection:** p25 of her own history per role×weekday×shiftType per month (≥6 samples) else preset; × season factor; bills evaluated at the floor; schedule entry turns planned shifts into floor/likely/high; shift value view compares server vs runner vs bar.

**Bank link (v1, opt-in):** Plaid Transactions only, deposits only, read-only, paid-tier flag (comped for first users). App must be complete without it.

**Pricing:** free core, no ads; one-time or ~$20–30/yr for budgeting/forecast/tax layer + sync.

**Open questions for her:** card vendor; what loads daily (gross/net/tip share); exact tip-out %; runner rate and how share is paid; stub job codes; Faster Pay usage; payday; bank; bills + lowest month; iPhone/Android; current app.
