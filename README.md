# RoomPilot — Smart Room Booking and Scheduling Application

## 1. Your Mission: Investigate & Fix the Bugs
You are a Full-Stack Developer working on RoomPilot, a smart meeting room booking and scheduling platform designed to help workplace teams discover available spaces, manage daily reservations, and optimize meeting schedules. The QA team has identified six critical issues affecting calendar lookups, priority processing, and automated scheduling calculations.

Your responsibility is to investigate the existing codebase, reproduce each issue, identify its root cause, and implement reliable fixes without disrupting existing functionality.

---

### BUG-01: Predecessor Search Misses Exact Start Times
**Problem:**
When using the timeline calendar's lookup tool to find the scheduled booking at an exact meeting start time, the system skips that meeting entirely and highlights an earlier time slot instead.

**How to identify it:**
1. Open the **Timeline Calendar** tab.
2. In the lookup bar at the top right, select room **The Boardroom (ROOM-101)**.
3. Enter the target time as **11:00** (a reservation titled *"Product Roadmap & Architecture"* is scheduled for this room from `11:00 - 12:30`).
4. Click **Find Preceding Slot**.
5. Notice that the result banner states:
   > `Found slot index #0 starting at 09:00: "Q4 Executive Strategy" (09:00 - 10:30). Match Index 0`
   The search completely missed the `11:00` booking and highlighted the earlier `09:00` meeting instead. If you search for the start time of the room's very first meeting (e.g., `09:00`), it fails completely and returns `No Slot (Index -1)`.

**Your task:** Ensure searching for an exact meeting start time correctly returns that scheduled reservation.

![BUG-01: Predecessor Search Misses Exact Start Times](docs/images/bug-01.png)

---

### BUG-02: Priority Queue Dispatches Lowest Priority Requests First
**Problem:**
When processing pending meeting requests through the dispatch queue, the application serves low-urgency general meetings before high-urgency executive reviews, completely inverting the priority order.

**How to identify it:**
1. Open the **Priority Dispatch** tab.
2. Review the **Pending Meeting Requests** table on the left. Notice requests range from **Priority 1** (routine syncs) up to **Priority 5** (urgent executive requests).
3. Click the **Execute Heap Dispatch** button.
4. Look at the **Heap Dispatch Sequence** list on the right.
5. Notice that Priority 1 requests appear at rank `#1` at the very top of the processed list, while urgent Priority 5 requests are placed at the bottom. The system is dispatching lowest-priority items first.

**Your task:** Ensure higher-priority meeting requests are always dispatched before lower-priority requests, tie-breaking by earlier start time and request ID.

![BUG-02: Priority Queue Dispatches Lowest Priority Requests First](docs/images/bug-02.png)

---

### BUG-03: Greedy Scheduler Selects Long Meeting Over Multiple Short Meetings
**Problem:**
The schedule optimizer selects a single all-day meeting and rejects four shorter compatible meetings that could have taken place throughout the day, drastically reducing the total number of meetings accommodated.

**How to identify it:**
1. Open the **Scheduling Insights** tab and select the **Greedy Max-Bookings (EFT)** subtab.
2. Review the 5 candidate meeting requests listed on the left, including an all-day bootcamp (`08:30 - 17:00`) alongside four short 1 to 1.5-hour meetings.
3. Click **Run Greedy Optimizer**.
4. Observe the metric badge showing `1 Selected / 4 Rejected`.
5. Look at the output list: only the single all-day meeting (*"All-Day Architecture Bootcamp"*) is marked `SCHEDULED`, while all 4 compatible short meetings are marked `REJECTED`. The system failed to maximize the number of scheduled meetings.

**Your task:** Ensure the scheduler prioritizes meetings that finish earlier so that the maximum number of compatible meetings is scheduled.

![BUG-03: Greedy Scheduler Selects Long Meeting Over Multiple Short Meetings](docs/images/bug-03.png)

---

### BUG-04: Weighted Scheduling Rejects Contiguous Back-to-Back Meetings
**Problem:**
The high-value schedule optimizer calculates a lower total score because it treats back-to-back meetings touching at the exact same hour as conflicting, preventing high-value contiguous meetings from being scheduled together.

**How to identify it:**
1. Open the **Scheduling Insights** tab and select the **Weighted Interval DP (Bellman)** subtab.
2. Review the candidate strategic requests on the left:
   - *Morning Strategy Kickoff* (`09:00 - 10:00`, Weight: 15)
   - *Executive Investor Pitch* (`10:00 - 11:30`, Weight: 25)
   - *Conflicting Cross-Team Sync* (`09:30 - 10:45`, Weight: 30)
   - *Afternoon Tech Deep Dive* (`11:30 - 13:00`, Weight: 20)
