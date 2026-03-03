from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from app.core.database import get_session, engine
from app.models.db_models import AnalysisRecord, ReportChatHistory
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import dashscope
from http import HTTPStatus
from app.core.config import DASHSCOPE_API_KEY
from datetime import datetime

# Set API Key
dashscope.api_key = DASHSCOPE_API_KEY

router = APIRouter()

class ChatRequest(BaseModel):
    report_id: int
    question: str
    user_id: str
    context: Optional[Dict[str, Any]] = None # Structured data passed from frontend

class FeedbackRequest(BaseModel):
    chat_id: int
    like: bool
    tags: Optional[List[str]] = None

def build_prompt(report_data: Dict, question: str, history: List[ReportChatHistory]) -> str:
    """
    Construct the prompt for the LLM.
    """
    # Extract key information from report_data
    summary = report_data.get("summary", "暂无摘要")
    metrics = report_data.get("sentiment_score", "未知")
    keywords = report_data.get("keywords", [])
    
    # Extract detailed analysis data
    trend = report_data.get("trend_data", [])
    trend_desc = f"热度数据点数: {len(trend)}" if trend else "暂无热度趋势数据"
    
    sentiment_dist = report_data.get("sentiment_distribution", [])
    sentiment_desc = ", ".join([f"{item['name']}:{item['value']}" for item in sentiment_dist])
    
    source_dist = report_data.get("source_distribution", [])
    source_desc = ", ".join([f"{item['name']}:{item['value']}" for item in source_dist[:5]]) # Top 5 sources
    
    regions = report_data.get("regional_distribution", [])
    region_desc = ", ".join([f"{item['name']}:{item['value']}" for item in regions[:5]]) # Top 5 regions
    
    topics = report_data.get("related_topics", [])
    topic_desc = ", ".join([f"{item['name']}:{item['value']}" for item in topics[:5]]) # Top 5 topics
    
    # Full report text (truncated if too long to fit context window, though Qwen-plus has large window)
    report_text = report_data.get("report_markdown", "")
    if len(report_text) > 10000:
        report_text = report_text[:10000] + "...(部分截断)"

    # Construct context from history
    history_context = ""
    if history:
        history_context = "【历史对话】\n"
        for h in reversed(history): # History is passed in desc order, reverse to chronological
            history_context += f"用户: {h.question}\n助手: {h.answer}\n"
    
    prompt = f"""
    你是该舆情分析报告的智能助手。请根据以下详细的报告数据回答用户问题。
    
    【报告详细内容】
    {report_text}
    
    【核心指标数据】
    - 情感得分: {metrics}
    - 关键词: {', '.join(keywords)}
    - 情感分布: {sentiment_desc}
    - 来源分布: {source_desc}
    - 地域分布: {region_desc}
    - 关联话题: {topic_desc}
    - 热度概况: {trend_desc}
    
    {history_context}
    
    【用户问题】
    {question}
    
    【回答要求】
    1. **必须基于报告内容**：严禁编造（幻觉检测）。如果报告中没有提及用户问的内容，请明确告知“报告中未包含相关信息”。
    2. **拒绝无关话题**：如果用户询问与本报告完全无关的问题（如“今天天气如何”、“讲个笑话”），请礼貌拒绝，并建议用户提问有关该舆情事件的问题。
    3. **引导提问**：如果用户询问“可以聊些什么”、“你能做什么”或类似模糊问题，请根据报告内容，主动列出 3 个值得关注的具体问题供用户参考。
    4. **引用证据**：若涉及具体数字或图表，请明确引用（如“根据情感分布数据...”、“报告指出...”）。
    5. **格式规范**：回答简练，使用 Markdown 格式。若涉及敏感人物或地点，请使用“某地”“某人”代替。
    """
    return prompt

def stream_generator(prompt: str, chat_id: int):
    """
    Generator function to stream the response from LLM and update the database.
    """
    full_content = ""
    try:
        # Call Dashscope (Qwen) with streaming
        responses = dashscope.Generation.call(
            model="qwen-plus",
            prompt=prompt,
            result_format="message",
            stream=True,
            incremental_output=True  # Get deltas
        )
        
        for response in responses:
            if response.status_code == HTTPStatus.OK:
                content = response.output.choices[0].message.content
                full_content += content
                # Yield the chunk directly to the client
                yield content
            else:
                error_msg = f"Error: {response.message}"
                yield error_msg
                full_content += error_msg
        
    except Exception as e:
        yield f"System Error: {str(e)}"
        full_content += f"\nSystem Error: {str(e)}"
    
    # After streaming is complete, update the database using a new session
    with Session(engine) as session:
        chat_history_entry = session.get(ReportChatHistory, chat_id)
        if chat_history_entry:
            chat_history_entry.answer = full_content
            session.add(chat_history_entry)
            session.commit()

@router.post("/stream")
async def chat_stream(request: ChatRequest, session: Session = Depends(get_session)):
    # 1. Fetch Report
    report = session.get(AnalysisRecord, request.report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        report_data = json.loads(report.result_json)
    except:
        report_data = {}
        
    # Merge frontend context if provided (optional)
    if request.context:
        report_data.update(request.context)
    
    # 2. Fetch Recent History
    history_stmt = select(ReportChatHistory).where(
        ReportChatHistory.report_id == request.report_id,
        ReportChatHistory.user_id == request.user_id
    ).order_by(ReportChatHistory.created_at.desc()).limit(5)
    recent_history = session.exec(history_stmt).all()
    
    # 3. Build Prompt
    prompt = build_prompt(report_data, request.question, recent_history)
    
    # 4. Create History Entry
    new_chat = ReportChatHistory(
        report_id=request.report_id,
        user_id=request.user_id,
        question=request.question,
        answer="" 
    )
    session.add(new_chat)
    session.commit()
    session.refresh(new_chat)
    
    # 5. Return Streaming Response
    return StreamingResponse(
        stream_generator(prompt, new_chat.id),
        media_type="text/event-stream"
    )

@router.post("/feedback")
def submit_feedback(feedback: FeedbackRequest, session: Session = Depends(get_session)):
    chat = session.get(ReportChatHistory, feedback.chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat record not found")
    
    chat.feedback_like = feedback.like
    if feedback.tags:
        chat.feedback_tags = ",".join(feedback.tags)
    
    session.add(chat)
    session.commit()
    return {"status": "success"}

@router.get("/history")
def get_chat_history(report_id: int, user_id: str, session: Session = Depends(get_session)):
    stmt = select(ReportChatHistory).where(
        ReportChatHistory.report_id == report_id,
        ReportChatHistory.user_id == user_id
    ).order_by(ReportChatHistory.created_at.asc()) # Return in chronological order
    results = session.exec(stmt).all()
    return results
