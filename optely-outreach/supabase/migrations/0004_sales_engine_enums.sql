-- =============================================================================
-- 0004 – Enum-värden för säljsystemet (docs/saljsystem.md, fas A + B).
-- Egen migration: nya enum-värden kan inte användas i samma transaktion. Kör före 0005.
-- =============================================================================

-- Påminnelse i idag-listan om att ta LinkedIn-kontakt ("Skicka info").
alter type public.task_type add value if not exists 'linkedin' after 'partner_checkin';

-- Nya samtalsutfall enligt specen §4.
alter type public.call_outcome add value if not exists 'send_info' after 'wrong_person';
alter type public.call_outcome add value if not exists 'not_now' after 'send_info';
alter type public.call_outcome add value if not exists 'no_need' after 'not_now';
alter type public.call_outcome add value if not exists 'do_not_call' after 'no_need';
