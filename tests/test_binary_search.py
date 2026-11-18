from algorithms.binary_search import find_predecessor_booking

def test_binary_search_predecessor():
    reservations = [
        {"start_time": "09:00", "id": "RES-1"},
        {"start_time": "11:00", "id": "RES-2"},
        {"start_time": "11:00", "id": "RES-3"},
        {"start_time": "14:00", "id": "RES-4"}
    ]
    idx = find_predecessor_booking(reservations, "11:00")
    assert idx == 2, f"Expected predecessor index 2 (latest reservation with start_time <= '11:00'), got {idx}"
