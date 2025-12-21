// app.js 专门处理 Vue + ECharts
const { createApp, ref, computed, nextTick } = Vue;

createApp({
    setup() {
        const topic = ref('');
        const loading = ref(false);
        const result = ref(null);
        const mdParser = window.markdownit();
        const reportRef = ref(null);

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

        const renderedMarkdown = computed(() => result.value ? mdParser.render(result.value.report_markdown) : '');
        
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

            if (data.trend_data) initTrendChart(data.trend_data);
            if (data.sentiment_distribution) initSentimentChart(data.sentiment_distribution);
            if (data.source_distribution) initSourceChart(data.source_distribution);
            if (data.regional_distribution) initRegionChart(data.regional_distribution);
            if (data.related_topics) initTopicChart(data.related_topics);
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
                grid: { top: 10, bottom: 20, left: 10, right: 10, containLabel: true },
                xAxis: {
                    type: 'category',
                    data: data.map(i => i.name),
                    axisLine: { lineStyle: { color: '#64748b' } },
                    axisLabel: { color: '#e2e8f0', interval: 0, rotate: 30 }
                },
                yAxis: {
                    type: 'value',
                    splitLine: { lineStyle: { color: '#334155' } },
                    axisLabel: { color: '#94a3b8' }
                },
                series: [{
                    type: 'bar',
                    data: data.map(i => i.value),
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
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
                renderedMarkdown, 
                getScoreColor,
                reportRef,
                exportPdf
            };
    }
}).mount('#app');
