# 这个是整个

import json
from app.core.search import search_topic
from app.core.prompt import sentiment_prompt
from app.core.llm import call_qwen

def analyze_sentiment(topic: str) -> dict:
    try:
        context = search_topic(topic)
    except Exception:
        context = "搜索失败，仅基于模型分析。"

    prompt = sentiment_prompt(topic, context)
    raw = call_qwen(prompt)

    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "sentiment_score": 50,
            "sentiment_label": "解析失败",
            "keywords": [],
            "trend_data": [],
            "sentiment_distribution": [],
            "source_distribution": [],
            "related_topics": [],
            "regional_distribution": [],
            "report_markdown": raw
        }
