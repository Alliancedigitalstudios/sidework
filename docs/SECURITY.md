# Security & Privacy Plan (snapshot) — full: https://claude.ai/artifact/RKtLZVG23dML9wUqAk2fQT

**Principles:** local-first; least data; least privilege (Plaid transactions, read-only); reversible (unlink deletes within 24h); honest privacy screen; no tracking SDKs.

**Tiers:** T0 never collected (SSN, bank creds, PAN). T1 server opt-in (Plaid token, item id, deposit rows: date/amount/mask). T2 device (shifts, tips, bills, profile; encrypted SQLite + user's own cloud backup). T3 ops (scrubbed crash reports).

**Plaid controls:** link_token minted server-side; public_token exchanged server-side; access_token envelope-encrypted per user (KMS); never logged/returned; /transactions/sync with cursor; webhooks signature-verified (SYNC_UPDATES_AVAILABLE, ITEM_LOGIN_REQUIRED, PENDING_EXPIRATION, USER_PERMISSION_REVOKED); unlink → /item/remove + delete rows; 90-day inactivity auto-remove; merchant/category discarded on ingest.

**App:** biometric lock on launch + 60s background; amounts hidden in switcher; passkeys only; cert pinning; SQLCipher; Keychain for keys; encrypted backup to iCloud/Drive.

**Backend:** Supabase RLS on every table; plaid_items has no client policy (service role only in Edge Functions); secrets in Supabase secrets; gitleaks + CI secret scan; Dependabot.

**Risk register R1–R16** and **pre-launch checklist (20 items)** live in the full doc. All must be ticked before her first real bank link.

**Compliance:** Plaid production access (privacy policy, questionnaire, consent screenshots); App Store privacy label; CCPA request flow; GLBA-shaped safeguards; no money movement ever; tax exports labelled record-keeping.

**IR:** Sev1 token/DB exposure → rotate Plaid secret + KMS key, remove all Items, notify within 72h. Runbooks: secret rotation, remove-all-items, data request, shutdown (30-day notice).
