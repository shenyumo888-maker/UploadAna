# 部署文档

## 环境依赖

本项目依赖 Python 3.9+ 和 Redis 服务。

### 1. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`（如果尚未创建），并配置以下必要的 Key：

```ini
DASHSCOPE_API_KEY=sk-xxxxxx  # 阿里云通义千问 API Key
REDIS_URL=redis://localhost:6379/0  # Redis 连接地址
```

### 3. 启动 Redis

**Windows**:
下载 Redis for Windows 并启动 `redis-server.exe`。

**Linux/Mac**:
```bash
redis-server
```

或使用 Docker:
```bash
docker run -d -p 6379:6379 redis
```

### 4. 启动应用

本项目包含两个核心进程：API 服务和后台任务 Worker。

**启动 API 服务**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**启动后台任务 Worker (处理视频分析)**:
```bash
python run_worker.py
```

### 5. 访问系统

打开浏览器访问 `http://localhost:8000`

---

## 功能说明

### 多模态分析 (Multimodal Analysis)
- **前端上传**: 支持 MP4/MOV/AVI 视频和 JPG/PNG 图片拖拽上传。
- **后台处理**: 文件上传后立即返回 `file_id`，后台 Worker 异步调用通义千问 VL 模型进行分析。
- **结果融合**: 
  - 前端同时请求文本分析流 (`/api/analyze/stream`) 和 视觉分析状态 (`/api/multimodal/status/{file_id}`)。
  - 当两者都完成后，前端自动融合文本情感和视觉情感，计算综合得分，并在报告中追加 "视觉舆情分析" 章节。

### 性能指标
- 支持 200MB 视频文件上传。
- 视频抽帧策略：每秒 1 帧，最多 30 帧。
- 综合得分公式：`Score = 0.7 * TextScore + 0.3 * VisualScore`。
