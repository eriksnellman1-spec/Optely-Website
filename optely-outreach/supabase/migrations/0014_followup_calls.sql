-- =============================================================================
-- 0014 – Uppföljningssamtal i Ringpasset.
-- Partnersekvensens samtalssteg och affärer vars nästa steg är ett samtal dyker upp på Idag
-- när de är dags. Efter samtalet går de tillbaka till sin kanal (partnersekvensen / Pipeline).
-- Kräver 0001–0013. Idempotent – säker att köra igen.
-- =============================================================================

alter table public.deals add column if not exists next_action_channel text;
alter table public.deals drop constraint if exists deals_next_action_channel_check;
alter table public.deals add constraint deals_next_action_channel_check
  check (next_action_channel is null or next_action_channel in ('samtal', 'mejl', 'möte'));

-- Befintliga nästa steg som börjar med "Ring" är samtal.
update public.deals set next_action_channel = 'samtal'
 where next_action_channel is null and next_action ~* '^\s*ring';

-- Pipeline-korten: kanal för nästa steg (nya kolumner läggs sist så att vyn kan ersättas).
create or replace view public.pipeline_cards
with (security_invoker = true) as
select
  d.id as deal_id,
  d.stage,
  d.value_eur,
  d.stage_changed_at,
  d.won_at,
  c.id as company_id,
  c.name as company_name,
  c.city,
  c.industry,
  c.status as company_status,
  d.offer,
  coalesce(d.next_action, t.title) as next_action,
  coalesce(d.next_action_at, t.due_at) as next_action_at,
  case when d.next_action is not null then d.next_action_channel end as next_action_channel,
  (d.next_action is not null) as next_action_own
from public.deals d
join public.companies c on c.id = d.company_id
left join lateral (
  select t.title, t.due_at from public.tasks t
   where t.company_id = c.id and t.status = 'open'
   order by t.due_at limit 1
) t on true
where d.stage <> 'forlorad';

create or replace view public.followup_calls
with (security_invoker = true) as
select
  'partner'::text as kind,
  s.id as ref_id,
  null::uuid as company_id,
  s.name,
  s.contact_name,
  s.phone,
  s.step_label as title,
  'Partnersekvens'::text as source,
  (select 'Senaste mejl: ' || coalesce(e.subject, '(utan ämne)') || ' · '
          || to_char(e.occurred_at at time zone 'Europe/Helsinki', 'DD.MM.YYYY')
     from public.partner_emails e
    where e.partner_id = s.id and e.direction = 'sent'
    order by e.occurred_at desc limit 1) as context,
  s.due_date,
  s.overdue,
  'optely'::public.offer as offer
from public.partner_next_step s
where s.step in ('call', 'call_back') and s.due_date <= public.helsinki_today()
union all
select
  'deal',
  d.id,
  c.id,
  c.name,
  trim(k.first_name || ' ' || coalesce(k.last_name, '')),
  coalesce(k.phone, c.phone),
  d.next_action,
  'Pipeline · ' || case d.stage
    when 'kontaktad' then 'Kontaktad' when 'svar' then 'Svar' when 'mote_bokat' then 'Möte bokat'
    when 'mote_hallet' then 'Möte hållet' when 'offert' then 'Offert' when 'kund' then 'Kund' else d.stage::text end,
  nullif(regexp_replace(coalesce(c.notes, ''), '^.*\n', ''), ''),
  (d.next_action_at at time zone 'Europe/Helsinki')::date,
  (d.next_action_at at time zone 'Europe/Helsinki')::date < public.helsinki_today(),
  c.offer
from public.deals d
join public.companies c on c.id = d.company_id
left join public.contacts k on k.id = coalesce(
  c.sequence_contact_id,
  (select k2.id from public.contacts k2 where k2.company_id = c.id order by k2.is_primary desc, k2.created_at limit 1))
