from tavily import TavilyClient
from app.core.config import settings

from app.utils.logger import app_logger

tavily = None
if settings.TAVILY_API_KEY:
    try:
        tavily = TavilyClient(api_key=settings.TAVILY_API_KEY)
    except Exception as e:
        app_logger.error(f"Error initializing TavilyClient: {e}")
        pass
else:
    app_logger.warning("Warning: TAVILY_API_KEY is not set or empty in config.py")

def search_topic(topic: str) -> str:
    if not tavily:
        app_logger.warning("Tavily API key missing, falling back to LLM knowledge.")
        return "搜索服务不可用，请基于您的内置知识进行分析。"

    try:
        result = tavily.search(
            query=f"{topic}",
            search_depth="advanced",
            max_results=settings.SEARCH_MAX_RESULTS,
            topic="news",
            days=settings.SEARCH_DAYS
        )
    except Exception as e:
        app_logger.error(f"Tavily search failed: {e}")
        return "搜索请求失败，请基于您的内置知识进行分析。"

    results = result.get("results", [])
    if not results:
        app_logger.warning("No search results found for topic.")
        return "未搜索到相关实时信息，请基于您的内置知识进行分析。"

    return str(results)