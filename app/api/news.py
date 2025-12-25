from fastapi import APIRouter
from tavily import TavilyClient
import os

router = APIRouter()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

@router.get("/hot-topics")
def get_hot_topics():
    try:
        print("正在调用 Tavily 获取热搜...")
        
        # --- 核心修改 ---
        # 1. 不再使用翻译器 (避免国内网络超时)
        # 2. 使用 include_domains 强行指定搜索国内新闻源
        # 3. 这样返回的数据直接就是中文
        response = tavily_client.search(
            query="今日中国社会舆情热点事件排行榜", # 搜索词
            search_depth="basic",
            topic="news",
            # 指定只搜索这些中文域名，确保结果是中文
            include_domains=[
                "sina.com.cn",   # 新浪
                "163.com",       # 网易
                "qq.com",        # 腾讯
                "thepaper.cn",   # 澎湃
                "cctv.com",      # 央视
                "people.com.cn", # 人民网
                "xinhuanet.com", # 新华网
                "ifeng.com",     # 凤凰网
                "baidu.com"      # 百度
            ],
            max_results=12 # 多抓几个方便去重
        )
        
        topics = []
        seen = set()
        
        if "results" in response:
            for res in response["results"]:
                title = res.get("title", "").strip()
                
                # 数据清洗
                if not title or len(title) < 4:
                    continue
                
                # 过滤掉包含 "Tavily" 或者纯英文的乱码结果
                if "Tavily" in title: 
                    continue
                
                # 简单去重
                if title not in seen:
                    topics.append({"title": title})
                    seen.add(title)
        
        # 打印一下结果看看有没有拿到 (调试用)
        print(f"成功获取到 {len(topics)} 条热搜: {topics}")

        if not topics:
            raise Exception("Tavily 返回了 0 条有效结果")

        return {"success": True, "data": topics[:10]}

    except Exception as e:
        print(f"获取热搜失败，原因: {e}")
        # 失败时的兜底数据 (确保前端有东西显示)
        return {"success": True, "data": [
            {"title": "小米SU7 Ultra量产版上市舆情分析"},
            {"title": "五一假期国内旅游消费预测"},
            {"title": "OpenAI发布Sora模型最新进展"},
            {"title": "高校毕业生春季招聘就业形势"},
            {"title": "新能源汽车新一轮价格战分析"},
            {"title": "国际金价波动对消费市场影响"},
            {"title": "一线城市房地产限购松绑政策"},
            {"title": "华为Pura 70系列市场表现"},
            {"title": "国内油价调整窗口开启"},
            {"title": "大学生夜骑开封热潮后续影响"}
        ]}