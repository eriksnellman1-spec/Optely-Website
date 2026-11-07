-- =============================================================================
-- 0006 – Idag-listan (docs/saljsystem.md fas C). Kräver 0005.
-- Två läsvyer: obehandlade svar/tips och partner som behöver höras.
-- =============================================================================

-- Svar och partnertips som inte hanterats än (siffran vid Hem i sidomenyn).
create or replace view public.notices
with (security_invoker = true) as
select
  t.id as task_id,
  t.type as task_type,
  case when t.reply_id is not null then 'reply' else 'partner_tip' end as kind,
  t.title,
  t.description,
  t.due_at,
  t.created_at,
  c.id as company_id,
  c.name as company_name,
  c.city,
  p.name as partner_name,
  k.id as contact_id,
  trim(k.first_name || ' ' || coalesce(k.last_name, '')) as contact_name,
  coalesce(k.phone, c.phone) as phone,
  r.body as reply_body,
  r.classification::text as classification,
  r.received_at
from public.tasks t
join public.companies c on c.id = t.company_id
left join public.partners p on p.id = c.partner_id
left join public.contacts k on k.id = coalesce(t.contact_id, c.sequence_contact_id)
left join public.replies r on r.id = t.reply_id
where t.status = 'open'
  and t.type in ('call', 'follow_up')
  and (t.reply_id is not null or c.status = 'with_partner');

-- Partner vars senaste check-in är äldre än partnerns intervall (eller som aldrig hörts).
create or replace view public.partners_due
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.type,
  p.contact_name,
  p.email,
  p.phone,
  p.city,
  p.checkin_interval_days,
  p.last_checkin_at,
  case when p.last_checkin_at is null then null
       else (public.helsinki_today() - (p.last_checkin_at at time zone 'Europe/Helsinki')::date) end as days_since
from public.partners p
where p.last_checkin_at is null
   or p.last_checkin_at < now() - make_interval(days => p.checkin_interval_days);
