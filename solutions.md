# Bug Fixes & Technical Solutions

This document provides the technical answer key and architectural explanations for resolving the six algorithmic defects in RoomPilot.

---

### BUG-01: Binary Search Predecessor Lookup

- **File:** `algorithms/binary_search.py`
- **Function:** `find_predecessor_booking(sorted_reservations, target_time)`
- **Root Cause:**
  The predecessor search responsibility is to locate `argmax(reservation.start_time)` subject to `reservation.start_time <= target_time`.
  In the defective implementation, when `mid_start == target_time`, the algorithm prematurely exits with `return mid`. If there are duplicate start times or if the invariant boundary search should continue to determine the rightmost candidate, exiting immediately short-circuits the monotonic invariant. More fundamentally, the comparison branches `< target_time` and `== target_time` are separated, which breaks boundary consistency.
- **Incorrect Logic:**
  ```python
  if mid_start < target_time:
      result_idx = mid
      low = mid + 1
  elif mid_start == target_time:
      return mid
  else:
      high = mid - 1
  ```
- **Correct Fix:**
  Unify the predecessor inequality to `mid_start <= target_time`. Whenever `mid_start <= target_time`, record `result_idx = mid` as an eligible predecessor candidate and continue searching right (`low = mid + 1`) to find the latest eligible start time.
  ```python
  if mid_start <= target_time:
      result_idx = mid
      low = mid + 1
  else:
      high = mid - 1
  ```
- **How It Works:**
  Binary search maintains a monotonic condition. Since `sorted_reservations` is sorted chronologically by `start_time`, any reservation with `start_time <= target_time` is a valid predecessor candidate. By updating `low = mid + 1`, the search continues into higher indices to check if an even later reservation still satisfies the condition, eventually settling on the greatest eligible index. Predecessor eligibility is strictly based on `start_time` and does not consider `end_time`.

---

### BUG-02: Priority Queue Ordering

- **File:** `algorithms/priority_queue.py`
- **Function:** `BookingPriorityQueue._sift_up(self, index)`
- **Root Cause:**
  The application ordering contract defines a strict three-tier policy:
  1. Higher numerical priority outranks lower numerical priority (`priority: 5 > 4 > 3 > 2 > 1`).
  2. If priorities are equal, earlier reservation start time comes first (`start_time: '09:00' < '10:00'`).
  3. If priority and start time are both equal, lexicographically smaller request ID wins (`id: 'REQ-10' < 'REQ-20'`).

  The class provides the comprehensive helper `_has_higher_priority(a, b)` which accurately encodes this entire ordering contract, and `_sift_down()` correctly delegates to `_has_higher_priority()`. However, `_sift_up()` implemented an inconsistent inline comparator:
- **Incorrect Logic:**
  ```python
  def _sift_up(self, index):
      while index > 0:
          parent = (index - 1) // 2
          child = self.heap[index]
          parent_item = self.heap[parent]

          child_priority = child.get("priority", 0)
          parent_priority = parent_item.get("priority", 0)

          if child_priority != parent_priority:
              should_swap = child_priority > parent_priority
          else:
              should_swap = str(child.get("id", "")) < str(parent_item.get("id", ""))

          if should_swap:
              self.heap[index], self.heap[parent] = self.heap[parent], self.heap[index]
              index = parent
          else:
              break
  ```
- **Correct Fix:**
  Refactor `_sift_up` to delegate its node comparison directly to `self._has_higher_priority(self.heap[index], self.heap[parent])`:
  ```python
  def _sift_up(self, index):
      while index > 0:
          parent = (index - 1) // 2
          if self._has_higher_priority(self.heap[index], self.heap[parent]):
              self.heap[index], self.heap[parent] = self.heap[parent], self.heap[index]
              index = parent
          else:
              break
  ```
- **How It Works:**
  A binary heap maintains the heap invariant across both insertions (`_sift_up`) and extractions (`_sift_down`). When `_sift_up` bypassed the start-time tie-breaker, items with equal priority but earlier start times failed to bubble up above parent nodes that had later start times. Delegating both sifting directions to `_has_higher_priority()` guarantees that heap invariants remain perfectly consistent throughout the data structure.

