from fastapi import APIRouter
import requests
from bs4 import BeautifulSoup
import re

router = APIRouter()

@router.get("/hot-topics")
def get_hot_topics():

    topics = []
    
    try:
        url = "https://top.baidu.com/board?tab=realtime"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        resp = requests.get(url, headers=headers, timeout=5)
        
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 热搜的标题通常在 class 为 c-single-text-ellipsis 的元素里
            # 或者是 content_wm 这种 class
            # 不同版本的百度页面结构可能微调，这里用通用的选择器
            items = soup.select('.category-wrap_iQLoo .c-single-text-ellipsis')
            
            for item in items:
                title = item.get_text().strip()
                if title and title not in [t['title'] for t in topics]:
                    topics.append({"title": title})
                    if len(topics) >= 20: break # 抓够12个就停

    except Exception as e:
        print(f"热搜抓取失败: {e}")

    if not topics:
        print("使用兜底数据")
        topics = [
            {"title": "小米SU7 Ultra量产版上市"},
            {"title": "五一假期国内旅游预测"},
            {"title": "OpenAI发布Sora模型最新进展"},
            {"title": "高校毕业生春季招聘会"},
            {"title": "新能源汽车新一轮价格战"},
            {"title": "国际金价波动分析"},
            {"title": "一线城市房地产限购松绑"},
            {"title": "华为Pura 70市场表现"},
            {"title": "国内油价调整窗口开启"},
            {"title": "大学生夜骑开封热潮后续"}
        ]

    return {"success": True, "data": topics[:10]}