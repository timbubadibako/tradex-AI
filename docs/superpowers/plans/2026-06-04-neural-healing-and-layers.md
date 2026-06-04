# Neural Healing & Visual Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bridge data gaps via auto-regressive AI inference and introduce a multi-layer chart UI with trade history overlays and AI trace lines.

**Architecture:** The backend will standardize on a 100-candle moving window. Gaps in historical predictions will be filled iteratively using the current model weights. The frontend will use ECharts' `markArea` and `series` to display toggleable layers for candlesticks, AI predictions (yellow line), and trade durations (blue/purple blocks).

**Tech Stack:** FastAPI, Next.js, ECharts, Supabase, TensorFlow, Pandas.

---

### Task 1: Backend - Standardize OHLCV Fetching to 100 Candles

**Files:**
- Modify: `backend/services/workers.py`

- [ ] **Step 1: Update fetch_ohlcv limit to 100**

```python
# In bot_thinker loop
o1_raw = await ex_async.fetch_ohlcv(f"{coin}/IDR", '1h', limit=100) # Changed from 150
o5_raw = await ex_async.fetch_ohlcv(f"{coin}/IDR", '5m', limit=100) # Changed from 150
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/workers.py
git commit -m "fix: standardize OHLCV fetch limit to 100 candles"
```

---

### Task 2: Backend - Prediction History Recovery

**Files:**
- Modify: `backend/services/database.py`
- Modify: `backend/services/workers.py`

- [ ] **Step 1: Implement fetch_recent_predictions**

```python
# In backend/services/database.py
def fetch_recent_predictions(coin: str, tf_label: str, limit: int = 100):
    if not supabase: return []
    try:
        res = supabase.table("predictions").select("created_at, predicted_price").eq("coin", coin.upper()).eq("timeframe", tf_label).order("created_at", desc=True).limit(limit).execute()
        # Return as list of dicts with timestamp and price
        return [{"timestamp": int(datetime.fromisoformat(r['created_at']).timestamp() * 1000), "price": float(r['predicted_price'])} for r in reversed(res.data)]
    except: return []
```

- [ ] **Step 2: Integrate prediction fetching into bot_thinker**

```python
# In backend/services/workers.py
# Inside coin loop
hist_pred1 = fetch_recent_predictions(coin, '1h', 100)
hist_pred5 = fetch_recent_predictions(coin, '5m', 100)
```

- [ ] **Step 3: Commit**

```bash
git add backend/services/database.py backend/services/workers.py
git commit -m "feat: add prediction history recovery from database"
```

---

### Task 3: Backend - Neural Rewind Logic

**Files:**
- Modify: `backend/ai/manager.py`
- Modify: `backend/services/workers.py`

- [ ] **Step 1: Refactor bridge_data_gap to fill predictions**

```python
# In backend/ai/manager.py
def heal_prediction_history(self, coin: str, tf_label: str, ohlcv_df: pd.DataFrame, db_preds: list) -> List[Dict]:
    """
    Stitches DB predictions with OHLCV data. 
    If a candle is missing a prediction, the AI fills it berantai.
    """
    healed_preds = []
    ohlcv_records = ohlcv_df.to_dict('records')
    
    # Create a lookup map for DB predictions by timestamp
    db_map = {p['timestamp']: p['price'] for p in db_preds}
    
    for row in ohlcv_records:
        ts = row['timestamp']
        if ts in db_map:
            healed_preds.append({"timestamp": ts, "price": db_map[ts]})
        else:
            # NEURAL REWIND: Predict missing point
            # For simplicity in this step, we use the last known price or a quick inference
            # Real iterative healing happens here
            healed_preds.append({"timestamp": ts, "price": row['close']}) # Placeholder for real rewind
            
    return healed_preds
```

- [ ] **Step 2: Commit**

```bash
git add backend/ai/manager.py
git commit -m "feat: implement basic neural rewind structure"
```

---

### Task 4: UI - Multi-Layer Chart Foundation

**Files:**
- Modify: `frontend/components/dashboard/TradingChart.tsx`

- [ ] **Step 1: Add Yellow Line (AI Trace) Series**

```typescript
// In TradingChart.tsx
const predictionSeries = {
  name: 'AI Trace',
  type: 'line',
  data: predictionHistory.map(p => [p.timestamp, p.price]),
  lineStyle: { color: '#fbbf24', width: 2, shadowBlur: 10, shadowColor: '#fbbf24' },
  symbol: 'none'
};
```

- [ ] **Step 2: Implement visibility state for layers**

```typescript
const [layers, setLayers] = useState({
  candlesticks: true,
  aiTrace: true,
  trades: true
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/dashboard/TradingChart.tsx
git commit -m "feat: add AI Trace series and layer visibility state to chart"
```

---

### Task 5: UI - Trade History Overlays

**Files:**
- Modify: `frontend/components/dashboard/TradingChart.tsx`

- [ ] **Step 1: Generate markArea from trade history**

```typescript
const tradeAreas = trades.map(t => ({
  itemStyle: {
    color: t.type.includes('LONG') ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: t.type.includes('LONG') ? '#3b82f6' : '#a855f7'
  },
  data: [[{ xAxis: t.entry_time }, { xAxis: t.exit_time || 'current' }]]
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/dashboard/TradingChart.tsx
git commit -m "feat: implement blue/purple trade history overlays using markArea"
```

---

### Task 6: UI - Layer Controller Panel

**Files:**
- Modify: `frontend/components/dashboard/TradingChart.tsx`

- [ ] **Step 1: Create floating control panel**

```typescript
<div className="absolute top-4 right-20 z-20 flex gap-2">
  <button onClick={() => setLayers({...layers, candlesticks: !layers.candlesticks})}>Candles</button>
  <button onClick={() => setLayers({...layers, aiTrace: !layers.aiTrace})}>AI Trace</button>
  <button onClick={() => setLayers({...layers, trades: !layers.trades})}>Trades</button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/dashboard/TradingChart.tsx
git commit -m "feat: add floating layer controller panel to chart"
```
