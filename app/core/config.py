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
