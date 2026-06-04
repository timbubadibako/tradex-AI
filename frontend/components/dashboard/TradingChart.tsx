"use client";

import ReactECharts from "echarts-for-react";
import { useRef, useState, useEffect } from "react";
import { BrainCircuit, Activity, History } from "lucide-react";

interface TradingChartProps {
  data: any[];
  prediction?: { price: number; confidence: number };
  predictionHistory?: { timestamp: number; price: number }[];
  trades?: any[];
}

export default function TradingChart({
  data,
  prediction,
  predictionHistory = [],
  trades = []
}: TradingChartProps) {
  const chartRef = useRef<any>(null);

  const [layers, setLayers] = useState({
    candlesticks: true,
    aiTrace: true,
    trades: true
  });

  useEffect(() => {
    if (chartRef.current) {
      const chartInstance = chartRef.current.getEchartsInstance();
      chartInstance.resize();
    }
  }, [data, layers]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300 italic font-medium">
        Waiting for neural matrix synchronization...
      </div>
    );
  }

  const candlestickData = data.map((item: any) => [
    item.open,
    item.close,
    item.low,
    item.high,
  ]);

  const timestamps = data.map((item: any) => {
    const date = new Date(item.timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  });

  const aiLineData = data.map((item) => {
    const match = predictionHistory.find(p => Math.abs(p.timestamp - item.timestamp) <= 60000);
    return match ? match.price : null;
  });

  const tradeAreas: any[] = [];
  if (layers.trades && Array.isArray(trades)) {
    trades.forEach((t) => {
      const entryTime = new Date(t.time).getTime();
      let entryIdx = -1;
      let minDistance = Infinity;
      data.forEach((d, idx) => {
        const dist = Math.abs(d.timestamp - entryTime);
        if (dist < minDistance) {
          minDistance = dist;
          entryIdx = idx;
        }
      });

      if (entryIdx !== -1 && minDistance < 3600000) {
        const isLong = t.type.includes('LONG') || t.type.includes('BUY');
        tradeAreas.push([
          {
            xAxis: entryIdx,
            itemStyle: {
              color: isLong ? 'rgba(168, 85, 247, 0.08)' : 'rgba(59, 130, 246, 0.08)',
              borderWidth: 1,
              borderColor: isLong ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)',
              borderType: 'dashed'
            },
            label: {
              show: true,
              position: 'insideTopLeft',
              formatter: isLong ? '🟩 LIVE LONG' : '🟦 LIVE SHORT',
              color: isLong ? '#a855f7' : '#3b82f6',
              fontWeight: '900',
              fontSize: 9,
              distance: 10
            }
          },
          {
            xAxis: data.length - 1
          }
        ]);
      }
    });
  }

  const option = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      backgroundColor: 'rgba(2, 6, 23, 0.92)',
      padding: [12, 16],
      textStyle: { color: '#f8fafc', fontSize: 11, fontFamily: 'Inter' },
      extraCssText: 'box-shadow: 0 20px 40px -10px rgba(0,0,0,0.7); border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(16px); min-width: 220px;',
      // SAKTI CUSTOM ENGINE FORMATTER: Kita saring data bising, sisakan hanya target lo!
      formatter: (params: any) => {
        let marketPrice = null;
        let aiProjection = null;

        // Ekstrak data aktif dari sumbu kursor mouse
        params.forEach((p: any) => {
          if (p.seriesName === 'Market Price') {
            // Data candlestick ECharts berturut-turut: open, close, low, high. Kita ambil close (index 1)
            marketPrice = p.data ? p.data[2] : null; 
          }
          if (p.seriesName === 'AI Projection') {
            aiProjection = p.data;
          }
        });

        if (!marketPrice) return '';

        // Hitung Gap & Persentase jika proyeksi AI tersedia
        let gapHtml = '';
        if (aiProjection !== null && aiProjection !== undefined) {
          const gapIdr = aiProjection - marketPrice;
          const gapPct = (gapIdr / marketPrice) * 100;
          const isUp = gapIdr >= 0;

          gapHtml = `
            <div style="margin-top: 10px; padding-top: 8px; border-t; border-style: dashed; border-color: rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 4px;">
               <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider">AI Projection</span>
                  <span style="color: #fbbf24; font-weight: 900; font-family: monospace;">Rp ${Math.floor(aiProjection).toLocaleString('id-ID')}</span>
               </div>
               <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider">Projected Gap</span>
                  <span style="color: ${isUp ? '#10b981' : '#f43f5e'}; font-weight: 900; font-family: monospace;">
                     ${isUp ? '+' : '-'}Rp ${Math.abs(Math.floor(gapIdr)).toLocaleString('id-ID')}
                  </span>
               </div>
               <div style="display: flex; justify-content: space-between; gap: 16px;">
                  <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider">Gap Percentage</span>
                  <span style="color: ${isUp ? '#10b981' : '#f43f5e'}; font-weight: 900; font-family: monospace;">
                     ${isUp ? '+' : ''}${gapPct.toFixed(2)}%
                  </span>
               </div>
            </div>
          `;
        }

        // Output DOM Tooltip Mini Cyberpunk
        return `
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; items-center; margin-bottom: 2px;">
              <span style="color: #38bdf8; font-weight: 900; font-size: 10px; tracking-widest; text-transform: uppercase;">Zenith Matrix</span>
              <span style="color: #475569; font-weight: bold; font-size: 9px; font-family: monospace;">${params[0].name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; tracking-wider">Spot Price</span>
              <span style="color: #fff; font-weight: 900; font-family: monospace;">Rp ${Math.floor(marketPrice).toLocaleString('id-ID')}</span>
            </div>
            ${gapHtml}
          </div>
        `;
      }
    },
    // Sumbu X nempel maksimal ke bawah kontainer canvas karena OBI sudah lepas
    grid: { left: '10', right: '10', bottom: '2%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: true,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#64748b', fontSize: 10, margin: 10, fontFamily: 'Inter', fontWeight: 'bold' },
      splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.02)' } }
    },
    yAxis: {
      type: 'value',
      scale: true,
      position: 'right',
      axisLine: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        formatter: (v: number) => v.toLocaleString('id-ID')
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
      min: (value: any) => Math.floor(value.min * 0.997),
      max: (value: any) => Math.ceil(value.max * 1.003)
    },
    series: [
      {
        name: 'Market Price',
        type: 'candlestick',
        data: candlestickData,
        itemStyle: {
          color: '#10b981', color0: '#f43f5e',
          borderColor: '#10b981', borderColor0: '#f43f5e',
          opacity: layers.candlesticks ? 1 : 0
        },
        z: 5,
        markArea: { silent: true, data: tradeAreas }
      },
      ...(layers.aiTrace ? [{
        name: 'AI Projection',
        type: 'line',
        data: aiLineData,
        smooth: true,
        showSymbol: false,
        connectNulls: true,
        lineStyle: { color: '#fbbf24', width: 1.5, type: 'dashed'},
        z: 10
      }] : [])
    ]
  };

  return (
    <div className="w-full h-full relative group/chart min-h-0">
      {/* FLOATING CONTROLLERS PANEL */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-2 bg-[#0f172a]/80 backdrop-blur-3xl border border-white/5 p-1.5 rounded-xl shadow-2xl">
        <button
          onClick={() => setLayers({ ...layers, aiTrace: !layers.aiTrace })}
          className={`p-2 rounded-lg transition-all ${layers.aiTrace ? 'bg-amber-500/20 text-amber-400 border border-amber-500/10 shadow-[0_0_12px_rgba(251,191,36,0.15)]' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setLayers({ ...layers, candlesticks: !layers.candlesticks })}
          className={`p-2 rounded-lg transition-all ${layers.candlesticks ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}
        >
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setLayers({ ...layers, trades: !layers.trades })}
          className={`p-2 rounded-lg transition-all ${layers.trades ? 'bg-purple-500/20 text-purple-400 border border-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}
        >
          <History className="w-3.5 h-3.5" />
        </button>
      </div>

      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
        autoResize={true}
      />
    </div>
  );
}