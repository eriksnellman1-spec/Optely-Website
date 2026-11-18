-- =============================================================================
-- 0012 – Uppföljningssekvens för partner.
--   Dag 0 första mejlet → dag 2 samtal (om telefon finns, annars dag 3 påminnelse i tråden)
--   → dag 7 mejl med kundexempel → dag 14 sista mejlet → +3 mån ny kontakt.
-- Ett svar (efter senaste skickade mejl) stoppar sekvensen: status 'svar' tills Erik väljer
-- Boka möte, Ring upp, Inte nu eller Nej. Helgsteg flyttas till måndag.
-- Kräver 0001–0011. Idempotent – säker att köra igen.
-- =============================================================================

alter table public.partner_checkins add column if not exists channel text;
alter table public.partner_checkins drop constraint if exists partner_checkins_channel_check;
alter table public.partner_checkins add constraint partner_checkins_channel_check
  check (channel is null or channel in ('samtal', 'mejl', 'svar', 'möte', 'annat'));

alter table public.partners add column if not exists sequence_started_at timestamptz;
alter table public.partners add column if not exists sequence_status text;
alter table public.partners add column if not exists sequence_step text;
alter table public.partners add column if not exists sequence_due date;
alter table public.partners add column if not exists paused_until date;
alter table public.partners drop constraint if exists partners_sequence_status_check;
alter table public.partners add constraint partners_sequence_status_check
  check (sequence_status is null or sequence_status in ('aktiv', 'svar', 'vilande', 'avslutad', 'partner'));
alter table public.partners drop constraint if exists partners_sequence_step_check;
alter table public.partners add constraint partners_sequence_step_check
  check (sequence_step is null or sequence_step in
    ('call', 'nudge_mail', 'example_mail', 'last_mail', 'reconnect', 'call_back', 'checkin'));

-- Lördag/söndag → måndag.
create or replace function public.weekday_on_or_after(p date)
returns date
language sql
immutable
as $$
  select case extract(isodow from p) when 6 then p + 2 when 7 then p + 1 else p end
$$;

-- Dagar efter första mejlet per steg (för att räkna om när ett steg hoppas över).
create or replace function public.partner_step_offset(p_step text)
returns int
language sql
immutable
as $$
  select case p_step when 'call' then 2 when 'nudge_mail' then 3 when 'example_mail' then 7 when 'last_mail' then 14 end
$$;

-- Kanal som gör ett steg klart.
create or replace function public.partner_step_channel(p_step text)
returns text
language sql
immutable
as $$
  select case p_step
    when 'call' then 'samtal' when 'call_back' then 'samtal'
    when 'nudge_mail' then 'mejl' when 'example_mail' then 'mejl' when 'last_mail' then 'mejl'
    when 'reconnect' then 'mejl/samtal' when 'checkin' then 'valfri'
  end
$$;

-- Ett steg är gjort (mejl skickat eller samtal loggat) – flytta partnern till nästa steg.
create or replace function public.partner_step_done(p_partner uuid, p_channel text, p_at timestamptz)
returns void
language plpgsql
as $$
declare
  p public.partners%rowtype;
  v_day date := (p_at at time zone 'Europe/Helsinki')::date;
  v_start date;
  v_ch text;
