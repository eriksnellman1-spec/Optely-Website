-- =============================================================================
-- 0005 – Säljsystemet fas A + B (docs/saljsystem.md). Kräver 0004.
--
-- A: statusar enligt §8, dubblettkontroll (domän/telefon/namn), partnerägda bolag,
--    kunder utanför sekvenser, "svar i en kanal stoppar alla", SMS-kö.
-- B: samtalskanalen §4 – 3 försök med växlande fm/em på ringdagar, utfallen i §4,
--    15 nya bolag per ringdag, vilande 2 mån → tillbaka.
--
-- Ersätter 8-stegssekvensen från 0003 (dess funktioner och kolumner tas bort).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Riv 8-stegssekvensen från 0003
-- -----------------------------------------------------------------------------

drop view if exists public.ringpass_queue;
drop view if exists public.company_overview;

drop trigger if exists emails_start_sequence on public.emails;
drop function if exists public.start_sequence_on_first_email();
drop function if exists public.apply_call_outcome(uuid, text, text, boolean, jsonb);
drop function if exists public.run_daily_sequence();
drop function if exists public.advance_sequence(uuid, int);
drop function if exists public.sequence_step_label(int);
drop function if exists public.sequence_channel(int);

drop index if exists public.tasks_one_open_sequence_call;
drop index if exists public.companies_sequence_due_idx;
alter table public.tasks drop column if exists sequence_step, drop column if exists sequence_round;
alter table public.companies drop column if exists sequence_step, drop column if exists next_action_at;

delete from public.context_entries
 where slug in ('mejl-intro', 'mejl-ringde-nyss', 'mejl-case', 'mejl-avslut', 'mejl-motestider', 'mejl-motesbekraftelse');

-- -----------------------------------------------------------------------------
-- 2. Statusar enligt specen §8
--    Ny → I sekvens → Svarat → Behovssamtal bokat → Behovssamtal klart →
--    Lösning visad → Offert skickad → Kund, samt Vilande, Nej, Kontakta ej, Hos partner
-- -----------------------------------------------------------------------------

create type public.company_stage as enum (
  'new',             -- Ny
  'in_sequence',     -- I sekvens
  'replied',         -- Svarat
  'meeting_booked',  -- Behovssamtal bokat
  'meeting_done',    -- Behovssamtal klart
  'solution_shown',  -- Lösning visad
  'quote_sent',      -- Offert skickad
  'customer',        -- Kund
  'nurture',         -- Vilande
  'no',              -- Nej
  'do_not_contact',  -- Kontakta ej
  'with_partner'     -- Hos partner
);

alter table public.companies alter column status drop default;
alter table public.companies
  alter column status type public.company_stage
  using (case status::text
           when 'researching' then 'new'
           when 'contacted' then 'in_sequence'
           when 'warm' then 'replied'
           when 'lost' then 'no'
           else status::text
         end)::public.company_stage;
drop type public.company_status;
alter type public.company_stage rename to company_status;
alter table public.companies alter column status set default 'new';

update public.companies set status = 'do_not_contact' where do_not_contact and status <> 'do_not_contact';

-- -----------------------------------------------------------------------------
-- 3. Nya kolumner
-- -----------------------------------------------------------------------------

alter table public.companies
  add column if not exists phone        text,
  add column if not exists domain       text,
  add column if not exists partner_id   uuid references public.partners (id) on delete set null,
  add column if not exists call_attempt smallint not null default 0 check (call_attempt between 0 and 3),
  add column if not exists last_call_at timestamptz,
  add column if not exists released_at  timestamptz;

comment on column public.companies.domain is 'Normaliserad e-post-/webbdomän för dubblettkontroll.';
comment on column public.companies.partner_id is 'Hör till en partner – kontaktas inte kallt.';
comment on column public.companies.call_attempt is 'Antal obesvarade samtalsförsök i nuvarande runda (0–3).';
comment on column public.companies.released_at is 'När bolaget släpptes in i ringkön (räknas mot dagens kvot).';

alter table public.tasks add column if not exists attempt smallint check (attempt between 1 and 3);
comment on column public.tasks.attempt is 'Samtalsförsök 1–3 i samtalskanalen. null = utanför försöksräkningen.';

alter table public.meetings add column if not exists calendar_added_at timestamptz;

create index if not exists companies_partner_idx on public.companies (partner_id) where partner_id is not null;
create index if not exists companies_released_idx on public.companies (released_at);

-- Kontakta ej: flagga och status hålls i synk.
create or replace function public.sync_do_not_contact()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'do_not_contact' then
    new.do_not_contact := true;
  elsif new.do_not_contact and (tg_op = 'INSERT' or not old.do_not_contact) then
    new.status := 'do_not_contact';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_sync_do_not_contact on public.companies;
