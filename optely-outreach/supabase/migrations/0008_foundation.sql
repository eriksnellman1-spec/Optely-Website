-- =============================================================================
-- 0008 – Grunden för två erbjudanden (Optely + SBA), docs/saljsystem.md.
-- Kräver 0001–0007. Idempotent – säker att köra igen.
--
-- Innehåll: companies.offer + spärr vid byte, context_entries.offer + SBA-manus,
-- linkedin_messages, deals (synkas från status), customers_optely, sba_clients,
-- weekly_reviews, vyerna activities, offer_stats_weekly, pipeline_cards,
-- email_overview samt offer i company_overview, ringpass_queue och notices.
--
-- Ringpassets logik (apply_call_outcome, run_daily_sequence, release_new_calls) ändras INTE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Erbjudande per företag
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'companies' and column_name = 'offer') then
    alter table public.companies add column offer public.offer not null default 'optely';
    -- Engångs-backfill: bygg, VVS, el, måleri, tak, golv/kakel → SBA. Övriga → Optely.
    update public.companies
       set offer = 'sba'
     where coalesce(industry, '') ~* '(bygg|vvs|\mel\M|elinstall|elektri|måler|maler|\mtak|golv|kakel|rör|ventilation)';
  end if;
end;
$$;

create index if not exists companies_offer_idx on public.companies (offer);

-- Ett aktivt erbjudande: byte spärras när bolaget är i sekvens eller längre fram.
create or replace function public.guard_offer_change()
returns trigger
language plpgsql
as $$
begin
  if new.offer is distinct from old.offer then
    if old.status not in ('new', 'no', 'nurture', 'do_not_contact') then
      raise exception 'Erbjudandet kan inte bytas när bolaget har status "%". Byte går bara vid Ny, Nej, Vilande eller Kontakta ej.',
        case old.status
          when 'in_sequence' then 'I sekvens'
          when 'replied' then 'Svarat'
          when 'meeting_booked' then 'Behovssamtal bokat'
          when 'meeting_done' then 'Behovssamtal klart'
          when 'solution_shown' then 'Lösning visad'
          when 'quote_sent' then 'Offert skickad'
          when 'customer' then 'Kund'
          when 'with_partner' then 'Hos partner'
          else old.status::text
        end
        using errcode = 'P0001';
    end if;
    if new.offer = 'sba' and new.partner_id is not null then
      raise exception 'Partnerägda bolag hör till Optely och kan inte bytas till SBA.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_guard_offer on public.companies;
create trigger companies_guard_offer
  before update of offer on public.companies
  for each row execute function public.guard_offer_change();

-- -----------------------------------------------------------------------------
-- 2. Erbjudande på manus, mallar och sekvenser (null = gäller båda)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'context_entries' and column_name = 'offer') then
    alter table public.context_entries add column offer public.offer;
    -- Befintligt innehåll är skrivet för Optely; ton och övrigt gäller båda.
    update public.context_entries
       set offer = 'optely'
     where kind::text in ('profile', 'offer', 'icp', 'case', 'script', 'objection', 'template', 'sequence');
  end if;
end;
$$;

create index if not exists context_entries_offer_idx on public.context_entries (offer, kind, sort_order);

