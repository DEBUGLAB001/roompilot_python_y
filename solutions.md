# Solutions & Root Cause Analysis Guide — RoomPilot

This document outlines the root cause, frontend symptoms, code changes, and expected post-fix behavior for all six reported defects in the RoomPilot scheduling system.

---

## BUG-01: Binary Search Predecessor Misses Exact Start Times

### 1. Bug Identified in Frontend
- **Location:** **Timeline Calendar** tab (`#view-calendar`)
- **Action:** Select room `ROOM-101 (The Boardroom)`, set target time to `11:00`, and click **Find Preceding Slot**.
- **Frontend Symptom:** The predecessor result banner displays:
  > *"Found slot index #0 starting at 09:00: 'Q4 Executive Strategy' (09:00 - 10:30). Match Index 0"*
  The calendar highlights the `09:00` slot rather than the exact matching reservation at `11:00` (*"Product Roadmap & Architecture"*). When querying the exact start time of the first booking in a room, it incorrectly displays `Index -1` (No slot found).

### 2. Root Cause
In `algorithms/binary_search.py`, `find_predecessor_booking()` checks `if mid_start < target_time:`. Because strict inequality `<` is used instead of `<=`, when a reservation's start time exactly equals `target_time`, the condition evaluates to `False`. The search incorrectly branches to the left subtree (`high = mid - 1`), discarding the exact match and returning an earlier reservation or `-1`.

### 3. File & Line to Change
- **File:** `algorithms/binary_search.py`
- **Function:** `find_predecessor_booking(sorted_reservations, target_time)`
- **Buggy Line:** Line 30

```python
# Before (Line 30):
if mid_start < target_time:
    result_idx = mid
    low = mid + 1
```

```python
# After (Line 30):
if mid_start <= target_time:
    result_idx = mid
    low = mid + 1
```

### 4. What Happens When We Solve It
- **Frontend Behavior:** When searching for `11:00`, the result banner immediately displays:
  > *"Found slot index #1 starting at 11:00: 'Product Roadmap & Architecture' (11:00 - 12:30). Match Index 1"*
  The corresponding `11:00` reservation block on the timeline is highlighted with the predecessor accent style.
- **Backend/Tests:** `tests/test_binary_search.py` (`test_binary_search_predecessor`) passes with exact match indices correctly identified.

---

## BUG-02: Priority Queue Dispatches Lowest Priority Requests First

### 1. Bug Identified in Frontend
- **Location:** **Priority Dispatch** tab (`#view-queue`)
- **Action:** Click **Execute Heap Dispatch**.
- **Frontend Symptom:** In the **Heap Dispatch Sequence** panel on the right, Priority 1 (lowest urgency) requests appear at rank `#1` (top of the queue), while Priority 5 (highest urgency) requests appear at the bottom. The queue is inverted.

### 2. Root Cause
In `algorithms/priority_queue.py`, the comparator method `_has_higher_priority(self, a, b)` uses `return p_a < p_b`. This inverts the heap invariant: elements with smaller priority numbers are treated as having higher priority, transforming the intended max-heap into a min-heap.

### 3. File & Line to Change
- **File:** `algorithms/priority_queue.py`
- **Class / Method:** `BookingPriorityQueue._has_higher_priority(self, a, b)`
- **Buggy Line:** Line 23

```python
# Before (Line 22-23):
if p_a != p_b:
    return p_a < p_b
```

```python
# After (Line 22-23):
if p_a != p_b:
    return p_a > p_b
```

### 4. What Happens When We Solve It
- **Frontend Behavior:** Clicking **Execute Heap Dispatch** immediately displays Priority 5 requests at rank `#1`, followed by Priority 4, Priority 3, and finally Priority 1. Requests with equal priority tie-break chronologically by earlier requested start time, and then lexicographically by ID.
- **Backend/Tests:** `tests/test_priority_queue.py` (`test_priority_queue_dispatch`) passes, confirming max-heap ordering invariants.

---

## BUG-03: Greedy Scheduler Selects Long Meeting Over Multiple Short Meetings

### 1. Bug Identified in Frontend
- **Location:** **Scheduling Insights** tab &rarr; **Greedy Max-Bookings (EFT)** subtab (`#subpanel-greedy`)
- **Action:** Click **Run Greedy Optimizer**.
- **Frontend Symptom:** The metric badge indicates `1 Selected / 4 Rejected`. The output container shows only the single all-day reservation (*"All-Day Architecture Bootcamp"*, `08:30 - 17:00`) marked as `SCHEDULED`, while four shorter, mutually compatible meetings throughout the day are `REJECTED`.

