import pytest
from fastapi.testclient import TestClient

from app.infrastructure.db import reset_db


@pytest.fixture(autouse=True)
def clean_database():
    reset_db()
    yield


@pytest.fixture
def client():
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
