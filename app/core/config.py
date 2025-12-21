import os

from dotenv import load_dotenv

load_dotenv()  # 读取 .env 文件

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
APP_NAME = "AI 舆情分析系统"
