-- =============================================================================
-- Optely Outreach Runtime – grundschema (0001)
--
-- Databasen är sanningen. Ändra aldrig tabeller från UI-kod – skriv en ny
-- migration (0002_..., 0003_...) i stället.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type public.company_status as enum (
  'new',            -- importerad, inte bearbetad
  'researching',    -- berikas / öppningsrad skrivs
  'contacted',      -- första mejlet skickat
  'replied',        -- har svarat (neutralt)
  'warm',           -- positivt svar, ska ringas
  'meeting_booked', -- möte bokat
  'customer',       -- kund
  'lost'            -- inte aktuellt
);

create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed');

create type public.email_status as enum (
  'draft',
  'pending_review', -- väntar på Eriks godkännande i AI Gatekeeper
  'approved',
  'rejected',
  'queued',         -- överlämnad till utskicksleverantören
  'sent',
  'bounced',
  'replied',
  'failed'
);

create type public.reply_classification as enum (
  'positive',
  'neutral',
  'negative',
  'out_of_office',
  'unsubscribe',
  'unclassified'
);

create type public.task_type as enum ('call', 'follow_up', 'partner_checkin', 'other');
create type public.task_status as enum ('open', 'done', 'skipped');

create type public.call_outcome as enum (
  'no_answer',
  'voicemail',
  'callback',
  'interested',
  'not_interested',
  'meeting_booked',
  'wrong_person'
);

create type public.meeting_status as enum ('scheduled', 'held', 'no_show', 'cancelled');

create type public.partner_type as enum ('it', 'accounting', 'web', 'marketing', 'other');

create type public.context_kind as enum (
  'profile',   -- Optelys profil
  'offer',     -- erbjudande
  'icp',       -- idealkund
  'case',      -- kundcase
  'script',    -- samtalsmanus
  'objection', -- invändningshantering
  'tone',      -- tonalitet / skrivregler
  'other'
);

-- -----------------------------------------------------------------------------
-- Hjälpfunktioner
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Inställningar (nyckel/värde)
--   week_plan              – vilken kanal som gäller per veckodag
--   outbound               – { "provider": "manual" | "smartlead" | "n8n-smtp", ... }
--   external_caller_unlock – låst modul 2027
-- -----------------------------------------------------------------------------

create table public.settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  updated_at  timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Bolag & kontakter
-- -----------------------------------------------------------------------------

create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  business_id      text unique,                -- FO-nummer / Y-tunnus
  website          text,
  industry         text,
  city             text,
  employees        integer check (employees is null or employees >= 0),
  revenue_eur      integer check (revenue_eur is null or revenue_eur >= 0),
  status           public.company_status not null default 'new',
  do_not_contact   boolean not null default false,
  source           text,                       -- t.ex. 'import', 'partner', 'manuell'
  notes            text,
  enrichment       jsonb not null default '{}'::jsonb,
  last_activity_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index companies_status_idx on public.companies (status);
create index companies_city_idx on public.companies (city);
create index companies_name_search_idx on public.companies using gin (to_tsvector('simple', name));

create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

