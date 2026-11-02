-- =============================================================================
-- 0003 – Ringpasset och den automatiska uppföljningssekvensen för kalla samtal.
-- Kräver 0002 (enum-värdena 'nurture' och 'template').
--
-- Sekvensen (steg → kanal):
--   1 mejl   Mejl 1 via AI Gatekeeper – startar sekvensen när det köas/skickas
--   2 samtal Samtal 1
--   3 samtal Samtal 2 + röstmeddelande + "ringde nyss"-mejl
--   4 mejl   Case-mejl
--   5 samtal Samtal 3
--   6 samtal Samtal 4 + röstmeddelande
--   7 mejl   Avslutsmejl
--   8 samtal Sista samtalet
--   → 'nurture' i 90 dagar, sedan tillbaka till 'new' (ny runda).
--
-- Ringdagar och mejldagar läses från settings.week_plan (channel 'phone' / 'email').
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Kolumner
-- -----------------------------------------------------------------------------

alter table public.companies
  add column if not exists sequence_step        smallint check (sequence_step between 1 and 8),
  add column if not exists sequence_round       smallint not null default 1 check (sequence_round >= 1),
  add column if not exists sequence_contact_id  uuid references public.contacts (id) on delete set null,
  add column if not exists sequence_started_at  timestamptz,
  add column if not exists next_action_at       date,
  add column if not exists nurture_until        date;

comment on column public.companies.sequence_step is 'Nästa steg i uppföljningssekvensen (1–8). null = inte i sekvens.';
comment on column public.companies.next_action_at is 'Dag då nästa steg ska utföras (Europe/Helsinki).';
comment on column public.companies.nurture_until is 'Vilande till detta datum, sedan tillbaka till status new.';

create index if not exists companies_sequence_due_idx
  on public.companies (next_action_at) where sequence_step is not null;
create index if not exists companies_nurture_idx
  on public.companies (nurture_until) where nurture_until is not null;

alter table public.tasks
  add column if not exists sequence_step   smallint check (sequence_step between 1 and 8),
  add column if not exists sequence_round  smallint;

-- Högst en öppen ringuppgift per bolag, runda och steg – gör cron-jobbet idempotent.
create unique index if not exists tasks_one_open_sequence_call
  on public.tasks (company_id, sequence_round, sequence_step)
  where status = 'open' and type = 'call' and sequence_step is not null;

alter table public.emails
  add column if not exists sequence_round  smallint not null default 1,
  add column if not exists template        text;

comment on column public.emails.template is 'Slug för mejlmallen i context_entries (null = skrivet i Gatekeeper).';

-- Varje sekvensmejl skickas högst en gång per bolag och runda.
create unique index if not exists emails_one_per_sequence_template
  on public.emails (company_id, sequence_round, template)
  where template in ('mejl-ringde-nyss', 'mejl-case', 'mejl-avslut');

-- -----------------------------------------------------------------------------
-- Hjälpfunktioner
-- -----------------------------------------------------------------------------

create or replace function public.helsinki_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Europe/Helsinki')::date $$;

-- Kanal för ett steg: 'email' eller 'phone'.
create or replace function public.sequence_channel(p_step int)
returns text
language sql
immutable
as $$ select case when p_step in (1, 4, 7) then 'email' else 'phone' end $$;

create or replace function public.sequence_step_label(p_step int)
returns text
language sql
immutable
as $$
  select case p_step
    when 1 then 'Mejl 1'
    when 2 then 'Samtal 1'
    when 3 then 'Samtal 2 + röstmeddelande'
    when 4 then 'Case-mejl'
    when 5 then 'Samtal 3'
    when 6 then 'Samtal 4 + röstmeddelande'
    when 7 then 'Avslutsmejl'
    when 8 then 'Sista samtalet'
  end
$$;

-- Första dag EFTER p_after vars kanal i settings.week_plan är p_channel.
create or replace function public.next_channel_date(p_channel text, p_after date default null)
returns date
language plpgsql
stable
as $$
declare
  v_after date := coalesce(p_after, public.helsinki_today());
  v_plan jsonb;
  v_day date;
