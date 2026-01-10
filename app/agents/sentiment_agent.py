# 话题分析agent

import json
from app.core.search import search_topic
from app.core.prompt import sentiment_intro_prompt, sentiment_data_prompt, sentiment_conclusion_prompt
from app.core.llm import call_qwen

import concurrent.futures

def analyze_sentiment(topic: str) -> dict:
    try:
        context = search_topic(topic)
    except Exception:
        context = "搜索失败，仅基于模型进行云推演分析。"

    # 使用线程池并发调用前两个独立阶段，大幅减少等待时间
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        # 提交阶段 1 和 2
        future_intro = executor.submit(call_qwen, sentiment_intro_prompt(topic, context))
        future_data = executor.submit(call_qwen, sentiment_data_prompt(topic, context))
        
        # 获取结果 (阻塞直到两个都完成)
        try:
            intro_content = future_intro.result()
        except Exception as e:
            intro_content = f"> (背景生成失败: {str(e)})"
            
        try:
            raw_data = future_data.result()
        except Exception as e:
            raw_data = json.dumps({"report_markdown": f"数据提取失败: {str(e)}", "sentiment_score": 50})

    # 清理 JSON 并加载
    raw_data = raw_data.replace("```json", "").replace("```", "").strip()
    try:
        result = json.loads(raw_data)
    except json.JSONDecodeError:
        result = {
            "sentiment_score": 50,
            "sentiment_label": "解析数据异常",
            "keywords": [],
            "trend_data": [],
            "sentiment_distribution": [],
            "source_distribution": [],
            "related_topics": [],
            "regional_distribution": [],
            "report_markdown": raw_data
        }

    # 第三阶段：深度研判 (必须等待第二阶段完成，因为它需要数据分析作为参考)
    try:
        conclusion_content = call_qwen(sentiment_conclusion_prompt(topic, context, result.get('report_markdown', '')))
    except Exception as e:
        conclusion_content = f"> (研判建议生成失败: {str(e)})"

    # 组合最终报告
    report_body = result.get('report_markdown', '')
    full_report = f"{intro_content}\n\n{report_body}\n\n{conclusion_content}"
    result['report_markdown'] = full_report

    return result
