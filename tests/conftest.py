import sys
import json
import time
import pytest

test_results = {}
total_start_time = 0

def pytest_sessionstart(session):
    global total_start_time
    total_start_time = time.time()
    
    # Silence default pytest progress and summaries so ONLY strict JSON is output
    tr = session.config.pluginmanager.getplugin("terminalreporter")
    if tr and hasattr(tr, "_tw"):
        tr._tw.write = lambda *args, **kwargs: None
        tr._tw.line = lambda *args, **kwargs: None
    if tr:
        tr.write = lambda *args, **kwargs: None
        tr.write_line = lambda *args, **kwargs: None
        tr.write_sep = lambda *args, **kwargs: None
        tr.summary_failures = lambda *args, **kwargs: None
        tr.summary_errors = lambda *args, **kwargs: None
        tr.summary_stats = lambda *args, **kwargs: None
        tr.short_test_summary = lambda *args, **kwargs: None

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    
    if report.when == "call":
        test_name = item.name
        duration_ms = f"{max(1, int(report.duration * 1000))}ms"
        
        if report.passed:
            test_results[test_name] = {
                "Status": "passed",
                "Execution time": duration_ms
            }
        elif report.failed:
            err_msg = "AssertionError"
            if report.longrepr:
                repr_str = str(report.longrepr)
                lines = repr_str.splitlines()
                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith("E   AssertionError:") and len(stripped) > 19:
                        err_msg = stripped[19:].strip()
                        break
                    elif stripped.startswith("AssertionError:") and len(stripped) > 15:
                        err_msg = stripped[15:].strip()
                        break
                if err_msg == "AssertionError":
                    for line in lines:
                        stripped = line.strip()
                        if stripped.startswith("E   ") and not stripped.startswith("E   assert") and not stripped.startswith("E    +"):
                            err_msg = stripped[4:].strip()
                            break

            test_results[test_name] = {
                "Status": "failed",
                "Execution time": duration_ms,
                "Error": err_msg
            }

def pytest_terminal_summary(terminalreporter, exitstatus, config):
    total_duration_ms = f"{max(1, int((time.time() - total_start_time) * 1000))}ms"
    passed_count = sum(1 for t in test_results.values() if t.get("Status") == "passed")
    failed_count = sum(1 for t in test_results.values() if t.get("Status") == "failed")
    
    output_dict = {
        **test_results,
        "Passed": passed_count,
        "Failed": failed_count,
        "Total bugs": 6,
        "Total Execution time": total_duration_ms
    }
    
    sys.stdout.write(json.dumps(output_dict, indent=2) + "\n")
    sys.stdout.flush()
