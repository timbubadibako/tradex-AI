"use client";

import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

interface TradingChartProps {
  data: any[];
  prediction?: { price: number; change_pct: number };
  predictionHistory?: { timestamp: number; price: number }[];
}

export default function TradingChart({ data, prediction, predictionHistory = [] }: TradingChartProps) {
  const chartRef = useRef<any>(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center text-slate-300 italic font-medium">
        Waiting for market data...
      </div>
    );
  }

  // Format data: [open, close, low, high]
  const candlestickData = data.map((item) => [
    item.open,
    item.close,
    item.low,
    item.high,
  ]);

  const timestamps = data.map((item) => {
    const date = new Date(item.timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  });

  // Tambahkan label untuk jam depan
  const extendedTimestamps = [...timestamps, "NEXT HR"];

  // Mapping history prediksi ke titik-titik yang ada (Toleransi kecil untuk memastikan presisi)
  const aiLineData = data.map((item) => {
    // Cari prediksi yang jarak waktunya paling deket (toleransi max 1 menit)
    const match = predictionHistory.find(p => Math.abs(p.timestamp - item.timestamp) <= 60000);
    return match ? match.price : null;
  });
  
  // Titik akhir (Masa depan)
  aiLineData.push(prediction?.price || null);

  const option = {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      padding: [12, 16],
      textStyle: { color: '#1e293b', fontSize: 12 },
      extraCssText: 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border-radius: 16px; border: 1px solid #f1f5f9; min-width: 250px;',
      formatter: (params: any) => {
        const candle = params.find((p: any) => p.seriesName === 'Market Price');
        const predict = params.find((p: any) => p.seriesName === 'AI Trace');
        
        let res = `<div style="font-weight: 900; color: #64748b; margin-bottom: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;">${params[0].name}</div>`;
        
        if (candle && candle.value[1] !== undefined) {
          const [index, open, close, low, high] = candle.value;
          res += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #94a3b8;">Market Price:</span>
              <span style="font-weight: 900; color: #1e293b;">Rp ${Math.round(close).toLocaleString('id-ID')}</span>
            </div>
          `;
        }
        
        if (predict && predict.value !== null && !isNaN(predict.value)) {
          const pVal = Math.round(predict.value);
          res += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #f59e0b; font-weight: bold;">AI Prediction:</span>
              <span style="font-weight: 900; color: #f59e0b;">Rp ${pVal.toLocaleString('id-ID')}</span>
            </div>
          `;
          
          if (candle && candle.value[1] !== undefined) {
            const actual = candle.value[2]; // close price
            if (actual && !isNaN(actual)) {
                const diff = pVal - actual;
                const diffPct = (diff / actual) * 100;
                res += `
                  <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
                    <span style="color: #64748b; font-weight: bold;">Selisih (Gap):</span>
                    <span style="font-weight: 900; color: ${diff >= 0 ? '#10b981' : '#f43f5e'};">
                      ${diff >= 0 ? '+' : ''}${Math.round(diff).toLocaleString('id-ID')} 
                      <small style="font-size: 10px; margin-left: 4px;">(${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%)</small>
                    </span>
                  </div>
                `;
            }
          }
        } else {
            res += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #f59e0b; font-weight: bold;">AI Prediction:</span>
              <span style="font-weight: 900; color: #cbd5e1; font-style: italic;">Calculating...</span>
            </div>
          `;
        }
        return res;
      }
    },
    legend: {
        show: true,
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' }
    },
    grid: {
      left: '2%',
      right: '60',
      bottom: '15%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: extendedTimestamps,
      boundaryGap: true,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, margin: 15 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      scale: true,
      position: 'right',
      min: 'dataMin',
      max: 'dataMax',
      axisLine: { show: false },
      axisLabel: { 
        color: '#64748b', 
        fontSize: 10,
        formatter: (value: number) => {
            return (value / 1e6).toFixed(1) + 'jt';
        }
      },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [
      {
        name: 'Market Price',
        type: 'candlestick',
        data: candlestickData,
        itemStyle: {
          color: '#10b981',
          color0: '#f43f5e',
          borderColor: '#10b981',
          borderColor0: '#f43f5e',
          borderWidth: 1.5
        }
      },
      {
        name: 'AI Trace',
        type: 'line',
        data: aiLineData,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 4,
        connectNulls: true,
        lineStyle: {
          color: '#f59e0b',
          width: 2,
          type: 'dashed'
        },
        itemStyle: { color: '#f59e0b' },
        // Hubungkan titik terakhir market ke prediksi depan
        markLine: prediction ? {
            symbol: ['none', 'none'],
            data: [
                {
                    yAxis: prediction.price,
                    name: 'TARGET',
                    lineStyle: { color: '#8b5cf6', type: 'dotted', width: 2 },
                    label: { show: true, position: 'end', formatter: 'TARGET' }
                }
            ]
        } : undefined
      }
    ]
  };

  return (
    <div className="w-full h-[450px]">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
      />
    </div>
  );
}
