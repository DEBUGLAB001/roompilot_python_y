# RoomPilot — Smart Room Booking and Scheduling Application

## 1. Your Mission: Investigate & Fix the Bugs
You are a Full-Stack Developer working on RoomPilot, a smart meeting room booking and scheduling platform designed to help workplace teams discover available spaces, manage daily reservations, and optimize meeting schedules. The QA team has identified six critical issues affecting calendar lookups, priority processing, and automated scheduling calculations.

Your responsibility is to investigate the existing codebase, reproduce each issue, identify its root cause, and implement reliable fixes without disrupting existing functionality.

---

### BUG-01: Predecessor Search Returns Premature Slot on Exact Match
**Problem:**
When querying the timeline calendar to locate the scheduled booking preceding or matching a target time, the binary search returns the index of the first interval whose start time matches the target time rather than finding the rightmost predecessor when multiple intervals share the same timestamp, or it branches prematurely without exhausting the search space.

**How to identify it:**
1. Open the **Timeline Calendar** tab.
2. In the lookup controls at the top right, select suite **Ada Lovelace Boardroom (ROOM-101)**.
3. Query the schedule for target timestamp **11:00** (where a reservation is scheduled starting at `11:00`).
4. Execute **Find Preceding Slot**.
5. Observe that the algorithm immediately exits upon encountering `mid_start == target_time` (`return mid`) instead of maintaining invariant bounds `low = mid + 1` to search for subsequent matching or later eligible intervals sharing the timestamp. Furthermore, verify that predecessor eligibility is determined strictly by `start_time <= target_time` regardless of `end_time`.

**Your task:** Ensure the binary search algorithm maintains the monotonic invariant to find the reservation with the greatest start time less than or equal to the target time (`start_time <= target_time`), correctly handling exact matches and tie-breakers.

<p align="center">
 <img width="1262" height="954" alt="image" src="https://cdn.debuglab.online/Lab/Roompilot/uploads/bug%201.png" />
</p>

---

### BUG-02: Priority Queue Sift-Up Ignores Start-Time Tie-Breakers
**Problem:**
When inserting pending reservation requests into the binary max-heap, the priority queue fails to maintain heap order consistency. While removal (`_sift_down`) applies the complete three-tier ordering contract (numerical priority, earlier start time, and lexicographical request ID), the insertion operation (`_sift_up`) skips the start-time comparator when priorities are identical.

**How to identify it:**
1. Open the **Priority Dispatch** tab.
2. Review the **Pending Meeting Requests** table, which contains multiple requests sharing identical priority tiers but differing start times and IDs (such as `REQ-10` at `09:30` and `REQ-30` at `11:00` sharing Priority 4).
3. Click the **Execute Heap Dispatch** button.
4. Observe the dispatched sequence in the **Heap Dispatch Sequence** stream.
5. Notice that requests with identical priority numbers are dispatched out of chronological order because `_sift_up` only compared `priority` and `id`, bypassing `start_time`.

**Your task:** Restore consistent ordering across all heap operations by ensuring `_sift_up` uses the complete comparator `_has_higher_priority()` so that requests with equal priority are consistently ordered by earlier start time first.

<p align ="center">
<img width="1262" height="954" alt="image" src="https://cdn.debuglab.online/Lab/Roompilot/uploads/bug%202.png" />
</p>

---

### BUG-03: Greedy Scheduler Prioritizes Earliest Start Instead of Earliest Finish
**Problem:**
The interval scheduling optimizer selects a single long meeting and rejects compatible shorter meetings across the day, drastically reducing total room utilization. The scheduler sorts candidates by earliest start time (`start_time`) rather than earliest finish time (`end_time`).

**How to identify it:**
1. Open the **Scheduling Insights** tab and navigate to the **Greedy Max-Bookings (EFT)** workflow.
2. Review the candidate meeting requests, including long multi-hour sessions alongside multiple short 1-hour sessions.
3. Click **Run Greedy Optimizer**.
4. Observe the metric badge reporting a severely suboptimal count (such as `1 Selected / 4 Rejected`).
5. Notice that a meeting starting early in the morning occupies the room for hours, rejecting multiple subsequent compatible meetings that could have been accommodated if the scheduler had selected the meeting that finished earliest.

