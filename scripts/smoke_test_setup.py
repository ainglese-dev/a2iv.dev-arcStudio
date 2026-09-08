#!/usr/bin/env python3
"""Smoke test script for verifying .setup.sh CLI argument handling, service startup, and graceful teardown."""

import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def check_cli_args():
    print("--- [1] Validating CLI Argument Handling ---")

    # 1. --help
    t0 = time.perf_counter()
    p = subprocess.run([str(REPO_ROOT / ".setup.sh"), "--help"], capture_output=True, text=True)
    d = (time.perf_counter() - t0) * 1000
    assert p.returncode == 0, f"Expected 0, got {p.returncode}: {p.stderr}"
    assert "Usage: .setup.sh [OPTIONS]" in p.stdout, f"Usage string missing: {p.stdout}"
    print(f"  ✓ .setup.sh --help returned exit 0 with usage banner ({d:.1f}ms)")

    # 2. --setup-only
    t0 = time.perf_counter()
    p = subprocess.run([str(REPO_ROOT / ".setup.sh"), "--setup-only"], capture_output=True, text=True)
    d = (time.perf_counter() - t0) * 1000
    assert p.returncode == 0, f"Expected 0, got {p.returncode}: {p.stderr}"
    assert "Setup completed successfully (--setup-only)" in p.stdout, f"Success message missing: {p.stdout}"
    print(f"  ✓ .setup.sh --setup-only returned exit 0 and verified environment ({d:.1f}ms)")

    # 3. Invalid flag --badflag
    t0 = time.perf_counter()
    p = subprocess.run([str(REPO_ROOT / ".setup.sh"), "--badflag"], capture_output=True, text=True)
    d = (time.perf_counter() - t0) * 1000
    assert p.returncode == 1, f"Expected 1, got {p.returncode}: {p.stdout}"
    assert "Unknown argument: --badflag" in p.stderr, f"Error message missing in stderr: {p.stderr}"
    print(f"  ✓ .setup.sh --badflag returned exit 1 with error diagnostic ({d:.1f}ms)")


def get_listening_pids(port: int) -> set[int]:
    """Return set of PIDs listening on the specified port."""
    try:
        out = subprocess.check_output(["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"], text=True)
        pids = set()
        for line in out.strip().splitlines()[1:]:
            parts = line.split()
            if len(parts) >= 2 and parts[1].isdigit():
                pids.add(int(parts[1]))
        return pids
    except subprocess.CalledProcessError:
        return set()


def check_service_lifecycle():
    print("\n--- [2] Validating Dual-Process Lifecycle & Graceful Teardown ---")

    initial_pids_8000 = get_listening_pids(8000)
    initial_pids_5173 = get_listening_pids(5173)
    print(f"  Initial listeners: port 8000: {initial_pids_8000}, port 5173: {initial_pids_5173}")

    # Launch .setup.sh --reload
    t_start = time.perf_counter()
    proc = subprocess.Popen(
        [str(REPO_ROOT / ".setup.sh"), "--reload"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    print(f"  Launched .setup.sh --reload (PID: {proc.pid})")

    backend_ok = False
    frontend_ok = False
    deadline = time.time() + 10.0

    while time.time() < deadline:
        if not backend_ok:
            try:
                req = urllib.request.Request("http://127.0.0.1:8000/api/health")
                with urllib.request.urlopen(req, timeout=1.0) as resp:
                    if resp.status == 200:
                        backend_ok = True
                        print(f"  ✓ Backend health verified at http://127.0.0.1:8000/api/health (status: {resp.status})")
            except Exception:
                pass

        if not frontend_ok:
            try:
                req = urllib.request.Request("http://127.0.0.1:5173")
                with urllib.request.urlopen(req, timeout=1.0) as resp:
                    if resp.status == 200:
                        frontend_ok = True
                        print(f"  ✓ Frontend Vite server verified at http://127.0.0.1:5173 (status: {resp.status})")
            except Exception:
                pass

        if backend_ok and frontend_ok:
            break
        time.sleep(0.5)

    startup_time = time.perf_counter() - t_start
    if not (backend_ok and frontend_ok):
        proc.send_signal(signal.SIGINT)
        stdout, stderr = proc.communicate(timeout=5)
        raise RuntimeError(
            f"Services failed to become healthy within 10s: backend={backend_ok}, frontend={frontend_ok}\n"
            f"STDOUT:\n{stdout}\nSTDERR:\n{stderr}"
        )

    print(f"  ✓ Both backend and frontend healthy within {startup_time:.2f}s")

    # Send SIGINT (kill -2) to the .setup.sh process
    t_stop = time.perf_counter()
    print(f"  Sending SIGINT (kill -2) to .setup.sh process (PID: {proc.pid})...")
    proc.send_signal(signal.SIGINT)

    try:
        stdout, stderr = proc.communicate(timeout=8.0)
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()
        raise AssertionError("Process timed out waiting for teardown!")

    teardown_time = time.perf_counter() - t_stop
    assert proc.returncode == 0, f".setup.sh exited with non-zero code {proc.returncode}!\nSTDERR: {stderr}"
    print(f"  ✓ .setup.sh exited cleanly with code 0 ({teardown_time:.2f}s)")

    # Confirm no orphaned uvicorn or vite/node processes listening on ports
    time.sleep(0.5)
    final_pids_8000 = get_listening_pids(8000)
    final_pids_5173 = get_listening_pids(5173)

    new_pids_8000 = final_pids_8000 - initial_pids_8000
    new_pids_5173 = final_pids_5173 - initial_pids_5173

    assert not new_pids_8000, f"Orphaned processes on port 8000: {new_pids_8000}"
    assert not new_pids_5173, f"Orphaned processes on port 5173: {new_pids_5173}"
    print("  ✓ Confirmed no orphaned processes listening on ports 8000 or 5173")


def main():
    print("=================================================================")
    print("   .setup.sh LIFECYCLE & TEARDOWN SMOKE VERIFICATION SUITE       ")
    print("=================================================================")

    check_cli_args()
    check_service_lifecycle()

    print("\n=================================================================")
    print("   ALL LIFECYCLE SMOKE TESTS PASSED CLEANLY                      ")
    print("=================================================================")


if __name__ == "__main__":
    main()
