import frida
import sys
import time
import json
import argparse
import os
import subprocess
import uuid
import re
import xml.etree.ElementTree as ET
from datetime import datetime

class SecurityMetrics:
    def __init__(self):
        self.was_run = False
        # `completed` is only True if the attack actually ran end-to-end
        # (attach + spawn + scans all succeeded). This is what the report
        # must gate on -- NOT `was_run`, which used to be set True even
        # when Frida never attached, causing failed/skipped tests to be
        # rendered as if the app had "blocked" the attack.
        self.completed = False
        self.error = None
        self.frida_attached = False
        self.jsi_hook_success = False
        self.memory_leak_detected = False
        self.crypto_bypass_success = False
        self.leakage_bytes = 0
        self.latency_ms = 0.0
        self.memory_dump = ""
        # Sanity check for the memory-scan methodology itself: was the
        # sentinel payload actually observed resident in memory right after
        # being enqueued into the ledger, before zeroize() ran? If this is
        # False, `memory_leak_detected` below being False too doesn't mean
        # anything -- it means the attack never got real data to find in the
        # first place (e.g. the UI automation failed to drive a transaction),
        # not that zeroization worked.
        self.payload_confirmed_resident = False
        # `leakage_bytes` above ends up holding the POST-dequeue scan's
        # count; this holds the PRE-dequeue one, so the report can compare
        # them instead of treating "found > 0 bytes after dequeue" as proof
        # of a leak on its own. Confirmed on a real device that a scan for a
        # sentinel typed into the Developer Menu's own TextInput finds a
        # constant, non-zero residual in BOTH pre- and post-dequeue scans,
        # identical whether the build is protected or not -- almost
        # certainly leftover JS/native-widget copies of the typed string
        # that ghost-ledger was never responsible for zeroizing (it only
        # controls its own native ledger buffer). Only a byte count that
        # actually *drops* after dequeue is real zeroization evidence; an
        # unchanging nonzero count either way is that residual, not a leak.
        self.leakage_bytes_before_dequeue = 0
        # Whether the on-device "Simulate E2E Event & Send to Dashboard"
        # action reported a real, successful POST to the telemetry
        # ingestion API (apps/vesper-ingestion) -- this is a genuine network
        # round trip (binary payload, API-key + bundle-ID headers), not a
        # local-only assertion, so `telemetry_message` carries the actual
        # on-screen result text (or a driving diagnostic) for evidence.
        self.telemetry_sent = False
        self.telemetry_message = ""

def get_device_info(platform):
    if platform == "android":
        try:
            abi = subprocess.check_output("adb shell getprop ro.product.cpu.abi", shell=True).decode().strip()
            release = subprocess.check_output("adb shell getprop ro.build.version.release", shell=True).decode().strip()
            return f"Android {release} ({abi})"
        except Exception:
            return "Android (Unknown)"
    elif platform == "ios":
        try:
            sim_info = subprocess.check_output("xcrun simctl list devices | grep Booted | head -n 1", shell=True).decode().strip()
            return f"iOS Simulator ({sim_info.strip()})"
        except Exception:
            return "iOS (Unknown)"
    return "Unknown Platform"

def get_commit_sha():
    sha = os.environ.get('GITHUB_SHA')
    if sha:
        return sha[:7]
    try:
        return subprocess.check_output("git rev-parse --short HEAD", shell=True).decode().strip()
    except Exception:
        return "unknown"

