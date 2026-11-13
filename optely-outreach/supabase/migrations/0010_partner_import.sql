-- =============================================================================
-- 0010 – Import av partnerlistan (bokförings-, IT- och reklam-/webbyråer).
-- Kräver 0001–0009. Idempotent – säker att köra igen.
-- =============================================================================

-- Partnertyp ur fri text (typkolumn och/eller namn).
create or replace function public.partner_type_for(p_text text)
returns public.partner_type
language sql
immutable
as $$
  select case
    when t ~ '(bokför|redovis|revision|bokslut|lön|tilitoim|kirjanpi|tilinpä|palkanlas|accounting|bookkeep)' then 'accounting'
    when t ~ '(reklam|mainos|marknadsf|markkinoin|marketing|kommunikation|viestint)' then 'marketing'
    when t ~ '(webb|\mweb|digital|hemsid|kotisiv|nettisiv)' then 'web'
    when t ~ '(\mit\M|it-|data|system|tietotek|ohjelmisto|software|nätverk|verkko)' then 'it'
    else 'other'
  end::public.partner_type
  from (select lower(coalesce(p_text, '')) as t) x
$$;

-- Tolkar en uttrycklig typ (svenska/engelska etiketter) och faller tillbaka på gissning ur typ + namn.
create or replace function public.partner_type_from_row(r jsonb)
returns public.partner_type
language sql
immutable
as $$
  select case lower(trim(coalesce(r ->> 'type', '')))
    when 'accounting' then 'accounting'::public.partner_type
    when 'it' then 'it'::public.partner_type
    when 'web' then 'web'::public.partner_type
    when 'marketing' then 'marketing'::public.partner_type
    when 'other' then 'other'::public.partner_type
    else public.partner_type_for(coalesce(r ->> 'type', '') || ' ' || coalesce(r ->> 'name', ''))
  end
$$;

-- Förhandsvisning: typ och dubbletter per rad (mot befintliga partner och tidigare rader i filen).
create or replace function public.preview_partner_import(p_rows jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_out jsonb := '[]'::jsonb;
  r jsonb;
  i int := 0;
  v_dups jsonb;
  v_seen jsonb := '{}'::jsonb;
  v_keys text[];
  k text;
  v_in_file int;
begin
  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    i := i + 1;

    select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'matched_on', m.matched_on)), '[]'::jsonb)
      into v_dups
      from public.partners p
      cross join lateral (
        select case
          when public.norm_company_name(p.name) = public.norm_company_name(r ->> 'name') then 'namn'
          when public.norm_domain(p.email) = public.norm_domain(r ->> 'email') then 'e-postdomän'
          when public.norm_phone(p.phone) = public.norm_phone(r ->> 'phone') then 'telefon'
        end as matched_on
      ) m
     where m.matched_on is not null;

    v_keys := array_remove(array[
      'n:' || public.norm_company_name(r ->> 'name'),
      'd:' || public.norm_domain(r ->> 'email'),
      'p:' || public.norm_phone(r ->> 'phone')
    ], null);
    v_in_file := null;
    foreach k in array v_keys loop
      if v_seen ? k then
        v_in_file := (v_seen ->> k)::int;
        exit;
      end if;
    end loop;
    if v_in_file is not null then
      v_dups := v_dups || jsonb_build_array(jsonb_build_object('name', 'rad ' || v_in_file || ' i filen', 'matched_on', 'samma fil'));
    end if;
    foreach k in array v_keys loop
      if not v_seen ? k then v_seen := v_seen || jsonb_build_object(k, i); end if;
    end loop;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'row', i,
      'type', public.partner_type_from_row(r),
      'duplicates', v_dups
    ));
  end loop;
  return v_out;
end;
$$;

-- Import: nya partner. Dubbletter hoppas över om p_skip_duplicates. Webbadress hamnar i anteckningen.
create or replace function public.import_partners(p_rows jsonb, p_skip_duplicates boolean default true)
returns jsonb
language plpgsql
as $$
declare
  v_preview jsonb := public.preview_partner_import(p_rows);
  r jsonb;
  i int := 0;
  v_name text;
  v_imported int := 0;
  v_skipped int := 0;
begin
  for r in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    i := i + 1;
    v_name := nullif(trim(r ->> 'name'), '');
    if v_name is null
       or (p_skip_duplicates and jsonb_array_length(coalesce(v_preview -> (i - 1) -> 'duplicates', '[]'::jsonb)) > 0) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.partners (name, type, contact_name, email, phone, city, notes)
    values (
      v_name,
      public.partner_type_from_row(r),
      nullif(trim(r ->> 'contact_name'), ''),
      nullif(lower(trim(r ->> 'email')), ''),
      nullif(trim(r ->> 'phone'), ''),
      nullif(trim(r ->> 'city'), ''),
      nullif(concat_ws(E'\n',
        nullif(trim(r ->> 'notes'), ''),
        case when nullif(trim(r ->> 'website'), '') is not null then 'Webb: ' || trim(r ->> 'website') end
      ), '')
    );
    v_imported := v_imported + 1;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped);
end;
$$;

revoke execute on function public.preview_partner_import(jsonb) from public, anon;
revoke execute on function public.import_partners(jsonb, boolean) from public, anon;
grant execute on function public.preview_partner_import(jsonb) to authenticated, service_role;
grant execute on function public.import_partners(jsonb, boolean) to authenticated, service_role;