### 2. Root Cause
In `algorithms/greedy_scheduling.py`, `schedule_greedy_earliest_finish()` sorts candidate requests by `start_time`:
`key=lambda r: (r.get("start_time", ""), r.get("id", ""))`.
Earliest Start Time is not optimal for interval scheduling cardinality. Because the all-day meeting starts at `08:30` (earlier than the 9:00 standup), it is selected first, and its 17:00 finish time blocks every subsequent request. The provably optimal policy requires sorting by **Earliest Finishing Time (EFT)**.

### 3. File & Line to Change
- **File:** `algorithms/greedy_scheduling.py`
- **Function:** `schedule_greedy_earliest_finish(candidate_requests)`
- **Buggy Line:** Line 34

```python
# Before (Line 32-35):
sorted_candidates = sorted(
    candidate_requests,
    key=lambda r: (r.get("start_time", ""), r.get("id", ""))
)
```

```python
# After (Line 32-35):
sorted_candidates = sorted(
    candidate_requests,
    key=lambda r: (r.get("end_time", ""), r.get("start_time", ""), r.get("id", ""))
)
```

### 4. What Happens When We Solve It
- **Frontend Behavior:** Clicking **Run Greedy Optimizer** updates the badge to `3 Selected / 2 Rejected`. The schedule includes three non-overlapping meetings across the morning and afternoon (*"Morning Standup"*, *"Design System Review"*, and *"Client Roadmap Demo"* / *"Sprint Retrospective"*), maximizing room utilization.
- **Backend/Tests:** `tests/test_greedy_scheduling.py` (`test_greedy_interval_scheduling`) passes, verifying maximum cardinality selection.

---

## BUG-04: Weighted Interval Scheduling Treats Adjacent Meetings as Conflicting

### 1. Bug Identified in Frontend
- **Location:** **Scheduling Insights** tab &rarr; **Weighted Interval DP (Bellman)** subtab (`#subpanel-weighted`)
- **Action:** Click **Compute Optimal DP Set**.
- **Frontend Symptom:** The score badge shows `Optimal Score: 30` (or `25` in unit test scenarios). Contiguous back-to-back meetings that touch at the exact same hour (e.g., `09:00 - 10:00` with weight 15 and `10:00 - 11:30` with weight 25) are not combined; one is dropped because the algorithm treats them as conflicting.

### 2. Root Cause
In `algorithms/weighted_interval_scheduling.py`, `_compute_predecessor_index()` uses strict inequality `if mid_end < target_start:` when finding compatible predecessor meetings $p(j)$. In interval scheduling, intervals $[s_1, e_1)$ and $[s_2, e_2)$ are half-open; a meeting ending at `10:00` does not overlap with a meeting starting at `10:00` ($e_1 \le s_2$). Strict `<` causes adjacent meetings to fail compatibility checks, producing $p(j) = 0$ and artificially lowering the optimal DP recurrence score.

### 3. File & Line to Change
- **File:** `algorithms/weighted_interval_scheduling.py`
- **Function:** `_compute_predecessor_index(sorted_requests, j)`
- **Buggy Line:** Line 29

```python
# Before (Line 29):
if mid_end < target_start:
    best_idx = mid + 1
    low = mid + 1
```

```python
# After (Line 29):
if mid_end <= target_start:
    best_idx = mid + 1
    low = mid + 1
```

### 4. What Happens When We Solve It
- **Frontend Behavior:** Clicking **Compute Optimal DP Set** calculates the true optimal business score (e.g. Score: 60 with candidate set, and Score: 35 in unit tests for REQ-A + REQ-B). Contiguous meetings are correctly selected simultaneously without false clash flags.
- **Backend/Tests:** `tests/test_weighted_interval.py` (`test_weighted_interval_dp`) passes with total optimal weight 35.

---

## BUG-05: Bipartite Matching Retains Visited Rooms Across Requests

### 1. Bug Identified in Frontend
- **Location:** **Scheduling Insights** tab &rarr; **Bipartite Matching (Augmenting Paths)** subtab (`#subpanel-matching`)
- **Action:** Click **Run Augmenting Path Matching**.
- **Frontend Symptom:** The allocation badge displays `2 / 3 Assigned`. Request `M-REQ-3 (UX Research Group)` remains marked as `UNASSIGNED: No room could be assigned`, even though rooms and alternate reassignments are available to satisfy all three requests.