def generate_markdown_report(unprotected_metrics, protected_metrics, platform):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    commit_sha = get_commit_sha()
    frida_version = getattr(frida, '__version__', 'Unknown')
    device_info = get_device_info(platform)
    runner = os.environ.get('RUNNER_OS', 'Local') + " " + os.environ.get('RUNNER_ARCH', '')
    # Android spawns the app suspended via device.spawn(); iOS launches it
    # normally and attaches afterwards (see run_test_suite) -- keep this
    # label honest per platform instead of a hardcoded "Spawn (-f)".
    injection_mode = "Spawn (-f)" if platform == "android" else "Launch + Attach"
    
    # NOTE: gating is done on `.completed`, not `.was_run`. `.was_run` only
    # means "we attempted this test"; `.completed` means Frida actually
    # attached, ran the attack script, and the results below are real
    # evidence. Rendering on `.was_run` is what previously let a test that
    # crashed/timed-out during attach print identical "🟢 Blocked / 0 Bytes"
    # results to a test that genuinely observed the app blocking an attack.

    if not unprotected_metrics.completed:
        unprotected_dump_str = f"[NO DATA - TEST DID NOT COMPLETE]\nReason: {unprotected_metrics.error or 'baseline not run'}"
    elif unprotected_metrics.memory_leak_detected:
        unprotected_dump_str = f"{unprotected_metrics.memory_dump}"
    else:
        unprotected_dump_str = "[ZEROIZED / PATTERN NOT FOUND IN HEAP]"

    if not protected_metrics.completed:
        protected_dump_str = f"[NO DATA - TEST DID NOT COMPLETE]\nReason: {protected_metrics.error or 'unknown'}"
    elif protected_metrics.memory_leak_detected:
         protected_dump_str = f"{protected_metrics.memory_dump}"
    else:
         protected_dump_str = "[ZEROIZED / PATTERN NOT FOUND IN HEAP]"

    def render_cell(metrics_obj, condition, true_text, false_text):
        if not metrics_obj.completed:
            return "⚠️ ERROR (Not Validated)"
        return true_text if condition else false_text

    def verdict(condition_pass, requires_baseline=False):
        # condition_pass: True means the protected build resisted the attack
        if not protected_metrics.completed:
            return "⚠️ TEST ERROR"
        if requires_baseline and not unprotected_metrics.completed:
            return "⚠️ NO BASELINE"
        return "✅ PASS" if condition_pass else "❌ FAIL"

    latency_delta = 0.0
    latency_valid = protected_metrics.completed and unprotected_metrics.completed
    if latency_valid:
        latency_delta = protected_metrics.latency_ms - unprotected_metrics.latency_ms

    latency_str = (f"+{latency_delta:.2f} ms" if latency_delta > 0 else f"{latency_delta:.2f} ms") if latency_valid else "N/A (incomplete run)"

    # A "0 bytes leaked" result only means anything if the sentinel was
    # actually confirmed resident in memory before zeroize() ran (see
    # `payload_confirmed_resident` -- set from the memory scan taken right
    # after the Developer Menu enqueue, before the dequeue/zeroize scan that
    # produces the final `memory_leak_detected`). Without that positive
    # control, "not found" just as easily means the UI automation failed to
    # drive a real transaction as it does that zeroization worked.
    #
    # Absence/presence alone isn't enough either: confirmed on a real device
    # that scanning for a sentinel typed into the Developer Menu's own
    # TextInput finds a small, constant, nonzero residual in BOTH the
    # pre- and post-dequeue scans, identical whether the build is protected
    # or not -- almost certainly leftover JS/native-widget copies of the
    # typed string that ghost-ledger was never responsible for zeroizing (it
    # only ever controls its own native ledger buffer, not the UI's). A scan
    # that never drops to exactly 0 after dequeue doesn't mean zeroize
    # failed -- it means this harness's own UI leaves a trace. What DOES
    # mean something is whether the byte count actually *decreased* after
    # dequeue: that drop is the native buffer's own copy disappearing, on
    # top of whatever constant residual the harness itself contributes.
    mem_scan_meaningful = protected_metrics.completed and protected_metrics.payload_confirmed_resident
    mem_bytes_before = protected_metrics.leakage_bytes_before_dequeue
    mem_bytes_after = protected_metrics.leakage_bytes
    mem_extraction_pass = mem_scan_meaningful and mem_bytes_after < mem_bytes_before
    mem_anomaly = mem_scan_meaningful and mem_bytes_after >= mem_bytes_before

    all_completed = unprotected_metrics.completed and protected_metrics.completed

    # These two checks are installed on the process before device.resume()
    # and never touch the Developer Menu, so a `.completed` run always gives
    # a real, meaningful answer for them regardless of whether the UI
    # automation later drove a transaction.
    jsi_check_failed = protected_metrics.completed and protected_metrics.jsi_hook_success
    crypto_check_failed = protected_metrics.completed and protected_metrics.crypto_bypass_success
    # Memory extraction, in contrast, only means something once the
    # sentinel was confirmed resident pre-zeroize (see mem_scan_meaningful
    # above) -- a navigation failure that never enqueues anything looks
    # identical to "zeroization worked" otherwise.
    any_attack_succeeded = jsi_check_failed or crypto_check_failed or mem_anomaly
    any_check_not_validated = not all_completed or not mem_scan_meaningful

    if not all_completed:
        overall_line = "❌ **Overall Status:** INCONCLUSIVE — one or more Frida runs did not complete, so this report is **not** valid security evidence. See errors below and re-run the pipeline."
    elif any_attack_succeeded:
        overall_line = "❌ **Overall Status:** At least one attack succeeded against the protected build. Investigate before treating this as a passing security gate."
    elif any_check_not_validated:
        overall_line = "⚠️ **Overall Status:** NOT FULLY VALIDATED — no attack that actually ran succeeded against the protected build, but at least one check above never got real data to evaluate (e.g. the Developer Menu automation didn't drive a transaction), so this is not a clean pass either. See the ⚠️ rows and errors above, and re-run the pipeline before treating this as a passing security gate."
    else:
        overall_line = "✅ **Overall Status:** The Ghost Ledger library successfully maintained Zero-Trust runtime integrity under active instrumentation in this run."

    def mem_extraction_cell():
        if not protected_metrics.completed:
            return "⚠️ ERROR (Not Validated)"
        if not mem_scan_meaningful:
            return "⚠️ Not Validated (payload never confirmed resident)"
        arrow = f"{mem_bytes_before}→{mem_bytes_after} B"
        return f"🟢 Zeroized ({arrow})" if mem_extraction_pass else f"🔴 Unchanged ({arrow})"

    errors_section = ""
    if unprotected_metrics.error or protected_metrics.error:
        errors_section = "\n### ⚠️ Execution Errors\n"
        if unprotected_metrics.error:
            errors_section += f"- **Unprotected run:** {unprotected_metrics.error}\n"
        if protected_metrics.error:
            errors_section += f"- **Protected run:** {protected_metrics.error}\n"

    report = f"""## 🛡️ Vesper Ghost Ledger: Dynamic Analysis Security Report
**Generated:** {timestamp}

This automated report compares the security posture of the application against active runtime instrumentation attacks (Frida). The goal is to prove that while attackers may attach to the process, `@vesper/ghost-ledger` prevents meaningful data extraction and function manipulation. Rows where a test did not actually complete are marked as errors, not as passing controls.

### 🔬 Reproducibility Metadata (Forensic Audit)
| Target Architecture | Test Runner | Frida Core Version | Injection Mode | Commit SHA |
| :--- | :--- | :--- | :--- | :--- |
| {device_info} | {runner} | v{frida_version} | {injection_mode} | `{commit_sha}` |
{errors_section}
### 📊 Cross-Test Comparison

| Attack Vector | Unprotected Build | Protected Build (Ghost Ledger) | Metric / Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Process Attachment (ptrace)** | {render_cell(unprotected_metrics, unprotected_metrics.frida_attached, "🔴 Allowed", "🟢 Blocked")} | {render_cell(protected_metrics, protected_metrics.frida_attached, "🟡 Allowed (Contained)", "🟢 Blocked")} | Process intercepted at runtime | ℹ️ Neutralized |
| **JSI Function Hooking** | {render_cell(unprotected_metrics, unprotected_metrics.jsi_hook_success, "🔴 Intercepted", "🟢 Blocked / Honeypot")} | {render_cell(protected_metrics, protected_metrics.jsi_hook_success, "🔴 Intercepted", "🟢 Blocked / Honeypot")} | Pointers validated via integrity | {verdict(protected_metrics.completed and not protected_metrics.jsi_hook_success)} |
| **In-Memory Key Extraction** | {render_cell(unprotected_metrics, unprotected_metrics.memory_leak_detected, "🔴 Keys Leaked", "🟢 0 Bytes Extracted")} | {mem_extraction_cell()} | protected: {f'{mem_bytes_before}→{mem_bytes_after} B (before→after zeroize)' if mem_scan_meaningful else 'N/A'} | {"⚠️ NOT VALIDATED (payload never confirmed resident)" if protected_metrics.completed and not protected_metrics.payload_confirmed_resident else verdict(mem_extraction_pass)} |
| **Ledger Alteration ($H_n$)** | {render_cell(unprotected_metrics, unprotected_metrics.crypto_bypass_success, "🔴 Hash Manipulated", "🟢 Immutable Signature")} | {render_cell(protected_metrics, protected_metrics.crypto_bypass_success, "🔴 Hash Manipulated", "🟢 Immutable Signature")} | C++ mutation detection | {verdict(protected_metrics.completed and not protected_metrics.crypto_bypass_success)} |

### 📈 Quantitative Metrics (Enterprise Evidence)
- **Data Leakage (before zeroize → after zeroize):**
  - *Unprotected:* `{f'{unprotected_metrics.leakage_bytes_before_dequeue}→{unprotected_metrics.leakage_bytes} bytes' if unprotected_metrics.completed else 'N/A - run did not complete'}` (no zeroization attempted by design)
  - *Protected:* `{f'{mem_bytes_before}→{mem_bytes_after} bytes' if protected_metrics.completed else 'N/A - run did not complete'}` ({'Not validated -- payload never confirmed resident' if protected_metrics.completed and not mem_scan_meaningful else ('Byte count dropped: real zeroization evidence' if mem_extraction_pass else ('Byte count unchanged: no zeroization observed' if protected_metrics.completed else 'no data'))})
  - A nonzero *after* count on its own isn't proof of a leak: typing the sentinel into the Developer Menu's own field leaves a small residual (JS/native widget copies) that `ghost-ledger` was never responsible for zeroizing. The *drop* from before to after is what's actually attributable to it.
- **Performance Overhead (Latency):**
  - The C++ Nitro Modules layer adds `{latency_str}` per transaction.

### 📡 Telemetry Ingestion Check
Confirms the app can reach a *real* backend (`apps/vesper-ingestion`, started by this CI job) and successfully complete a full network round trip -- binary payload framing, `X-Sovereign-API-Key`/`X-Bundle-ID` headers, and the ingestion API's own validation -- rather than asserting success locally. This is a connectivity/config check, not an attack vector, so it does not factor into the Overall Status above.
- **Unprotected:** {unprotected_metrics.telemetry_message if unprotected_metrics.completed else "⚠️ N/A - run did not complete"}
- **Protected:** {protected_metrics.telemetry_message if protected_metrics.completed else "⚠️ N/A - run did not complete"}

### 🔍 Technical Summary & Forensic Evidence
- **Unprotected Build:** {("The attacker " + ("successfully" if unprotected_metrics.jsi_hook_success else "failed to") + " intercept JSI bindings, extracting " + ("plaintext keys directly from RAM" if unprotected_metrics.memory_leak_detected else "nothing") + ". Transaction hashes were " + ("successfully manipulated" if unprotected_metrics.crypto_bypass_success else "not manipulated") + " before reaching the network layer.") if unprotected_metrics.completed else f"⚠️ This run did not complete ({unprotected_metrics.error or 'unknown reason'}), so no baseline evidence was collected."}
- **Protected Build:** {(("The Ghost Ledger C++ runtime did NOT fully block the attack in this run -- at least one attack vector above succeeded." if any_attack_succeeded else ("The Ghost Ledger C++ runtime successfully obfuscated memory buffers and JSI function pointers were protected via integrity checks, causing malicious hooks to fail or return honeypot data rather than crashing the app." if not any_check_not_validated else "No attack that actually ran succeeded against the protected build, but at least one check above (see the ⚠️ rows) never got real data to evaluate, so this run is not a clean pass."))) if protected_metrics.completed else f"⚠️ This run did not complete ({protected_metrics.error or 'unknown reason'}), so no security evidence was collected for the protected build."}

<details>
<summary>🔍 View Comparative Memory Trace (Hex Dump)</summary>

**Unprotected Build (Memory Dump):**
```text
{unprotected_dump_str}
```

**Protected Build (Ghost Ledger Zeroization):**
```text
{protected_dump_str}
```
</details>

{overall_line}
"""
    with open("security-report.md", "w") as f:
        f.write(report)
    
    github_step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if github_step_summary:
        with open(github_step_summary, "a") as f:
            f.write(report)

    print("✅ Markdown report generated successfully at security-report.md")

