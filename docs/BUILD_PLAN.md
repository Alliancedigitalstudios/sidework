# Technical Build Plan (snapshot) — full: https://claude.ai/artifact/7Ahb1b8eH99Pw24csQJfSR

**Stack:** Expo (RN, TS, Expo Router); op-sqlite + SQLCipher + Drizzle; expo-secure-store; expo-local-authentication; iCloud/Drive encrypted backup; Supabase (Postgres+RLS, Edge Functions, passkeys) for Plaid only; react-native-plaid-link-sdk; RevenueCat later; Sentry opt-in scrubbed; GitHub Actions + EAS; gitleaks; Dependabot.

**Architecture:** phone is system of record; engine = pure functions over WorkProfile/Shift/Deposit/Bill; backend sidecar: plaid-link-token → plaid-exchange → plaid-webhook (sync) → app pulls synced_deposits (RLS) → local matcher; plaid-unlink; plaid-inactivity (90d).

**Data model:** device tables work_profile_versions, roles, tipout_rules, shifts, deposits, shift_deposit_links, paychecks, bills, buckets, bucket_moves, projections_cache, audit_log. Server: users, plaid_items (no client access), synced_deposits, audit_events.

**Milestones:** M0 foundation (engine+tests+CI) · M1 track · M2 budget+floor · M3 sync+security checklist+Plaid prod · M4 polish+TestFlight · M5 Android.

**First step:** confirm her pay card appears in Plaid Sandbox institution search; if not, Teller fallback (architecture unchanged).
