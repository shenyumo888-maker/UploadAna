const ChatPanel = {
    template: `
    <div class="fixed bottom-0 right-4 z-40 flex flex-col items-end pointer-events-none">
        <!-- 展开按钮 -->
        <button v-if="!isOpen" @click="toggleChat" 
            class="pointer-events-auto mb-4 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center border-2 border-indigo-400/50 backdrop-blur-md group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 group-hover:animate-pulse">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <span class="ml-2 font-medium pr-1 whitespace-nowrap">AI 分析助手</span>
        </button>

        <!-- 面板 -->
        <div v-show="isOpen" class="pointer-events-auto w-full md:w-[400px] bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-t-2xl shadow-2xl flex flex-col transition-all duration-300 transform origin-bottom overflow-hidden" 
             style="height: 600px; max-height: 80vh;">
            
            <!-- 头部 -->
            <div class="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80">
                <h3 class="font-bold text-white flex items-center gap-2 text-sm">
                    <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    智能报告助手
                </h3>
                <div class="flex items-center gap-2">
                    <button @click="messages = []" class="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition">
                        清空
                    </button>
                    <button @click="toggleChat" class="text-slate-400 hover:text-white transition-transform hover:rotate-90">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- 消息列表 -->
            <div ref="msgContainer" class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <!-- 空状态 -->
                <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-6">
                    <div class="p-4 bg-slate-800 rounded-full shadow-lg ring-1 ring-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-indigo-400">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                        </svg>
                    </div>
                    
                    <div class="space-y-1">
                        <p class="font-medium text-slate-200 text-sm">你好！我是您的智能分析助手</p>
                        <p class="text-xs text-slate-400">您可以尝试问我以下问题：</p>
                    </div>

                    <!-- 快捷提问按钮 -->
                    <div class="grid grid-cols-1 gap-2 w-full px-8">
                        <button v-for="(q, i) in quickQuestions" :key="i" 
                            @click="inputMsg = q; sendMessage()"
                            class="text-xs text-left bg-slate-800/50 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/50 rounded-lg px-3 py-2.5 transition-all duration-200 flex items-center gap-2 group">
                            <span class="text-indigo-500/50 group-hover:text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>
                            </span>
                            {{ q }}
                        </button>
                    </div>
                </div>

                <!-- 消息流 -->
                <div v-for="(msg, idx) in messages" :key="idx" class="flex flex-col gap-1 animate-fade-in-up">
                    <!-- User Message -->
                    <div v-if="msg.role === 'user'" class="self-end max-w-[85%]">
                        <div class="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-md leading-relaxed">
                            {{ msg.content }}
                        </div>
                    </div>

                    <!-- Assistant Message -->
                    <div v-else class="self-start max-w-[90%]">
                        <div class="bg-slate-800/80 text-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm text-sm shadow-md border border-slate-700/50">
                            <!-- Loading -->
                            <div v-if="msg.loading" class="flex items-center gap-2 text-slate-400 py-1">
                                <span class="flex gap-1">
                                    <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                                    <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                                    <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                                </span>
                                <span class="text-xs">思考中...</span>
                            </div>
                            
                            <!-- Content -->
                            <div v-else class="markdown-body prose prose-invert prose-sm max-w-none text-xs leading-relaxed" 
                                 v-html="renderMarkdown(msg.content)"></div>
                            
                            <!-- Actions -->
                            <div v-if="!msg.loading" class="mt-3 flex items-center gap-3 border-t border-slate-700/50 pt-2 select-none">
                                <button @click="copyText(msg.content)" class="text-slate-500 hover:text-indigo-400 transition-colors" title="复制">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.381a9.06 9.06 0 0 1-3.375.125" /></svg>
                                </button>
                                <button @click="handleLike(msg.id, true)" :class="msg.liked === true ? 'text-green-500' : 'text-slate-500 hover:text-green-400'" class="transition-colors" title="有用">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.247-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.176.405.278.602.283.545.449 1.133.483 1.715.018.324.246.583.57.583h4.112c.763 0 1.516-.216 2.169-.609 3.06-1.836 5.68-5.32 6.574-8.835" /></svg>
                                </button>
                                <button @click="handleLike(msg.id, false)" :class="msg.liked === false ? 'text-red-500' : 'text-slate-500 hover:text-red-400'" class="transition-colors" title="无用">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 0 1-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.387.468 3.906a4.496 4.496 0 0 1-1.295 3.06 12.015 12.015 0 0 1-7.868 3.908c-.486.06-1.048.06-1.535 0a11.985 11.985 0 0 1-7.831-4.08 4.496 4.496 0 0 1-1.077-2.888c-.053-1.52.129-2.797.468-3.906.259-.85.983-1.368 1.972-1.368h.908c.392 0 .651.385.57.75m0 0a8.775 8.775 0 0 1 1.043 3.976c0 1.426.333 2.776.924 3.977a1.69 1.69 0 0 1-.105 1.624l-.195.25a.75.75 0 0 0 .6.975l.195.035c.621.111 1.253.167 1.884.167.632 0 1.264-.056 1.885-.167l.194-.035a.75.75 0 0 0 .6-.975l-.195-.25a1.69 1.69 0 0 1-.105-1.624" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 输入框 -->
            <div class="p-4 border-t border-slate-700 bg-slate-800/90">
                <div class="relative group">
                    <textarea v-model="inputMsg" @keydown.enter.prevent="sendMessage"
                        placeholder="针对报告内容提问… (Max 200)" maxlength="200" rows="1"
                        class="w-full bg-slate-700/50 text-white rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none scrollbar-hide transition-all group-hover:bg-slate-700/80"></textarea>
                    
                    <button @click="sendMessage" :disabled="!inputMsg.trim() || isThinking"
                        class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all transform active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                    </button>
                </div>
                <div class="text-right text-[10px] text-slate-500 mt-1 transition-colors" :class="{'text-orange-400': inputMsg.length > 180}">
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
                "📈 这份报告的核心结论是什么？",
                "😡 主要的负面观点集中在哪里？",
                "🔥 这个事件的热度趋势如何？",
                "📊 媒体来源分布有何特点？"
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