begin
  select * into p from public.partners where id = p_partner for update;
  if not found then return; end if;

  -- Första mejlet startar sekvensen.
  if p.sequence_status is null then
    if p_channel <> 'mejl' then return; end if;
    update public.partners
       set sequence_started_at = p_at,
           sequence_status = 'aktiv',
           sequence_step = case when nullif(trim(coalesce(p.phone, '')), '') is not null then 'call' else 'nudge_mail' end,
           sequence_due = public.weekday_on_or_after(
             v_day + case when nullif(trim(coalesce(p.phone, '')), '') is not null then 2 else 3 end),
           paused_until = null
     where id = p_partner;
    return;
  end if;

  -- Aktiv partner: varje kontakt flyttar nästa check-in.
  if p.sequence_status = 'partner' then
    update public.partners
       set sequence_step = 'checkin',
           sequence_due = public.weekday_on_or_after(v_day + p.checkin_interval_days)
     where id = p_partner;
    return;
  end if;

  if p.sequence_status not in ('aktiv', 'vilande') or p.sequence_step is null then return; end if;

  v_ch := public.partner_step_channel(p.sequence_step);
  if not (v_ch = p_channel or (v_ch = 'mejl/samtal' and p_channel in ('mejl', 'samtal'))) then return; end if;

  v_start := (coalesce(p.sequence_started_at, p_at) at time zone 'Europe/Helsinki')::date;
  update public.partners
     set sequence_status = case when p.sequence_step in ('reconnect', 'call_back') then 'avslutad' else 'aktiv' end,
         sequence_step = case p.sequence_step
                           when 'call' then 'example_mail'
                           when 'nudge_mail' then 'example_mail'
                           when 'example_mail' then 'last_mail'
                           when 'last_mail' then 'reconnect'
                         end,
         sequence_due = case p.sequence_step
                          when 'call' then public.weekday_on_or_after(greatest(v_start + 7, v_day + 1))
                          when 'nudge_mail' then public.weekday_on_or_after(greatest(v_start + 7, v_day + 1))
                          when 'example_mail' then public.weekday_on_or_after(greatest(v_start + 14, v_day + 1))
                          when 'last_mail' then public.weekday_on_or_after((v_day + interval '3 months')::date)
                        end,
         paused_until = null
   where id = p_partner;
end;
$$;

-- Hoppa över steget: nästa steg räknas från i dag.
create or replace function public.partner_skip_step(p_partner uuid)
returns void
language plpgsql
as $$
declare
  p public.partners%rowtype;
  v_today date := public.helsinki_today();
  v_next text;
begin
  select * into p from public.partners where id = p_partner for update;
  if not found then raise exception 'Partnern finns inte'; end if;
  if p.sequence_status = 'svar' then raise exception 'Hantera svaret först'; end if;

  if p.sequence_status is null then
    -- Hoppa över första mejlet: sekvensen startar i dag utan mejl.
    update public.partners
       set sequence_started_at = now(), sequence_status = 'aktiv',
           sequence_step = case when nullif(trim(coalesce(p.phone, '')), '') is not null then 'call' else 'nudge_mail' end,
           sequence_due = public.weekday_on_or_after(v_today + case when nullif(trim(coalesce(p.phone, '')), '') is not null then 2 else 3 end)
     where id = p_partner;
    return;
  end if;

  if p.sequence_status = 'partner' then
    update public.partners set sequence_due = public.weekday_on_or_after(v_today + p.checkin_interval_days) where id = p_partner;
    return;
  end if;

  if p.sequence_step is null then raise exception 'Inget steg att hoppa över'; end if;

  v_next := case p.sequence_step
              when 'call' then 'example_mail' when 'nudge_mail' then 'example_mail'
              when 'example_mail' then 'last_mail' when 'last_mail' then 'reconnect' end;
  update public.partners
     set sequence_status = case when v_next is null then 'avslutad' else 'aktiv' end,
         sequence_step = v_next,
         sequence_due = case
           when v_next = 'reconnect' then public.weekday_on_or_after((v_today + interval '3 months')::date)
           when v_next is not null then public.weekday_on_or_after(
             v_today + greatest(public.partner_step_offset(v_next) - coalesce(public.partner_step_offset(p.sequence_step), 0), 1))
         end,
         paused_until = null
   where id = p_partner;
end;
$$;

-- Hantera ett svar (eller resultatet av ett samtal):
--   meeting  → aktiv partner (check-in enligt intervallet)
--   call     → Ring upp, i dag
--   not_now  → vilande till p_until, då ny kontakt
--   no       → avslutad
create or replace function public.partner_handle(p_partner uuid, p_action text, p_until date default null)
returns void
language plpgsql
as $$
declare
  p public.partners%rowtype;
  v_today date := public.helsinki_today();
