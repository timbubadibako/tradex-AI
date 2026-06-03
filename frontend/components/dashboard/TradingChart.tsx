"use client";

import ReactECharts from "echarts-for-react";
import { useRef } from "react";
import { motion } from "framer-motion";

interface TradingChartProps {
  data: any[];
  prediction?: { price: number; change_pct: number };
  predictionHistory?: { timestamp: number; price: number }[];
  trades?: any[];
  obi?: number;
  entryPrice?: number;
  activePosition?: string | null;
}

export default function TradingChart({ 
  data, 
  prediction, 
  predictionHistory = [], 
  trades = [], 
  obi = 0,
  entryPrice = 0,
  activePosition = null
}: TradingChartProps) {
  const chartRef = useRef<any>(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-300 italic font-medium">
        Waiting for market data...
      </div>
    );
  }

  const currentMarketPrice = data[data.length - 1].close;

  const candlestickData = data.map((item) => [item.open, item.close, item.low, item.high]);
  const timestamps = data.map((item) => {
    const date = new Date(item.timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  });
  
  // "NEXT HR" sengaja dipertahankan agar AI punya ruang 1 slot untuk menggambar garis masa depan
  const extendedTimestamps = [...timestamps, "NEXT HR"];

  const aiLineData = data.map((item) => {
    const match = predictionHistory.find(p => Math.abs(p.timestamp - item.timestamp) <= 300000);
    return match ? match.price : null;
  });
  aiLineData.push(prediction?.price || null);

  const tradeAreas: any[] = [];
  const tradeLines: any[] = [];
  const tradeGroups: Record<string, any[]> = {};

  const tradeList = Array.isArray(trades) ? trades : [];
  tradeList.forEach(t => {
    if (t && t.id) {
      if (!tradeGroups[t.id]) tradeGroups[t.id] = [];
      tradeGroups[t.id].push(t);
    }
  });

  Object.values(tradeGroups).forEach(group => {
    const sorted = group.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const open = sorted.find(t => t.type.startsWith('OPEN'));
    const close = sorted.find(t => t.type.startsWith('CLOSE'));
    
    if (open) {
      const openTime = new Date(open.time).getTime();
      
      let openIdx = -1;
      let minDistance = Infinity;
      data.forEach((d, idx) => {
        const dist = Math.abs(d.timestamp - openTime);
        if (dist < minDistance) {
          minDistance = dist;
          openIdx = idx;
        }
      });

      const tfInterval = data.length > 1 ? data[1].timestamp - data[0].timestamp : 3600000;
      
      if (openIdx !== -1 && minDistance < tfInterval) {
        let endIdx = data.length - 1;
        let isLive = true;

        if (close) {
          isLive = false;
          const closeTime = new Date(close.time).getTime();
          let closeIdx = -1;
          let minCloseDistance = Infinity;
          
          data.forEach((d, idx) => {
            const dist = Math.abs(d.timestamp - closeTime);
            if (dist < minCloseDistance) {
              minCloseDistance = dist;
              closeIdx = idx;
            }
          });
          
          if (closeIdx !== -1 && minCloseDistance < tfInterval) {
            endIdx = closeIdx;
          }
        }

        const typeLabel = open.type.includes('LONG') ? 'LONG' : 'SHORT';

        tradeAreas.push([
          { 
            xAxis: openIdx, 
            itemStyle: { color: isLive ? 'rgba(139, 92, 246, 0.06)' : 'rgba(148, 163, 184, 0.02)' },
            label: { 
              show: true, 
              position: 'insideTopLeft', 
              formatter: isLive ? `LIVE ${typeLabel}` : `${typeLabel} CLOSED`, 
              color: isLive ? '#8b5cf6' : '#94a3b8', 
              fontWeight: '900', 
              fontSize: 9,
              distance: 15
            } 
          },
          { xAxis: endIdx }
        ]);

        tradeLines.push([
          {
            coord: [openIdx, open.price],
            lineStyle: { 
              color: isLive ? '#8b5cf6' : 'rgba(148, 163, 184, 0.4)', 
              type: isLive ? 'solid' : 'dashed', 
              width: isLive ? 2 : 1 
            },
            label: {
              show: isLive,
              position: 'start',
              formatter: `OPEN ${typeLabel}: Rp ${open.price.toLocaleString('id-ID')}`,
              backgroundColor: '#8b5cf6',
              color: '#fff',
              padding: [4, 6],
              borderRadius: 4,
              fontSize: 8,
              fontWeight: 'bold'
            }
          },
          {
            coord: [endIdx, open.price]
          }
        ]);
      }
    }
  });

  const globalMarkLines: any[] = [...tradeLines];
  if (prediction?.price && currentMarketPrice) {
    const gapIdr = prediction.price - currentMarketPrice;
    const gapPct = (gapIdr / currentMarketPrice) * 100;
    const sign = gapIdr >= 0 ? '+' : '';
    const gapColor = gapIdr >= 0 ? '#10b981' : '#f43f5e'; 

    globalMarkLines.push({
      yAxis: prediction.price,
      name: 'TARGET',
      lineStyle: { color: gapColor, type: 'dotted', width: 2 },
      label: { 
        show: true, 
        position: 'end', 
        formatter: `TARGET\n${sign}Rp ${Math.abs(Math.round(gapIdr)).toLocaleString('id-ID')}\n(${sign}${gapPct.toFixed(2)}%)`,
        color: gapColor,
        fontSize: 9,
        fontWeight: 'bold',
        backgroundColor: '#ffffff',
        padding: [4, 6],
        borderRadius: 4,
        align: 'center',
        lineHeight: 14
      }
    });
  }

  const option = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255, 255, 255, 0.98)', padding: [12, 16], textStyle: { color: '#1e293b', fontSize: 12 },
      extraCssText: 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border-radius: 16px; border: 1px solid #f1f5f9; min-width: 250px;',
      formatter: (p: any) => {
        const c = p.find((x: any) => x.seriesName === 'Market Price');
        const r = p.find((x: any) => x.seriesName === 'AI Trace');
        let res = `<div style="font-weight: 900; color: #64748b; margin-bottom: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;">${p[0].name}</div>`;
        
        if (c && c.value[2] !== undefined) {
            res += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="color: #94a3b8;">Market:</span><span style="font-weight: 900; color: #1e293b;">Rp ${Math.round(c.value[2]).toLocaleString('id-ID')}</span></div>`;
        }
        if (r && r.value !== null && !isNaN(r.value)) {
            res += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span style="color: #f59e0b; font-weight: bold;">AI Trace:</span><span style="font-weight: 900; color: #f59e0b;">Rp ${Math.round(r.value).toLocaleString('id-ID')}</span></div>`;
        }
        
        if (r && r.value !== null && !isNaN(r.value) && c && c.value[2] !== undefined) {
           const gap = r.value - c.value[2];
           const gapPct = (gap / c.value[2]) * 100;
           const sign = gap >= 0 ? '+' : '';
           const color = gap >= 0 ? '#10b981' : '#f43f5e';
           res += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px; padding-top: 6px; margin-top: 6px; border-top: 1px dashed #e2e8f0;">
                     <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 800;">Target Gap:</span>
                     <span style="font-weight: 900; color: ${color};">${sign}Rp ${Math.abs(Math.round(gap)).toLocaleString('id-ID')} (${sign}${gapPct.toFixed(2)}%)</span>
                   </div>`;
        }

        return res;
      }
    },
    // SAKTI FIX: Pangkas right margin dari 85 menjadi 45 agar Y-Axis merapat ke kiri
    grid: { left: '1%', right: '45', bottom: '4%', top: '1%', containLabel: true },
    xAxis: { type: 'category', data: extendedTimestamps, boundaryGap: true, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#94a3b8', fontSize: 10, margin: 15 }, splitLine: { show: false } },
    yAxis: { 
      type: 'value', 
      scale: true, 
      position: 'right', 
      axisLine: { show: false }, 
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => (v / 1e6).toFixed(1) + 'jt' }, 
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      min: (value: any) => Math.floor(value.min * 0.997),
      max: (value: any) => Math.ceil(value.max * 1.003)
    },
    series: [
      {
        name: 'Market Price', type: 'candlestick', data: candlestickData,
        itemStyle: { color: '#10b981', color0: '#f43f5e', borderColor: '#10b981', borderColor0: '#f43f5e', borderWidth: 1.5 },
        markArea: { data: tradeAreas }
      },
      {
        name: 'AI Trace', type: 'line', data: aiLineData, smooth: true, showSymbol: true, symbol: 'circle', symbolSize: 4, connectNulls: true,
        lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' }, itemStyle: { color: '#f59e0b' },
        markLine: { symbol: ['none', 'none'], data: globalMarkLines }
      }
    ]
  };

  return (
    <div className="w-full h-full flex flex-col">
      
      <div className="flex-[0.85] w-full min-h-0 pl-10">
        <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: '100%' }} notMerge={true} />
      </div>

      {/* LIQUIDITY OVERLAY / OBI (Tebal proporsional & Label disesuaikan) */}
      <div className="flex-[0.15] w-full flex flex-col justify-center px-10 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="flex justify-between items-end mb-3 text-[8px] font-black uppercase tracking-[0.2em]">
          <div className="text-emerald-500 flex flex-col"><span>Bids</span><span>Depth</span></div>
          <div className="text-slate-900 text-base font-black">{(obi || 0).toFixed(2)}</div>
          <div className="text-rose-500 text-right flex flex-col"><span>Asks</span><span>Depth</span></div>
        </div>
        
        {/* SAKTI FIX: Ubah dari h-2 menjadi h-4 dengan inner shadow agar terlihat lebih tebal dan solid */}
        <div className="relative h-4 w-full bg-slate-200/50 rounded-full flex overflow-hidden border border-white shadow-inner">
          <motion.div
            animate={{ width: `${50 + (obi || 0) * 50}%`, backgroundColor: obi > 0.05 ? '#10b981' : '#cbd5e1' }}
            className="h-full transition-all duration-700 ease-out"
          />
          <motion.div
            animate={{ backgroundColor: obi < -0.05 ? '#f43f5e' : '#cbd5e1' }}
            className="h-full flex-1 transition-all duration-700 ease-out"
          />
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/80 z-10" />
          {Math.abs(obi) > 0.1 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 2 }}
              className={`absolute inset-y-0 w-1/4 blur-md ${obi > 0 ? 'left-0 bg-emerald-400' : 'right-0 bg-rose-400'}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}