begin
  select value into v_plan from public.settings where key = 'week_plan';
  for i in 1..14 loop
    v_day := v_after + i;
    if v_plan -> trim(to_char(v_day, 'day')) ->> 'channel' = p_channel then
      return v_day;
    end if;
  end loop;
  return v_after + 1; -- ingen dag med kanalen i veckoplanen: nästa dag
end;
$$;

-- Bygger ett mejl från en mall i context_entries ("Ämne: …" på första raden).
-- Platshållare: {{förnamn}}, {{bolag}} samt nycklarna i p_vars.
-- Returnerar mejlets id, eller null om samma sekvensmejl redan finns (idempotent).
create or replace function public.create_template_email(
  p_company_id uuid,
  p_contact_id uuid,
  p_template text,
  p_step int,
  p_round int,
  p_vars jsonb default '{}'::jsonb,
  p_status public.email_status default 'approved'
)
returns uuid
language plpgsql
as $$
declare
  v_content text;
  v_subject text;
  v_body text;
  v_first_name text;
  v_company text;
  v_key text;
  v_value text;
  v_id uuid;
begin
  select content into v_content from public.context_entries where slug = p_template;
  if v_content is null then
    raise exception 'Mejlmallen "%" saknas i Företagshjärnan', p_template;
  end if;

  select first_name into v_first_name from public.contacts where id = p_contact_id;
  select name into v_company from public.companies where id = p_company_id;

  v_subject := trim(regexp_replace(split_part(v_content, E'\n', 1), '^\s*Ämne:\s*', '', 'i'));
  v_body := trim(both E'\n ' from substr(v_content, length(split_part(v_content, E'\n', 1)) + 2));

  v_subject := replace(replace(v_subject, '{{förnamn}}', coalesce(v_first_name, '')), '{{bolag}}', coalesce(v_company, ''));
  v_body := replace(replace(v_body, '{{förnamn}}', coalesce(v_first_name, '')), '{{bolag}}', coalesce(v_company, ''));
  for v_key, v_value in select key, value from jsonb_each_text(p_vars) loop
    v_subject := replace(v_subject, '{{' || v_key || '}}', v_value);
    v_body := replace(v_body, '{{' || v_key || '}}', v_value);
  end loop;

  insert into public.emails (company_id, contact_id, sequence_step, sequence_round, template, subject, body, status, reviewed_at)
  values (p_company_id, p_contact_id, p_step, p_round, p_template, v_subject, v_body, p_status,
          case when p_status = 'approved' then now() end)
  on conflict (company_id, sequence_round, template)
    where template in ('mejl-ringde-nyss', 'mejl-case', 'mejl-avslut')
    do nothing
  returning id into v_id;

  return v_id;
end;
$$;

-- Flyttar bolaget till steget efter p_from_step. Efter steg 8: vilande i 90 dagar.
create or replace function public.advance_sequence(p_company_id uuid, p_from_step int)
returns void
language plpgsql
as $$
declare
  v_next int := p_from_step + 1;
begin
  if v_next > 8 then
    update public.companies
       set status = 'nurture',
           nurture_until = public.helsinki_today() + 90,
           sequence_step = null,
           next_action_at = null
     where id = p_company_id and sequence_step = p_from_step;
  else
    update public.companies
       set sequence_step = v_next,
           next_action_at = public.next_channel_date(public.sequence_channel(v_next))
     where id = p_company_id and sequence_step = p_from_step;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Mejl 1 köas/skickas → sekvensen startar (nästa steg: Samtal 1 på nästa ringdag)
-- -----------------------------------------------------------------------------

create or replace function public.start_sequence_on_first_email()
returns trigger
language plpgsql
as $$
begin
  if new.sequence_step = 1
     and coalesce(new.template, 'mejl-intro') = 'mejl-intro'
     and new.status in ('queued', 'sent')
     and (tg_op = 'INSERT' or old.status not in ('queued', 'sent')) then
    update public.companies
       set sequence_step = 2,
           sequence_round = new.sequence_round,
           sequence_contact_id = coalesce(new.contact_id, sequence_contact_id),
           sequence_started_at = now(),
           next_action_at = public.next_channel_date('phone'),
           status = 'contacted'
     where id = new.company_id
       and sequence_step is null
       and not do_not_contact
       and status in ('new', 'researching', 'contacted');
  end if;
  return new;
