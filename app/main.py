import os
from fastapi import FastAPI
from app.core.config import APP_NAME
from app.api import news  
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.sentiment import router as sentiment_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(sentiment_router, prefix="/api")

app.include_router(news.router, prefix="/api", tags=["News"])

@app.get("/")
def root():
    return FileResponse(os.path.join("app/static", "index.html"))

@app.get("/health")
def health():
    return {"status": "ok", "app_name": APP_NAME}

