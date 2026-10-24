"""
Priority Queue Module for Booking Request Dispatch

Implements a binary heap priority queue to schedule booking requests.
Defined Policy:
1. Higher priority score first (e.g. 5 > 4 > 3 > 2 > 1).
2. Earlier requested start time as secondary tie-breaker (e.g. '09:00' before '14:00').
3. Request ID lexicographically as final deterministic tie-breaker.
"""

class BookingPriorityQueue:
    def __init__(self):
        self.heap = []

    def _has_higher_priority(self, a, b):
        """
        Returns True if item 'a' should precede item 'b' in the priority queue.
        """
        p_a = a.get("priority", 0)
        p_b = b.get("priority", 0)

        if p_a != p_b:
            return p_a < p_b

        # Secondary tie-breaker: earlier start time first
        s_a = a.get("start_time", "")
        s_b = b.get("start_time", "")
        if s_a != s_b:
            return s_a < s_b

        # Tertiary deterministic tie-breaker: request ID
        return str(a.get("id", "")) < str(b.get("id", ""))

    def push(self, item):
        """Insert a booking request into the heap."""
        self.heap.append(item)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        """Remove and return the highest priority booking request."""
        if not self.heap:
            raise IndexError("pop from empty priority queue")
        if len(self.heap) == 1:
            return self.heap.pop()

        top_item = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return top_item

    def peek(self):
        """Return the highest priority booking request without removing it."""
        if not self.heap:
            return None
        return self.heap[0]

    def _sift_up(self, index):
        while index > 0:
            parent = (index - 1) // 2
            if self._has_higher_priority(self.heap[index], self.heap[parent]):
                self.heap[index], self.heap[parent] = self.heap[parent], self.heap[index]
                index = parent
            else:
                break

    def _sift_down(self, index):
        size = len(self.heap)
        while True:
            best = index
            left = 2 * index + 1
            right = 2 * index + 2

            if left < size and self._has_higher_priority(self.heap[left], self.heap[best]):
                best = left
            if right < size and self._has_higher_priority(self.heap[right], self.heap[best]):
                best = right

            if best != index:
                self.heap[index], self.heap[best] = self.heap[best], self.heap[index]
                index = best
            else:
                break

    def is_empty(self):
        return len(self.heap) == 0

    def __len__(self):
        return len(self.heap)

    def to_sorted_list(self):
        """Drain the heap to return all items in priority order."""
        # Create a shallow copy of the heap list to avoid mutating state
        temp_pq = BookingPriorityQueue()
        temp_pq.heap = list(self.heap)
        sorted_items = []
        while not temp_pq.is_empty():
            sorted_items.append(temp_pq.pop())
        return sorted_items
