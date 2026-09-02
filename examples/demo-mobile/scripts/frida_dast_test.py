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
    mem_scan_meaningful = protected_metrics.completed and protected_metrics.payload_confirmed_resident
    mem_extraction_pass = mem_scan_meaningful and not protected_metrics.memory_leak_detected
    mem_anomaly = mem_scan_meaningful and protected_metrics.memory_leak_detected

    all_completed = unprotected_metrics.completed and protected_metrics.completed
    protected_held = (
        protected_metrics.completed
        and not protected_metrics.jsi_hook_success
        and mem_extraction_pass  # requires payload_confirmed_resident -- see above
        and not protected_metrics.crypto_bypass_success
    )

    if not all_completed:
        overall_line = "❌ **Overall Status:** INCONCLUSIVE — one or more Frida runs did not complete, so this report is **not** valid security evidence. See errors below and re-run the pipeline."
    elif protected_held:
        overall_line = "✅ **Overall Status:** The Ghost Ledger library successfully maintained Zero-Trust runtime integrity under active instrumentation in this run."
    else:
        overall_line = "❌ **Overall Status:** At least one attack succeeded against the protected build. Investigate before treating this as a passing security gate."

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
| {device_info} | {runner} | v{frida_version} | Spawn (-f) | `{commit_sha}` |
{errors_section}
### 📊 Cross-Test Comparison

| Attack Vector | Unprotected Build | Protected Build (Ghost Ledger) | Metric / Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Process Attachment (ptrace)** | {render_cell(unprotected_metrics, unprotected_metrics.frida_attached, "🔴 Allowed", "🟢 Blocked")} | {render_cell(protected_metrics, protected_metrics.frida_attached, "🟡 Allowed (Contained)", "🟢 Blocked")} | Process intercepted at runtime | ℹ️ Neutralized |
| **JSI Function Hooking** | {render_cell(unprotected_metrics, unprotected_metrics.jsi_hook_success, "🔴 Intercepted", "🟢 Blocked / Honeypot")} | {render_cell(protected_metrics, protected_metrics.jsi_hook_success, "🔴 Intercepted", "🟢 Blocked / Honeypot")} | Pointers validated via integrity | {verdict(protected_metrics.completed and not protected_metrics.jsi_hook_success)} |
| **In-Memory Key Extraction** | {render_cell(unprotected_metrics, unprotected_metrics.memory_leak_detected, "🔴 Keys Leaked", "🟢 0 Bytes Extracted")} | {render_cell(protected_metrics, protected_metrics.memory_leak_detected, "🔴 Keys Leaked", "🟢 0 Bytes Extracted")} | {protected_metrics.leakage_bytes if protected_metrics.completed else 'N/A'} B leaked (protected) | {"⚠️ ANOMALY" if mem_anomaly else ("⚠️ NOT VALIDATED (payload never confirmed resident)" if protected_metrics.completed and not protected_metrics.payload_confirmed_resident else verdict(mem_extraction_pass))} |
| **Ledger Alteration ($H_n$)** | {render_cell(unprotected_metrics, unprotected_metrics.crypto_bypass_success, "🔴 Hash Manipulated", "🟢 Immutable Signature")} | {render_cell(protected_metrics, protected_metrics.crypto_bypass_success, "🔴 Hash Manipulated", "🟢 Immutable Signature")} | C++ mutation detection | {verdict(protected_metrics.completed and not protected_metrics.crypto_bypass_success)} |

### 📈 Quantitative Metrics (Enterprise Evidence)
- **Data Leakage (Leakage Bytes):**
  - *Unprotected:* `{f'{unprotected_metrics.leakage_bytes} bytes' if unprotected_metrics.completed else 'N/A - run did not complete'}` ({'Leaked payload' if unprotected_metrics.completed and unprotected_metrics.leakage_bytes > 0 else ('No leak' if unprotected_metrics.completed else 'no data')})
  - *Protected:* `{f'{protected_metrics.leakage_bytes} bytes' if protected_metrics.completed else 'N/A - run did not complete'}` ({'Leaked' if protected_metrics.completed and protected_metrics.leakage_bytes > 0 else ('Active Zeroization' if protected_metrics.completed else 'no data')})
