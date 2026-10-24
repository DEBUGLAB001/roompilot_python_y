"""
Binary Search and Predecessor Lookup Module

Provides binary-search-based timeline navigation and predecessor lookup
over sorted reservation records and capacity-based room queries.
"""

def find_predecessor_booking(sorted_reservations, target_time):
    """
    Find the index of the latest reservation whose start_time <= target_time.
    
    Parameters:
        sorted_reservations (list[dict]): Reservations sorted ascending by start_time.
        target_time (str): Target time formatted as 'HH:MM' (24-hour).
        
    Returns:
        int: Index of the predecessor reservation in sorted_reservations, or -1 if none found.
    """
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
    """
    Find the index of the first room with capacity >= min_capacity.
    Rooms must be sorted ascending by capacity.
    
    Parameters:
        sorted_rooms (list[dict]): Rooms sorted ascending by capacity.
        min_capacity (int): Minimum required capacity.
        
    Returns:
        int: Index of the first matching room, or -1 if no room meets the capacity.
    """
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
