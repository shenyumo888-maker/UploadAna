import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # API Keys
    DASHSCOPE_API_KEY: str
    TAVILY_API_KEY: str
    
    # Database & Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # App Config
    APP_NAME: str = "AI 舆情分析系统"
    DEBUG: bool = False
    
    # LLM Config
    LLM_MODEL_NAME: str = "qwen-plus"
    
    # Search Config
    SEARCH_MAX_RESULTS: int = 7
    SEARCH_DAYS: int = 7
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

# 兼容旧代码的全局变量导出（逐步废弃）
DASHSCOPE_API_KEY = settings.DASHSCOPE_API_KEY
TAVILY_API_KEY = settings.TAVILY_API_KEY
REDIS_URL = settings.REDIS_URL
APP_NAME = settings.APP_NAME
