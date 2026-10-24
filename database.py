"""
Database initialization and access layer for RoomPilot.
Uses SQLite with WAL mode for fast concurrent queries and clean ACID transactions.
"""

import sqlite3
import os
import json

DB_FILE = os.path.join(os.path.dirname(__file__), "roompilot.db")

def get_db():
    """Returns a SQLite connection with dict-like row factory."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db(force=False):
    """Initializes tables and seeds deterministic data."""
    if force and os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass

    conn = get_db()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                capacity INTEGER NOT NULL,
                floor INTEGER NOT NULL,
                amenities TEXT NOT NULL,
                color TEXT NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                title TEXT NOT NULL,
                organizer TEXT NOT NULL,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 3,
                status TEXT NOT NULL DEFAULT 'confirmed',
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS meeting_requests (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                organizer TEXT NOT NULL,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                required_capacity INTEGER NOT NULL,
                required_amenities TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 3,
                status TEXT NOT NULL DEFAULT 'pending',
                assigned_room_id TEXT,
                FOREIGN KEY (assigned_room_id) REFERENCES rooms(id) ON DELETE SET NULL
            )
        """)

        # Seed initial data if rooms table is empty
        cur = conn.execute("SELECT COUNT(*) FROM rooms")
        if cur.fetchone()[0] == 0:
            seed_data(conn)

    conn.close()

def seed_data(conn):
    """Seeds realistic workplace rooms, initial reservations, and algorithm test requests."""
    rooms = [
        ("ROOM-101", "Ada Lovelace Boardroom", 20, 1, "4K Display, Video Conf, Whiteboard, Mic Pods", "#6366f1"),
        ("ROOM-102", "Alan Turing Suite", 12, 1, "Video Conf, Dual Monitors, Whiteboard", "#8b5cf6"),
        ("ROOM-103", "Grace Hopper Studio", 8, 1, "4K Display, Whiteboard, Podcasting Mic", "#ec4899"),
        ("ROOM-104", "Claude Shannon Lab", 6, 1, "Whiteboard, Digital Canvas", "#06b6d4"),
        ("ROOM-201", "Margaret Hamilton Hall", 16, 2, "4K Display, Video Conf, Soundproofing", "#3b82f6"),
        ("ROOM-202", "John von Neumann Room", 10, 2, "Video Conf, Whiteboard, Projector", "#10b981"),
        ("ROOM-203", "Katherine Johnson Lab", 6, 2, "Dual Monitors, Whiteboard", "#f59e0b"),
        ("ROOM-204", "Linus Torvalds Hub", 4, 2, "Video Conf, Focus Pod", "#14b8a6"),
    ]
    conn.executemany("INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?)", rooms)

    today = "2026-10-24"
    reservations = [
        ("RES-101", "ROOM-101", "Executive Strategy Briefing", "Elena Rostova", today, "09:00", "10:30", 5, "confirmed"),
        ("RES-102", "ROOM-101", "Q3 Financial Audit", "Marcus Vance", today, "11:00", "12:30", 4, "confirmed"),
        ("RES-103", "ROOM-101", "Board of Directors Q&A", "Sarah Chen", today, "14:00", "15:30", 5, "confirmed"),
        ("RES-104", "ROOM-102", "Core AI Architecture Review", "Dr. Aris Thorne", today, "09:30", "11:00", 4, "confirmed"),
        ("RES-105", "ROOM-102", "Platform Security Sync", "Devin Cole", today, "11:30", "12:30", 3, "confirmed"),
        ("RES-106", "ROOM-102", "Design System Walkthrough", "Maya Patel", today, "13:30", "15:00", 3, "confirmed"),
        ("RES-107", "ROOM-103", "Podcast: Tech Pioneers Ep. 42", "Liam O'Connor", today, "10:00", "11:30", 3, "confirmed"),
        ("RES-108", "ROOM-103", "UX Usability Lab Sessions", "Rachel Green", today, "14:00", "16:00", 4, "confirmed"),
        ("RES-109", "ROOM-201", "All-Hands Product Launch", "Alex Rivera", today, "10:00", "12:00", 5, "confirmed"),
        ("RES-110", "ROOM-202", "Data Pipeline Retrospective", "Karan Mehta", today, "13:00", "14:30", 3, "confirmed"),
    ]
    conn.executemany("INSERT INTO reservations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", reservations)

    requests = [
        # Candidate pool for priority queue and matching demonstrations
        ("REQ-01", "VIP Executive Partnership", "Elena Rostova", today, "09:00", "10:00", 14, "Video Conf", 5, "pending", None),
        ("REQ-02", "Product Roadmap Alignment", "Alex Rivera", today, "10:00", "11:30", 10, "Whiteboard", 4, "pending", None),
        ("REQ-03", "Infrastructure Sprint Triage", "Marcus Vance", today, "11:30", "12:30", 6, "Dual Monitors", 3, "pending", None),
        ("REQ-04", "Customer Escalation Debrief", "Sarah Chen", today, "13:00", "14:00", 8, "Video Conf", 4, "pending", None),
        ("REQ-05", "Casual Team Coffee Sync", "Liam O'Connor", today, "09:00", "09:45", 4, "None", 1, "pending", None),
        ("REQ-06", "Security Pen-test Retrospective", "Devin Cole", today, "14:30", "16:00", 12, "Soundproofing", 5, "pending", None),
    ]
    conn.executemany("INSERT INTO meeting_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", requests)
