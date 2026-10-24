from algorithms.bipartite_matching import find_maximum_bipartite_matching

def test_bipartite_matching():
    requests = [
        {"id": "REQ-1", "allowed_rooms": ["ROOM-A", "ROOM-B"]},
        {"id": "REQ-2", "allowed_rooms": ["ROOM-A"]},
        {"id": "REQ-3", "allowed_rooms": ["ROOM-B", "ROOM-C"]},
    ]
    rooms = [
        {"id": "ROOM-A"},
        {"id": "ROOM-B"},
        {"id": "ROOM-C"}
    ]
    def compat(req, room):
        return room["id"] in req.get("allowed_rooms", [])

    res = find_maximum_bipartite_matching(requests, rooms, compat)
    assert res["matched_count"] == 3, f"Expected maximum matching of 3 requests, but got {res['matched_count']}"
