def sentiment_intro_prompt(topic: str, context: str) -> str:
    return f"""
    你是一个资深的舆情分析专家。请根据以下搜索结果，对话题“{topic}”撰写一篇详细的【事件概述与背景分析】。
    
    搜索结果上下文：
    {context}

    要求：
    1. 使用Markdown格式。
    2. 深度剖析事件起因、核心当事人、以及初步的社会反响。
    3. 内容要详细、客观，专业性强。
    4. 字数控制在400字左右。
    5. 使用合适的emoji装饰标题。
    """

def sentiment_data_prompt(topic: str, context: str) -> str:
    return f"""
    你是一个高级舆情分析专家。请根据以下互联网搜索结果，对话题“{topic}”进行【数据驱动的深度分析】。
    
    搜索结果上下文：
    {context}

    请必须以严格的 JSON 格式输出，不要包含 Markdown 代码块标记（如 ```json），直接返回 JSON 字符串。
    JSON 结构要求如下：
    {{
        "sentiment_score": 0-100的整数 (0为极度负面，50中立，100极度正面),
        "sentiment_label": "正面/负面/中立/争议",
        "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
        "trend_data": [
            {{"date": "MM-DD", "score": 实际热度值}},
            ... (最近5-7天的历史数据)
        ],
        "forecast_data": [
            {{"date": "MM-DD", "score": 预测热度值}},
            ... (未来2-3天的预测数据，基于趋势推演)
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
             ...
        ],
        "regional_distribution": [
            {{"name": "省份1", "value": 热度值}},
            ...
        ],
        "report_markdown": "这里是报告的核心数据分析部分。请将文字分析与以下图表占位符结合，字数约500字。
        
        **必须插入且仅插入一次以下占位符：**
        - [[CHART:TREND]]
        - [[CHART:SENTIMENT]]
        - [[CHART:SOURCE]]
        - [[CHART:REGION]]
        - [[CHART:TOPIC]]
        "
    }}
    """

def sentiment_conclusion_prompt(topic: str, context: str, current_analysis: str) -> str:
    return f"""
    你是一个舆情研判专家。针对话题“{topic}”，基于之前的分析内容，撰写最后的【风险研判与应对建议】。
    
    背景参考：
    {current_analysis[:2000]} 

    要求：
    1. 使用Markdown格式。
    2. 预测未来走势，指出潜在风险点。
    3. 给相关主体提供至少3条具体的应对策略。
    4. 字数控制在300字左右。
    5. 使用合适的emoji装饰标题。
    """
