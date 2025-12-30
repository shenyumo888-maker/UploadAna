<template>
  <div class="login-container">
    <!-- 背景装饰圆球，模拟截图中的氛围光 -->
    <div class="decoration-orb orb-1"></div>
    <div class="decoration-orb orb-2"></div>

    <div class="login-box">
      <!-- 标题部分 -->
      <div class="header">
        <h1 class="title">AI 舆情全视之眼</h1>
        <p class="subtitle">Powered by Qwen-Max & Tavily Search</p>
      </div>

      <!-- 表单部分 -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label>账号</label>
          <input 
            type="text" 
            v-model="form.username" 
            placeholder="请输入管理员账号" 
          />
        </div>

        <div class="input-group">
          <label>密码</label>
          <input 
            type="password" 
            v-model="form.password" 
            placeholder="请输入密码" 
          />
        </div>

        <!-- 登录按钮：复刻截图中的紫色渐变按钮 -->
        <button type="submit" class="submit-btn">
          <span>立即登录</span>
        </button>
      </form>
    </div>
    
    <!-- 底部版权 -->
    <div class="footer">
      © 2025 AI Opinion Monitor. All Rights Reserved.
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router'; // 假设你使用了vue-router

const router = useRouter();

const form = reactive({
  username: '',
  password: ''
});

const handleLogin = () => {
  // 这里写你的登录逻辑，比如调用API
  console.log('尝试登录:', form);
  
  if(form.username && form.password) {
    // 模拟登录成功，跳转到首页
    // 这里的 '/dashboard' 请换成你截图里那个页面的路由路径
    router.push('/'); 
  } else {
    alert('请输入账号和密码');
  }
};
</script>

<style scoped>
/* --- 1. 全局容器与背景 --- */
.login-container {
  position: relative;
  width: 100%;
  height: 100vh;
  /* 提取自截图的深色背景 */
  background-color: #0f1219; 
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* --- 2. 氛围光装饰 (模拟截图中的光晕) --- */
.decoration-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 1;
  opacity: 0.4;
}
.orb-1 {
  width: 400px;
  height: 400px;
  background: #4f46e5; /* 靛蓝色 */
  top: -100px;
  left: -100px;
}
.orb-2 {
  width: 300px;
  height: 300px;
  background: #7c3aed; /* 紫色 */
  bottom: -50px;
  right: -50px;
}

/* --- 3. 登录卡片 (毛玻璃效果) --- */
.login-box {
  position: relative;
  z-index: 10;
  width: 420px;
  padding: 40px;
  /* 核心：半透明背景 + 背景模糊 */
  background: rgba(30, 41, 59, 0.4); 
  backdrop-filter: blur(20px); 
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  /* 细微的边框，增加质感 */
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* --- 4. 文本样式 --- */
.header {
  text-align: center;
  margin-bottom: 30px;
}
.title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  /* 模拟截图中的蓝色标题 */
  background: linear-gradient(90deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: #94a3b8; /* 灰蓝色文字 */
}

/* --- 5. 输入框样式 --- */
.input-group {
  margin-bottom: 20px;
}
.input-group label {
  display: block;
  font-size: 14px;
  color: #cbd5e1;
  margin-bottom: 8px;
}
.input-group input {
  width: 100%;
  padding: 12px 16px;
  /* 输入框背景深色 */
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box; /* 重要：防止padding撑大宽度 */
}
.input-group input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

/* --- 6. 按钮样式 (复刻截图中的“生成报告”按钮) --- */
.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  /* 渐变色背景 */
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  margin-top: 10px;
}
.submit-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.submit-btn:active {
  transform: translateY(0);
}

.footer {
  position: absolute;
  bottom: 20px;
  color: #475569;
  font-size: 12px;
}
</style>
