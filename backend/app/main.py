from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_router
from app.infrastructure.db import initialize_db
from app.services.learner_service import seed_demo_profiles
from app.services.pack_service import seed_demo_lesson_packs


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_db()
    seed_demo_profiles()
    seed_demo_lesson_packs()
    yield


app = FastAPI(
    title="SikhyaSetu",
    version="0.1.0",
    description="Offline-first misconception-to-mastery tutor for Odia-medium learners.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "SikhyaSetu",
        "environment": "development",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