---

### BUG-03: Greedy Scheduling

- **File:** `algorithms/greedy_scheduling.py`
- **Function:** `schedule_greedy_earliest_finish(candidate_requests)`
- **Root Cause:**
  Interval scheduling for maximum cardinality is proven to be optimally solved by the Earliest Finish Time (EFT) greedy strategy. Sorting by earliest start time allows an early-starting, long-duration interval to monopolize the resource and reject multiple shorter compatible intervals. The defective function sorted candidates by `(start_time, id)` instead of sorting by `(end_time, start_time, id)`.
- **Incorrect Logic:**
  ```python
  sorted_candidates = sorted(
      candidate_requests,
      key=lambda r: (r.get("start_time", ""), r.get("id", ""))
  )
  ```
- **Correct Fix:**
  Sort candidate requests primarily by ascending `end_time`, breaking ties deterministically by `start_time` and then request `id`. Adjacent meetings (`req_start >= current_end_time`) remain compatible.
  ```python
  sorted_candidates = sorted(
      candidate_requests,
      key=lambda r: (r.get("end_time", ""), r.get("start_time", ""), r.get("id", ""))
  )
  ```
- **How It Works:**
  By greedily selecting the compatible interval that finishes earliest, the maximum possible remaining time is preserved for subsequent meetings. Because room intervals are half-open `[start, end)`, a meeting starting at `10:00` is completely compatible with a preceding meeting ending at `10:00` (`req_start >= current_end_time`).

---

### BUG-04: Weighted Interval Scheduling

- **File:** `algorithms/weighted_interval_scheduling.py`
- **Function:** `solve_weighted_interval_scheduling(candidate_requests)`
- **Root Cause:**
  The forward dynamic programming recurrence table `dp[j]` represents the maximum weight achievable considering subsets of the first `j` sorted intervals (where index `j` is 1-based, with `dp[0] = 0`). The predecessor array `p[j]` stores the 1-based index of the last mutually compatible interval ending at or before interval `j`'s start time (`mid_end <= target_start`).
  
  During the backward reconstruction phase:
  When interval `curr` is selected (`weight_curr + dp[p[curr]] >= dp[curr - 1]`), the state transition must jump back to its predecessor state `p[curr]`.
  The defective code incorrectly transitioned using `curr = p[req_idx]` (where `req_idx = curr - 1`), indexing the predecessor array with a 0-based array index instead of the 1-based state index.
- **Incorrect Logic:**
  ```python
  while curr > 0:
      req_idx = curr - 1
      weight_curr = int(sorted_reqs[req_idx].get("weight", sorted_reqs[req_idx].get("priority", 1)))
      if weight_curr + dp[p[curr]] >= dp[curr - 1]:
          selected.append(sorted_reqs[req_idx])
          curr = p[req_idx]
      else:
          curr = curr - 1
  ```
- **Correct Fix:**
  Update the reconstruction state transition to `curr = p[curr]`:
  ```python
  while curr > 0:
      req_idx = curr - 1
      weight_curr = int(sorted_reqs[req_idx].get("weight", sorted_reqs[req_idx].get("priority", 1)))
      if weight_curr + dp[p[curr]] >= dp[curr - 1]:
          selected.append(sorted_reqs[req_idx])
          curr = p[curr]
      else:
          curr = curr - 1
  ```
- **How It Works:**
  Mathematically, `dp[j] = max(weight_j + dp[p[j]], dp[j - 1])`. When interval `j` is chosen, the subproblem that generated the optimal value is `dp[p[j]]`, so the next state to inspect is `p[j]`. Reading `p[j - 1]` instead reads the predecessor of the preceding interval, causing the reconstruction trajectory to jump to an arbitrary earlier state, omitting valid optimal intervals and yielding a reconstructed schedule whose summed weight is strictly less than `dp[n]`.

---

### BUG-05: Bipartite Matching

