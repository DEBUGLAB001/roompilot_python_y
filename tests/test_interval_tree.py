from algorithms.interval_tree import IntervalTree

def test_interval_tree_overlap():
    tree = IntervalTree()
    tree.insert("14:00", "16:00", {"id": "RES-ROOT", "name": "Executive Review"})
    tree.insert("09:00", "11:00", {"id": "RES-LEFT", "name": "Morning Standup"})
    tree.insert("17:00", "18:00", {"id": "RES-RIGHT", "name": "Wrap-up Session"})
    tree.insert("10:00", "13:30", {"id": "RES-DEEP", "name": "Architecture Deep Dive"})
    tree.insert("06:00", "08:00", {"id": "RES-EARLY", "name": "Early Setup"})

    overlaps = tree.query_overlapping("12:00", "13:00")
    overlap_ids = [o["id"] for o in overlaps]
    assert "RES-DEEP" in overlap_ids, f"Expected overlapping interval RES-DEEP [10:00, 13:30) in results, got {overlap_ids}"
