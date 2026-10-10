import json
import sqlite3
from pathlib import Path

from app.config import DB_DIR

DATABASE_FILE = DB_DIR / "sikhyasetu.db"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_db() -> None:
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                grade TEXT NOT NULL,
                subject TEXT NOT NULL,
                language TEXT NOT NULL,
                data_budget_mb REAL NOT NULL,
                session_minutes INTEGER NOT NULL,
                misconception_map TEXT NOT NULL DEFAULT '{}',
                last_synced_at TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS lesson_packs (
                pack_id TEXT PRIMARY KEY,
                profile_id TEXT NOT NULL,
                concept TEXT NOT NULL,
                title TEXT NOT NULL,
                objective TEXT NOT NULL,
                explanation TEXT NOT NULL,
                probe_question TEXT NOT NULL,
                options TEXT NOT NULL,
                correct_answer TEXT NOT NULL,
                misconception TEXT NOT NULL,
                intervention TEXT NOT NULL,
                teach_back_prompt TEXT NOT NULL,
                budget_kb INTEGER NOT NULL,
                completion_minutes INTEGER NOT NULL,
                signature TEXT NOT NULL,
                trace TEXT NOT NULL DEFAULT '[]'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                profile_id TEXT NOT NULL,
                type TEXT NOT NULL,
                details TEXT NOT NULL,
                created_at TEXT NOT NULL,
                processed INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()


def json_dumps(value):
    return json.dumps(value, ensure_ascii=False)


def json_loads(value):
    if value in (None, ""):
        return {}
    return json.loads(value)
