import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import APP_NAME
from app.core.database import create_db_and_tables
from app.api import news, history, multimodal, chat
# from app.api import video  <-- 删除这行，除非你真的把接口拆分了且改了前端
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.sentiment import router as sentiment_router

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.exceptions import AppError
from app.utils.logger import app_logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

@app.exception_handler(AppError)
async def app_exception_handler(request: Request, exc: AppError):
    app_logger.error(f"App Error: {exc.code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    app_logger.error(f"Global Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "An unexpected error occurred."}
    )

# 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# 注册路由
# 前端访问 /api/analyze 时，会进入这个 router
app.include_router(sentiment_router, prefix="/api") 

# 新闻路由
app.include_router(news.router, prefix="/api", tags=["News"])

# 历史记录路由
app.include_router(history.router, prefix="/api", tags=["History"])

# 对话路由
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

# 多模态分析路由
app.include_router(multimodal.router, prefix="/api/multimodal", tags=["Multimodal"])

# video.router 建议删除，除非你前端改成了 fetch('/api/video/...')
# app.include_router(video.router, prefix="/api/video", tags=["Video"])

@app.get("/")
def root():
    return FileResponse(os.path.join("app/static", "index.html"))

@app.get("/health")
def health():
    # 修复了这里的语法错误
    return {"status": "ok", "app_name": APP_NAME}
