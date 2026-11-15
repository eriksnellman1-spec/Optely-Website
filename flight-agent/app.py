"""Streamlit-gränssnitt. Starta med:  streamlit run app.py"""

from __future__ import annotations


import streamlit as st

from flightagent import ai, notify
from flightagent.config import load_preferences, load_secrets
from flightagent.providers import REGISTRY, build_providers
from flightagent.search import deals, fmt_day, fmt_dt, money, nights_text, search_all, search_range
from flightagent.state import State
from flightagent.where import resolve as resolve_where

st.set_page_config(page_title="Flight Agent", page_icon="✈️", layout="wide")
st.title("✈️ Din privata flygagent")

prefs = load_preferences()
secrets = load_secrets()
state = State()

with st.sidebar:
    st.header("Inställningar")
    prefs.home_airports = [a.strip().upper() for a in st.text_input("Hemmaflygplatser", ", ".join(prefs.home_airports)).split(",") if a.strip()]
    prefs.months_ahead = st.slider("Månader framåt", 1, 6, prefs.months_ahead)
    prefs.earliest_departure_hour = st.slider("Inga avgångar före kl.", 0, 12, prefs.earliest_departure_hour)
    prefs.after_work_hour = st.slider("Efter jobbet – tidigast kl.", 12, 21, prefs.after_work_hour)
    prefs.deal_threshold = float(st.number_input(f"Fyndgräns t/r ({prefs.currency})", 10, 5000, int(prefs.deal_threshold), step=10))
    prefs.providers = st.multiselect(
        "Källor", list(REGISTRY), prefs.providers, format_func=lambda n: f"{n} – {REGISTRY[n][0]}"
    )
    use_ai = st.checkbox("AI-analys med Claude", value=bool(secrets.anthropic_api_key), disabled=not secrets.anthropic_api_key)
    auto_notify = st.checkbox("Skicka fynd som notis automatiskt", value=False)
    st.caption(
        f"Telegram: {'✅' if secrets.telegram_chat_id else '—'} · Discord: {'✅' if secrets.discord_webhook_url else '—'}  \n"
        f"SerpApi idag: {state.serpapi_used_today()}/{prefs.serpapi_daily_budget} · "
        f"månad: {state.serpapi_used()}/{prefs.serpapi_monthly_budget}"
    )
    if st.button("Skicka testnotis"):
        try:
            st.success("Skickat till " + ", ".join(notify.notify(secrets, "✅ Testnotis från din flygagent")))
        except Exception as exc:
            st.error(str(exc))

where_text = st.text_input(
    "Vart vill du?",
    value=prefs.where or ", ".join(prefs.destinations),
    placeholder='Beskriv fritt, t.ex. "varmt i Spanien", "Barcelona eller Lissabon", "grekiska öarna" – tomt = vart som helst',
)
try:
    where = resolve_where(where_text, prefs.home_airports, secrets, state)
except Exception as exc:
    st.error(str(exc))
    st.stop()
if where:
    prefs.destinations = where.codes
    st.caption(f"🧭 {where.summary}  \nSöker till: " + ", ".join(f"{a['city']} ({a['code']})" for a in where.airports))
    prefs.max_results = max(prefs.max_results, 100)
else:
    prefs.destinations = []

search_key = (where_text, tuple(prefs.home_airports))
if st.button("🔎 Sök nu", type="primary") or st.session_state.get("search_key") != search_key:
    st.session_state["search_key"] = search_key
    with st.spinner("Söker alla datum…"):
        providers, warnings = build_providers(prefs.providers, secrets, prefs, state)
        trips = search_all(prefs, providers)
    st.session_state.update(trips=trips, analysis=None, warnings=warnings)
    if auto_notify:
        try:
            st.toast(f"{notify.notify_new_deals(secrets, deals(trips, prefs), state, prefs.digest_after)} nya fynd skickades")
        except Exception as exc:
            st.error(str(exc))

trips = st.session_state["trips"]
start, end = search_range(prefs)
st.caption(f"Tur och retur från {', '.join(prefs.home_airports)} · avresa {fmt_day(start)}–{fmt_day(end)} · "
           f"{prefs.min_nights}–{prefs.max_nights} nätter · alla veckodagar")
for w in st.session_state.get("warnings", []):
    st.warning(w)

if not trips:
    st.info("Inga resor matchade dina preferenser. Testa fler destinationer, källor eller en högre fyndgräns.")
    st.stop()

if "demo" in prefs.providers:
    st.warning("Källan **demo** visar påhittade priser för att testa appen. Välj riktiga källor i sidopanelen.")

shown = trips[: prefs.max_results]
st.subheader(f"{len(shown)} billigaste resorna" + (f" (av {len(trips)})" if len(trips) > len(shown) else ""))
for i, t in enumerate(shown):
    hot = t.total_price <= prefs.deal_threshold
    with st.container(border=True):
        c1, c2, c3 = st.columns([3, 4, 2])
        c1.markdown(f"### {'🔥 ' if hot else ''}{t.destination_name}\n{fmt_day(t.window.depart_day)} – "
                    f"{fmt_day(t.window.return_day)} · {nights_text(t.window.nights)}  \n{t.window.label}")
        o, b = t.outbound, t.inbound
        if t.indicative:
            lines = [f"**{t.window.depart_day:%d/%m}–{t.window.return_day:%d/%m}** · {o.origin}→{o.destination}"]
        else:
            price = (lambda f: "" if t.bundled else f" · {money(f.price, f.currency)}")
            lines = [f"**Ut:** {fmt_dt(o.depart)} {o.origin}→{o.destination}{price(o)} ({o.airline or o.provider})"]
            if b:
                lines.append(f"**Hem:** {fmt_dt(b.depart)} {b.origin}→{b.destination}{price(b)} ({b.airline or b.provider})")
        lines += [f"💡 {n}" for n in t.notes]
        c2.markdown("  \n".join(lines))
        c3.metric("Totalt" + (" (ca)" if t.indicative else ""), money(t.total_price, t.currency))
        if t.indicative and o.booking_url:
            c3.link_button("Visa på Google Flights", o.booking_url)
        elif o.booking_url:
            c3.link_button("Boka resan" if t.bundled else "Boka utresa", o.booking_url)
        if t.inbound and t.inbound.booking_url and not t.bundled:
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
