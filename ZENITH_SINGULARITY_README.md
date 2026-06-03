# Zenith Singularity 🌌
**Autonomous Multi-Asset Neural Trading Engine**

Zenith Singularity is an advanced, self-evolving AI trading ecosystem designed for 24/7 autonomous market execution. It leverages deep learning (LSTMs) and Reinforcement Learning principles to predict market movements, adapt to volatility, and execute trades automatically without requiring constant human oversight.

---

## 🏗️ Architecture Overview

The system is built on a decentralized "Hybrid Singularity" architecture, splitting the workload between a secure local environment, an autonomous cloud factory, and a permanent knowledge base.

### 1. The Brain: Supabase Neural Storage 🧠💾
Supabase acts as the permanent "Global Memory" for the AI, ensuring that knowledge is never lost across server restarts or local machine shutdowns.
*   **`model-brains` (Storage Bucket):**
    *   `/latest`: The active, currently deployed neural weights (`.keras`).
    *   `/history`: The evolutionary archive. Whenever the AI breaks its accuracy record (MAPE), a timestamped snapshot is archived here.
*   **`bot_neural_memory` (Table):** Stores the **RL Bias (Policy)**. The AI's strategic "personality" (aggressiveness vs. caution) adjusts based on trading success/failure and is persisted here.
*   **`trade_ledger` (Table):** An immutable, global audit trail of every executed trade and its realized PnL.
*   **`neural_checkpoints` (Table):** A log of every time the AI successfully lowers its Mean Absolute Percentage Error (MAPE).

### 2. The Cloud Factory: Hugging Face Space ☁️🏭
*   **File:** `backend/hf/main.py` & `backend/hf/model_manager.py`
*   **Role:** The 24/7 execution node. It runs perpetually in the cloud, monitoring the market, executing trades, and performing ultra-lightweight online learning (1 epoch) to stay synchronized with live market shifts without overloading CPU limits.
*   **Resilience:** Uses HTTP polling and strict `Origin` bypassing to survive aggressive cloud proxy security measures. Automatically scans the Supabase `/history` on startup to ensure it boots with the absolute best brain available.

### 3. The Laboratory: Local Sandbox 💻🧪
*   **File:** `backend/sandbox_bot.py`
*   **Role:** The heavy-lifting development node. Identical in logic to the Cloud Factory, but capable of running heavier training cycles (multiple epochs) using local GPU/CPU resources. Any neural breakthroughs achieved here are pushed to Supabase, instantly upgrading the Cloud Factory.

### 4. The Command Center: Next.js Frontend 🎛️⚡
*   **Role:** A futuristic, real-time dashboard for the "Chief Financial Officer" (You).
*   **Features:**
    *   **Dynamic Node Switcher:** Instantly toggle the UI between monitoring the `Local` laboratory and the `Cloud` factory.
    *   **Sniper Projection:** Real-time visualization of the AI's predicted price targets.
    *   **The Vault:** Psychological tracking of harvested profits safely isolated from operational capital.
    *   **Emergency Protocol:** A 1-click "Panic Button" that force-liquidates all active asset exposures across the network into IDR and pauses the engine.

---

## 🛠️ Current Capabilities (What We Built)

*   [x] **Dual-Model Consensus:** Combines 1H (Macro Trend) and 5M (Micro Entry) neural networks for high-conviction signals.
*   [x] **Dynamic Position Sizing:** Lot sizes scale automatically (0.5x to 2.0x) based on the AI's real-time confidence level.
*   [x] **Volatility Guard:** Automated Stop-Loss and Take-Profit bounds calculated dynamically using the Average True Range (ATR) to breathe with the market.
*   [x] **Reinforcement Bias (RL):** The AI penalizes its own confidence threshold after a losing trade and rewards itself after a win, preventing stubborn losing streaks.
*   [x] **Neural Garbage Collection:** Automatically manages cloud storage by keeping only the 5 smartest historical models per timeframe.

---

## 🚀 To-Do / Roadmap (Phase 3: The Expansion)

### 📈 Multi-Asset Singularity (Priority: High)
Currently optimized for Crypto (BTC, ETH, SOL). The next phase is transforming it into an omni-market engine.
- [ ] **Forex Integration:** Integrate OANDA or similar API to pull `XAU/USD` (Gold) data for high-volatility scalping.
- [ ] **Stocks Integration:** Add US/ID equities (focusing on high-liquidity tech stocks).
- [ ] **Correlation Matrix:** Upgrade `process_df` so that Altcoins factor in BTC movements, and Stocks factor in S&P500 movements automatically.

### 📡 Operational Upgrades (Priority: Medium)
- [ ] **Telegram Command Bot:** Build a Telegram bot interface to receive "Salary" notifications (profitable trades) and allow remote `/panic_sell` commands directly from your phone.
- [ ] **Deep Reinforcement Learning:** Transition the `rl_bias` from a simple scalar (+0.05 / -0.07) to a lightweight Policy Gradient network to map specific market states to dynamic sizing decisions.

### 🎨 UI/UX Enhancements (Priority: Low)
- [ ] **Ambient Theme Switcher:** UI dynamically shifts colors (Emerald to Ruby) based on the Global Macro Trend (Bullish vs Bearish).
- [ ] **Advanced Charting:** Integrate TradingView Lightweight Charts on the Market page for a more professional candlestick view overlapping the AI Sniper Line.

---

## 🩺 Automated Health Diagnostics (Latest Run)
An automated API stress test was executed to verify the structural integrity of the newly implemented HTTP Polling and Database Synchronization mechanisms.

**Results (Local Node `sandbox_bot.py`):**
*   ✅ **`/api/all_status`**: Connection stable. Database successfully synced (`assets` array populated with Supabase RL logic).
*   ✅ **`/api/chart`**: Connection stable. Real-time OHLCV generation and AI Inference Engine are correctly populating the `prediction_history` array without TF retracing errors.

**Diagnostic Conclusion:** 
The transition from WebSocket to HTTP Polling is **100% successful and stable**. The `ModelManager` is correctly pulling legacy state from Supabase, resolving the previous "Blank Chart" and "Zero Profit" bugs.

**Immediate Next Action (Actionable To-Do):**
- [ ] **Monitor Cloud Memory Consumption:** Since the HF Cloud node now runs 24/7 with Online Learning enabled, we must monitor its RAM usage over the next 48 hours to ensure the `prediction_history` arrays (capped at 150) do not cause an Out-Of-Memory (OOM) crash in the Hugging Face free tier container.
