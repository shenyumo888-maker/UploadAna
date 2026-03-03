import sys
from unittest.mock import MagicMock
sys.modules["cv2"] = MagicMock()

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool
from app.main import app as fastapi_app
from app.core.database import get_session
from app.models.db_models import AnalysisRecord, ReportChatHistory
from unittest.mock import patch, MagicMock
import app.api.chat  # Import to mock engine/Session


# Setup in-memory DB for testing
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    
    fastapi_app.dependency_overrides[get_session] = get_session_override
    client = TestClient(fastapi_app)
    yield client
    fastapi_app.dependency_overrides.clear()

def test_chat_history_endpoint(client: TestClient, session: Session):
    # Setup
    chat = ReportChatHistory(
        report_id=1,
        user_id="user1",
        question="Q1",
        answer="A1"
    )
    session.add(chat)
    session.commit()
    
    # Test GET
    response = client.get("/api/chat/history?report_id=1&user_id=user1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["question"] == "Q1"
    assert data[0]["answer"] == "A1"

def test_feedback_endpoint(client: TestClient, session: Session):
    # Setup
    chat = ReportChatHistory(
        report_id=1,
        user_id="user1",
        question="Q1",
        answer="A1"
    )
    session.add(chat)
    session.commit()
    session.refresh(chat)
    
    # Test POST
    response = client.post(
        "/api/chat/feedback",
        json={"chat_id": chat.id, "like": True, "tags": ["useful"]}
    )
    assert response.status_code == 200
    
    # Verify
    session.refresh(chat)
    assert chat.feedback_like is True
    assert chat.feedback_tags == "useful"

@patch("app.api.chat.dashscope.Generation.call")
def test_chat_stream_flow(mock_call, client: TestClient, session: Session):
    # 1. Create a dummy report
    report = AnalysisRecord(
        topic="Test Topic",
        result_json='{"summary": "Test Summary", "metrics": {"score": 80}, "keywords": ["test"]}',
        sentiment_score=80.0,
        sentiment_label="Positive",
        report_markdown="# Test Report"
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    
    # 2. Mock Dashscope response
    mock_response_chunk = MagicMock()
    mock_response_chunk.status_code = 200
    mock_response_chunk.output.choices = [MagicMock(message=MagicMock(content="Hello World"))]
    mock_call.return_value = [mock_response_chunk] # Iterator
    
    # 3. Mock Session in app.api.chat to return our test session
    # The stream_generator uses: with Session(engine) as session:
    with patch("app.api.chat.Session") as mock_session_cls:
        # Context manager support
        mock_session_cls.return_value.__enter__.return_value = session
        
        response = client.post(
            "/api/chat/stream",
            json={
                "report_id": report.id,
                "question": "What is this?",
                "user_id": "test_user"
            }
        )
    
    assert response.status_code == 200
    assert "Hello World" in response.text

