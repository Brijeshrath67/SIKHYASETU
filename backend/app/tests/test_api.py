from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


def test_profiles_and_pack_flow() -> None:
    profiles = client.get("/api/v1/learners")
    assert profiles.status_code == 200
    profile_list = profiles.json()
    assert len(profile_list) >= 2

    profile_id = profile_list[0]["id"]
    pack = client.get(f"/api/v1/lesson-packs/{profile_id}/next")
    assert pack.status_code == 200
    pack_data = pack.json()
    assert pack_data["concept"]
    assert pack_data["probe_question"]

    trace = client.get(f"/api/v1/planning/{profile_id}")
    assert trace.status_code == 200


def test_teacher_brief_endpoint() -> None:
    response = client.get("/api/v1/teacher-brief")
    assert response.status_code == 200
    payload = response.json()
    assert "top_misconceptions" in payload
