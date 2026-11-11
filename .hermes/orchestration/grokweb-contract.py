#!/usr/bin/env python3
"""Offline contract gate: real tick + parser, stubbed gh/curl/hermes via PATH.

Run: python3 .hermes/orchestration/grokweb-contract.py
No network, credentials, actual bot messages, or writes outside a temporary HOME.
"""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("intake", HERE / "grokweb-parse.py")
intake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intake)
SHA = "a" * 40
URL = intake.STAGING


def reply(run_id="test-run", sha=SHA, url=URL, failed=0, passed=3, exit_status=0):
    identity = dict(run_id=run_id, sha=sha, url=url)
    rows = [dict(identity, kind="suite-stats", passed=passed, failed=failed,
                 skipped=5, exit_status=exit_status, duration_s=10,
                 node="v20.19.0", playwright="1.56.1")]
    for journey in sorted(intake.JOURNEYS):
        rows.append(dict(identity, kind="journey", phase="A", journey=journey,
                         verdict="PASS" if not failed else "FAIL", steps=3,
                         final_url=url + ("/" if journey == "landing" else "/" + journey),
                         assertion="Visible public controls", console_errors=[], failed_requests=[]))
    rows.append(dict(identity, kind="exploration-stats", steps=12, duration_s=60))
    return rows


def fenced(rows):
    return "\n".join("```json\n" + json.dumps(row) + "\n```" for row in rows)


STUB = r'''#!PYTHON
import json, os, pathlib, re, sys, time
root = pathlib.Path(os.environ["STUB_ROOT"])
scenario = json.loads((root / "scenario.json").read_text())
name = pathlib.Path(sys.argv[0]).name
with (root / "calls.jsonl").open("a") as log:
    log.write(json.dumps([name, sys.argv[1:]]) + "\n")
if name == "gh":
    endpoint = sys.argv[2]
    if scenario.get("gh_error"):
        sys.exit(1)
    if "/git/ref/" in endpoint:
        refs = root / "ref-count"
        count = int(refs.read_text()) if refs.exists() else 0
        refs.write_text(str(count + 1))
        sha = scenario.get("sha", "a" * 40)
        if scenario.get("superseded") and count:
            sha = "b" * 40
        print(json.dumps({"object": {"sha": sha}}))
    elif "/statuses?" in endpoint:
        print(json.dumps([{"state": scenario.get("deploy_state", "success"),
                           "environment_url": scenario.get("url", "https://valgate-webapp-deploy-l0vu3000s-projects.vercel.app")}]))
    else:
        print(json.dumps([] if scenario.get("fallback", True) else
                         [{"id": 123, "environment": scenario.get("environment", "Preview")}]))
elif name == "curl":
    print(scenario.get("body", "<html>pk_test_fixture</html>"))
    print(scenario.get("http", "200"), end="")
else:
    assert sys.argv[1:4] == ["-t", "grokbot", "-z"]
    prompt = sys.argv[4]
    card = prompt.split("<job-card>\n", 1)[1].split("</job-card>", 1)[0]
    (root / "card.md").write_text(card)
    if scenario.get("timeout"):
        time.sleep(5)
    if scenario.get("hermes_error"):
        print("token=DO_NOT_LEAK_THIS_CREDENTIAL", file=sys.stderr)
        sys.exit(2)
    if scenario.get("empty"):
        print("NO_MATCHING_REPLY")
        sys.exit(0)
    sys.dont_write_bytecode = True
    import importlib.util
    spec = importlib.util.spec_from_file_location("gate", os.environ["CONTRACT_FILE"])
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    run_id = re.search(r"^run_id=(.+)$", card, re.M).group(1)
    sha = re.search(r"^sha=(.+)$", card, re.M).group(1)
    url = re.search(r"^URL=(.+)$", card, re.M).group(1)
    rows = gate.reply(run_id, sha, url)
    if scenario.get("missing_stats"):
        rows = rows[1:]
    if scenario.get("red"):
        rows[0].update(failed=1, passed=2, exit_status=1)
        rows[1]["verdict"] = "FAIL"
    print(gate.fenced(rows))
    if scenario.get("secret_reply"):
        print("token=DO_NOT_LEAK_THIS_CREDENTIAL")
'''


