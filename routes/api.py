"""
RoomPilot REST API routes.
Connects database storage, business validation, and genuine algorithm engines.
"""

from flask import Blueprint, request, jsonify
from database import get_db, init_db
import uuid
from algorithms import (
    find_predecessor_booking,
    lower_bound_capacity,
    BookingPriorityQueue,
    schedule_greedy_earliest_finish,
    solve_weighted_interval_scheduling,
    find_maximum_bipartite_matching,
    IntervalTree
)

api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "RoomPilot Engine"}), 200

@api_bp.route("/stats", methods=["GET"])
def get_stats():
    conn = get_db()
    today = "2026-10-24"
    
    total_rooms = conn.execute("SELECT COUNT(*) FROM rooms").fetchone()[0]
    total_bookings = conn.execute("SELECT COUNT(*) FROM reservations WHERE date = ?", (today,)).fetchone()[0]
    total_requests = conn.execute("SELECT COUNT(*) FROM meeting_requests WHERE status = 'pending'").fetchone()[0]
    
    # Calculate currently active bookings (assuming current hour is 10:00 for demo)
    active_now = conn.execute(
        "SELECT COUNT(*) FROM reservations WHERE date = ? AND start_time <= '10:00' AND end_time > '10:00'",
        (today,)
    ).fetchone()[0]
    
    available_rooms = max(0, total_rooms - active_now)
    utilization_pct = round((total_bookings / (total_rooms * 6)) * 100, 1) if total_rooms else 0.0

    conn.close()
    return jsonify({
        "total_rooms": total_rooms,
        "available_rooms": available_rooms,
        "today_bookings": total_bookings,
        "pending_requests": total_requests,
        "active_now": active_now,
        "utilization_pct": min(100.0, utilization_pct)
    }), 200

@api_bp.route("/rooms", methods=["GET"])
def get_rooms():
    conn = get_db()
    today = "2026-10-24"
    rooms = conn.execute("SELECT * FROM rooms ORDER BY floor, capacity DESC").fetchall()
    
    room_list = []
    for r in rooms:
        # Check active bookings today
        bookings = conn.execute(
            "SELECT * FROM reservations WHERE room_id = ? AND date = ? ORDER BY start_time",
            (r["id"], today)
        ).fetchall()
        
        is_occupied_now = any(
            b["start_time"] <= "10:00" < b["end_time"] for b in bookings
        )
        
        room_list.append({
            "id": r["id"],
            "name": r["name"],
            "capacity": r["capacity"],
            "floor": r["floor"],
            "amenities": [a.strip() for a in r["amenities"].split(",") if a.strip()],
            "color": r["color"],
            "is_available_now": not is_occupied_now,
            "bookings_count": len(bookings)
        })
        
    conn.close()
    return jsonify(room_list), 200

@api_bp.route("/rooms/<room_id>", methods=["GET"])
def get_room_details(room_id):
    conn = get_db()
    room = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
    if not room:
        conn.close()
        return jsonify({"error": "Room not found"}), 404

    bookings = conn.execute(
        "SELECT * FROM reservations WHERE room_id = ? ORDER BY date, start_time",
        (room_id,)
    ).fetchall()
    
    conn.close()
    return jsonify({
        "id": room["id"],
        "name": room["name"],
        "capacity": room["capacity"],
        "floor": room["floor"],
        "amenities": [a.strip() for a in room["amenities"].split(",") if a.strip()],
        "color": room["color"],
        "reservations": [dict(b) for b in bookings]
    }), 200

@api_bp.route("/reservations", methods=["GET"])
def get_reservations():
    date = request.args.get("date", "2026-10-24")
    room_id = request.args.get("room_id")
    
    conn = get_db()
    if room_id:
        rows = conn.execute(
            "SELECT r.*, rm.name as room_name, rm.color as room_color FROM reservations r JOIN rooms rm ON r.room_id = rm.id WHERE r.date = ? AND r.room_id = ? ORDER BY r.start_time",
            (date, room_id)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT r.*, rm.name as room_name, rm.color as room_color FROM reservations r JOIN rooms rm ON r.room_id = rm.id WHERE r.date = ? ORDER BY r.start_time",
            (date,)
        ).fetchall()
        
    conn.close()
    return jsonify([dict(row) for row in rows]), 200

