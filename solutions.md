# Bug Fixes & Line Changes

### BUG-01: Binary Search Predecessor
- **File:** `algorithms/binary_search.py`
- **Line to Change:** Line 13
- **Change:** Change `if mid_start < target_time:` to `if mid_start <= target_time:`
- **How it works:**
Using `<=` allows the search to include reservations that start at the exact queried target time instead of skipping them. This ensures exact time matches are retained as valid predecessors rather than branching away and returning earlier slots or -1.

---

### BUG-02: Priority Queue Dispatch Order
- **File:** `algorithms/priority_queue.py`
- **Line to Change:** Line 10
- **Change:** Change `return p_a < p_b` to `return p_a > p_b`
- **How it works:**
Switching `<` to `>` ensures items with larger priority numbers are treated as higher priority instead of lower priority. This restores the intended max-heap structure so critical requests are dispatched before low-priority ones.

---

### BUG-03: Greedy Scheduling Interval Selection
- **File:** `algorithms/greedy_scheduling.py`
- **Line to Change:** Line 12
- **Change:** Change `key=lambda r: (r.get("start_time", ""), r.get("id", ""))` to `key=lambda r: (r.get("end_time", ""), r.get("start_time", ""), r.get("id", ""))`
- **How it works:**
Sorting by earliest finishing time (`end_time`) frees the room as soon as possible for subsequent meetings. This prevents one long meeting from blocking multiple compatible shorter meetings across the day.

---

### BUG-04: Weighted Interval Scheduling Compatibility
- **File:** `algorithms/weighted_interval_scheduling.py`
- **Line to Change:** Line 11
- **Change:** Change `if mid_end < target_start:` to `if mid_end <= target_start:`
- **How it works:**
Allowing `<=` treats meetings where one ends exactly when the next begins as non-overlapping. This enables back-to-back meetings to be scheduled together and properly accumulates their combined optimal score.

---

### BUG-05: Bipartite Matching Visited State Reset
- **File:** `algorithms/bipartite_matching.py`
- **Line to Change:** Line 36
- **Change:** Move `visited_rooms = set()` from before the loop into the loop:
  ```python
  for req in requests:
      visited_rooms = set()
      dfs_augment(req["id"], visited_rooms)
  ```
- **How it works:**
Resetting the visited set for each request gives every augmenting path search a fresh view of available rooms. This allows DFS to explore reassignments and alternate paths rather than being blocked by previously checked rooms.

---

### BUG-06: Interval Tree Overlap Query Pruning
- **File:** `algorithms/interval_tree.py`
- **Line to Change:** Line 63
- **Change:** Change `if node.left and node.left.max_end >= q_end:` to `if node.left and node.left.max_end > q_start:`
- **How it works:**
Comparing the left subtree's maximum end time against the query's start time (`q_start`) correctly identifies any interval extending into the query window. This prevents pruning valid overlapping intervals that happen to finish before the query's end time.
