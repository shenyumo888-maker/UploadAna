// app.js 专门处理 Vue + ECharts
const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

/* ── Global flowing light source system ── */
(function initLightSources() {
    function boot() {
        const cvs = document.getElementById('heroGeoCanvas');
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        let W, H;
        const lights = [];
        const TAU = Math.PI * 2;

        function getActiveScrollOffset() {
            const reportScroller = document.querySelector('.report-mode');
            if (reportScroller) return reportScroller.scrollTop || 0;
            return window.scrollY || document.documentElement.scrollTop || 0;
        }

        function resize() {
            // Canvas is fixed; keep buffer in viewport space for stable light math.
            W = cvs.width = window.innerWidth;
            H = cvs.height = window.innerHeight;
            if (lights.length === 0) createLights();
        }

        function createLights() {
            lights.length = 0;
            const big = Math.max(W, H);
            const sy = getActiveScrollOffset();
            lights.push({
                x: W * 0.28, y: sy + H * 0.12,
                r: big * 0.55,
                vx: 0.04, vy: 0.025,
                color: [150, 200, 255],
                alpha: 0.07,
                phase: 0,
                cx: 0, cy: 0,
            });
            lights.push({
                x: W * 0.72, y: sy + H * 0.28,
                r: big * 0.48,
                vx: -0.035, vy: 0.02,
                color: [255, 175, 120],
                alpha: 0.055,
                phase: TAU * 0.33,
                cx: 0, cy: 0,
            });
            lights.push({
                x: W * 0.50, y: sy + H * 0.55,
                r: big * 0.42,
                vx: 0.025, vy: -0.035,
                color: [185, 145, 255],
                alpha: 0.04,
                phase: TAU * 0.66,
                cx: 0, cy: 0,
            });
        }

        /* Per-element glass light calculation — updates CSS vars on each glass element */
        const GLASS_SEL = '.glass, .glass-strong, .metric-card, .chart-wrapper, .input-wrap, .tab-bar, .toast, .source-card, .report-nav, .upload-zone, .hot-item, .btn-primary, .btn-ghost, .glass-pill-btn, .chat-panel, .chat-fab';
        let glassTimer = 0;

        function updateGlassElements(t) {
            if (t - glassTimer < 70) return;
            glassTimer = t;

            const els = document.querySelectorAll(GLASS_SEL);

            for (const el of els) {
                const rect = el.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) continue;

                const ecx = rect.left + rect.width / 2;
                const ecy = rect.top + rect.height / 2;

                // Find the dominant light contribution for this element
                // Canvas is position:fixed so L.cx/L.cy are already in viewport coords
                let bestI = 0, bestL = lights[0];
                for (const L of lights) {
                    const dx = L.cx - ecx, dy = L.cy - ecy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const intensity = Math.max(0, 1 - dist / (L.r * 0.9));
                    if (intensity > bestI) { bestI = intensity; bestL = L; }
                }

                // Light position as % within element's own box
                const lxPct = ((bestL.cx - rect.left) / rect.width * 100);
                const lyPct = ((bestL.cy - rect.top) / rect.height * 100);

                // Direction from element center toward light
                const dx = bestL.cx - ecx;
                const dy = bestL.cy - ecy;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = dx / dist, ny = dy / dist;

                // Per-edge dispersion intensity: edge facing the light gets dispersion
                const topI    = (Math.max(0, -ny) * bestI).toFixed(3);
                const bottomI = (Math.max(0,  ny) * bestI).toFixed(3);
                const leftI   = (Math.max(0, -nx) * bestI).toFixed(3);
                const rightI  = (Math.max(0,  nx) * bestI).toFixed(3);

                const s = el.style;
                s.setProperty('--el-lx', lxPct.toFixed(1) + '%');
                s.setProperty('--el-ly', lyPct.toFixed(1) + '%');
                s.setProperty('--el-i', bestI.toFixed(3));
                s.setProperty('--dt', topI);
                s.setProperty('--db', bottomI);
                s.setProperty('--dl', leftI);
                s.setProperty('--dr', rightI);
                // Dominant light color
                s.setProperty('--lc-r', bestL.color[0]);
                s.setProperty('--lc-g', bestL.color[1]);
                s.setProperty('--lc-b', bestL.color[2]);
            }
        }

        function draw(t) {
            requestAnimationFrame(draw);
            if (!W || !H) { resize(); return; }
            ctx.clearRect(0, 0, W, H);
            const sy = getActiveScrollOffset();
            const reportBoost = document.querySelector('.report-mode') ? 1.55 : 1;

            for (const L of lights) {
                const driftX = Math.sin(t * 0.00003 + L.phase) * W * 0.18;
                const driftY = Math.cos(t * 0.000022 + L.phase * 1.3) * H * 0.12;
                L.x += L.vx;
                L.y += L.vy;

                const margin = L.r * 0.4;
                if (L.x < -margin) L.x = W + margin * 0.3;
                if (L.x > W + margin) L.x = -margin * 0.3;
                // Y bounds follow active scroll container so light/content stay coherent on scroll.
                if (L.y < sy - margin) L.y = sy + H + margin * 0.3;
                if (L.y > sy + H + margin) L.y = sy - margin * 0.3;

                const cx = L.x + driftX;
                const cy = L.y + driftY - sy;
                L.cx = cx; L.cy = cy;

                const pulse = 1 + Math.sin(t * 0.0003 + L.phase) * 0.12;
                const r = L.r * pulse;
                const c = L.color;
                const a = L.alpha * reportBoost;

                // Soft light orb: no hard core, smooth gaussian-like falloff
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0,    `rgba(${c[0]},${c[1]},${c[2]},${a * 1.6})`);
                grad.addColorStop(0.08, `rgba(${c[0]},${c[1]},${c[2]},${a * 1.4})`);
                grad.addColorStop(0.20, `rgba(${c[0]},${c[1]},${c[2]},${a * 1.1})`);
                grad.addColorStop(0.38, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.7})`);
                grad.addColorStop(0.58, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.35})`);
                grad.addColorStop(0.78, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.12})`);
                grad.addColorStop(1,    `rgba(${c[0]},${c[1]},${c[2]},0)`);

                ctx.fillStyle = grad;
                ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            }

            updateGlassElements(t);
        }

        window.addEventListener('resize', resize);
        resize();
        requestAnimationFrame(draw);
    }
    if (document.readyState === 'complete') { setTimeout(boot, 100); }
    else { window.addEventListener('load', () => setTimeout(boot, 100)); }
})();

const app = createApp({
    setup() {
        const topic = ref('');
        const loading = ref(false);
        const result = ref(null);
        const hotTopics = ref([]);
        const mdParser = window.markdownit();
        const reportRef = ref(null);
        const hotLoading = ref(false);
        const toastMsg = ref('');//提示框消息文字
        
        // 文件上传相关
        const uploadFiles = ref([]);
        const dragOver = ref(false);

        // === 历史记录相关 ===
        const historyList = ref([]);
        const showHistory = ref(false);

        // === 新增版块状态 ===
        const reportMode = ref(false);
        const activeTab = ref('overview');
        const sectionStatus = ref({
            background: 'idle',
            analysis: 'idle',
            conclusion: 'idle'
        });
        const sectionProgress = ref({
            background: 0,
            analysis: 0,
            conclusion: 0
        });

        const closeReport = () => {
            reportMode.value = false;
            // 如果需要回首页后能看到热搜，且不保留当前结果，可以清空
            // 但如果用户想之后再点历史记录回来，不清空也行。
            // 根据需求“生成完再返回就没热搜了”，我们需要确保 homepage 状态正确。
            result.value = null; 
            topic.value = '';
        };

        const openReport = () => {
            reportMode.value = true;
            activeTab.value = 'overview';
        };

        const tabClass = (tab) => {
            return activeTab.value === tab 
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50';
        };

        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/history');
                if (res.ok) {
                    historyList.value = await res.json();
                }
            } catch (e) {
                console.error("获取历史记录失败", e);
            }
        };

        const loadHistory = async (id) => {
            try {
                loading.value = true;
                loadingMsg.value = '正在加载历史记录...';
                showHistory.value = false; // 关闭侧边栏
                
                const res = await fetch(`/api/history/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.result_json) {
                        let parsedResult;
                        try {
                            parsedResult = JSON.parse(data.result_json);
                        } catch (e) {
                            console.error("解析历史数据失败", e);
                            showToast("数据格式错误");
                            return;
                        }
                        
                        if (!parsedResult.intro_markdown && !parsedResult.data_markdown) {
                            parsedResult.data_markdown = parsedResult.report_markdown;
                            parsedResult.intro_markdown = "> (加载自旧版历史记录，无独立溯源版块)";
                            parsedResult.conclusion_markdown = "> (加载自旧版历史记录，无独立研判版块)";
                        }
                        
                        parsedResult.id = data.id;
                        result.value = parsedResult;
                        topic.value = data.topic;
                        sectionStatus.value = { background: 'done', analysis: 'done', conclusion: 'done' };
                        openReport();
                        
                        await nextTick();
                        setTimeout(() => {
                            if (activeTab.value === 'analysis' || activeTab.value === 'all') {
                                initCharts(parsedResult);
                            }
                        }, 100);
                        showToast('历史记录加载成功');
                    }
                } else {
                    showToast('加载失败');
                }
            } catch (e) {
                console.error(e);
                showToast('加载出错');
            } finally {
                loading.value = false;
            }
        };

        const deleteHistory = async (id) => {
            if (!confirm('确定要删除这条记录吗？')) return;
            try {
                const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast('删除成功');
                    fetchHistory();
                    if (result.value && result.value.id === id) {
                        result.value = null;
                        topic.value = '';
                    }
                }
            } catch (e) {
                showToast('删除失败');
            }
        };

        const clearHistory = async () => {
            if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) return;
            try {
                const res = await fetch('/api/history/clear/all', { method: 'DELETE' });
                if (res.ok) {
                    showToast('所有历史记录已清除');
                    fetchHistory();
                    // 如果当前显示的正是要被清除的
                    result.value = null;
                    topic.value = '';
                    reportMode.value = false;
                }
            } catch (e) {
                showToast('并清空失败');
            }
        };

        onMounted(() => {
            fetchHotTopics();
            fetchHistory();
        });

        const showToast = (text) => {
            toastMsg.value = text;
            setTimeout(() => {
                toastMsg.value = '';
            }, 3000);
        };

        const loadingProgress = ref(0);
        const loadingMsg = ref('正在启动分析引擎...');

        // === 文件处理逻辑 ===
        const handleDrop = (e) => {
            dragOver.value = false;
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) processFiles(files);
        };

        const handleFileSelect = (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) processFiles(files);
        };

        const processFiles = (files) => {
            const validExts = ['mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'webp'];
            
            // 如果已有视频，不能再传；如果新加的包含视频，只能选1个视频，且不能有图片
            let currentFiles = uploadFiles.value;
            let newFilesToAdd = [];

            for (let file of files) {
                const ext = file.name.split('.').pop().toLowerCase();
                if (!validExts.includes(ext)) {
                    showToast(`不支持的文件格式: ${file.name}`);
                    continue;
                }

                const isVid = ['mp4', 'mov', 'avi'].includes(ext);
                const limit = isVid ? 200 * 1024 * 1024 : 20 * 1024 * 1024;
                if (file.size > limit) {
                    showToast(`文件过大: ${file.name}`);
                    continue;
                }

                if (isVid) {
                    if (currentFiles.length > 0 || newFilesToAdd.length > 0) {
                        showToast('视频文件只能单独上传一个');
                        return;
                    }
                    newFilesToAdd.push(file);
                    break; // 视频只能1个
                } else {
                    const hasVideo = currentFiles.some(f => ['mp4', 'mov', 'avi'].includes(f.file.name.split('.').pop().toLowerCase()));
                    if (hasVideo) {
                        showToast('已选择视频，无法再添加图片');
                        return;
                    }
                    newFilesToAdd.push(file);
                }
            }

            if (currentFiles.length + newFilesToAdd.length > 5) {
                showToast('最多只能上传5张图片');
                newFilesToAdd = newFilesToAdd.slice(0, 5 - currentFiles.length);
            }

            for (let file of newFilesToAdd) {
                const fileObj = {
                    id: Date.now() + Math.random(),
                    file: file,
                    progress: 0,
                    status: 'pending', // pending, uploading, processing, completed, error
                    fileId: null,
                    taskId: null,
                    visualResult: null
                };
                uploadFiles.value.push(fileObj);
                startUpload(fileObj);
            }
        };

        const removeFile = (index) => {
            uploadFiles.value.splice(index, 1);
        };

        const formatSize = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const isVideo = (name) => {
            const ext = name.split('.').pop().toLowerCase();
            return ['mp4', 'mov', 'avi'].includes(ext);
        };

        const startUpload = (fileObj) => {
            fileObj.status = 'uploading';
            const formData = new FormData();
            formData.append('file', fileObj.file);

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    fileObj.progress = percent;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const res = JSON.parse(xhr.responseText);
                    fileObj.fileId = res.file_id;
                    fileObj.taskId = res.task_id;
                    fileObj.status = 'processing';
                    showToast('文件上传成功，开始后台分析');
                    
                    pollTaskStatus(fileObj);
                } else {
                    fileObj.status = 'error';
                    showToast('上传失败');
                }
            });

            xhr.addEventListener('error', () => {
                fileObj.status = 'error';
                showToast('网络错误');
            });

            xhr.open('POST', '/api/multimodal/upload');
            xhr.send(formData);
        };

        const pollTaskStatus = async (fileObj) => {
            if (!fileObj.fileId) return;

            const check = async () => {
                try {
                    const res = await fetch(`/api/multimodal/status/${fileObj.fileId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'completed') {
                            fileObj.status = 'completed';
                            fileObj.visualResult = JSON.parse(data.result);
                            showToast('视觉分析完成！');
                            
                            if (result.value) {
                                mergeVisualResult();
                            }
                        } else if (data.status === 'failed') {
                            fileObj.status = 'error';
                            showToast(`视觉分析失败: ${data.error}`);
                        } else {
                            setTimeout(check, 2000);
                        }
                    }
                } catch (e) {
                    console.error("Poll error", e);
                }
            };
            check();
        };

        // 融合视觉结果到主报告
        const mergeVisualResult = () => {
            if (!result.value) return;
            if (result.value.multimodal) return; // 避免重复融合
            
            const completedFiles = uploadFiles.value.filter(f => f.status === 'completed' && f.visualResult);
            if (completedFiles.length === 0) return;

            // 综合多个文件的情绪
            let posCount = 0, negCount = 0, neuCount = 0;
            let totalVisualScore = 0;
            let allEntities = [];

            completedFiles.forEach(f => {
                const vr = f.visualResult;
                let vs = 50;
                if (vr.emotion === 'positive') { vs = 90; posCount++; }
                else if (vr.emotion === 'negative') { vs = 20; negCount++; }
                else { vs = 50; neuCount++; }
                totalVisualScore += vs;
                if (vr.entities) allEntities.push(...vr.entities);
            });

            const avgVisualScore = Math.round(totalVisualScore / completedFiles.length);
            
            // 确定综合情绪倾向
            let overallEmotion = 'neutral';
            if (posCount > negCount && posCount >= neuCount) overallEmotion = 'positive';
            else if (negCount > posCount && negCount >= neuCount) overallEmotion = 'negative';

            const textScore = result.value.sentiment_score;
            const alpha = 0.7; // 文本权重
            const beta = 0.3;  // 视觉权重
            const newScore = Math.round(textScore * alpha + avgVisualScore * beta);
            
            result.value.sentiment_score = newScore;
            // 更新 label
            if (newScore >= 70) result.value.sentiment_label = '正面 (综合)';
            else if (newScore >= 40) result.value.sentiment_label = '中立 (综合)';
            else result.value.sentiment_label = '负面 (综合)';

            // 标记为多模态
            result.value.multimodal = true;
            result.value.visual_analysis = {
                emotion: overallEmotion,
                entities: [...new Set(allEntities)],
                confidence: 0.85
            };
        };

        // === 进度模拟器 ===
        const startSectionProgress = (section) => {
            if (window[`${section}Interval`]) clearInterval(window[`${section}Interval`]);
            sectionProgress.value[section] = 10;
            window[`${section}Interval`] = setInterval(() => {
                if (sectionStatus.value[section] === 'loading') {
                    if (sectionProgress.value[section] < 90) {
                        // 随机步进并取整
                        const next = sectionProgress.value[section] + Math.random() * 5;
                        sectionProgress.value[section] = Math.floor(next);
                    }
                } else {
                    clearInterval(window[`${section}Interval`]);
                }
            }, 800);
        };

        // === 文本流式分析 ===
        const handleStreamEvent = async (event, data) => {
            switch (event) {
                case 'status':
                    loadingMsg.value = data;
                    // 先检查“分析/图表”/“多维”，再检查“搜索”，避免匹配重叠
                    if (data.includes('研判') || data.includes('建议')) {
                        loadingProgress.value = 80;
                        sectionStatus.value.conclusion = 'loading';
                        startSectionProgress('conclusion');
                    }
                    else if (data.includes('多维') || data.includes('图表') || data.includes('分析')) {
                        loadingProgress.value = 45;
                        sectionStatus.value.analysis = 'loading';
                        startSectionProgress('analysis');
                    }
                    else if (data.includes('搜索')) {
                        loadingProgress.value = 10;
                        sectionStatus.value.background = 'loading';
                        startSectionProgress('background');
                    }
                    break;
                case 'background':
                    if (!result.value) result.value = {};
                    if (!result.value.intro_markdown) result.value.intro_markdown = '';
                    result.value.intro_markdown += data;
                    loadingProgress.value = 40;
                    sectionStatus.value.background = 'done';
                    sectionProgress.value.background = 100;
                    break;
                case 'data':
                    const intro = result.value ? result.value.intro_markdown : '';
                    result.value = { ...data };
                    result.value.intro_markdown = intro;
                    result.value.data_markdown = data.report_markdown || '';
                    loadingProgress.value = 75;
                    sectionStatus.value.analysis = 'done';
                    sectionProgress.value.analysis = 100;
                    await nextTick();
                    if (activeTab.value === 'analysis' || activeTab.value === 'all') {
                        initCharts(result.value);
                    }
                    
                    // 尝试融合视觉结果（如果已经好了）
                    const hasCompletedVisual = uploadFiles.value.some(f => f.status === 'completed' && f.visualResult);
                    if (hasCompletedVisual) mergeVisualResult();
                    break;
                case 'detail':
                    if (!result.value) result.value = {};
                    if (!result.value.conclusion_markdown) result.value.conclusion_markdown = '';
                    result.value.conclusion_markdown += data;
                    loadingProgress.value = 95;
                    sectionStatus.value.conclusion = 'done';
                    sectionProgress.value.conclusion = 100;
                    break;
                case 'done':
                    loadingProgress.value = 100;
                    loadingMsg.value = '分析完成';
                    sectionStatus.value = { background: 'done', analysis: 'done', conclusion: 'done' };
                    sectionProgress.value = { background: 100, analysis: 100, conclusion: 100 };
                    loading.value = false;
                    if (data.id) {
                        if (!result.value) result.value = {};
                        result.value.id = data.id;
                    }
                    // 再次尝试融合，确保最后也能融合
                    const finalHasCompletedVisual = uploadFiles.value.some(f => f.status === 'completed' && f.visualResult);
                    if (finalHasCompletedVisual) mergeVisualResult();
                    fetchHistory();
                    break;
            }
        };

        const analyze = async () => {
            if (!topic.value && uploadFiles.value.length === 0) {
                showToast('请输入话题或上传文件');
                return;
            }

            const uncompleted = uploadFiles.value.filter(f => f.status !== 'completed' && f.status !== 'error');
            if (uncompleted.length > 0) {
                showToast('正在等待多模态文件分析完成，请稍后...');
                return;
            }
            
            loading.value = true;
            result.value = { report_markdown: '' };
            loadingProgress.value = 0;
            loadingMsg.value = '正在建立连接...';
            sectionStatus.value = { background: 'idle', analysis: 'idle', conclusion: 'idle' };
            sectionProgress.value = { background: 0, analysis: 0, conclusion: 0 };
            openReport();

            try {
                result.value = { report_markdown: '' };
                const formData = new FormData();

                let combinedVisual = '';
                let allEntities = [];
                uploadFiles.value.forEach((f, index) => {
                    if (f.visualResult) {
                        const vr = f.visualResult;
                        combinedVisual += `[文件${index+1}文字: ${vr.ocr_text || '无'} | 实体: ${(vr.entities || []).join(',')}] `;
                        if (vr.summary) combinedVisual += `摘要: ${vr.summary} `;
                        if (vr.entities) allEntities.push(...vr.entities);
                    }
                });

                let searchTopic = topic.value;
                if (combinedVisual) {
                    if (!searchTopic) {
                        // 如果没有输入文字，提取主要实体作为检索关键词
                        const uniqueEntities = [...new Set(allEntities)].filter(e => e && e.length > 1).slice(0, 3);
                        searchTopic = uniqueEntities.length > 0 ? uniqueEntities.join(' ') : '多模态舆情事件';
                        topic.value = searchTopic; // 更新输入框显示
                    } else {
                        // 如果既有文字关键词又有多模态内容，两相综合作为主题（简单拼接核心实体增强检索）
                        const uniqueEntities = [...new Set(allEntities)].filter(e => e && e.length > 1).slice(0, 2);
                        if (uniqueEntities.length > 0) {
                            searchTopic = `${topic.value} ${uniqueEntities.join(' ')}`;
                        }
                    }
                }
                
                formData.append('topic', searchTopic);
                if (combinedVisual) {
                    formData.append('extra_context', combinedVisual);
                }
                
                const response = await fetch('/api/analyze/stream', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop(); 

                    for (const part of parts) {
                        const lines = part.split('\n');
                        let event = '', dataStr = '';
                        
                        for (const line of lines) {
                            if (line.startsWith('event: ')) event = line.slice(7).trim();
                            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
                        }
                        
                        if (event && dataStr) {
                            try {
                                const data = JSON.parse(dataStr);
                                handleStreamEvent(event, data);
                            } catch (e) {
                                console.error('Stream Parse Error', e);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                alert('分析失败，请检查后端日志');
                loading.value = false;
            }
        };


        // ── JSON-driven chart insight computations ──
        const latestTrendScore = computed(() => {
            const d = result.value?.trend_data;
            return d && d.length ? d[d.length - 1].score : '—';
        });
        const trendDirection = computed(() => {
            const d = result.value?.trend_data;
            if (!d || d.length < 2) return '持平';
            const last = d[d.length - 1].score, prev = d[d.length - 2].score;
            return last > prev ? '上升' : last < prev ? '下降' : '持平';
        });
        const dominantSentiment = computed(() => {
            const d = result.value?.sentiment_distribution;
            if (!d || !d.length) return { name: '—', value: 0 };
            return d.reduce((a, b) => b.value > a.value ? b : a, d[0]);
        });
        const topSource = computed(() => {
            const d = result.value?.source_distribution;
            if (!d || !d.length) return { name: '—', value: 0 };
            return d.reduce((a, b) => b.value > a.value ? b : a, d[0]);
        });
        const topRegion = computed(() => {
            const d = result.value?.regional_distribution;
            if (!d || !d.length) return { name: '—', value: 0 };
            return d.reduce((a, b) => b.value > a.value ? b : a, d[0]);
        });
        const topTopic = computed(() => {
            const d = result.value?.related_topics;
            if (!d || !d.length) return { name: '—', value: 0 };
            return d.reduce((a, b) => b.value > a.value ? b : a, d[0]);
        });

        // Split data_markdown into text segments interleaved with chart markers
        // Returns { before: string, trend: string, sentiment: string, source: string, region: string, topic: string, after: string }
        const analysisSegments = computed(() => {
            const empty = { before: '', trend: '', sentiment: '', source: '', region: '', topic: '', after: '' };
            if (!result.value) return empty;
            const raw = result.value.data_markdown || result.value.report_markdown || '';
            if (!raw.trim()) return empty;

            const chartOrder = ['TREND', 'SENTIMENT', 'SOURCE', 'REGION', 'TOPIC'];
            const segKeys = ['before', 'trend', 'sentiment', 'source', 'region', 'topic', 'after'];
            // Split by any [[CHART:XXX]] marker
            const parts = raw.split(/\[\[CHART:\s*[A-Za-z]+\s*\]\]/);
            // Extract marker order from the raw text
            const markers = [...raw.matchAll(/\[\[CHART:\s*([A-Za-z]+)\s*\]\]/g)].map(m => m[1].toUpperCase());

            const segs = { before: '', trend: '', sentiment: '', source: '', region: '', topic: '', after: '' };
            // First part is always "before"
            segs.before = (parts[0] || '').trim();
            // Assign subsequent parts to their corresponding chart key
            for (let i = 0; i < markers.length; i++) {
                const key = markers[i].toLowerCase();
                if (key in segs) {
                    segs[key] = (parts[i + 1] || '').trim();
                }
            }
            // If there are more parts than markers, append to after
            if (parts.length > markers.length + 1) {
                segs.after = parts.slice(markers.length + 1).join('\n').trim();
            }
            return segs;
        });

        // Keep analysisText for backward compat (PDF export etc)
        const analysisText = computed(() => {
            if (!result.value) return '';
            const raw = result.value.data_markdown || result.value.report_markdown || '';
            return raw.replace(/\[\[CHART:\s*[A-Za-z]+\s*\]\]/g, '').trim();
        });

        // 点击热搜词直接分析
        const applyHotTopic = (title) => {
            topic.value = title;
            analyze();
        };

        const fetchHotTopics = async () => {
            if (hotLoading.value) return;
            hotLoading.value = true; 
            try {
                const res = await fetch('/api/hot-topics');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!json.success) {
                    showToast('热搜加载失败，使用默认数据');
                    return;
                }
                const oldData = JSON.stringify(hotTopics.value);
                const newData = JSON.stringify(json.data);
                if (oldData === newData && hotTopics.value.length > 0) {
                    showToast('当前已是最新榜单，暂无更新');
                } else {
                    hotTopics.value = json.data;
                    showToast('热搜榜单已更新');
                }
            } catch (e) {
                console.error("热搜获取失败:", e);
                showToast('热搜刷新失败，请稍后重试');
            } finally {
                setTimeout(() => { hotLoading.value = false; }, 500);
            }
        };

        const exportPdf = async () => {
            const data = result.value;
            if (!data) { showToast('无报告数据'); return; }
            showToast('正在生成 PDF，请稍候…');

            // Make all sections visible so charts render
            const tempTab = activeTab.value;
            activeTab.value = 'all';
            await nextTick();
            initCharts(data);
            await new Promise(r => setTimeout(r, 800));

            try {
                // ── Switch charts to light theme for white-bg export ──
                const chartIds = ['trendChart', 'sentimentChart', 'sourceChart', 'regionChart', 'topicChart', 'visualWordCloud', 'visualEmotionPie'];
                const savedOptions = {};
                for (const id of chartIds) {
                    const el = document.getElementById(id);
                    if (!el) continue;
                    const inst = echarts.getInstanceByDom(el);
                    if (!inst) continue;
                    savedOptions[id] = inst.getOption();
                    // Override to light-friendly colors
                    const lightOverride = {
                        textStyle: { color: '#333' },
                    };
                    // Fix axis colors for line/bar charts
                    const opt = inst.getOption();
                    if (opt.xAxis) {
                        lightOverride.xAxis = opt.xAxis.map(() => ({
                            axisLine: { lineStyle: { color: '#ccc' } },
                            axisLabel: { color: '#555' },
                            splitLine: { lineStyle: { color: '#eee' } },
                        }));
                    }
                    if (opt.yAxis) {
                        lightOverride.yAxis = opt.yAxis.map(() => ({
                            axisLine: { lineStyle: { color: '#ccc' } },
                            axisLabel: { color: '#555' },
                            splitLine: { lineStyle: { color: '#f0f0f0' } },
                        }));
                    }
                    // Fix series border colors
                    if (opt.series) {
                        lightOverride.series = opt.series.map(s => {
                            const patch = {};
                            if (s.type === 'pie') {
                                patch.itemStyle = { borderColor: '#ffffff', borderWidth: 2 };
                                patch.label = { color: '#333' };
                            }
                            if (s.type === 'bar') {
                                patch.itemStyle = { borderColor: '#ffffff' };
                            }
                            return patch;
                        });
                    }
                    if (opt.legend) {
                        lightOverride.legend = opt.legend.map(() => ({ textStyle: { color: '#555' } }));
                    }
                    inst.setOption(lightOverride);
                }

                // ── Build print-friendly HTML container ──
                const container = document.createElement('div');
                container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;color:#222;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans SC","Microsoft YaHei",sans-serif;font-size:13px;line-height:1.7;padding:48px;box-sizing:border-box;';
                document.body.appendChild(container);

                const escHtml = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                const stripMd = (md) => escHtml(md)
                    .replace(/#{1,6}\s*/g, '')
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '$1')
                    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
                    .replace(/\n/g, '<br>');

                // Title
                let html = `<div style="text-align:center;margin-bottom:24px;">
                    <h1 style="font-size:24px;font-weight:700;color:#111;margin:0 0 8px;">${escHtml(topic.value) || '舆情分析报告'}</h1>
                    <p style="font-size:12px;color:#888;">${new Date().toLocaleString('zh-CN')}</p>
                    <hr style="border:none;border-top:1px solid #ddd;margin-top:16px;">
                </div>`;

                // 1. Overview
                html += `<h2 style="font-size:16px;color:#222;border-bottom:2px solid #6E6BFF;padding-bottom:4px;margin:20px 0 12px;">一、总览</h2>`;
                html += `<p>舆情健康度：<b>${data.sentiment_score ?? '—'}</b>/100 &nbsp;&nbsp; 情绪标签：<b>${data.sentiment_label ?? '—'}</b> &nbsp;&nbsp; 热度指数：<b>${data.popularity_score ?? '—'}</b>/100</p>`;
                if (data.keywords && data.keywords.length) {
                    html += `<p style="color:#555;">关键词：${data.keywords.join('、')}</p>`;
                }
                if (data.sentiment_distribution && data.sentiment_distribution.length) {
                    html += `<p style="color:#555;">情绪分布：${data.sentiment_distribution.map(d => d.name + ' ' + d.value + '%').join(' | ')}</p>`;
                }

                // 2. Background
                if (data.intro_markdown) {
                    html += `<h2 style="font-size:16px;color:#222;border-bottom:2px solid #6E6BFF;padding-bottom:4px;margin:24px 0 12px;">二、事件溯源</h2>`;
                    html += `<div style="color:#444;">${stripMd(data.intro_markdown)}</div>`;
                }

                // 3. Data Analysis + Charts (interspersed with text)
                html += `<h2 style="font-size:16px;color:#222;border-bottom:2px solid #6E6BFF;padding-bottom:4px;margin:24px 0 12px;">三、数据分析</h2>`;
                
                const rawAnalysis = data.data_markdown || data.report_markdown || '';
                const chartOrder = ['TREND', 'SENTIMENT', 'SOURCE', 'REGION', 'TOPIC'];
                const parts = rawAnalysis.split(/\[\[CHART:\s*[A-Za-z]+\s*\]\]/);
                const markers = [...rawAnalysis.matchAll(/\[\[CHART:\s*([A-Za-z]+)\s*\]\]/g)].map(m => m[1].toUpperCase());

                // Before-charts text
                if (parts[0] && parts[0].trim()) {
                    html += `<div style="color:#444;margin-bottom:16px;">${stripMd(parts[0])}</div>`;
                }

                const chartTitleMap = { TREND: '热度趋势', SENTIMENT: '情感分布', SOURCE: '媒体来源分布', REGION: '地域分布', TOPIC: '关联话题' };
                const chartIdMap = { TREND: 'trendChart', SENTIMENT: 'sentimentChart', SOURCE: 'sourceChart', REGION: 'regionChart', TOPIC: 'topicChart' };

                for (let i = 0; i < markers.length; i++) {
                    const mk = markers[i];
                    const cId = chartIdMap[mk];
                    if (cId) {
                        html += `<h3 style="font-size:14px;color:#444;margin:16px 0 8px;">▎${chartTitleMap[mk] || mk}</h3>`;
                        html += `<div id="pdf-placeholder-${cId}" style="text-align:center;margin:8px 0 16px;"></div>`;
                    }
                    // Text after this chart marker
                    if (parts[i + 1] && parts[i + 1].trim()) {
                        html += `<div style="color:#444;margin-bottom:12px;">${stripMd(parts[i + 1])}</div>`;
                    }
                }

                // Any charts not referenced by markers
                const unreferenced = Object.keys(chartIdMap).filter(k => !markers.includes(k));
                for (const mk of unreferenced) {
                    const cId = chartIdMap[mk];
                    const el = document.getElementById(cId);
                    if (el && el.offsetHeight > 0) {
                        html += `<h3 style="font-size:14px;color:#444;margin:16px 0 8px;">▎${chartTitleMap[mk]}</h3>`;
                        html += `<div id="pdf-placeholder-${cId}" style="text-align:center;margin:8px 0 16px;"></div>`;
                    }
                }

                // Visual charts
                if (data.multimodal) {
                    for (const vid of ['visualWordCloud', 'visualEmotionPie']) {
                        const el = document.getElementById(vid);
                        if (el && el.offsetHeight > 0) {
                            html += `<div id="pdf-placeholder-${vid}" style="text-align:center;margin:8px 0 16px;"></div>`;
                        }
                    }
                }

                // 4. Conclusion
                if (data.conclusion_markdown) {
                    html += `<h2 style="font-size:16px;color:#222;border-bottom:2px solid #6E6BFF;padding-bottom:4px;margin:24px 0 12px;">四、战略研判</h2>`;
                    html += `<div style="color:#444;">${stripMd(data.conclusion_markdown)}</div>`;
                }

                container.innerHTML = html;

                // ── Insert chart images into placeholders ──
                const allChartIds = [...Object.values(chartIdMap), 'visualWordCloud', 'visualEmotionPie'];
                for (const cId of allChartIds) {
                    const el = document.getElementById(cId);
                    const placeholder = container.querySelector(`#pdf-placeholder-${cId}`);
                    if (!el || !placeholder || el.offsetHeight === 0) continue;
                    const chartCanvas = await html2canvas(el, {
                        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
                    });
                    const img = document.createElement('img');
                    img.src = chartCanvas.toDataURL('image/png');
                    img.style.cssText = 'max-width:100%;height:auto;';
                    placeholder.appendChild(img);
                }

                await new Promise(r => setTimeout(r, 200));

                // ── Render container to PDF via html2canvas pages ──
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
                const pageW = pdf.internal.pageSize.getWidth();
                const pageH = pdf.internal.pageSize.getHeight();

                const fullCanvas = await html2canvas(container, {
                    scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
                    width: 794,
                });

                const canvasW = fullCanvas.width;
                const canvasH = fullCanvas.height;
                const ratio = pageW / canvasW;
                const scaledH = canvasH * ratio;
                const pageContentH = pageH - 36; // leave bottom margin for page number
                const totalPages = Math.ceil(scaledH / pageContentH);

                for (let p = 0; p < totalPages; p++) {
                    if (p > 0) pdf.addPage();
                    // Clip the appropriate section of the full canvas
                    const srcY = Math.round(p * pageContentH / ratio);
                    const srcH = Math.round(Math.min(pageContentH / ratio, canvasH - srcY));
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = canvasW;
                    pageCanvas.height = srcH;
                    const pctx = pageCanvas.getContext('2d');
                    pctx.drawImage(fullCanvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);
                    pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, srcH * ratio);
                    // Page number
                    pdf.setFontSize(8);
                    pdf.setTextColor(160);
                    pdf.text(`${p + 1} / ${totalPages}`, pageW / 2, pageH - 12, { align: 'center' });
                }

                document.body.removeChild(container);

                // ── Restore chart dark theme ──
                for (const id of chartIds) {
                    const el = document.getElementById(id);
                    if (!el) continue;
                    const inst = echarts.getInstanceByDom(el);
                    if (!inst || !savedOptions[id]) continue;
                    inst.setOption(savedOptions[id], true);
                }

                pdf.save(`舆情分析报告_${topic.value || 'report'}_${new Date().toISOString().slice(0, 10)}.pdf`);
                showToast('PDF 导出成功');
            } catch (e) {
                console.error('PDF export error:', e);
                showToast('导出失败: ' + e.message);
                // Clean up container if still present
                const leftover = document.querySelector('div[style*="left:-9999px"]');
                if (leftover) document.body.removeChild(leftover);
            }

            // Restore charts to dark theme
            const restoreIds = ['trendChart', 'sentimentChart', 'sourceChart', 'regionChart', 'topicChart', 'visualWordCloud', 'visualEmotionPie'];
            for (const id of restoreIds) {
                const el = document.getElementById(id);
                if (!el) continue;
                const inst = echarts.getInstanceByDom(el);
                if (inst) inst.dispose();
            }
            activeTab.value = tempTab;
            await nextTick();
            initCharts(data);
        };

        const getScoreColor = (score) => {
            if (score >= 70) return 'text-emerald-400';
            if (score >= 40) return 'text-yellow-400';
            return 'text-rose-400';
        };

        const chartInstances = [];

        const initCharts = (data, retryCount = 0) => {
            if (retryCount === 0) {
                chartInstances.forEach(c => c.dispose());
                chartInstances.length = 0;
            }
            if (!data) return;

            const chartsConfig = [
                { key: 'trend_data', id: 'trendChart', init: () => initTrendChart(data.trend_data || [], data.forecast_data || []) },
                { key: 'sentiment_distribution', id: 'sentimentChart', init: () => initSentimentChart(data.sentiment_distribution || []) },
                { key: 'source_distribution', id: 'sourceChart', init: () => initSourceChart(data.source_distribution || []) },
                { key: 'regional_distribution', id: 'regionChart', init: () => initRegionChart(data.regional_distribution || []) },
                { key: 'related_topics', id: 'topicChart', init: () => initTopicChart(data.related_topics || []) },
                // 新增 Visual Charts
                { key: 'multimodal', id: 'visualWordCloud', init: () => initVisualWordCloud() },
                { key: 'multimodal', id: 'visualEmotionPie', init: () => initVisualEmotionPie() }
            ];

            let missingDOM = false;
            chartsConfig.forEach(cfg => {
                // 特殊处理 multimodal: 只要 result.multimodal 为 true，就尝试渲染
                let shouldRender = false;
                if (cfg.key === 'multimodal') {
                    shouldRender = data.multimodal === true;
                } else {
                    shouldRender = data[cfg.key] && Array.isArray(data[cfg.key]) && data[cfg.key].length > 0;
                }
                
                if (shouldRender) {
                    const el = document.getElementById(cfg.id);
                    if (el) {
                        const existingInstance = echarts.getInstanceByDom(el);
                        if (!existingInstance) {
                            cfg.init();
                        }
                    } else {
                        missingDOM = true;
                    }
                }
            });

            if (missingDOM && retryCount < 3) {
                setTimeout(() => initCharts(data, retryCount + 1), 200);
            }
        };

        // ─── Shared Chart Utilities ───────────────────────────────────
        const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Noto Sans SC', sans-serif";
        const C = {
            // Frosted-glass palette — muted jewel tones on dark
            accent:   '#6E6BFF',   // Periwinkle
            accent2:  '#8B89FF',   // Lighter periwinkle
            accent3:  '#ABA9FF',   // Pale periwinkle
            violet:   '#A78BFA',   // Soft violet
            cyan:     '#67D4E8',   // Frosted cyan
            cyan2:    '#94E2F2',   // Pale cyan
            teal:     '#5ECEBD',   // Mint glass
            positive: '#4ADE80',   // Bright jade
            warning:  '#FACC15',   // Lemon
            negative: '#F87171',   // Soft red
            rose:     '#F472B6',   // Pink glass
            amber:    '#FB923C',   // Tangerine
            t1:        '#f5f5f7',
            t2:        '#a1a1a6',
            t3:        '#86868b',
            t4:        '#58585e',
            dim:       '#3a3a3c',
            bg:        '#0c0c0e',
            bgCard:    '#161618',
            bgElevated:'#1e1e22',
            split:     'rgba(255,255,255,0.04)',
            splitLt:   'rgba(255,255,255,0.025)',
            border:    'rgba(255,255,255,0.07)',
        };

        const mkTooltip = (extra = {}) => ({
            backgroundColor: 'rgba(12,12,16,0.58)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: [10, 14],
            textStyle: { color: C.t1, fontSize: 12, fontFamily: FONT, lineHeight: 20 },
            extraCssText: 'border-radius:20px;backdrop-filter:blur(6px) saturate(116%);-webkit-backdrop-filter:blur(6px) saturate(116%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 8px 24px rgba(0,0,0,0.20);',
            ...extra,
        });

        const tipDot = (color) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>`;
        const tipSquare = (color) => `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};flex-shrink:0;"></span>`;

        const commonOption = {
            backgroundColor: 'transparent',
            textStyle: { fontFamily: FONT, color: C.t2 },
            animationDuration: 900,
            animationEasing: 'cubicOut',
            animationDelay: idx => idx * 30,
        };

        // ─── Trend ────────────────────────────────────────────────────
        const initTrendChart = (historyData, forecastData) => {
            const safeForecast = forecastData || [];
            const chart = echarts.init(document.getElementById('trendChart'));
            chartInstances.push(chart);

            const historyDates  = historyData.map(i => i.date);
            const forecastDates = safeForecast.map(i => i.date);
            const allDates      = [...historyDates, ...forecastDates];
            const historyScores = historyData.map(i => i.score);
            const gap           = new Array(historyScores.length - 1).fill(null);
            const lastScore     = historyScores[historyScores.length - 1];
            const forecastScores = [...gap, lastScore, ...safeForecast.map(i => i.score)];
            const maxVal = Math.max(...historyScores, ...safeForecast.map(i => i.score || 0));
            const minVal = Math.min(...historyScores, ...safeForecast.map(i => i.score || 99));

            chart.setOption({
                ...commonOption,
                grid: { top: 44, bottom: 32, left: 12, right: 16, containLabel: true },
                tooltip: {
                    ...mkTooltip({ trigger: 'axis' }),
                    formatter: params => {
                        const p = params.filter(p => p.value != null);
                        if (!p.length) return '';
                        let s = `<div style="font-size:11px;color:${C.t3};margin-bottom:6px;letter-spacing:.04em;">${p[0].axisValue}</div>`;
                        p.forEach(item => {
                            s += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
                                    ${tipDot(item.color)}
                                    <span style="color:${C.t2}">${item.seriesName}</span>
                                    <span style="margin-left:auto;font-weight:600;color:${C.t1};font-variant-numeric:tabular-nums;padding-left:16px;">${item.value}</span>
                                  </div>`;
                        });
                        return s;
                    },
                    axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,0.06)', width: 1 } },
                },
                legend: {
                    data: ['历史热度', '趋势预测'], top: 0, left: 0,
                    textStyle: { color: C.t3, fontSize: 11, fontFamily: FONT },
                    icon: 'circle', itemWidth: 7, itemHeight: 7, itemGap: 18,
                    selectedMode: false,
                },
                xAxis: {
                    type: 'category', data: allDates, boundaryGap: false,
                    axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
                    axisLabel: { color: C.t4, fontSize: 11, fontFamily: FONT, margin: 10,
                                 formatter: v => v.length > 5 ? v.slice(5) : v },
                    axisTick:  { show: false },
                    splitLine: { show: false },
                },
                yAxis: {
                    type: 'value',
                    min: Math.max(0, Math.floor(minVal * 0.88)),
                    max: Math.ceil(maxVal * 1.06),
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' } },
                    axisLine:  { show: false },
                    axisLabel: { color: C.t4, fontSize: 11, fontFamily: FONT,
                                 formatter: v => v >= 10000 ? (v/10000).toFixed(1) + 'w' : v },
                    axisTick:  { show: false },
                },
                series: [
                    {
                        name: '历史热度', type: 'line',
                        data: [...historyScores, ...new Array(forecastDates.length).fill(null)],
                        smooth: 0.4, symbol: 'circle', symbolSize: 5, showSymbol: false,
                        itemStyle: { color: C.cyan, borderColor: 'rgba(10,10,14,0.8)', borderWidth: 2 },
                        lineStyle: { width: 2.5, color: C.cyan, cap: 'round' },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(103,212,232,0.14)' },
                                { offset: 0.5, color: 'rgba(103,212,232,0.04)' },
                                { offset: 1, color: 'rgba(103,212,232,0)' },
                            ])
                        },
                        emphasis: { focus: 'series', itemStyle: { borderWidth: 2 } },
                        markArea: safeForecast.length > 0 ? {
                            silent: true,
                            itemStyle: { color: 'rgba(251,146,60,0.04)' },
                            data: [[
                                { xAxis: historyDates[historyDates.length - 1] || '' },
                                { xAxis: forecastDates[forecastDates.length - 1] || '' },
                            ]],
                        } : undefined,
                        markLine: safeForecast.length > 0 ? {
                            silent: true, symbol: ['none', 'none'],
                            lineStyle: { color: 'rgba(251,146,60,0.28)', type: [5, 4], width: 1 },
                            label: {
                                show: true, position: 'end',
                                formatter: 'AI 预测',
                                color: C.amber, fontSize: 10, fontFamily: FONT,
                                padding: [3, 7], backgroundColor: 'rgba(251,146,60,0.1)',
                                borderRadius: 4,
                            },
                            data: [{ xAxis: historyDates[historyDates.length - 1] }],
                        } : undefined,
                    },
                    {
                        name: '趋势预测', type: 'line',
                        data: forecastScores,
                        smooth: 0.4, symbol: 'emptyCircle', symbolSize: 4, showSymbol: false,
                        lineStyle: { width: 2, type: [6, 4], color: C.amber, cap: 'round' },
                        itemStyle: { color: C.amber },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(251,146,60,0.10)' },
                                { offset: 0.5, color: 'rgba(251,146,60,0.03)' },
                                { offset: 1, color: 'rgba(251,146,60,0)' },
                            ])
                        },
                    },
                ],
            });
        };

        // ─── Sentiment Donut ──────────────────────────────────────────
        const initSentimentChart = (data) => {
            const chart = echarts.init(document.getElementById('sentimentChart'));
            chartInstances.push(chart);

            const colorMap = { '正面': C.positive, '中立': C.warning, '负面': C.negative };
            const sorted   = [...data].sort((a, b) => b.value - a.value);
            const dominant = sorted[0] || { name: '—', value: 0 };
            const domColor = colorMap[dominant.name] || C.accent;

            chart.setOption({
                ...commonOption,
                tooltip: {
                    ...mkTooltip(),
                    formatter: p => {
                        const c = colorMap[p.name] || C.accent;
                        return `<div style="display:flex;align-items:center;gap:8px;">
                                  ${tipDot(c)}
                                  <span style="color:${C.t2}">${p.name}</span>
                                  <span style="margin-left:12px;font-weight:600;color:${C.t1};font-variant-numeric:tabular-nums;">${p.value}%</span>
                                </div>`;
                    },
                },
                legend: {
                    bottom: 8, left: 'center',
                    orient: 'horizontal', itemGap: 24,
                    selectedMode: false,
                    textStyle: {
                        color: C.t2, fontSize: 12, fontFamily: FONT,
                        rich: {
                            name: { color: C.t3, fontSize: 12, fontFamily: FONT },
                            val:  { color: C.t1, fontSize: 13, fontWeight: 600, fontFamily: FONT },
                        },
                    },
                    icon: 'circle', itemWidth: 8, itemHeight: 8,
                    formatter: name => {
                        const d = data.find(i => i.name === name);
                        return d ? `{name|${name}}  {val|${d.value}%}` : name;
                    },
                },
                graphic: [{
                    type: 'group', left: 'center', top: 'middle',
                    children: [
                        {
                            type: 'text',
                            style: {
                                text: dominant.value + '%',
                                fill: domColor,
                                fontSize: 28, fontWeight: 700, fontFamily: FONT,
                                x: 0, y: -16, textAlign: 'center',
                                fontVariantNumeric: 'tabular-nums',
                            },
                        },
                        {
                            type: 'text',
                            style: {
                                text: dominant.name || '—',
                                fill: C.t3,
                                fontSize: 12, fontFamily: FONT,
                                x: 0, y: 16, textAlign: 'center',
                            },
                        },
                    ],
                }],
                series: [{
                    type: 'pie',
                    radius: ['52%', '74%'],
                    center: ['50%', '48%'],
                    itemStyle: { borderRadius: 6, borderColor: 'rgba(10,10,14,0.8)', borderWidth: 3 },
                    label: { show: false },
                    labelLine: { show: false },
                    selectedMode: false,
                    emphasis: { scale: true, scaleSize: 4 },
                    animationType: 'scale',
                    animationEasing: 'cubicOut',
                    data: data.map(item => ({
                        value: item.value, name: item.name,
                        itemStyle: { color: colorMap[item.name] || C.dim },
                    })),
                }],
            });
        };

        // ─── Source Donut ─────────────────────────────────────────────
        const initSourceChart = (data) => {
            const chart = echarts.init(document.getElementById('sourceChart'));
            chartInstances.push(chart);

            const palette = [C.accent, C.cyan, C.violet, C.teal, C.positive, C.amber, C.rose, C.accent3];
            const sorted  = [...data].sort((a, b) => b.value - a.value);

            chart.setOption({
                ...commonOption,
                tooltip: {
                    ...mkTooltip(),
                    formatter: p => {
                        const idx = sorted.findIndex(i => i.name === p.name);
                        const c = palette[idx % palette.length];
                        return `<div style="display:flex;align-items:center;gap:8px;">
                                  ${tipDot(c)}
                                  <span style="color:${C.t2}">${p.name}</span>
                                  <span style="margin-left:12px;font-weight:600;color:${C.t1};">${p.percent?.toFixed(1) ?? p.value}%</span>
                                </div>`;
                    },
                },
                legend: {
                    type: 'scroll', bottom: 4, left: 'center',
                    orient: 'horizontal', itemGap: 14,
                    selectedMode: false,
                    textStyle: { color: C.t2, fontSize: 11, fontFamily: FONT },
                    icon: 'circle', itemWidth: 7, itemHeight: 7,
                    pageIconColor: C.t3, pageTextStyle: { color: C.t3 },
                },
                series: [{
                    type: 'pie',
                    radius: ['40%', '66%'],
                    center: ['50%', '44%'],
                    itemStyle: { borderRadius: 6, borderColor: 'rgba(10,10,14,0.8)', borderWidth: 3 },
                    label: {
                        show: true, position: 'outside',
                        formatter: '{b}\n{d}%',
                        color: C.t3, fontSize: 11, fontFamily: FONT,
                        lineHeight: 16, fontWeight: 400,
                        minShowLabelAngle: 18,
                    },
                    labelLine: { length: 8, length2: 10, smooth: 0.3, lineStyle: { color: C.split } },
                    emphasis: {
                        scale: true, scaleSize: 4,
                        label: { fontSize: 12, fontWeight: 600, color: C.t1 },
                    },
                    data: sorted.map((item, i) => ({
                        value: item.value, name: item.name,
                        itemStyle: { color: palette[i % palette.length] },
                    })),
                }],
            });
        };

        // ─── Region Bar ──────────────────────────────────────────────
        const initRegionChart = (data) => {
            const chart = echarts.init(document.getElementById('regionChart'));
            chartInstances.push(chart);

            const sorted = [...data].sort((a, b) => a.value - b.value);
            const n = sorted.length;
            const maxV = sorted.length ? sorted[n - 1].value : 1;

            chart.setOption({
                ...commonOption,
                grid: { top: 8, bottom: 8, left: 8, right: 56, containLabel: true },
                tooltip: {
                    ...mkTooltip({ trigger: 'axis' }),
                    formatter: params => {
                        const p = params[0];
                        return `<div style="display:flex;align-items:center;gap:8px;">
                                  ${tipSquare(C.accent)}
                                  <span style="color:${C.t2}">${p.name}</span>
                                  <span style="margin-left:12px;font-weight:600;color:${C.t1};font-variant-numeric:tabular-nums;">${p.value}</span>
                                </div>`;
                    },
                    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.02)' } },
                },
                xAxis: { type: 'value', show: false, max: value => Math.ceil(value.max * 1.2) },
                yAxis: {
                    type: 'category', data: sorted.map(i => i.name),
                    axisLine: { show: false }, axisTick: { show: false },
                    axisLabel: { color: C.t2, fontSize: 12, fontFamily: FONT, margin: 10 },
                },
                series: [{
                    type: 'bar',
                    data: sorted.map((item, i) => {
                        const ratio = maxV > 0 ? item.value / maxV : 0;
                        const alpha = 0.3 + ratio * 0.7;
                        return {
                            value: item.value,
                            itemStyle: {
                                borderRadius: [0, 6, 6, 0],
                                color: `rgba(110,107,255,${alpha.toFixed(2)})`,
                            },
                        };
                    }),
                    barMaxWidth: 16,
                    animationDelay: idx => idx * 50,
                    label: {
                        show: true, position: 'right', distance: 8,
                        color: C.t3, fontSize: 11, fontFamily: FONT,
                        fontVariantNumeric: 'tabular-nums',
                    },
                    emphasis: {
                        itemStyle: { color: C.accent },
                    },
                }],
            });
        };

        // ─── Topic Bar ───────────────────────────────────────────────
        const initTopicChart = (data) => {
            const chart = echarts.init(document.getElementById('topicChart'));
            chartInstances.push(chart);

            const sorted = [...data].sort((a, b) => a.value - b.value);
            const n = sorted.length;
            const maxV = sorted.length ? sorted[n - 1].value : 1;

            chart.setOption({
                ...commonOption,
                grid: { top: 8, bottom: 8, left: 8, right: 56, containLabel: true },
                tooltip: {
                    ...mkTooltip({ trigger: 'axis' }),
                    formatter: params => {
                        const p = params[0];
                        return `<div style="display:flex;align-items:center;gap:8px;">
                                  ${tipSquare(C.violet)}
                                  <span style="color:${C.t2};max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</span>
                                  <span style="margin-left:12px;font-weight:600;color:${C.t1};font-variant-numeric:tabular-nums;">${p.value}</span>
                                </div>`;
                    },
                    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.02)' } },
                },
                xAxis: { type: 'value', show: false, max: value => Math.ceil(value.max * 1.2) },
                yAxis: {
                    type: 'category', data: sorted.map(i => i.name),
                    axisLine: { show: false }, axisTick: { show: false },
                    axisLabel: { color: C.t2, fontSize: 12, fontFamily: FONT, margin: 10,
                                 width: 110, overflow: 'truncate' },
                },
                series: [{
                    type: 'bar',
                    data: sorted.map((item, i) => {
                        const ratio = maxV > 0 ? item.value / maxV : 0;
                        const alpha = 0.3 + ratio * 0.7;
                        return {
                            value: item.value,
                            itemStyle: {
                                borderRadius: [0, 6, 6, 0],
                                color: `rgba(167,139,250,${alpha.toFixed(2)})`,
                            },
                        };
                    }),
                    barMaxWidth: 16,
                    animationDelay: idx => idx * 50,
                    label: {
                        show: true, position: 'right', distance: 8,
                        color: C.t3, fontSize: 11, fontFamily: FONT,
                        fontVariantNumeric: 'tabular-nums',
                    },
                    emphasis: {
                        itemStyle: { color: C.violet },
                    },
                }],
            });
        };

        // ─── Visual Word Cloud ────────────────────────────────────────
        const initVisualWordCloud = () => {
            const chart = echarts.init(document.getElementById('visualWordCloud'));
            chartInstances.push(chart);

            const entities = result.value.visual_analysis?.entities || [];
            const palette  = [C.accent2, C.cyan, C.violet, C.teal, C.positive, C.amber, C.rose, C.accent3, C.cyan2, C.accent];
            const wdata = entities.map((name, i) => ({
                name,
                value: Math.round(100 - i * (65 / Math.max(entities.length, 1))),
                textStyle: { color: palette[i % palette.length], fontFamily: FONT },
            }));

            chart.setOption({
                ...commonOption,
                tooltip: {
                    ...mkTooltip(),
                    formatter: p => `<span style="color:${C.t1};font-weight:600;">${p.name}</span>`,
                },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    left: 'center', top: 'center',
                    width: '90%', height: '90%',
                    sizeRange: [13, 46],
                    rotationRange: [-15, 15],
                    rotationStep: 15,
                    gridSize: 14,
                    drawOutOfBound: false,
                    layoutAnimation: true,
                    textStyle: { fontFamily: FONT, fontWeight: 600 },
                    emphasis: { focus: 'self', textStyle: { color: C.t1 } },
                    data: wdata,
                }],
            });
        };

        // ─── Visual Emotion Pie ───────────────────────────────────────
        const initVisualEmotionPie = () => {
            const chart = echarts.init(document.getElementById('visualEmotionPie'));
            chartInstances.push(chart);

            const em      = result.value.visual_analysis?.emotion || 'neutral';
            const conf    = result.value.visual_analysis?.confidence || 0.8;
            const colorMap = { positive: C.positive, neutral: C.warning, negative: C.negative };
            const labelMap = { positive: '正面', neutral: '中立', negative: '负面' };
            const emColor  = colorMap[em] || C.accent;
            const confPct  = Math.round(conf * 100);

            chart.setOption({
                ...commonOption,
                tooltip: {
                    ...mkTooltip(),
                    formatter: p => p.name === '其他' ? '' :
                        `<span style="color:${emColor};font-weight:600;">${labelMap[em]}</span><span style="color:${C.t2};margin-left:8px;">置信度 ${confPct}%</span>`,
                },
                graphic: [{
                    type: 'group', left: 'center', top: 'middle',
                    children: [
                        {
                            type: 'text',
                            style: {
                                text: confPct + '%', fill: emColor,
                                fontSize: 26, fontWeight: 700, fontFamily: FONT,
                                x: 0, y: -14, textAlign: 'center',
                                fontVariantNumeric: 'tabular-nums',
                            },
                        },
                        {
                            type: 'text',
                            style: {
                                text: labelMap[em] || em, fill: C.t3,
                                fontSize: 12, fontFamily: FONT,
                                x: 0, y: 14, textAlign: 'center',
                            },
                        },
                    ],
                }],
                series: [{
                    type: 'pie',
                    radius: ['54%', '74%'],
                    center: ['50%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: { borderRadius: 6, borderColor: 'rgba(10,10,14,0.8)', borderWidth: 3 },
                    label: { show: false },
                    labelLine: { show: false },
                    selectedMode: false,
                    emphasis: { scale: true, scaleSize: 4 },
                    animationType: 'scale',
                    animationEasing: 'cubicOut',
                    data: [
                        {
                            value: conf, name: labelMap[em] || em,
                            itemStyle: { color: emColor },
                        },
                        {
                            value: 1 - conf, name: '其他',
                            itemStyle: { color: 'rgba(255,255,255,0.04)' },
                            emphasis: { itemStyle: { color: 'rgba(255,255,255,0.06)' } },
                        },
                    ],
                }],
            });
        };

        window.addEventListener('resize', () => chartInstances.forEach(c => c.resize()));

        watch(activeTab, (newVal) => {
            if (newVal === 'analysis' || newVal === 'all') {
                nextTick(() => {
                    initCharts(result.value);
                });
            }
        });


        return {
            topic,
            loading,
            result,
            analyze,
            hotTopics,
            applyHotTopic,
            dataSegments: computed(() => []),
            analysisText,
            analysisSegments,
            latestTrendScore,
            trendDirection,
            dominantSentiment,
            topSource,
            topRegion,
            topTopic,
            mdParser,
            getScoreColor,
            reportRef,
            toastMsg,
            exportPdf,
            loadingProgress,
            loadingMsg,
            clearHistory,
            hotLoading,
            fetchHotTopics,
            historyList,
            showHistory,
            loadHistory,
            deleteHistory,
            // New Report State
            reportMode,
            activeTab,
            sectionStatus,
            closeReport,
            openReport,
            tabClass,
            sectionProgress,
            // New exports
            uploadFiles,
            dragOver,
            handleDrop,
            handleFileSelect,
            removeFile,
            formatSize,
            isVideo
        };
    }
});

// 注册 ChatPanel 组件
app.component('chat-panel', ChatPanel);
app.mount('#app');
