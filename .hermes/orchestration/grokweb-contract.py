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
from unittest.mock import patch

sys.dont_write_bytecode = True
HERE = Path(os.environ.get("GROKWEB_CONTRACT_DIR", str(Path(__file__).resolve().parent)))
if not (HERE / "grokweb-parse.py").exists():
    HERE = Path.cwd() / ".hermes/orchestration"
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


def fenced(rows, artifact=True):
    text = "Public preview suite completed; public controls checked in headless Chromium.\n"
    text += "\n".join("```json\n" + json.dumps(row) + "\n```" for row in rows)
    stats = next((r for r in rows if r.get("kind") == "suite-stats"), None)
    if artifact and stats:
        text += "\n```playwright-output\n" + "\n".join(
            f"{stats[k]} {k}" for k in ("passed", "failed", "skipped"))
        text += f"\nPLAYWRIGHT_EXIT_CODE={stats['exit_status']}\n```"
    return text


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
        if scenario.get("recheck_error") and count:
            sys.exit(1)
        sha = scenario.get("refs", {}).get(endpoint.rsplit("/", 1)[-1], sha)
        if scenario.get("superseded") and count:
            sha = "b" * 40
        print(json.dumps({"object": {"sha": sha}}))
    elif "/commits/" in endpoint:
        sha = endpoint.rsplit("/", 1)[-1]
        print(json.dumps({"commit": {"committer": {"date": scenario.get("dates", {}).get(sha, "2026-11-11T00:00:00Z")}}}))
    elif "/statuses?" in endpoint:
        print(json.dumps([{"state": scenario.get("deploy_state", "success"),
                           "environment_url": scenario.get("url", "https://valgate-webapp-deploy-l0vu3000s-projects.vercel.app")}]))
    else:
        print(json.dumps([] if scenario.get("fallback", True) else
                         [{"id": 123, "environment": scenario.get("environment", "Preview"), "production_environment": scenario.get("production_environment", False)}]))
elif name == "curl":
    newline = "\r\n" if scenario.get("crlf") else "\n"
    print("HTTP/2 200", end=newline)
    for header in scenario.get("extra_headers", []):
        print(header, end=newline)
    if not scenario.get("no_marker"):
        print("x-vercel-git-commit-sha: " + scenario.get("marker", scenario.get("sha", "a" * 40)), end=newline)
    print(end=newline)
    print(scenario.get("body", "<html>pk_test_fixture</html>"))
    print(scenario.get("http", "200"), end="")