**Your task:** Refactor the greedy scheduling strategy to sort candidates by ascending `end_time` (with deterministic tie-breakers) so that selecting meetings that free the room earliest maximizes total scheduled meetings.

<p align ="center">
<img width="1262" height="954" alt="image" src="https://cdn.debuglab.online/Lab/Roompilot/uploads/bug%203.png" />
</p>

---

### BUG-04: Weighted Interval DP Reconstruction Transitions to Wrong State
**Problem:**
The high-value schedule optimizer calculates the correct optimal total weight in its dynamic programming table, but the backtracking reconstruction returns a suboptimal set of reservations whose cumulative weight is lower than the DP optimum.

**How to identify it:**
1. Open the **Scheduling Insights** tab and select the **Weighted Interval DP (Bellman)** subtab.
2. Review the candidate strategic requests with distinct weights and times (e.g., `REQ-01` through `REQ-05`).
3. Click **Compute Optimal DP Set**.
4. Observe the output summary: the badge reports an optimal calculated value (e.g., `Optimal Value: 75`), but the reconstructed list of selected reservations sums to a lower total (e.g., `Weight: 60`).
5. Inspecting the reconstruction loop reveals that when a reservation is selected, the state transition indexes `curr = p[req_idx]` instead of transitioning to the DP predecessor state `curr = p[curr]`, causing the reconstruction path to skip valid optimal intervals.

**Your task:** Correct the dynamic programming backtracking logic to properly transition to the 1-based predecessor state (`curr = p[curr]`), ensuring the reconstructed reservation schedule achieves the optimal weight computed by the DP table.

<p align ="center">
<img width="1262" height="954" alt="image" src="https://cdn.debuglab.online/Lab/Roompilot/uploads/bug%204.png" />
</p>


---

### BUG-05: Bipartite Matching Reassignment Evicts Occupants Without Alternative Rooms
**Problem:**
The multi-suite automated room assignment algorithm fails to find the maximum bipartite matching. When an incoming request contends for an already assigned suite, the augmenting path traversal clears the room and initiates a reassignment search with an empty visited set, allowing the displaced request to reclaim the same room and resulting in an unnecessary eviction rather than finding a true augmenting path.

**How to identify it:**
1. Open the **Scheduling Insights** tab and select the **Bipartite Matching (Augmenting Paths)** subtab.
2. Review the 3 meeting requests and their compatible suites:
   - `M-REQ-1`: Compatible with `ROOM-101`, `ROOM-102`
   - `M-REQ-2`: Compatible with `ROOM-101`
   - `M-REQ-3`: Compatible with `ROOM-102`, `ROOM-103`
3. Click **Run Augmenting Path Matching**.
4. Observe the results reporting `2 / 3 Assigned`, leaving an eligible request unassigned.
5. Trace the execution: when `M-REQ-2` seeks `ROOM-101`, `ROOM-101` is tentatively vacated and `dfs_augment` is called on occupant `M-REQ-1` with a fresh visited set `set()`. `M-REQ-1` re-claims `ROOM-101`, and `M-REQ-2` immediately overwrites it, leaving `M-REQ-1` unassigned rather than displacing it to `ROOM-102`.

**Your task:** Fix the augmenting path reassignment logic so that the search context correctly prevents occupants from reclaiming contended resources, ensuring true augmenting paths complete and achieve maximum matching.

<p align ="center">
<img width="1262" height="954" alt="image" src="https://cdn.debuglab.online/Lab/Roompilot/uploads/bug%205.png" />
</p>

---

### BUG-06: Interval Tree Subtree Max-End Clobbered During Insertion
**Problem:**
The interval conflict inspector misses overlapping reservations during broad time-window queries. Although the search pruning condition is correctly defined, the tree insertion algorithm fails to maintain the correct augmented subtree metadata (`max_end`), causing legitimate overlapping subtrees to be pruned.