3. Click **Compute Optimal DP Set**.
4. Notice that the badge shows `Optimal Score: 30` or `50`, failing to combine back-to-back contiguous meetings (e.g., `09:00 - 10:00` and `10:00 - 11:30`) because the system considers them to overlap.

**Your task:** Ensure back-to-back meetings that touch at the same hour without overlapping minutes are recognized as compatible to achieve the highest possible schedule value.

![BUG-04: Weighted Scheduling Rejects Contiguous Back-to-Back Meetings](docs/images/bug-04.png)

---

### BUG-05: Room Matching Fails to Assign All Eligible Requests
**Problem:**
The automated room assignment tool leaves eligible meeting requests unassigned even though suitable rooms are available through schedule reassignment.

**How to identify it:**
1. Open the **Scheduling Insights** tab and select the **Bipartite Matching (Augmenting Paths)** subtab.
2. Review the 3 meeting requests and their compatible suites:
   - `M-REQ-1`: Compatible with `ROOM-101`, `ROOM-102`
   - `M-REQ-2`: Compatible with `ROOM-101`
   - `M-REQ-3`: Compatible with `ROOM-102`, `ROOM-103`
3. Click **Run Augmenting Path Matching**.
4. Observe the results badge showing `2 / 3 Assigned`.
5. Notice that `M-REQ-3 (UX Research Group)` is shown as `UNASSIGNED: No room could be assigned`, even though assigning `M-REQ-2` to `ROOM-101`, `M-REQ-1` to `ROOM-102`, and `M-REQ-3` to `ROOM-103` would successfully accommodate all 3 requests.

**Your task:** Ensure room tracking properly resets between meeting requests so the system can explore alternative room combinations and match all eligible requests.

![BUG-05: Room Matching Fails to Assign All Eligible Requests](docs/images/bug-05.png)

---

### BUG-06: Conflict Inspector Misses Overlapping Bookings
**Problem:**
Checking a room for scheduling conflicts over a wide time window fails to detect earlier overlapping reservations, giving users false confidence that a room is free.

**How to identify it:**
1. Open the **Conflict Inspector** tab.
2. Select room **The Boardroom (ROOM-101)**.
3. Set Proposed Start Time to **10:00** and Proposed End Time to **16:00**.
4. Click **Query Interval Tree**.
5. Observe the Conflict Detected panel:
   - The system reports: `⚠️ Conflict Detected (1 Overlap)` and only lists the reservation from `14:00 - 15:30`.
   - It completely misses the existing reservation scheduled from `11:00 - 12:30` (*"Product Roadmap & Architecture"*), even though `11:00 - 12:30` falls directly inside the requested `10:00 - 16:00` window.

**Your task:** Ensure the conflict detector inspects all time ranges that overlap the requested query window.

![BUG-06: Conflict Inspector Misses Overlapping Bookings](docs/images/bug-06.png)

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

- **Predecessor Lookup:** Searching for an exact meeting start time on the calendar correctly returns that reservation as the predecessor slot (`Index #1`).
- **Priority Dispatch:** The binary heap dispatch queue processes Priority 5 urgent requests before Priority 1 general requests.
- **Greedy Optimization:** The greedy scheduler selects multiple compatible meetings across the day instead of a single all-day meeting.
- **Weighted Scheduling:** The high-value schedule optimizer recognizes contiguous back-to-back meetings as compatible, calculating the optimal strategic score.
- **Automated Room Matching:** Room reassignment works properly across requests, successfully assigning all three eligible requests to suitable rooms (`3 / 3 Assigned`).
- **Conflict Detection:** The interval tree conflict detector detects all reservations overlapping the specified inspection window (both `11:00 - 12:30` and `14:00 - 15:30`).

All existing room booking, calendar visualization, and operational features must continue working as expected.

---

## 4. Integrated Terminal Commands
Your workspace provides an integrated terminal to execute the following commands:

### Start the Development Server
```bash
python -m flask run --reload --host 0.0.0.0 --port 5000
```
Starts the RoomPilot application locally so you can interact with it through the Live Preview.

### Run Automated Tests
```bash
pytest
```
Executes the available automated test suite to verify your implementation and identify unresolved issues.

Use the Live Preview alongside the terminal to observe application behaviour and verify your changes.

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
