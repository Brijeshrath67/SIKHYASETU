from fastapi import APIRouter, HTTPException

from app.content.library import library_summary, load_library
from app.domain.models import ProbeOut
from app.domain.services.pack_service import probe_out

router = APIRouter(tags=["content"])


@router.get("/content/summary")
async def content_summary() -> dict:
    return library_summary()


@router.get("/concepts")
async def list_concepts() -> list[dict]:
    library = load_library()
    return [
        {
            "id": concept.id,
            "chapter_id": concept.chapter_id,
            "title_en": concept.title_en,
            "title_or": concept.title_or,
            "misconception_id": concept.misconception_id,
            "prerequisites": concept.prerequisites,
            "review_status": concept.review_status,
        }
        for concept in library.concepts
    ]


@router.get("/concepts/{concept_id}")
async def get_concept(concept_id: str) -> dict:
    library = load_library()
    concept = library.concept_or_none(concept_id)
    if concept is None:
        raise HTTPException(status_code=404, detail="Concept not found")
    return concept.model_dump(mode="json")


@router.get("/probes/{concept_id}", response_model=ProbeOut)
async def get_probe(concept_id: str) -> ProbeOut:
    library = load_library()
    concept = library.concept_or_none(concept_id)
    if concept is None:
        raise HTTPException(status_code=404, detail="Concept not found")
    return probe_out(concept)
