-- =============================================================================
-- 0009 – Ringpasset i bruk: CSV-import av ringlistan, töm testdata, hoppa över /
-- skjut upp samtal. Kräver 0001–0008. Idempotent – säker att köra igen.
--
-- Ringpassets utfallslogik (apply_call_outcome m.fl.) ändras INTE.
-- =============================================================================

-- Postort (CONTEXT: companies har både kommun och postort). Kommun ligger i city.
alter table public.companies add column if not exists postal_city text;

-- Erbjudande utifrån bransch: bygg, VVS, el, måleri, tak, golv/kakel → SBA, övriga → Optely.
-- Samma regel som engångs-backfillen i 0008.
create or replace function public.offer_for_industry(p_industry text)
returns public.offer
language sql
immutable
as $$
  select case
    when coalesce(p_industry, '') ~* '(bygg|vvs|\mel\M|elinstall|elektri|måler|maler|\mtak|golv|kakel|rör|ventilation)'
      then 'sba'::public.offer
    else 'optely'::public.offer
  end
$$;

-- -----------------------------------------------------------------------------
-- CSV-import
-- Varje rad är ett json-objekt med (valfria) nycklar:
--   name, business_id, city, postal_city, industry, employees, revenue_eur,
--   phone, website, email, ceo_name, notes, source
-- -----------------------------------------------------------------------------

-- Förhandsvisning: erbjudande och dubbletter per rad (mot registret, partner och tidigare rader i filen).
create or replace function public.preview_import(p_rows jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_out jsonb := '[]'::jsonb;
  r jsonb;
  i int := 0;
  v_dups jsonb;
  v_seen jsonb := '{}'::jsonb;   -- normaliserade nycklar → radnummer
  v_keys text[];
  k text;
  v_in_file int;
begin
  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    i := i + 1;

    select coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'matched_on', d.matched_on, 'status', d.status)), '[]'::jsonb)
      into v_dups
      from public.find_company_duplicates(r ->> 'name', r ->> 'website', r ->> 'email', r ->> 'phone') d;

    if coalesce(r ->> 'business_id', '') <> '' then
      select v_dups || coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'matched_on', 'FO-nummer', 'status', c.status)), '[]'::jsonb)
        into v_dups
        from public.companies c
       where c.business_id = trim(r ->> 'business_id')
         and not exists (select 1 from jsonb_array_elements(v_dups) x where x ->> 'name' = c.name);
    end if;

    -- Dubblett inom filen
    v_keys := array_remove(array[
      'n:' || public.norm_company_name(r ->> 'name'),
      'd:' || coalesce(public.norm_domain(r ->> 'website'), public.norm_domain(r ->> 'email')),
      'p:' || public.norm_phone(r ->> 'phone'),
      'b:' || nullif(trim(r ->> 'business_id'), '')
    ], null);
    v_in_file := null;
    foreach k in array v_keys loop
      if v_seen ? k then
        v_in_file := (v_seen ->> k)::int;
        exit;
      end if;
    end loop;
    if v_in_file is not null then
      v_dups := v_dups || jsonb_build_array(jsonb_build_object('name', 'rad ' || v_in_file || ' i filen', 'matched_on', 'samma fil', 'status', null));
    end if;
    foreach k in array v_keys loop
      if not v_seen ? k then v_seen := v_seen || jsonb_build_object(k, i); end if;
    end loop;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'row', i,
      'offer', public.offer_for_industry(r ->> 'industry'),
      'duplicates', v_dups
    ));
  end loop;
  return v_out;
end;
$$;

-- Import: nya bolag (status Ny) + VD som kontakt. Dubbletter hoppas över om p_skip_duplicates.
create or replace function public.import_companies(p_rows jsonb, p_skip_duplicates boolean default true)
returns jsonb
language plpgsql
as $$
declare
  v_preview jsonb := public.preview_import(p_rows);
  r jsonb;
  p jsonb;
  i int := 0;
  v_id uuid;
  v_name text;
  v_ceo text;
  v_imported int := 0;
  v_skipped int := 0;
  v_contacts int := 0;
  v_employees int;
  v_revenue int;