@api_bp.route("/reservations", methods=["POST"])
def create_reservation():
    data = request.get_json() or {}
    room_id = data.get("room_id")
    title = data.get("title", "").strip()
    organizer = data.get("organizer", "").strip()
    date = data.get("date", "2026-10-24")
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    priority = int(data.get("priority", 3))

    if not (room_id and title and start_time and end_time):
        return jsonify({"error": "Missing required booking fields"}), 400

    if start_time >= end_time:
        return jsonify({"error": "Start time must be strictly before end time"}), 400

    conn = get_db()
    # Check room existence
    room = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
    if not room:
        conn.close()
        return jsonify({"error": f"Room '{room_id}' does not exist"}), 404

    # Conflict check using existing bookings
    conflicts = conn.execute(
        """SELECT * FROM reservations
           WHERE room_id = ? AND date = ?
           AND start_time < ? AND end_time > ?""",
        (room_id, date, end_time, start_time)
    ).fetchall()

    if conflicts:
        conn.close()
        conf_titles = ", ".join([c["title"] for c in conflicts])
        return jsonify({
            "error": f"Schedule conflict with existing reservation(s): {conf_titles}",
            "conflicts": [dict(c) for c in conflicts]
        }), 409

    res_id = f"RES-{uuid.uuid4().hex[:6].upper()}"
    with conn:
        conn.execute(
            "INSERT INTO reservations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (res_id, room_id, title, organizer or "Anonymous", date, start_time, end_time, priority, "confirmed")
        )
    conn.close()

    return jsonify({
        "message": "Reservation confirmed successfully",
        "reservation": {
            "id": res_id,
            "room_id": room_id,
            "title": title,
            "organizer": organizer,
            "date": date,
            "start_time": start_time,
            "end_time": end_time,
            "priority": priority,
            "status": "confirmed"
        }
    }), 201

@api_bp.route("/reservations/<res_id>", methods=["DELETE"])
def cancel_reservation(res_id):
    conn = get_db()
    existing = conn.execute("SELECT * FROM reservations WHERE id = ?", (res_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "Reservation not found"}), 404

    with conn:
        conn.execute("DELETE FROM reservations WHERE id = ?", (res_id,))
    conn.close()
    return jsonify({"message": f"Reservation {res_id} cancelled successfully"}), 200

@api_bp.route("/requests", methods=["GET"])
def get_requests():
    conn = get_db()
    rows = conn.execute("SELECT * FROM meeting_requests ORDER BY priority DESC, start_time").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200

@api_bp.route("/requests", methods=["POST"])
def create_request():
    data = request.get_json() or {}
    req_id = f"REQ-{uuid.uuid4().hex[:4].upper()}"
    title = data.get("title", "Ad-hoc Sync")
    organizer = data.get("organizer", "Staff")
    date = data.get("date", "2026-10-24")
    start_time = data.get("start_time", "10:00")
    end_time = data.get("end_time", "11:00")
    cap = int(data.get("required_capacity", 4))
    amenities = data.get("required_amenities", "Whiteboard")
    priority = int(data.get("priority", 3))

    conn = get_db()
    with conn:
        conn.execute(
            "INSERT INTO meeting_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (req_id, title, organizer, date, start_time, end_time, cap, amenities, priority, "pending", None)
        )
    conn.close()
    return jsonify({"message": "Request created", "id": req_id}), 201

@api_bp.route("/reset-demo-data", methods=["POST"])
def reset_data():
    init_db(force=True)
    return jsonify({"message": "Database reset to initial demo seeds."}), 200

# =========================================================================
# Algorithm Integration Endpoints
# =========================================================================

@api_bp.route("/algorithms/timeline-predecessor", methods=["GET"])
def timeline_predecessor():
    """
    Uses binary search to find the latest reservation starting at or before target_time.
    """
    target_time = request.args.get("target_time", "11:00")
    room_id = request.args.get("room_id", "ROOM-101")
    date = request.args.get("date", "2026-10-24")

    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM reservations WHERE room_id = ? AND date = ? ORDER BY start_time",
        (room_id, date)
    ).fetchall()
    conn.close()

    sorted_reservations = [dict(r) for r in rows]
    pred_idx = find_predecessor_booking(sorted_reservations, target_time)
    
    predecessor = sorted_reservations[pred_idx] if (0 <= pred_idx < len(sorted_reservations)) else None

    return jsonify({
        "room_id": room_id,
        "target_time": target_time,
        "total_reservations": len(sorted_reservations),
        "sorted_start_times": [r["start_time"] for r in sorted_reservations],
        "predecessor_index": pred_idx,
        "predecessor": predecessor
    }), 200


@api_bp.route("/algorithms/priority-queue/dispatch", methods=["POST"])
def pq_dispatch():
    """
    Processes booking requests through BookingPriorityQueue heap.
    """
    data = request.get_json() or {}
    items = data.get("requests")
    
    if items is None:
        conn = get_db()
        rows = conn.execute("SELECT * FROM meeting_requests WHERE status = 'pending'").fetchall()
        conn.close()
        items = [dict(r) for r in rows]

    pq = BookingPriorityQueue()
    for item in items:
        pq.push(item)

    dispatch_order = []
    while not pq.is_empty():
        dispatch_order.append(pq.pop())

    return jsonify({
        "input_count": len(items),
        "dispatch_order": dispatch_order
    }), 200


