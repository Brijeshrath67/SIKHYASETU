"""Create the SQLite schema and load demo profiles + seed packs.

    python backend/scripts/bootstrap_db.py [--reset]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.domain.services.learner_service import seed_demo_profiles  # noqa: E402
from app.domain.services.pack_service import seed_initial_packs  # noqa: E402
from app.infrastructure.db import initialize_db, reset_db  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap the SikhyaSetu database.")
    parser.add_argument("--reset", action="store_true", help="drop and recreate all tables first")
    args = parser.parse_args()

    if args.reset:
        reset_db()
        print("Reset database.")
    initialize_db()
    seed_demo_profiles()
    seed_initial_packs()
    print("Database ready with demo learners and seed packs.")


if __name__ == "__main__":
    main()
