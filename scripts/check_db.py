#!/usr/bin/env python
"""
Check if database exists and has tables
Returns exit code 0 if DB is ready, 1 if needs initialization
"""
import os
import sys
import sqlite3

db_path = os.path.join('instance', 'atlas_performance.db')

if not os.path.exists(db_path):
    print("Database file does not exist. Needs initialization.")
    sys.exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if tenants table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'")
    result = cursor.fetchone()

    conn.close()

    if result is None:
        print("Database exists but has no tables. Needs initialization.")
        sys.exit(1)
    else:
        print("Database is ready.")
        sys.exit(0)

except Exception as e:
    print(f"Error checking database: {e}")
    sys.exit(1)
