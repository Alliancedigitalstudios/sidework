// plaid-webhook — see docs/BUILD_PLAN.md section 4 and docs/SECURITY.md section 4.
// Secrets via Deno.env: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV. Never return access tokens to clients.
Deno.serve(async (_req) => new Response(JSON.stringify({ todo: "plaid-webhook" }), { headers: { "content-type": "application/json" } }));
