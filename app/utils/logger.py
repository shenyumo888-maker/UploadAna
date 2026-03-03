import sys
from loguru import logger
from app.core.config import settings

def setup_logger():
    # 移除默认的 handler
    logger.remove()
    
    # 定义日志格式
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    
    # 根据配置设置日志级别
    log_level = "DEBUG" if settings.DEBUG else "INFO"
    
    # 添加控制台输出
    logger.add(
        sys.stderr,
        format=log_format,
        level=log_level,
        colorize=True
    )
    
    # 添加文件输出（每天轮转，保留 7 天）
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        rotation="00:00",
        retention="7 days",
        level="INFO",
        encoding="utf-8",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )
    
    return logger

# 导出配置好的 logger 实例
app_logger = setup_logger()