insert into public.context_entries (kind, slug, title, content, sort_order, offer) values
  ('offer', 'sba-erbjudande', 'SBA: erbjudandet',
$md$# SBA – fler bokade kunder

Färdigt system åt hantverkare och installatörer (bygg, VVS, el, måleri, tak) som ger **fler bokade kunder**.

- **Löfte:** minst **3 extra bokade** möten, offerttider eller besök per månad – räknas när de är bokade.
- **Garanti:** färre än 3 = ingen avgift den månaden.
- **Pris:** 490 €/mån fast. Kunden betalar själv annonsbudgeten.
- Leveransen sker i GoHighLevel.
$md$, 15, 'sba'),
  ('script', 'sba-manus-kallt-samtal', 'SBA: manus kallt samtal',
$md$# Kallt samtal – SBA

1. **Öppning:** "Hej {förnamn}, Erik här. Jag hjälper hantverkare i Österbotten att få fler bokade jobb. Har du två minuter?"
2. **Fråga:** "Hur får ni nya kunder i dag – mest rekommendationer, eller kommer det in förfrågningar på nätet också?"
3. **Budskap:** "Vi sätter upp ett färdigt system som ger minst tre extra bokade offerttider eller besök i månaden. Blir det färre än tre betalar du ingenting den månaden."
4. **Pris om de frågar:** "490 euro i månaden, och annonsbudgeten betalar ni själv."
5. **Boka:** "Ska vi ta 20 minuter och kolla hur det skulle se ut för {bolag}? Jag har {dag} förmiddag eller eftermiddag."
$md$, 50, 'sba'),
  ('objection', 'sba-invandning-har-nog-jobb', 'SBA: "Vi har nog med jobb"',
$md$**"Vi har nog med jobb."**

"Bra – då är det rätt läge. Det handlar om att välja de bättre jobben och ha jämnt flöde även när det blir lugnare. Och blir det inga tre bokningar kostar det inget."
$md$, 60, 'sba'),
  ('objection', 'sba-invandning-vad-kostar', 'SBA: "Vad kostar det?"',
$md$**"Vad kostar det?"**

"490 euro i månaden fast, plus annonsbudgeten som ni bestämmer själv. Färre än tre extra bokningar en månad – då betalar ni ingen avgift."
$md$, 70, 'sba'),
  ('objection', 'sba-invandning-provat-annonser', 'SBA: "Vi har provat annonser"',
$md$**"Vi har provat annonser, det funkade inte."**

"Det hör jag ofta. Skillnaden är att vi räknar bokade besök, inte klick – och når vi inte tre i månaden betalar ni inget. Vad var det som inte funkade sist?"
$md$, 80, 'sba'),
  ('objection', 'sba-invandning-skicka-info', 'SBA: "Skicka info"',
$md$**"Skicka info på mejl."**

"Gärna. Vilken typ av jobb vill ni ha mer av – så skickar jag ett exempel som passar och ringer om en vecka?"
$md$, 90, 'sba'),
  ('sequence', 'sba-sekvens-mejl-1', 'SBA: e-post 1 (dag 1)',
$md$Ämne: Fler bokade jobb till {{bolag}}?
Hej {{förnamn}},

Jag hjälper hantverkare i Österbotten att få minst tre extra bokade offerttider eller besök i månaden. Blir det färre betalar ni ingen avgift den månaden.

Är det något för {{bolag}}?

Hälsningar,
Erik
$md$, 110, 'sba'),
  ('sequence', 'sba-sekvens-mejl-2', 'SBA: e-post 2 (dag 3)',
$md$Ämne: Sv: Fler bokade jobb till {{bolag}}?
Hej {{förnamn}},

Kort uppföljning: 490 €/mån fast, ni bestämmer annonsbudgeten själv, och garantin gäller varje månad – under tre bokningar, ingen avgift.

Ska jag ringa dig en dag i veckan?

/Erik
$md$, 120, 'sba'),
  ('sequence', 'sba-sekvens-mejl-3', 'SBA: e-post 3 (avslut)',
$md$Ämne: Ska jag sluta höra av mig?
Hej {{förnamn}},

Jag har hört av mig ett par gånger om fler bokade jobb. Passar det inte nu räcker det med ett kort "nej tack", så hör jag inte av mig mer.

/Erik
$md$, 130, 'sba'),
  ('sequence', 'optely-sekvens-mejl-1', 'Optely: e-post 1 (dag 1)',
$md$Ämne: Det som görs för hand
Hej {{förnamn}},

{{första_mening}}

Vi hjälper företag i Österbotten med det som görs för hand vid sidan om jobbet – listor, rapporter, offerter. Hos Hagnäs Tyre Center skapas däcklistan nu automatiskt.

Värt 20 minuter?

Hälsningar,
Erik
$md$, 110, 'optely'),
  ('sequence', 'optely-sekvens-mejl-2', 'Optely: e-post 2 (dag 3)',
$md$Ämne: Sv: Det som görs för hand
Hej {{förnamn}},

Jag ringde i går men nådde dig inte. Finns det något hos {{bolag}} som görs för hand och tar onödig tid – listor, rapporter eller uppföljning av offerter?

/Erik
$md$, 120, 'optely')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 3. LinkedIn – manuell loggning
-- -----------------------------------------------------------------------------