begin
  select * into p from public.partners where id = p_partner for update;
  if not found then raise exception 'Partnern finns inte'; end if;

  if p_action = 'meeting' then
    update public.partners
       set sequence_status = 'partner', sequence_step = 'checkin',
           sequence_due = public.weekday_on_or_after(v_today + checkin_interval_days), paused_until = null
     where id = p_partner;
  elsif p_action = 'call' then
    update public.partners
       set sequence_status = 'aktiv', sequence_step = 'call_back',
           sequence_due = public.weekday_on_or_after(v_today), paused_until = null
     where id = p_partner;
  elsif p_action = 'not_now' then
    if p_until is null or p_until <= v_today then raise exception 'Välj ett datum framåt'; end if;
    update public.partners
       set sequence_status = 'vilande', sequence_step = 'reconnect',
           sequence_due = public.weekday_on_or_after(p_until), paused_until = p_until
     where id = p_partner;
  elsif p_action = 'no' then
    update public.partners
       set sequence_status = 'avslutad', sequence_step = null, sequence_due = null, paused_until = null
     where id = p_partner;
  else
    raise exception 'Okänt val: %', p_action;
  end if;

  update public.partner_emails set handled_at = now()
   where partner_id = p_partner and direction = 'received' and handled_at is null;
end;
$$;

-- Logga ett samtal med partnern. Samtalet gör ett samtalssteg klart; resultatet kan också boka möte m.m.
create or replace function public.log_partner_call(p_partner uuid, p_notes text default null,
                                                  p_result text default 'continue', p_until date default null)
returns void
language plpgsql
as $$
begin
  insert into public.partner_checkins (partner_id, notes, channel)
  values (p_partner, coalesce(nullif(trim(p_notes), ''), 'Samtal'), 'samtal');
  if p_result in ('meeting', 'not_now', 'no') then
    perform public.partner_handle(p_partner, p_result, p_until);
  end if;
end;
$$;

-- Check-in → stegen. Mejl och svar hanteras av partner_emails-triggern.
create or replace function public.partner_checkin_progress()
returns trigger
language plpgsql
as $$
begin
  if new.channel is null or new.channel in ('samtal', 'möte', 'annat') then
    perform public.partner_step_done(new.partner_id, coalesce(new.channel, 'annat'), new.checked_in_at);
  end if;
  return new;
end;
$$;

drop trigger if exists partner_checkins_progress on public.partner_checkins;
create trigger partner_checkins_progress after insert on public.partner_checkins
  for each row execute function public.partner_checkin_progress();

-- Partnermejl: check-in med kanal, skickat → nästa steg, svar efter senaste skickade → status 'svar'.
create or replace function public.partner_email_checkin()
returns trigger
language plpgsql
as $$
declare
  v_last_sent timestamptz;
begin
  insert into public.partner_checkins (partner_id, notes, checked_in_at, channel)
  values (
    new.partner_id,
    case when new.direction = 'sent' then 'Mejl skickat' else 'Svar' end
      || coalesce(': ' || nullif(trim(new.subject), ''), ''),
    new.occurred_at,
    case when new.direction = 'sent' then 'mejl' else 'svar' end
  );

  if new.direction = 'sent' then
    perform public.partner_step_done(new.partner_id, 'mejl', new.occurred_at);
  else
    select max(occurred_at) into v_last_sent from public.partner_emails
     where partner_id = new.partner_id and direction = 'sent';
    if v_last_sent is not null and new.occurred_at > v_last_sent then
      update public.partners set sequence_status = 'svar'
       where id = new.partner_id and sequence_status in ('aktiv', 'vilande');
    end if;
  end if;
  return new;
end;
$$;