end;
$$;

drop trigger if exists emails_start_sequence on public.emails;
create trigger emails_start_sequence
  after insert or update of status on public.emails
  for each row execute function public.start_sequence_on_first_email();

-- -----------------------------------------------------------------------------
-- Svar och möten stoppar sekvensen (ersätter funktionerna från 0001)
-- -----------------------------------------------------------------------------

create or replace function public.handle_reply()
returns trigger
language plpgsql
as $$
declare
  company_name text;
  contact_name text;
begin
  if tg_op = 'UPDATE' and new.classification is not distinct from old.classification then
    return new;
  end if;

  if new.email_id is not null then
    update public.emails set status = 'replied'
     where id = new.email_id and status in ('queued', 'sent');
  end if;

  -- Ett riktigt svar betyder att Erik tar över – den automatiska sekvensen stannar.
  if new.classification in ('positive', 'neutral', 'negative', 'unsubscribe') then
    update public.companies set sequence_step = null, next_action_at = null where id = new.company_id;
    update public.tasks set status = 'skipped', completed_at = now()
     where company_id = new.company_id and status = 'open' and type = 'call' and sequence_step is not null;
  end if;

  if new.classification = 'positive' then
    select c.name into company_name from public.companies c where c.id = new.company_id;
    select trim(k.first_name || ' ' || coalesce(k.last_name, '')) into contact_name
      from public.contacts k where k.id = new.contact_id;

    insert into public.tasks (type, title, description, priority, company_id, contact_id, reply_id, due_at)
    values (
      'call',
      'Ring ' || coalesce(contact_name, company_name, 'kontakten') || ' – positivt svar',
      coalesce(new.ai_summary, left(new.body, 280)),
      1,
      new.company_id,
      new.contact_id,
      new.id,
      now()
    )
    on conflict (reply_id) where reply_id is not null do nothing;

    update public.companies set status = 'warm'
     where id = new.company_id
       and status in ('new', 'researching', 'contacted', 'replied', 'nurture');

  elsif new.classification = 'unsubscribe' then
    if new.contact_id is not null then
      update public.contacts set do_not_contact = true where id = new.contact_id;
    else
      update public.companies set do_not_contact = true where id = new.company_id;
    end if;
    update public.emails set status = 'rejected', error = 'Avregistrerad'
     where company_id = new.company_id
       and (new.contact_id is null or contact_id = new.contact_id)
       and status in ('draft', 'pending_review', 'approved', 'queued');

  elsif new.classification in ('neutral', 'negative') then
    update public.companies set status = 'replied'
     where id = new.company_id and status in ('new', 'researching', 'contacted');
  end if;

  return new;
end;
$$;

create or replace function public.handle_meeting_booked()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'scheduled' then
    update public.companies
       set status = case when status = 'customer' then status else 'meeting_booked' end,
           sequence_step = null,
           next_action_at = null,
           nurture_until = null
     where id = new.company_id;

    update public.tasks set status = 'done', completed_at = now()
     where company_id = new.company_id and type = 'call' and status = 'open';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Utfall från Ringpasset – allt i en transaktion
--   p_outcome: no_answer | callback | interested | meeting_booked |
--              not_interested | wrong_person | do_not_call
-- Returnerar { email_ids: [...] } – godkända mejl som appen skickar via utskicksadaptern.
-- -----------------------------------------------------------------------------

