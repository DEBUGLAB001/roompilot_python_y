"""
Bipartite Matching and Augmenting Paths Module

Assigns meeting requests (left partition) to suitable meeting rooms (right partition).
An edge exists if a room satisfies the request's capacity, equipment, and availability.
Finds maximum cardinality bipartite matching using augmenting path search.
"""

def find_maximum_bipartite_matching(requests, rooms, compatibility_fn=None):
    """
    Computes maximum bipartite matching between requests and rooms.
    
    Parameters:
        requests (list[dict]): Meeting requests.
        rooms (list[dict]): Meeting rooms.
        compatibility_fn (callable, optional): fn(request, room) -> bool.
        
    Returns:
        dict: {
            "assignments": dict[str, str], # request_id -> room_id
            "room_to_request": dict[str, str], # room_id -> request_id
            "matched_count": int,
            "unassigned_requests": list[dict]
        }
    """
    if not requests or not rooms:
        return {
            "assignments": {},
            "room_to_request": {},
            "matched_count": 0,
            "unassigned_requests": list(requests)
        }

    # Build adjacency: request_id -> list of compatible room_ids
    adj = {}
    for req in requests:
        compatible = []
        for room in rooms:
            if compatibility_fn:
                is_compat = compatibility_fn(req, room)
            else:
                # Default compatibility: capacity check
                req_cap = req.get("required_capacity", 1)
                room_cap = room.get("capacity", 0)
                is_compat = room_cap >= req_cap
            if is_compat:
                compatible.append(room["id"])
        adj[req["id"]] = compatible

    # room_match: maps room_id -> request_id
    room_match = {room["id"]: None for room in rooms}

    def dfs_augment(req_id, visited):
        """Attempts to find an augmenting path for req_id."""
        for room_id in adj.get(req_id, []):
            if room_id not in visited:
                visited.add(room_id)
                occupant = room_match[room_id]
                # If room is free or occupant can be reassigned to another room
                if occupant is None or dfs_augment(occupant, visited):
                    room_match[room_id] = req_id
                    return True
        return False

    visited_rooms = set()

    for req in requests:
        dfs_augment(req["id"], visited_rooms)

    # Reconstruct request -> room assignments
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