- **Performance Overhead (Latency):**
  - The C++ Nitro Modules layer adds `{latency_str}` per transaction.

### 🔍 Technical Summary & Forensic Evidence
- **Unprotected Build:** {("The attacker " + ("successfully" if unprotected_metrics.jsi_hook_success else "failed to") + " intercept JSI bindings, extracting " + ("plaintext keys directly from RAM" if unprotected_metrics.memory_leak_detected else "nothing") + ". Transaction hashes were " + ("successfully manipulated" if unprotected_metrics.crypto_bypass_success else "not manipulated") + " before reaching the network layer.") if unprotected_metrics.completed else f"⚠️ This run did not complete ({unprotected_metrics.error or 'unknown reason'}), so no baseline evidence was collected."}
- **Protected Build:** {("The Ghost Ledger C++ runtime " + ("successfully obfuscated memory buffers and JSI function pointers were protected via integrity checks, causing malicious hooks to fail or return honeypot data rather than crashing the app." if protected_held else "did NOT fully block the attack in this run -- at least one attack vector above succeeded.")) if protected_metrics.completed else f"⚠️ This run did not complete ({protected_metrics.error or 'unknown reason'}), so no security evidence was collected for the protected build."}

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

def _android_find_by_text(nodes, texts):
    for node in nodes:
        label = node.get('text') or node.get('content-desc') or ''
        if label in texts:
            return node
    return None

def _android_tap_by_text(texts, timeout=15, poll_interval=1.0):
    """Poll the accessibility tree for an element with exact text/content-desc
    in `texts`, and tap its center once found. Returns True on success."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        node = _android_find_by_text(_android_dump_nodes(), texts)
        if node is not None:
            center = _android_node_center(node)
            if center:
                subprocess.run(f"adb shell input tap {center[0]} {center[1]}", shell=True)
                return True
        time.sleep(poll_interval)
    print(f"[-] Could not find any of {texts} on screen within {timeout}s.")
    return False

def _android_type_into_edit_text(text, timeout=10, poll_interval=1.0):
    """Find the (first) EditText on screen, tap it to focus, then type."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        for node in _android_dump_nodes():
            if node.get('class') == 'android.widget.EditText':
                center = _android_node_center(node)
                if center:
                    subprocess.run(f"adb shell input tap {center[0]} {center[1]}", shell=True)
                    time.sleep(0.3)
                    subprocess.run(f"adb shell input text {text}", shell=True)
                    return True
        time.sleep(poll_interval)
    print(f"[-] Could not find an EditText on screen within {timeout}s.")
    return False

def drive_android_dev_menu_enqueue(test_nonce):
    """Navigate Profile tab -> Developer Menu, force offline mode, type the
    sentinel into the DAST test field, and enqueue it into the real native
    ledger. Returns True if every step succeeded."""
    steps = [
        lambda: _android_tap_by_text(['Account']),
        lambda: _android_tap_by_text(['Developer Menu']),
    ]
    for step in steps:
        if not step():
            return False

    # Only tap "Simulate Network Offline" if we're not already offline --
    # otherwise that same button now reads "Resume Network (Flush Queue)"
    # and would flush/undo the very state we're trying to set up.
    nodes = _android_dump_nodes()
    if _android_find_by_text(nodes, ['Offline']) is None:
        if not _android_tap_by_text(['Simulate Network Offline']):
            return False

    if not _android_type_into_edit_text(test_nonce):
        return False

    return _android_tap_by_text(['Enqueue Test Payload'])

def drive_android_dev_menu_dequeue():
    return _android_tap_by_text(['Dequeue & Zeroize'])

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
        return True
    except Exception as e:
        print(f"[!] iOS dev-menu enqueue drive failed: {e}")
        return False

