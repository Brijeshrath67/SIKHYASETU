"""SQLite persistence layer.

The MVP uses the Python standard-library sqlite3 driver against a local file so
the demo has no external database dependency. All access goes through small
helpers here; the schema is PostgreSQL-compatible in shape (no SQLite-only
types are relied upon) so a later migration stays straightforward.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.config import DB_DIR

DATABASE_FILE = DB_DIR / "sikhyasetu.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    language TEXT NOT NULL,
    data_budget_mb REAL NOT NULL,
    session_minutes INTEGER NOT NULL,
    consent_identification INTEGER NOT NULL DEFAULT 0,
    last_synced_at TEXT
);

CREATE TABLE IF NOT EXISTS mastery_states (
    profile_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    mastery REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unresolved',
    misconception_id TEXT,
    confidence REAL NOT NULL DEFAULT 0,
    evidence TEXT NOT NULL DEFAULT '[]',
    next_review_at TEXT,
    updated_at TEXT,
    PRIMARY KEY (profile_id, concept_id)
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    type TEXT NOT NULL,
    pack_id TEXT,
    concept_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    processed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lesson_packs (
    pack_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    pack_version TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    concept_ids TEXT NOT NULL DEFAULT '[]',
    payload TEXT NOT NULL,
    checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teach_backs (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    transcript TEXT NOT NULL,
    audio_ref TEXT,
    diagnosis TEXT NOT NULL DEFAULT '{}',
    score REAL NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0,
    needs_review INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    graded_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    created_at TEXT NOT NULL,
    payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_profile ON events (profile_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);
CREATE INDEX IF NOT EXISTS idx_fingerprint_profile ON mastery_states (profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_profile ON agent_runs (profile_id);
"""


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_FILE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_db() -> None:
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(SCHEMA)
        conn.commit()


def reset_db() -> None:
    """Drop and recreate all tables. Used by tests and demo reseeding."""
    if DATABASE_FILE.exists():
        DATABASE_FILE.unlink()
    initialize_db()


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def json_loads(value: str | None, default: Any = None) -> Any:
    if value in (None, ""):
        return default if default is not None else {}
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default if default is not None else {}


def data_dir() -> Path:
    return DB_DIR
