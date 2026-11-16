-- =============================================================================
-- 0011 – Partnermejl från Gmail (via n8n): skickade mejl och svar loggas automatiskt.
-- Kräver 0001–0010. Idempotent – säker att köra igen.
-- =============================================================================

create table if not exists public.partner_emails (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners (id) on delete cascade,
  direction     text not null check (direction in ('sent', 'received')),
  external_id   text not null,                 -- Gmails meddelande-id
  thread_id     text,
  from_address  text,
  to_addresses  text[] not null default '{}',
  subject       text,
  snippet       text,
  occurred_at   timestamptz not null default now(),
  handled_at    timestamptz,                   -- svar: när Erik markerat det som hanterat
  created_at    timestamptz not null default now(),
  unique (partner_id, external_id)
);

create index if not exists partner_emails_partner_idx on public.partner_emails (partner_id, occurred_at desc);
create index if not exists partner_emails_open_replies_idx on public.partner_emails (occurred_at desc)
  where direction = 'received' and handled_at is null;

alter table public.partner_emails enable row level security;
drop policy if exists "authenticated_all" on public.partner_emails;
create policy "authenticated_all" on public.partner_emails for all to authenticated using (true) with check (true);

-- Varje mejl blir också en check-in (syns som "senast hörd" och i historiken).
create or replace function public.partner_email_checkin()
returns trigger
language plpgsql
as $$
begin
  insert into public.partner_checkins (partner_id, notes, checked_in_at)
  values (
    new.partner_id,
    case when new.direction = 'sent' then 'Mejl skickat' else 'Svar' end
      || coalesce(': ' || nullif(trim(new.subject), ''), ''),
    new.occurred_at
  );
  return new;
end;
$$;

drop trigger if exists partner_emails_checkin on public.partner_emails;
create trigger partner_emails_checkin after insert on public.partner_emails
  for each row execute function public.partner_email_checkin();

-- Loggar ett Gmail-meddelande mot de partner det gäller.
--   p: { direction: 'sent'|'received', id, thread_id, from, to: [..], cc: [..], subject, snippet, date }
--   Skickat matchas på mottagare (to/cc), mottaget på avsändare. Exakt adress eller samma domän
--   (allmänna e-posttjänster som gmail.com räknas inte som domän).
create or replace function public.log_gmail_message(p jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_dir text := case when p ->> 'direction' = 'sent' then 'sent' else 'received' end;
  v_id text := nullif(trim(p ->> 'id'), '');
  v_emails text[];
  v_domains text[];
  v_at timestamptz;
  v_inserted int := 0;
  v_names text[];
  v_count int;
begin
  if v_id is null then raise exception 'Meddelandet saknar id'; end if;

  select coalesce(array_agg(distinct lower(m[1])), '{}')
    into v_emails
    from regexp_matches(
           case when v_dir = 'sent' then coalesce(p -> 'to', '[]'::jsonb)::text || ' ' || coalesce(p -> 'cc', '[]'::jsonb)::text
                else coalesce(p ->> 'from', '') end,
           '([A-Za-z0-9._%+''-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g') as m;

  select coalesce(array_agg(distinct d), '{}') into v_domains
    from (select public.norm_domain(e) as d from unnest(v_emails) e) x where d is not null;

  v_at := case
    when coalesce(p ->> 'date', '') ~ '^\d{12,}$' then to_timestamp((p ->> 'date')::bigint / 1000.0)
    when coalesce(p ->> 'date', '') <> '' then (p ->> 'date')::timestamptz
    else now()
  end;

  with matched as (
    select pa.id, pa.name
      from public.partners pa
     where lower(coalesce(pa.email, '')) = any(v_emails)
        or (public.norm_domain(pa.email) is not null and public.norm_domain(pa.email) = any(v_domains))
  ), ins as (
    insert into public.partner_emails (partner_id, direction, external_id, thread_id, from_address, to_addresses,
                                       subject, snippet, occurred_at)
    select m.id, v_dir, v_id, nullif(p ->> 'thread_id', ''), nullif(p ->> 'from', ''),
           case when v_dir = 'sent' then v_emails else '{}' end,
           left(nullif(trim(p ->> 'subject'), ''), 300), left(nullif(trim(p ->> 'snippet'), ''), 500), v_at
      from matched m
    on conflict (partner_id, external_id) do nothing
    returning partner_id
  )
  select count(*), coalesce(array_agg(pa.name), '{}')
    into v_count, v_names
    from ins join public.partners pa on pa.id = ins.partner_id;

  v_inserted := v_count;
  return jsonb_build_object('direction', v_dir, 'logged', v_inserted, 'partners', to_jsonb(v_names));
end;
$$;

revoke execute on function public.log_gmail_message(jsonb) from public, anon, authenticated;
grant execute on function public.log_gmail_message(jsonb) to service_role;