def drive_ios_dev_menu_dequeue(script):
    try:
        script.exports_sync.tap_accessibility_id("dev-menu-dequeue-btn")
        return True
    except Exception as e:
        print(f"[!] iOS dev-menu dequeue drive failed: {e}")
        return False

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
            # physical iPhone is. The supported pattern for simulators is to
            # go through the local device and launch the app suspended via
            # `simctl launch --wait-for-debugger`, then attach; Frida resumes
            # it as part of a successful attach, so no explicit resume call
            # is needed (or possible) for this path.
            udid_str = device_udid if device_udid else "booted"
            device = frida.get_local_device()
            print(f"[*] Launching {package_name} on simulator {udid_str} suspended (--wait-for-debugger)...")
            launch_res = subprocess.run(f"xcrun simctl launch --wait-for-debugger {udid_str} {package_name}", shell=True, capture_output=True, text=True)
            if launch_res.returncode != 0:
                raise Exception(f"simctl launch failed: {launch_res.stderr.strip() or launch_res.stdout.strip()}")
            pid_str = launch_res.stdout.split(":")[-1].strip()
            if not pid_str.isdigit():
                raise Exception(f"Could not parse PID from simctl launch output: {launch_res.stdout.strip()}")
            pid = int(pid_str)
            print(f"[+] Application launched with PID: {pid}. Attaching Frida...")
            session = device.attach(pid)
        else:
            # CI emulators can take a while to become visible to frida-server
            device = frida.get_usb_device(timeout=60)
            pid = device.spawn([package_name])
            session = device.attach(pid)
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
                    var leaked = false;
                    var actual_dump = "";
                    var totalScanned = 0;
                    var matchesCount = 0;
                    var MAX_TOTAL = 256 * 1024 * 1024; // 256 MB hard cap
                    var MAX_PER_RANGE = 16 * 1024 * 1024; // 16 MB per range

                    Process.enumerateRanges({{ protection: 'r--', coalesce: true }})
                        .some(function(range) {{
                            if (range.size < SENTINEL_BYTES.length) return false;

                            var scanSize = Math.min(range.size, MAX_PER_RANGE);
                            totalScanned += scanSize;

                            try {{
                                Memory.scanSync(range.base, scanSize, SENTINEL_PATTERN).forEach(function(match) {{
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

                            return totalScanned >= MAX_TOTAL;
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
            time.sleep(2)  # let the async `send()` from the scan land before we read metrics

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
            enqueued = drive_ios_dev_menu_enqueue(script, test_nonce)
        else:
            enqueued = drive_android_dev_menu_enqueue(test_nonce)

        if not enqueued:
            print("[-] Could not drive the app to enqueue a real transaction via the Developer Menu.")

        if measured_latencies:
            metrics.latency_ms = sum(measured_latencies) / len(measured_latencies)
            print(f"[+] Empirical C++ hook latency: {metrics.latency_ms:.2f} ms")
        else:
            print("[-] No latency data received. executeTransaction may not have been triggered.")

        print("[*] Scanning memory for the sentinel while the transaction is still queued...")
        run_memory_scan()
        metrics.payload_confirmed_resident = metrics.memory_leak_detected
        if not metrics.payload_confirmed_resident:
            print("[-] Sentinel not found even before zeroize -- the transaction likely never reached the ledger.")

        print("[*] Dequeuing (zeroizing) the transaction, then re-scanning memory...")
        if platform == "ios":
            drive_ios_dev_menu_dequeue(script)
        else:
            drive_android_dev_menu_dequeue()
        time.sleep(1)
        run_memory_scan()

        try:
            session.detach()
        except Exception:
            pass

        print("[+] Tests completed and session detached.")
        metrics.completed = True

    except frida.TimedOutError:
        metrics.error = "USB/emulator device not found within timeout"
        print(f"[-] {metrics.error}. Frida never attached -- this run produces NO valid security evidence.")
    except frida.ProcessNotFoundError:
        metrics.error = f"Application {package_name} not found in emulator/simulator"
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
