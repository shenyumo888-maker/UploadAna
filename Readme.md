# AI 舆情分析系统后端项目

本项目基于 FastAPI 构建，提供从多模态上传到 AI 舆情分析与对话等一系列功能。

## 项目结构 (重构后)

```text
project/
├── app/
│   ├── main.py                  # FastAPI 启动入口与路由注册
│   │
│   ├── core/
│   │   ├── config.py            # 配置 & 环境变量管理 (Pydantic Settings)
│   │   ├── database.py          # 数据库连接与初始化
│   │   ├── exceptions.py        # 全局异常类定义
│   │   ├── llm.py               # 大模型调用封装 (DashScope)
│   │   ├── search.py            # Tavily 搜索工具封装
│   │   ├── queue.py             # 异步队列定义 (RQ)
│   │   └── prompt.py            # LLM Prompt 模板定义
│   │
│   ├── agents/
│   │   ├── sentiment_agent.py   # 文本舆情流式分析 Agent
│   │   └── video_agent.py       # 多模态（视频/图片）抽取与分析 Agent
│   │
│   ├── api/
│   │   ├── chat.py              # 报告对话追问路由 (/api/chat)
│   │   ├── history.py           # 历史记录路由 (/api/history)
│   │   ├── multimodal.py        # 多模态上传与状态路由 (/api/multimodal)
│   │   ├── news.py              # 实时热搜数据路由 (/api/hot-topics)
│   │   └── sentiment.py         # 核心分析流式路由 (/api/analyze/stream)
│   │
│   ├── models/
│   │   └── db_models.py         # SQLModel 数据库 ORM 模型
│   │
│   ├── services/
│   │   └── multimodal_service.py # 复杂业务逻辑与后台队列任务执行器
│   │
│   ├── static/                  # 前端静态资源与用户上传文件目录
│   │   ├── index.html           # 前端主页面
│   │   ├── app.js               # 前端核心逻辑
│   │   ├── chat.js              # 对话窗口逻辑
│   │   ├── style.css            # 页面样式
│   │   └── uploads/             # 上传的多模态文件暂存区
│   │
│   └── utils/
│       ├── logger.py            # 日志配置模块
│       └── parser.py            # 统一的 JSON 解析与数据清洗工具
│
├── tests/                       # 单元测试与集成测试模块
│   ├── test_chat.py
│   ├── test_integration.py
│   └── test_video_agent.py
│
├── OPTIMIZATION_REPORT.md       # 代码重构与性能优化报告
├── requirements.txt             # 项目依赖清单
├── run.py                       # Uvicorn 启动脚本 (主服务)
└── run_worker.py                # RQ Worker 启动脚本 (后台任务处理)
```

## 运行方式

1. 确保安装所有依赖：`pip install -r requirements.txt`
2. 配置环境变量：在根目录创建 `.env` 文件，包含 `DASHSCOPE_API_KEY` 和 `TAVILY_API_KEY`。
3. 运行主服务：`python run.py`
4. 运行后台任务队列（用于处理耗时的视频分析）：`python run_worker.py`
