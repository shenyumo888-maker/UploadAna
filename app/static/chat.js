const ChatPanel = {
    template: `
    <div class="fixed bottom-0 right-4 z-40 flex flex-col items-end pointer-events-none">
        <!-- 展开按钮 -->
        <button v-if="!isOpen" @click="toggleChat" 
            class="pointer-events-auto mb-4 px-5 py-2.5 rounded-full shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center group"
            style="background: #1c1c1e; color: #f5f5f7; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 24px rgba(0,0,0,0.4);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" style="color: #6366f1;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <span class="ml-2 font-medium whitespace-nowrap text-[13px]">AI 助手</span>
        </button>

        <!-- 面板 -->
        <div v-show="isOpen" class="pointer-events-auto w-full md:w-[400px] flex flex-col transition-all duration-200 transform origin-bottom overflow-hidden rounded-t-xl"
             style="height: 600px; max-height: 80vh; background: #0c0c0c; border: 1px solid rgba(255,255,255,0.06); border-bottom: none; box-shadow: 0 -8px 40px rgba(0,0,0,0.5);">
            
            <!-- 头部 -->
            <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <h3 class="font-semibold flex items-center gap-2 text-[13px]" style="color: #f5f5f7;">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style="background: #30d158;"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2" style="background: #30d158;"></span>
                    </span>
                    报告助手
                </h3>
                <div class="flex items-center gap-1">
                    <button @click="messages = []" class="text-xs px-2 py-1 rounded-md transition-all duration-150" style="color: #48484a;"
                        onmouseenter="this.style.color='#86868b'; this.style.background='rgba(255,255,255,0.04)'"
                        onmouseleave="this.style.color='#48484a'; this.style.background='transparent'">
                        清空
                    </button>
                    <button @click="toggleChat" class="p-1 rounded-md transition-all duration-150" style="color: #48484a;"
                        onmouseenter="this.style.color='#f5f5f7'; this.style.background='rgba(255,255,255,0.04)'"
                        onmouseleave="this.style.color='#48484a'; this.style.background='transparent'">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- 消息列表 -->
            <div ref="msgContainer" class="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <!-- 空状态 -->
                <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center space-y-5">
                    <div class="p-4 rounded-xl" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04);">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8" style="color: #6366f1;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                        </svg>
                    </div>
                    
                    <div class="space-y-1">
                        <p class="font-medium text-sm" style="color: #f5f5f7;">智能分析助手</p>
                        <p class="text-xs" style="color: #48484a;">基于报告内容，为您提供深度解读</p>
                    </div>

                    <!-- 快捷提问按钮 -->
                    <div class="grid grid-cols-1 gap-1.5 w-full px-3">
                        <button v-for="(q, i) in quickQuestions" :key="i" 
                            @click="inputMsg = q; sendMessage()"
                            class="text-xs text-left rounded-lg px-3 py-2.5 transition-all duration-150 flex items-center gap-2"
                            style="background: transparent; border: 1px solid rgba(255,255,255,0.04); color: #6e6e73;"
                            onmouseenter="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.08)'; this.style.color='#86868b'"
                            onmouseleave="this.style.background='transparent'; this.style.borderColor='rgba(255,255,255,0.04)'; this.style.color='#6e6e73'">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 flex-shrink-0" style="color: #3a3a3c;"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clip-rule="evenodd" /></svg>
                            {{ q }}
                        </button>
                    </div>
                </div>

                <!-- 消息流 -->
                <div v-for="(msg, idx) in messages" :key="idx" class="flex flex-col gap-1.5" style="animation: fadeInUp 0.2s ease-out both;">
                    <!-- User Message -->
                    <div v-if="msg.role === 'user'" class="self-end max-w-[82%]">
                        <div class="px-3.5 py-2 rounded-xl rounded-tr-sm text-[13px] leading-relaxed"
                             style="background: #6366f1; color: #f5f5f7;">
                            {{ msg.content }}
                        </div>
                    </div>

                    <!-- Assistant Message -->
                    <div v-else class="self-start max-w-[90%]">
                        <div class="px-3.5 py-2.5 rounded-xl rounded-tl-sm text-[13px]"
                             style="background: #161617; color: #86868b; border: 1px solid rgba(255,255,255,0.06);">
                            <!-- Loading -->
                            <div v-if="msg.loading" class="flex items-center gap-2 py-1" style="color: #48484a;">
                                <span class="flex gap-1">
                                    <span class="w-1.5 h-1.5 rounded-full animate-bounce" style="background: #6366f1; animation-delay: 0ms"></span>
                                    <span class="w-1.5 h-1.5 rounded-full animate-bounce" style="background: #6366f1; opacity: 0.6; animation-delay: 150ms"></span>
                                    <span class="w-1.5 h-1.5 rounded-full animate-bounce" style="background: #6366f1; opacity: 0.3; animation-delay: 300ms"></span>
                                </span>
                                <span class="text-xs">思考中</span>
                            </div>
                            
                            <!-- Content -->
                            <div v-else class="markdown-body prose prose-invert prose-sm max-w-none text-xs leading-relaxed" 
                                 v-html="renderMarkdown(msg.content)"></div>
                            
                            <!-- Actions -->
                            <div v-if="!msg.loading" class="mt-2.5 flex items-center gap-2.5 pt-2 select-none" style="border-top: 1px solid rgba(255,255,255,0.04);">
                                <button @click="copyText(msg.content)" class="transition-all duration-150" style="color: #3a3a3c;"
                                    onmouseenter="this.style.color='#6366f1'" onmouseleave="this.style.color='#3a3a3c'" title="复制">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.381a9.06 9.06 0 0 1-3.375.125" /></svg>
                                </button>
                                <button @click="handleLike(msg.id, true)" :style="msg.liked === true ? 'color: #30d158' : 'color: #3a3a3c'" class="transition-all duration-150" title="有用"
                                    onmouseenter="if(!this.__liked)this.style.color='#30d158'" onmouseleave="if(!this.__liked)this.style.color='#3a3a3c'">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.247-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.176.405.278.602.283.545.449 1.133.483 1.715.018.324.246.583.57.583h4.112c.763 0 1.516-.216 2.169-.609 3.06-1.836 5.68-5.32 6.574-8.835" /></svg>
                                </button>
                                <button @click="handleLike(msg.id, false)" :style="msg.liked === false ? 'color: #ff453a' : 'color: #3a3a3c'" class="transition-all duration-150" title="无用"
                                    onmouseenter="if(!this.__disliked)this.style.color='#ff453a'" onmouseleave="if(!this.__disliked)this.style.color='#3a3a3c'">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 0 1-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.387.468 3.906a4.496 4.496 0 0 1-1.295 3.06 12.015 12.015 0 0 1-7.868 3.908c-.486.06-1.048.06-1.535 0a11.985 11.985 0 0 1-7.831-4.08 4.496 4.496 0 0 1-1.077-2.888c-.053-1.52.129-2.797.468-3.906.259-.85.983-1.368 1.972-1.368h.908c.392 0 .651.385.57.75m0 0a8.775 8.775 0 0 1 1.043 3.976c0 1.426.333 2.776.924 3.977a1.69 1.69 0 0 1-.105 1.624l-.195.25a.75.75 0 0 0 .6.975l.195.035c.621.111 1.253.167 1.884.167.632 0 1.264-.056 1.885-.167l.194-.035a.75.75 0 0 0 .6-.975l-.195-.25a1.69 1.69 0 0 1-.105-1.624" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 输入框 -->
            <div class="px-4 py-3" style="border-top: 1px solid rgba(255,255,255,0.06); background: #0c0c0c;">
                <div class="relative">
                    <textarea v-model="inputMsg" @keydown.enter.prevent="sendMessage"
                        placeholder="针对报告内容提问…" maxlength="200" rows="1"
                        class="w-full text-[13px] resize-none transition-all duration-150"
                        style="background: #161617; color: #f5f5f7; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 44px 10px 14px; outline: none;"
                        onfocus="this.style.borderColor='rgba(99,102,241,0.5)'; this.style.boxShadow='0 0 0 2px rgba(99,102,241,0.1)'"
                        onblur="this.style.borderColor='rgba(255,255,255,0.06)'; this.style.boxShadow='none'"
                    ></textarea>
                    
                    <button @click="sendMessage" :disabled="!inputMsg.trim() || isThinking"
                        class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-150 transform active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
                        style="color: #6366f1;"
                        onmouseenter="this.style.background='rgba(99,102,241,0.1)'"
                        onmouseleave="this.style.background='transparent'">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                    </button>
                </div>
                <div class="text-right text-[10px] mt-1 transition-colors duration-150" :style="inputMsg.length > 180 ? 'color: #ff453a' : 'color: #3a3a3c'">
                    {{ inputMsg.length }}/200
                </div>
            </div>
        </div>
    </div>
    `,
    props: ['reportId', 'reportData'],
    data() {
        return {
            isOpen: false,
            inputMsg: '',
            messages: [],
            isThinking: false,
            sessionId: '',
            mdParser: window.markdownit({ html: true, linkify: true, breaks: true }),
            quickQuestions: [
                "这份报告的核心结论是什么？",
                "主要的负面观点集中在哪里？",
                "这个事件的热度趋势如何？",
                "媒体来源分布有何特点？"
            ]
        }
    },
    mounted() {
        // Initialize or retrieve session ID from localStorage
        let storedSession = localStorage.getItem('chat_session_id');
        if (!storedSession) {
            storedSession = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chat_session_id', storedSession);
        }
        this.sessionId = storedSession;
    },
    methods: {
        toggleChat() {
            this.isOpen = !this.isOpen;
            if (this.isOpen && this.messages.length === 0 && this.reportId) {
                this.loadHistory();
            }
        },
        async loadHistory() {
            if (!this.reportId) return;
            try {
                const res = await fetch(`/api/chat/history?report_id=${this.reportId}&user_id=${this.sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    this.messages = [];
                    data.forEach(item => {
                        this.messages.push({ role: 'user', content: item.question });
                        this.messages.push({ 
                            role: 'assistant', 
                            content: item.answer, 
                            id: item.id, 
                            liked: item.feedback_like 
                        });
                    });
                    this.scrollToBottom();
                }
            } catch (e) {
                console.error('Failed to load history', e);
            }
        },
        async sendMessage() {
            const content = this.inputMsg.trim();
            if (!content || this.isThinking) return;
            if (!this.reportId) {
                alert("请先生成或选择一份报告");
                return;
            }

            // Add user message
            this.messages.push({ role: 'user', content });
            this.inputMsg = '';
            this.isThinking = true;

            // Add placeholder assistant message
            this.messages.push({ role: 'assistant', content: '', loading: true, id: null, liked: null });
            // 获取响应式代理对象，确保修改能触发视图更新
            const assistantMsg = this.messages[this.messages.length - 1];
            this.scrollToBottom();

            try {
                // Prepare context (simplified)
                const context = {}; 
                // We could pass current filters or specific chart data if needed
                // But generally backend fetches from DB.

                const response = await fetch('/api/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        report_id: this.reportId,
                        question: content,
                        user_id: this.sessionId,
                        context: context
                    })
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                // First chunk might arrive
                assistantMsg.loading = false; 

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    assistantMsg.content += chunk;
                    this.scrollToBottom();
                }

                // Reload to get ID (lazy way)
                // Or better: backend returns ID in a header or special event
                // For now, we can fetch the latest history item id in background or just wait next reload
                // A quick fetch to update ID:
                this.refreshLatestId();

            } catch (e) {
                assistantMsg.content = `Error: ${e.message}`;
                assistantMsg.loading = false;
            } finally {
                this.isThinking = false;
            }
        },
        async refreshLatestId() {
             try {
                const res = await fetch(`/api/chat/history?report_id=${this.reportId}&user_id=${this.sessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        const last = data[data.length - 1];
                        const lastMsg = this.messages[this.messages.length - 1];
                        if (lastMsg.role === 'assistant') {
                            lastMsg.id = last.id;
                        }
                    }
                }
            } catch(e) {}
        },
        renderMarkdown(text) {
            let html = this.mdParser.render(text || '');
            
            // 1. Highlight numbers (simple regex for percentages or large numbers)
            // Avoid replacing inside HTML tags
            html = html.replace(/(?<!=")(?<!\d)(\d{1,3}(,\d{3})*(\.\d+)?%)(?!\d)/g, '<span class="text-indigo-400 font-bold">$1</span>');
            
            // 2. Chart anchors - Make chart references clickable
            const chartMap = {
                '趋势': 'trendChart',
                '情感': 'sentimentChart',
                '来源': 'sourceChart',
                '地域': 'regionChart',
                '话题': 'topicChart',
                '视觉': 'visualWordCloud'
            };
            
            Object.entries(chartMap).forEach(([key, id]) => {
                // Match "XX图" or "XX分析图"
                const regex = new RegExp(`(${key}[\\u4e00-\\u9fa5]*图)`, 'g');
                html = html.replace(regex, `<a href="#" onclick="document.getElementById('${id}')?.scrollIntoView({behavior: 'smooth', block: 'center'}); return false;" class="text-indigo-400 hover:underline decoration-dotted cursor-pointer" title="点击跳转图表">$1</a>`);
            });
            
            return html;
        },
        scrollToBottom() {
            this.$nextTick(() => {
                const container = this.$refs.msgContainer;
                if (container) container.scrollTop = container.scrollHeight;
            });
        },
        copyText(text) {
            navigator.clipboard.writeText(text);
            // Simple toast?
        },
        async handleLike(msgId, isLike) {
            if (!msgId) return;
            // Optimistic update
            const msg = this.messages.find(m => m.id === msgId);
            if (msg) {
                // Toggle if clicking same
                if (msg.liked === isLike) msg.liked = null; 
                else msg.liked = isLike;
            }
            
            await fetch('/api/chat/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: msgId, like: msg.liked === true })
            });
        }
    },
    watch: {
        reportId(newVal) {
            if (newVal) {
                this.messages = [];
                if (this.isOpen) this.loadHistory();
            } else {
                this.isOpen = false;
            }
        }
    }
};
