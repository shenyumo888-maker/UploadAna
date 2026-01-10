from typing import Optional
from fastapi import APIRouter, Form, File, UploadFile
# from app.models.schemas import TopicRequest # 输入不再需要这个模型了
from app.agents.sentiment_agent import analyze_sentiment

router = APIRouter()

# 注意：这里去掉了 req: TopicRequest，改成了具体的参数定义
@router.post("/analyze")
async def analyze(
    topic: str = Form(...),                  # 接收前端 formData.append('topic', ...)
    video: Optional[UploadFile] = File(None) # 接收前端 formData.append('video', ...)
):
    # 1. 如果有视频，你可以在这里处理视频逻辑（比如保存、转录等）
    if video:
        print(f"接收到视频文件: {video.filename}")
        # content = await video.read() 
        # ...处理视频...

    # 2. 调用原有的分析逻辑，传入 topic 字符串
    return analyze_sentiment(topic)