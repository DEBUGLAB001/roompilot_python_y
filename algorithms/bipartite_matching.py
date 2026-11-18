def find_maximum_bipartite_matching(requests, rooms, compatibility_fn=None):
    if not requests or not rooms:
        return {
            "assignments": {},
            "room_to_request": {},
            "matched_count": 0,
            "unassigned_requests": list(requests)
        }

    adj = {}
    for req in requests:
        compatible = []
        for room in rooms:
            if compatibility_fn:
                is_compat = compatibility_fn(req, room)
            else:
                req_cap = req.get("required_capacity", 1)
                room_cap = room.get("capacity", 0)
                is_compat = room_cap >= req_cap
            if is_compat:
                compatible.append(room["id"])
        adj[req["id"]] = compatible

    room_match = {room["id"]: None for room in rooms}

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

    for req in requests:
        visited_rooms = set()
        dfs_augment(req["id"], visited_rooms)

    assignments = {}
    for r_id, req_id in room_match.items():
        if req_id is not None:
            assignments[req_id] = r_id

    unassigned = [req for req in requests if req["id"] not in assignments]

    return {
        "assignments": assignments,
        "room_to_request": {k: v for k, v in room_match.items() if v is not None},
        "matched_count": len(assignments),
        "unassigned_requests": unassigned
    }