create trigger companies_sync_do_not_contact
  before insert or update of status, do_not_contact on public.companies
  for each row execute function public.sync_do_not_contact();

-- -----------------------------------------------------------------------------
-- 4. Dubblettkontroll (§2): e-postdomän, telefonnummer eller företagsnamn
-- -----------------------------------------------------------------------------

create or replace function public.norm_company_name(p text)
returns text
language sql
immutable
as $$
  select nullif(trim(regexp_replace(
           regexp_replace(
             regexp_replace(lower(coalesce(p, '')), '[^a-z0-9åäöéü ]', ' ', 'g'),
             '\m(oy ab|ab oy|oyj|oy|ab|ky|tmi|ltd|ab ltd|kb|aps)\M', ' ', 'g'),
           '\s+', ' ', 'g')), '')
$$;

create or replace function public.norm_phone(p text)
returns text
language sql
immutable
as $$
  select nullif(
    case
      when d like '00358%' then '0' || substr(d, 6)
      when d like '358%' and length(d) > 9 then '0' || substr(d, 4)
      else d
    end, '')
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

-- Domän ur webbadress eller e-post. Allmänna e-posttjänster räknas inte.
create or replace function public.norm_domain(p text)
returns text
language sql
immutable
as $$
  select case
           when d is null or d = '' then null
           when d in ('gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'me.com', 'msn.com',
                      'yahoo.com', 'luukku.com', 'kolumbus.fi', 'netti.fi', 'suomi24.fi', 'pp.inet.fi', 'elisanet.fi',
                      'anvia.fi', 'multi.fi', 'gmail.fi') then null
           else d
         end
  from (
    select lower(regexp_replace(regexp_replace(regexp_replace(trim(coalesce(p, '')),
             '^.*@', ''),              -- e-post → domän
             '^[a-z]+://', '', 'i'),   -- protokoll
             '^www\.|[/:?#].*$', '', 'gi')) as d
  ) x
$$;

update public.companies set domain = public.norm_domain(website) where domain is null and website is not null;

create index if not exists companies_norm_name_idx on public.companies (public.norm_company_name(name));
create index if not exists companies_domain_idx on public.companies (domain) where domain is not null;
create index if not exists companies_norm_phone_idx on public.companies (public.norm_phone(phone)) where phone is not null;
create index if not exists contacts_norm_phone_idx on public.contacts (public.norm_phone(phone)) where phone is not null;
create index if not exists contacts_email_domain_idx on public.contacts (public.norm_domain(email)) where email is not null;

-- Domänen fylls i automatiskt från webbadressen, eller från första kontaktens e-post.
create or replace function public.set_company_domain()
returns trigger
language plpgsql
as $$
begin
  if new.website is not null then
    new.domain := coalesce(public.norm_domain(new.website), new.domain);
  end if;
  return new;
end;
$$;

drop trigger if exists companies_set_domain on public.companies;
create trigger companies_set_domain
  before insert or update of website on public.companies
  for each row execute function public.set_company_domain();

create or replace function public.set_company_domain_from_contact()
returns trigger
language plpgsql
as $$
begin
  if new.email is not null then
    update public.companies set domain = public.norm_domain(new.email)
     where id = new.company_id and domain is null and public.norm_domain(new.email) is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists contacts_set_company_domain on public.contacts;
create trigger contacts_set_company_domain
  after insert or update of email on public.contacts
  for each row execute function public.set_company_domain_from_contact();

-- Hittar befintliga bolag (och partner) som matchar. matched_on: 'namn' | 'domän' | 'telefon' | 'partner'.
create or replace function public.find_company_duplicates(
  p_name text,
  p_website text default null,
  p_email text default null,
  p_phone text default null
)
returns table (company_id uuid, name text, status public.company_status, matched_on text)
language sql
stable
as $$
  with q as (
    select public.norm_company_name(p_name) as n,
           coalesce(public.norm_domain(p_website), public.norm_domain(p_email)) as d,
           public.norm_domain(p_email) as ed,
           public.norm_phone(p_phone) as ph
  ),
  hits as (
    select c.id, c.name, c.status, 'namn' as matched_on, 1 as rank
      from public.companies c, q
     where q.n is not null and public.norm_company_name(c.name) = q.n
    union all
    select c.id, c.name, c.status, 'domän', 2
      from public.companies c, q
     where (q.d is not null and c.domain = q.d) or (q.ed is not null and c.domain = q.ed)
    union all
    select distinct c.id, c.name, c.status, 'domän', 2
      from public.companies c join public.contacts k on k.company_id = c.id, q
     where coalesce(q.d, q.ed) is not null and public.norm_domain(k.email) in (q.d, q.ed)
    union all
    select c.id, c.name, c.status, 'telefon', 3
      from public.companies c, q
     where q.ph is not null and public.norm_phone(c.phone) = q.ph
    union all
    select distinct c.id, c.name, c.status, 'telefon', 3
      from public.companies c join public.contacts k on k.company_id = c.id, q
     where q.ph is not null and public.norm_phone(k.phone) = q.ph
  )
  select * from (
    select distinct on (h.id) h.id, h.name, h.status, h.matched_on from hits h order by h.id, h.rank
  ) best
  union all
  select null::uuid, p.name, null::public.company_status, 'partner'
    from public.partners p, q
   where (q.n is not null and public.norm_company_name(p.name) = q.n)
      or (coalesce(q.d, q.ed) is not null and public.norm_domain(p.email) in (q.d, q.ed))
      or (q.ph is not null and public.norm_phone(p.phone) = q.ph)
