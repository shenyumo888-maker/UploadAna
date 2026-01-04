import streamlit as st
st.set_page_config(page_title="AI 舆情全视之眼", layout="wide")
def login_page():
    # ================= 1. 注入高级 CSS 样式 =================
    st.markdown("""
        <style>
        /* --- 全局背景：深邃星空色 --- */
        .stApp {
            background: radial-gradient(circle at 10% 20%, #1a1c29 0%, #0f1219 90%);
            background-attachment: fixed;
        }

        /* --- 隐藏顶部原本的红线和菜单 --- */
        header {visibility: hidden;}
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}

        /* --- 装饰背景光球 (模拟截图氛围) --- */
        .stApp::before {
            content: "";
            position: absolute;
            top: -100px;
            left: -100px;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, rgba(0,0,0,0) 70%);
            border-radius: 50%;
            z-index: 0;
            animation: float 10s infinite ease-in-out;
            pointer-events: none;
        }
        .stApp::after {
            content: "";
            position: absolute;
            bottom: -100px;
            right: -100px;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, rgba(0,0,0,0) 70%);
            border-radius: 50%;
            z-index: 0;
            animation: float 15s infinite ease-in-out reverse;
            pointer-events: none;
        }

        @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(20px, 40px); }
            100% { transform: translate(0, 0); }
        }

        /* --- 登录卡片容器动画 --- */
        .block-container {
            animation: fadeIn 0.8s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* --- 标题渐变特效 --- */
        h1 {
            background: linear-gradient(90deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 700 !important;
            text-align: center;
            margin-bottom: 0.5rem;
        }
        
        /* --- 输入框美化：毛玻璃效果 --- */
        .stTextInput > div > div > input {
            background-color: rgba(30, 41, 59, 0.5) !important; /* 半透明深蓝 */
            color: #e2e8f0 !important; /* 浅灰文字 */
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            padding: 10px 15px !important;
            transition: all 0.3s ease;
        }
        /* 输入框聚焦时的发光效果 */
        .stTextInput > div > div > input:focus {
            border-color: #8b5cf6 !important; /* 紫色边框 */
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
            background-color: rgba(30, 41, 59, 0.8) !important;
        }
        .stTextInput label {
            color: #94a3b8 !important; /* 标签颜色 */
        }

        /* --- 按钮美化：渐变紫 --- */
        .stButton > button {
            width: 100%;
            background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 10px !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            letter-spacing: 0.5px;
            transition: transform 0.2s, opacity 0.2s;
        }
        .stButton > button:hover {
            opacity: 0.9;
            transform: translateY(-2px); /* 悬浮上移 */
            box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.4);
        }
        .stButton > button:active {
            transform: translateY(0);
        }
        
        /* --- 错误提示框美化 --- */
        .stAlert {
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
        }
        </style>
    """, unsafe_allow_html=True)

    # ================= 2. 页面布局内容 =================
    
    # 使用空行把内容顶到中间稍微偏上的位置
    st.write("")
    st.write("")
    
    # 标题
    st.markdown("<h1>AI 舆情全视之眼</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #64748b; font-size: 14px; margin-top: -10px;'>Powered by Qwen-Max & Tavily Search</p>", unsafe_allow_html=True)
    
    st.write("") # 增加间距
    
    # 布局列：让登录框居中，宽度适中
    col1, col2, col3 = st.columns([1, 1.5, 1])
    
    with col2:
        # 输入区域
        username = st.text_input("账号", placeholder="请输入管理员账号")
        password = st.text_input("密码", type="password", placeholder="请输入密码")
        
        st.write("") # 按钮上方间距
        
        if st.button("立即登录"):
            if username == "admin" and password == "123456":
                st.session_state['logged_in'] = True
                st.success("登录成功，正在跳转...")
                time.sleep(0.5)
                # 兼容不同版本的重载
                try:
                    st.rerun()
                except:
                    st.experimental_rerun()
            else:
                st.error("🔒 账号或密码错误，请重试")

# --- 核心逻辑控制 ---

# 检查 session 中是否有登录标记
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

if not st.session_state['logged_in']:
    login_page()
    st.stop() # 重点！如果没有登录，就停止运行后面的代码