else:
    assert sys.argv[1:4] == ["-t", "grokbot,file", "-z"]
    prompt = sys.argv[4]
    card_path = json.loads(re.search(r"ONLY to read this one job card: (.+)\.", prompt).group(1))
    card = pathlib.Path(card_path).read_text()
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
    print(gate.fenced(rows, artifact=not scenario.get("no_artifact")))
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

    def test_incomplete_suite_is_parse_fail(self):
        self.assertEqual(self.verify(reply(passed=0, exit_status=1)), "PARSE-FAIL")

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

    def test_fabricated_without_artifact_fails(self):
        self.assertEqual(intake.verify(fenced(reply(), artifact=False), "test-run", SHA, URL)[0], "PARSE-FAIL")

    def test_project_hosts_only(self):
        for host in ("valgate-webapp-l0vu3000s-projects.vercel.app",
                     "evil-l0vu3000s-projects.vercel.app",
                     "valgate-webapp-git-staging-l0vu3000s-projects.vercel.app.evil.invalid"):
            self.assertFalse(intake.allowed_url("https://" + host))

    def test_non_ascii_hostname_rejected_before_normalization(self):
        # urlsplit lowercases Kelvin sign to ASCII k, hiding the original host.
        url = "https://valgate-webapp-git-\u212a-l0vu3000s-projects.vercel.app"
        self.assertFalse(intake.allowed_url(url))
        self.assertFalse(intake.allowed_url(url + "/login", final=True))

    def test_clerk_hash_route_intentionally_fails_closed(self):
        rows = reply()
        rows[1]["final_url"] = URL + "/login#/factor-one"
        self.assertFalse(intake.allowed_url(rows[1]["final_url"], final=True))
        self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_target_path_injection_rejected(self):
        for suffix in ("/login", "/'$(id)'</job-card>", "/?redirect_url=x", "#fragment"):
            self.assertFalse(intake.allowed_url(URL + suffix))

    def test_artifact_mismatch_cannot_green(self):
        text = fenced(reply()).replace("3 passed\n", "2 passed\n")
        self.assertEqual(intake.verify(text, "test-run", SHA, URL)[0], "PARSE-FAIL")
        text = fenced(reply()).replace("PLAYWRIGHT_EXIT_CODE=0", "PLAYWRIGHT_EXIT_CODE=1")
        self.assertEqual(intake.verify(text, "test-run", SHA, URL)[0], "PARSE-FAIL")

    def test_native_results_json_crosscheck(self):
        text = fenced(reply(), artifact=False)
        native = {"stats": {"expected": 3, "unexpected": 0, "skipped": 5, "flaky": 0}}
        artifact = "\n```results.json\n" + json.dumps(native) + "\n```\nPLAYWRIGHT_EXIT_CODE=0\n"
        self.assertEqual(intake.verify(text + artifact, "test-run", SHA, URL)[0], "GREEN")
        artifact = artifact.replace('"expected": 3', '"expected": 2')
        self.assertEqual(intake.verify(text + artifact, "test-run", SHA, URL)[0], "PARSE-FAIL")

    def test_dual_artifacts_allow_matching_exit_lines_only(self):
        native = {"stats": {"expected": 3, "unexpected": 0, "skipped": 5, "flaky": 0}}
        text = fenced(reply()) + "\n```results.json\n" + json.dumps(native) + "\n```\nPLAYWRIGHT_EXIT_CODE=0\n"
        self.assertEqual(intake.verify(text, "test-run", SHA, URL)[0], "GREEN")
        self.assertEqual(intake.verify(text.replace('"expected": 3', '"expected": 2'),
                                      "test-run", SHA, URL)[0], "PARSE-FAIL")
        contradictory = text.rsplit("PLAYWRIGHT_EXIT_CODE=0", 1)[0] + "PLAYWRIGHT_EXIT_CODE=1\n"
        self.assertEqual(intake.verify(contradictory, "test-run", SHA, URL)[0], "PARSE-FAIL")

    def test_raw_summary_can_have_comma_separators(self):
        text = fenced(reply()).replace("3 passed\n0 failed\n5 skipped", "3 passed, 0 failed, 5 skipped")
        self.assertEqual(intake.verify(text, "test-run", SHA, URL)[0], "GREEN")

    def test_prose_summary_required(self):
        text = fenced(reply()).split("\n", 1)[1]
        self.assertEqual(intake.verify(text, "test-run", SHA, URL)[0], "PARSE-FAIL")

    def test_preview_suite_size_and_skip_count(self):
        for passed, skipped in ((4, 5), (3, 4), (8, 0)):
            rows = reply(passed=passed)
            rows[0]["skipped"] = skipped
            self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_final_login_query_and_trailing_slash(self):
        rows = reply()
        rows[1]["final_url"] = URL + "/login/?redirect_url=https%3A%2F%2Fexample.test%2F&flow=login"
        for row in rows:
            row["url"] = URL + "/"
        self.assertEqual(self.verify(rows), "GREEN")
        for suffix in ("#fragment", "#", "?q=$(id)", "?q='evil'", ";id", "?q=`id`"):
            rows[1]["final_url"] = URL + "/login" + suffix
            self.assertEqual(self.verify(rows), "PARSE-FAIL")

    def test_screenshot_count_and_filenames(self):
        rows = reply()
        shots = dict(rows[0], kind="screenshots", screenshots=[f"shot-{i}.png" for i in range(5)])
        self.assertEqual(self.verify(rows + [shots]), "GREEN")
        shots["screenshots"].append("sixth.png")
        self.assertEqual(self.verify(rows + [shots]), "PARSE-FAIL")
        for name in ("../shot.png", "shot.jpg", "", "https://example.test/shot.png", 3):
            shots["screenshots"] = [name]
            self.assertEqual(self.verify(rows + [shots]), "PARSE-FAIL")

    def test_artifact_exit_alone_and_malformed_native_report_fail(self):
        text = fenced(reply(), artifact=False)
        for raw in ("```playwright-output\nPLAYWRIGHT_EXIT_CODE=0\n```",
                    "```results.json\n[]\n```\nPLAYWRIGHT_EXIT_CODE=0",
                    '```results.json\n{"stats": []}\n```\nPLAYWRIGHT_EXIT_CODE=0'):
            self.assertEqual(intake.verify(text + "\n" + raw, "test-run", SHA, URL)[0], "PARSE-FAIL")


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
        for key in ("GROKWEB_STATE_DIR", "GROKWEB_MAX_PER_DAY", "GROKWEB_TIMEOUT_S", "GROKWEB_STAGING_URL", "GROKWEB_ATTEMPTS", "GROKWEB_LOCK_FD"):
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

    def test_curl_include_crlf_headers_are_accepted(self):
        self.configure(crlf=True)
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_guard_accepts_untranslated_crlf_response(self):
        response = f"HTTP/2 200\r\nx-vercel-git-commit-sha: {SHA}\r\n\r\n<html>pk_test_fixture</html>\n200"
        with patch.object(intake, "command", return_value=response):
            intake.guard(URL, SHA)

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

    def test_non_ascii_deploy_host_refused_before_curl(self):
        self.configure(fallback=False, url="https://valgate-webapp-git-\u212a-l0vu3000s-projects.vercel.app")
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("curl"), [])
        self.assertEqual(self.calls("hermes"), [])

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
        self.assertIn("daily-cap", self.logs())

    def test_timeout_blocked_then_retry_unique_run_and_message_id(self):
        self.env["GROKWEB_TIMEOUT_S"] = "1"
        self.configure(timeout=True)
        first = self.tick()
        self.assertIn(" BLOCKED ", first)
        self.configure(timeout=False)
        second = self.tick()
        self.assertIn(" GREEN ", second)
        self.assertNotEqual(first.split()[1], second.split()[1])
        prompts = [c[-1] for c in self.calls("hermes")]
        self.assertNotEqual(prompts[0], prompts[1])
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
            self.scenario = dict(scenario, sha=f"{len(self.calls('hermes')) + 1:040x}")
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
        out = self.tick()
        self.assertIn(" GREEN ", out)
        self.assertIn(" SUPERSEDED ", out)
        self.assertNotIn("RESULT: " + "c" * 40 + "-attempt-1 SUPERSEDED", out)

    def test_reply_credentials_redacted_from_evidence(self):
        self.configure(secret_reply=True)
        self.assertIn(" GREEN ", self.tick())
        text = "".join(p.read_text() for p in (self.root / ".hermes/grok-web/state/artifacts").glob("*.reply.json"))
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
        self.assertIn("include EXACTLY ONE artifact", card)
        self.assertIn("staging-alias resolves only if the page exposes a deployment sha marker; otherwise the run stays BLOCKED-retry until the marker exists", card)

    def test_stale_alias_blocks_without_spending_budget_and_retries(self):
        self.configure(no_marker=True)
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("hermes"), [])
        self.assertFalse((self.root / ".hermes/grok-web/state/daily.json").exists())
        self.configure(no_marker=False, marker="b" * 40)
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("hermes"), [])
        self.configure(marker=SHA)
        self.assertIn(" GREEN ", self.tick())

    def test_guard_uses_html_not_header_for_test_key(self):
        self.configure(body="<html>no key</html>", extra_headers=["x-custom: pk_test_header_only"])
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("hermes"), [])

    def test_alias_explicit_html_sha_marker_is_accepted(self):
        self.configure(no_marker=True, body=f'<html>pk_test_fixture<meta name="vercel-git-commit-sha" content="{SHA}"></html>')
        self.assertIn(" GREEN ", self.tick())

    def test_production_flag_and_named_environment(self):
        self.env["GROKWEB_REFS"] = "main"
        self.configure(fallback=False, production_environment=True)
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("curl"), [])
        self.configure(production_environment=False, environment="Production – valgate-webapp")
        self.assertIn(" BLOCKED ", self.tick())
        self.assertEqual(self.calls("curl"), [])
        self.configure(environment="Preview/custom-staging")
        self.assertIn(" GREEN ", self.tick())

    def test_attempt_cap_no_third_send_and_unique_results(self):
        self.configure(no_artifact=True)
        self.assertIn(" PARSE-FAIL ", self.tick())
        self.assertIn(" PARSE-FAIL ", self.tick())
        self.assertIn(" SUPERSEDED-BLOCKED ", self.tick())
        self.assertEqual(self.tick(), "")
        self.assertEqual(len(self.calls("hermes")), 2)
        daily = json.loads((self.root / ".hermes/grok-web/state/daily.json").read_text())
        self.assertEqual(sum(daily.values()), 2)
        results = [line for line in self.logs().splitlines() if line.startswith("RESULT:")]
        self.assertEqual(len(results), 3)
        self.assertEqual(len({line.split()[1] for line in results}), 3)

    def test_attempt_cap_is_configurable(self):
        self.env["GROKWEB_ATTEMPTS"] = "1"
        self.configure(empty=True)
        self.tick()
        self.assertIn(" SUPERSEDED-BLOCKED ", self.tick())
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_newest_refs_first_do_not_starve(self):
        self.env["GROKWEB_REFS"] = "old new"
        self.env["GROKWEB_MAX_PER_DAY"] = "1"
        self.configure(fallback=False, refs={"old": SHA, "new": "b" * 40},
                       dates={SHA: "2026-11-10T00:00:00Z", "b" * 40: "2026-11-11T00:00:00Z"})
        self.tick()
        card = (self.root / "card.md").read_text()
        self.assertIn("sha=" + "b" * 40, card)
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_verdict_retained_when_recheck_fails(self):
        self.configure(recheck_error=True)
        out = self.tick()
        self.assertIn(" GREEN ", out)
        self.assertIn("url-recheck-failed", out)
        self.assertIn(" GREEN ", self.logs())
        state = json.loads((self.root / ".hermes/grok-web/state/jobs.json").read_text())
        self.assertTrue(state[SHA]["done"])

    def test_red_retained_after_ref_moves(self):
        self.configure(red=True, superseded=True)
        out = self.tick()
        self.assertIn(" RED ", out)
        results = [line for line in self.logs().splitlines() if line.startswith("RESULT:")]
        self.assertEqual(len(results), 1)
        self.assertIn(" RED ", results[0])
        self.assertIn("INFO:", self.logs())

    def test_evidence_path_fixed_and_infra_noise_once_daily(self):
        self.env["GROKWEB_STATE_DIR"] = str(self.root / "custom-state")
        self.configure(no_marker=True)
        self.tick()
        self.tick()
        self.assertEqual(len(self.logs().splitlines()), 1)
        self.assertIn("BLOCKED-summary:", self.logs())
        self.assertFalse((self.root / "evidence.log").exists())
        self.assertFalse((self.root / ".hermes/grok-web/evidence").exists())
        self.configure(no_marker=False)
        self.assertIn(" GREEN ", self.tick())
        self.assertEqual(sum(line.startswith("RESULT:") for line in self.logs().splitlines()), 1)
        self.assertTrue((self.root / "custom-state/jobs.json").exists())

    def test_relay_does_not_receive_schema_in_prompt(self):
        self.tick()
        prompt = self.calls("hermes")[0][-1]
        self.assertNotIn("suite-stats", prompt)
        self.assertNotIn('"run_id":', prompt)
        card = (self.root / "card.md").read_text()
        for text in ("npx playwright install chromium", ">13 min", "poll until done", "headless Playwright", "at most 5 PNGs", "playwright-output", "results.json"):
            self.assertIn(text, card)
        self.assertNotIn("--with-deps", card)

    def test_direct_locked_flag_still_takes_lock(self):
        self.configure(timeout=True)
        self.env["GROKWEB_TIMEOUT_S"] = "1"
        first = subprocess.Popen(["sh", str(HERE / "grokweb-watcher.sh"), "--locked"], env=self.env,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: first.poll() is None and first.kill())
        deadline = time.monotonic() + 5
        while not self.calls("hermes") and time.monotonic() < deadline:
            time.sleep(.02)
        self.assertTrue(self.calls("hermes"))
        self.assertEqual(self.tick(), "")
        first.communicate(timeout=5)
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_watch_ref_obeys_lock_and_retries_after_release(self):
        import fcntl
        state = self.root / ".hermes/grok-web/state"
        state.mkdir(parents=True)
        argv = [sys.executable, str(HERE / "grokweb-parse.py"), "--watch-ref", "staging"]
        with (state / "watcher.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            p = subprocess.run(argv, env=self.env, text=True, capture_output=True, timeout=5)
            self.assertEqual((p.returncode, p.stdout, p.stderr), (0, "", ""))
            self.assertEqual(self.calls("gh"), [])
            self.assertFalse((state / "jobs.json").exists())
        p = subprocess.run(argv, env=self.env, text=True, capture_output=True, timeout=10)
        self.assertEqual((p.returncode, p.stderr), (0, ""))
        self.assertIn(" GREEN ", p.stdout)
        self.assertEqual(len(self.calls("hermes")), 1)
        self.assertEqual(self.tick(), "")

    def test_watch_ref_preserves_requested_branch(self):
        self.configure(fallback=False, refs={"custom": "b" * 40})
        p = subprocess.run([sys.executable, str(HERE / "grokweb-parse.py"), "--watch-ref", "custom"],
                           env=self.env, text=True, capture_output=True, timeout=10)
        self.assertEqual((p.returncode, p.stderr), (0, ""))
        self.assertIn(" GREEN ", p.stdout)
        card = (self.root / "card.md").read_text()
        self.assertIn("branch=custom", card)
        self.assertIn("sha=" + "b" * 40, card)

    def test_lock_survives_parent_death_while_transport_running(self):
        self.configure(timeout=True)
        self.env["GROKWEB_TIMEOUT_S"] = "1"
        first = subprocess.Popen(["sh", str(HERE / "grokweb-watcher.sh")], env=self.env,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: first.poll() is None and first.kill())
        deadline = time.monotonic() + 5
        while not self.calls("hermes") and time.monotonic() < deadline:
            time.sleep(.02)
        self.assertTrue(self.calls("hermes"))
        first.kill()
        self.assertEqual(self.tick(), "")
        first.communicate(timeout=5)
        self.assertEqual(len(self.calls("hermes")), 1)

    def test_missing_python_is_successful_noop(self):
        import shutil
        (self.bin / "dirname").symlink_to(shutil.which("dirname"))
        env = dict(self.env, PATH=str(self.bin))
        p = subprocess.run(["/bin/sh", str(HERE / "grokweb-watcher.sh")], env=env,
                           text=True, capture_output=True, timeout=5)
        self.assertEqual((p.returncode, p.stdout, p.stderr), (0, "", ""))


class CommandContract(unittest.TestCase):
    def test_transport_does_not_inherit_flock_fd(self):
        import fcntl
        with tempfile.TemporaryDirectory(prefix="grokweb-fd-") as directory:
            with (Path(directory) / "watcher.lock").open("a") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                os.set_inheritable(lock.fileno(), True)
                parent = (f"import os; fd={lock.fileno()}\n"
                          "try: os.fstat(fd)"
                          "\nexcept OSError: print('lock-fd-closed')"
                          "\nelse: print('lock-fd-inherited')")
                self.assertEqual(intake.command([sys.executable, "-c", parent]).strip(), "lock-fd-closed")

    def test_timeout_is_bounded_when_detached_child_holds_stdout(self):
        import signal
        with tempfile.TemporaryDirectory(prefix="grokweb-orphan-") as directory:
            pid_path = Path(directory) / "pid"
            # This detached grandchild keeps the stdout pipe alive after the
            # parent's process group is killed. communicate must still return.
            child = "import time; time.sleep(20)"
            parent = ("import pathlib, subprocess, sys, time; "
                      f"p=subprocess.Popen([sys.executable, '-c', {child!r}], start_new_session=True); "
                      f"pathlib.Path({str(pid_path)!r}).write_text(str(p.pid)); time.sleep(20)")
            start = time.monotonic()
            try:
                with self.assertRaises(TimeoutError):
                    intake.command([sys.executable, "-c", parent], timeout=.5)
                self.assertLess(time.monotonic() - start, 3)
            finally:
                if pid_path.exists():
                    try:
                        os.killpg(int(pid_path.read_text()), signal.SIGKILL)
                    except ProcessLookupError:
                        pass


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    outcome = unittest.TextTestRunner(verbosity=2).run(suite)
    if outcome.wasSuccessful():
        print(f"ALL-GREEN: grokweb contract {outcome.testsRun} tests passed (offline stubs)")
    sys.exit(0 if outcome.wasSuccessful() else 1)
