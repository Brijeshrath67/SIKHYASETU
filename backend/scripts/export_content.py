"""Export the authored curriculum for the offline Guru tutor.

The whole content library is bundled with the PWA so the tutor can answer a
doubt about *any* topic, not only the learner's current pack.

    python backend/scripts/export_content.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.content.library import DEFAULT_LIBRARY_PATH, load_library  # noqa: E402
from app.infrastructure.db import json_dumps  # noqa: E402

OUTPUT = ROOT / "frontend" / "src" / "shared" / "content" / "library.json"


def main() -> None:
    library = load_library()  # validates the content
    payload = {
        "meta": library.meta.model_dump(mode="json", by_alias=True),
        "chapters": [chapter.model_dump(mode="json", by_alias=True) for chapter in library.chapters],
        "concepts": [concept.model_dump(mode="json", by_alias=True) for concept in library.concepts],
        "misconceptions": [
            misconception.model_dump(mode="json", by_alias=True)
            for misconception in library.misconceptions
        ],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json_dumps(payload) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} (source: {DEFAULT_LIBRARY_PATH.name})")


if __name__ == "__main__":
    main()