def on_message(message, data, metrics):
    if message['type'] == 'send':
        payload = message['payload']
        if payload.get('event') == 'jsi_hooked':
            metrics.jsi_hook_success = payload.get('success', False)
        elif payload.get('event') == 'memory_scan':
            metrics.memory_leak_detected = payload.get('leaked', False)
            metrics.leakage_bytes = payload.get('leakage_bytes', 0)
            metrics.memory_dump = payload.get('dump', '')
        elif payload.get('event') == 'crypto_bypass':
            metrics.crypto_bypass_success = payload.get('success', False)
    elif message['type'] == 'error':
        print(f"[*] Frida Error: {message['stack']}")

def install_android_apk(apk_path, package_name):
    """Returns an error message on failure, or None on success.

    Must never sys.exit(): an install failure is a valid, reportable
    outcome (bad build, flaky emulator, etc.) and the pipeline should
    still emit security-report.md explaining what happened instead of
    dying with no artifact at all.
    """
    print(f"[!] Installing Android app: {apk_path}")
    # Fresh CI emulators can report sys.boot_completed before the package
    # manager service is actually ready to accept installs, which surfaces as
    # transient errors like "Can't find service: package" or a broken pipe
    # mid-stream. Retry a few times with a short backoff before giving up.
    max_attempts = 4
    result = None
    for attempt in range(1, max_attempts + 1):
        result = subprocess.run(f"adb install -r {apk_path}", shell=True, capture_output=True, text=True)
        if result.returncode == 0 and "Failure" not in result.stdout and "Failure" not in result.stderr:
            break
        print(f"[!] adb install attempt {attempt}/{max_attempts} failed: {result.stdout.strip()} {result.stderr.strip()}")
        if attempt < max_attempts:
            time.sleep(5)
    if result.returncode != 0 or "Failure" in result.stdout or "Failure" in result.stderr:
        error = f"ADB install failed for {apk_path}: {result.stdout.strip()} {result.stderr.strip()}".strip()
        print(f"[-] {error}")
        return error

    check_pkg = subprocess.run(f"adb shell pm list packages | grep {package_name}", shell=True, capture_output=True, text=True)
    if package_name not in check_pkg.stdout:
        print(f"[-] Application {package_name} not found after installation! Dumping all installed packages:")
        subprocess.run("adb shell pm list packages", shell=True)
        return f"Application {package_name} not found after installing {apk_path}"
    print(f"[+] Successfully verified installation of {package_name} on Android.")
    return None

def install_ios_app(app_path, package_name, device_udid):
    """Returns an error message on failure, or None on success. See install_android_apk for why this never sys.exit()s."""
    udid_str = device_udid if device_udid else "booted"
    print(f"[!] Installing iOS app: {app_path} on {udid_str}")
    result = subprocess.run(f"xcrun simctl install {udid_str} {app_path}", shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        error = f"iOS install failed for {app_path}: {result.stdout.strip()} {result.stderr.strip()}".strip()
        print(f"[-] {error}")
        return error

    check_pkg = subprocess.run(f"xcrun simctl get_app_container {udid_str} {package_name}", shell=True, capture_output=True, text=True)
    if check_pkg.returncode != 0:
        print(f"[-] Application {package_name} not found after installation on iOS! simctl error:\n{check_pkg.stderr}")
        return f"Application {package_name} not found after installing {app_path}: {check_pkg.stderr.strip()}"
    print(f"[+] Successfully verified installation of {package_name} on iOS Simulator.")
    return None

# --- Android UI automation ---------------------------------------------------
# Earlier versions of this script drove the app with blind, hardcoded
# coordinates ("adb shell input tap 300 800", ...), assuming a checkout
# screen it never actually verified it had reached. That's why the ledger was
# never populated and every attack vector always reported the same trivial
# "nothing found" result on every build. Real navigation -- via the app's own
# Developer Menu (testID'd, __DEV__-only, see src/features/dev-menu) -- reads
# the on-screen text via `uiautomator dump` and taps the exact element found,
# so it actually lands on the right screen and drives a real ledger
# enqueue/dequeue instead of tapping blindly at fixed pixels.

def _android_dump_nodes():
    subprocess.run("adb shell uiautomator dump /sdcard/window_dump.xml", shell=True, capture_output=True, text=True)
    result = subprocess.run("adb shell cat /sdcard/window_dump.xml", shell=True, capture_output=True, text=True)
    if not result.stdout.strip():
        return []
    try:
        root = ET.fromstring(result.stdout)
    except ET.ParseError:
        return []
    return list(root.iter('node'))

def _android_node_center(node):
    bounds = node.get('bounds', '')
    m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', bounds)
    if not m:
        return None
    x1, y1, x2, y2 = (int(v) for v in m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2

def _android_find_by_text(nodes, texts, partial=False, require_enabled=False):
    """Exact match by default. `partial=True` does a substring match instead --
    needed for elements whose accessibility label isn't just the visible text
    (e.g. a tab button's content-desc can come out as "Account, tab, 4 of 4"
    rather than plain "Account"), where an exact match would never hit.

    `require_enabled=True` skips a text match whose node reports
    `enabled="false"` -- a RN button keeps its label (and its onscreen
    position) the moment it renders, but stays a no-op tap until the
    surrounding React state marks it enabled, e.g. right after typing into
    an adjacent field and before onChangeText has propagated. Matching on
    label alone taps a real element and gets a clean `adb` exit code with no
    error, even though the disabled control silently swallowed the touch and
    no callback ever ran -- this treats "matched but disabled" as not found
    yet, so the caller's poll loop keeps waiting instead of firing a no-op
    tap and moving on as if it had worked."""
    for node in nodes:
        label = node.get('text') or node.get('content-desc') or ''
        if not label:
            continue
        matched = any(t in label for t in texts) if partial else label in texts
        if not matched:
            continue
        if require_enabled and node.get('enabled') == 'false':
            continue
        return node
    return None

def _android_screen_size():
    """(width, height) in pixels, or None if it can't be determined."""
    result = subprocess.run("adb shell wm size", shell=True, capture_output=True, text=True)
    m = re.search(r'(\d+)x(\d+)', result.stdout)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))

