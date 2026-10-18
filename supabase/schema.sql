-- Apply to a Supabase Free project in the SQL editor. No secret key is used by the website.
create table if not exists public.learning_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  constraint snapshot_size_limit check (octet_length(payload::text) <= 20971520)
);
alter table public.learning_snapshots enable row level security;
drop policy if exists snapshot_own_read on public.learning_snapshots;
create policy snapshot_own_read on public.learning_snapshots for select to authenticated using ((select auth.uid()) = user_id);
-- Writes only go through CAS. The browser cannot accidentally do a last-write-wins UPDATE.
revoke all on public.learning_snapshots from anon, authenticated;
grant select on public.learning_snapshots to authenticated;

create or replace function public.cas_learning_snapshot(expected_revision bigint, new_payload jsonb)
returns bigint language plpgsql security definer set search_path = pg_catalog, public as $$
declare account uuid := auth.uid(); next_revision bigint;
begin
  if account is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if new_payload is null or jsonb_typeof(new_payload) <> 'object'
     or not coalesce(((new_payload->>'version' = '1'
       and jsonb_typeof(new_payload->'entries') = 'object'
       and jsonb_typeof(new_payload->'history') = 'array')
       or (new_payload->>'transport' = 'jeongyeon-gzip-v1'
       and jsonb_typeof(new_payload->'data') = 'string'
       and jsonb_typeof(new_payload->'uncompressedBytes') = 'number'
       and (new_payload->>'uncompressedBytes')::bigint between 1 and 20971520)), false)
     or octet_length(new_payload::text) > 20971520 then
    raise exception 'Invalid snapshot' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.learning_snapshots(user_id, revision, payload)
      values(account, 1, new_payload)
      on conflict (user_id) do nothing returning revision into next_revision;
  else
    update public.learning_snapshots set payload = new_payload,
      revision = revision + 1, updated_at = now()
      where user_id = account and revision = expected_revision
      returning revision into next_revision;
  end if;
  return next_revision; -- NULL is an ordinary concurrent-write conflict; refetch and merge.
end;
$$;
revoke all on function public.cas_learning_snapshot(bigint, jsonb) from public, anon;
grant execute on function public.cas_learning_snapshot(bigint, jsonb) to authenticated;
