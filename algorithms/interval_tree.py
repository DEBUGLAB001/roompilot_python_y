class IntervalNode:
    def __init__(self, start, end, data=None):
        self.start = start
        self.end = end
        self.data = data or {}
        self.max_end = end
        self.left = None
        self.right = None

class IntervalTree:
    def __init__(self):
        self.root = None

    def insert(self, start, end, data=None):
        new_node = IntervalNode(start, end, data)
        if self.root is None:
            self.root = new_node
        else:
            self.root = self._insert_node(self.root, new_node)

    @classmethod
    def from_sorted_intervals(cls, sorted_intervals):
        tree = cls()
        def _build_helper(items):
            if not items:
                return
            mid = len(items) // 2
            item = items[mid]
            tree.insert(item["start_time"], item["end_time"], item)
            _build_helper(items[:mid])
            _build_helper(items[mid + 1:])
        _build_helper(sorted_intervals)
        return tree

    def _insert_node(self, current, new_node):
        if current is None:
            return new_node

        if new_node.start < current.start:
            current.left = self._insert_node(current.left, new_node)
            current.max_end = max(current.end, current.left.max_end)
        else:
            current.right = self._insert_node(current.right, new_node)
            current.max_end = max(current.end, current.right.max_end)

        return current

    def query_overlapping(self, q_start, q_end):
        results = []
        self._search(self.root, q_start, q_end, results)
        return results

    def _search(self, node, q_start, q_end, results):
        if node is None:
            return

        if node.start < q_end and node.end > q_start:
            results.append(node.data)

        if node.left and node.left.max_end > q_start:
            self._search(node.left, q_start, q_end, results)

        if node.right and node.start < q_end:
            self._search(node.right, q_start, q_end, results)
