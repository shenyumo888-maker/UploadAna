from tavily import TavilyClient
from app.core.config import TAVILY_API_KEY

tavily = TavilyClient(api_key=TAVILY_API_KEY)

def search_topic(topic: str) -> str:
    try:
        result = tavily.search(
            query=f"{topic} 最新评论 争议 事件分析",
            search_depth="advanced",
            max_results=5
        )
    except Exception as e:
        raise RuntimeError(f"Tavily search failed: {e}")#把异常往外抛了，往上一层抛

    results = result.get("results", [])
    if not results:
        raise RuntimeError("No search results")#把异常往外抛了，往上一层抛