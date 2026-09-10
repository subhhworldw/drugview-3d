create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.cron_config (
  key text primary key,
  value text not null
);
revoke all on private.cron_config from anon, authenticated;
alter table private.cron_config enable row level security;
grant select, insert, update on private.cron_config to sandbox_exec;
grant usage on schema private to sandbox_exec;

select cron.alter_job(
  1,
  command := $c$
  select net.http_post(
    url := 'https://project--1032beb5-2c66-4516-87fe-9cc59b0812f0.lovable.app/api/public/hooks/seed-drugs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-seed-secret', (select value from private.cron_config where key = 'seed_secret')
    ),
    body := '{"limit": 50}'::jsonb,
    timeout_milliseconds := 300000
  ) as request_id;
$c$
);