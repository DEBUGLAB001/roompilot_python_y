def schedule_greedy_earliest_finish(candidate_requests):
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
