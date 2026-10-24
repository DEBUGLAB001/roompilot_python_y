# RoomPilot

## Description

RoomPilot is a Flask-based smart room-booking and scheduling application. The entry point is `app.py`, which calls `database.init_db()` to seed a SQLite database (`roompilot.db`) and registers two blueprints: `routes/api.py` (all REST endpoints under `/api`) and `routes/views.py` (serves `templates/index.html`). Six independent algorithm modules in `algorithms/` power the scheduling engine and are called directly from `routes/api.py` — their outputs drive the frontend calendar, floor plan, priority dispatch stream, greedy optimizer, weighted DP panel, bipartite matching matrix, and conflict inspector. All six intentional bugs are confined to the algorithm modules. Persistence uses three SQLite tables: `rooms`, `reservations`, and `meeting_requests`. The frontend is a single HTML page rendered by `static/js/app.js`, `calendar.js`, `floorplan.js`, and `algorithms.js` via fetch calls to the API.

## Repository Structure

```
.
├── app.py                                  # Flask app factory, entry point
├── database.py                             # SQLite init, seed data, get_db()
├── challenge.json                          # Runtime config, DSA topic list
├── requirements.txt                        # Flask, pytest
├── pytest.ini                              # Test configuration
├── algorithms/
│   ├── __init__.py                         # Public exports for all modules
│   ├── binary_search.py                    # Bug 1 — find_predecessor_booking()
│   ├── priority_queue.py                   # Bug 2 — BookingPriorityQueue._has_higher_priority()
│   ├── greedy_scheduling.py                # Bug 3 — schedule_greedy_earliest_finish()
│   ├── weighted_interval_scheduling.py     # Bug 4 — _compute_predecessor_index()
│   ├── bipartite_matching.py               # Bug 5 — find_maximum_bipartite_matching()
│   └── interval_tree.py                    # Bug 6 — IntervalTree._search()
├── routes/
│   ├── api.py                              # All REST endpoints + algorithm integration
│   └── views.py                            # Serves index.html
├── static/
│   ├── css/style.css
│   └── js/
│       ├── app.js                          # Master controller, booking modal, tab nav
│       ├── calendar.js                     # Timeline grid, predecessor lookup UI
│       ├── floorplan.js                    # Room cards, floor toggle, room modal
│       └── algorithms.js                   # Greedy, DP, matching, conflict UI
└── templates/
    └── index.html                          # Single-page application shell
```

## Bugs and Bug Locations

1. Binary Search Predecessor Misses Exact Start Times

- Bug location: `algorithms/binary_search.py`, `find_predecessor_booking()`, line 35.
- How to observe it: On the Timeline Calendar tab, enter a time that exactly matches a reservation start time (e.g. `11:00` for ROOM-101, which has reservations at `09:00`, `11:00`, `14:00`) and click "Find Preceding Slot".
- Failure: `if mid_start < target_time` skips exact matches and returns the index of the earlier reservation (`09:00`, index 0) instead of the matching one (`11:00`, index 1). When the exact match is the first element, it returns `-1`.
- Expected: Change `<` to `<=` so that a reservation whose `start_time` equals `target_time` is correctly identified as the predecessor.

2. Priority Queue Dispatches Lowest Priority Requests First

- Bug location: `algorithms/priority_queue.py`, `BookingPriorityQueue._has_higher_priority()`, line 27.
- How to observe it: On the Priority Dispatch tab, click "Execute Heap Dispatch". Priority 1 requests appear first in the dispatch sequence instead of Priority 5 requests.
- Failure: `return p_a < p_b` converts the max-heap into a min-heap, causing the lowest-priority request to bubble to the top.
- Expected: Change `p_a < p_b` to `p_a > p_b` so higher-priority requests are dispatched first; tie-break by earlier `start_time`, then by `id` lexicographically.

3. Greedy Scheduler Selects Long Meeting Over Multiple Short Meetings

- Bug location: `algorithms/greedy_scheduling.py`, `schedule_greedy_earliest_finish()`, line 39.
- How to observe it: On the Scheduling Insights tab (Greedy subtab), click "Run Greedy Optimizer". With default candidates (including an all-day meeting 08:30–17:00 plus three short meetings), only 1 meeting is selected instead of 3.
- Failure: Sorting by `start_time` selects the all-day meeting first; its late finish blocks all subsequent compatible short meetings.
- Expected: Change the sort key to `(r.get("end_time", ""), r.get("start_time", ""), r.get("id", ""))` to implement correct Earliest Finishing Time selection.

4. Weighted Interval Scheduling Treats Adjacent Meetings as Conflicting

- Bug location: `algorithms/weighted_interval_scheduling.py`, `_compute_predecessor_index()`, line 34.
- How to observe it: On the Scheduling Insights tab (Weighted Interval DP subtab), click "Compute Optimal DP Set". Default candidates: REQ-A `09:00–10:00` weight 15, REQ-B `10:00–11:00` weight 20, REQ-C `09:30–10:45` weight 25. Result shows total score 25 instead of optimal 35.
- Failure: `if mid_end < target_start` requires strict inequality, so a predecessor ending at `10:00` is not recognized as compatible with a meeting starting at `10:00`. REQ-A is skipped as a predecessor for REQ-B, preventing the DP from selecting both.
- Expected: Change `<` to `<=` so back-to-back meetings are compatible predecessors, enabling the DP to compute the optimal selection REQ-A + REQ-B with total weight 35.

5. Bipartite Matching Retains Visited Rooms Across Requests

- Bug location: `algorithms/bipartite_matching.py`, `find_maximum_bipartite_matching()`, line 70.
- How to observe it: On the Scheduling Insights tab (Bipartite Matching subtab), click "Run Augmenting Path Matching". With the default 3-request, 3-room graph where reassignment is needed, only 2 of 3 requests are assigned; one request shows as unassigned.
- Failure: `visited_rooms = set()` is initialized once before the outer `for req in requests` loop. Rooms explored during earlier requests remain marked visited, blocking the DFS from finding augmenting paths for later requests.
- Expected: Move `visited_rooms = set()` inside the `for req in requests:` loop so each DFS search starts fresh, correctly achieving a maximum matching of 3.

6. Interval Tree Pruning Misses Overlapping Reservations

- Bug location: `algorithms/interval_tree.py`, `IntervalTree._search()`, line 89.
- How to observe it: On the Conflict Inspector tab, select ROOM-101, query range `10:00–16:00`, click "Query Interval Tree". The reservation at `11:00–12:30` is missing from the conflicts list despite overlapping with the query.
- Failure: `node.left.max_end >= q_end` prunes the left subtree when its maximum endpoint falls short of the query end. A left subtree with `max_end = 12:30` is pruned for query `q_end = 16:00` even though `12:30 > 10:00` and the interval overlaps.
- Expected: Change the condition to `node.left.max_end > q_start` — the correct augmented-tree rule that explores the left subtree whenever any interval inside it could possibly overlap the query window.
