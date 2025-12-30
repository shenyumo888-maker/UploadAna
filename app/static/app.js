// app.js 专门处理 Vue + ECharts
const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
    setup() {
        const topic = ref('');
        const loading = ref(false);
        const result = ref(null);
        const hotTopics = ref([]);
        const mdParser = window.markdownit();
        const reportRef = ref(null);
        const hotLoading = ref(false); 
        const toastMsg = ref('');//提示框消息文字

        onMounted(() => {
            fetchHotTopics();
        });

        const showToast = (text) => {
            toastMsg.value = text;
            // 3秒后自动消失
            setTimeout(() => {
                toastMsg.value = '';
            }, 3000);
        };

        // 从后端python中抓取result
        const analyze = async () => {
            if (!topic.value) return;
            loading.value = true;
            result.value = null;

            try {
                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: topic.value })
                });
                const data = await res.json();
                result.value = data;

                await nextTick();
                initCharts(data);

            } catch (e) {
                console.error(e);
                alert('分析失败，请检查后端日志');
            } finally {
                loading.value = false;
            }
        };

        // 解析 Markdown 并拆分为 [文字, 图表, 文字, 图表...] 的结构
        const reportSegments = computed(() => {
            if (!result.value || !result.value.report_markdown) return [];

            const raw = result.value.report_markdown;
            // 正则匹配 [[CHART:XXX]]
            // Split 会保留捕获组，所以结果类似 ["Text...", "TREND", "Text...", "SENTIMENT", ...]
            const parts = raw.split(/\[\[CHART:([A-Z]+)\]\]/);

            const segments = [];
            for (let i = 0; i < parts.length; i++) {
                // 偶数索引是文本
                if (i % 2 === 0) {
                    if (parts[i].trim()) {
                        segments.push({ type: 'text', content: parts[i] });
                    }
                } else {
                    // 奇数索引是 Chart Type (比如 TREND, SENTIMENT)
                    segments.push({ type: 'chart', chartType: parts[i] });
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
            // 如果正在加载中，防止重复点击
            if (hotLoading.value) return;
            
            hotLoading.value = true; // 开始转圈
            try {
                const res = await fetch('/api/hot-topics');
                const json = await res.json();
                if (json.success) {
                    const oldData = JSON.stringify(hotTopics.value);
                    const newData = JSON.stringify(json.data);

                    if (oldData === newData && hotTopics.value.length > 0) {
                        // 数据完全一样
                        showToast('当前已是最新榜单，暂无更新 ✨');
                    } else {
                        // 数据变了，更新并提示
                        hotTopics.value = json.data;
                        showToast('热搜榜单更新成功 🚀');
                    }
                }
            } catch (e) {
                console.error("热搜获取失败:", e);
            } finally {
                // 稍微延迟一点点，让用户看清转圈动画（可选体验优化）
                setTimeout(() => {
                    hotLoading.value = false; // 停止转圈
                }, 500);
            }
        };

        const exportPdf = async () => {
            // if (!reportRef.value) {
            //     alert('请先生成报告');
            //     return;
            // }

            await nextTick();
            await new Promise(r => setTimeout(r, 500));

            const scaleFactor = 0.85; // 网页内容缩小 85%
            const canvas = await html2canvas(reportRef.value, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0f172a',
                windowWidth: reportRef.value.scrollWidth,
                windowHeight: reportRef.value.scrollHeight
            });

            // JPEG 压缩，减少文件大小
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
            pdf.save(`舆情分析报告_${Date.now()}.pdf`);
        };

        const getScoreColor = (score) => {
            if (score >= 70) return 'text-emerald-400';
            if (score >= 40) return 'text-yellow-400';
            return 'text-rose-400';
        };

        const chartInstances = [];

        const initCharts = (data) => {
            // Dispose old instances
            chartInstances.forEach(c => c.dispose());
            chartInstances.length = 0;

            // 必须检查 DOM 是否存在 (因为现在是 v-if 动态渲染)
            if (data.trend_data && document.getElementById('trendChart')) initTrendChart(data.trend_data);
            if (data.sentiment_distribution && document.getElementById('sentimentChart')) initSentimentChart(data.sentiment_distribution);
            if (data.source_distribution && document.getElementById('sourceChart')) initSourceChart(data.source_distribution);
            if (data.regional_distribution && document.getElementById('regionChart')) initRegionChart(data.regional_distribution);
            if (data.related_topics && document.getElementById('topicChart')) initTopicChart(data.related_topics);
        };

        const commonOption = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item' },
            textStyle: { fontFamily: 'Inter, sans-serif' }
        };

        const initTrendChart = (data) => {
            const chart = echarts.init(document.getElementById('trendChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                grid: { top: 30, bottom: 20, left: 40, right: 20, containLabel: true },
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category',
                    data: data.map(i => i.date),
                    axisLine: { lineStyle: { color: '#64748b' } },
                    axisLabel: { color: '#94a3b8' }
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: '#334155' } },
                    axisLine: { show: false },
                    axisLabel: { color: '#94a3b8' }
                },
                series: [{
                    data: data.map(i => i.score),
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: { color: '#6366f1', width: 4 },
                    itemStyle: { color: '#818cf8', borderColor: '#fff', borderWidth: 2 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(99, 102, 241, 0.5)' },
                            { offset: 1, color: 'rgba(99, 102, 241, 0)' }
                        ])
                    }
                }]
            });
        };

        const initSentimentChart = (data) => {
            const chart = echarts.init(document.getElementById('sentimentChart'));
            chartInstances.push(chart);
            const colors = { '正面': '#10b981', '中立': '#f59e0b', '负面': '#ef4444' };
            chart.setOption({
                ...commonOption,
                series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    itemStyle: { borderRadius: 10, borderColor: '#1e293b', borderWidth: 2 },
                    label: { color: '#e2e8f0' },
                    data: data.map(item => ({
                        value: item.value,
                        name: item.name,
                        itemStyle: { color: colors[item.name] || '#94a3b8' }
                    }))
                }]
            });
        };

        const initSourceChart = (data) => {
            const chart = echarts.init(document.getElementById('sourceChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                series: [{
                    type: 'pie',
                    radius: [20, 100],
                    center: ['50%', '50%'],
                    roseType: 'area',
                    itemStyle: { borderRadius: 8 },
                    label: { color: '#e2e8f0' },
                    data: data
                }]
            });
        };

        const initRegionChart = (data) => {
            const chart = echarts.init(document.getElementById('regionChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { top: 10, bottom: 20, left: 10, right: 30, containLabel: true },
                xAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8' }
                },
                yAxis: {
                    type: 'category',
                    data: data.map(i => i.name).reverse(),
                    axisLine: { lineStyle: { color: '#64748b' } },
                    axisLabel: { color: '#e2e8f0' }
                },
                series: [{
                    type: 'bar',
                    data: data.map(i => i.value).reverse(),
                    itemStyle: {
                        borderRadius: [0, 4, 4, 0],
                        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                            { offset: 0, color: '#38bdf8' },
                            { offset: 1, color: '#3b82f6' }
                        ])
                    }
                }]
            });
        };

        const initTopicChart = (data) => {
            const chart = echarts.init(document.getElementById('topicChart'));
            chartInstances.push(chart);
            chart.setOption({
                ...commonOption,
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { top: 10, bottom: 20, left: 10, right: 30, containLabel: true },
                // === 修改点开始：交换 X 和 Y 轴 ===
                xAxis: {
                    type: 'value', // 数值在 X 轴
                    splitLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8' }
                },
                yAxis: {
                    type: 'category', // 话题文字在 Y 轴
                    data: data.map(i => i.name).reverse(), // 反转数据，让第一名排在最上面
                    axisLine: { lineStyle: { color: '#64748b' } },
                    axisLabel: {
                        color: '#e2e8f0',
                        width: 110,       // 限制文字宽度
                        overflow: 'break' // 超出自动换行
                    }
                },
                // === 修改点结束 ===
                series: [{
                    type: 'bar',
                    data: data.map(i => i.value).reverse(), // 数据也要反转
                    itemStyle: {
                        borderRadius: [0, 4, 4, 0], // 圆角变成右边圆
                        color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [ // 渐变色改成横向
                            { offset: 0, color: '#a78bfa' },
                            { offset: 1, color: '#7c3aed' }
                        ])
                    }
                }]
            });
        };

        window.addEventListener('resize', () => chartInstances.forEach(c => c.resize()));

        return {
            topic,
            loading,
            result,
            analyze,
            hotTopics,
            applyHotTopic,
            reportSegments,
            mdParser,
            getScoreColor,
            reportRef,
            toastMsg,  
            exportPdf,
            hotLoading,  
            fetchHotTopics
        };
    }
}).mount('#app');
