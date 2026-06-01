# Design Spec: Trading AI Dashboard - Light Glassmorphism Edition

**Date:** 2026-05-31  
**Topic:** Frontend Dashboard for BTC/IDR AI Trading Bot

## 1. Goal
Membangun antarmuka web (Dashboard) yang modern, bersih, dan informatif untuk memantau performa bot trading AI secara real-time. Fokus utama adalah pada keindahan visual (UI) dan pengalaman pengguna (UX) yang intuitif.

## 2. Technical Stack
- **Framework:** Next.js 15 (App Router, TypeScript).
- **Styling:** Tailwind CSS + `lucide-react` (Icons).
- **Charts:** Apache ECharts (High customization for Candlestick & Area zones).
- **Data Fetching:** SWR (Auto-revalidation & caching).
- **Animation:** `framer-motion` (untuk transisi kartu glassmorphism yang smooth).

## 3. Visual Design (UI/UX)
- **Theme:** Light Mode Glassmorphism.
- **Background:** Soft Blue Gradient (`bg-gradient-to-br from-sky-50 via-white to-sky-50`).
- **Cards:** White translucent glass (`bg-white/70 backdrop-blur-md border border-white/20 shadow-xl`).
- **Accent Colors:** 
  - Soft Sky Blue (Primary).
  - Emerald Green (Buy/Profit).
  - Rose Red (Sell/Loss).
- **Typography:** Inter / Geist (Clean & Minimalist).

## 4. Layout: Bento Grid Dashboard
1. **Header:** Status bot (Online/Offline) dan Jam Real-time.
2. **Main Chart Card (Span 2/3):** Candlestick chart dengan 'Colored Zones'. Area hijau saat posisi Long/Buy, area merah saat Short/Sell (jika ada).
3. **Wallet Card (Right Top):** Saldo IDR, Saldo BTC, dan Total Equity (IDR).
4. **AI Stats Card (Right Bottom):** Win Rate (%), Total Trades, dan Profit/Loss percentage.
5. **Trade Logs (Bottom Wide):** Riwayat transaksi terbaru dengan status PnL.

## 5. Real-time Logic & Data Flow
- **Python Backend:** FastAPI running on `localhost:8000`.
- **Interval:** Refresh setiap 10 detik.
- **Endpoints:**
  - `GET /api/status`: Update balance & performance metrics.
  - `GET /api/chart`: Ambil data candlestick + signal AI.
  - `GET /api/trades`: List riwayat transaksi sandbox.

## 6. Interaction Features
- **Timeframe Toggle:** Tampilan tetap 1h (sinkron dengan AI), namun UI dipersiapkan untuk multi-timeframe di masa depan.
- **Hover Detail:** Tooltip cantik pada grafik yang menunjukkan OHLC secara mendetail.
- **Responsive:** Layout menyesuaikan diri untuk tampilan tablet dan desktop.