- **File:** `algorithms/bipartite_matching.py`
- **Function:** `find_maximum_bipartite_matching(requests, rooms, compatibility_fn=None)`
- **Root Cause:**
  In augmenting-path algorithms (Kuhn's algorithm / Hopcroft-Karp), when a request `req_id` contends for a room `room_id` already held by `occupant`, the algorithm must search for an augmenting path by reassigning `occupant` to an alternative room without allowing `occupant` to reclaim `room_id`.
  
  The defective implementation tentatively vacated `room_match[room_id] = None` and then called `dfs_augment(occupant, set())` with a fresh visited set. Because `room_id` was now empty and absent from the new visited set, `occupant` immediately re-claimed `room_id`. The parent caller then unconditionally overwrote `room_match[room_id] = req_id`, evicting `occupant` from the matching altogether without actually transferring them to an alternative suite.
- **Incorrect Logic:**
  ```python
  def dfs_augment(req_id, visited):
      for room_id in adj.get(req_id, []):
          if room_id not in visited:
              visited.add(room_id)
              occupant = room_match[room_id]
              if occupant is None:
                  room_match[room_id] = req_id
                  return True
              else:
                  room_match[room_id] = None
                  if dfs_augment(occupant, set()):
                      room_match[room_id] = req_id
                      return True
                  room_match[room_id] = occupant
      return False
  ```
- **Correct Fix:**
  Propagate the search visited frontier into recursive calls, and allow reassignment when `occupant is None or dfs_augment(occupant, visited)`. Reset `visited_rooms` once per outer request loop:
  ```python
  def dfs_augment(req_id, visited):
      for room_id in adj.get(req_id, []):
          if room_id not in visited:
              visited.add(room_id)
              occupant = room_match[room_id]
              if occupant is None or dfs_augment(occupant, visited):
                  room_match[room_id] = req_id
                  return True
      return False

  for req in requests:
      visited_rooms = set()
      dfs_augment(req["id"], visited_rooms)
  ```
- **How It Works:**
  Because `room_id` is marked in `visited` before recursing on `occupant`, `occupant` is prevented from selecting `room_id` and must seek an alternate compatible suite. Only if `occupant` successfully secures an alternative suite (or a downstream chain of reassignments succeeds) does `dfs_augment` return `True`, at which point `room_match[room_id] = req_id` completes the augmenting path swap.

---

### BUG-06: Interval Tree

- **File:** `algorithms/interval_tree.py`
- **Function:** `IntervalTree._insert_node(self, current, new_node)`
- **Root Cause:**
  An augmented interval tree maintains the subtree maximum end time invariant at every node:
  $$\text{node.max\_end} = \max(\text{node.end}, \text{node.left.max\_end}, \text{node.right.max\_end})$$
  In the defective `_insert_node`, the update was partitioned into the `if/else` descent branches:
  When descending left, it updated `current.max_end = max(current.end, current.left.max_end)`.
  When descending right, it updated `current.max_end = max(current.end, current.right.max_end)`.
  If a node had a right child with a large end time (e.g., `13:30`), a subsequent insertion into its left child overwrote `current.max_end` with `max(current.end, current.left.max_end)` (e.g., `11:00`), destroying the metadata from the right subtree.
- **Incorrect Logic:**
  ```python
  if new_node.start < current.start:
      current.left = self._insert_node(current.left, new_node)
      current.max_end = max(current.end, current.left.max_end)
  else:
      current.right = self._insert_node(current.right, new_node)
      current.max_end = max(current.end, current.right.max_end)
  ```
- **Correct Fix:**
  Compute `current.max_end` across the node's own end and both child subtrees after recursion completes:
  ```python
  if new_node.start < current.start:
      current.left = self._insert_node(current.left, new_node)
  else:
      current.right = self._insert_node(current.right, new_node)

  current.max_end = max(
      current.end,
      current.left.max_end if current.left else "",
      current.right.max_end if current.right else ""
  )
  return current
  ```
- **How It Works:**
  During an overlap search query `[q_start, q_end)`, the left subtree can be pruned if and only if `node.left.max_end <= q_start` (because no interval in that subtree extends past `q_start`). When `max_end` is artificially depressed due to one-sided updates, `node.left.max_end > q_start` evaluates to `False`, incorrectly pruning subtrees that hold genuine conflicting reservations. Maintaining the three-way maximum preserves the augmented tree invariant for all subtree topologies.
