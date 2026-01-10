import os
from fastapi import FastAPI
from app.core.config import APP_NAME
from app.api import news
# from app.api import video  <-- 删除这行，除非你真的把接口拆分了且改了前端
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.sentiment import router as sentiment_router

app = FastAPI()

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

# video.router 建议删除，除非你前端改成了 fetch('/api/video/...')
# app.include_router(video.router, prefix="/api/video", tags=["Video"])

@app.get("/")
def root():
    return FileResponse(os.path.join("app/static", "index.html"))

@app.get("/health")
def health():
    # 修复了这里的语法错误
    return {"status": "ok", "app_name": APP_NAME}

