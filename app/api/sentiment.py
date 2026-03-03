from typing import Optional, Generator
from fastapi import APIRouter, Form, File, UploadFile, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from app.core.database import get_session
from app.models.db_models import AnalysisRecord
import json
# from app.models.schemas import TopicRequest # 输入不再需要这个模型了
from app.agents.sentiment_agent import analyze_sentiment, analyze_sentiment_stream_generator

from app.utils.logger import app_logger

router = APIRouter()

@router.post("/analyze/stream")
async def analyze_stream(
    topic: str = Form(...),
    video: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    if video:
        app_logger.info(f"Streaming: Received video file: {video.filename}")

    # FastAPI StreamingResponse 默认会在单独的线程池中运行同步生成器
    # 因此我们可以直接使用同步生成器，不会阻塞主线程
    def event_generator():
        final_result = None
        event_id = 0
        for event in analyze_sentiment_stream_generator(topic):
            event_id += 1
            if event['event'] == 'done':
                final_result = event['data']
                try:
                    # 在同步生成器中直接操作数据库（这也是同步操作）
                    # 注意：session 对象通常不是线程安全的，但在每个请求中是独立的
                    # 由于我们在单独的线程中运行，只要不跨线程共享 session 应该没问题
                    # 但为了安全起见，我们可以在这里通过上下文管理器重新获取 session
                    # 或者直接使用传入的 session（FastAPI 的 session 依赖注入通常是 scoped 的）
                    
                    record = AnalysisRecord(
                        topic=topic,
                        sentiment_score=final_result.get("sentiment_score", 0),
                        sentiment_label=final_result.get("sentiment_label", "未知"),
                        report_markdown=final_result.get("report_markdown", ""),
                        result_json=json.dumps(final_result, ensure_ascii=False)
                    )
                    session.add(record)
                    session.commit()
                    session.refresh(record)
                    final_result["id"] = record.id
                    event['data'] = final_result
                except Exception as e:
                    app_logger.error(f"Failed to save history: {e}")

            yield f"id: {event_id}\nevent: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# 注意：这里去掉了 req: TopicRequest，改成了具体的参数定义
@router.post("/analyze")
async def analyze(
    topic: str = Form(...),                  # 接收前端 formData.append('topic', ...)
    video: Optional[UploadFile] = File(None), # 接收前端 formData.append('video', ...)
    session: Session = Depends(get_session)
):
    # 1. 如果有视频，你可以在这里处理视频逻辑（比如保存、转录等）
    if video:
        app_logger.info(f"接收到视频文件: {video.filename}")
        # content = await video.read() 
        # ...处理视频...

    # 2. 调用原有的分析逻辑，传入 topic 字符串
    result = analyze_sentiment(topic)

    # 3. 保存到数据库
    try:
        record = AnalysisRecord(
            topic=topic,
            sentiment_score=result.get("sentiment_score", 0),
            sentiment_label=result.get("sentiment_label", "未知"),
            report_markdown=result.get("report_markdown", ""),
            result_json=json.dumps(result, ensure_ascii=False)
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        # 将 ID 返回给前端，方便前端定位或后续操作
        result["id"] = record.id
    except Exception as e:
        app_logger.error(f"保存历史记录失败: {e}")
        # 不影响主流程返回

    return result