from redis import Redis
from app.core.config import settings
from app.utils.logger import app_logger

# 尝试导入 RQ，处理 Windows 下不支持 fork 的问题
try:
    from rq import Queue
    RQ_AVAILABLE = True
except (ImportError, ValueError, AttributeError) as e:
    # ValueError: cannot find context for 'fork'
    # AttributeError: module 'os' has no attribute 'fork'
    app_logger.warning(f"[Queue] RQ not available (likely on Windows): {e}")
    RQ_AVAILABLE = False
    Queue = None

# 初始化 Redis 连接
try:
    if RQ_AVAILABLE:
        redis_conn = Redis.from_url(settings.REDIS_URL)
        # 创建任务队列
        task_queue = Queue('multimodal_analysis', connection=redis_conn)
        app_logger.info(f"[Queue] Redis connected: {settings.REDIS_URL}")
    else:
        app_logger.warning("[Queue] Running in synchronous mode (RQ unavailable)")
        redis_conn = None
        task_queue = None
except Exception as e:
    app_logger.error(f"[Queue] Redis connection failed: {e}")
    redis_conn = None
    task_queue = None