class ParserContract(unittest.TestCase):
    def verify(self, rows, text=""):
        return intake.verify(text + fenced(rows), "test-run", SHA, URL)[0]

    def test_good_reply_green(self):
        self.assertEqual(self.verify(reply()), "GREEN")

    def test_missing_stats_parse_fail(self):
        self.assertEqual(self.verify(reply()[1:]), "PARSE-FAIL")

    def test_claimed_green_cannot_override_exit_status(self):
        self.assertEqual(self.verify(reply(exit_status=1), "GREEN! All good!\n"), "BLOCKED")
        self.assertEqual(self.verify(reply(failed=1, passed=2, exit_status=1), "GREEN!\n"), "RED")
        self.assertEqual(self.verify(reply(), "GREEN!\n"), "GREEN")

    def test_no_run_is_blocked(self):
        self.assertEqual(self.verify(reply(passed=0, exit_status=1)), "BLOCKED")

    def test_identity_mismatch(self):
        for key in ("sha", "url", "run_id"):
            rows = reply()
            rows[1][key] = "wrong"
            self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_public_journeys_required_and_unique(self):
        self.assertEqual(self.verify(reply()[:3] + reply()[4:]), "PARSE-FAIL")
        rows = reply()
        rows[1]["journey"] = "register"
        self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_stats_are_integers_not_booleans_or_strings(self):
        for value in (True, "3", -1, 3.5, None):
            rows = reply()
            rows[0]["passed"] = value
            self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_caps_and_candidates_informational(self):
        rows = reply()
        candidate = dict(rows[0], kind="RED-CANDIDATE", phase="B", assertion="Potential layout issue", steps=1)
        self.assertEqual(self.verify(rows + [candidate] * 10), "GREEN")
        self.assertEqual(self.verify(rows + [candidate] * 11), "PARSE-FAIL")
        candidate["phase"] = "A"
        self.assertEqual(self.verify(rows + [candidate]), "PARSE-FAIL")
        for key, value in (("steps", 41), ("duration_s", 1201)):
            rows = reply()
            rows[-1][key] = value
            self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_wrong_journey_host_and_malformed_json(self):
        rows = reply()
        rows[1]["final_url"] = "https://foreign.invalid/login"
        self.assertEqual(self.verify(rows), "PARSE-FAIL")
        self.assertEqual(intake.verify("```json\n{\n```", "test-run", SHA, URL)[0], "PARSE-FAIL")

    def test_duplicate_exit_status_and_unsafe_url_forms(self):
        text = fenced(reply()).replace('"exit_status": 0', '"exit_status": 1, "exit_status": 0')
        self.assertEqual(intake.verify(text, "test-run", SHA, URL)[0], "PARSE-FAIL")
        for url in (URL + "\n", URL + "?token=example", "http://" + URL[8:],
                    URL + ".foreign.invalid", "https://user:password@" + URL[8:],
                    URL + ":8443", URL + "\\@foreign.invalid"):
            self.assertFalse(intake.allowed_url(url), url)

    def test_parser_cli_exactly_one_line(self):
        p = subprocess.run([sys.executable, str(HERE / "grokweb-parse.py"), "--run-id", "test-run",
                            "--sha", SHA, "--url", URL, "--bot", "web-test"],
                           input=fenced(reply()), text=True, capture_output=True, check=True)
        self.assertEqual(p.stdout, "RESULT: test-run GREEN phaseA=3/0 phaseB=0 dur=0 bot=web-test\n")
        self.assertEqual(p.stderr, "")


class WatcherContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="grokweb-contract-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for name in ("gh", "curl", "hermes"):
            path = self.bin / name
            path.write_text(STUB.replace("PYTHON", sys.executable, 1))
            path.chmod(0o700)
        self.env = dict(os.environ, HOME=str(self.root), STUB_ROOT=str(self.root),
                        CONTRACT_FILE=str(Path(__file__).resolve()),
                        PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
                        GROKWEB_REFS="staging", GROKWEB_BOT="web-test")
        for key in ("GROKWEB_STATE_DIR", "GROKWEB_MAX_PER_DAY", "GROKWEB_TIMEOUT_S", "GROKWEB_STAGING_URL"):
            self.env.pop(key, None)
        self.scenario = {}
        self.configure()

    def configure(self, **values):
        self.scenario.update(values)
        (self.root / "scenario.json").write_text(json.dumps(self.scenario))

    def tick(self):
        p = subprocess.run(["sh", str(HERE / "grokweb-watcher.sh")], env=self.env,
                           text=True, capture_output=True, timeout=15)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(p.stderr, "")
        return p.stdout

    def calls(self, name):
        path = self.root / "calls.jsonl"
        return [r[1] for r in map(json.loads, path.read_text().splitlines()) if r[0] == name] if path.exists() else []

    def logs(self):
        path = self.root / ".hermes/grok-web/evidence.log"
        return path.read_text() if path.exists() else ""

    def test_new_sha_duplicate_suppression_and_next_sha(self):
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(self.tick(), "")
        self.assertEqual(len(self.calls("hermes")), 1)
        self.configure(sha="b" * 40)
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(len(self.logs().splitlines()), 2)

    def test_default_refs_and_global_sha_deduplication(self):
        self.env.pop("GROKWEB_REFS")
        self.configure(fallback=False)
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(len(self.calls("hermes")), 1)
        self.assertTrue(any("heads/main" in c[1] for c in self.calls("gh")))
        self.assertTrue(any("heads/staging" in c[1] for c in self.calls("gh")))

    def test_staging_alias_fallback_and_sha_deployment_lookup(self):
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(self.calls("curl")[0][-1], URL)
        endpoints = [c[1] for c in self.calls("gh")]
        self.assertTrue(any("deployments?sha=" + SHA in e for e in endpoints))
        self.assertFalse(any("deployments?ref=" in e for e in endpoints))

    def test_specific_deploy_url_preferred(self):
        self.configure(fallback=False)
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(self.calls("curl")[0][-1], "https://valgate-webapp-deploy-l0vu3000s-projects.vercel.app")

    def test_guard_missing_test_key_and_live_key(self):
        for body in ("<html>no key</html>", "pk_test_safe pk_live_forbidden", "pk_test_safe whole-civet-89"):
            self.configure(body=body)
            self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("hermes"), [])
        self.assertNotIn("pk_live_forbidden", self.logs())

    def test_foreign_host_refused_before_curl(self):
        self.configure(fallback=False, url="https://foreign.invalid")
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("curl"), [])
        self.assertEqual(self.calls("hermes"), [])
        self.assertNotIn("foreign.invalid", self.logs())

    def test_override_is_guarded(self):
        self.env["GROKWEB_STAGING_URL"] = "https://foreign.invalid"
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("curl"), [])

    def test_http_and_redirect_refused(self):
        self.configure(http="302")
        self.assertIn(" BLOCKED ", self.tick())
        args = self.calls("curl")[0]
        self.assertNotIn("-L", args)
        self.assertNotIn("--location", args)
        self.assertEqual(self.calls("hermes"), [])

    def test_production_deployment_never_probed(self):
        self.env["GROKWEB_REFS"] = "main"
        self.configure(fallback=False, environment="Production")
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("curl"), [])
        self.assertEqual(self.calls("hermes"), [])

    def test_latest_failed_status_is_not_ready(self):
        self.env["GROKWEB_REFS"] = "main"
        self.configure(fallback=False, deploy_state="failure")
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("hermes"), [])

    def test_daily_cap_hard_max_six(self):
        self.env["GROKWEB_MAX_PER_DAY"] = "999"
        for index in range(7):
            self.configure(sha=f"{index + 1:040x}")
            self.assertIn(" GREEN " if index < 6 else " BLOCKED ", self.tick())
        self.assertEqual(len(self.calls("hermes")), 6)
        self.assertIn("daily-cap", "".join(p.read_text() for p in (self.root / ".hermes/grok-web/evidence").glob("*.md")))

    def test_timeout_blocked_then_retry_same_run_and_message_id(self):
        self.env["GROKWEB_TIMEOUT_S"] = "1"
        self.configure(timeout=True)
        first = self.tick()
        self.assertIn(" BLOCKED ", first)
        self.configure(timeout=False)
        second = self.tick()
        self.assertIn(" GREEN ", second)
        self.assertEqual(first.split()[1], second.split()[1])
        prompts = [c[-1] for c in self.calls("hermes")]
        self.assertEqual(prompts[0], prompts[1])
        self.assertIn("grokbot_wait", prompts[0])
        self.assertIn("grokbot_history", prompts[0])
        self.assertNotIn("grokbot_put_secret", prompts[0])

    def test_single_flight(self):
        self.env["GROKWEB_TIMEOUT_S"] = "1"
        self.configure(timeout=True)
        first = subprocess.Popen(["sh", str(HERE / "grokweb-watcher.sh")], env=self.env,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: first.poll() is None and first.kill())
        deadline = time.monotonic() + 5
        while not self.calls("hermes") and time.monotonic() < deadline:
            time.sleep(.02)
        self.assertTrue(self.calls("hermes"))
        self.assertEqual(self.tick(), "")
        first.communicate(timeout=5)
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_transport_failure_no_show_and_parse_fail_retry(self):
        for scenario, verdict in ((dict(hermes_error=True), "BLOCKED"),
                                  (dict(empty=True), "BLOCKED"),
                                  (dict(missing_stats=True), "PARSE-FAIL")):
            self.scenario = scenario
            self.configure()
            self.assertIn(" " + verdict + " ", self.tick())
        self.scenario = {}
        self.configure()
        self.assertIn(" GREEN ", self.tick())
        self.assertNotIn("DO_NOT_LEAK_THIS_CREDENTIAL", self.logs())

    def test_red_is_suppressed_and_superseded_is_reported(self):
        self.configure(red=True)
        self.assertIn(" RED ", self.tick())
        self.assertEqual(self.tick(), "")
        self.configure(sha="c" * 40, red=False, superseded=True)
        (self.root / "ref-count").write_text("0")
        self.assertIn(" SUPERSEDED ", self.tick())

    def test_reply_credentials_redacted_from_evidence(self):
        self.configure(secret_reply=True)
        self.assertIn(" GREEN ", self.tick())
        text = "".join(p.read_text() for p in (self.root / ".hermes/grok-web/evidence").glob("*.md"))
        self.assertNotIn("DO_NOT_LEAK_THIS_CREDENTIAL", text)
        self.assertIn("[REDACTED]", text)

    def test_corrupt_budget_fails_closed(self):
        self.assertIn(" GREEN ", self.tick())
        (self.root / ".hermes/grok-web/state/daily.json").write_text("{broken")
        self.configure(sha="b" * 40)
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_corrupt_state_shape_fails_closed(self):
        self.tick()
        state = self.root / ".hermes/grok-web/state/jobs.json"
        state.write_text("[]")
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_failed_evidence_write_keeps_sha_retryable(self):
        evidence = self.root / ".hermes/grok-web/evidence.log"
        evidence.mkdir(parents=True)
        self.assertIn(" BLOCKED ", self.tick())
        state = json.loads((self.root / ".hermes/grok-web/state/jobs.json").read_text())
        self.assertFalse(state[SHA]["done"])
        evidence.rmdir()
        self.assertIn(" GREEN ", self.tick())

    def test_exact_card_is_captured_and_has_safety_contract(self):
        self.tick()
        card = (self.root / "card.md").read_text()
        self.assertIn("PLAYWRIGHT_BASE_URL='" + URL + "'", card)
        for text in ("npm ci", "40 exploration steps", "20 minutes", "suite-stats", "exit_status", "phase=1 account=none"):
            self.assertIn(text, card)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    outcome = unittest.TextTestRunner(verbosity=2).run(suite)
    if outcome.wasSuccessful():
        print(f"ALL-GREEN: grokweb contract {outcome.testsRun} tests passed (offline stubs)")
    sys.exit(0 if outcome.wasSuccessful() else 1)
