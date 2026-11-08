-- Daily counts for the Hanpan intro page (site/api/track.js, site/api/stats.js).
-- Run once in the Supabase SQL editor of the tenai.kr project. Safe to run again.
--
-- What is kept: per Seoul day, how many visits, unique visitors and download clicks,
-- by country/city, referring host and button spot. No IP address, no cookie.
-- Unique visitors need a one-way daily fingerprint (sha256 of a secret salt, the day,
-- the IP and the browser); it is kept only for today and yesterday, then deleted.
-- Only the server (service role / secret key) can read or write: no policy is given
-- to anon or authenticated, so the publishable key on tenai.kr cannot reach them.

create table if not exists public.hanpan_site_counts (
  day   date   not null,
  kind  text   not null check (kind in ('d', 'geo', 'ref', 'dlgeo', 'dlplace')),
  field text   not null check (char_length(field) between 1 and 100),
  n     bigint not null default 0,
  primary key (day, kind, field)
);

create table if not exists public.hanpan_site_visitors (
  day     date not null,
  visitor text not null check (char_length(visitor) = 32),
  primary key (day, visitor)
);

alter table public.hanpan_site_counts enable row level security;
alter table public.hanpan_site_visitors enable row level security;
revoke all on public.hanpan_site_counts from anon, authenticated;
revoke all on public.hanpan_site_visitors from anon, authenticated;

-- one visit or one download click: each {kind, field} in p_counts goes up by one;
-- p_visitor (32 hex) adds one to d/visitors the first time it is seen that day
create or replace function public.hanpan_site_track(p_day date, p_counts jsonb, p_visitor text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  added integer;
begin
  if p_visitor is not null then
    insert into hanpan_site_visitors (day, visitor) values (p_day, p_visitor)
      on conflict do nothing;
    get diagnostics added = row_count;
    if added > 0 then
      insert into hanpan_site_counts (day, kind, field, n) values (p_day, 'd', 'visitors', 1)
        on conflict (day, kind, field) do update set n = hanpan_site_counts.n + 1;
    end if;
    delete from hanpan_site_visitors where day < p_day - 1;
  end if;
  for item in select value from jsonb_array_elements(coalesce(p_counts, '[]'::jsonb)) loop
    insert into hanpan_site_counts (day, kind, field, n)
      values (p_day, item ->> 'kind', left(item ->> 'field', 100), 1)
      on conflict (day, kind, field) do update set n = hanpan_site_counts.n + 1;
  end loop;
end;
$$;

-- every count between two days, as one JSON array (one row, so no row limit applies)
create or replace function public.hanpan_site_stats(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'field', field, 'n', n)), '[]'::jsonb)
  from hanpan_site_counts
  where day between p_from and p_to;
$$;

revoke execute on function public.hanpan_site_track(date, jsonb, text) from public, anon, authenticated;
revoke execute on function public.hanpan_site_stats(date, date) from public, anon, authenticated;
grant execute on function public.hanpan_site_track(date, jsonb, text) to service_role;
grant execute on function public.hanpan_site_stats(date, date) to service_role;
