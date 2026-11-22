-- =============================================================================
-- 0013 – Markera ett partnermejl som skickat för hand ("Mejl skickat").
-- Steget blir klart direkt. Synkas samma mejl senare från Gmail (inom 3 dagar)
-- räknas det inte en gång till. Kräver 0001–0012. Idempotent – säker att köra igen.
-- =============================================================================

alter table public.partner_checkins add column if not exists manual boolean not null default false;
alter table public.partner_checkins add column if not exists matched_email_id uuid
  references public.partner_emails (id) on delete set null;

create or replace function public.log_partner_mail(p_partner uuid, p_notes text default null)
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from public.partners where id = p_partner) then
    raise exception 'Partnern finns inte';
  end if;
  insert into public.partner_checkins (partner_id, notes, channel, manual)
  values (p_partner, coalesce(nullif(trim(p_notes), ''), 'Mejl skickat (markerat för hand)'), 'mejl', true);
  perform public.partner_step_done(p_partner, 'mejl', now());
end;
$$;

-- Samma som i 0012, men ett synkat skickat mejl som motsvarar en handmarkering flyttar inte steget igen.
create or replace function public.partner_email_checkin()
returns trigger
language plpgsql
as $$
declare
  v_last_sent timestamptz;
  v_manual uuid;
begin
  insert into public.partner_checkins (partner_id, notes, checked_in_at, channel)
  values (
    new.partner_id,
    case when new.direction = 'sent' then 'Mejl skickat' else 'Svar' end
      || coalesce(': ' || nullif(trim(new.subject), ''), ''),
    new.occurred_at,
    case when new.direction = 'sent' then 'mejl' else 'svar' end
  );

  if new.direction = 'sent' then
    select id into v_manual from public.partner_checkins
     where partner_id = new.partner_id and manual and channel = 'mejl' and matched_email_id is null
       and checked_in_at between new.occurred_at - interval '3 days' and new.occurred_at + interval '3 days'
     order by checked_in_at limit 1;
    if v_manual is not null then
      update public.partner_checkins set matched_email_id = new.id where id = v_manual;
    else
      perform public.partner_step_done(new.partner_id, 'mejl', new.occurred_at);
    end if;
  else
    select max(occurred_at) into v_last_sent from public.partner_emails
     where partner_id = new.partner_id and direction = 'sent';
    if v_last_sent is not null and new.occurred_at > v_last_sent then
      update public.partners set sequence_status = 'svar'
       where id = new.partner_id and sequence_status in ('aktiv', 'vilande');
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.log_partner_mail(uuid, text) from public, anon;
grant execute on function public.log_partner_mail(uuid, text) to authenticated, service_role;
