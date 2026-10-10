from fastapi import APIRouter

router = APIRouter(tags=["sync"])


@router.get("/sync/health")
async def sync_health() -> dict[str, str]:
    return {"status": "ok"}

