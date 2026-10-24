"""
Dynamic Programming: Weighted Interval Scheduling Module

Selects a mutually compatible subset of candidate reservations that maximizes
the total priority score / weight using the Bellman recurrence:
    OPT(j) = max(w_j + OPT(p(j)), OPT(j-1))
where p(j) is the index of the last compatible reservation before reservation j.
"""

def _compute_predecessor_index(sorted_requests, j):
    """
    Computes p(j): the 1-based index of the last compatible request before j (1-based index j).
    Returns 0 if no compatible earlier request exists.
    
    Requests are 0-indexed in the list:
    sorted_requests[j - 1] is request j.
    Target: find latest index i (0 <= i < j - 1) such that request i finishes
    before or exactly when request (j - 1) starts.
    """
    target_start = sorted_requests[j - 1].get("start_time", "")
    low = 0
    high = j - 2
    best_idx = 0  # 1-based index (0 means none)

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
    """
    Solves weighted interval scheduling via dynamic programming.
    
    Parameters:
        candidate_requests (list[dict]): List of requests with 'id', 'start_time', 'end_time', 'weight' / 'priority'.
        
    Returns:
        dict: {
            "selected": list[dict],
            "total_weight": int,
            "dp_table": list[int],
            "predecessors": list[int]
        }
    """
    if not candidate_requests:
        return {
            "selected": [],
            "total_weight": 0,
            "dp_table": [0],
            "predecessors": [0]
        }

    # Sort requests by finishing time (end_time) ascending
    sorted_reqs = sorted(
        candidate_requests,
        key=lambda r: (r.get("end_time", ""), r.get("start_time", ""), r.get("id", ""))
    )
    n = len(sorted_reqs)

    # Compute p(j) for j in 1..n
    p = [0] * (n + 1)
    for j in range(1, n + 1):
        p[j] = _compute_predecessor_index(sorted_reqs, j)

    # DP table: dp[j] stores max weight achievable using a subset of first j requests
    dp = [0] * (n + 1)
    for j in range(1, n + 1):
        weight_j = int(sorted_reqs[j - 1].get("weight", sorted_reqs[j - 1].get("priority", 1)))
        dp[j] = max(weight_j + dp[p[j]], dp[j - 1])

    # Reconstruct optimal subset via backtracking
    selected = []
    curr = n
    while curr > 0:
        weight_curr = int(sorted_reqs[curr - 1].get("weight", sorted_reqs[curr - 1].get("priority", 1)))
        if weight_curr + dp[p[curr]] >= dp[curr - 1]:
            selected.append(sorted_reqs[curr - 1])
            curr = p[curr]
        else:
            curr = curr - 1

    # Reverse to keep chronological order
    selected.reverse()

    return {
        "selected": selected,
        "total_weight": dp[n],
        "dp_table": dp,
        "predecessors": p
    }
