import sys
import os

# 将当前目录加入 path，确保可以 import app
sys.path.append(os.getcwd())

# 尝试导入 RQ，处理 Windows 下不支持 fork 的问题
try:
    from redis import Redis
    from rq import Worker, Queue, Connection
except (ImportError, ValueError, AttributeError) as e:
    print(f"Error: RQ (Redis Queue) is not supported on Windows directly due to fork dependency.")
    print(f"Details: {e}")
    print("Suggestion: Use WSL (Windows Subsystem for Linux) or Docker to run the worker.")
    print("Note: The API server will automatically fallback to synchronous mode without the worker.")
    sys.exit(1)

from app.utils.logger import app_logger
from app.core.config import settings

# 确保数据库表已创建
create_db_and_tables()

listen = ['multimodal_analysis']

if __name__ == '__main__':
    if os.name == 'nt':
        app_logger.warning("Warning: Running RQ worker on Windows is generally not supported.")
    
    app_logger.info(f"Starting RQ Worker on queues: {listen}")
    try:
        conn = Redis.from_url(settings.REDIS_URL)
        with Connection(conn):
            # 显式传入 connection
            worker = Worker(map(Queue, listen), connection=conn)
            worker.work()
    except Exception as e:
        app_logger.error(f"Failed to start worker: {e}")
        app_logger.error("Ensure Redis is running and REDIS_URL is correct.")
