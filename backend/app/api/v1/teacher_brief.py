from fastapi import APIRouter

from app.domain.models import TeacherActionBrief
from app.domain.services.teacher_brief_service import build_teacher_brief

router = APIRouter(tags=["teacher-brief"])


@router.get("/teacher-brief", response_model=TeacherActionBrief)
async def teacher_brief(class_name: str = "Class 9 Science") -> TeacherActionBrief:
    return build_teacher_brief(class_name)
