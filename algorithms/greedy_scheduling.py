"""
Greedy Interval Scheduling Module

Selects a maximum-cardinality compatible set of reservations from a candidate pool.
Optimal Policy: Earliest Finishing Time (EFT).
Compatible Condition: request.start_time >= last_selected.end_time (half-open intervals).
"""

def schedule_greedy_earliest_finish(candidate_requests):
    """
    Selects a maximum set of mutually non-overlapping requests using greedy strategy.
    
    Parameters:
        candidate_requests (list[dict]): Meeting requests with 'id', 'start_time', 'end_time', etc.
        
    Returns:
        dict: {
            "selected": list[dict],
            "rejected": list[dict],
            "total_selected": int,
            "total_rejected": int
        }
    """
    if not candidate_requests:
        return {
            "selected": [],
            "rejected": [],
            "total_selected": 0,
            "total_rejected": 0
        }

    sorted_candidates = sorted(
        candidate_requests,
        key=lambda r: (r.get("start_time", ""), r.get("id", ""))
    )

    selected = []
    rejected = []
    current_end_time = ""

    for req in sorted_candidates:
        req_start = req.get("start_time", "")
        # Adjacent intervals are compatible: start_time >= current_end_time
        if not selected or req_start >= current_end_time:
            selected.append(req)
            current_end_time = req.get("end_time", "")
        else:
            rejected.append(req)

    return {
        "selected": selected,
        "rejected": rejected,
        "total_selected": len(selected),
        "total_rejected": len(rejected)
    }
