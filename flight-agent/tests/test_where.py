import json
from types import SimpleNamespace

import pytest

from flightagent.config import Secrets
from flightagent.state import State
from flightagent.where import resolve

SECRETS = Secrets(anthropic_api_key=None, claude_model="claude-opus-5-5", claude_effort="low",
                  telegram_bot_token=None, telegram_chat_id=None, discord_webhook_url=None)


class FakeClaude:
    def __init__(self, airports):
        self.calls = []
        self.airports = airports
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self.create))

    def create(self, **kwargs):
        self.calls.append(kwargs)
        text = json.dumps({"summary": "Spanien, varma orter", "airports": self.airports})
        return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=text)])


def test_codes_need_no_ai(tmp_path):
    w = resolve("bcn, AGP pmi", ["HEL"], SECRETS, State(tmp_path / "s.json"))
    assert w.codes == ["BCN", "AGP", "PMI"]


def test_free_text_without_key_explains_what_to_do(tmp_path):
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        resolve("varmt i Spanien", ["HEL"], SECRETS, State(tmp_path / "s.json"))


def test_free_text_is_resolved_validated_and_cached(tmp_path):
    claude = FakeClaude([
        {"code": "AGP", "city": "Málaga", "country": "Spanien"},
        {"code": "alc", "city": "Alicante", "country": "Spanien"},
        {"code": "HEL", "city": "Helsingfors", "country": "Finland"},    # hemma → bort
        {"code": "XXXX", "city": "Fel", "country": ""},                 # ogiltig → bort
        {"code": "AGP", "city": "Málaga", "country": "Spanien"},       # dubblett → bort
    ])
    state = State(tmp_path / "s.json")
    w = resolve("Varmt i Spanien", ["HEL"], SECRETS, state, client=claude)
    assert w.codes == ["AGP", "ALC"] and w.summary == "Spanien, varma orter"
    assert claude.calls[0]["output_config"]["format"]["type"] == "json_schema"
    again = resolve("varmt i spanien", ["HEL"], SECRETS, State(tmp_path / "s.json"), client=claude)
    assert again.codes == ["AGP", "ALC"] and len(claude.calls) == 1   # sparat svar, ingen ny kostnad


def test_empty_means_anywhere(tmp_path):
    assert resolve("  ", ["HEL"], SECRETS, State(tmp_path / "s.json")) is None