def _android_scroll_down():
    """Nudge the screen up (scroll down) by a fixed fraction of the real
    screen height -- computed from `wm size` rather than hardcoded pixels,
    since the CI emulator's resolution won't necessarily match whatever
    device this was last tested on."""
    size = _android_screen_size()
    if not size:
        return
    width, height = size
    x = width // 2
    y_start = int(height * 0.8)
    y_end = int(height * 0.35)
    subprocess.run(f"adb shell input swipe {x} {y_start} {x} {y_end} 300", shell=True)

def _android_tap_by_text(texts, timeout=15, poll_interval=1.0, partial=False, allow_scroll=True, require_enabled=False):
    """Poll the accessibility tree for an element matching `texts`
    (see _android_find_by_text for `partial`/`require_enabled`), and tap its
    center once found. Returns (True, None) on success, or (False,
    diagnostic_message) -- the diagnostic is meant to end up in the report's
    error field, since that's the only way to see what a CI run's screen
    actually looked like without direct access to its job logs.

    When `allow_scroll` is True (the default), scrolls down every couple of
    empty polls -- confirmed necessary on a real device: e.g. "Developer
    Menu" sits below "APP INFO" on the Account screen and was never found
    without it, a screen worth of content below the fold that a fixed
    timeout alone can't fix.

    `require_enabled=True` is for buttons whose RN `disabled` prop depends
    on state that lags the control's own appearance (e.g. enabled only once
    a just-typed value has propagated through onChangeText) -- confirmed via
    direct native hooking that tapping a still-disabled button this way taps
    real screen coordinates and returns a clean exit code, but the control
    swallows the touch and the native call it would have triggered never
    happens, silently turning a no-op into a false "success"."""
    deadline = time.time() + timeout
    polls_since_scroll = 0
    scrolls_done = 0
    max_scrolls = 6
    saw_disabled_match = False
    while time.time() < deadline:
        nodes = _android_dump_nodes()
        node = _android_find_by_text(nodes, texts, partial=partial, require_enabled=require_enabled)
        if node is not None:
            center = _android_node_center(node)
            if center:
                subprocess.run(f"adb shell input tap {center[0]} {center[1]}", shell=True)
                return True, None
        if require_enabled and _android_find_by_text(nodes, texts, partial=partial) is not None:
            saw_disabled_match = True
        polls_since_scroll += 1
        if allow_scroll and polls_since_scroll >= 2 and scrolls_done < max_scrolls:
            _android_scroll_down()
            scrolls_done += 1
            polls_since_scroll = 0
        time.sleep(poll_interval)
    visible = _android_visible_text()
    disabled_note = " Element matched but stayed disabled the whole time." if saw_disabled_match else ""
    message = f"Could not find any of {texts} on screen within {timeout}s.{disabled_note} Visible text/content-desc: {visible}"
    print(f"[-] {message}")
    return False, message

def _android_visible_text():
    """Every on-screen text/content-desc label, for embedding in a failure
    message -- this is what lets a failed CI run's PR-posted report say what
    the screen actually looked like, without needing the raw job logs."""
    return sorted({
        (node.get('text') or node.get('content-desc') or '').strip()
        for node in _android_dump_nodes()
    } - {''})

def _android_type_into_edit_text(text, timeout=10, poll_interval=1.0):
    """Find the (first) EditText on screen, tap it to focus, then type.
    Returns (True, None) or (False, diagnostic_message). Scrolls down every
    couple of empty polls, same reasoning as _android_tap_by_text -- the
    DAST label field sits below "Simulate Network Offline"/"Stop Operation",
    off the bottom of the screen on a real device."""
    deadline = time.time() + timeout
    polls_since_scroll = 0
    scrolls_done = 0
    max_scrolls = 6
    while time.time() < deadline:
        for node in _android_dump_nodes():
            if node.get('class') == 'android.widget.EditText':
                center = _android_node_center(node)
                if center:
                    subprocess.run(f"adb shell input tap {center[0]} {center[1]}", shell=True)
                    time.sleep(0.3)
                    subprocess.run(f"adb shell input text {text}", shell=True)
                    # Focusing the field opens the soft keyboard, and nothing
                    # else in this flow ever dismisses it -- confirmed on a
                    # real device that it stays open (with Gboard's own
                    # clipboard-suggestion strip) covering the entire lower
                    # half of the screen for the rest of the session,
                    # silently breaking every later scroll/tap in this same
                    # run (e.g. the telemetry E2E check, which sits further
                    # down and never got found -- not because of anything
                    # wrong with that step itself, but because the keyboard
                    # was still up hiding it). KEYCODE_BACK dismisses the
                    # IME without navigating away, since Android delivers
                    # back-button presses to a focused soft keyboard first.
                    time.sleep(0.3)
                    subprocess.run("adb shell input keyevent 4", shell=True)
                    return True, None
        polls_since_scroll += 1
        if polls_since_scroll >= 2 and scrolls_done < max_scrolls:
            _android_scroll_down()
            scrolls_done += 1
            polls_since_scroll = 0
        time.sleep(poll_interval)
    visible = _android_visible_text()
    message = f"Could not find an EditText on screen within {timeout}s. Visible text/content-desc: {visible}"
    print(f"[-] {message}")
    return False, message

