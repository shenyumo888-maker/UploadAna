// app.js 专门处理 Vue + ECharts
const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

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
        const uploadFile = ref(null);
        const uploadProgress = ref(0);
        const uploadStatus = ref(''); // uploading, processing, completed, error
        const dragOver = ref(false);
        const fileId = ref(null);
        const taskId = ref(null);
        const visualResult = ref(null);

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
            const files = e.dataTransfer.files;
            if (files.length > 0) processFile(files[0]);
        };

        const handleFileSelect = (e) => {
            if (e.target.files.length > 0) processFile(e.target.files[0]);
        };

        const processFile = (file) => {
            // 校验格式
            const validExts = ['mp4', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'webp'];
            const ext = file.name.split('.').pop().toLowerCase();
            if (!validExts.includes(ext)) {
                showToast('不支持的文件格式');
                return;
            }

            // 校验大小
            const isVideo = ['mp4', 'mov', 'avi'].includes(ext);
            const limit = isVideo ? 200 * 1024 * 1024 : 20 * 1024 * 1024;
            if (file.size > limit) {
                showToast(`文件过大 (最大限制: ${isVideo ? '200MB' : '20MB'})`);
                return;
            }

            uploadFile.value = file;
            uploadProgress.value = 0;
            uploadStatus.value = '';
            visualResult.value = null; // 重置结果
            
            // 自动开始上传
            startUpload();
        };

        const removeFile = () => {
            uploadFile.value = null;
            uploadProgress.value = 0;
            uploadStatus.value = '';
            fileId.value = null;
            taskId.value = null;
            visualResult.value = null;
            // 如果 input 还有值，清空
            // 注意：Vue refs 在这里可能需要处理
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

        const startUpload = () => {
            if (!uploadFile.value) return;

            uploadStatus.value = 'uploading';
            const formData = new FormData();
            formData.append('file', uploadFile.value);

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    uploadProgress.value = percent;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const res = JSON.parse(xhr.responseText);
                    fileId.value = res.file_id;
                    taskId.value = res.task_id;
                    uploadStatus.value = 'processing';
                    showToast('文件上传成功，开始后台分析');
                    
                    // 开始轮询任务状态
                    pollTaskStatus();
                } else {
                    uploadStatus.value = 'error';
                    showToast('上传失败');
                }
            });

            xhr.addEventListener('error', () => {
                uploadStatus.value = 'error';
                showToast('网络错误');
            });

            xhr.open('POST', '/api/multimodal/upload');
            xhr.send(formData);
        };

        const pollTaskStatus = async () => {
            if (!fileId.value) return;

            const check = async () => {
                try {
                    const res = await fetch(`/api/multimodal/status/${fileId.value}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'completed') {
                            uploadStatus.value = 'completed';
                            visualResult.value = JSON.parse(data.result); // 解析内部 JSON
                            showToast('视觉分析完成！');
                            
                            // 如果此时已有文本分析结果，尝试融合
                            if (result.value) {
                                mergeVisualResult();
                            }
                        } else if (data.status === 'failed') {
                            uploadStatus.value = 'error';
                            showToast(`视觉分析失败: ${data.error}`);
                        } else {
                            // 继续轮询
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
            if (!result.value || !visualResult.value) return;
            if (result.value.multimodal) return; // 避免重复融合

            const vr = visualResult.value;
            
            // 1. 重新计算分数
            const textScore = result.value.sentiment_score;
            let visualScore = 50;
            if (vr.emotion === 'positive') visualScore = 90;
            else if (vr.emotion === 'negative') visualScore = 20;
            else visualScore = 50;

            const alpha = 0.7; // 文本权重
            const beta = 0.3;  // 视觉权重
            const newScore = Math.round(textScore * alpha + visualScore * beta);
            
            result.value.sentiment_score = newScore;
            // 更新 label
            if (newScore >= 70) result.value.sentiment_label = '正面 (综合)';
            else if (newScore >= 40) result.value.sentiment_label = '中立 (综合)';
            else result.value.sentiment_label = '负面 (综合)';

            // 标记为多模态
            result.value.multimodal = true;
            result.value.visual_analysis = vr; // 存储原始视觉分析结果
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
                    if (visualResult.value) mergeVisualResult();
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
                    if (visualResult.value) mergeVisualResult();
                    fetchHistory();
                    break;
            }
        };

        const analyze = async () => {
            if (!topic.value && !uploadFile.value) {
                showToast('请输入话题或上传文件');
                return;
            }
            
            loading.value = true;
            result.value = { report_markdown: '' };
            loadingProgress.value = 0;
            loadingMsg.value = '正在建立连接...';
            sectionStatus.value = { background: 'idle', analysis: 'idle', conclusion: 'idle' };
            sectionProgress.value = { background: 0, analysis: 0, conclusion: 0 };
            openReport();

            // 如果有文件但还没上传，先上传
            // 这里假设用户已经操作了文件选择，自动上传已经在 startUpload 里做了
            // 如果用户还在选文件，可能需要等待。为了简化，我们假设用户看到"分析完成"才点按钮，或者直接点按钮
            // 实际逻辑：如果有点话题，就跑文本分析；如果有文件，文件分析是后台跑的，前端只负责融合

            try {
                // Initialize result for streaming
                result.value = { report_markdown: '' };

                const formData = new FormData();
                // 如果有文件名，可以传给后端作为上下文
                const contextTopic = topic.value + (uploadFile.value ? ` (包含上传文件: ${uploadFile.value.name})` : '');
                formData.append('topic', contextTopic);
                
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


        // 解析 Markdown 并拆分为 [文字, 图表, 文字, 图表...] 的结构
        const dataSegments = computed(() => {
            if (!result.value || (!result.value.data_markdown && !result.value.report_markdown)) return [];

            const raw = result.value.data_markdown || result.value.report_markdown;
            const parts = raw.split(/\[\[CHART:\s*([A-Za-z]+)\s*\]\]/);

            const segments = [];
            const validCharts = ['TREND', 'SENTIMENT', 'SOURCE', 'REGION', 'TOPIC', 'VISUAL'];

            for (let i = 0; i < parts.length; i++) {
                if (i % 2 === 0) {
                    if (parts[i] && parts[i].trim().length > 0) {
                        segments.push({ type: 'text', content: parts[i] });
                    }
                } else {
                    const type = parts[i].toUpperCase();
                    if (validCharts.includes(type)) {
                        segments.push({ type: 'chart', chartType: type });
                    } else {
                        segments.push({ type: 'text', content: `[[CHART: ${parts[i]}]]` });
                    }
                }
            }
            return segments;
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
                const json = await res.json();
                if (json.success) {
                    const oldData = JSON.stringify(hotTopics.value);
                    const newData = JSON.stringify(json.data);
                    if (oldData === newData && hotTopics.value.length > 0) {
                        showToast('当前已是最新榜单，暂无更新 ✨');
                    } else {
                        hotTopics.value = json.data;
                        showToast('热搜榜单更新成功 🚀');
                    }
                }
            } catch (e) {
                console.error("热搜获取失败:", e);
            } finally {
                setTimeout(() => { hotLoading.value = false; }, 500);
            }
        };

        const exportPdf = async () => {
            const tempTab = activeTab.value;
            activeTab.value = 'all'; // 强制显示所有 Tab 供截图
            await nextTick();
            initCharts(result.value);
            await new Promise(r => setTimeout(r, 800));

            const scaleFactor = 0.85; 
            const canvas = await html2canvas(reportRef.value, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0f172a',
                windowWidth: reportRef.value.scrollWidth,
                windowHeight: reportRef.value.scrollHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const pdfWidth = reportRef.value.scrollWidth * scaleFactor;
            const pdfHeight = reportRef.value.scrollHeight * scaleFactor;
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            
            // 标记 multimodal
            if (result.value && result.value.multimodal) {
                pdf.setTextColor(150);
                pdf.setFontSize(10);
                pdf.text("multimodal: true", 20, 20);
            }
            
            pdf.save(`舆情分析报告_${Date.now()}.pdf`);
            activeTab.value = tempTab; // 恢复之前的 Tab
            await nextTick();
            initCharts(result.value);
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

        const commonOption = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item' },
            textStyle: { fontFamily: 'Inter, sans-serif' }
        };

        // ... (Keep existing chart functions: initTrendChart, initSentimentChart, etc.) ...
        const initTrendChart = (historyData, forecastData) => {
            const safeForecast = forecastData || [];
            const chart = echarts.init(document.getElementById('trendChart'));
            chartInstances.push(chart);
            const historyDates = historyData.map(i => i.date);
            const forecastDates = safeForecast.map(i => i.date);
            const allDates = [...historyDates, ...forecastDates];
            const historyScores = historyData.map(i => i.score);
            const gapData = new Array(historyScores.length - 1).fill(null);
            const lastHistoryScore = historyScores[historyScores.length - 1];
            const forecastScores = [...gapData, lastHistoryScore, ...safeForecast.map(i => i.score)];

            chart.setOption({
                ...commonOption,
                title: { text: '态势感知：历史走势与AI预测', left: 'center', top: '0%', textStyle: { color: '#94a3b8', fontSize: 14, fontWeight: 'normal' } },
                grid: { top: 50, bottom: 20, left: 40, right: 20, containLabel: true },
                tooltip: { trigger: 'axis' },
                legend: { data: ['历史热度', '趋势预测'], top: '25px', textStyle: { color: '#cbd5e1' } },
                xAxis: { type: 'category', data: allDates, boundaryGap: false, axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#94a3b8' } },
                yAxis: { type: 'value', splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }, axisLine: { show: false }, axisLabel: { color: '#94a3b8' } },
                series: [
                    { name: '历史热度', type: 'line', data: [...historyScores, ...new Array(forecastDates.length).fill(null)], smooth: true, symbol: 'circle', symbolSize: 8, itemStyle: { color: '#6366f1' }, lineStyle: { width: 3 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99, 102, 241, 0.4)' }, { offset: 1, color: 'rgba(99, 102, 241, 0)' }]) } },
                    { name: '趋势预测', type: 'line', data: forecastScores, smooth: true, symbol: 'emptyCircle', symbolSize: 6, itemStyle: { color: '#f43f5e' }, lineStyle: { width: 3, type: 'dashed' } }
                ]
            });
        };

        const initSentimentChart = (data) => {
            const chart = echarts.init(document.getElementById('sentimentChart'));
            chartInstances.push(chart);
            const colors = { '正面': '#10b981', '中立': '#f59e0b', '负面': '#ef4444' };
            chart.setOption({
                ...commonOption,
                series: [{ type: 'pie', radius: ['40%', '70%'], itemStyle: { borderRadius: 10, borderColor: '#1e293b', borderWidth: 2 }, label: { color: '#e2e8f0' }, data: data.map(item => ({ value: item.value, name: item.name, itemStyle: { color: colors[item.name] || '#94a3b8' } })) }]
            });
        };

        const initSourceChart = (data) => {
            const chart = echarts.init(document.getElementById('sourceChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                series: [{ type: 'pie', radius: [20, 100], center: ['50%', '50%'], roseType: 'area', itemStyle: { borderRadius: 8 }, label: { color: '#e2e8f0' }, data: data }]
            });
        };

        const initRegionChart = (data) => {
            const chart = echarts.init(document.getElementById('regionChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { top: 10, bottom: 20, left: 10, right: 30, containLabel: true },
                xAxis: { type: 'value', splitLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' } },
                yAxis: { type: 'category', data: data.map(i => i.name).reverse(), axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#e2e8f0' } },
                series: [{ type: 'bar', data: data.map(i => i.value).reverse(), itemStyle: { borderRadius: [0, 4, 4, 0], color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: '#38bdf8' }, { offset: 1, color: '#3b82f6' }]) } }]
            });
        };

        const initTopicChart = (data) => {
            const chart = echarts.init(document.getElementById('topicChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { top: 10, bottom: 20, left: 10, right: 30, containLabel: true },
                xAxis: { type: 'value', splitLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8' } },
                yAxis: { type: 'category', data: data.map(i => i.name).reverse(), axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#e2e8f0', width: 110, overflow: 'break' } },
                series: [{ type: 'bar', data: data.map(i => i.value).reverse(), itemStyle: { borderRadius: [0, 4, 4, 0], color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [{ offset: 0, color: '#a78bfa' }, { offset: 1, color: '#7c3aed' }]) } }]
            });
        };

        // === 新增 Visual Charts 实现 ===
        const initVisualWordCloud = () => {
            const chart = echarts.init(document.getElementById('visualWordCloud'));
            chartInstances.push(chart);
            
            const entities = visualResult.value.entities || [];
            // 简单转为词云数据，假设权重都为1，或者随机
            const data = entities.map(name => ({
                name,
                value: Math.floor(Math.random() * 100) + 20
            }));
            
            chart.setOption({
                ...commonOption,
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    left: 'center',
                    top: 'center',
                    width: '90%',
                    height: '90%',
                    right: null,
                    bottom: null,
                    sizeRange: [12, 60],
                    rotationRange: [-90, 90],
                    rotationStep: 45,
                    gridSize: 8,
                    drawOutOfBound: false,
                    textStyle: {
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        color: function () {
                            return 'rgb(' + [
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160)
                            ].join(',') + ')';
                        }
                    },
                    emphasis: {
                        focus: 'self',
                        textStyle: {
                            shadowBlur: 10,
                            shadowColor: '#333'
                        }
                    },
                    data: data
                }]
            });
        };

        const initVisualEmotionPie = () => {
            const chart = echarts.init(document.getElementById('visualEmotionPie'));
            chartInstances.push(chart);
            
            const em = visualResult.value.emotion; // positive, negative, neutral
            const conf = visualResult.value.confidence || 0.8;
            
            // 构造饼图数据：当前情绪 vs 其他
            const data = [];
            const colors = { 'positive': '#10b981', 'neutral': '#f59e0b', 'negative': '#ef4444' };
            const labels = { 'positive': '正面', 'neutral': '中立', 'negative': '负面' };
            
            data.push({ value: conf, name: labels[em] || em, itemStyle: { color: colors[em] || '#888' } });
            data.push({ value: 1 - conf, name: '其他可能性', itemStyle: { color: '#334155' } });
            
            chart.setOption({
                ...commonOption,
                series: [{
                    type: 'pie',
                    radius: ['50%', '70%'],
                    avoidLabelOverlap: false,
                    label: {
                        show: true,
                        position: 'center',
                        formatter: '{b}\n{d}%',
                        color: '#fff',
                        fontSize: 16
                    },
                    labelLine: { show: false },
                    data: data
                }]
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
            dataSegments,
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
            uploadFile,
            uploadProgress,
            uploadStatus,
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