**How to identify it:**
1. Open the **Conflict Inspector** tab.
2. Select suite **Ada Lovelace Boardroom (ROOM-101)** or test with an augmented tree containing deep descendants whose end times exceed their ancestors.
3. Query for an inspection window that overlaps a deep descendant (e.g., query window `12:00 - 13:00` against a descendant reservation `10:00 - 13:30`).
4. Click **Query Interval Tree**.
5. Observe that the search reports no conflict detected. During tree insertion, when a node receives children on both left and right subtrees, updating `max_end` only on the branch of the latest insertion overwrites the larger end time from the opposing subtree, leaving an ancestor with an artificially low `max_end` that triggers false pruning.

**Your task:** Ensure `_insert_node` updates `current.max_end` to the true maximum across the node's own end time and both left and right subtrees (`max(current.end, left.max_end, right.max_end)`).

<p align ="center">
<img width="1262" height="954" alt="image" src="https://cdn.debuglab.online/Lab/Roompilot/uploads/bug%206.png" />
</p>

---

## 2. Get Familiar With the Application
RoomPilot is an intelligent workplace room booking and scheduling platform that provides a unified interface for managing office suites, daily reservations, and automated scheduling.

### Core Features:
- **Floor Plan and Room Directory**: Browse meeting suites by floor with live occupancy badges, seating capacities, and equipment tags.
- **Timeline Calendar**: View daily reservations on an hour-by-hour visual schedule and search for earlier bookings at any designated time.
- **Reservation Management**: Schedule new meeting reservations through a guided booking form, validate time availability, and cancel existing bookings when plans change.
- **Priority Dispatch Queue**: Queue and dispatch pending meeting requests based on reservation urgency and priority score using a binary heap.
- **Scheduling Insights**: Fit the maximum number of compatible meetings into a single room, find highest-value reservation combinations, and automatically assign rooms to teams based on attendee count.
- **Conflict Inspector**: Inspect specific rooms and time ranges using augmented interval trees to detect overlapping reservations and prevent double-booking.

---

## 3. Expected Behaviour After Fixing the Bugs
Once all reported issues have been resolved, the application should behave as follows:

- **Predecessor Lookup:** Searching for a target meeting time returns the reservation with the greatest start time less than or equal to the target time (`start_time <= target_time`), correctly identifying exact matches and ties.
- **Priority Dispatch:** The binary heap dispatch queue strictly enforces priority ordering: highest priority first (5 down to 1), breaking ties by earlier start time, and then lexicographical request ID.
- **Greedy Optimization:** The greedy scheduler applies earliest finish time (EFT) ordering, accommodating the maximum number of compatible meetings across the day instead of a single long meeting.
- **Weighted Scheduling:** The dynamic programming reconstruction accurately backtracks through 1-based predecessor states (`curr = p[curr]`), producing a selected reservation schedule that matches the optimal DP score.
- **Automated Room Matching:** Augmenting path reassignments explore alternative compatible rooms without clobbering existing bookings, achieving the true maximum bipartite matching (e.g., `3 / 3 Assigned`).
- **Conflict Detection:** The interval tree correctly propagates subtree `max_end` metadata across both child subtrees during insertion, ensuring overlap queries never prune subtrees containing valid conflicting reservations.

All existing room booking, calendar visualization, and operational features must continue working as expected.

---

## 5. Workspace Guidelines & Submission
You have access to the complete application codebase, an interactive Live Preview, an integrated terminal, and an AI-powered coding assistant.

### Available Workspace Tools:
- **Code Editor**: Explore and modify the existing source code.
- **Live Preview**: Interact with the application and reproduce the six reported bugs.
- **Integrated Terminal**: Start the development server and execute automated tests.
- **AI Assistant**: Ask for explanations, debugging guidance, and help understanding unfamiliar code.

### Hard Reset Policy:
- The workspace includes a Hard Reset option that restores the challenge to its original state.
- Maximum of 2 Hard Reset activations.
- A minimum cooldown of 10 minutes between consecutive activations.
- Resetting discards your current code changes and restores the original challenge files.
- Use Hard Reset carefully, as your progress will be lost.

### Before Submission:
- Resolve all six reported bugs.
- Verify the fixes through the Live Preview.
- Run the automated tests (`pytest`).
- Ensure existing application functionality remains intact.
- Once satisfied, submit your implementation through DEBUG//LAB.

Your solution will be evaluated using automated test cases, including hidden test cases that verify the correctness of your implementation.
