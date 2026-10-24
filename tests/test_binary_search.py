from algorithms.binary_search import find_predecessor_booking

def test_binary_search_predecessor():
    reservations = [
        {"start_time": "09:00", "id": "RES-1"},
        {"start_time": "11:00", "id": "RES-2"},
        {"start_time": "14:00", "id": "RES-3"}
    ]
    idx = find_predecessor_booking(reservations, "11:00")
    assert idx == 1, f"Expected predecessor index 1 for exact match '11:00', got {idx}"
