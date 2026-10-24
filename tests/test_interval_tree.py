from algorithms.interval_tree import IntervalTree

def test_interval_tree_overlap():
    tree = IntervalTree()
    tree.insert("14:00", "15:00", {"id": "RES-ROOT", "name": "Afternoon Review"})
    tree.insert("11:00", "12:00", {"id": "RES-LEFT", "name": "Morning Standup"})

    overlaps = tree.query_overlapping("10:00", "16:00")
    overlap_ids = [o["id"] for o in overlaps]
    assert "RES-LEFT" in overlap_ids, f"Expected overlapping interval RES-LEFT [11:00, 12:00) in results, got {overlap_ids}"