-- Nästa steg per partner (ersätter 30-dagarsvyn partners_due i appen).
create or replace view public.partner_next_step
with (security_invoker = true) as
with last_mail as (
  select distinct on (partner_id) partner_id, thread_id
    from public.partner_emails where thread_id is not null
   order by partner_id, occurred_at desc
), reply as (
  select distinct on (partner_id) partner_id, subject, snippet, occurred_at, thread_id
    from public.partner_emails where direction = 'received' and handled_at is null
   order by partner_id, occurred_at desc
), base as (
  select
    p.id, p.name, p.type, p.contact_name, p.email, p.phone, p.city, p.last_checkin_at,
    coalesce(p.sequence_status, 'ny') as status,
    case
      when p.sequence_status = 'svar' then 'reply'
      when p.sequence_status is null then 'first_mail'
      else p.sequence_step
    end as step,
    case
      when p.sequence_status = 'svar' then public.helsinki_today()
      when p.sequence_status is null then public.helsinki_today()
      else p.sequence_due
    end as due_date,
    p.sequence_started_at, p.paused_until,
    coalesce(r.thread_id, lm.thread_id) as thread_id,
    r.subject as reply_subject, r.snippet as reply_snippet, r.occurred_at as reply_at
  from public.partners p
  left join last_mail lm on lm.partner_id = p.id
  left join reply r on r.partner_id = p.id
)
select
  b.*,
  case b.step
    when 'reply' then 'Svar att hantera'
    when 'first_mail' then 'Skicka första mejlet'
    when 'call' then 'Ring och följ upp mejlet'
    when 'nudge_mail' then 'Kort påminnelse i tråden'
    when 'example_mail' then 'Mejl med kundexempel'
    when 'last_mail' then 'Sista mejlet'
    when 'reconnect' then 'Ny kontakt med något nytt'
    when 'call_back' then 'Ring upp'
    when 'checkin' then 'Check-in'
  end as step_label,
  case b.step
    when 'reply' then 'mejl'
    when 'first_mail' then 'mejl'
    else public.partner_step_channel(b.step)
  end as step_channel,
  (b.due_date is not null and b.due_date < public.helsinki_today()) as overdue,
  case
    when b.step = 'reply' then 0
    when b.due_date < public.helsinki_today() then 1
    when b.due_date = public.helsinki_today() and b.status <> 'ny' then 2
    when b.status = 'ny' then 4
    when b.step is null then 5
    else 3
  end as sort_rank
from base b;

-- Befintliga partner som redan mejlats: sekvensen startar från senaste skickade mejlet.
do $$
declare
  r record;
begin
  for r in
    select p.id, p.phone,
           (select max(e.occurred_at) from public.partner_emails e where e.partner_id = p.id and e.direction = 'sent') as last_sent
      from public.partners p
     where p.sequence_status is null
  loop
    continue when r.last_sent is null;
    update public.partners
       set sequence_started_at = r.last_sent,
           sequence_status = case when exists (
                 select 1 from public.partner_emails e
                  where e.partner_id = r.id and e.direction = 'received' and e.handled_at is null and e.occurred_at > r.last_sent)
               then 'svar' else 'aktiv' end,
           sequence_step = case when nullif(trim(coalesce(r.phone, '')), '') is not null then 'call' else 'nudge_mail' end,
           sequence_due = public.weekday_on_or_after(
             (r.last_sent at time zone 'Europe/Helsinki')::date
             + case when nullif(trim(coalesce(r.phone, '')), '') is not null then 2 else 3 end)
     where id = r.id;
  end loop;
end;
$$;

revoke execute on function public.partner_skip_step(uuid) from public, anon;
revoke execute on function public.partner_handle(uuid, text, date) from public, anon;
revoke execute on function public.log_partner_call(uuid, text, text, date) from public, anon;
revoke execute on function public.partner_step_done(uuid, text, timestamptz) from public, anon;
grant execute on function public.partner_skip_step(uuid) to authenticated, service_role;
grant execute on function public.partner_handle(uuid, text, date) to authenticated, service_role;
grant execute on function public.log_partner_call(uuid, text, text, date) to authenticated, service_role;
grant execute on function public.partner_step_done(uuid, text, timestamptz) to authenticated, service_role;
