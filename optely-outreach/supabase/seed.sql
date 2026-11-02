-- =============================================================================
-- Testdata för Optely O.R. enligt docs/saljsystem.md – PÅHITTADE bolag och personer.
-- Ingen riktig persondata. Domänerna använder den reserverade toppdomänen .test.
-- (Hagnäs Tyre Center nämns bara som Optelys kundcase i Företagshjärnan.)
--
-- Kräver migrationerna 0001–0005. Tömmer affärstabellerna först och kan köras om:
--   Supabase SQL Editor: klistra in och kör, eller  npm run db:seed
-- =============================================================================

begin;

truncate
  public.webhook_events,
  public.sms_messages,
  public.partner_checkins,
  public.calls,
  public.meetings,
  public.tasks,
  public.replies,
  public.emails,
  public.campaigns,
  public.contacts,
  public.companies,
  public.partners
restart identity cascade;

-- Mejl-/SMS-mallarna (kind 'template', från migrationerna) behålls.
delete from public.context_entries where kind::text <> 'template';

create function pg_temp.co(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a001-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.ct(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a002-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.pa(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a004-' || lpad(n::text, 12, '0'))::uuid $$;
-- Tidpunkt i dag/relativ dag kl. hh:mm, Helsingfors-tid.
create function pg_temp.at(d int, t text) returns timestamptz language sql stable as
  $$ select ((now() at time zone 'Europe/Helsinki')::date + d + t::time) at time zone 'Europe/Helsinki' $$;

-- -----------------------------------------------------------------------------
-- Partner (§6): bokföring, IT, webb/reklam, affärssystem
-- -----------------------------------------------------------------------------

insert into public.partners (id, name, type, contact_name, email, phone, city, notes, checkin_interval_days, referrals_count) values
  (pg_temp.pa(1), 'Larsmo Bokföringsbyrå Ab', 'accounting', 'Marina Eklund',  'marina@larsmobokforing.test', '+358 40 200 0101', 'Larsmo',    'Har många kunder med manuella listor. Testfall pågår.', 30, 1),
  (pg_temp.pa(2), 'Österbottens IT-Service Ab', 'it',       'Fredrik Lund',   'fredrik@obit-service.test',   '+358 40 200 0201', 'Jakobstad', 'Sköter IT för ett 40-tal småbolag.', 30, 0),
  (pg_temp.pa(3), 'Kustreklam Ab',              'marketing','Daniel Byskata', 'daniel@kustreklam.test',      '+358 40 200 0301', 'Vasa',      'Webb och reklam. Vi tar automationen bakom formulären.', 45, 0),
  (pg_temp.pa(4), 'Affärsdata Österbotten',     'other',    'Ronja Lassila',  'ronja@affarsdata.test',       '+358 40 200 0401', 'Seinäjoki', 'Återförsäljare av affärssystem.', 30, 0);

insert into public.partner_checkins (partner_id, notes, checked_in_at) values
  (pg_temp.pa(1), 'Lunch i Larsmo. Tipsade om Kronoby Lack.',  now() - interval '9 days'),
  (pg_temp.pa(2), 'Kaffe. Två möjliga kunder inom transport.', now() - interval '40 days'),
  (pg_temp.pa(3), 'Teamssamtal om gemensamt erbjudande.',      now() - interval '20 days');

-- -----------------------------------------------------------------------------
-- 26 bolag, 2–15 anställda, hela Österbotten. Tillverkning och tjänster först, bygg sist.
-- -----------------------------------------------------------------------------

insert into public.companies (id, name, business_id, website, phone, industry, city, employees, status, source, partner_id, notes) values
  -- Ny (släpps in i ringkön, 15 per ringdag)
  (pg_temp.co(1),  'Bråtö Båtvarv Ab',             '3100001-1', 'https://bratobatvarv.test',       '+358 6 700 0101', 'Tillverkning',     'Larsmo',       12, 'new', 'lista', null, 'Bygger arbetsbåtar. Offerter i Excel.'),
  (pg_temp.co(2),  'Skata Elinstallation Ab',      '3100002-2', 'https://skataelinstallation.test', null,             'Elinstallation',   'Jakobstad',     8, 'new', 'lista', null, null),
  (pg_temp.co(3),  'Purmo Maskinservice Ab',       '3100003-3', 'https://purmomaskin.test',        null,              'Maskinservice',    'Pedersöre',     6, 'new', 'lista', null, 'Serviceprotokoll på papper.'),
  (pg_temp.co(4),  'Nykarleby Plåt & Ventilation', '3100004-4', 'https://nkplatvent.test',         null,              'Tillverkning',     'Nykarleby',    14, 'new', 'lista', null, null),
  (pg_temp.co(5),  'Kronoby Lack & Finish Ab',     '3100005-5', 'https://kronobylack.test',        null,              'Tillverkning',     'Kronoby',       5, 'new', 'lista', null, null),
  (pg_temp.co(6),  'Gamla Hamn Tryckeri Ab',       '3100006-6', 'https://gamlahamntryck.test',     null,              'Tryckeri',         'Jakobstad',     9, 'new', 'lista', null, null),
  (pg_temp.co(7),  'Socklot Fiskförädling Ab',     '3100007-7', 'https://socklotfisk.test',        null,              'Livsmedel',        'Nykarleby',    15, 'new', 'lista', null, null),
  (pg_temp.co(8),  'Malax Snickeri Ab',            '3100008-8', 'https://malaxsnickeri.test',      null,              'Tillverkning',     'Malax',         7, 'new', 'lista', null, null),
  (pg_temp.co(9),  'Korsholms Redovisning Ab',     '3100009-9', 'https://korsholmredovisning.test', null,             'Tjänster',         'Korsholm',      4, 'new', 'lista', null, null),
  (pg_temp.co(10), 'Närpes Växthusteknik Ab',      '3100010-0', 'https://narpesvaxthus.test',      null,              'Tjänster',         'Närpes',       11, 'new', 'lista', null, null),
  (pg_temp.co(11), 'Västerby Golv & Kakel Ab',     '3100011-1', 'https://vasterbygolv.test',       null,              'Bygg',             'Nykarleby',     6, 'new', 'lista', null, 'Bygg – ring sist.'),
  -- Hör till en partner: kontaktas inte kallt
  (pg_temp.co(12), 'Larsmo Bilservice Ab',         '3100012-2', 'https://larsmobilservice.test',   null,              'Tjänster',         'Larsmo',        5, 'new', 'partner', pg_temp.pa(1), 'Kund hos Larsmo Bokföringsbyrå.'),
  -- I sekvens, olika försök
  (pg_temp.co(13), 'Kållby Plast Ab',              '3100013-3', 'https://kallbyplast.test',        null,              'Tillverkning',     'Pedersöre',    13, 'in_sequence', 'lista', null, null),
  (pg_temp.co(14), 'Sundom Bilverkstad Ab',        '3100014-4', 'https://sundombil.test',          null,              'Tjänster',         'Vasa',          7, 'in_sequence', 'lista', null, null),
  (pg_temp.co(15), 'Jeppo Fysioterapi Ab',         '3100015-5', 'https://jeppofysio.test',         null,              'Tjänster',         'Nykarleby',     3, 'in_sequence', 'lista', null, null),
  (pg_temp.co(16), 'Kristinestads Mekaniska Ab',   '3100016-6', 'https://kristinestadmek.test',    null,              'Tillverkning',     'Kristinestad', 10, 'in_sequence', 'lista', null, null),
  -- Hos partner: tips via formulär, ring i dag
  (pg_temp.co(17), 'Oravais Trä & Hyvleri Ab',     '3100017-7', 'https://oravaistra.test',         null,              'Tillverkning',     'Vörå',          8, 'with_partner', 'partner', pg_temp.pa(1), 'Tips från Marina: tidrapporter för hand.'),
  -- Svarat, behovssamtal, lösning, offert, kund
  (pg_temp.co(18), 'Kyrkostrand Snickeri Ab',      '3100018-8', 'https://kyrkostrandsnickeri.test', null,             'Tillverkning',     'Jakobstad',    11, 'in_sequence', 'lista', null, null),
  (pg_temp.co(19), 'Vasklot Revisionsbyrå Ab',     '3100019-9', 'https://vasklotrevision.test',    null,              'Tjänster',         'Vasa',          6, 'meeting_booked', 'lista', null, null),
  (pg_temp.co(20), 'Edsevö Transport Ab',          '3100020-0', 'https://edsevotransport.test',    null,              'Transport',        'Pedersöre',    14, 'meeting_done', 'lista', null, 'Rutter planeras för hand. Lösningsmöte nästa.'),
  (pg_temp.co(21), 'Alholmens Svets & Montage Ab', '3100021-1', 'https://alholmensvets.test',      null,              'Tillverkning',     'Jakobstad',    12, 'solution_shown', 'lista', null, null),
  (pg_temp.co(22), 'Gerby Energiteknik Ab',        '3100022-2', 'https://gerbyenergi.test',        null,              'Tjänster',         'Vasa',          9, 'quote_sent', 'lista', null, 'Offert 2 900 € skickad.'),
  (pg_temp.co(23), 'Holm Lantbruksteknik Ab',      '3100023-3', 'https://holmlantbruk.test',       null,              'Tjänster',         'Larsmo',       10, 'customer', 'lista', null, 'Kund – automatiska servicelistor.'),
  -- Vilande, Nej, Kontakta ej
  (pg_temp.co(24), 'Fäboda Café & Catering',       '3100024-4', 'https://fabodacatering.test',     null,              'Restaurang',       'Jakobstad',     6, 'nurture', 'lista', null, 'Inte nu – hör av dig i vår.'),
  (pg_temp.co(25), 'Brändö Bokföring Ab',          '3100025-5', 'https://brandobokforing.test',    null,              'Tjänster',         'Vasa',          3, 'no', 'lista', null, 'Inget behov.'),
  (pg_temp.co(26), 'Vikarholmen Event Ab',         '3100026-6', 'https://vikarholmenevent.test',   null,              'Event',            'Vasa',          4, 'do_not_contact', 'lista', null, 'Bad att inte bli kontaktad.');

update public.companies set domain = public.norm_domain(website);
update public.companies set nurture_until = (now() at time zone 'Europe/Helsinki')::date + 60 where id = pg_temp.co(24);
update public.companies set last_activity_at = now() - interval '3 days' where status not in ('new');

-- -----------------------------------------------------------------------------
-- Kontakter (VD/ägare först). Några saknar e-post eller mobil – för att testa reglerna.
-- -----------------------------------------------------------------------------

insert into public.contacts (id, company_id, first_name, last_name, role, email, phone, is_primary) values
  (pg_temp.ct(1),  pg_temp.co(1),  'Mikael',   'Storbacka',  'VD',               'mikael@bratobatvarv.test',        '+358 40 100 0101', true),
  (pg_temp.ct(2),  pg_temp.co(2),  'Jonas',    'Skata',      'Ägare',            'jonas@skataelinstallation.test',  '+358 40 100 0201', true),
  (pg_temp.ct(3),  pg_temp.co(3),  'Kurt',     'Purmonen',   'Ägare',            null,                              '+358 40 100 0301', true),
  (pg_temp.ct(4),  pg_temp.co(4),  'Peter',    'Nyman',      'VD',               'peter@nkplatvent.test',           '+358 40 100 0401', true),
  (pg_temp.ct(5),  pg_temp.co(5),  'Annika',   'Lackström',  'Ägare',            'annika@kronobylack.test',         '+358 40 100 0501', true),
  (pg_temp.ct(6),  pg_temp.co(6),  'Patrik',   'Hamnström',  'VD',               'patrik@gamlahamntryck.test',      '+358 40 100 0601', true),
  (pg_temp.ct(7),  pg_temp.co(7),  'Bengt',    'Socklund',   'VD',               'bengt@socklotfisk.test',          '+358 40 100 0701', true),
  (pg_temp.ct(8),  pg_temp.co(8),  'Tom',      'Malmberg',   'Ägare',            'tom@malaxsnickeri.test',          '+358 40 100 0801', true),
  (pg_temp.ct(9),  pg_temp.co(9),  'Sara',     'Korsström',  'Ägare',            'sara@korsholmredovisning.test',   '+358 40 100 0901', true),
  (pg_temp.ct(10), pg_temp.co(10), 'Joakim',   'Närman',     'VD',               'joakim@narpesvaxthus.test',       '+358 40 100 1001', true),
  (pg_temp.ct(11), pg_temp.co(11), 'Johan',    'Västerlund', 'Ägare',            'johan@vasterbygolv.test',         '+358 40 100 1101', true),
  (pg_temp.ct(12), pg_temp.co(12), 'Leif',     'Larsmo',     'Ägare',            'leif@larsmobilservice.test',      '+358 40 100 1201', true),
  (pg_temp.ct(13), pg_temp.co(13), 'Sofia',    'Kållberg',   'VD',               'sofia@kallbyplast.test',          '+358 40 100 1301', true),
  (pg_temp.ct(14), pg_temp.co(14), 'Mats',     'Sundqvist',  'Ägare',            'mats@sundombil.test',             '+358 40 100 1401', true),
  (pg_temp.ct(15), pg_temp.co(15), 'Hanna',    'Jeppsson',   'Ägare',            'hanna@jeppofysio.test',           null,               true),
  (pg_temp.ct(16), pg_temp.co(16), 'Rolf',     'Kristman',   'VD',               'rolf@kristinestadmek.test',       '+358 40 100 1601', true),
  (pg_temp.ct(17), pg_temp.co(17), 'Nina',     'Oravainen',  'Ägare',            'nina@oravaistra.test',            '+358 40 100 1701', true),
  (pg_temp.ct(18), pg_temp.co(18), 'Henrik',   'Kyrklund',   'VD',               'henrik@kyrkostrandsnickeri.test', '+358 40 100 1801', true),
  (pg_temp.ct(19), pg_temp.co(19), 'Annika',   'Vasklot',    'Delägare',         'annika@vasklotrevision.test',     '+358 40 100 1901', true),
  (pg_temp.ct(20), pg_temp.co(20), 'Tomas',    'Edsevik',    'VD',               'tomas@edsevotransport.test',      '+358 40 100 2001', true),
  (pg_temp.ct(21), pg_temp.co(21), 'Ville',    'Alholm',     'VD',               'ville@alholmensvets.test',        '+358 40 100 2101', true),
  (pg_temp.ct(22), pg_temp.co(22), 'Kristian', 'Gerbyholm',  'VD',               'kristian@gerbyenergi.test',       '+358 40 100 2201', true),
  (pg_temp.ct(23), pg_temp.co(23), 'Anders',   'Holm',       'VD',               'anders@holmlantbruk.test',        '+358 40 100 2301', true),
  (pg_temp.ct(24), pg_temp.co(24), 'Emma',     'Fäboda',     'Ägare',            'emma@fabodacatering.test',        '+358 40 100 2401', true),
  (pg_temp.ct(25), pg_temp.co(25), 'Gunilla',  'Brandt',     'Ägare',            'gunilla@brandobokforing.test',    '+358 40 100 2501', true),
  (pg_temp.ct(26), pg_temp.co(26), 'Oskar',    'Vikström',   'Ägare',            'oskar@vikarholmenevent.test',     '+358 40 100 2601', true),
  (pg_temp.ct(27), pg_temp.co(13), 'Erik',     'Lassfolk',   'Produktionschef',  'erik.l@kallbyplast.test',         '+358 40 100 1302', false);

update public.companies c set sequence_contact_id = (select k.id from public.contacts k where k.company_id = c.id and k.is_primary limit 1);

-- -----------------------------------------------------------------------------
-- Samtalshistorik och ringuppgifter för bolag i sekvens
-- -----------------------------------------------------------------------------

-- Kållby Plast: försök 1 obesvarat i förrgår → försök 2 i dag em
insert into public.calls (company_id, contact_id, outcome, notes, called_at) values
  (pg_temp.co(13), pg_temp.ct(13), 'no_answer', null, pg_temp.at(-2, '09:20'));
update public.companies set call_attempt = 1, released_at = now() - interval '2 days', last_call_at = pg_temp.at(-2, '09:20') where id = pg_temp.co(13);
insert into public.tasks (type, title, priority, company_id, contact_id, attempt, due_at) values
  ('call', 'Försök 2: Kållby Plast Ab', 2, pg_temp.co(13), pg_temp.ct(13), 2, pg_temp.at(0, '13:00'));
insert into public.sms_messages (company_id, contact_id, to_phone, body, template, status, due_at, sent_at) values
  (pg_temp.co(13), pg_temp.ct(13), '+358 40 100 1301',
   'Hej Sofia! Erik från Optely här, jag försökte ringa dig i går. Vi hjälper småföretag med det som görs för hand vid sidan om jobbet. Jag ringer igen om ett par dagar – eller svara här när det passar. /Erik',
   'sms-ej-svar', 'sent', pg_temp.at(-1, '08:30'), pg_temp.at(-1, '08:41'));

-- Sundom Bilverkstad: två obesvarade → sista försöket i dag fm. SMS efter försök 1 väntar fortfarande.
insert into public.calls (company_id, contact_id, outcome, notes, called_at) values
  (pg_temp.co(14), pg_temp.ct(14), 'no_answer', null, pg_temp.at(-5, '13:10')),
  (pg_temp.co(14), pg_temp.ct(14), 'voicemail', 'Lämnade röstmeddelande.', pg_temp.at(-3, '09:05'));
update public.companies set call_attempt = 2, released_at = now() - interval '5 days', last_call_at = pg_temp.at(-3, '09:05') where id = pg_temp.co(14);
insert into public.tasks (type, title, priority, company_id, contact_id, attempt, due_at) values
  ('call', 'Försök 3: Sundom Bilverkstad Ab', 2, pg_temp.co(14), pg_temp.ct(14), 3, pg_temp.at(0, '09:00'));
insert into public.sms_messages (company_id, contact_id, to_phone, body, template, due_at) values
  (pg_temp.co(14), pg_temp.ct(14), '+358 40 100 1401',
   'Hej Mats! Erik från Optely här, jag försökte ringa dig i går. Vi hjälper småföretag med det som görs för hand vid sidan om jobbet. Jag ringer igen om ett par dagar – eller svara här när det passar. /Erik',
   'sms-ej-svar', pg_temp.at(0, '08:30'));

-- Jeppo Fysioterapi (ingen mobil): bad om samtal senare i dag kl. 15
insert into public.calls (company_id, contact_id, outcome, notes, called_at) values
  (pg_temp.co(15), pg_temp.ct(15), 'callback', 'Har patient – ring 15.00.', pg_temp.at(0, '08:50'));
update public.companies set released_at = now() - interval '1 day', last_call_at = pg_temp.at(0, '08:50'), phone = '+358 6 724 1500' where id = pg_temp.co(15);
insert into public.tasks (type, title, description, priority, company_id, contact_id, attempt, due_at) values
  ('call', 'Ring senare: Jeppo Fysioterapi Ab', 'Har patient – ring 15.00.', 1, pg_temp.co(15), pg_temp.ct(15), 1, pg_temp.at(0, '15:00'));

-- Kristinestads Mekaniska: försök 2 i morgon (syns inte i dagens kö)
insert into public.calls (company_id, contact_id, outcome, called_at) values
  (pg_temp.co(16), pg_temp.ct(16), 'no_answer', pg_temp.at(-1, '13:30'));
update public.companies set call_attempt = 1, released_at = now() - interval '1 day' where id = pg_temp.co(16);
insert into public.tasks (type, title, priority, company_id, contact_id, attempt, due_at) values
  ('call', 'Försök 2: Kristinestads Mekaniska Ab', 2, pg_temp.co(16), pg_temp.ct(16), 2, pg_temp.at(1, '09:00'));

-- Oravais Trä (Hos partner): tips via formulär → ring i dag och nämn partnern
insert into public.tasks (type, title, description, priority, company_id, contact_id, due_at) values
  ('call', 'Partnertips: ring i dag – Oravais Trä & Hyvleri Ab', 'Tips från Marina Eklund (Larsmo Bokföringsbyrå): tidrapporter görs för hand. Nämn Marina.', 1, pg_temp.co(17), pg_temp.ct(17), now());

-- Fäboda Café (Vilande): "inte nu" → återkomst om 60 dagar
insert into public.calls (company_id, contact_id, outcome, notes, called_at) values
  (pg_temp.co(24), pg_temp.ct(24), 'not_now', 'Högsäsong – hör av dig i vår.', now() - interval '4 days');
insert into public.tasks (type, title, priority, company_id, contact_id, attempt, due_at) values
  ('call', 'Återkomst: Fäboda Café & Catering', 2, pg_temp.co(24), pg_temp.ct(24), 1, pg_temp.at(60, '09:00'));

-- Brändö (Nej) och Vikarholmen (Kontakta ej)
insert into public.calls (company_id, contact_id, outcome, notes, called_at) values
  (pg_temp.co(25), pg_temp.ct(25), 'no_need', 'Har egna lösningar.', now() - interval '20 days'),
  (pg_temp.co(26), pg_temp.ct(26), 'do_not_call', 'Bad att inte bli kontaktad.', now() - interval '12 days');
update public.contacts set do_not_contact = true where id = pg_temp.ct(26);

-- -----------------------------------------------------------------------------
-- Kyrkostrand: svarade positivt på mejl → triggern stoppar allt och lägger "Svar: boka behovssamtal"
-- -----------------------------------------------------------------------------

insert into public.emails (company_id, contact_id, subject, body, ai_opening_line, status, sent_at, queued_at, reviewed_at) values
  (pg_temp.co(18), pg_temp.ct(18), 'Det som görs för hand',
   E'Hej Henrik,\n\nSnyggt projekt ni gjorde för kafét i Jakobstads centrum. Vi hjälper snickerier med det som görs för hand vid sidan om jobbet – materiallistor, offerter, tidrapporter.\n\nVärt 20 minuter?\n\nHälsningar,\nErik',
   'Snyggt projekt ni gjorde för kafét i Jakobstads centrum.', 'sent', now() - interval '3 days', now() - interval '3 days', now() - interval '4 days');
insert into public.replies (email_id, company_id, contact_id, from_address, subject, body, classification, ai_summary, received_at)
select id, pg_temp.co(18), pg_temp.ct(18), 'henrik@kyrkostrandsnickeri.test', 'Sv: Det som görs för hand',
       E'Hej,\n\nJa, materiallistorna tar alldeles för mycket tid. Ring mig gärna.\n\nHenrik',
       'positive', 'Materiallistorna tar för mycket tid. Vill bli uppringd.', now() - interval '2 hours'
  from public.emails where company_id = pg_temp.co(18);

-- -----------------------------------------------------------------------------
-- Behovssamtal bokat (i morgon) – bekräftelse-SMS och kalenderhändelse väntar
-- -----------------------------------------------------------------------------

insert into public.calls (company_id, contact_id, outcome, notes, duration_seconds, called_at) values
  (pg_temp.co(19), pg_temp.ct(19), 'meeting_booked', 'Bokslutslistor görs för hand.', 420, now() - interval '1 hour');
insert into public.meetings (company_id, contact_id, title, starts_at, ends_at, location, status) values
  (pg_temp.co(19), pg_temp.ct(19), 'Behovssamtal: Vasklot Revisionsbyrå Ab', pg_temp.at(1, '10:00'), pg_temp.at(1, '10:20'), 'telefon', 'scheduled');
select public.queue_template_sms(pg_temp.co(19), pg_temp.ct(19), 'sms-bokat', now(),
  jsonb_build_object('tid', 'i morgon kl. 10:00', 'plats', 'telefon'));

-- Senare steg i pipelinen (§7)
insert into public.meetings (company_id, contact_id, title, starts_at, ends_at, location, status, outcome, calendar_added_at) values
  (pg_temp.co(20), pg_temp.ct(20), 'Behovssamtal: Edsevö Transport Ab', now() - interval '6 days', now() - interval '6 days' + interval '20 minutes', 'telefon', 'held', 'Större problem → lösningsmöte', now() - interval '8 days'),
  (pg_temp.co(21), pg_temp.ct(21), 'Lösningsmöte: Alholmens Svets & Montage Ab', now() - interval '2 days', now() - interval '2 days' + interval '30 minutes', 'hos kunden', 'held', 'Visade lösning för orderlistor', now() - interval '5 days'),
  (pg_temp.co(22), pg_temp.ct(22), 'Lösningsmöte: Gerby Energiteknik Ab', now() - interval '9 days', now() - interval '9 days' + interval '30 minutes', 'Teams', 'held', 'Offert samma dag', now() - interval '12 days');
-- Mötestriggern sätter status – återställ till rätt pipelinesteg.
update public.companies set status = 'meeting_done'   where id = pg_temp.co(20);
update public.companies set status = 'solution_shown' where id = pg_temp.co(21);
update public.companies set status = 'quote_sent'     where id = pg_temp.co(22);

-- -----------------------------------------------------------------------------
-- Företagshjärnan
-- -----------------------------------------------------------------------------

insert into public.context_entries (kind, slug, title, content, sort_order) values
  ('profile', 'optely-profil', 'Optelys profil',
$md$# Optely

Optely i Jakobstad hjälper svenskspråkiga småföretag i Österbotten med **det som görs för hand vid sidan om jobbet** – listor, rapporter, offerter och uppföljning.

- Grundare: Erik
- Ton: lokal, rak, jordnära. Vi säljer tid tillbaka, inte "AI".
$md$, 10),
  ('offer', 'erbjudande', 'Erbjudande',
$md$# Erbjudande

**Huvuderbjudande: inte valt.** Starkaste kandidat: **automatiska listor och rapporter**.

- Behovssamtal 20 min – kostnadsfritt
- Lösningsmöte 30 min – lösning, pris, startdatum
- Mål: återkommande intäkt (drift och små tillägg varje månad)
$md$, 20),
  ('icp', 'icp', 'Målgrupp',
$md$# Målgrupp

- Svenskspråkiga småföretag med **2–15 anställda** i hela Österbotten
- **Ägaren sköter själv administrationen**
- Tillverkning och tjänsteföretag först, **bygg sist**
- Signaler: listor och rapporter görs för hand, offerter i Excel, ägaren gör pappersjobbet på kvällarna
$md$, 30),
  ('case', 'case-hagnas-tyre-center', 'Case: Hagnäs Tyre Center',
$md$# Hagnäs Tyre Center

Däcklistan skapas nu **automatiskt** i stället för för hand.

Använd som exempel: "vi hjälper med det som görs för hand vid sidan om jobbet".
$md$, 40),
  ('script', 'manus-kallt-samtal', 'Manus: kallt samtal',
$md$# Kallt samtal

1. **Öppning:** "Hej {förnamn}, Erik från Optely i Jakobstad. Har du två minuter?"
2. **Budskap:** "Vi hjälper småföretag med det som görs för hand vid sidan om jobbet – som hos Hagnäs Tyre Center, där däcklistan nu skapas automatiskt."
3. **Fråga:** "Finns det något hos er som görs för hand, som listor, rapporter eller offerter?"
4. **Boka:** "Ska vi ta 20 minuter och titta på det? Jag har {dag} förmiddag eller eftermiddag."
$md$, 50),
  ('script', 'manus-behovssamtal', 'Manus: behovssamtal (20 min)',
$md$# Behovssamtal

- Vad görs för hand i dag?
- Hur hanteras offerter?
- Vad kostar det – i tid och pengar?
- Vad har ni försökt?

**Enkelt problem** → lösning och ungefärligt pris direkt → offert.
**Större problem** → boka lösningsmöte (30 min).
**Inget problem** → be om ett namn → status Nej.
$md$, 55),
  ('objection', 'invandning-har-inte-tid', 'Invändning: "Har inte tid"',
$md$**"Har inte tid."**

"Det är precis därför jag ringer – det handlar om att få tid tillbaka. 20 minuter nästa vecka, och säger du stopp så är det stopp. Passar tisdag eller torsdag?"
$md$, 60),
  ('objection', 'invandning-skicka-info', 'Invändning: "Skicka info på mejl"',
$md$**"Skicka info på mejl."**

"Absolut. Vad är det som görs mest för hand hos er? … Bra, då skickar jag ett kort exempel i dag och ringer dig om en vecka." → välj utfallet **Skicka info**.
$md$, 70),
  ('objection', 'invandning-har-redan-nagon', 'Invändning: "Vi har redan någon"',
$md$**"Vi har redan någon som sköter det."**

"Bra – vi jobbar ofta tillsammans med er IT- eller bokföringspartner. Vad gör de för er i dag?"
$md$, 80),
  ('objection', 'invandning-vad-kostar-det', 'Invändning: "Vad kostar det?"',
$md$**"Vad kostar det?"**

"Det beror på vad som görs för hand. Ofta handlar det om en fast startkostnad och en liten månadsavgift. Under behovssamtalet räknar vi på om det alls lönar sig för er."
$md$, 90),
  ('tone', 'skrivregler', 'Min stil',
$md$# Min stil

- Finlandssvenska, du-tilltal, korta meningar.
- Specifikt för bolaget – aldrig generiskt beröm.
- Inga ord som "revolutionerande", "AI-driven", "synergier".
- Max 80 ord per mejl. En fråga i slutet. Signatur: Erik, Optely.
$md$, 100);

-- -----------------------------------------------------------------------------
-- Dagens kvot: släpp in 8 nya bolag i ringkön så att Ringpasset har något att visa.
-- (Partnerägda bolag och bygg-bolaget ligger sist / kontaktas inte kallt.)
-- -----------------------------------------------------------------------------

select public.release_new_calls(8);

commit;
