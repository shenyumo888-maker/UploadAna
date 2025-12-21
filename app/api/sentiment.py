from fastapi import APIRouter
from app.models.schemas import TopicRequest
from app.agents.sentiment_agent import analyze_sentiment

router = APIRouter()

@router.post("/analyze")
async def analyze(req: TopicRequest):
    return analyze_sentiment(req.topic)
