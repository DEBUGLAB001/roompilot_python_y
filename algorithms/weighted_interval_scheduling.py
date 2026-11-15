def _compute_predecessor_index(sorted_requests, j):
    target_start = sorted_requests[j - 1].get("start_time", "")
    low = 0
    high = j - 2
    best_idx = 0

    while low <= high:
        mid = (low + high) // 2
        mid_end = sorted_requests[mid].get("end_time", "")

        if mid_end < target_start:
            best_idx = mid + 1
            low = mid + 1
        else:
            high = mid - 1

    return best_idx

def solve_weighted_interval_scheduling(candidate_requests):
    if not candidate_requests:
        return {
            "selected": [],
            "total_weight": 0,
            "dp_table": [0],
            "predecessors": [0]
        }

    sorted_reqs = sorted(
        candidate_requests,
        key=lambda r: (r.get("end_time", ""), r.get("start_time", ""), r.get("id", ""))
    )
    n = len(sorted_reqs)

    p = [0] * (n + 1)
    for j in range(1, n + 1):
        p[j] = _compute_predecessor_index(sorted_reqs, j)

    dp = [0] * (n + 1)
    for j in range(1, n + 1):
        weight_j = int(sorted_reqs[j - 1].get("weight", sorted_reqs[j - 1].get("priority", 1)))
        dp[j] = max(weight_j + dp[p[j]], dp[j - 1])

    selected = []
    curr = n
    while curr > 0:
        weight_curr = int(sorted_reqs[curr - 1].get("weight", sorted_reqs[curr - 1].get("priority", 1)))
        if weight_curr + dp[p[curr]] >= dp[curr - 1]:
            selected.append(sorted_reqs[curr - 1])
            curr = p[curr]
        else:
            curr = curr - 1

    selected.reverse()

    return {
        "selected": selected,
        "total_weight": dp[n],
        "dp_table": dp,
        "predecessors": p
    }
