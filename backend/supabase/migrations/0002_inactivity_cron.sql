-- Daily 90-day Plaid cleanup. Token is generated inside the DB (Vault); nobody copies a secret.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'cleanup_token')
 where not exists (select 1 from vault.secrets where name='cleanup_token');
create or replace function public.cleanup_token_ok(t text) returns boolean
language sql security definer set search_path = '' as $$
  select exists(select 1 from vault.decrypted_secrets where name='cleanup_token' and decrypted_secret=t);
$$;
revoke all on function public.cleanup_token_ok(text) from public, anon, authenticated;
grant execute on function public.cleanup_token_ok(text) to service_role;
select cron.schedule('plaid-inactivity-daily','17 9 * * *', $c$
  select net.http_post(
    url := 'https://twmjkrnqmpztrebeyhyi.supabase.co/functions/v1/plaid-inactivity',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cleanup_token')),
    body := '{}'::jsonb);
$c$);