$$;

-- -----------------------------------------------------------------------------
-- 5. SMS-kö (skickas för hand tills SMS-tjänsten kopplas in i fas F)
-- -----------------------------------------------------------------------------

create table if not exists public.sms_messages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  contact_id  uuid references public.contacts (id) on delete set null,
  to_phone    text not null,
  body        text not null,
  template    text,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  due_at      timestamptz not null default now(),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists sms_messages_pending_idx on public.sms_messages (due_at) where status = 'pending';

alter table public.sms_messages enable row level security;
drop policy if exists "authenticated_all" on public.sms_messages;
create policy "authenticated_all" on public.sms_messages for all to authenticated using (true) with check (true);

-- -----------------------------------------------------------------------------
-- 6. Inställningar
-- -----------------------------------------------------------------------------

insert into public.settings (key, value, description) values
  ('ringpass', '{"new_per_day": 15, "am": "09:00", "pm": "13:00", "nurture_months": 2}'::jsonb,
   'Nya bolag per ringdag, tider för fm/em-försök och vilotid efter 3 försök'),
  ('gatekeeper', '{"auto_send": false}'::jsonb,
   'false = AI-meningen godkänns för hand innan mejl skickas')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 7. Hjälpfunktioner
-- -----------------------------------------------------------------------------

create or replace function public.ringpass_setting(p_key text)
returns text
language sql
stable
as $$ select value ->> p_key from public.settings where key = 'ringpass' $$;

-- Nästa försök: nästa ringdag, växla förmiddag/eftermiddag mot tidpunkten p_after.
create or replace function public.next_call_slot(p_after timestamptz default now())
returns timestamptz
language plpgsql
stable
as $$
declare
  v_local timestamp := p_after at time zone 'Europe/Helsinki';
  v_day date := public.next_channel_date('phone', v_local::date);
  v_time time := case when extract(hour from v_local) < 12
                      then coalesce(public.ringpass_setting('pm'), '13:00')::time
                      else coalesce(public.ringpass_setting('am'), '09:00')::time end;
begin
  return (v_day + v_time) at time zone 'Europe/Helsinki';
end;
$$;

-- Lokal tid → timestamptz (Europe/Helsinki).
create or replace function public.helsinki_at(p_day date, p_time text)
returns timestamptz
language sql
stable
as $$ select (p_day + p_time::time) at time zone 'Europe/Helsinki' $$;

-- Ersätter platshållare i en mall: {{förnamn}}, {{bolag}} + nycklarna i p_vars.
create or replace function public.fill_template(p_text text, p_contact_id uuid, p_company_id uuid, p_vars jsonb default '{}'::jsonb)
returns text
language plpgsql
stable
as $$
declare
  v text := p_text;
  v_key text;
  v_value text;
begin
  v := replace(v, '{{förnamn}}', coalesce((select first_name from public.contacts where id = p_contact_id), ''));
  v := replace(v, '{{bolag}}', coalesce((select name from public.companies where id = p_company_id), ''));
  for v_key, v_value in select key, value from jsonb_each_text(p_vars) loop
    v := replace(v, '{{' || v_key || '}}', v_value);
  end loop;
  return v;
end;
$$;

