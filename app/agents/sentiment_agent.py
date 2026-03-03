# 话题分析agent

import json
from app.core.search import search_topic
from app.core.prompt import sentiment_intro_prompt, sentiment_data_prompt, sentiment_conclusion_prompt
from app.core.llm import call_qwen
from app.utils.parser import parse_llm_json

import concurrent.futures

def analyze_sentiment_stream_generator(topic: str):
    """
    Synchronous generator for streaming sentiment analysis.
    Yields dicts representing different stages of the analysis.
    Designed to run in a threadpool to avoid blocking the main loop.
    """
    # Phase 1: Search
    yield {"event": "status", "data": "正在全网搜索相关信息..."}
    try:
        context_data = search_topic(topic)
        context = str(context_data) 
    except Exception:
        context = "搜索失败，仅基于模型进行云推演分析。"
    yield {"event": "status", "data": "搜索完成，开始多维分析..."}

    # Phase 2: Parallel Intro & Data
    # 使用线程池并发调用前两个独立阶段
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_intro = executor.submit(call_qwen, sentiment_intro_prompt(topic, context))
        future_data = executor.submit(call_qwen, sentiment_data_prompt(topic, context))
        
        # 轮询检查完成状态，或者按顺序获取
        # 这里为了流式效果，我们应该尽快把完成的部分推出去
        # 通常 intro 会比 data 快，或者我们希望先显示 intro
        
        intro_content = ""
        try:
            intro_content = future_intro.result()
            yield {"event": "background", "data": intro_content}
        except Exception as e:
            intro_content = f"> (背景生成失败: {str(e)})"
            yield {"event": "background", "data": intro_content}

        result = {}
        try:
            raw_data = future_data.result()
            # Process JSON
            result = parse_llm_json(raw_data)
            if not result:
                raise ValueError("Empty or invalid JSON")
                
            yield {"event": "data", "data": result}
        except Exception as e:
            # 只有解析失败或为空时才使用默认值
            result = {
                    "sentiment_score": 50,
                    "sentiment_label": "解析数据异常",
                    "keywords": [],
                    "trend_data": [],
                    "sentiment_distribution": [],
                    "source_distribution": [],
                    "related_topics": [],
                    "regional_distribution": [],
                    "report_markdown": raw_data if 'raw_data' in locals() else f"数据提取失败: {str(e)}"
            }
            yield {"event": "data", "data": result}

    # Phase 3: Conclusion
    yield {"event": "status", "data": "正在生成专家研判建议..."}
    conclusion_content = ""
    try:
        report_body = result.get('report_markdown', '')
        conclusion_content = call_qwen(sentiment_conclusion_prompt(topic, context, report_body))
        yield {"event": "detail", "data": conclusion_content}
    except Exception as e:
        conclusion_content = f"> (研判建议生成失败: {str(e)})"
        yield {"event": "detail", "data": conclusion_content}

    # Final Assembly
    full_report = f"{intro_content}\n\n{result.get('report_markdown', '')}\n\n{conclusion_content}"
    result['report_markdown'] = full_report
    yield {"event": "done", "data": result}

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

    # Process data
    try:
        raw_data = future_data.result()
        result = parse_llm_json(raw_data)
        if not result:
            raise ValueError("Empty or invalid JSON")
    except Exception as e:
        result = {
            "sentiment_score": 50,
            "sentiment_label": "解析数据异常",
            "keywords": [],
            "trend_data": [],
            "sentiment_distribution": [],
            "source_distribution": [],
            "related_topics": [],
            "regional_distribution": [],
            "report_markdown": raw_data if 'raw_data' in locals() else f"数据提取失败: {str(e)}"
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
