from fastapi import APIRouter

from app.services.report_service import build_teacher_brief

router = APIRouter(tags=["teacher-brief"])


@router.get("/teacher-brief")
async def teacher_brief(class_name: str = "Class 9 Science"):
    return build_teacher_brief(class_name).model_dump(mode="json")

