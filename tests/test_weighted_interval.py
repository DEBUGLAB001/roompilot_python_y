from algorithms.weighted_interval_scheduling import solve_weighted_interval_scheduling

def test_weighted_interval_dp():
    candidates = [
        {"id": "REQ-A", "start_time": "09:00", "end_time": "10:00", "weight": 15},
        {"id": "REQ-B", "start_time": "10:00", "end_time": "11:00", "weight": 20},
        {"id": "REQ-C", "start_time": "09:30", "end_time": "10:30", "weight": 25},
    ]
    res = solve_weighted_interval_scheduling(candidates)
    assert res["total_weight"] == 35, f"Expected total optimal weight 35 (REQ-A + REQ-B), got {res['total_weight']}"
