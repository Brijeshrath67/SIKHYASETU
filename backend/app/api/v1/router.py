from fastapi import APIRouter

from app.api.v1 import (
    events,
    guru,
    learners,
    lesson_packs,
    planning,
    probes,
    sync,
    teach_back,
    teacher_brief,
)

router = APIRouter()

router.include_router(learners.router)
router.include_router(lesson_packs.router)
router.include_router(events.router)
router.include_router(planning.router)
router.include_router(teach_back.router)
router.include_router(teacher_brief.router)
router.include_router(probes.router)
router.include_router(sync.router)
router.include_router(guru.router)

