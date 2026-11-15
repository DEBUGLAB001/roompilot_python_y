class BookingPriorityQueue:
    def __init__(self):
        self.heap = []

    def _has_higher_priority(self, a, b):
        p_a = a.get("priority", 0)
        p_b = b.get("priority", 0)

        if p_a != p_b:
            return p_a < p_b

        s_a = a.get("start_time", "")
        s_b = b.get("start_time", "")
        if s_a != s_b:
            return s_a < s_b

        return str(a.get("id", "")) < str(b.get("id", ""))

    def push(self, item):
        self.heap.append(item)
        self._sift_up(len(self.heap) - 1)

    def pop(self):
        if not self.heap:
            raise IndexError("pop from empty priority queue")
        if len(self.heap) == 1:
            return self.heap.pop()

        top_item = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._sift_down(0)
        return top_item

    def peek(self):
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
        temp_pq = BookingPriorityQueue()
        temp_pq.heap = list(self.heap)
        sorted_items = []
        while not temp_pq.is_empty():
            sorted_items.append(temp_pq.pop())
        return sorted_items
