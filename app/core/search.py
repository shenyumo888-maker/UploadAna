import concurrent.futures
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

def _tavily_search_wrapper(query: str, topic_type: str, days: int = None):
    """封装 Tavily 搜索调用，便于并行执行"""
    if not tavily:
        return []
    try:
        params = {
            "query": query,
            "search_depth": "advanced",
            "max_results": settings.SEARCH_MAX_RESULTS,
            "topic": topic_type
        }
        if days:
            params["days"] = days
            
        result = tavily.search(**params)
        return result.get("results", [])
    except Exception as e:
        app_logger.warning(f"Tavily {topic_type} search failed: {e}")
        return []

def search_topic(topic: str) -> str:
    if not tavily:
        app_logger.warning("Tavily API key missing, falling back to LLM knowledge.")
        return "搜索服务不可用，请基于您的内置知识进行分析。"

    app_logger.info(f"🚀 Starting parallel hybrid search for topic: {topic}")
    
    # 使用线程池并行执行“近期新闻”和“通用网页”搜索
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        # 任务 1: 近期新闻 (确保实时性)
        future_news = executor.submit(_tavily_search_wrapper, topic, "news", settings.SEARCH_DAYS)
        # 任务 2: 通用网页 (确保覆盖历史存档和深度背景)
        future_general = executor.submit(_tavily_search_wrapper, topic, "general")
        
        # 获取结果
        news_results = future_news.result()
        general_results = future_general.result()

    # 合并结果并去重 (基于 URL)
    seen_urls = set()
    merged_results = []
    
    # 优先级策略：将新闻排在前面，通用结果排在后面（如果重复则保留新闻版）
    for res in news_results + general_results:
        url = res.get("url")
        if url and url not in seen_urls:
            seen_urls.add(url)
            merged_results.append(res)

    if not merged_results:
        app_logger.warning("No search results found for topic in both news and general modes.")
        return "未搜索到相关信息（包括近期新闻和历史存档），请基于您的内置知识进行分析。"

    app_logger.info(f"✅ Hybrid search completed. Found {len(merged_results)} unique results.")
    return str(merged_results)