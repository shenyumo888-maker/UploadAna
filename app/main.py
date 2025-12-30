import os
from fastapi import FastAPI
from app.core.config import APP_NAME
from app.api import news  
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.sentiment import router as sentiment_router

import streamlit as st



def login_page():
    
    st.markdown("""
        <style>
        .stApp {
            background-color: #0f1219;
            color: white;
        }
       
        .stTextInput input {
            background-color: rgba(30, 41, 59, 0.6);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        [data-testid="stSidebar"] {
            display: none;
        }
        </style>
        """, unsafe_allow_html=True)

    st.title("AI 舆情全视之眼")
    st.markdown("Powered by Qwen-Max & Tavily Search")

    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        
        username = st.text_input("账号", placeholder="请输入管理员账号")
        password = st.text_input("密码", type="password", placeholder="请输入密码")
        
        if st.button("立即登录", type="primary"):
            if username == "admin" and password == "123456": # 你可以修改这里的账号密码
                st.session_state['logged_in'] = True
                st.rerun() # 刷新页面，进入主界面
            else:
                st.error("账号或密码错误")




if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

if not st.session_state['logged_in']:
    login_page()
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

