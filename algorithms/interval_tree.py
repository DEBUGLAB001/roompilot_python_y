"""
Interval Tree Module for Overlap Queries and Conflict Detection

Implements an augmented binary search tree storing half-open intervals [start, end).
Each node maintains 'max_end', representing the maximum end time across the subtree.
Enables efficient O(log N + K) conflict and overlap detection.
"""

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
        """Inserts an interval [start, end) into the augmented interval tree."""
        new_node = IntervalNode(start, end, data)
        if self.root is None:
            self.root = new_node
        else:
            self.root = self._insert_node(self.root, new_node)

    @classmethod
    def from_sorted_intervals(cls, sorted_intervals):
        """Builds a balanced interval tree from a list of sorted interval dictionaries."""
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
        else:
            current.right = self._insert_node(current.right, new_node)

        # Update subtree max_end
        current.max_end = max(
            current.end,
            current.left.max_end if current.left else "",
            current.right.max_end if current.right else ""
        )
        return current

    def query_overlapping(self, q_start, q_end):
        """
        Finds all stored intervals [start, end) that overlap with query [q_start, q_end).
        Two intervals [s, e) and [qs, qe) overlap iff s < qe and e > qs.
        
        Returns:
            list[dict]: List of associated data objects for overlapping intervals.
        """
        results = []
        self._search(self.root, q_start, q_end, results)
        return results

    def _search(self, node, q_start, q_end, results):
        if node is None:
            return

        # Check if current node's interval overlaps [q_start, q_end)
        if node.start < q_end and node.end > q_start:
            results.append(node.data)

        if node.left and node.left.max_end >= q_end:
            self._search(node.left, q_start, q_end, results)

        # Search right subtree if there could be an interval starting before q_end
        if node.right and node.start < q_end:
            self._search(node.right, q_start, q_end, results)
