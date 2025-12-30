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
            if (data.trend_data && document.getElementById('trendChart')) initTrendChart(data.trend_data,data.forecast_data);
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

        const initTrendChart = (historyData, forecastData) => {
            // 容错处理：如果后端没返回预测数据，给个空数组
            const safeForecast = forecastData || [];
            
            const chart = echarts.init(document.getElementById('trendChart'));
            chartInstances.push(chart);

            // 1. 准备 X 轴数据 (历史日期 + 预测日期)
            // 注意：为了让线连起来，预测数据的第一个点最好也是历史数据的最后一个点
            // 这里我们简单处理，直接拼接日期
            const historyDates = historyData.map(i => i.date);
            const forecastDates = safeForecast.map(i => i.date);
            const allDates = [...historyDates, ...forecastDates];

            // 2. 准备 Y 轴数据
            // 历史数据：对应历史日期，预测部分填 null (不显示)
            const historyScores = historyData.map(i => i.score);
            
            // 预测数据：为了画出连续的线，我们需要把历史数据的最后一个点作为预测数据的起点
            // 创建一个全是 null 的数组，长度等于历史数据长度-1
            const gapData = new Array(historyScores.length - 1).fill(null);
            // 把历史最后一个点加进去
            const lastHistoryScore = historyScores[historyScores.length - 1];
            // 拼接：[null, null, ..., 历史最后一点, 预测1, 预测2...]
            const forecastScores = [...gapData, lastHistoryScore, ...safeForecast.map(i => i.score)];

            chart.setOption({
                ...commonOption,
                // 标题配置
                title: {
                    text: '态势感知：历史走势与AI预测',
                    left: 'center',
                    top: '0%',
                    textStyle: { color: '#94a3b8', fontSize: 14, fontWeight: 'normal' }
                },
                grid: { top: 50, bottom: 20, left: 40, right: 20, containLabel: true },
                tooltip: { 
                    trigger: 'axis',
                    formatter: function (params) {
                        let result = params[0].name + '<br/>';
                        params.forEach(item => {
                            if (item.value !== undefined && item.value !== null) {
                                // 区分历史和预测
                                const label = item.seriesName === '历史热度' ? '当前热度' : 'AI预测热度';
                                result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${label}: ${item.value}<br/>`;
                            }
                        });
                        return result;
                    }
                },
                legend: {
                    data: ['历史热度', '趋势预测'],
                    top: '25px',
                    textStyle: { color: '#cbd5e1' }
                },
                xAxis: {
                    type: 'category',
                    data: allDates,
                    boundaryGap: false, // 让线顶头画
                    axisLine: { lineStyle: { color: '#64748b' } },
                    axisLabel: { color: '#94a3b8' }
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
                    axisLine: { show: false },
                    axisLabel: { color: '#94a3b8' }
                },
                series: [
                    // 第一条线：历史热度 (实线)
                    {
                        name: '历史热度',
                        type: 'line',
                        data: [...historyScores, ...new Array(forecastDates.length).fill(null)], // 后面补null
                        smooth: true,
                        symbol: 'circle',
                        symbolSize: 8,
                        itemStyle: { color: '#6366f1' }, // 蓝紫色
                        lineStyle: { width: 3 },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(99, 102, 241, 0.4)' },
                                { offset: 1, color: 'rgba(99, 102, 241, 0)' }
                            ])
                        },
                        // 只显示最后一个点的标签，标明当前热度
                        label: {
                            show: true,
                            position: 'top',
                            color: '#fff',
                            formatter: (p) => p.dataIndex === historyScores.length - 1 ? `{a|当前:${p.value}}` : '',
                            rich: {
                                a: { backgroundColor: '#6366f1', color: '#fff', padding: [2, 5], borderRadius: 3 }
                            }
                        }
                    },
                    // 第二条线：趋势预测 (虚线)
                    {
                        name: '趋势预测',
                        type: 'line',
                        data: forecastScores,
                        smooth: true,
                        symbol: 'emptyCircle',
                        symbolSize: 6,
                        itemStyle: { color: '#f43f5e' }, // 玫瑰红，表示预测/风险
                        lineStyle: { 
                            width: 3, 
                            type: 'dashed' // 关键：虚线
                        },
                        label: {
                            show: true,
                            position: 'top',
                            color: '#f43f5e',
                            formatter: (p) => p.dataIndex === forecastScores.length - 1 ? '预测' : ''
                        }
                    }
                ]
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