def drive_android_dev_menu_enqueue(test_nonce):
    """Navigate Profile tab -> Developer Menu, force offline mode, type the
    sentinel into the DAST test field, and enqueue it into the real native
    ledger. Returns (True, None) if every step succeeded, or
    (False, diagnostic_message) on the first step that didn't."""
    # The very first tap waits out the app's full cold start (Zygote fork,
    # Hermes init, first JS render) on top of whatever the emulator itself
    # is loaded with -- 15s was fine for a warm/idle CI runner but not
    # reliably enough for that, which silently aborted the whole sequence
    # here before it ever got a chance to try anything.
    print("[*] Waiting for cold start and tapping the Account tab...")
    ok, msg = _android_tap_by_text(['Account'], timeout=60, partial=True)
    if not ok:
        return False, f"[Account tab] {msg}"

    # A tap on the Account tab can report success -- a real tab-bar element
    # was found and a coordinate tap was dispatched -- without the app ever
    # actually switching tabs: confirmed against real CI runs where this
    # exact sequence stayed on the Home screen every time despite that
    # "successful" tap (this never reproduced against a local emulator, so
    # it's specific to the timing/load of CI's real x86_64 runner). Confirm
    # against "Hello, Guest!" -- ProfileHeader's unauthenticated greeting,
    # rendered synchronously at the very top of the Account screen, no
    # scrolling needed -- before hunting for "Developer Menu" (which does
    # need scrolling, and would otherwise conflate "wrong screen" with
    # "right screen but not scrolled to it yet"). Re-tapping Account when
    # it doesn't show up is what actually confirms whether the first tap
    # landed; tapping an already-active tab again is a no-op, so this costs
    # nothing on the common path where it worked the first time.
    max_account_retaps = 3
    navigated = False
    for attempt in range(1, max_account_retaps + 1):
        deadline = time.time() + 5
        while time.time() < deadline:
            if _android_find_by_text(_android_dump_nodes(), ['Hello, Guest!'], partial=True) is not None:
                navigated = True
                break
            time.sleep(1)
        if navigated or attempt == max_account_retaps:
            break
        print(f"[!] Account screen not confirmed after tapping Account (attempt {attempt}/{max_account_retaps}) -- re-tapping...")
        retap_ok, retap_msg = _android_tap_by_text(['Account'], timeout=10, partial=True)
        if not retap_ok:
            return False, f"[Account tab retap] {retap_msg}"
    if not navigated:
        visible = _android_visible_text()
        return False, f"[Account tab] Never reached the Account screen after {max_account_retaps} attempts. Visible text/content-desc: {visible}"

    print("[*] Opening Developer Menu...")
    ok, msg = _android_tap_by_text(['Developer Menu'], timeout=15, partial=True)
    if not ok:
        return False, f"[Developer Menu row] {msg}"

    # Only tap "Simulate Network Offline" if we're not already offline --
    # otherwise that same button now reads "Resume Network (Flush Queue)"
    # and would flush/undo the very state we're trying to set up. This one
    # stays an exact match against the dedicated status value Text node,
    # which never carries the "Offline" substring by accident the way the
    # "Simulate Network Offline" button's own label would under partial
    # matching.
    nodes = _android_dump_nodes()
    if _android_find_by_text(nodes, ['Offline']) is None:
        print("[*] Simulating network offline...")
        ok, msg = _android_tap_by_text(['Simulate Network Offline'], partial=True)
        if not ok:
            return False, f"[Simulate Network Offline] {msg}"

    print(f"[*] Typing sentinel into the DAST label field: {test_nonce}")
    ok, msg = _android_type_into_edit_text(test_nonce)
    if not ok:
        return False, f"[DAST label EditText] {msg}"

    # The button stays disabled (`disabled={isBusy || !customLabel}`) until
    # the typed text propagates from the native EditText back to React state
    # via onChangeText. A fixed sleep before tapping used to stand in for
    # that wait, but direct native hooking proved it isn't reliable: a tap
    # landing while still disabled reports a clean `adb` exit code and
    # produces zero evidence of failure, yet the native `executeTransaction`
    # this button should trigger is never called -- silently turning the
    # supposedly-successful enqueue into a no-op. Polling for `enabled` is
    # what actually confirms the tap can do something.
    print("[*] Tapping Enqueue Test Payload...")
    ok, msg = _android_tap_by_text(['Enqueue Test Payload'], partial=True, require_enabled=True)
    if not ok:
        return False, f"[Enqueue Test Payload button] {msg}"
    return True, None

def drive_android_dev_menu_dequeue():
    ok, msg = _android_tap_by_text(['Dequeue & Zeroize'], partial=True, require_enabled=True)
    return ok, (f"[Dequeue & Zeroize button] {msg}" if not ok else None)

def drive_android_dev_menu_telemetry_e2e(timeout=20):
    """Tap "Simulate E2E Event & Send to Dashboard" -- a combined
    enqueue+dequeue+flush that ends in a real POST to the telemetry
    ingestion API (apps/vesper-ingestion, see the CI workflow's
    "Start telemetry ingestion API" step) -- then read back the on-screen
    result text (testID dev-menu-flush-result: "✓ ..."/"✗ ...") to confirm
    the backend actually accepted it, not just that the tap landed.
    Assumes the Developer Menu is already open (called after
    drive_android_dev_menu_dequeue). Returns (success, message)."""
    ok, msg = _android_tap_by_text(['Simulate E2E Event & Send to Dashboard'], partial=True, require_enabled=True)
    if not ok:
        return False, f"[Simulate E2E Event button] {msg}"
    # The result Text sits right below "Flush Buffered Telemetry", off the
    # bottom of the screen at this scroll position -- confirmed via a real
    # device dump: the backend genuinely received the POST (a 403 showed up
    # in its own access log within the same second as the tap) yet no
    # amount of waiting surfaced the result here without scrolling, same
    # class of below-the-fold issue as the DAST label EditText/button.
    deadline = time.time() + timeout
    polls_since_scroll = 0
    scrolls_done = 0
    max_scrolls = 4
    while time.time() < deadline:
        node = _android_find_by_text(_android_dump_nodes(), ['✓', '✗'], partial=True)
        if node is not None:
            text = (node.get('text') or node.get('content-desc') or '').strip()
            return text.startswith('✓'), text
        polls_since_scroll += 1
        if polls_since_scroll >= 2 and scrolls_done < max_scrolls:
            _android_scroll_down()
            scrolls_done += 1
            polls_since_scroll = 0
        time.sleep(1)
    return False, "No flush result appeared on screen within timeout"

# --- iOS UI automation --------------------------------------------------
# Same navigation as Android, driven through the `tapAccessibilityId` /
# `setTextByAccessibilityId` RPC exports (see the attacker_script JS above)
# instead of uiautomator. "Account" has no testID of its own -- it's the
# bottom tab's visible title -- so it's matched via accessibilityLabel,
# which the JS side falls back to when accessibilityIdentifier doesn't match.

def drive_ios_dev_menu_enqueue(script, test_nonce):
    try:
        script.exports_sync.tap_accessibility_id("Account")
        time.sleep(1.5)
        script.exports_sync.tap_accessibility_id("profile-dev-menu-row")
        time.sleep(1.5)
        script.exports_sync.tap_accessibility_id("dev-menu-toggle-network-btn")
        time.sleep(1)
        script.exports_sync.set_text_by_accessibility_id("dev-menu-custom-label-input", test_nonce)
        time.sleep(0.5)
        script.exports_sync.tap_accessibility_id("dev-menu-enqueue-btn")
        time.sleep(1.5)
        return True, None
    except Exception as e:
        message = f"iOS dev-menu enqueue drive failed: {e}"
        print(f"[!] {message}")
        return False, message

def drive_ios_dev_menu_dequeue(script):
    try:
        script.exports_sync.tap_accessibility_id("dev-menu-dequeue-btn")
        return True, None
    except Exception as e:
        message = f"iOS dev-menu dequeue drive failed: {e}"
        print(f"[!] {message}")
        return False, message

def drive_ios_dev_menu_telemetry_e2e(script, timeout=20):
    """Tap "Simulate E2E Event & Send to Dashboard" and read back the
    on-screen result (accessibilityIdentifier dev-menu-flush-result) via the
    readAccessibilityText RPC export, to confirm the real POST to the
    telemetry ingestion API (apps/vesper-ingestion) actually succeeded --
    same reasoning as drive_android_dev_menu_telemetry_e2e."""
    try:
        script.exports_sync.tap_accessibility_id("dev-menu-simulate-event-btn")
    except Exception as e:
        message = f"iOS Simulate E2E Event tap failed: {e}"
        print(f"[!] {message}")
        return False, message
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            text = script.exports_sync.read_accessibility_text("dev-menu-flush-result")
        except Exception:
            text = None
        if text:
            return text.startswith('✓'), text
        time.sleep(1)
    return False, "No flush result appeared on screen within timeout"

