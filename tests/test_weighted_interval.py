from algorithms.weighted_interval_scheduling import solve_weighted_interval_scheduling

def test_weighted_interval_dp():
    candidates = [
        {"id": "REQ-01", "start_time": "09:00", "end_time": "10:00", "weight": 20},
        {"id": "REQ-02", "start_time": "09:30", "end_time": "11:00", "weight": 35},
        {"id": "REQ-03", "start_time": "10:00", "end_time": "11:30", "weight": 15},
        {"id": "REQ-04", "start_time": "11:00", "end_time": "12:30", "weight": 25},
        {"id": "REQ-05", "start_time": "11:30", "end_time": "13:00", "weight": 40},
    ]
    res = solve_weighted_interval_scheduling(candidates)
    selected_ids = [r["id"] for r in res["selected"]]
    selected_weight_sum = sum(r.get("weight", 0) for r in res["selected"])

    assert res["total_weight"] == 75, f"Expected DP table to compute optimal weight 75, got {res['total_weight']}"
    assert selected_ids == ["REQ-01", "REQ-03", "REQ-05"], f"Expected optimal reconstructed schedule ['REQ-01', 'REQ-03', 'REQ-05'], but got {selected_ids}"
    assert selected_weight_sum == 75, f"Expected sum of selected weights to equal optimal 75, but got {selected_weight_sum}"