create or replace function public.apply_call_outcome(
  p_task_id uuid,
  p_outcome text,
  p_notes text default null,
  p_voicemail boolean default false,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
  t public.tasks%rowtype;
  c public.companies%rowtype;
  v_contact_id uuid;
  v_step int;
  v_today date := public.helsinki_today();
  v_emails uuid[] := '{}';
  v_id uuid;
  v_new_contact uuid;
  v_months int;
  v_starts timestamptz;
  v_ends timestamptz;
  v_due timestamptz;
  v_call public.call_outcome;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Uppgiften finns inte längre';
  end if;
  if t.status <> 'open' then
    raise exception 'Uppgiften är redan hanterad';
  end if;
  if t.company_id is null then
    raise exception 'Uppgiften saknar bolag';
  end if;

  select * into c from public.companies where id = t.company_id for update;

  v_contact_id := coalesce(
    t.contact_id,
    c.sequence_contact_id,
    (select k.id from public.contacts k where k.company_id = c.id order by k.is_primary desc, k.created_at limit 1)
  );

  -- Hör uppgiften till bolagets aktiva sekvenssteg?
  v_step := case
    when t.sequence_step is not null and t.sequence_step = c.sequence_step and t.sequence_round = c.sequence_round
      then t.sequence_step
  end;

  v_call := case p_outcome
    when 'no_answer' then case when p_voicemail then 'voicemail' else 'no_answer' end
    when 'callback' then 'callback'
    when 'interested' then 'interested'
    when 'meeting_booked' then 'meeting_booked'
    when 'not_interested' then 'not_interested'
    when 'wrong_person' then 'wrong_person'
    when 'do_not_call' then 'not_interested'
  end::public.call_outcome;
  if v_call is null then
    raise exception 'Okänt utfall: %', p_outcome;
  end if;

  insert into public.calls (company_id, contact_id, task_id, outcome, notes)
  values (c.id, v_contact_id, t.id, v_call, nullif(trim(p_notes), ''));

  if p_outcome = 'no_answer' then
    if v_step is not null then
      update public.tasks set status = 'done', completed_at = now() where id = t.id;
      if v_step = 3 then
        v_id := public.create_template_email(c.id, v_contact_id, 'mejl-ringde-nyss', 3, c.sequence_round);
        if v_id is not null then v_emails := v_emails || v_id; end if;
      end if;
      perform public.advance_sequence(c.id, v_step);
    else
      -- Utanför sekvensen (t.ex. positivt svar): försök igen nästa ringdag kl. 09.
      update public.tasks
         set due_at = (public.next_channel_date('phone', v_today)::timestamp + time '09:00') at time zone 'Europe/Helsinki'
       where id = t.id;
    end if;

  elsif p_outcome = 'callback' then
    v_due := (p_payload ->> 'due_at')::timestamptz;
    if v_due is null then
      raise exception 'Välj när du ska ringa tillbaka';
    end if;
    update public.tasks
       set due_at = v_due,
           priority = 1,
           title = 'Ring tillbaka: ' || c.name,
           description = coalesce(nullif(trim(p_notes), ''), description)
     where id = t.id;
    update public.companies set next_action_at = (v_due at time zone 'Europe/Helsinki')::date
     where id = c.id and sequence_step is not null;

  elsif p_outcome = 'interested' then
    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    update public.companies
       set status = 'warm', sequence_step = null, next_action_at = null, nurture_until = null
     where id = c.id;
    v_id := public.create_template_email(c.id, v_contact_id, 'mejl-motestider', coalesce(c.sequence_step, 1), c.sequence_round,
                                         jsonb_build_object('tider', coalesce(p_payload ->> 'times_text', '')));
    if v_id is not null then v_emails := v_emails || v_id; end if;
    insert into public.tasks (type, title, description, priority, company_id, contact_id, due_at)
    values ('follow_up', 'Följ upp mötestider: ' || c.name, 'Har de svarat på förslagen?', 1, c.id, v_contact_id,
            (public.next_channel_date('phone', v_today + 1)::timestamp + time '09:00') at time zone 'Europe/Helsinki');

  elsif p_outcome = 'meeting_booked' then
    v_starts := (p_payload ->> 'starts_at')::timestamptz;
    if v_starts is null then
      raise exception 'Välj tid för mötet';
    end if;
    v_ends := coalesce((p_payload ->> 'ends_at')::timestamptz, v_starts + interval '45 minutes');
    -- Triggern handle_meeting_booked sätter status och stänger öppna ringuppgifter.
    insert into public.meetings (company_id, contact_id, title, starts_at, ends_at, location, status, notes)
    values (c.id, v_contact_id, 'Discovery: ' || c.name, v_starts, v_ends,
            nullif(trim(p_payload ->> 'location'), ''), 'scheduled', nullif(trim(p_notes), ''));
    update public.tasks set status = 'done', completed_at = now() where id = t.id and status = 'open';
    v_id := public.create_template_email(c.id, v_contact_id, 'mejl-motesbekraftelse', coalesce(c.sequence_step, 1), c.sequence_round,
                                         jsonb_build_object('mötestid', coalesce(p_payload ->> 'when_text', ''),
                                                            'plats', coalesce(nullif(trim(p_payload ->> 'location'), ''), 'enligt inbjudan')));
    if v_id is not null then v_emails := v_emails || v_id; end if;

  elsif p_outcome = 'not_interested' then
    v_months := coalesce((p_payload ->> 'months')::int, 0);
    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    update public.tasks set status = 'skipped', completed_at = now()
     where company_id = c.id and status = 'open' and type = 'call';
    if v_months > 0 then
      update public.companies
         set status = 'nurture', nurture_until = v_today + make_interval(months => v_months),
             sequence_step = null, next_action_at = null
       where id = c.id;
    else
      update public.companies
         set status = 'lost', sequence_step = null, next_action_at = null, nurture_until = null
       where id = c.id;
    end if;

  elsif p_outcome = 'wrong_person' then
    if coalesce(trim(p_payload ->> 'first_name'), '') = '' then
      raise exception 'Fyll i förnamn på rätt person';
    end if;
    insert into public.contacts (company_id, first_name, last_name, role, email, phone, is_primary)
    values (c.id, trim(p_payload ->> 'first_name'), nullif(trim(p_payload ->> 'last_name'), ''),
            nullif(trim(p_payload ->> 'role'), ''), nullif(lower(trim(p_payload ->> 'email')), ''),
            nullif(trim(p_payload ->> 'phone'), ''), true)
    returning id into v_new_contact;
    update public.contacts set is_primary = false where company_id = c.id and id <> v_new_contact;

    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    update public.tasks set status = 'skipped', completed_at = now()
     where company_id = c.id and status = 'open' and type = 'call';
    -- Börja om: ny runda, Mejl 1 till rätt person väntar i Gatekeeper.
    update public.companies
       set sequence_round = sequence_round + 1,
           sequence_step = null,
           next_action_at = null,
           sequence_contact_id = v_new_contact,
           status = 'researching'
     where id = c.id;
    perform public.create_template_email(c.id, v_new_contact, 'mejl-intro', 1, c.sequence_round + 1,
                                         jsonb_build_object('tidigare', coalesce(
                                           (select trim(k.first_name || ' ' || coalesce(k.last_name, '')) from public.contacts k where k.id = v_contact_id),
                                           'en kollega')),
                                         'pending_review');

  elsif p_outcome = 'do_not_call' then
    if v_contact_id is not null then
      update public.contacts set do_not_contact = true where id = v_contact_id;
    end if;
    update public.companies
       set do_not_contact = true, status = 'lost', sequence_step = null, next_action_at = null, nurture_until = null
     where id = c.id;
    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    update public.tasks set status = 'skipped', completed_at = now()
     where company_id = c.id and status = 'open';
    update public.emails set status = 'rejected', error = 'Ring inte igen'
     where company_id = c.id and status in ('draft', 'pending_review', 'approved');
  end if;

  return jsonb_build_object('email_ids', to_jsonb(v_emails));
end;
$$;

-- -----------------------------------------------------------------------------
-- Dagligt jobb (Vercel Cron) – idempotent, kan köras flera gånger per dag
--   1. vilande bolag vars tid gått ut → tillbaka till 'new' (ny runda)
--   2. förfallna samtalssteg → ringuppgift i Ringpasset
--   3. förfallna mejlsteg → mejl skapas och sekvensen flyttas fram
-- Returnerar { reactivated, tasks_created, email_ids } – appen skickar mejlen.
-- -----------------------------------------------------------------------------

create or replace function public.run_daily_sequence()
returns jsonb
language plpgsql
as $$
declare
  v_today date := public.helsinki_today();
  v_reactivated int;
  v_tasks int;
  r record;
  v_id uuid;
  v_emails uuid[];
begin
  update public.companies
     set status = 'new',
         nurture_until = null,
         sequence_step = null,
         next_action_at = null,
         sequence_contact_id = null,
         sequence_round = sequence_round + 1
   where status = 'nurture' and nurture_until <= v_today and not do_not_contact;
  get diagnostics v_reactivated = row_count;

  insert into public.tasks (type, title, description, priority, company_id, contact_id, sequence_step, sequence_round, due_at)
  select 'call',
         public.sequence_step_label(c.sequence_step) || ': ' || c.name,
         case when c.sequence_step in (3, 6) then 'Lämna röstmeddelande om ingen svarar.' end,
         2,
         c.id,
         coalesce(c.sequence_contact_id,
                  (select k.id from public.contacts k where k.company_id = c.id and not k.do_not_contact
                    order by k.is_primary desc, k.created_at limit 1)),
         c.sequence_step,
         c.sequence_round,
         now()
    from public.companies c
   where c.sequence_step in (2, 3, 5, 6, 8)
     and c.next_action_at <= v_today
     and not c.do_not_contact
     and c.status = 'contacted'
  on conflict (company_id, sequence_round, sequence_step)
    where status = 'open' and type = 'call' and sequence_step is not null
    do nothing;
  get diagnostics v_tasks = row_count;

  for r in
    select c.id, c.sequence_step, c.sequence_round,
           coalesce(c.sequence_contact_id,
                    (select k.id from public.contacts k where k.company_id = c.id and not k.do_not_contact
                      order by k.is_primary desc, k.created_at limit 1)) as contact_id
      from public.companies c
     where c.sequence_step in (4, 7)
       and c.next_action_at <= v_today
       and not c.do_not_contact
       and c.status = 'contacted'
  loop
    v_id := public.create_template_email(
      r.id, r.contact_id,
      case r.sequence_step when 4 then 'mejl-case' else 'mejl-avslut' end,
      r.sequence_step, r.sequence_round);
    perform public.advance_sequence(r.id, r.sequence_step);
  end loop;

  -- Alla godkända mall-mejl som ännu inte lämnats till utskicksleverantören (även från tidigare körningar).
  select coalesce(array_agg(e.id), '{}') into v_emails
    from public.emails e
   where e.status = 'approved' and e.template is not null;

  return jsonb_build_object('reactivated', v_reactivated, 'tasks_created', v_tasks, 'email_ids', to_jsonb(v_emails));
end;
$$;

-- -----------------------------------------------------------------------------
-- Ringpassets kö: öppna samtal/uppföljningar som förfaller i dag eller tidigare
-- -----------------------------------------------------------------------------

create or replace view public.ringpass_queue
with (security_invoker = true) as
select
  t.id as task_id,
  t.type as task_type,
  t.title,
  t.description,
  t.priority,
  t.due_at,
  t.reply_id,
  t.sequence_step as task_sequence_step,
  c.id as company_id,
  c.name as company_name,
  c.city,
  c.industry,
  c.website,
  c.status as company_status,
  c.notes as company_notes,
  c.sequence_step,
  c.sequence_round,
  k.id as contact_id,
  k.first_name,
  k.last_name,
  k.role,
  k.phone,
  k.email
from public.tasks t
join public.companies c on c.id = t.company_id
left join public.contacts k on k.id = coalesce(
  t.contact_id,
  c.sequence_contact_id,
  (select k2.id from public.contacts k2 where k2.company_id = c.id order by k2.is_primary desc, k2.created_at limit 1)
)
where t.status = 'open'
  and t.type in ('call', 'follow_up')
  and not c.do_not_contact
  and t.due_at < ((public.helsinki_today() + 1)::timestamp at time zone 'Europe/Helsinki');

-- -----------------------------------------------------------------------------
-- Behörigheter: bara inloggad användare och servern får köra funktionerna
-- -----------------------------------------------------------------------------

revoke execute on function public.apply_call_outcome(uuid, text, text, boolean, jsonb) from public, anon;
revoke execute on function public.run_daily_sequence() from public, anon, authenticated;
revoke execute on function public.create_template_email(uuid, uuid, text, int, int, jsonb, public.email_status) from public, anon;
revoke execute on function public.advance_sequence(uuid, int) from public, anon;
grant execute on function public.apply_call_outcome(uuid, text, text, boolean, jsonb) to authenticated, service_role;
grant execute on function public.run_daily_sequence() to service_role;
grant execute on function public.create_template_email(uuid, uuid, text, int, int, jsonb, public.email_status) to authenticated, service_role;
grant execute on function public.advance_sequence(uuid, int) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Mejlmallar (redigeras i Företagshjärnan). Första raden = "Ämne: …".
-- -----------------------------------------------------------------------------

insert into public.context_entries (kind, slug, title, content, sort_order) values
  ('template', 'mejl-intro', 'Mall: Mejl 1 till rätt person',
$md$Ämne: {{tidigare}} tipsade om dig
Hej {{förnamn}},

Jag pratade nyss med {{tidigare}} på {{bolag}}, som tipsade om att du är rätt person att prata med.

Vi på Optely hjälper bolag i Österbotten att ta bort manuellt arbete – offerter, bokningar och rapporter. Vore det värt 20 minuter att se om det finns något att vinna hos er?

Hälsningar,
Erik
$md$, 200),
  ('template', 'mejl-ringde-nyss', 'Mall: "Ringde nyss"',
$md$Ämne: Ringde nyss
Hej {{förnamn}},

Jag försökte nå dig på telefon nyss – Erik från Optely. Jag mejlade för några dagar sedan om hur {{bolag}} kunde spara tid på manuellt arbete.

Passar det bättre att jag ringer en annan dag? Svara gärna med en tid som passar dig.

Hälsningar,
Erik
$md$, 210),
  ('template', 'mejl-case', 'Mall: Case-mejl',
$md$Ämne: Så sparade ett liknande bolag 5 timmar i veckan
Hej {{förnamn}},

Ett kort exempel: ett energiteknikbolag i Vasa lade ca 6 timmar i veckan på att sammanställa offerter. Efter en automation tar varje offert 8 minuter i stället för 45, och kunden får svar samma dag.

Jag tror att {{bolag}} kan ha liknande flöden. Ska vi ta 20 minuter och titta på det?

Hälsningar,
Erik
$md$, 220),
  ('template', 'mejl-avslut', 'Mall: Avslutsmejl',
$md$Ämne: Ska jag sluta höra av mig?
Hej {{förnamn}},

Jag har försökt nå dig några gånger utan att lyckas, så jag antar att tajmingen inte är rätt just nu.

Jag ringer en sista gång om några dagar. Vill du hellre att jag hör av mig om några månader räcker det med ett kort svar.

Hälsningar,
Erik
$md$, 230),
  ('template', 'mejl-motestider', 'Mall: Två mötestider',
$md$Ämne: Förslag på mötestider
Hej {{förnamn}},

Tack för samtalet! Här är två förslag på tider för ett möte på ca 45 minuter:

{{tider}}

Svara bara med vilken som passar, så skickar jag en inbjudan.

Hälsningar,
Erik
$md$, 240),
  ('template', 'mejl-motesbekraftelse', 'Mall: Mötesbekräftelse',
$md$Ämne: Bekräftelse: vi ses {{mötestid}}
Hej {{förnamn}},

Tack, då ses vi {{mötestid}} ({{plats}}).

Inför mötet funderar jag gärna på vilka moment hos {{bolag}} som tar mest tid i dag – ta gärna med ett exempel.

Hälsningar,
Erik
$md$, 250)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Befintliga bolag: de som redan fått Mejl 1 (köat/skickat) utan svar går in i
-- sekvensen direkt, med Samtal 1 förfallet i dag.
-- -----------------------------------------------------------------------------

update public.companies c
   set sequence_step = 2,
       sequence_round = 1,
       sequence_started_at = coalesce(e.first_at, now()),
       sequence_contact_id = coalesce(c.sequence_contact_id, e.contact_id),
       next_action_at = public.helsinki_today()
  from (
    select distinct on (company_id) company_id, contact_id, coalesce(sent_at, queued_at) as first_at
      from public.emails
     where sequence_step = 1 and template is null and status in ('queued', 'sent')
     order by company_id, created_at
  ) e
 where e.company_id = c.id
   and c.sequence_step is null
   and c.status = 'contacted'
   and not c.do_not_contact
   and not exists (select 1 from public.replies r where r.company_id = c.id);
