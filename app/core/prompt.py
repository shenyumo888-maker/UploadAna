def sentiment_prompt(topic: str, context: str) -> str:
    return f"""
    你是一个高级舆情分析专家。请根据以下互联网搜索结果，对话题“{topic}”进行深度分析。
    
    搜索结果上下文：
    {context}

    请必须以严格的 JSON 格式输出，不要包含 Markdown 代码块标记（如 ```json），直接返回 JSON 字符串。
    JSON 结构要求如下：
    {{
        "sentiment_score": 0-100的整数 (0为极度负面，50中立，100极度正面),
        "sentiment_label": "正面/负面/中立/争议",
        "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
        "trend_data": [
            {{"date": "最近5天的日期1", "score": 预估热度值0-100}},
            {{"date": "最近5天的日期2", "score": 预估热度值0-100}},
            ...
        ],
        "sentiment_distribution": [
             {{"name": "正面", "value": 百分比数值}},
             {{"name": "中立", "value": 百分比数值}},
             {{"name": "负面", "value": 百分比数值}}
        ],
        "source_distribution": [
             {{"name": "微博", "value": 占比数值}},
             {{"name": "微信", "value": 占比数值}},
             {{"name": "新闻客户端", "value": 占比数值}},
             {{"name": "短视频", "value": 占比数值}},
             {{"name": "其他", "value": 占比数值}}
        ],
        "related_topics": [
            {{"name": "关联话题1", "value": 热度值}},
            {{"name": "关联话题2", "value": 热度值}},
             ...
        ],
        "regional_distribution": [
            {{"name": "省份1", "value": 热度值}},
            {{"name": "省份2", "value": 热度值}},
            ...
        ],
        "report_markdown": "这里是一篇**非常详细**、结构清晰的深度分析报告（Markdown格式），字数不少于800字。请将对数据的分析融入到文章中。
        
        **关键要求：**
        请在报告的合适位置插入图表占位符，系统会自动替换为可视化图表。请确保使用以下占位符，并分散在文章的不同章节中：
        
        - [[CHART:TREND]]  <- 插入在“热度走势”或“事件背景”相关章节
        - [[CHART:SENTIMENT]] <- 插入在“情感分析”或“网民观点”相关章节
        - [[CHART:SOURCE]] <- 插入在“传播渠道”或“媒体分布”相关章节
        - [[CHART:REGION]] <- 插入在“地域分布”或“关注人群”相关章节
        - [[CHART:TOPIC]] <- 插入在“关联话题”或“延伸讨论”相关章节

        报告结构建议：
        1. 事件概述（插入 [[CHART:TREND]]）
        2. 舆情情感研判（插入 [[CHART:SENTIMENT]]）
        3. 传播溯源与渠道分析（插入 [[CHART:SOURCE]]）
        4. 受众画像与地域分布（插入 [[CHART:REGION]]）
        5. 核心议题与关联话题（插入 [[CHART:TOPIC]]）
        6. 研判结论与建议
        "
    }}
    """
