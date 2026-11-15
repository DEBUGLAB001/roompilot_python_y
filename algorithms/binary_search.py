def find_predecessor_booking(sorted_reservations, target_time):
    if not sorted_reservations:
        return -1

    low = 0
    high = len(sorted_reservations) - 1
    result_idx = -1

    while low <= high:
        mid = (low + high) // 2
        mid_start = sorted_reservations[mid].get("start_time", "")

        if mid_start < target_time:
            result_idx = mid
            low = mid + 1
        else:
            high = mid - 1

    return result_idx

def lower_bound_capacity(sorted_rooms, min_capacity):
    if not sorted_rooms:
        return -1

    low = 0
    high = len(sorted_rooms) - 1
    result_idx = -1

    while low <= high:
        mid = (low + high) // 2
        cap = sorted_rooms[mid].get("capacity", 0)
        if cap >= min_capacity:
            result_idx = mid
            high = mid - 1
        else:
            low = mid + 1

    return result_idx
