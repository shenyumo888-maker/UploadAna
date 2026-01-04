import streamlit as st
import os
from fastapi import FastAPI
from app.core.config import APP_NAME
from app.api import news  
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.sentiment import router as sentiment_router
from auth import check_login 

st.set_page_config(page_title="AI 舆情全视之眼", layout="wide") 

if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

if not st.session_state['logged_in']:
    check_login() # 调用外部文件的函数
    st.stop()   

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

