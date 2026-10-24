"""
RoomPilot Algorithm Suite
Independent, readable implementations of core scheduling algorithms.
"""

from .binary_search import find_predecessor_booking, lower_bound_capacity
from .priority_queue import BookingPriorityQueue
from .greedy_scheduling import schedule_greedy_earliest_finish
from .weighted_interval_scheduling import solve_weighted_interval_scheduling
from .bipartite_matching import find_maximum_bipartite_matching
from .interval_tree import IntervalTree

__all__ = [
    "find_predecessor_booking",
    "lower_bound_capacity",
    "BookingPriorityQueue",
    "schedule_greedy_earliest_finish",
    "solve_weighted_interval_scheduling",
    "find_maximum_bipartite_matching",
    "IntervalTree",
]
