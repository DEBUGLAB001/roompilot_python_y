from algorithms.priority_queue import BookingPriorityQueue

def test_priority_queue_dispatch():
    pq = BookingPriorityQueue()
    pq.push({"id": "REQ-10", "priority": 4, "start_time": "13:00"})
    pq.push({"id": "REQ-30", "priority": 3, "start_time": "10:00"})
    pq.push({"id": "REQ-20", "priority": 4, "start_time": "09:00"})
    first = pq.pop()
    assert first["id"] == "REQ-20", f"Expected highest priority request REQ-20 (P4, 09:00) first, but got {first['id']} (P{first.get('priority')}, {first.get('start_time')})"