create table public.contacts (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  first_name     text not null,
  last_name      text,
  role           text,
  email          text,
  phone          text,
  linkedin_url   text,
  is_primary     boolean not null default false,
  do_not_contact boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index contacts_company_idx on public.contacts (company_id);
create unique index contacts_email_unique on public.contacts (lower(email)) where email is not null;

create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Kampanjer & mejl
-- -----------------------------------------------------------------------------

create table public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  status       public.campaign_status not null default 'draft',
  provider     text not null default 'manual',
  external_id  text,                           -- id hos utskicksleverantören
  daily_limit  integer not null default 30 check (daily_limit > 0),
  starts_on    date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.emails (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid references public.campaigns (id) on delete set null,
  company_id       uuid not null references public.companies (id) on delete cascade,
  contact_id       uuid references public.contacts (id) on delete set null,
  sequence_step    integer not null default 1 check (sequence_step >= 1),
  subject          text not null,
  body             text not null,
  ai_opening_line  text,                       -- AI-genererad, granskas i Gatekeeper
  ai_model         text,
  status           public.email_status not null default 'draft',
  reviewed_at      timestamptz,
  queued_at        timestamptz,
  sent_at          timestamptz,
  external_id      text,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index emails_status_idx on public.emails (status);
create index emails_company_idx on public.emails (company_id);
create index emails_campaign_idx on public.emails (campaign_id);

create trigger emails_updated_at before update on public.emails
  for each row execute function public.set_updated_at();

-- Avregistrering respekteras alltid: inget mejl till do_not_contact får köas eller skickas.
create or replace function public.guard_do_not_contact()
returns trigger
language plpgsql
as $$
declare
  blocked boolean;
begin
  if new.status in ('approved', 'queued', 'sent') then
    select exists (
      select 1 from public.companies c where c.id = new.company_id and c.do_not_contact
    ) or exists (
      select 1 from public.contacts k where k.id = new.contact_id and k.do_not_contact
    ) into blocked;

    if blocked then
      raise exception 'Kontakten eller bolaget har avregistrerat sig (do_not_contact)'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger emails_guard_do_not_contact
  before insert or update of status, contact_id, company_id on public.emails
  for each row execute function public.guard_do_not_contact();

-- -----------------------------------------------------------------------------
-- Svar
-- -----------------------------------------------------------------------------

create table public.replies (
  id              uuid primary key default gen_random_uuid(),
  email_id        uuid references public.emails (id) on delete set null,
  company_id      uuid not null references public.companies (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete set null,
  from_address    text,
  subject         text,
  body            text not null,
  classification  public.reply_classification not null default 'unclassified',
  ai_summary      text,
  received_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index replies_company_idx on public.replies (company_id);
create index replies_classification_idx on public.replies (classification);

-- -----------------------------------------------------------------------------
-- Uppgifter (Ringpasset)
-- -----------------------------------------------------------------------------

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  type          public.task_type not null default 'call',
  status        public.task_status not null default 'open',
  title         text not null,
  description   text,
  priority      smallint not null default 2 check (priority between 1 and 3), -- 1 = högst
  company_id    uuid references public.companies (id) on delete cascade,
  contact_id    uuid references public.contacts (id) on delete set null,
  reply_id      uuid references public.replies (id) on delete set null,
  partner_id    uuid,                                   -- fk läggs till nedan
  due_at        timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_open_idx on public.tasks (status, priority, due_at);
create unique index tasks_one_call_per_reply on public.tasks (reply_id) where reply_id is not null;

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Samtal & möten
-- -----------------------------------------------------------------------------

create table public.calls (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  contact_id        uuid references public.contacts (id) on delete set null,
  task_id           uuid references public.tasks (id) on delete set null,
  outcome           public.call_outcome not null,
  notes             text,
  duration_seconds  integer check (duration_seconds is null or duration_seconds >= 0),
  called_at         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index calls_company_idx on public.calls (company_id);

create table public.meetings (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  contact_id         uuid references public.contacts (id) on delete set null,
  title              text not null,
  starts_at          timestamptz not null,
  ends_at            timestamptz,
  location           text,
  status             public.meeting_status not null default 'scheduled',
  calendar_event_id  text,
  notes              text,
  outcome            text,
  value_eur          integer check (value_eur is null or value_eur >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index meetings_company_idx on public.meetings (company_id);
create index meetings_starts_idx on public.meetings (starts_at);

create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Partners
-- -----------------------------------------------------------------------------

create table public.partners (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  type                   public.partner_type not null default 'other',
  contact_name           text,
  email                  text,
  phone                  text,
  city                   text,
  notes                  text,
  checkin_interval_days  integer not null default 30 check (checkin_interval_days > 0),
  last_checkin_at        timestamptz,
  referrals_count        integer not null default 0 check (referrals_count >= 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger partners_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.tasks
  add constraint tasks_partner_id_fkey foreign key (partner_id)
  references public.partners (id) on delete cascade;

create table public.partner_checkins (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references public.partners (id) on delete cascade,
  notes          text,
  checked_in_at  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index partner_checkins_partner_idx on public.partner_checkins (partner_id, checked_in_at desc);

create or replace function public.touch_partner_checkin()
returns trigger
language plpgsql
as $$
begin
  update public.partners
     set last_checkin_at = greatest(coalesce(last_checkin_at, new.checked_in_at), new.checked_in_at)
   where id = new.partner_id;
  return new;
end;
$$;

create trigger partner_checkins_touch after insert on public.partner_checkins
  for each row execute function public.touch_partner_checkin();

-- -----------------------------------------------------------------------------
-- Företagshjärnan – kontext som matar AI-texterna
-- -----------------------------------------------------------------------------

create table public.context_entries (
  id          uuid primary key default gen_random_uuid(),
  kind        public.context_kind not null default 'other',
  slug        text not null unique,
  title       text not null,
  content     text not null default '',      -- markdown
  is_active   boolean not null default true,  -- används av AI när true
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index context_entries_kind_idx on public.context_entries (kind, sort_order);

create trigger context_entries_updated_at before update on public.context_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Webhook-logg (n8n → appen)
-- -----------------------------------------------------------------------------

create table public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'n8n',
  event_type    text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

create index webhook_events_unprocessed_idx on public.webhook_events (received_at)
  where processed_at is null and error is null;

-- -----------------------------------------------------------------------------
-- Senaste aktivitet per bolag
-- -----------------------------------------------------------------------------

-- Triggerargumentet anger vilken kolumn som är aktivitetens tidpunkt.
create or replace function public.touch_company_activity()
returns trigger
language plpgsql
as $$
declare
  ts timestamptz;
begin
  ts := coalesce((to_jsonb(new) ->> tg_argv[0])::timestamptz, now());

  update public.companies
     set last_activity_at = greatest(coalesce(last_activity_at, ts), ts)
   where id = new.company_id;
  return new;
end;
$$;

create trigger emails_touch_company after insert or update of status on public.emails
  for each row when (new.status in ('sent', 'replied', 'bounced'))
  execute function public.touch_company_activity('sent_at');
create trigger replies_touch_company after insert on public.replies
  for each row execute function public.touch_company_activity('received_at');
create trigger calls_touch_company after insert on public.calls
  for each row execute function public.touch_company_activity('called_at');
create trigger meetings_touch_company after insert on public.meetings
  for each row execute function public.touch_company_activity('created_at');

-- -----------------------------------------------------------------------------
-- Svar → ringuppgift (kärnan i Warm Outbound)
--   positive    → ringuppgift prio 1, bolaget blir 'warm', mejlet 'replied'
--   unsubscribe → kontakt (eller bolag) markeras do_not_contact
--   övriga      → mejlet 'replied', bolaget 'replied' om det var 'contacted'
-- -----------------------------------------------------------------------------

create or replace function public.handle_reply()
returns trigger
language plpgsql
as $$
declare
  company_name text;
  contact_name text;
begin
  -- Vid update: gör bara något när klassificeringen faktiskt ändrats.
  if tg_op = 'UPDATE' and new.classification is not distinct from old.classification then
    return new;
  end if;

  if new.email_id is not null then
    update public.emails set status = 'replied'
     where id = new.email_id and status in ('queued', 'sent');
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
       and status in ('new', 'researching', 'contacted', 'replied');

  elsif new.classification = 'unsubscribe' then
    if new.contact_id is not null then
      update public.contacts set do_not_contact = true where id = new.contact_id;
    else
      update public.companies set do_not_contact = true where id = new.company_id;
    end if;
    -- Stoppa allt som väntar på utskick till samma mottagare.
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

create trigger replies_handle after insert or update of classification on public.replies
  for each row execute function public.handle_reply();

-- Ett bokat möte flyttar bolaget i tratten och stänger öppna ringuppgifter.
create or replace function public.handle_meeting_booked()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'scheduled' then
    update public.companies set status = 'meeting_booked'
     where id = new.company_id and status not in ('customer', 'meeting_booked');

    update public.tasks set status = 'done', completed_at = now()
     where company_id = new.company_id and type = 'call' and status = 'open';
  end if;
  return new;
end;
$$;

create trigger meetings_booked after insert on public.meetings
  for each row execute function public.handle_meeting_booked();

-- -----------------------------------------------------------------------------
-- Vyer
-- -----------------------------------------------------------------------------

create or replace view public.company_overview
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.city,
  c.industry,
  c.website,
  c.status,
  c.do_not_contact,
  c.employees,
  c.last_activity_at,
  c.created_at,
  (select count(*) from public.contacts k where k.company_id = c.id)::int as contact_count,
  (select count(*) from public.tasks t where t.company_id = c.id and t.status = 'open')::int as open_task_count
from public.companies c;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- En användare (Erik), publik signup avstängd i Supabase Auth.
-- Inloggad = full åtkomst. Service role (webhooks) går förbi RLS.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'companies', 'contacts', 'campaigns', 'emails', 'replies',
    'tasks', 'calls', 'meetings', 'partners', 'partner_checkins',
    'context_entries', 'webhook_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end;
$$;

-- Webhook-loggen ska bara skrivas av servern; inloggad användare får läsa.
drop policy "authenticated_all" on public.webhook_events;
create policy "authenticated_read" on public.webhook_events for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Realtime: Ringpasset och Gatekeeper lyssnar på ändringar
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tasks, public.emails, public.replies;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Standardinställningar
-- -----------------------------------------------------------------------------

insert into public.settings (key, value, description) values
  (
    'week_plan',
    '{
      "monday":    {"channel": "email",    "label": "Mejl"},
      "tuesday":   {"channel": "phone",    "label": "Ringpass"},
      "wednesday": {"channel": "partners", "label": "Partners"},
      "thursday":  {"channel": "phone",    "label": "Ringpass"},
      "friday":    {"channel": "strategy", "label": "Strategi & uppföljning"},
      "saturday":  {"channel": "off",      "label": "Ledigt"},
      "sunday":    {"channel": "off",      "label": "Ledigt"}
    }'::jsonb,
    'Vilken kanal som gäller per veckodag'
  ),
  (
    'outbound',
    '{"provider": "manual", "from_domain": null, "daily_limit": 30}'::jsonb,
    'Vald utskicksleverantör: manual | smartlead | n8n-smtp'
  ),
  (
    'external_caller_unlock',
    '{"unlocked": false, "unlock_after": "2027-01-01"}'::jsonb,
    'Låst modul 2027 – extern säljare'
  );
