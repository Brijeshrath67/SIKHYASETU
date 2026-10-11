"""Export signed seed packs + profiles for the offline PWA.

The compiled packs are bundled with the frontend so the hero demo runs with the
network switched off and no backend available. Run from the repository:

    python backend/scripts/export_pack.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.domain.services import clock  # noqa: E402
from app.domain.services.learner_service import list_profiles, seed_demo_profiles  # noqa: E402
from app.domain.services.pack_service import compile_pack  # noqa: E402
from app.infrastructure.db import initialize_db, json_dumps  # noqa: E402

OUTPUT = ROOT / "frontend" / "src" / "shared" / "content" / "seed-packs.json"


def main() -> None:
    initialize_db()
    seed_demo_profiles()
    profiles = list_profiles()
    packs = {}
    for profile in profiles:
        pack = compile_pack(
            profile.id,
            profile,
            trace=["export: offline seed pack"],
            provenance_source="seed",
        )
        packs[profile.id] = pack.model_dump(mode="json")

    bundle = {
        "version": "1.0.0",
        "generated_at": clock.now_iso(),
        "profiles": [profile.model_dump(mode="json") for profile in profiles],
        "packs": packs,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json_dumps(bundle) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(profiles)} profiles, {len(packs)} packs)")


if __name__ == "__main__":
    main()
