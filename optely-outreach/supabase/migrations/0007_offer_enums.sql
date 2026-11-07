-- =============================================================================
-- 0007 – Enum-typer och -värden för grunden med två erbjudanden (Optely + SBA).
-- Egen migration: nya enum-värden kan inte användas i samma transaktion. Kör före 0008.
-- Idempotent – säker att köra igen.
-- =============================================================================

-- Erbjudande: ett aktivt per företag.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'offer') then
    create type public.offer as enum ('optely', 'sba');
  end if;
end;
$$;

-- Steg i pipelinen (deals).
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'deal_stage') then
    create type public.deal_stage as enum (
      'kontaktad', 'svar', 'mote_bokat', 'mote_hallet', 'offert', 'kund', 'forlorad'
    );
  end if;
end;
$$;

-- Riktning för manuellt loggade LinkedIn-meddelanden.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'message_direction') then
    create type public.message_direction as enum ('out', 'in');
  end if;
end;
$$;

-- E-postsekvenser i Manus och sekvenser (context_entries.kind).
alter type public.context_kind add value if not exists 'sequence' after 'objection';

-- LinkedIn som uppgiftstyp (finns sedan 0004 – upprepas för säkerhets skull).
alter type public.task_type add value if not exists 'linkedin' after 'partner_checkin';
