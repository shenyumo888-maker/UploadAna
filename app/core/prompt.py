def sentiment_intro_prompt(topic: str, context: str) -> str:
    return f"""
    你是一个智库型舆情分析顶级专家。请针对话题“{topic}”，基于以下多源搜索结果，撰写报告的【开篇：事件溯源与宏观背景分析】。
    
    搜索结果上下文：
    {context}

    要求：
    1. **角色定位**：这是整篇报告的第一部分。
    2. 使用严谨、专业的政经/管理咨询用语。
    3. **Emoji 要求**：仅在各级标题处使用极少量极其克制的专业 emoji，正文严禁使用。
    4. 内容必须详尽，字数不低于600字。
    """

def sentiment_data_prompt(topic: str, context: str) -> str:
    return f"""
    你是一个资深数据分析师。请针对话题“{topic}”，进行报告的【中篇：量化数据驱动的深度解读】。
    
    搜索结果上下文：
    {context}

    请以严格 JSON 格式输出：
    {{
        "sentiment_score": 0-100的整数,
        "sentiment_label": "正面/负面/中立/争议",
        "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
        "trend_data": [
            {{"date": "MM-DD", "score": 数值}},
            ... (请提供最近5-7天的历史数据)
        ],
        "forecast_data": [
            {{"date": "MM-DD", "score": 数值}},
            ... (未来2-3天的预测数据)
        ],
        "sentiment_distribution": [
             {{"name": "正面", "value": 数值}},
             {{"name": "中立", "value": 数值}},
             {{"name": "负面", "value": 数值}}
        ],
        "source_distribution": [
             {{"name": "微博", "value": 数值}},
             {{"name": "微信", "value": 数值}},
             {{"name": "新闻客户端", "value": 数值}},
             {{"name": "短视频", "value": 数值}},
             {{"name": "其他", "value": 数值}}
        ],
        "related_topics": [
            {{"name": "话题1", "value": 数值}},
            ...
        ],
        "regional_distribution": [
            {{"name": "省份名", "value": 数值}},
            ...
        ],
        "report_markdown": "这里是撰写的正文内容..."
    }}

    【任务指令】：
    1. **正文风格**：`report_markdown` 须在 800 字以上。
    2. **图文混排**：在正文中合适位置穿插 5 个指定图表占位符：[[CHART:TREND]], [[CHART:SENTIMENT]], [[CHART:SOURCE]], [[CHART:REGION]], [[CHART:TOPIC]]。
    3. **Emoji 要求**：请在每个章节的小标题处使用 1 个与内容匹配的专业 emoji，正文保持严肃。
    4. **每一个图表占位符出现后，必须跟着一段至少 150 字的深度分析文字**。
    """

def sentiment_conclusion_prompt(topic: str, context: str, current_analysis: str) -> str:
    return f"""
    你是一个舆情研判决策顾问。针对话题“{topic}”，撰写报告的【末篇：战略级研判与危机应对策略】。
    
    参考资料：
    {current_analysis[:1000]}

    要求：
    1. **角色定位**：作为报告结尾，给出最终定调。
    2. **Emoji 要求**：仅在建议清单或小标题处使用极少量专业的 emoji。
    3. 字数不低于500字。
    """