-- Köar ett SMS från mall om kontakten har telefonnummer. Returnerar id eller null.
create or replace function public.queue_template_sms(
  p_company_id uuid, p_contact_id uuid, p_template text, p_due timestamptz, p_vars jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_phone text;
  v_content text;
  v_id uuid;
begin
  select coalesce(k.phone, c.phone) into v_phone
    from public.companies c left join public.contacts k on k.id = p_contact_id
   where c.id = p_company_id;
  if coalesce(trim(v_phone), '') = '' then
    return null;
  end if;
  select content into v_content from public.context_entries where slug = p_template;
  if v_content is null then
    raise exception 'SMS-mallen "%" saknas i Företagshjärnan', p_template;
  end if;
  insert into public.sms_messages (company_id, contact_id, to_phone, body, template, due_at)
  values (p_company_id, p_contact_id, trim(v_phone),
          trim(public.fill_template(v_content, p_contact_id, p_company_id, p_vars)), p_template, p_due)
  returning id into v_id;
  return v_id;
end;
$$;

-- "Svar i en kanal stoppar alla andra" (§2): stänger sekvensens samtal och LinkedIn-påminnelser,
-- avbryter köade SMS och mejl som inte gått iväg. p_keep_task lämnas orörd.
create or replace function public.stop_all_channels(p_company_id uuid, p_keep_task uuid default null)
returns void
language plpgsql
as $$
begin
  update public.tasks set status = 'skipped', completed_at = now()
   where company_id = p_company_id and status = 'open' and type in ('call', 'linkedin')
     and id is distinct from p_keep_task;
  update public.sms_messages set status = 'cancelled' where company_id = p_company_id and status = 'pending';
  update public.emails set status = 'rejected', error = 'Stoppad – kontakt i annan kanal'
   where company_id = p_company_id and status in ('draft', 'pending_review', 'approved');
  update public.companies set call_attempt = 0 where id = p_company_id;
end;
$$;

-- Högst en öppen ringuppgift per bolag (äldre dubbletter hoppas över först).
update public.tasks t set status = 'skipped', completed_at = now()
 where t.status = 'open' and t.type = 'call'
   and exists (select 1 from public.tasks t2
                where t2.company_id = t.company_id and t2.status = 'open' and t2.type = 'call'
                  and (t2.priority, t2.created_at, t2.id) < (t.priority, t.created_at, t.id));
create unique index if not exists tasks_one_open_call_per_company
  on public.tasks (company_id) where status = 'open' and type = 'call';

-- Lägger (eller flyttar) bolagets enda öppna ringuppgift.
create or replace function public.schedule_call(
  p_company_id uuid, p_contact_id uuid, p_due timestamptz, p_title text,
  p_attempt int default null, p_priority int default 2, p_description text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  update public.tasks
     set due_at = p_due, title = p_title, attempt = p_attempt, priority = p_priority,
         contact_id = coalesce(p_contact_id, contact_id),
         description = coalesce(p_description, description)
   where company_id = p_company_id and status = 'open' and type = 'call'
  returning id into v_id;
  if v_id is null then
    insert into public.tasks (type, title, description, priority, company_id, contact_id, attempt, due_at)
    values ('call', p_title, p_description, p_priority, p_company_id, p_contact_id, p_attempt, p_due)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Ingång till ringkön: nya bolag, högst settings.ringpass.new_per_day per ringdag
--    p_count = null → dagens kvot (bara på ringdagar). p_count = n → n st extra (knappen "Hämta fler").
--    Partnerägda bolag, kunder och Kontakta ej släpps aldrig in.
-- -----------------------------------------------------------------------------

create or replace function public.release_new_calls(p_count int default null)
returns int
language plpgsql
as $$
declare
  v_today date := public.helsinki_today();
  v_plan jsonb;
  v_limit int;
  v_done int := 0;
  r record;
begin
  if p_count is null then
    select value into v_plan from public.settings where key = 'week_plan';
    if coalesce(v_plan -> trim(to_char(v_today, 'day')) ->> 'channel', '') <> 'phone' then
      return 0;
    end if;
    select count(*) into v_done from public.companies
     where released_at >= public.helsinki_at(v_today, '00:00');
    v_limit := greatest(coalesce(public.ringpass_setting('new_per_day')::int, 15) - v_done, 0);
  else
    v_limit := greatest(p_count, 0);
  end if;

  v_done := 0;
  for r in
    select c.id, c.name,
           (select k.id from public.contacts k where k.company_id = c.id and not k.do_not_contact
             order by k.is_primary desc, k.created_at limit 1) as contact_id
      from public.companies c
     where c.status = 'new' and not c.do_not_contact and c.partner_id is null
       and not exists (select 1 from public.tasks t where t.company_id = c.id and t.status = 'open' and t.type = 'call')
     -- Tillverkning och tjänster först, bygg sist (§1).
     order by (coalesce(c.industry, '') ilike '%bygg%'), c.created_at, c.name
     limit v_limit
  loop
    update public.companies
       set status = 'in_sequence', call_attempt = 0, released_at = now(), sequence_started_at = now(),
           sequence_contact_id = coalesce(sequence_contact_id, r.contact_id)
     where id = r.id;
    perform public.schedule_call(r.id, r.contact_id, now(), 'Försök 1: ' || r.name, 1);
    v_done := v_done + 1;
  end loop;
  return v_done;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Utfall från Ringpasset (§4) – allt i en transaktion
--   booked | no_answer | call_later | wrong_person | send_info | not_now | no_need | do_not_call
-- Returnerar { email_ids: [...] } – godkända mejl som appen lämnar till utskicksadaptern.
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
  v_contact uuid;
  v_contact_name text;
  v_email text;
  v_today date := public.helsinki_today();
  v_emails uuid[] := '{}';
  v_id uuid;
  v_attempt int;
  v_starts timestamptz;
  v_ends timestamptz;
  v_due timestamptz;
  v_months int;
  v_call public.call_outcome;
  v_content text;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Uppgiften finns inte längre'; end if;
  if t.status <> 'open' then raise exception 'Uppgiften är redan hanterad'; end if;
  if t.company_id is null then raise exception 'Uppgiften saknar bolag'; end if;

  select * into c from public.companies where id = t.company_id for update;
  v_contact := coalesce(t.contact_id, c.sequence_contact_id,
    (select k.id from public.contacts k where k.company_id = c.id order by k.is_primary desc, k.created_at limit 1));
  select trim(first_name || ' ' || coalesce(last_name, '')), email into v_contact_name, v_email
    from public.contacts where id = v_contact;

  v_call := case p_outcome
    when 'booked' then 'meeting_booked'
    when 'no_answer' then case when p_voicemail then 'voicemail' else 'no_answer' end
    when 'call_later' then 'callback'
    when 'wrong_person' then 'wrong_person'
    when 'send_info' then 'send_info'
    when 'not_now' then 'not_now'
    when 'no_need' then 'no_need'
    when 'do_not_call' then 'do_not_call'
  end::public.call_outcome;
  if v_call is null then raise exception 'Okänt utfall: %', p_outcome; end if;

  insert into public.calls (company_id, contact_id, task_id, outcome, notes)
  values (c.id, v_contact, t.id, v_call, nullif(trim(p_notes), ''));
  update public.companies set last_call_at = now() where id = c.id;

  -- Bokat: behovssamtal + bekräftelse (SMS, annars mejl) + kalenderhändelse att lägga in
  if p_outcome = 'booked' then
    v_starts := (p_payload ->> 'starts_at')::timestamptz;
    if v_starts is null then raise exception 'Välj tid för behovssamtalet'; end if;
    v_ends := coalesce((p_payload ->> 'ends_at')::timestamptz, v_starts + interval '20 minutes');
    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    -- Triggern handle_meeting_booked sätter status och stoppar övriga kanaler.
    insert into public.meetings (company_id, contact_id, title, starts_at, ends_at, location, status, notes)
    values (c.id, v_contact, 'Behovssamtal: ' || c.name, v_starts, v_ends,
            nullif(trim(p_payload ->> 'location'), ''), 'scheduled', nullif(trim(p_notes), ''));
    v_id := public.queue_template_sms(c.id, v_contact, 'sms-bokat', now(),
              jsonb_build_object('tid', coalesce(p_payload ->> 'when_text', ''),
                                 'plats', coalesce(nullif(trim(p_payload ->> 'location'), ''), 'telefon')));
    if v_id is null and v_email is not null then
      v_id := public.create_template_email(c.id, v_contact, 'mejl-bokat', 1, c.sequence_round,
                jsonb_build_object('tid', coalesce(p_payload ->> 'when_text', ''),
                                   'plats', coalesce(nullif(trim(p_payload ->> 'location'), ''), 'telefon')));
      if v_id is not null then v_emails := v_emails || v_id; end if;
    end if;

  -- Ej svar: försök 1 → SMS nästa morgon + nytt försök, 2 → nytt försök, 3 → sista mejl + Vilande
  elsif p_outcome = 'no_answer' then
    if c.status = 'in_sequence' then
      v_attempt := greatest(coalesce(t.attempt, c.call_attempt + 1), 1);
      update public.companies set call_attempt = least(v_attempt, 3) where id = c.id;
      if v_attempt = 1 then
        perform public.queue_template_sms(c.id, v_contact, 'sms-ej-svar', public.helsinki_at(v_today + 1, '08:30'));
      end if;
      if v_attempt < 3 then
        perform public.schedule_call(c.id, v_contact, public.next_call_slot(now()),
                                     'Försök ' || (v_attempt + 1) || ': ' || c.name, v_attempt + 1);
      else
        update public.tasks set status = 'done', completed_at = now() where id = t.id;
        perform public.stop_all_channels(c.id);
        if v_email is not null then
          v_id := public.create_template_email(c.id, v_contact, 'mejl-sista', 1, c.sequence_round);
          if v_id is not null then v_emails := v_emails || v_id; end if;
        end if;
        update public.companies
           set status = 'nurture', call_attempt = 0,
               nurture_until = v_today + make_interval(months => coalesce(public.ringpass_setting('nurture_months')::int, 2))
         where id = c.id;
      end if;
    else
      -- Utanför försöksräkningen (t.ex. svar eller partnertips): nytt försök nästa ringdag.
      perform public.schedule_call(c.id, v_contact, public.next_call_slot(now()), t.title, t.attempt, t.priority);
    end if;

  -- Ring senare: exakt vid angiven tid
  elsif p_outcome = 'call_later' then
    v_due := (p_payload ->> 'due_at')::timestamptz;
    if v_due is null then raise exception 'Välj när du ska ringa'; end if;
    perform public.schedule_call(c.id, v_contact, v_due, 'Ring senare: ' || c.name, t.attempt, 1,
                                 nullif(trim(p_notes), ''));

  -- Fel person: ny kontakt, nytt samtal direkt
  elsif p_outcome = 'wrong_person' then
    if coalesce(trim(p_payload ->> 'first_name'), '') = '' then raise exception 'Fyll i namnet på rätt person'; end if;
    if coalesce(trim(p_payload ->> 'phone'), '') = '' then raise exception 'Fyll i numret till rätt person'; end if;
    insert into public.contacts (company_id, first_name, last_name, role, phone, is_primary)
    values (c.id, trim(p_payload ->> 'first_name'), nullif(trim(p_payload ->> 'last_name'), ''),
            nullif(trim(p_payload ->> 'role'), ''), trim(p_payload ->> 'phone'), true)
    returning id into v_id;
    update public.contacts set is_primary = false where company_id = c.id and id <> v_id;
    update public.companies set sequence_contact_id = v_id, call_attempt = 0 where id = c.id;
    perform public.schedule_call(c.id, v_id, now(),
      'Ring ' || trim(p_payload ->> 'first_name') || ' (rätt person): ' || c.name,
      case when c.status = 'in_sequence' then 1 end, 1,
      'Tips från ' || coalesce(v_contact_name, 'tidigare kontakt'));

  -- Skicka info: Eriks egna mejl + LinkedIn-påminnelse + nytt samtal om 7 dagar
  elsif p_outcome = 'send_info' then
    if v_email is null then raise exception 'Kontakten saknar e-post – lägg till den först'; end if;
    if coalesce(trim(p_payload ->> 'body'), '') = '' then raise exception 'Mejlet är tomt'; end if;
    insert into public.emails (company_id, contact_id, sequence_round, template, subject, body, status, reviewed_at)
    values (c.id, v_contact, c.sequence_round, 'mejl-skicka-info',
            coalesce(nullif(trim(p_payload ->> 'subject'), ''), 'Som utlovat'), trim(p_payload ->> 'body'),
            'approved', now())
    returning id into v_id;
    v_emails := v_emails || v_id;
    insert into public.tasks (type, title, description, priority, company_id, contact_id, due_at)
    values ('linkedin', 'Lägg till ' || coalesce(v_contact_name, 'kontakten') || ' på LinkedIn', c.name, 2, c.id, v_contact, now());
    update public.companies set call_attempt = 0 where id = c.id;
    perform public.schedule_call(c.id, v_contact,
      public.helsinki_at(public.next_channel_date('phone', v_today + 6), coalesce(public.ringpass_setting('am'), '09:00')),
      'Efter info: ' || c.name, case when c.status = 'in_sequence' then 1 end, 2);

  -- Nej, inte nu: Vilande till valt datum, samtalet ligger färdigt då
  elsif p_outcome = 'not_now' then
    v_due := (p_payload ->> 'due_at')::timestamptz;
    if v_due is null then raise exception 'Välj när du ska höra av dig'; end if;
    perform public.stop_all_channels(c.id, t.id);
    update public.companies
       set status = 'nurture', call_attempt = 0, nurture_until = (v_due at time zone 'Europe/Helsinki')::date
     where id = c.id;
    perform public.schedule_call(c.id, v_contact, v_due, 'Återkomst: ' || c.name, 1, 2, nullif(trim(p_notes), ''));

  -- Nej, inget behov: status Nej, allt stoppas
  elsif p_outcome = 'no_need' then
    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    perform public.stop_all_channels(c.id);
    update public.companies set status = 'no', nurture_until = null where id = c.id;

  -- Ring ej: Kontakta ej i alla kanaler, permanent
  elsif p_outcome = 'do_not_call' then
    update public.tasks set status = 'done', completed_at = now() where id = t.id;
    perform public.stop_all_channels(c.id);
    update public.tasks set status = 'skipped', completed_at = now() where company_id = c.id and status = 'open';
    if v_contact is not null then
      update public.contacts set do_not_contact = true where id = v_contact;
    end if;
    update public.companies set status = 'do_not_contact', nurture_until = null where id = c.id;
  end if;

  return jsonb_build_object('email_ids', to_jsonb(v_emails));
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. Svar och möten (ersätter versionerna från 0003)
-- -----------------------------------------------------------------------------

create or replace function public.handle_reply()
returns trigger
language plpgsql
as $$
declare
  v_name text;
begin
  if tg_op = 'UPDATE' and new.classification is not distinct from old.classification then
    return new;
  end if;

  if new.email_id is not null then
    update public.emails set status = 'replied' where id = new.email_id and status in ('queued', 'sent');
  end if;

  if new.classification in ('out_of_office', 'unclassified') then
    return new;
  end if;

  -- Svar i en kanal stoppar alla andra.
  perform public.stop_all_channels(new.company_id);

  if new.classification in ('negative', 'unsubscribe') then
    -- Nej eller avregistrering: Kontakta ej i alla kanaler.
    if new.contact_id is not null then
      update public.contacts set do_not_contact = true where id = new.contact_id;
    end if;
    update public.companies set status = 'do_not_contact', nurture_until = null where id = new.company_id;
  else
    update public.companies set status = 'replied', nurture_until = null
     where id = new.company_id and status in ('new', 'in_sequence', 'nurture', 'with_partner');
    select trim(k.first_name || ' ' || coalesce(k.last_name, '')) into v_name from public.contacts k where k.id = new.contact_id;
    if new.classification = 'positive' then
      perform public.schedule_call(new.company_id, new.contact_id, now(),
        'Svar: boka behovssamtal med ' || coalesce(v_name, 'kontakten'), null, 1,
        coalesce(new.ai_summary, left(new.body, 280)));
      update public.tasks set reply_id = new.id
       where company_id = new.company_id and status = 'open' and type = 'call' and reply_id is null;
    else
      insert into public.tasks (type, title, description, priority, company_id, contact_id, reply_id, due_at)
      values ('follow_up', 'Läs svaret från ' || coalesce(v_name, 'kontakten'),
              coalesce(new.ai_summary, left(new.body, 280)), 1, new.company_id, new.contact_id, new.id, now())
      on conflict (reply_id) where reply_id is not null do nothing;
    end if;
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
       set status = case when status in ('customer', 'meeting_done', 'solution_shown', 'quote_sent')
                         then status else 'meeting_booked' end,
           nurture_until = null
     where id = new.company_id;
    perform public.stop_all_channels(new.company_id);
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. Dagligt jobb (Vercel Cron) – idempotent
--   1. Vilande vars tid gått ut → tillbaka (I sekvens om ett samtal redan ligger, annars Ny)
--   2. Dagens kvot nya bolag in i ringkön (bara på ringdagar)
-- -----------------------------------------------------------------------------

create or replace function public.run_daily_sequence()
returns jsonb
language plpgsql
as $$
declare
  v_today date := public.helsinki_today();
  v_reactivated int;
  v_released int;
  v_emails uuid[];
begin
  update public.companies c
     set status = case when exists (select 1 from public.tasks t
                                     where t.company_id = c.id and t.status = 'open' and t.type = 'call')
                       then 'in_sequence'::public.company_status else 'new'::public.company_status end,
         nurture_until = null,
         call_attempt = 0,
         sequence_round = sequence_round + 1
   where status = 'nurture' and nurture_until <= v_today and not do_not_contact;
  get diagnostics v_reactivated = row_count;

  v_released := public.release_new_calls(null);

  select coalesce(array_agg(e.id), '{}') into v_emails
    from public.emails e where e.status = 'approved' and e.template is not null;

  return jsonb_build_object('reactivated', v_reactivated, 'released', v_released, 'email_ids', to_jsonb(v_emails));
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. Vyer
-- -----------------------------------------------------------------------------

create or replace view public.company_overview
with (security_invoker = true) as
select
  c.id, c.name, c.city, c.industry, c.website, c.status, c.do_not_contact, c.employees,
  c.last_activity_at, c.created_at, c.partner_id,
  (select count(*) from public.contacts k where k.company_id = c.id)::int as contact_count,
  (select count(*) from public.tasks t where t.company_id = c.id and t.status = 'open')::int as open_task_count
from public.companies c;

-- Ringpassets kö: öppna samtal/uppföljningar som förfaller i dag eller tidigare.
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
  t.attempt,
  c.id as company_id,
  c.name as company_name,
  c.city,
  c.industry,
  c.website,
  c.employees,
  c.status as company_status,
  c.notes as company_notes,
  c.call_attempt,
  p.name as partner_name,
  (select count(*) from public.calls x where x.company_id = c.id)::int as previous_calls,
  k.id as contact_id,
  k.first_name,
  k.last_name,
  k.role,
  coalesce(k.phone, c.phone) as phone,
  k.email
from public.tasks t
join public.companies c on c.id = t.company_id
left join public.partners p on p.id = c.partner_id
left join public.contacts k on k.id = coalesce(
  t.contact_id, c.sequence_contact_id,
  (select k2.id from public.contacts k2 where k2.company_id = c.id order by k2.is_primary desc, k2.created_at limit 1))
where t.status = 'open'
  and t.type in ('call', 'follow_up')
  and not c.do_not_contact
  and t.due_at < public.helsinki_at(public.helsinki_today() + 1, '00:00');

-- -----------------------------------------------------------------------------
-- 13. Mallar (redigeras i Företagshjärnan → Mejlmallar). Mejl: första raden "Ämne: …".
-- -----------------------------------------------------------------------------

insert into public.context_entries (kind, slug, title, content, sort_order) values
  ('template', 'sms-ej-svar', 'SMS: efter obesvarat samtal (försök 1)',
$md$Hej {{förnamn}}! Erik från Optely här, jag försökte ringa dig i går. Vi hjälper småföretag med det som görs för hand vid sidan om jobbet. Jag ringer igen om ett par dagar – eller svara här när det passar. /Erik$md$, 300),
  ('template', 'sms-bokat', 'SMS: bekräftelse behovssamtal',
$md$Hej {{förnamn}}! Tack för samtalet. Då hörs vi {{tid}} ({{plats}}), ca 20 minuter. Hälsningar Erik, Optely$md$, 310),
  ('template', 'mejl-bokat', 'Mejl: bekräftelse behovssamtal (om mobilnummer saknas)',
$md$Ämne: Vi hörs {{tid}}
Hej {{förnamn}},

Tack för samtalet! Då hörs vi {{tid}} ({{plats}}), ca 20 minuter.

Fundera gärna på vad som görs för hand hos {{bolag}} i dag – listor, offerter, rapporter – så tittar vi på det tillsammans.

Hälsningar,
Erik
Optely
$md$, 320),
  ('template', 'mejl-sista', 'Mejl: sista mejlet efter 3 försök',
$md$Ämne: Jag slutar ringa
Hej {{förnamn}},

Jag har försökt nå dig några gånger utan att lyckas, så jag slutar ringa nu.

Kort om varför: vi hjälper småföretag med det som görs för hand vid sidan om jobbet. Hos Hagnäs Tyre Center skapas däcklistan nu automatiskt i stället för för hand.

Om det låter intressant räcker det med ett kort svar, så hörs vi när det passar dig.

Hälsningar,
Erik
Optely
$md$, 330),
  ('template', 'mejl-skicka-info', 'Mejl: "Skicka info" (förifyllt – justeras varje gång)',
$md$Ämne: Som utlovat – kort om Optely
Hej {{förnamn}},

Tack för pratstunden! Som utlovat, kort om vad vi gör: vi hjälper småföretag med det som görs för hand vid sidan om jobbet – listor, rapporter, offerter.

Ett exempel: hos Hagnäs Tyre Center skapas däcklistan nu automatiskt.

Jag ringer dig igen om en vecka och hör vad du tycker.

Hälsningar,
Erik
Optely
$md$, 340)
on conflict (slug) do update set title = excluded.title;

-- -----------------------------------------------------------------------------
-- 14. Behörigheter
-- -----------------------------------------------------------------------------

revoke execute on function public.apply_call_outcome(uuid, text, text, boolean, jsonb) from public, anon;
revoke execute on function public.run_daily_sequence() from public, anon, authenticated;
revoke execute on function public.release_new_calls(int) from public, anon;
revoke execute on function public.stop_all_channels(uuid, uuid) from public, anon;
revoke execute on function public.schedule_call(uuid, uuid, timestamptz, text, int, int, text) from public, anon;
revoke execute on function public.queue_template_sms(uuid, uuid, text, timestamptz, jsonb) from public, anon;
revoke execute on function public.find_company_duplicates(text, text, text, text) from public, anon;
grant execute on function public.apply_call_outcome(uuid, text, text, boolean, jsonb) to authenticated, service_role;
grant execute on function public.run_daily_sequence() to service_role;
grant execute on function public.release_new_calls(int) to authenticated, service_role;
grant execute on function public.stop_all_channels(uuid, uuid) to authenticated, service_role;
grant execute on function public.schedule_call(uuid, uuid, timestamptz, text, int, int, text) to authenticated, service_role;
grant execute on function public.queue_template_sms(uuid, uuid, text, timestamptz, jsonb) to authenticated, service_role;
grant execute on function public.find_company_duplicates(text, text, text, text) to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sms_messages') then
    alter publication supabase_realtime add table public.sms_messages;
  end if;
end;
$$;
