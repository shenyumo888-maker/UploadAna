from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
from pydantic import BaseModel
from app.agents.video_agent import analyze_video_sentiment

router = APIRouter()

UPLOAD_DIR = "app/static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class AnalyzeRequest(BaseModel):
    filename: str
    topic: str = ""

import cv2

def generate_thumbnail(video_path: str, output_path: str):
    """
    从视频中生成缩略图
    """
    try:
        vidcap = cv2.VideoCapture(video_path)
        success, image = vidcap.read()
        if success:
            cv2.imwrite(output_path, image)
            return True
        return False
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        return False

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    上传本地视频文件并生成缩略图
    """
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 生成缩略图
        thumbnail_filename = f"{os.path.splitext(file.filename)[0]}_thumb.jpg"
        thumbnail_path = os.path.join(UPLOAD_DIR, thumbnail_filename)
        
        # 即使缩略图生成失败也不影响上传成功
        has_thumbnail = generate_thumbnail(file_path, thumbnail_path)
        
        thumbnail_url = f"/static/uploads/{thumbnail_filename}" if has_thumbnail else None

        # 返回上传成功信息
        return JSONResponse({
            "status": "success", 
            "file_path": file_path, 
            "filename": file.filename,
            "thumbnail_url": thumbnail_url
        })
    except Exception as e:
        print(f"Upload error: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@router.post("/analyze")
async def analyze_video(request: AnalyzeRequest):
    """
    分析已上传的视频
    """
    file_path = os.path.join(UPLOAD_DIR, request.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # 获取绝对路径，dashscope SDK 通常需要绝对路径或 URL
    absolute_path = os.path.abspath(file_path)
    
    result = analyze_video_sentiment(absolute_path, request.topic)
    
    return {"status": "success", "analysis": result}