create table if not exists public.linkedin_messages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  contact_id  uuid references public.contacts (id) on delete set null,
  direction   public.message_direction not null default 'out',
  note        text,
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists linkedin_messages_company_idx on public.linkedin_messages (company_id, sent_at desc);

-- Ett inkommande LinkedIn-svar räknas som svar: stoppa övriga kanaler och markera Svarat.
create or replace function public.handle_linkedin_reply()
returns trigger
language plpgsql
as $$
begin
  if new.direction = 'in' then
    perform public.stop_all_channels(new.company_id);
    update public.companies set status = 'replied', nurture_until = null
     where id = new.company_id and status in ('new', 'in_sequence', 'nurture');
  end if;
  update public.companies
     set last_activity_at = greatest(coalesce(last_activity_at, new.sent_at), new.sent_at)
   where id = new.company_id;
  return new;
end;
$$;

drop trigger if exists linkedin_messages_after_insert on public.linkedin_messages;
create trigger linkedin_messages_after_insert
  after insert on public.linkedin_messages
  for each row execute function public.handle_linkedin_reply();

-- -----------------------------------------------------------------------------
-- 4. Affärer (deals) – steget synkas från companies.status
-- -----------------------------------------------------------------------------

create table if not exists public.deals (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  offer             public.offer not null,
  stage             public.deal_stage not null default 'kontaktad',
  value_eur         integer check (value_eur is null or value_eur >= 0),
  next_action       text,
  next_action_at    timestamptz,
  stage_changed_at  timestamptz not null default now(),
  won_at            timestamptz,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- En öppen affär per bolag.
create unique index if not exists deals_one_open_per_company
  on public.deals (company_id) where stage not in ('kund', 'forlorad');
create index if not exists deals_stage_idx on public.deals (offer, stage);
create index if not exists deals_won_idx on public.deals (won_at) where won_at is not null;

drop trigger if exists deals_updated_at on public.deals;
create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

create or replace function public.stage_for_status(p_status public.company_status)
returns public.deal_stage
language sql
immutable
as $$
  select case p_status
    when 'in_sequence' then 'kontaktad'
    when 'replied' then 'svar'
    when 'meeting_booked' then 'mote_bokat'
    when 'meeting_done' then 'mote_hallet'
    when 'solution_shown' then 'mote_hallet'
    when 'quote_sent' then 'offert'
    when 'customer' then 'kund'
    when 'no' then 'forlorad'
    when 'do_not_contact' then 'forlorad'
  end::public.deal_stage
$$;

create or replace function public.sync_deal_from_status()
returns trigger
language plpgsql
as $$
declare
  v_stage public.deal_stage := public.stage_for_status(new.status);
  v_deal public.deals%rowtype;
begin
  -- Erbjudandet på öppen affär följer bolaget.
  if tg_op = 'UPDATE' and new.offer is distinct from old.offer then
    update public.deals set offer = new.offer where company_id = new.id and stage not in ('kund', 'forlorad');
  end if;

  if v_stage is null or (tg_op = 'UPDATE' and new.status is not distinct from old.status) then
    return new;
  end if;

  select * into v_deal from public.deals
   where company_id = new.id and stage not in ('kund', 'forlorad') limit 1;

  if found then
    if v_deal.stage is distinct from v_stage then
      update public.deals
         set stage = v_stage,
             stage_changed_at = now(),
             won_at = case when v_stage = 'kund' then now() else won_at end,
             closed_at = case when v_stage in ('kund', 'forlorad') then now() else closed_at end
       where id = v_deal.id;
    end if;
  elsif v_stage = 'kund' then
    insert into public.deals (company_id, offer, stage, value_eur, won_at, closed_at)
    values (new.id, new.offer, 'kund', case when new.offer = 'sba' then 490 end, now(), now());
  elsif v_stage <> 'forlorad' then
    insert into public.deals (company_id, offer, stage, value_eur)
    values (new.id, new.offer, v_stage, case when new.offer = 'sba' then 490 end);
  end if;

  if v_stage = 'kund' and new.offer = 'optely' then
    insert into public.customers_optely (company_id, started_at)
    values (new.id, public.helsinki_today())
    on conflict (company_id) do nothing;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Kunder
-- -----------------------------------------------------------------------------

create table if not exists public.customers_optely (
  company_id             uuid primary key references public.companies (id) on delete cascade,
  project                text,
  invoiced               boolean not null default false,
  invoice_note           text,
  maintenance_agreement  boolean not null default false,
  started_at             date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists customers_optely_updated_at on public.customers_optely;
create trigger customers_optely_updated_at before update on public.customers_optely
  for each row execute function public.set_updated_at();

create table if not exists public.sba_clients (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  month          date not null check (extract(day from month) = 1),
  bookings       integer not null default 0 check (bookings >= 0),
  -- Garantin: minst 3 bokade per månad. Färre = ingen avgift.
  guarantee_met  boolean generated always as (bookings >= 3) stored,
  invoice        boolean generated always as (bookings >= 3) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (company_id, month)
);

drop trigger if exists sba_clients_updated_at on public.sba_clients;
create trigger sba_clients_updated_at before update on public.sba_clients
  for each row execute function public.set_updated_at();

-- Triggern skapas efter customers_optely (den skriver dit).
drop trigger if exists companies_sync_deal on public.companies;
create trigger companies_sync_deal
  after insert or update of status, offer on public.companies
  for each row execute function public.sync_deal_from_status();

-- Backfill: affärer för bolag som redan är i pipelinen (bara de som saknar affär).
insert into public.deals (company_id, offer, stage, value_eur, won_at, closed_at)
select c.id, c.offer, public.stage_for_status(c.status),
       case when c.offer = 'sba' then 490 end,
       case when c.status = 'customer' then now() end,
       case when c.status = 'customer' then now() end
  from public.companies c
 where public.stage_for_status(c.status) is not null
   and public.stage_for_status(c.status) <> 'forlorad'
   and not exists (select 1 from public.deals d where d.company_id = c.id);

insert into public.customers_optely (company_id, started_at)
select c.id, public.helsinki_today() from public.companies c
 where c.status = 'customer' and c.offer = 'optely'
on conflict (company_id) do nothing;

-- Flytt i pipelinen → status (som i sin tur synkar affären).
create or replace function public.move_deal_stage(p_company_id uuid, p_stage public.deal_stage)
returns void
language plpgsql
as $$
declare
  c public.companies%rowtype;
begin
  select * into c from public.companies where id = p_company_id for update;
  if not found then raise exception 'Bolaget finns inte'; end if;
  if c.do_not_contact then raise exception 'Bolaget har Kontakta ej och kan inte flyttas.'; end if;
  if p_stage in ('kund', 'forlorad') then
    perform public.stop_all_channels(p_company_id);
  end if;
  update public.companies
     set status = case p_stage
                    when 'kontaktad' then 'in_sequence'
                    when 'svar' then 'replied'
                    when 'mote_bokat' then 'meeting_booked'
                    when 'mote_hallet' then 'meeting_done'
                    when 'offert' then 'quote_sent'
                    when 'kund' then 'customer'
                    when 'forlorad' then 'no'
                  end::public.company_status,
         nurture_until = null
   where id = p_company_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Lördagsanalys – "vad ska ändras"
-- -----------------------------------------------------------------------------

create table if not exists public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null check (extract(isodow from week_start) = 1),
  offer       public.offer,   -- null = alla erbjudanden
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- En anteckning per vecka och erbjudande, plus en för "alla".
create unique index if not exists weekly_reviews_week_all
  on public.weekly_reviews (week_start) where offer is null;
create unique index if not exists weekly_reviews_week_offer
  on public.weekly_reviews (week_start, offer) where offer is not null;

drop trigger if exists weekly_reviews_updated_at on public.weekly_reviews;
create trigger weekly_reviews_updated_at before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Vyer
-- -----------------------------------------------------------------------------

-- Alla kontakter över alla kanaler (kontaktkortets historik och statistiken).
create or replace view public.activities
with (security_invoker = true) as
select a.*, c.offer
from (
  select 'call'::text as source, x.id as source_id, x.company_id, x.contact_id, null::uuid as partner_id,
         'samtal'::text as channel, 'samtal'::text as type, x.outcome::text as outcome, x.notes as note,
         x.called_at as occurred_at, x.duration_seconds
    from public.calls x
  union all
  select 'email', e.id, e.company_id, e.contact_id, null, 'e-post',
         case e.status when 'queued' then 'köat' when 'bounced' then 'studsat' else 'skickat' end,
         e.status::text, e.subject, coalesce(e.sent_at, e.queued_at, e.created_at), null
    from public.emails e
   where e.status in ('queued', 'sent', 'replied', 'bounced')
  union all
  select 'reply', r.id, r.company_id, r.contact_id, null, 'e-post', 'svar', r.classification::text,
         left(r.body, 300), r.received_at, null
    from public.replies r
  union all
  select 'sms', s.id, s.company_id, s.contact_id, null, 'sms',
         case s.status when 'pending' then 'köat' else 'skickat' end, s.status, s.body,
         coalesce(s.sent_at, s.due_at), null
    from public.sms_messages s
   where s.status <> 'cancelled'
  union all
  select 'linkedin', l.id, l.company_id, l.contact_id, null, 'linkedin',
         case l.direction when 'out' then 'skickat' else 'svar' end, null, l.note, l.sent_at, null
    from public.linkedin_messages l
  union all
  select 'partner_checkin', pc.id, null, null, pc.partner_id, 'partner', 'check-in', null, pc.notes,
         pc.checked_in_at, null
    from public.partner_checkins pc
  union all
  select 'meeting', m.id, m.company_id, m.contact_id, null, 'möte', 'bokat', m.status::text, m.title,
         m.created_at, null
    from public.meetings m
  union all
  select 'meeting', m.id, m.company_id, m.contact_id, null, 'möte',
         case m.status when 'held' then 'hållet' when 'no_show' then 'uteblev' else 'avbokat' end,
         m.status::text, m.title, m.starts_at, null
    from public.meetings m
   where m.status in ('held', 'no_show', 'cancelled')
) a
left join public.companies c on c.id = a.company_id;

-- Vilken kanal får äran för ett bokat möte / avtal (beslut 2026-11-07):
-- bokat i ett samtal → samtal, annars kanalen för senaste utgående kontakt före tidpunkten.
create or replace function public.attributed_channel(p_company_id uuid, p_at timestamptz)
returns text
language sql
stable
as $$
  select coalesce(
    (select 'samtal' from public.calls x
      where x.company_id = p_company_id and x.outcome = 'meeting_booked'
        and x.called_at between p_at - interval '1 day' and p_at + interval '5 minutes'
      limit 1),
    (select a.channel from public.activities a
      where a.company_id = p_company_id and a.occurred_at <= p_at + interval '5 minutes'
        and ((a.channel = 'samtal')
             or (a.channel in ('e-post', 'sms', 'linkedin') and a.type in ('skickat', 'studsat')))
      order by a.occurred_at desc limit 1),
    'okänd')
$$;

-- Veckosiffror per erbjudande och kanal (+ kanal 'alla'). Vecka börjar måndag, Helsingfors-tid.
create or replace view public.offer_stats_weekly
with (security_invoker = true) as
with ev as (
  select a.company_id, a.offer, a.channel, a.occurred_at, 'kontakt'::text as kind
    from public.activities a
   where a.company_id is not null
     and ((a.channel = 'samtal')
          or (a.channel in ('e-post', 'sms', 'linkedin') and a.type in ('skickat', 'studsat')))
  union all
  select a.company_id, a.offer, a.channel, a.occurred_at, 'svar'
    from public.activities a
   where a.company_id is not null
     and ((a.channel = 'samtal' and a.outcome not in ('no_answer', 'voicemail'))
          or (a.channel = 'e-post' and a.type = 'svar' and a.outcome not in ('out_of_office', 'unclassified'))
          or (a.channel = 'linkedin' and a.type = 'svar'))
  union all
  select m.company_id, c.offer, public.attributed_channel(m.company_id, m.created_at), m.created_at, 'bokat'
    from public.meetings m join public.companies c on c.id = m.company_id
  union all
  select d.company_id, d.offer, public.attributed_channel(d.company_id, d.won_at), d.won_at, 'avtal'
    from public.deals d where d.won_at is not null
),
wk as (
  select date_trunc('week', ev.occurred_at at time zone 'Europe/Helsinki')::date as week_start,
         ev.offer, ev.channel, ev.company_id, ev.kind
    from ev where ev.offer is not null
)
select
  week_start,
  offer,
  case when grouping(channel) = 1 then 'alla' else channel end as channel,
  count(distinct company_id) filter (where kind = 'kontakt')::int as contacted,
  count(distinct company_id) filter (where kind = 'svar')::int as replies,
  count(*) filter (where kind = 'bokat')::int as meetings_booked,
  count(*) filter (where kind = 'avtal')::int as deals_won,
  round(100.0 * count(*) filter (where kind = 'bokat')
        / nullif(count(distinct company_id) filter (where kind = 'kontakt'), 0), 1) as booked_per_100
from wk
group by grouping sets ((week_start, offer, channel), (week_start, offer));

-- Pipelinens kort: öppna affärer + vunna, med nästa åtgärd (affärens eller nästa öppna uppgift).
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
  coalesce(d.next_action_at, t.due_at) as next_action_at
from public.deals d
join public.companies c on c.id = d.company_id
left join lateral (
  select t.title, t.due_at from public.tasks t
   where t.company_id = c.id and t.status = 'open'
   order by t.due_at limit 1
) t on true
where d.stage <> 'forlorad';

-- Outreach: mejl per status med bolag och erbjudande.
create or replace view public.email_overview
with (security_invoker = true) as
select
  e.id, e.status, e.subject, e.template, e.ai_opening_line, e.created_at, e.queued_at, e.sent_at,
  c.id as company_id, c.name as company_name, c.offer,
  trim(k.first_name || ' ' || coalesce(k.last_name, '')) as contact_name, k.email as contact_email
from public.emails e
join public.companies c on c.id = e.company_id
left join public.contacts k on k.id = e.contact_id;

-- Befintliga vyer får kolumnen offer (läggs sist).
create or replace view public.company_overview
with (security_invoker = true) as
select
  c.id, c.name, c.city, c.industry, c.website, c.status, c.do_not_contact, c.employees,
  c.last_activity_at, c.created_at, c.partner_id,
  (select count(*) from public.contacts k where k.company_id = c.id)::int as contact_count,
  (select count(*) from public.tasks t where t.company_id = c.id and t.status = 'open')::int as open_task_count,
  c.offer
from public.companies c;

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
  k.email,
  c.offer
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
  r.received_at,
  c.offer
from public.tasks t
join public.companies c on c.id = t.company_id
left join public.partners p on p.id = c.partner_id
left join public.contacts k on k.id = coalesce(t.contact_id, c.sequence_contact_id)
left join public.replies r on r.id = t.reply_id
where t.status = 'open'
  and t.type in ('call', 'follow_up')
  and (t.reply_id is not null or c.status = 'with_partner');

-- -----------------------------------------------------------------------------
-- 8. Row Level Security och behörigheter
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['linkedin_messages', 'deals', 'customers_optely', 'sba_clients', 'weekly_reviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all" on public.%I', t);
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

revoke execute on function public.move_deal_stage(uuid, public.deal_stage) from public, anon;
grant execute on function public.move_deal_stage(uuid, public.deal_stage) to authenticated, service_role;
revoke execute on function public.attributed_channel(uuid, timestamptz) from public, anon;
grant execute on function public.attributed_channel(uuid, timestamptz) to authenticated, service_role;
