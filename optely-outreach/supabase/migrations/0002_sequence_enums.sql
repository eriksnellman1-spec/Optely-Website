-- =============================================================================
-- 0002 – Nya enum-värden för uppföljningssekvensen.
--
-- Ligger i en egen migration eftersom Postgres inte tillåter att ett nytt
-- enum-värde används i samma transaktion som det skapas. Kör denna FÖRE 0003.
-- =============================================================================

-- Bolag som sagt "inte nu" eller gått igenom hela sekvensen vilar och tas upp igen senare.
alter type public.company_status add value if not exists 'nurture' after 'lost';

-- Mejlmallar för sekvensen ligger i Företagshjärnan.
alter type public.context_kind add value if not exists 'template' after 'tone';
