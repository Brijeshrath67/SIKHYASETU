"""Shared FastAPI dependencies.

The MVP keeps the dependency surface intentionally small: request handlers call
domain services directly because the SQLite driver is local and cheap. This
module is retained as the seam where a request-scoped session would be injected
if the project moves to PostgreSQL.
"""

from __future__ import annotations

from app.infrastructure.db import get_connection, initialize_db

__all__ = ["get_connection", "initialize_db"]
