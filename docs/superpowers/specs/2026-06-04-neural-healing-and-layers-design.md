# Design Spec: Zenith AI Neural Healing & Visual Layers 🌌🧠

**Topic:** Auto-Regressive Gap Filling & Multi-Layer Chart Visualization
**Date:** 2026-06-04
**Status:** Approved by Master Trader

## 1. Executive Summary
This specification defines the "Singularity Rewind" capability, enabling the bot to maintain neural continuity during downtime via auto-regressive inference. It also introduces a sophisticated multi-layer chart UI with Blue/Purple trade overlays and a Yellow AI Trace line, all controllable via a Layer Toggle panel.

## 2. Backend: Neural Healing (Auto-Regressive Gap Filling)
The backend must maintain exactly **100 candles** of history for all assets (Crypto, Forex, IDX) to ensure LSTM input consistency.

### 2.1 Gap Detection & Stitching
- **Process:** Upon every candle close, the bot fetches the last 100 OHLCV points from the Exchange API and the last 100 predictions from Supabase.
- **Downtime Handling:** If prediction data is missing (e.g., bot was offline), the AI enters "Healing Mode".
- **Neural Rewind:** The AI uses its current weights to predict the first missing point $t$, uses that result as part of the input to predict $t+1$, and continues until all 100 points are filled.
- **Continuous MAPE:** MAPE is calculated against this synthesized 100-candle window. If the new MAPE is lower than the record, the model is promoted to `latest`.

### 2.2 Persistence & Recovery
- **Database Pull:** On startup, the `database.py` service must fetch historical trades from `trade_ledger` to populate chart overlays.
- **Payload:** The `/api/chart` endpoint will now include:
  - `ohlcv`: 100 candles.
  - `prediction_history`: 100 points (Yellow Line).
  - `active_trades`: Array of closed and open trades with Entry/Exit timestamps and types.

## 3. UI: Command Center Visual Layers
The `TradingChart.tsx` component will be upgraded to support multiple toggleable visual layers.

### 3.1 Layer Specification
- **Layer 1: Candlesticks**
  - **Color:** Traditional Red/Green.
  - **Style:** Semi-transparent glass texture.
- **Layer 2: AI Trace (Yellow Line)**
  - **Visual:** A solid yellow line (`#fbbf24`) with a soft outer glow.
  - **Data:** Derived from `prediction_history`.
- **Layer 3: Position Overlays (Block Areas)**
  - **Long:** Blue Area (`#3b82f6` at 15% opacity) from Open Time to Close Time.
  - **Short:** Purple Area (`#a855f7` at 15% opacity) from Open Time to Close Time.
  - **Glow:** 1px border of the same color with a neon glow effect.

### 3.2 Layer Controller
- A floating control panel in the top-right of the chart container.
- Three switches:
  1. `Layer: AI Projection`
  2. `Layer: Candlesticks`
  3. `Layer: Trade History`

## 4. Technical Integration
- **Framework:** ECharts (`ReactECharts`) using `markArea` for trade blocks.
- **State Management:** Use `localStorage` to persist the user's layer preferences.
- **API Bindings:** Standardized payload between `dummy_main.py` and production `main.py`.

## 5. Success Criteria
- [ ] Bot successfully recovers and fills gaps after 1 hour of downtime.
- [ ] MAPE reflects the synthesized 100-candle performance.
- [ ] UI allows hiding candlesticks to see the "Pure AI Trace".
- [ ] Blue/Purple trade blocks correctly align with historical entry/exit timestamps.