### 2. Root Cause
In `algorithms/bipartite_matching.py`, `visited_rooms = set()` is declared once outside the outer loop:
```python
visited_rooms = set()
for req in requests:
    dfs_augment(req["id"], visited_rooms)
```
In augmenting-path algorithms (Ford-Fulkerson / Kuhn's algorithm for maximum bipartite matching), the visited set tracks visited vertices *for a single augmenting path search*. Because `visited_rooms` was never cleared between meeting requests, rooms explored during previous requests remained permanently marked visited, blocking DFS traversal from exploring alternate augmenting paths for subsequent requests.

### 3. File & Line to Change
- **File:** `algorithms/bipartite_matching.py`
- **Function:** `find_maximum_bipartite_matching(requests, rooms, compatibility_fn=None)`
- **Buggy Line:** Line 65

```python
# Before (Lines 65-68):
visited_rooms = set()

for req in requests:
    dfs_augment(req["id"], visited_rooms)
```

```python
# After (Lines 65-68):
for req in requests:
    visited_rooms = set()
    dfs_augment(req["id"], visited_rooms)
```

### 4. What Happens When We Solve It
- **Frontend Behavior:** Clicking **Run Augmenting Path Matching** displays `3 / 3 Assigned`. All three requests are successfully matched to appropriate suites via augmenting path reassignment, with 0 unassigned requests.
- **Backend/Tests:** `tests/test_bipartite_matching.py` (`test_bipartite_matching`) passes with maximum matching of 3.

---

## BUG-06: Interval Tree Pruning Misses Overlapping Reservations

### 1. Bug Identified in Frontend
- **Location:** **Conflict Inspector** tab (`#view-conflicts`)
- **Action:** Select room `ROOM-101`, set time range `10:00 - 16:00`, and click **Query Interval Tree**.
- **Frontend Symptom:** The Conflict Detected panel reports only 1 overlap (*"Executive Board Briefing"*, `14:00 - 15:30`), failing to report the earlier overlapping reservation scheduled from `11:00 - 12:30`.

### 2. Root Cause
In `algorithms/interval_tree.py`, the recursive search method `_search()` prunes the left subtree using:
`if node.left and node.left.max_end >= q_end:`.
In an augmented interval tree, an interval in the left subtree overlaps the query $[q_{start}, q_{end})$ if its end is strictly greater than the query start ($e > q_{start}$). By comparing `node.left.max_end` against `q_end` instead of `q_start`, any left subtree whose maximum endpoint ends before `q_end` (e.g. `max_end = 12:30` when `q_end = 16:00`) is pruned, even though `12:30 > 10:00` and it overlaps the query window.

### 3. File & Line to Change
- **File:** `algorithms/interval_tree.py`
- **Class / Method:** `IntervalTree._search(self, node, q_start, q_end, results)`
- **Buggy Line:** Line 82

```python
# Before (Line 82):
if node.left and node.left.max_end >= q_end:
    self._search(node.left, q_start, q_end, results)
```

```python
# After (Line 82):
if node.left and node.left.max_end > q_start:
    self._search(node.left, q_start, q_end, results)
```

### 4. What Happens When We Solve It
- **Frontend Behavior:** Querying `10:00 - 16:00` in `ROOM-101` reports:
  > *"⚠️ Conflict Detected (2 Overlaps)"*
  Both overlapping reservations (`11:00 - 12:30` and `14:00 - 15:30`) are displayed with warning badges.
- **Backend/Tests:** `tests/test_interval_tree.py` (`test_interval_tree_overlap`) passes, successfully identifying all overlapping intervals.

---

## Summary of Code Changes

| Bug ID | Component | File | Line | Buggy Code | Corrected Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Binary Search | `algorithms/binary_search.py` | 30 | `if mid_start < target_time:` | `if mid_start <= target_time:` |
| **BUG-02** | Priority Queue | `algorithms/priority_queue.py` | 23 | `return p_a < p_b` | `return p_a > p_b` |
| **BUG-03** | Greedy Scheduling | `algorithms/greedy_scheduling.py` | 34 | `key=lambda r: (r.get("start_time", ""), ...)` | `key=lambda r: (r.get("end_time", ""), ...)` |
| **BUG-04** | Weighted DP | `algorithms/weighted_interval_scheduling.py` | 29 | `if mid_end < target_start:` | `if mid_end <= target_start:` |
| **BUG-05** | Bipartite Matching | `algorithms/bipartite_matching.py` | 65 | `visited_rooms = set()` outside loop | `visited_rooms = set()` inside `for req in requests:` |
| **BUG-06** | Interval Tree | `algorithms/interval_tree.py` | 82 | `if node.left and node.left.max_end >= q_end:` | `if node.left and node.left.max_end > q_start:` |

