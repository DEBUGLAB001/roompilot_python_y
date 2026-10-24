from algorithms.priority_queue import BookingPriorityQueue

def test_priority_queue_dispatch():
    pq = BookingPriorityQueue()
    pq.push({"id": "REQ-LOW", "priority": 1, "start_time": "10:00"})
    pq.push({"id": "REQ-MED", "priority": 3, "start_time": "11:00"})
    pq.push({"id": "REQ-HIGH", "priority": 5, "start_time": "09:00"})
    first = pq.pop()
    assert first["id"] == "REQ-HIGH", f"Expected highest priority REQ-HIGH (P5) first, but got {first['id']} (P{first.get('priority')})"