@api_bp.route("/algorithms/greedy-schedule", methods=["POST"])
def greedy_schedule():
    """
    Computes compatible set using greedy scheduling.
    """
    data = request.get_json() or {}
    candidates = data.get("candidates")

    if candidates is None:
        # Default candidate dataset for greedy scheduling
        candidates = [
            {"id": "REQ-G1", "title": "All-Day Architecture Bootcamp", "start_time": "08:30", "end_time": "17:00", "priority": 3},
            {"id": "REQ-G2", "title": "Morning Standup", "start_time": "09:00", "end_time": "10:00", "priority": 4},
            {"id": "REQ-G3", "title": "Design System Review", "start_time": "10:30", "end_time": "12:00", "priority": 3},
            {"id": "REQ-G4", "title": "Client Roadmap Demo", "start_time": "13:00", "end_time": "14:30", "priority": 5},
            {"id": "REQ-G5", "title": "Sprint Retrospective", "start_time": "15:00", "end_time": "16:30", "priority": 4},
        ]

    result = schedule_greedy_earliest_finish(candidates)
    return jsonify(result), 200


@api_bp.route("/algorithms/weighted-schedule", methods=["POST"])
def weighted_schedule():
    """
    Computes optimal weight set using dynamic programming.
    """
    data = request.get_json() or {}
    candidates = data.get("candidates")

    if candidates is None:
        # Default candidate dataset for weighted DP
        candidates = [
            {"id": "W-REQ-1", "title": "Morning Strategy Kickoff", "start_time": "09:00", "end_time": "10:00", "weight": 15},
            {"id": "W-REQ-2", "title": "Executive Investor Pitch", "start_time": "10:00", "end_time": "11:30", "weight": 25},
            {"id": "W-REQ-3", "title": "Conflicting Cross-Team Sync", "start_time": "09:30", "end_time": "10:45", "weight": 30},
            {"id": "W-REQ-4", "title": "Afternoon Tech Deep Dive", "start_time": "11:30", "end_time": "13:00", "weight": 20},
        ]

    result = solve_weighted_interval_scheduling(candidates)
    return jsonify(result), 200


@api_bp.route("/algorithms/bipartite-matching", methods=["POST"])
def bipartite_match():
    """
    Computes maximum bipartite matching between requests and rooms.
    """
    data = request.get_json() or {}
    requests_input = data.get("requests")
    rooms_input = data.get("rooms")

    if rooms_input is None:
        conn = get_db()
        rooms_rows = conn.execute("SELECT id, name, capacity, amenities FROM rooms WHERE floor = 1").fetchall()
        conn.close()
        rooms_input = [dict(r) for r in rooms_rows]

    if requests_input is None:
        # Test graph where augmenting path reassignment is required:
        # Req 1 can take Room 101 or 102
        # Req 2 can ONLY take Room 101
        # Req 3 can take Room 102 or 103
        requests_input = [
            {"id": "M-REQ-1", "title": "Customer Success Sync", "required_capacity": 12, "allowed_rooms": ["ROOM-101", "ROOM-102"]},
            {"id": "M-REQ-2", "title": "VIP Board Meeting", "required_capacity": 18, "allowed_rooms": ["ROOM-101"]},
            {"id": "M-REQ-3", "title": "UX Research Group", "required_capacity": 8, "allowed_rooms": ["ROOM-102", "ROOM-103"]},
        ]

    def custom_compat(req, room):
        allowed = req.get("allowed_rooms")
        if allowed is not None:
            return room["id"] in allowed
        return room.get("capacity", 0) >= req.get("required_capacity", 1)

    result = find_maximum_bipartite_matching(requests_input, rooms_input, custom_compat)
    return jsonify(result), 200


@api_bp.route("/algorithms/interval-conflict-query", methods=["POST"])
def interval_conflict_query():
    """
    Queries interval tree for overlaps with [q_start, q_end).
    """
    data = request.get_json() or {}
    room_id = data.get("room_id", "ROOM-101")
    q_start = data.get("start_time", "10:00")
    q_end = data.get("end_time", "16:00")
    date = data.get("date", "2026-10-24")

    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM reservations WHERE room_id = ? AND date = ? ORDER BY start_time",
        (room_id, date)
    ).fetchall()
    conn.close()

    sorted_list = [dict(r) for r in rows]
    tree = IntervalTree.from_sorted_intervals(sorted_list)
    overlaps = tree.query_overlapping(q_start, q_end)

    return jsonify({
        "room_id": room_id,
        "query_range": [q_start, q_end],
        "conflicts": overlaps,
        "has_conflict": len(overlaps) > 0,
        "conflict_count": len(overlaps)
    }), 200
