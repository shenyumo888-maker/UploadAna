import os
import cv2
import dashscope
from http import HTTPStatus
import json
import re
from app.core.config import settings
from app.utils.logger import app_logger

# 设置 API KEY
if settings.DASHSCOPE_API_KEY:
    dashscope.api_key = settings.DASHSCOPE_API_KEY
else:
    app_logger.warning("Warning: DASHSCOPE_API_KEY is not set.")

def extract_frames(video_path, max_frames=30):
    """
    从视频中抽取关键帧
    策略：每秒 1 帧，最多保留 max_frames 张
    """
    frames = []
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        # 计算采样间隔（帧数）
        # 如果视频很短，确保至少每秒一帧
        # 如果视频很长，确保总数不超过 max_frames
        interval = int(fps) # 默认 1秒1帧
        
        # 实际抽取的帧数 = duration (秒)
        # 如果 duration > max_frames，则调整间隔
        if duration > max_frames:
            interval = int(total_frames / max_frames)
        
        count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if count % interval == 0:
                temp_frame_path = f"{video_path}_frame_{len(frames)}.jpg"
                cv2.imwrite(temp_frame_path, frame)
                frames.append(temp_frame_path)
                
                if len(frames) >= max_frames:
                    break
            count += 1
            
        cap.release()
    except Exception as e:
        app_logger.error(f"Frame extraction error: {e}")
    
    return frames

def analyze_image_content(image_path):
    """
    分析单张图片内容
    """
    model_name = 'qwen-vl-plus'
    prompt = """
    请分析这张图片，返回 JSON 格式结果：
    {
        "ocr_text": "图片中的所有文字内容",
        "entities": ["识别到的物体1", "识别到的物体2"],
        "emotion": "positive/neutral/negative",
        "confidence": 0.95
    }
    注意：只返回 JSON 字符串，不要包含 markdown 标记。
    """
    
    messages = [
        {
            "role": "user",
            "content": [
                {"image": f"file://{os.path.abspath(image_path)}"},
                {"text": prompt}
            ]
        }
    ]
    
    try:
        response = dashscope.MultiModalConversation.call(model=model_name, messages=messages)
        if response.status_code == HTTPStatus.OK:
            return response.output.choices[0].message.content
        return None
    except Exception as e:
        app_logger.error(f"Image analysis error: {e}")
        return None

def analyze_video_content(video_path):
    """
    分析视频内容（通过抽帧）
    """
    frames = extract_frames(video_path)
    if not frames:
        return {"error": "无法提取视频帧"}
    
    model_name = 'qwen-vl-plus'
    
    # 构造多图消息
    content = []
    for frame_path in frames:
        content.append({"image": f"file://{os.path.abspath(frame_path)}"})
    
    prompt = """
    请根据这些视频关键帧，分析视频内容，返回 JSON 格式结果：
    {
        "ocr_text": "视频中出现的关键文字",
        "entities": ["关键物体/人物1", "关键物体/人物2"],
        "emotion": "positive/neutral/negative",
        "confidence": 0.92,
        "summary": "视频内容摘要"
    }
    注意：只返回 JSON 字符串，不要包含 markdown 标记。
    """
    content.append({"text": prompt})
    
    messages = [{"role": "user", "content": content}]
    
    try:
        response = dashscope.MultiModalConversation.call(model=model_name, messages=messages)
        
        # 清理临时帧文件
        for f in frames:
            try:
                os.remove(f)
            except:
                pass
                
        if response.status_code == HTTPStatus.OK:
            return response.output.choices[0].message.content
        return None
    except Exception as e:
        app_logger.error(f"Video analysis error: {e}")
        # 清理临时帧文件
        for f in frames:
            try:
                os.remove(f)
            except:
                pass
        return None

def vl_analysis(file_path):
    """
    统一的多模态分析入口
    :param file_path: 文件绝对路径
    :return: 结构化 JSON 结果
    """
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    ext = os.path.splitext(file_path)[1].lower()
    
    result_str = None
    if ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp']:
        result_str = analyze_image_content(file_path)
    elif ext in ['.mp4', '.mov', '.avi', '.mkv']:
        result_str = analyze_video_content(file_path)
    else:
        return {"error": "Unsupported file format"}
        
    if result_str:
        # 如果结果已经是 dict（极少见，除非被自动转换了），直接返回
        if isinstance(result_str, dict):
            return result_str
        
        # 如果是列表（DashScope 有时返回 [{'text': '...'}]）
        if isinstance(result_str, list):
            # 尝试提取其中的文本内容
            text_parts = []
            for item in result_str:
                if isinstance(item, dict) and 'text' in item:
                    text_parts.append(item['text'])
                elif isinstance(item, str):
                    text_parts.append(item)
            # 合并文本
            result_str = "\n".join(text_parts)
            
        # 确保是字符串
        if not isinstance(result_str, str):
            return {"raw_result": str(result_str), "error": f"Unexpected result type: {type(result_str)}"}

        # 使用统一的 JSON 解析器
        from app.utils.parser import parse_llm_json
        parsed = parse_llm_json(result_str)
        if parsed:
            return parsed
        return {"raw_result": result_str, "error": "JSON parse failed"}
    
    return {"error": "Analysis failed"}


