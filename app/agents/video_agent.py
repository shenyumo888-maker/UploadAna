# app/agents/video_agent.py
import os
from http import HTTPStatus
import dashscope
from app.core.config import DASHSCOPE_API_KEY

# 设置 API KEY
if DASHSCOPE_API_KEY:
    dashscope.api_key = DASHSCOPE_API_KEY
else:
    print("Warning: DASHSCOPE_API_KEY is not set.")

def analyze_video_sentiment(video_path: str, topic: str = ""):
    """
    使用通义千问-VL 对视频进行舆情分析
    :param video_path: 本地视频文件的绝对路径
    :param topic: 用户输入的主题（可选，作为辅助上下文）
    """
    
    # 构造提示词 (Prompt Engineering)
    # 结合用户的 "qwen3-vl-plus" 需求，实际上目前阿里云通常映射为 'qwen-vl-plus' 或 'qwen-vl-max'
    # 这里我们显式使用 'qwen-vl-plus'，如果需要更高精度可以使用 'qwen-vl-max'
    model_name = 'qwen-vl-plus' 

    prompt = f"""
    请作为一位专业的舆情分析师，分析这段视频内容。
    相关的讨论话题是："{topic}"
    
    请输出以下分析报告（JSON格式）：
    1. 视频内容摘要：简要描述视频里发生了什么。
    2. 情感倾向：正面/负面/中性，并说明理由。
    3. 舆情风险点：视频中是否存在可能引发公众争议或负面舆情的细节？
    4. 关键要素提取：视频中的关键人物、物体或文字信息。
    """

    messages = [
        {
            "role": "user",
            "content": [
                {"video": video_path}, 
                {"text": prompt}
            ]
        }
    ]

    try:
        response = dashscope.MultiModalConversation.call(
            model=model_name, 
            messages=messages
        )

        if response.status_code == HTTPStatus.OK:
            return response.output.choices[0].message.content
        else:
            return f"分析失败: {response.code} - {response.message}"

    except Exception as e:
        print(f"Video Agent Error: {e}")
        return f"视频分析过程中发生错误: {str(e)}"
