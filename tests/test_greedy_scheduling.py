from algorithms.greedy_scheduling import schedule_greedy_earliest_finish

def test_greedy_interval_scheduling():
    candidates = [
        {"id": "REQ-LONG", "start_time": "08:00", "end_time": "16:00"},
        {"id": "REQ-SHORT-1", "start_time": "08:30", "end_time": "10:00"},
        {"id": "REQ-SHORT-2", "start_time": "10:30", "end_time": "12:00"},
        {"id": "REQ-SHORT-3", "start_time": "13:00", "end_time": "14:30"},
    ]
    res = schedule_greedy_earliest_finish(candidates)
    selected_ids = [r["id"] for r in res["selected"]]
    assert len(selected_ids) == 3, f"Expected 3 compatible meetings selected by EFT, but got {len(selected_ids)} ({selected_ids})"
