# Design Spec: Zenith AI Trading Dashboard (The Factory Edition)

**Date:** 2026-05-31  
**Author:** Zenith AI Assistant  
**Status:** Approved

## 1. Goal
Membangun dashboard trading kelas profesional yang sangat transparan, responsif, dan indah secara visual. Dashboard ini harus memungkinkan pengguna untuk memantau performa AI antar aset (BTC, ETH, SOL), mengganti timeframe (1H, 5M), dan melihat alasan teknis di balik setiap keputusan eksekusi bot secara real-time.

## 2. Technical Stack
- **Framework:** Next.js 15 (App Router).
- **Styling:** Tailwind CSS (Light Mode Glassmorphism).
- **Visualization:** Apache ECharts (High-precision Candlestick & Overlays).
- **State Management:** SWR (Real-time Sync with FastAPI).
- **Animations:** Framer Motion (Bento card transitions).

## 3. Visual System: Light Glassmorphism
- **Background:** Soft blue-sky gradient (`from-sky-50 to-white`).
- **Cards:** Glassmorphic white panes (`bg-white/70 backdrop-blur-xl border-white/60 shadow-lg`).
- **Interactions:** Smooth hover effects, 100vh layout with hidden scrollbars.

## 4. Bento Grid Hierarchy (Optimized 3:1)

### Area Konten Utama (75% Width)
1. **Master Chart Card & AI Console:**
   - **Visual:** High-precision Candlestick.
   - **Controls:** Subtle icons in corner for layer toggles (Price, AI Trace, Target).
   - **AI Console (Bottom Bar):** Projection (1H/5M), Conviction Score, and Neural Health/Trend.
2. **Execution Ledger Card (Below Chart):**
   - Detailed transaction table with **Reasoning Column** (Logic why bot fired: OBI level, Confidence at entry, Macro state).

### Area Sidebar (25% Width)
1. **Asset Hub (Card 1):** Wallet balance + Portfolio specific to the active chart coin (e.g., "Owned: 1.2 BTC").
2. **Performance Hub (Card 2):** Real-time Win Rate, MAPE Accuracy, and **Manual Overrides** (Amber/Orange buttons with confirmation pop-ups).
3. **Execution Pipeline (Card 3):** Live checklist status for algorithmic triggers (Macro Sync, WOBI Strength, Confidence Threshold).
4. **Liquidity Power:** Vertical "Thermometer" OBI Meter at the edge of the sidebar.

## 5. Hybrid Data & State Architecture (June 2026 Revision)
Untuk performa maksimal dan menghindari "Amnesia" saat ganti koin:

### A. Next.js Data Fetching
- **Native WebSocket:** Digunakan khusus untuk **Master Chart** dan **Vertical OBI Meter** (High-Frequency updates).
- **SWR Polling (10s):** Digunakan untuk data **Wallet**, **Performance Hub**, dan **Execution Ledger** (Low-Frequency).

### B. Backend Persistence & Background Learning
- **Persistent Asset Mapping:** Backend menyimpan semua model (BTC, ETH, SOL) di RAM secara simultan dalam *Dictionary Mapping*.
- **Ghosting Learning:** Proses *Online Learning* tetap berjalan di background untuk semua koin terdaftar, meskipun koin tersebut sedang tidak aktif dipantau di UI.
- **Model Checkpointing:** Melakukan `model.save()` otomatis setiap 1 jam untuk mengamankan bobot hasil belajar terbaru.

## 7. Revisions & Safety Guards
- **Visual Contrast:** Menggunakan `text-slate-900` untuk keterbacaan maksimal di Light Mode.
- **Loading Skeletons:** Animasi `pulse` pada kartu saat `Turbo Switch` (pindah koin/timeframe) sedang memproses data.
- **Accidental Execution Guard:** Modal konfirmasi bertingkat saat user menekan tombol Manual Buy/Sell.

