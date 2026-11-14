"""Streamlit-gränssnitt. Starta med:  streamlit run app.py"""

from __future__ import annotations

from datetime import date

import pandas as pd
import streamlit as st

from flightagent import ai, notify
from flightagent.calendar_sync import load_windows
from flightagent.config import load_preferences, load_secrets
from flightagent.providers import REGISTRY, build_providers
from flightagent.search import deals, fmt_dt, search_all
from flightagent.state import State

st.set_page_config(page_title="Flight Agent", page_icon="✈️", layout="wide")
st.title("✈️ Din privata flygagent")

prefs = load_preferences()
secrets = load_secrets()
state = State()

with st.sidebar:
    st.header("Inställningar")
    prefs.home_airports = [a.strip().upper() for a in st.text_input("Hemmaflygplatser", ", ".join(prefs.home_airports)).split(",") if a.strip()]
    dest = st.text_input("Destinationer (tomt = vart som helst)", ", ".join(prefs.destinations))
    prefs.destinations = [a.strip().upper() for a in dest.split(",") if a.strip()]
    prefs.months_ahead = st.slider("Månader framåt", 1, 6, prefs.months_ahead)
    prefs.earliest_departure_hour = st.slider("Inga avgångar före kl.", 0, 12, prefs.earliest_departure_hour)
    prefs.after_work_hour = st.slider("Efter jobbet – tidigast kl.", 12, 21, prefs.after_work_hour)
    prefs.deal_threshold = float(st.number_input(f"Fyndgräns t/r ({prefs.currency})", 100, 20000, int(prefs.deal_threshold), step=100))
    prefs.providers = st.multiselect(
        "Källor", list(REGISTRY), prefs.providers, format_func=lambda n: f"{n} – {REGISTRY[n][0]}"
    )
    use_ai = st.checkbox("AI-analys med Claude", value=bool(secrets.anthropic_api_key), disabled=not secrets.anthropic_api_key)
    auto_notify = st.checkbox("Skicka fynd som notis automatiskt", value=False)
    st.caption(
        f"Kalendrar: {len(secrets.calendar_ics_urls)} · "
        f"Telegram: {'✅' if secrets.telegram_chat_id else '—'} · Discord: {'✅' if secrets.discord_webhook_url else '—'}  \n"
        f"SerpApi denna månad: {state.serpapi_used()}/{prefs.serpapi_monthly_budget}"
    )
    if st.button("Skicka testnotis"):
        try:
            st.success("Skickat till " + ", ".join(notify.notify(secrets, "✅ Testnotis från din flygagent")))
        except Exception as exc:
            st.error(str(exc))

if st.button("🔎 Sök nu", type="primary") or "trips" not in st.session_state:
    with st.spinner("Läser kalendern…"):
        try:
            windows = load_windows(
                secrets.calendar_ics_urls, date.today(), months_ahead=prefs.months_ahead,
                vacation_keywords=prefs.vacation_keywords, min_nights=prefs.min_nights, max_nights=prefs.max_nights,
            )
        except Exception as exc:
            st.error(f"Kunde inte läsa kalendern: {exc}")
            st.stop()
    with st.spinner(f"Söker priser för {len(windows)} lediga perioder…"):
        providers, warnings = build_providers(prefs.providers, secrets, prefs, state)
        trips = search_all(windows, prefs, providers)
    st.session_state.update(windows=windows, trips=trips, analysis=None, warnings=warnings)
    if auto_notify:
        try:
            st.toast(f"{notify.notify_new_deals(secrets, deals(trips, prefs), state)} nya fynd skickades")
        except Exception as exc:
            st.error(str(exc))

windows, trips = st.session_state["windows"], st.session_state["trips"]
for w in st.session_state.get("warnings", []):
    st.warning(w)

with st.expander(f"🗓 {len(windows)} lediga resefönster"):
    st.dataframe(pd.DataFrame([{"Period": w.label, "Avresa": w.depart_day, "Hem": w.return_day, "Nätter": w.nights} for w in windows]), hide_index=True)

if not trips:
    st.info("Inga resor matchade dina preferenser. Testa fler destinationer, källor eller en högre fyndgräns.")
    st.stop()

if "demo" in prefs.providers:
    st.warning("Källan **demo** visar påhittade priser för att testa appen. Välj riktiga källor i sidopanelen.")

st.subheader(f"{len(trips)} billigaste resorna")
for i, t in enumerate(trips):
    hot = t.total_price <= prefs.deal_threshold
    with st.container(border=True):
        c1, c2, c3 = st.columns([3, 4, 2])
        c1.markdown(f"### {'🔥 ' if hot else ''}{t.destination_name}\n{t.window.label} · {t.window.nights} nätter")
        o, b = t.outbound, t.inbound
        if t.indicative:
            lines = [f"**{t.window.depart_day:%d/%m}–{t.window.return_day:%d/%m}** · {o.origin}→{o.destination}"]
        else:
            lines = [f"**Ut:** {fmt_dt(o.depart)} {o.origin}→{o.destination} · {o.price:.0f} ({o.airline or o.provider})"]
            if b:
                lines.append(f"**Hem:** {fmt_dt(b.depart)} {b.origin}→{b.destination} · {b.price:.0f} ({b.airline or b.provider})")
        lines += [f"💡 {n}" for n in t.notes]
        c2.markdown("  \n".join(lines))
        c3.metric("Totalt" + (" (ca)" if t.indicative else ""), f"{t.total_price:.0f} {t.currency}")
        if t.indicative and o.booking_url:
            c3.link_button("Visa på Google Flights", o.booking_url)
        elif o.booking_url:
            c3.link_button("Boka utresa", o.booking_url)
        if t.inbound and t.inbound.booking_url:
            c3.link_button("Boka hemresa", t.inbound.booking_url)
        if c3.button("Skicka notis", key=f"n{i}"):
            try:
                c3.success("Skickat: " + ", ".join(notify.notify_trip(secrets, t)))
            except Exception as exc:
                c3.error(str(exc))

if use_ai:
    st.subheader("🧠 AI-analys")
    if st.session_state.get("analysis") is None and st.button("Analysera med Claude"):
        with st.spinner("Claude tänker…"):
            try:
                st.session_state["analysis"] = ai.analyze(trips, prefs, secrets)
            except Exception as exc:
                st.error(f"AI-analysen misslyckades: {exc}")
    if st.session_state.get("analysis"):
        st.markdown(st.session_state["analysis"])