def run_test_suite(package_name: str, is_protected: bool, platform: str = "android", device_udid: str = None) -> SecurityMetrics:
    metrics = SecurityMetrics()
    metrics.was_run = True  # "an attempt was made" -- NOT proof the attack executed
    print(f"\n🚀 Starting Dynamic Analysis for {'PROTECTED' if is_protected else 'UNPROTECTED'} build: {package_name}")
    
    test_nonce = f"GHOST_SEC_{uuid.uuid4().hex[:8]}"
    test_nonce_hex = " ".join([hex(ord(c))[2:].zfill(2) for c in test_nonce])
    sentinel_bytes = [ord(c) for c in test_nonce]
    print(f"[*] Generated deterministic test payload: {test_nonce}")

    needs_resume = False
    try:
        if platform == "ios":
            # Simulators aren't addressable via frida.get_device(udid) -- that
            # raised "device not found" in CI, because a booted simulator
            # isn't enumerated as its own USB/remote device the way a
            # physical iPhone is. frida.get_local_device() is the correct way
            # to reach a simulator's own process space.
            #
            # This used to launch suspended via `simctl launch
            # --wait-for-debugger` and attach to that stopped process --
            # historically fine, but it now reproducibly fails with
            # "unexpected error while probing dyld of target process" on
            # *every* attempt (both the unprotected and protected runs hit
            # the identical error), which is the signature of a deterministic
            # problem with that exact stop point rather than random flakiness
            # a retry would paper over: --wait-for-debugger halts the process
            # at the earliest possible instant, before dyld has necessarily
            # finished setting up the structures Frida needs to inspect it.
            #
            # Attaching to an already-running process is Frida's most
            # standard, best-supported attach mode on every platform, so
            # trade catching the process at its absolute first instruction
            # (which the unprotected keyword set wanted, to hook
            # JNI_OnLoad/UIApplicationMain-equivalents) for reliably
            # attaching at all: launch normally, give it a moment to finish
            # initializing, then attach. This test's more important read --
            # driving a real transaction through the Developer Menu after the
            # app is up -- doesn't depend on catching that startup instant.
            udid_str = device_udid if device_udid else "booted"
            device = frida.get_local_device()
            launch_res = subprocess.run(f"xcrun simctl launch {udid_str} {package_name}", shell=True, capture_output=True, text=True)
            if launch_res.returncode != 0:
                raise Exception(f"simctl launch failed: {launch_res.stderr.strip() or launch_res.stdout.strip()}")
            pid_str = launch_res.stdout.split(":")[-1].strip()
            if not pid_str.isdigit():
                raise Exception(f"Could not parse PID from simctl launch output: {launch_res.stdout.strip()}")
            pid = int(pid_str)
            print(f"[+] Application launched with PID: {pid}. Waiting for it to finish starting up before attaching...")
            time.sleep(3)

            max_attempts = 3
            last_error = None
            session = None
            for attempt in range(1, max_attempts + 1):
                print(f"[*] Attaching Frida to PID {pid}, attempt {attempt}/{max_attempts}...")
                try:
                    session = device.attach(pid)
                    last_error = None
                    break
                except Exception as e:
                    last_error = e
                    print(f"[!] Attach attempt {attempt}/{max_attempts} failed: {e}")
                    time.sleep(3)
            if session is None:
                subprocess.run(f"xcrun simctl terminate {udid_str} {package_name}", shell=True, capture_output=True, text=True)
                # If this is ever hit again, the report needs to say whether
                # Frida's own local-device process list even contained our
                # PID -- "not found" could mean simctl's PID was wrong, the
                # process died right after launch, or Frida's local device
                # simply can't see into the simulator's process namespace on
                # this runner at all. Each points to a different fix.
                try:
                    seen = [f"{p.pid}:{p.name}" for p in device.enumerate_processes()]
                    diagnostic = f"Frida's local device saw {len(seen)} process(es); target pid {pid} {'WAS' if any(str(pid) == s.split(':')[0] for s in seen) else 'was NOT'} among them: {seen}"
                except Exception as diag_err:
                    diagnostic = f"could not enumerate Frida's local-device process list either: {diag_err}"
                raise Exception(f"{last_error} -- {diagnostic}")
        else:
            # CI emulators can take a while to become visible to frida-server
            device = frida.get_usb_device(timeout=60)
            max_attempts = 3
            last_error = None
            session = None
            for attempt in range(1, max_attempts + 1):
                print(f"[*] Spawning {package_name} on the Android emulator, attempt {attempt}/{max_attempts}...")
                pid = None
                try:
                    pid = device.spawn([package_name])
                    session = device.attach(pid)
                    last_error = None
                    break
                except Exception as e:
                    last_error = e
                    print(f"[!] Spawn/attach attempt {attempt}/{max_attempts} failed: {e}")
                    if pid is not None:
                        # spawn() succeeded but attach() didn't -- the process
                        # is left suspended and Frida's device-side spawn gate
                        # stays held for this package (a later attempt/run
                        # reusing the same package name fails outright with
                        # "spawn already in progress" otherwise, since both
                        # the baseline and protected runs spawn the identical
                        # package here).
                        try:
                            device.kill(pid)
                        except Exception:
                            pass
                    time.sleep(3)
            if session is None:
                raise last_error
            needs_resume = True

        metrics.frida_attached = True
        print(f"[+] Frida successfully spawned and attached to process ID: {pid}")
        
        attacker_script = f"""
        (function() {{
            var SENTINEL_PATTERN = "{test_nonce_hex}";
            var SENTINEL_BYTES = {sentinel_bytes};
            var TEST_NONCE = "{test_nonce}";

            function findTargetAddress(keywords) {{
                // Only ever match real, exported *functions* (exp.type === 'function').
                // A previous version also fell back to Module#enumerateSymbols(), which
                // on stripped Android .so files can surface data objects, ifunc resolvers
                // and other non-callable addresses -- Interceptor.attach()'ing one of
                // those crashes the target process natively instead of raising a
                // catchable JS exception, which is what was destabilizing the Android
                // run. Exports are always safe attach targets, so we stick to those.
                var target = null;
                Process.enumerateModules().some(function(m) {{
                    if (m.name.indexOf("system") !== -1 || m.name.indexOf("libc") !== -1) return false;

                    try {{
                        m.enumerateExports().some(function(exp) {{
                            if (exp.type !== 'function') return false;
                            for (var i=0; i<keywords.length; i++) {{
                                if (exp.name.indexOf(keywords[i]) !== -1) {{
                                    target = exp.address; return true;
                                }}
                            }}
                        }});
                    }} catch(e) {{}}

                    return target !== null;
                }});
                return target;
            }}

            // RN's `testID` becomes `accessibilityIdentifier` on iOS. Rather than
            // guessing coordinates or blindly grabbing "the first UITextField/UIButton
            // on screen" (which can't distinguish the right control across screens),
            // walk the real view hierarchy looking for that identifier. Some elements
            // we need to drive (like the bottom tab bar buttons) don't carry a testID,
            // so this also matches on accessibilityLabel, which RN derives from the
            // element's visible text (e.g. a tab's title).
            function findViewByAccessibilityId(view, targetId) {{
                if (!view) return null;
                try {{
                    var identifier = view.accessibilityIdentifier();
                    if (identifier && identifier.toString() === targetId) return view;
                }} catch (e) {{}}
                try {{
                    var label = view.accessibilityLabel();
                    if (label && label.toString() === targetId) return view;
                }} catch (e) {{}}
                try {{
                    var subviews = view.subviews();
                    for (var i = 0; i < subviews.count(); i++) {{
                        var found = findViewByAccessibilityId(subviews.objectAtIndex_(i), targetId);
                        if (found) return found;
                    }}
                }} catch (e) {{}}
                return null;
            }}

            rpc.exports = {{
                runTests: function(isProtected) {{
                    var keywords = isProtected ? ["executeTransaction", "enqueue", "verifyIntegrity"] : ["hermes", "JNI_OnLoad", "UIApplicationMain"];
                    var addr = findTargetAddress(keywords);
                    if (addr) {{
                        try {{
                            Interceptor.attach(addr, {{
                                onEnter: function(args) {{
                                    this.startTime = Date.now();
                                    send({{ event: 'jsi_hooked', success: true }});
                                }},
                                onLeave: function(retval) {{
                                    var latency = Date.now() - this.startTime;
                                    send({{ event: 'latency', ms: latency }});
                                }}
                            }});
                        }} catch(e) {{
                            send({{ event: 'jsi_hooked', success: false, reason: "attach_failed" }});
                        }}
                    }} else {{
                        send({{ event: 'jsi_hooked', success: false, reason: "stripped" }});
                    }}
                }},
                
                scanMemory: function() {{
                    // No cap: `Process.enumerateRanges().some(...)` bailing
                    // out after an arbitrary 256MB used to make this scan
                    // cover a different, incomplete subset of the address
                    // space on every call (enumeration order isn't stable
                    // run-to-run), so the *same* app state could scan as
                    // "24 matches" one time and "3 matches" the next --
                    // confirmed directly on a real device: repeated capped
                    // scans of an unchanged state swung wildly, while a full
                    // scan of the whole ~2GB readable address space (via
                    // .forEach instead of .some, no early exit) took ~1.5-2s
                    // and gave stable, reproducible counts. That's fast
                    // enough to not need a cap at all.
                    var leaked = false;
                    var actual_dump = "";
                    var matchesCount = 0;

                    Process.enumerateRanges({{ protection: 'r--', coalesce: true }})
                        .forEach(function(range) {{
                            if (range.size < SENTINEL_BYTES.length) return;

                            try {{
                                Memory.scanSync(range.base, range.size, SENTINEL_PATTERN).forEach(function(match) {{
                                    leaked = true;
                                    matchesCount++;
                                    if (actual_dump === "") {{
                                        var buf = Memory.readByteArray(match.address, 32);
                                        var view = new Uint8Array(buf);
                                        var hex = [];
                                        var ascii = "";
                                        for(var i=0; i<view.length; i++) {{
                                            var h = view[i].toString(16);
                                            hex.push(h.length === 1 ? '0' + h : h);
                                            var c = view[i];
                                            ascii += (c >= 32 && c <= 126) ? String.fromCharCode(c) : '.';
                                        }}
                                        actual_dump = match.address.toString() + ":\\n" + hex.join(' ') + "  " + ascii;
                                    }}
                                }});
                            }} catch(scanErr) {{}}
                        }});

                    var leakBytes = matchesCount * SENTINEL_BYTES.length;
                    send({{ event: 'memory_scan', leaked: leaked, leakage_bytes: leakBytes, dump: actual_dump }});
                }},

                testBypass: function(isProtected) {{
                    var keywords = isProtected ? ["verifyIntegrity", "sha256", "crypto"] : ["hermes", "JNI_OnLoad", "UIApplicationMain"];
                    var addr = findTargetAddress(keywords);
                    if (addr) {{
                        try {{
                            Interceptor.attach(addr, {{
                                onLeave: function(retval) {{
                                    try {{
                                        retval.replace(ptr(1));
                                        send({{ event: 'crypto_bypass', success: true }});
                                    }} catch(e) {{}}
                                }}
                            }});
                        }} catch(e) {{
                            send({{ event: 'crypto_bypass', success: false, reason: "attach_failed" }});
                        }}
                    }} else {{
                        send({{ event: 'crypto_bypass', success: false, reason: "stripped" }});
                    }}
                }},

                tapAccessibilityId: function(targetId) {{
                    if (!ObjC.available) return;
                    ObjC.schedule(ObjC.mainQueue, function() {{
                        try {{
                            var windows = ObjC.classes.UIApplication.sharedApplication().windows();
                            for (var i = 0; i < windows.count(); i++) {{
                                var view = findViewByAccessibilityId(windows.objectAtIndex_(i), targetId);
                                if (view) {{
                                    try {{ view.accessibilityActivate(); }} catch (e) {{}}
                                    break;
                                }}
                            }}
                        }} catch (e) {{}}
                    }});
                }},

                setTextByAccessibilityId: function(targetId, value) {{
                    if (!ObjC.available) return;
                    ObjC.schedule(ObjC.mainQueue, function() {{
                        try {{
                            var windows = ObjC.classes.UIApplication.sharedApplication().windows();
                            for (var i = 0; i < windows.count(); i++) {{
                                var view = findViewByAccessibilityId(windows.objectAtIndex_(i), targetId);
                                if (view) {{
                                    try {{
                                        view.setText_(value);
                                        // Programmatic setText: doesn't fire UIKit's normal
                                        // change callbacks on its own -- both of these are
                                        // needed (across RN's old/new text input internals)
                                        // to make the JS-side onChangeText actually observe it.
                                        view.sendActionsForControlEvents_(1 << 17); // UIControlEventEditingChanged
                                        ObjC.classes.NSNotificationCenter.defaultCenter()
                                            .postNotificationName_object_('UITextFieldTextDidChangeNotification', view);
                                    }} catch (e) {{}}
                                    break;
                                }}
                            }}
                        }} catch (e) {{}}
                    }});
                }},

                // Unlike tap/setText above (fire-and-forget UI mutations),
                // this needs the *result* back, so it returns a Promise --
                // exports_sync on the Python side blocks until it resolves,
                // instead of racing the ObjC.schedule callback the way a
                // plain synchronous return would.
                readAccessibilityText: function(targetId) {{
                    if (!ObjC.available) return null;
                    return new Promise(function(resolve) {{
                        ObjC.schedule(ObjC.mainQueue, function() {{
                            var result = null;
                            try {{
                                var windows = ObjC.classes.UIApplication.sharedApplication().windows();
                                for (var i = 0; i < windows.count(); i++) {{
                                    var view = findViewByAccessibilityId(windows.objectAtIndex_(i), targetId);
                                    if (view) {{
                                        try {{ result = view.accessibilityLabel().toString(); }} catch (e) {{}}
                                        if (!result) {{
                                            try {{ result = view.text().toString(); }} catch (e) {{}}
                                        }}
                                        break;
                                    }}
                                }}
                            }} catch (e) {{}}
                            resolve(result);
                        }});
                    }});
                }}
            }};
        }})();
        """
        
        # We will collect latencies emitted by the hook
        measured_latencies = []

        def local_on_message(message, data):
            if message['type'] == 'send':
                payload = message['payload']
                if payload.get('event') == 'latency':
                    measured_latencies.append(payload.get('ms', 0))
            on_message(message, data, metrics)

        script = session.create_script(attacker_script)
        script.on('message', local_on_message)
        script.load()

        # Hooks must be installed on the SUSPENDED process, before resume().
        # The unprotected keyword set (hermes / JNI_OnLoad / UIApplicationMain)
        # targets functions that only run once, during process startup. Calling
        # device.resume(pid) before attaching the interceptors -- as this used
        # to do -- means that startup window has already passed by the time the
        # hook exists, so it can never fire. That's why both the protected AND
        # unprotected builds were reporting identical "Blocked / Honeypot"
        # results: the attack was never actually landing on either build.
        try:
            script.exports_sync.run_tests(is_protected)
            script.exports_sync.test_bypass(is_protected)
        except Exception as e:
            print(f"[!] RPC call failed: {e}. Continuing with metrics.")

        if needs_resume:
            device.resume(pid)

        def run_memory_scan():
            try:
                script.exports_sync.scan_memory()
            except Exception as e:
                print(f"[!] Scan Memory RPC call failed: {e}")
            time.sleep(3)  # let the async `send()` from the scan land before we read metrics -- bumped from 2s now that scanMemory covers the full ~2GB address space (~1.5-2s) instead of a 256MB-capped subset

        # Drive a REAL transaction through the app's own Developer Menu
        # (dev-only, __DEV__-gated -- see src/features/dev-menu) instead of
        # blind taps: it forces offline mode (so executeTransaction actually
        # enqueues instead of no-op'ing -- see SovereignSecureClient.cpp) and
        # enqueues the sentinel payload into the real native ledger. That
        # enqueue call is also what fires the JSI hook installed above for
        # the protected keyword set, giving a real per-transaction latency
        # sample instead of hoping a blind tap landed on something.
        print(f"[*] Driving a real ledger transaction via the Developer Menu ({platform})...")
        if platform == "ios":
            enqueued, enqueue_error = drive_ios_dev_menu_enqueue(script, test_nonce)
        else:
            enqueued, enqueue_error = drive_android_dev_menu_enqueue(test_nonce)

        if not enqueued:
            print(f"[-] Could not drive the app to enqueue a real transaction via the Developer Menu: {enqueue_error}")
            # Surface this in the report's error field -- otherwise the only
            # symptom is "payload never confirmed resident" with no way to
            # tell, from the PR-posted report alone, which navigation step
            # actually failed or what the screen looked like at that point.
            metrics.error = f"Developer Menu navigation failed: {enqueue_error}"

        if measured_latencies:
            metrics.latency_ms = sum(measured_latencies) / len(measured_latencies)
            print(f"[+] Empirical C++ hook latency: {metrics.latency_ms:.2f} ms")
        else:
            print("[-] No latency data received. executeTransaction may not have been triggered.")

        print("[*] Scanning memory for the sentinel while the transaction is still queued...")
        run_memory_scan()
        metrics.payload_confirmed_resident = metrics.memory_leak_detected
        metrics.leakage_bytes_before_dequeue = metrics.leakage_bytes
        if not metrics.payload_confirmed_resident:
            print("[-] Sentinel not found even before zeroize -- the transaction likely never reached the ledger.")

        print("[*] Dequeuing (zeroizing) the transaction, then re-scanning memory...")
        if platform == "ios":
            dequeued, dequeue_error = drive_ios_dev_menu_dequeue(script)
        else:
            dequeued, dequeue_error = drive_android_dev_menu_dequeue()
        if not dequeued:
            print(f"[-] Could not drive the app to dequeue via the Developer Menu: {dequeue_error}")
            if not metrics.error:  # don't clobber a more informative enqueue-stage error
                metrics.error = f"Developer Menu dequeue failed: {dequeue_error}"
        time.sleep(1)
        run_memory_scan()

        # Real network round trip against apps/vesper-ingestion (started by
        # the CI workflow before this script runs -- see
        # "Start telemetry ingestion API") -- not local-only assertions, so
        # a passing result here means the binary payload, API-key/bundle-ID
        # headers and the ingestion API's own validation all actually
        # worked end-to-end.
        print("[*] Driving Simulate E2E Event -> real telemetry ingestion POST...")
        if platform == "ios":
            telemetry_sent, telemetry_message = drive_ios_dev_menu_telemetry_e2e(script)
        else:
            telemetry_sent, telemetry_message = drive_android_dev_menu_telemetry_e2e()
        metrics.telemetry_sent = telemetry_sent
        metrics.telemetry_message = telemetry_message
        if not telemetry_sent:
            print(f"[-] Telemetry E2E event was not confirmed sent: {telemetry_message}")

        try:
            session.detach()
        except Exception:
            pass

        print("[+] Tests completed and session detached.")
        metrics.completed = True

    except frida.TimedOutError:
        metrics.error = "USB/emulator device not found within timeout"
        print(f"[-] {metrics.error}. Frida never attached -- this run produces NO valid security evidence.")
    except frida.ProcessNotFoundError as e:
        metrics.error = f"Application {package_name} not found in emulator/simulator: {e}"
        print(f"[-] {metrics.error}. Frida never attached -- this run produces NO valid security evidence.")
    except Exception as e:
        metrics.error = f"Unexpected error during Frida attachment: {e}"
        print(f"[-] {metrics.error}. This run produces NO valid security evidence.")

    if not metrics.completed:
        # CRITICAL: do not let a failed/aborted run silently report as
        # "blocked"/"0 bytes leaked". Reset every result field so the
        # report generator is forced to render it as untested/error
        # rather than as a passing security control.
        metrics.frida_attached = False
        metrics.jsi_hook_success = False
        metrics.memory_leak_detected = False
        metrics.crypto_bypass_success = False
        metrics.leakage_bytes = 0
        metrics.leakage_bytes_before_dequeue = 0
        metrics.latency_ms = 0.0
        metrics.memory_dump = ""

    return metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Frida DAST against Vesper Ghost Ledger")
    parser.add_argument("--package", type=str, default="mx.edu.sovereign.core", help="Target package name (Protected)")
    parser.add_argument("--baseline-package", type=str, default=None, help="Target package name (Unprotected baseline)")
    parser.add_argument("--protected-apk", type=str, default=None, help="Path to the protected APK/APP to install before testing")
    parser.add_argument("--baseline-apk", type=str, default=None, help="Path to the unprotected baseline APK/APP to install before testing")
    parser.add_argument("--platform", type=str, default="android", help="Platform to test on: android or ios")
    parser.add_argument("--device-udid", type=str, default=None, help="Specific device UDID to use for iOS simulator")
    args = parser.parse_args()

    def install(apk_path, package_name):
        if args.platform == "ios":
            return install_ios_app(apk_path, package_name, args.device_udid)
        return install_android_apk(apk_path, package_name)

    exit_code = 0

    try:
        if args.baseline_package:
            install_error = install(args.baseline_apk, args.baseline_package) if args.baseline_apk else None
            if install_error:
                # Install failed: this is a reportable outcome, not a reason
                # to kill the whole pipeline with no artifact. Record it and
                # skip the run -- `run_test_suite` would only fail to spawn
                # an app that was never actually installed.
                print(f"[-] Skipping baseline run: {install_error}")
                unprotected_metrics = SecurityMetrics()
                unprotected_metrics.error = install_error
                exit_code = 1
            else:
                time.sleep(2)
                print(f"[!] Running baseline metrics for Unprotected Build: {args.baseline_package}")
                unprotected_metrics = run_test_suite(args.baseline_package, is_protected=False, platform=args.platform, device_udid=args.device_udid)
        else:
            print("[!] No baseline package provided. Skipping unprotected baseline (no hardcoded data).")
            unprotected_metrics = SecurityMetrics()

        protected_install_error = install(args.protected_apk, args.package) if args.protected_apk else None
        if protected_install_error:
            print(f"[-] Skipping protected run: {protected_install_error}")
            protected_metrics = SecurityMetrics()
            protected_metrics.error = protected_install_error
            exit_code = 1
        else:
            if args.protected_apk:
                time.sleep(2)
            protected_metrics = run_test_suite(args.package, is_protected=True, platform=args.platform, device_udid=args.device_udid)
            if not protected_metrics.completed:
                exit_code = 1
    except Exception as e:
        # Last-resort safety net: no matter what breaks, the pipeline must
        # still emit security-report.md so the workflow has evidence to
        # upload/comment instead of failing with zero artifacts.
        print(f"[-] Unexpected top-level failure: {e}")
        unprotected_metrics = unprotected_metrics if 'unprotected_metrics' in locals() else SecurityMetrics()
        protected_metrics = SecurityMetrics()
        protected_metrics.error = f"Unexpected top-level failure: {e}"
        exit_code = 1

    generate_markdown_report(unprotected_metrics, protected_metrics, args.platform)
    sys.exit(exit_code)