begin
  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    i := i + 1;
    p := v_preview -> (i - 1);
    v_name := nullif(trim(r ->> 'name'), '');
    if v_name is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    if p_skip_duplicates and jsonb_array_length(coalesce(p -> 'duplicates', '[]'::jsonb)) > 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_employees := nullif(regexp_replace(coalesce(r ->> 'employees', ''), '[^0-9]', '', 'g'), '')::int;
    v_revenue := nullif(regexp_replace(split_part(coalesce(r ->> 'revenue_eur', ''), ',', 1), '[^0-9]', '', 'g'), '')::bigint
                 ::int;

    insert into public.companies (name, business_id, city, postal_city, industry, employees, revenue_eur, phone,
                                  website, source, notes, offer, status)
    values (
      v_name,
      case when nullif(trim(r ->> 'business_id'), '') is not null
                and not exists (select 1 from public.companies c where c.business_id = trim(r ->> 'business_id'))
           then trim(r ->> 'business_id') end,
      nullif(trim(r ->> 'city'), ''),
      nullif(trim(r ->> 'postal_city'), ''),
      nullif(trim(r ->> 'industry'), ''),
      v_employees,
      v_revenue,
      nullif(trim(r ->> 'phone'), ''),
      case when nullif(trim(r ->> 'website'), '') is null then null
           when trim(r ->> 'website') ~* '^https?://' then trim(r ->> 'website')
           else 'https://' || trim(r ->> 'website') end,
      coalesce(nullif(trim(r ->> 'source'), ''), 'import'),
      nullif(trim(r ->> 'notes'), ''),
      public.offer_for_industry(r ->> 'industry'),
      'new'
    )
    returning id into v_id;
    v_imported := v_imported + 1;

    v_ceo := nullif(trim(r ->> 'ceo_name'), '');
    if v_ceo is not null or nullif(trim(r ->> 'email'), '') is not null then
      insert into public.contacts (company_id, first_name, last_name, role, email, phone, is_primary)
      values (
        v_id,
        coalesce(nullif(split_part(coalesce(v_ceo, ''), ' ', 1), ''), 'Kontakt'),
        nullif(trim(substr(coalesce(v_ceo, ''), length(split_part(coalesce(v_ceo, ''), ' ', 1)) + 1)), ''),
        case when v_ceo is not null then 'VD' end,
        case when nullif(lower(trim(r ->> 'email')), '') is not null
                  and not exists (select 1 from public.contacts k where lower(k.email) = lower(trim(r ->> 'email')))
             then lower(trim(r ->> 'email')) end,
        nullif(trim(r ->> 'phone'), ''),
        true
      );
      v_contacts := v_contacts + 1;
      update public.companies c set sequence_contact_id = k.id
        from public.contacts k where k.company_id = v_id and c.id = v_id;
    end if;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped, 'contacts', v_contacts);
end;
$$;

-- -----------------------------------------------------------------------------
-- Töm testdata: bara bolag och partner med .test-adresser (allt kopplat följer med via cascade).
-- Manus, mallar, inställningar och riktiga bolag lämnas orörda.
-- -----------------------------------------------------------------------------

create or replace function public.test_data_counts()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'companies', (select count(*) from public.companies c
                   where coalesce(c.website, '') ~* '\.test(/|$)'
                      or coalesce(c.domain, '') ~* '\.test$'
                      or exists (select 1 from public.contacts k where k.company_id = c.id and k.email ilike '%.test')),
    'partners', (select count(*) from public.partners p where coalesce(p.email, '') ilike '%.test')
  )
$$;

create or replace function public.clear_test_data()
returns jsonb
language plpgsql
as $$
declare
  v_companies int;
  v_partners int;
begin
  delete from public.companies c
   where coalesce(c.website, '') ~* '\.test(/|$)'
      or coalesce(c.domain, '') ~* '\.test$'
      or exists (select 1 from public.contacts k where k.company_id = c.id and k.email ilike '%.test');
  get diagnostics v_companies = row_count;

  delete from public.partners p where coalesce(p.email, '') ilike '%.test';
  get diagnostics v_partners = row_count;

  return jsonb_build_object('companies', v_companies, 'partners', v_partners);
end;
$$;

-- -----------------------------------------------------------------------------
-- Hoppa över / skjut upp ett samtal utan att logga utfall
--   'skip'     → sist i dagens kö (inom samma prioritet)
--   'tomorrow' → nästa ringdag kl. fm-tid
-- -----------------------------------------------------------------------------

create or replace function public.defer_task(p_task_id uuid, p_mode text)
returns timestamptz
language plpgsql
as $$
declare
  v_due timestamptz;
begin
  if p_mode = 'skip' then
    v_due := now();
  elsif p_mode = 'tomorrow' then
    v_due := public.helsinki_at(public.next_channel_date('phone'), coalesce(public.ringpass_setting('am'), '09:00'));
  else
    raise exception 'Okänt läge: %', p_mode;
  end if;

  update public.tasks set due_at = v_due where id = p_task_id and status = 'open';
  if not found then raise exception 'Uppgiften är redan hanterad'; end if;
  return v_due;
end;
$$;

-- -----------------------------------------------------------------------------
-- Behörigheter
-- -----------------------------------------------------------------------------

revoke execute on function public.preview_import(jsonb) from public, anon;
revoke execute on function public.import_companies(jsonb, boolean) from public, anon;
revoke execute on function public.test_data_counts() from public, anon;
revoke execute on function public.clear_test_data() from public, anon;
revoke execute on function public.defer_task(uuid, text) from public, anon;
grant execute on function public.preview_import(jsonb) to authenticated, service_role;
grant execute on function public.import_companies(jsonb, boolean) to authenticated, service_role;
grant execute on function public.test_data_counts() to authenticated, service_role;
grant execute on function public.clear_test_data() to authenticated, service_role;
grant execute on function public.defer_task(uuid, text) to authenticated, service_role;