where d.stage <> 'forlorad'
  and d.next_action_channel = 'samtal'
  and d.next_action_at is not null
  and (d.next_action_at at time zone 'Europe/Helsinki')::date <= public.helsinki_today()
  and not c.do_not_contact
  -- Bolag som redan ligger i den kalla ringkön visas där i stället.
  and not exists (select 1 from public.tasks t where t.company_id = c.id and t.status = 'open' and t.type = 'call');

-- Utfall för ett uppföljningssamtal.
--   p_outcome: no_answer | talked | meeting | not_now | no
--   Affär + talked: p_next/p_next_channel/p_next_at blir affärens nya nästa steg.
create or replace function public.followup_call_outcome(
  p_kind text, p_ref uuid, p_outcome text, p_notes text default null,
  p_until date default null, p_next text default null, p_next_channel text default null, p_next_at date default null)
returns void
language plpgsql
as $$
declare
  d public.deals%rowtype;
  v_contact uuid;
  v_tomorrow date := public.weekday_on_or_after(public.helsinki_today() + 1);
begin
  if p_outcome not in ('no_answer', 'talked', 'meeting', 'not_now', 'no') then
    raise exception 'Okänt utfall: %', p_outcome;
  end if;
  if p_outcome = 'not_now' and (p_until is null or p_until <= public.helsinki_today()) then
    raise exception 'Välj ett datum framåt';
  end if;

  if p_kind = 'partner' then
    if p_outcome = 'no_answer' then
      update public.partners set sequence_due = v_tomorrow where id = p_ref;
    else
      perform public.log_partner_call(p_ref, p_notes,
        case p_outcome when 'talked' then 'continue' else p_outcome end, p_until);
    end if;
    return;
  end if;

  if p_kind <> 'deal' then raise exception 'Okänd typ: %', p_kind; end if;
  select * into d from public.deals where id = p_ref for update;
  if not found then raise exception 'Affären finns inte'; end if;

  select coalesce(c.sequence_contact_id,
                  (select k.id from public.contacts k where k.company_id = c.id order by k.is_primary desc, k.created_at limit 1))
    into v_contact from public.companies c where c.id = d.company_id;
  insert into public.calls (company_id, contact_id, outcome, notes)
  values (d.company_id, v_contact,
          case p_outcome when 'no_answer' then 'no_answer' when 'talked' then 'interested'
                         when 'meeting' then 'meeting_booked' when 'not_now' then 'not_now' else 'no_need' end::public.call_outcome,
          nullif(trim(coalesce(p_notes, '')), ''));

  if p_outcome = 'no_answer' then
    update public.deals set next_action_at = public.helsinki_at(v_tomorrow, '09:00') where id = p_ref;
  elsif p_outcome = 'talked' then
    if nullif(trim(coalesce(p_next, '')), '') is null then raise exception 'Skriv nästa steg'; end if;
    update public.deals
       set next_action = trim(p_next),
           next_action_channel = p_next_channel,
           next_action_at = case when p_next_at is not null then public.helsinki_at(p_next_at, '09:00') end
     where id = p_ref;
  elsif p_outcome = 'meeting' then
    if d.stage in ('kontaktad', 'svar') then perform public.move_deal_stage(d.company_id, 'mote_bokat'); end if;
    update public.deals
       set next_action = coalesce(nullif(trim(coalesce(p_next, '')), ''), 'Möte'),
           next_action_channel = 'möte',
           next_action_at = case when p_next_at is not null then public.helsinki_at(p_next_at, '09:00') end
     where id = p_ref;
  elsif p_outcome = 'not_now' then
    update public.deals
       set next_action = 'Återkom', next_action_channel = 'samtal',
           next_action_at = public.helsinki_at(public.weekday_on_or_after(p_until), '09:00')
     where id = p_ref;
  else
    if d.stage = 'kund' then
      update public.deals set next_action = null, next_action_channel = null, next_action_at = null where id = p_ref;
    else
      perform public.move_deal_stage(d.company_id, 'forlorad');
    end if;
  end if;
end;
$$;

revoke execute on function public.followup_call_outcome(text, uuid, text, text, date, text, text, date) from public, anon;
grant execute on function public.followup_call_outcome(text, uuid, text, text, date, text, text, date) to authenticated, service_role;
