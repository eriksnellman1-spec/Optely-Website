-- =============================================================================
-- Testdata för Optely O.R. – PÅHITTADE bolag och personer.
-- Ingen riktig persondata. Domänerna använder den reserverade toppdomänen .test.
--
-- Körs automatiskt av `supabase db reset` (lokalt) eller manuellt:
--   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
-- Skriptet tömmer affärstabellerna först så att det kan köras om.
-- =============================================================================

begin;

truncate
  public.webhook_events,
  public.partner_checkins,
  public.calls,
  public.meetings,
  public.tasks,
  public.replies,
  public.emails,
  public.campaigns,
  public.contacts,
  public.companies,
  public.partners,
  public.context_entries
restart identity cascade;

-- Små hjälpare för läsbara, stabila id:n (finns bara under den här sessionen).
create function pg_temp.co(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a001-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.ct(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a002-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.em(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a003-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.pa(n int) returns uuid language sql immutable as
  $$ select ('00000000-0000-4000-a004-' || lpad(n::text, 12, '0'))::uuid $$;

-- -----------------------------------------------------------------------------
-- 25 bolag i Jakobstad, Larsmo, Pedersöre, Nykarleby och Vasa
-- -----------------------------------------------------------------------------

insert into public.companies (id, name, business_id, website, industry, city, employees, revenue_eur, status, source, notes) values
  (pg_temp.co(1),  'Bråtö Båtvarv Ab',                '3100001-1', 'https://bratobatvarv.test',      'Båtbyggnad',           'Larsmo',    34, 4800000, 'contacted',      'import',  'Bygger arbetsbåtar i aluminium. Offerter görs i Excel.'),
  (pg_temp.co(2),  'Skata Elinstallation Ab',         '3100002-2', 'https://skataelinstallation.test','Elinstallation',      'Jakobstad', 12, 1300000, 'contacted',      'import',  null),
  (pg_temp.co(3),  'Lillby Trädgård & Plantskola',    '3100003-3', 'https://lillbytradgard.test',    'Trädgård',             'Pedersöre',  8,  650000, 'new',            'import',  null),
  (pg_temp.co(4),  'Nykarleby Plåt & Ventilation Ab', '3100004-4', 'https://nkplatvent.test',        'Ventilation & plåt',   'Nykarleby', 19, 2100000, 'contacted',      'import',  null),
  (pg_temp.co(5),  'Vasklot Revisionsbyrå Ab',        '3100005-5', 'https://vasklotrevision.test',   'Redovisning',          'Vasa',      15, 1400000, 'contacted',      'partner', 'Tips från Larsmo Bokföringsbyrå.'),
  (pg_temp.co(6),  'Kyrkostrand Snickeri Ab',         '3100006-6', 'https://kyrkostrandsnickeri.test','Snickeri',            'Jakobstad', 22, 2600000, 'contacted',      'import',  'Specialinredning till butiker och kontor.'),
  (pg_temp.co(7),  'Purmo Maskinservice Ab',          '3100007-7', 'https://purmomaskin.test',       'Maskinservice',        'Pedersöre', 11,  980000, 'contacted',      'import',  null),
  (pg_temp.co(8),  'Fäboda Café & Catering',          '3100008-8', 'https://fabodacatering.test',    'Restaurang & catering','Jakobstad',  9,  540000, 'new',            'import',  null),
  (pg_temp.co(9),  'Edsevö Transport Ab',             '3100009-9', 'https://edsevotransport.test',   'Transport & logistik', 'Pedersöre', 41, 6200000, 'researching',    'import',  'Manuell ruttplanering, många telefonsamtal.'),
  (pg_temp.co(10), 'Juthbacka Fastighetsservice Ab',  '3100010-0', 'https://juthbackafast.test',     'Fastighetsservice',    'Nykarleby', 17, 1500000, 'contacted',      'import',  null),
  (pg_temp.co(11), 'Brändö Bokföring Ab',             '3100011-1', 'https://brandobokforing.test',   'Redovisning',          'Vasa',       6,  420000, 'lost',           'import',  'Har redan byggt egna automationer.'),
  (pg_temp.co(12), 'Gamla Hamn Tryckeri Ab',          '3100012-2', 'https://gamlahamntryck.test',    'Tryckeri',             'Jakobstad', 14, 1250000, 'contacted',      'import',  null),
  (pg_temp.co(13), 'Holm Lantbruksteknik Ab',         '3100013-3', 'https://holmlantbruk.test',      'Lantbruksteknik',      'Larsmo',    25, 3900000, 'new',            'import',  null),
  (pg_temp.co(14), 'Sundom Bilverkstad Ab',           '3100014-4', 'https://sundombil.test',         'Bilverkstad',          'Vasa',      10,  890000, 'contacted',      'import',  'Bokar service per telefon, ingen onlinebokning.'),
  (pg_temp.co(15), 'Västerby Golv & Kakel Ab',        '3100015-5', 'https://vasterbygolv.test',      'Bygg',                 'Nykarleby', 13, 1100000, 'new',            'import',  null),
  (pg_temp.co(16), 'Bennäs Logistikpartner Ab',       '3100016-6', 'https://bennaslogistik.test',    'Logistik',             'Pedersöre', 52, 7400000, 'researching',    'import',  null),
  (pg_temp.co(17), 'Strandgatans Optik Ab',           '3100017-7', 'https://strandgatansoptik.test', 'Detaljhandel',         'Jakobstad',  7,  610000, 'new',            'import',  null),
  (pg_temp.co(18), 'Öja Stugor & Uthyrning Ab',       '3100018-8', 'https://ojastugor.test',         'Turism',               'Larsmo',     5,  380000, 'contacted',      'import',  null),
  (pg_temp.co(19), 'Gerby Energiteknik Ab',           '3100019-9', 'https://gerbyenergi.test',       'Energiteknik',         'Vasa',      28, 3300000, 'customer',       'partner', 'Kund sedan augusti – automatiserad offertkedja.'),
  (pg_temp.co(20), 'Socklot Fiskförädling Ab',        '3100020-0', 'https://socklotfisk.test',       'Livsmedel',            'Nykarleby', 31, 4100000, 'new',            'import',  null),
  (pg_temp.co(21), 'Kållby Plast Ab',                 '3100021-1', 'https://kallbyplast.test',       'Tillverkning',         'Pedersöre', 45, 5800000, 'contacted',      'import',  null),
  (pg_temp.co(22), 'Jeppo Fysioterapi Ab',            '3100022-2', 'https://jeppofysio.test',        'Hälsa',                'Nykarleby',  8,  520000, 'new',            'import',  null),
  (pg_temp.co(23), 'Alholmens Svets & Montage Ab',    '3100023-3', 'https://alholmensvets.test',     'Verkstad',             'Jakobstad', 36, 4500000, 'warm',           'import',  null),
  (pg_temp.co(24), 'Vikarholmen Event Ab',            '3100024-4', 'https://vikarholmenevent.test',  'Event',                'Vasa',       6,  450000, 'contacted',      'import',  null),
  (pg_temp.co(25), 'Risö Hantverk & Inredning Ab',    '3100025-5', 'https://risohantverk.test',      'Inredning',            'Larsmo',     4,  290000, 'new',            'import',  null);

-- Utgångsläge för "senaste aktivitet" på bolag som ännu inte har mejl/samtal i seeden.
update public.companies set last_activity_at = now() - interval '3 days'  where id in (pg_temp.co(9), pg_temp.co(16));
update public.companies set last_activity_at = now() - interval '45 days' where id = pg_temp.co(11);
update public.companies set last_activity_at = now() - interval '60 days' where id = pg_temp.co(19);

-- -----------------------------------------------------------------------------
-- Kontakter (1–2 per bolag)
-- -----------------------------------------------------------------------------

insert into public.contacts (id, company_id, first_name, last_name, role, email, phone, is_primary) values
  (pg_temp.ct(1),  pg_temp.co(1),  'Mikael',   'Storbacka',  'VD',                    'mikael@bratobatvarv.test',        '+358 40 100 0101', true),
  (pg_temp.ct(2),  pg_temp.co(1),  'Sanna',    'Holmqvist',  'Ekonomiansvarig',       'sanna@bratobatvarv.test',         '+358 40 100 0102', false),
  (pg_temp.ct(3),  pg_temp.co(2),  'Jonas',    'Skata',      'Ägare',                 'jonas@skataelinstallation.test',  '+358 40 100 0201', true),
  (pg_temp.ct(4),  pg_temp.co(3),  'Ulla',     'Lillbacka',  'Ägare',                 'ulla@lillbytradgard.test',        '+358 40 100 0301', true),
  (pg_temp.ct(5),  pg_temp.co(4),  'Peter',    'Nyman',      'VD',                    'peter@nkplatvent.test',           '+358 40 100 0401', true),
  (pg_temp.ct(6),  pg_temp.co(4),  'Camilla',  'Sandvik',    'Arbetsledare',          'camilla@nkplatvent.test',         '+358 40 100 0402', false),
  (pg_temp.ct(7),  pg_temp.co(5),  'Annika',   'Vasklot',    'Delägare, CGR',         'annika@vasklotrevision.test',     '+358 40 100 0501', true),
  (pg_temp.ct(8),  pg_temp.co(6),  'Henrik',   'Kyrklund',   'VD',                    'henrik@kyrkostrandsnickeri.test', '+358 40 100 0601', true),
  (pg_temp.ct(9),  pg_temp.co(6),  'Lotta',    'Ström',      'Projektledare',         'lotta@kyrkostrandsnickeri.test',  '+358 40 100 0602', false),
  (pg_temp.ct(10), pg_temp.co(7),  'Kurt',     'Purmonen',   'Ägare',                 'kurt@purmomaskin.test',           '+358 40 100 0701', true),
  (pg_temp.ct(11), pg_temp.co(8),  'Emma',     'Fäboda',     'Ägare',                 'emma@fabodacatering.test',        '+358 40 100 0801', true),
  (pg_temp.ct(12), pg_temp.co(9),  'Tomas',    'Edsevik',    'Trafikchef',            'tomas@edsevotransport.test',      '+358 40 100 0901', true),
  (pg_temp.ct(13), pg_temp.co(9),  'Maria',    'Granlund',   'VD',                    'maria@edsevotransport.test',      '+358 40 100 0902', false),
  (pg_temp.ct(14), pg_temp.co(10), 'Stefan',   'Juthman',    'VD',                    'stefan@juthbackafast.test',       '+358 40 100 1001', true),
  (pg_temp.ct(15), pg_temp.co(11), 'Gunilla',  'Brandt',     'Ägare',                 'gunilla@brandobokforing.test',    '+358 40 100 1101', true),
  (pg_temp.ct(16), pg_temp.co(12), 'Patrik',   'Hamnström',  'VD',                    'patrik@gamlahamntryck.test',      '+358 40 100 1201', true),
  (pg_temp.ct(17), pg_temp.co(13), 'Anders',   'Holm',       'VD',                    'anders@holmlantbruk.test',        '+358 40 100 1301', true),
  (pg_temp.ct(18), pg_temp.co(13), 'Jenny',    'Holm',       'Försäljning',           'jenny@holmlantbruk.test',         '+358 40 100 1302', false),
  (pg_temp.ct(19), pg_temp.co(14), 'Mats',     'Sundqvist',  'Verkstadschef',         'mats@sundombil.test',             '+358 40 100 1401', true),
  (pg_temp.ct(20), pg_temp.co(15), 'Johan',    'Västerlund', 'Ägare',                 'johan@vasterbygolv.test',         '+358 40 100 1501', true),
  (pg_temp.ct(21), pg_temp.co(16), 'Carina',   'Bennäs',     'Logistikchef',          'carina@bennaslogistik.test',      '+358 40 100 1601', true),
  (pg_temp.ct(22), pg_temp.co(16), 'Robert',   'Åkerlund',   'VD',                    'robert@bennaslogistik.test',      '+358 40 100 1602', false),
  (pg_temp.ct(23), pg_temp.co(17), 'Linda',    'Strand',     'Ägare, optiker',        'linda@strandgatansoptik.test',    '+358 40 100 1701', true),
  (pg_temp.ct(24), pg_temp.co(18), 'Nils',     'Öjman',      'Ägare',                 'nils@ojastugor.test',             '+358 40 100 1801', true),
  (pg_temp.ct(25), pg_temp.co(19), 'Kristian', 'Gerbyholm',  'VD',                    'kristian@gerbyenergi.test',       '+358 40 100 1901', true),
  (pg_temp.ct(26), pg_temp.co(19), 'Elin',     'Back',       'Offertansvarig',        'elin@gerbyenergi.test',           '+358 40 100 1902', false),
  (pg_temp.ct(27), pg_temp.co(20), 'Bengt',    'Socklund',   'VD',                    'bengt@socklotfisk.test',          '+358 40 100 2001', true),
  (pg_temp.ct(28), pg_temp.co(21), 'Sofia',    'Kållberg',   'Produktionschef',       'sofia@kallbyplast.test',          '+358 40 100 2101', true),
  (pg_temp.ct(29), pg_temp.co(21), 'Erik',     'Lassfolk',   'VD',                    'erik.l@kallbyplast.test',         '+358 40 100 2102', false),
  (pg_temp.ct(30), pg_temp.co(22), 'Hanna',    'Jeppsson',   'Fysioterapeut, ägare',  'hanna@jeppofysio.test',           '+358 40 100 2201', true),
  (pg_temp.ct(31), pg_temp.co(23), 'Ville',    'Alholm',     'VD',                    'ville@alholmensvets.test',        '+358 40 100 2301', true),
  (pg_temp.ct(32), pg_temp.co(23), 'Tina',     'Forsman',    'Inköp',                 'tina@alholmensvets.test',         '+358 40 100 2302', false),
  (pg_temp.ct(33), pg_temp.co(24), 'Oskar',    'Vikström',   'Ägare',                 'oskar@vikarholmenevent.test',     '+358 40 100 2401', true),
  (pg_temp.ct(34), pg_temp.co(25), 'Ida',      'Risberg',    'Ägare',                 'ida@risohantverk.test',           '+358 40 100 2501', true);

-- -----------------------------------------------------------------------------
-- Kampanj
-- -----------------------------------------------------------------------------

insert into public.campaigns (id, name, description, status, provider, daily_limit, starts_on) values
  ('00000000-0000-4000-a005-000000000001',
   'Höst 2026 – Industri & service i Österbotten',
   'Bolag med 5–60 anställda där offerter, bokningar eller rapporter görs manuellt.',
   'active', 'manual', 30, (now() - interval '21 days')::date);

-- -----------------------------------------------------------------------------
-- Mejl i olika status
-- -----------------------------------------------------------------------------

insert into public.emails (id, campaign_id, company_id, contact_id, subject, body, ai_opening_line, ai_model, status, reviewed_at, queued_at, sent_at, error) values
  -- Skickade som sedan fått positivt svar
  (pg_temp.em(1), '00000000-0000-4000-a005-000000000001', pg_temp.co(1), pg_temp.ct(1),
   'Offerterna på Bråtö',
   E'Hej Mikael,\n\nSåg att ni nyligen levererat två arbetsbåtar till Norge – grattis! Många varv vi pratar med lägger timmar på varje offert i Excel.\n\nVi på Optely bygger automationer som tar fram offertunderlag på minuter. Vore det värt 20 minuter att se hur det kunde se ut hos er?\n\nHälsningar,\nErik',
   'Såg att ni nyligen levererat två arbetsbåtar till Norge – grattis!', 'claude', 'sent',
   now() - interval '15 days', now() - interval '14 days', now() - interval '14 days', null),
  (pg_temp.em(2), '00000000-0000-4000-a005-000000000001', pg_temp.co(6), pg_temp.ct(8),
   'Butiksinredning och ritningar',
   E'Hej Henrik,\n\nSnyggt projekt ni gjorde för kafét i Jakobstads centrum. Jag gissar att varje specialbeställning innebär en del manuellt pussel mellan ritning, materiallista och offert.\n\nVi hjälper snickerier att koppla ihop de stegen. Har du tid för ett kort samtal nästa vecka?\n\nHälsningar,\nErik',
   'Snyggt projekt ni gjorde för kafét i Jakobstads centrum.', 'claude', 'sent',
   now() - interval '12 days', now() - interval '11 days', now() - interval '11 days', null),
  (pg_temp.em(3), '00000000-0000-4000-a005-000000000001', pg_temp.co(14), pg_temp.ct(19),
   'Servicebokningar i Sundom',
   E'Hej Mats,\n\nJag såg att man fortfarande ringer för att boka service hos er – det är personligt, men tar säkert mycket telefontid i högsäsong.\n\nVi har byggt bokningsflöden för verkstäder som sparar flera timmar i veckan. Vill du höra hur?\n\nHälsningar,\nErik',
   'Jag såg att man fortfarande ringer för att boka service hos er.', 'claude', 'sent',
   now() - interval '9 days', now() - interval '8 days', now() - interval '8 days', null),
  -- Skickat, neutralt svar
  (pg_temp.em(4), '00000000-0000-4000-a005-000000000001', pg_temp.co(7), pg_temp.ct(10),
   'Serviceprotokoll på papper?',
   E'Hej Kurt,\n\nMånga maskinverkstäder vi pratar med fyller fortfarande i serviceprotokoll för hand. Stämmer det för er också?\n\nHälsningar,\nErik',
   'Många maskinverkstäder vi pratar med fyller fortfarande i serviceprotokoll för hand.', 'claude', 'sent',
   now() - interval '10 days', now() - interval '9 days', now() - interval '9 days', null),
  -- Skickat, sedan avregistrering
  (pg_temp.em(5), '00000000-0000-4000-a005-000000000001', pg_temp.co(24), pg_temp.ct(33),
   'Anmälningar till era event',
   E'Hej Oskar,\n\nSåg att ni ordnar sommarevent på Vikarholmen. Hur hanterar ni anmälningar och påminnelser i dag?\n\nHälsningar,\nErik',
   'Såg att ni ordnar sommarevent på Vikarholmen.', 'claude', 'sent',
   now() - interval '7 days', now() - interval '6 days', now() - interval '6 days', null),
  -- Skickade utan svar
  (pg_temp.em(6), '00000000-0000-4000-a005-000000000001', pg_temp.co(2), pg_temp.ct(3),
   'Arbetsorder och fakturering',
   E'Hej Jonas,\n\nFör elfirmor i er storlek brukar tiden mellan avslutat jobb och skickad faktura vara den stora tidstjuven. Hur ser det ut hos er?\n\nHälsningar,\nErik',
   'För elfirmor i er storlek brukar tiden mellan avslutat jobb och faktura vara den stora tidstjuven.', 'claude', 'sent',
   now() - interval '6 days', now() - interval '5 days', now() - interval '5 days', null),
  (pg_temp.em(7), '00000000-0000-4000-a005-000000000001', pg_temp.co(12), pg_temp.ct(16),
   'Tryckorder från webben',
   E'Hej Patrik,\n\nKul att se att Gamla Hamn fortfarande trycker lokalt. Hur kommer beställningarna in till er i dag?\n\nHälsningar,\nErik',
   'Kul att se att Gamla Hamn fortfarande trycker lokalt.', 'claude', 'sent',
   now() - interval '5 days', now() - interval '4 days', now() - interval '4 days', null),
  -- Studsat
  (pg_temp.em(8), '00000000-0000-4000-a005-000000000001', pg_temp.co(18), pg_temp.ct(24),
   'Bokningar av stugor',
   E'Hej Nils,\n\nHur sköter ni bokningar och nyckelöverlämning för stugorna i dag?\n\nHälsningar,\nErik',
   'Hur sköter ni bokningar och nyckelöverlämning för stugorna i dag?', 'claude', 'bounced',
   now() - interval '5 days', now() - interval '4 days', now() - interval '4 days', 'Mailbox does not exist'),
  -- Köat hos leverantören
  (pg_temp.em(9), '00000000-0000-4000-a005-000000000001', pg_temp.co(4), pg_temp.ct(5),
   'Servicerapporter efter ventilationsjobb',
   E'Hej Peter,\n\nSåg att ni utökat med OVK-besiktningar. Rapporterna efteråt brukar vara ett tidskrävande steg – hur gör ni dem?\n\nHälsningar,\nErik',
   'Såg att ni utökat med OVK-besiktningar.', 'claude', 'queued',
   now() - interval '1 day', now() - interval '2 hours', null, null),
  -- Godkänt, väntar på att köas
  (pg_temp.em(10), '00000000-0000-4000-a005-000000000001', pg_temp.co(10), pg_temp.ct(14),
   'Felanmälningar från hyresgäster',
   E'Hej Stefan,\n\nHur kommer felanmälningarna in till er i dag – telefon, mejl eller både och?\n\nHälsningar,\nErik',
   'Hur kommer felanmälningarna in till er i dag?', 'claude', 'approved',
   now() - interval '3 hours', null, null, null),
  -- Väntar på granskning i AI Gatekeeper
  (pg_temp.em(11), '00000000-0000-4000-a005-000000000001', pg_temp.co(13), pg_temp.ct(17),
   'Reservdelsförfrågningar',
   E'Hej Anders,\n\n{{opening_line}}\n\nVi hjälper teknikbolag att svara snabbare på reservdelsförfrågningar utan att anställa fler. Värt ett kort samtal?\n\nHälsningar,\nErik',
   'Er nya webbshop för reservdelar ser riktigt genomarbetad ut – kommer förfrågningarna fortfarande också per telefon?', 'claude', 'pending_review',
   null, null, null, null),
  (pg_temp.em(12), '00000000-0000-4000-a005-000000000001', pg_temp.co(20), pg_temp.ct(27),
   'Spårbarhet i produktionen',
   E'Hej Bengt,\n\n{{opening_line}}\n\nVi bygger enkla flöden som samlar batchdata automatiskt, så att revisionen tar timmar i stället för dagar. Låter det intressant?\n\nHälsningar,\nErik',
   'Ni lyfter fram spårbarheten från båt till butik på er sajt – hur mycket handpåläggning kräver dokumentationen bakom?', 'claude', 'pending_review',
   null, null, null, null),
  (pg_temp.em(13), '00000000-0000-4000-a005-000000000001', pg_temp.co(21), pg_temp.ct(28),
   'Produktionsrapporter',
   E'Hej Sofia,\n\n{{opening_line}}\n\nVi har hjälpt tillverkare att automatisera dagsrapporterna från linjerna. Vore det värt 20 minuter?\n\nHälsningar,\nErik',
   'Grattis till den nya formsprutan i Kållby – det måste ha ökat volymerna rejält.', 'claude', 'pending_review',
   null, null, null, null),
  (pg_temp.em(14), '00000000-0000-4000-a005-000000000001', pg_temp.co(15), pg_temp.ct(20),
   'Offerter för golvjobb',
   E'Hej Johan,\n\n{{opening_line}}\n\nVi hjälper byggfirmor att ta fram offerter direkt från mått och bilder. Intresserad av en snabb demo?\n\nHälsningar,\nErik',
   'Bilderna på badrumsrenoveringarna i er galleri är imponerande – hur lång tid tar en offert från första besöket?', 'claude', 'pending_review',
   null, null, null, null),
  -- Avvisat i Gatekeeper
  (pg_temp.em(15), '00000000-0000-4000-a005-000000000001', pg_temp.co(8), pg_temp.ct(11),
   'Cateringbeställningar',
   E'Hej Emma,\n\n{{opening_line}}\n\nHälsningar,\nErik',
   'Ert café har fantastiska recensioner på Google!', 'claude', 'rejected',
   now() - interval '2 days', null, null, 'För generisk öppningsrad');

-- -----------------------------------------------------------------------------
-- Svar – 3 positiva skapar ringuppgifter via triggern public.handle_reply()
-- -----------------------------------------------------------------------------

insert into public.replies (email_id, company_id, contact_id, from_address, subject, body, classification, ai_summary, received_at) values
  (pg_temp.em(1), pg_temp.co(1), pg_temp.ct(1), 'mikael@bratobatvarv.test', 'Sv: Offerterna på Bråtö',
   E'Hej Erik,\n\nIntressant – vi har faktiskt pratat om just det här. Ring mig gärna nästa vecka, helst förmiddag.\n\n/Mikael',
   'positive', 'Vill bli uppringd nästa vecka, helst förmiddag. Har redan diskuterat offertproblemet internt.',
   now() - interval '13 days'),
  (pg_temp.em(2), pg_temp.co(6), pg_temp.ct(8), 'henrik@kyrkostrandsnickeri.test', 'Sv: Butiksinredning och ritningar',
   E'Hej,\n\nJa, det låter som något för oss. Lotta som är projektledare borde också vara med. Hör av dig!\n\nHenrik',
   'positive', 'Positiv. Vill att projektledaren Lotta Ström är med i samtalet.',
   now() - interval '2 days'),
  (pg_temp.em(3), pg_temp.co(14), pg_temp.ct(19), 'mats@sundombil.test', 'Sv: Servicebokningar i Sundom',
   E'Tjena,\n\nDet stämmer att telefonen går varm. Ring mig på eftermiddagen så tar vi det.\n\nMats',
   'positive', 'Telefonen går varm i högsäsong. Ring på eftermiddagen.',
   now() - interval '5 hours'),
  (pg_temp.em(4), pg_temp.co(7), pg_temp.ct(10), 'kurt@purmomaskin.test', 'Sv: Serviceprotokoll på papper?',
   E'Hej. Ja vi kör papper ännu. Inte aktuellt just nu men hör av dig efter nyår.\n\nKurt',
   'neutral', 'Inte aktuellt nu – återkom efter nyår.',
   now() - interval '8 days'),
  (pg_temp.em(5), pg_temp.co(24), pg_temp.ct(33), 'oskar@vikarholmenevent.test', 'Sv: Anmälningar till era event',
   E'Ta bort mig från era utskick, tack.',
   'unsubscribe', 'Vill inte bli kontaktad.',
   now() - interval '5 days');

-- -----------------------------------------------------------------------------
-- Samtal
-- -----------------------------------------------------------------------------

insert into public.calls (company_id, contact_id, outcome, notes, duration_seconds, called_at) values
  (pg_temp.co(1),  pg_temp.ct(1),  'no_answer',      'Inget svar, försök igen på förmiddagen.',                       0,   now() - interval '1 day'),
  (pg_temp.co(5),  pg_temp.ct(7),  'meeting_booked', 'Partnertips från Larsmo Bokföringsbyrå. Vill se automatiserad bokslutsrapportering.', 540, now() - interval '6 days'),
  (pg_temp.co(23), pg_temp.ct(31), 'meeting_booked', 'Stort intresse för automatiserad orderhantering. Inköp (Tina) med på mötet.',           720, now() - interval '3 days'),
  (pg_temp.co(7),  pg_temp.ct(10), 'callback',       'Ring tillbaka i januari.',                                       180, now() - interval '7 days'),
  (pg_temp.co(2),  pg_temp.ct(3),  'voicemail',      'Lämnade röstmeddelande.',                                        35,  now() - interval '2 days'),
  (pg_temp.co(11), pg_temp.ct(15), 'not_interested', 'Har egna lösningar redan.',                                      240, now() - interval '45 days');

-- -----------------------------------------------------------------------------
-- Möten (triggern flyttar bolagen till 'meeting_booked')
-- -----------------------------------------------------------------------------

insert into public.meetings (company_id, contact_id, title, starts_at, ends_at, location, status, notes) values
  (pg_temp.co(5),  pg_temp.ct(7),  'Discovery: Vasklot Revisionsbyrå',
   date_trunc('day', now()) + interval '3 days 10 hours',  date_trunc('day', now()) + interval '3 days 10 hours 45 minutes',
   'Teams', 'scheduled', 'Fokus: bokslutsrapportering och klientkommunikation.'),
  (pg_temp.co(23), pg_temp.ct(31), 'Discovery: Alholmens Svets & Montage',
   date_trunc('day', now()) + interval '6 days 13 hours',  date_trunc('day', now()) + interval '6 days 14 hours',
   'Hos kunden, Alholmen', 'scheduled', 'Ta med exempel på orderflöde från verkstadsbranschen.');

-- -----------------------------------------------------------------------------
-- Övriga uppgifter (ringuppgifterna för positiva svar skapas av triggern)
-- -----------------------------------------------------------------------------

insert into public.tasks (type, title, description, priority, company_id, contact_id, due_at) values
  ('follow_up', 'Följ upp Purmo Maskinservice efter nyår', 'Kurt bad oss återkomma i januari.', 3,
   pg_temp.co(7), pg_temp.ct(10), date_trunc('year', now()) + interval '1 year 7 days'),
  ('call', 'Ring Jonas på Skata Elinstallation igen', 'Röstmeddelande lämnat i tisdags.', 2,
   pg_temp.co(2), pg_temp.ct(3), now() + interval '1 day');

-- -----------------------------------------------------------------------------
-- Partners (IT, bokföring, webb) – Larsmo Bokföringsbyrå har gammal check-in
-- -----------------------------------------------------------------------------

insert into public.partners (id, name, type, contact_name, email, phone, city, notes, checkin_interval_days, referrals_count) values
  (pg_temp.pa(1), 'Österbottens IT-Service Ab', 'it',         'Fredrik Lund',   'fredrik@obit-service.test',  '+358 40 200 0101', 'Jakobstad', 'Sköter IT för ett 40-tal småbolag i regionen.', 30, 2),
  (pg_temp.pa(2), 'Larsmo Bokföringsbyrå Ab',   'accounting', 'Marina Eklund',  'marina@larsmobokforing.test','+358 40 200 0201', 'Larsmo',    'Gav tipset om Vasklot. Har många kunder med manuella flöden.', 30, 1),
  (pg_temp.pa(3), 'Kustwebb Ab',                'web',        'Daniel Byskata', 'daniel@kustwebb.test',       '+358 40 200 0301', 'Vasa',      'Bygger webbplatser – vi tar automationen bakom formulären.', 45, 0),
  (pg_temp.pa(4), 'Pedersöre Datahjälp',        'it',         'Ronja Lassila',  'ronja@pedersoredata.test',   '+358 40 200 0401', 'Pedersöre', 'Enmansfirma, nära kundrelationer.', 30, 0);

insert into public.partner_checkins (partner_id, notes, checked_in_at) values
  (pg_temp.pa(1), 'Kaffe på stan. Två möjliga kunder inom transport.', now() - interval '12 days'),
  (pg_temp.pa(2), 'Lunch i Larsmo. Tipsade om Vasklot.',               now() - interval '74 days'),
  (pg_temp.pa(3), 'Teamssamtal om gemensamt erbjudande.',              now() - interval '20 days'),
  (pg_temp.pa(4), 'Ronja hörde av sig om en kund i Bennäs.',           now() - interval '5 days');

insert into public.tasks (type, title, description, priority, partner_id, due_at) values
  ('partner_checkin', 'Check-in med Larsmo Bokföringsbyrå', 'Över 70 dagar sedan senaste kontakt.', 2, pg_temp.pa(2), now());

-- -----------------------------------------------------------------------------
-- Företagshjärnan – kontexten som matar AI-texterna
-- -----------------------------------------------------------------------------

insert into public.context_entries (kind, slug, title, content, sort_order) values
  ('profile', 'optely-profil', 'Optelys profil',
$md$# Optely

Optely är en AI- och automationsbyrå i **Jakobstad**. Vi hjälper svenskspråkiga små och medelstora bolag i Österbotten att ta bort manuellt arbete – offerter, bokningar, rapporter och uppföljning.

- Grundare: Erik
- Språk: svenska, finska, engelska
- Arbetssätt: kort discovery → konkret förslag → leverans i veckor, inte månader
- Ton: lokal, rak, jordnära. Vi säljer tid tillbaka, inte "AI".
$md$, 10),

  ('offer', 'erbjudande', 'Erbjudande',
$md$# Erbjudande

## 1. Discovery (kostnadsfritt, 45 min)
Vi kartlägger 2–3 flöden där tid läcker och räknar på besparingen.

## 2. Automationssprint – från 2 900 €
En avgränsad automation i drift inom 3 veckor. Exempel: offertunderlag, bokningsflöde, rapport som skrivs själv.

## 3. Löpande drift – från 290 € / månad
Övervakning, justeringar och nya små flöden.

**Garanti:** sparar automationen inte den tid vi räknat med under första kvartalet justerar vi utan kostnad.
$md$, 20),

  ('icp', 'icp', 'Idealkund (ICP)',
$md$# Idealkund

- Svenskspråkigt B2B-bolag i Österbotten (Jakobstad, Larsmo, Pedersöre, Nykarleby, Vasa med omnejd)
- 5–60 anställda, omsättning 0,5–8 M€
- Branscher: verkstad, bygg, transport, tillverkning, service, redovisning
- Signaler: offerter i Excel, bokningar per telefon, rapporter som skrivs för hand, ägaren gör administrationen på kvällarna
- Beslutsfattare: VD/ägare, ibland ekonomi- eller produktionschef

**Inte för oss:** bolag med egen IT-avdelning, rena konsumentbolag, offentlig sektor.
$md$, 30),

  ('case', 'case-gerby-energiteknik', 'Case: Gerby Energiteknik (exempel)',
$md$# Case: Automatiserad offertkedja

> Exempelcase i testdatan – ersätt med ett riktigt kundcase.

**Utgångsläge:** Offertansvarig lade ca 6 timmar i veckan på att sammanställa offerter från mejl, Excel och prislistor.

**Lösning:** Förfrågningar läses in automatiskt, AI föreslår offertrader utifrån prislistan, offertansvarig granskar och skickar med ett klick.

**Resultat:**
- Offerttid från 45 min till 8 min per offert
- Svarstid till kund från 3 dagar till samma dag
- Ca 5 timmar sparade per vecka
$md$, 40),

  ('script', 'grundmanus', 'Grundmanus – varmt samtal',
$md$# Grundmanus (varmt samtal efter positivt svar)

1. **Öppning:** "Hej {förnamn}, Erik från Optely här – du svarade på mitt mejl om {ämne}. Passar det med två minuter?"
2. **Bekräfta problemet:** "Du nämnde {det de skrev}. Hur ser det ut i praktiken i dag?"
3. **Kvantifiera:** "Ungefär hur många timmar i veckan går åt till det?"
4. **Bro:** "Vi gjorde något liknande för ett {bransch}bolag – de sparade ca 5 timmar i veckan."
5. **Boka:** "Ska vi ta 45 minuter där jag visar hur det kunde se ut hos er? Jag har {dag} förmiddag eller {dag} eftermiddag."

Se invändningarna nedan.
$md$, 50),

  ('objection', 'invandning-har-inte-tid', 'Invändning: "Har inte tid"',
$md$**"Har inte tid."**

"Det är precis därför jag ringer – det handlar om att frigöra tid. Om vi tar 20 minuter nästa vecka och det inte är värt det säger du bara stopp. Passar tisdag eller torsdag bättre?"
$md$, 60),

  ('objection', 'invandning-skicka-info', 'Invändning: "Skicka info på mejl"',
$md$**"Skicka info på mejl."**

"Absolut. För att jag ska skicka något relevant – är det {flödet de nämnde} som är mest intressant, eller något annat? … Bra. Jag skickar ett kort exempel i dag, och så bokar vi 20 minuter på fredag så går vi igenom det tillsammans?"
$md$, 70),

  ('objection', 'invandning-har-redan-nagon', 'Invändning: "Vi har redan någon"',
$md$**"Vi har redan någon som sköter IT/det där."**

"Bra – då har ni redan en bra grund. Vi ersätter sällan någon, vi bygger ofta automationerna tillsammans med er IT-partner. Vad gör de för er i dag?"
$md$, 80),

  ('objection', 'invandning-vad-kostar-det', 'Invändning: "Vad kostar det?"',
$md$**"Vad kostar det?"**

"En avgränsad automation börjar från 2 900 €. Men först vill jag förstå om det alls lönar sig för er – sparar vi inte minst det dubbla på ett år ska ni inte göra det. Det är det vi räknar på under mötet."
$md$, 90),

  ('tone', 'skrivregler', 'Skrivregler för AI-texter',
$md$# Skrivregler

- Finlandssvenska, du-tilltal, korta meningar.
- Öppningsraden ska vara **specifik** för bolaget – något från deras webbplats, nyheter eller referenser. Aldrig generiskt beröm.
- Inga ord som "revolutionerande", "AI-driven", "synergier".
- Max 80 ord per mejl. En fråga i slutet.
$md$, 100);

commit;
