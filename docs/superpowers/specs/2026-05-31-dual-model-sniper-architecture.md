# Design Spec: Dual-Model Sniper Architecture (Multi-Asset)

**Date:** 2026-05-31  
**Author:** AI Assistant for Pajril  
**Status:** Approved

## 1. Goal
Membangun sistem trading multi-asset (BTC, ETH, SOL) yang menggabungkan analisis tren jangka panjang (1H) dengan eksekusi tajam jangka pendek (5M) menggunakan arsitektur **Model Manager Centralized**.
## 2. Model Hierarchy & Learning Strategy (Enhanced)
Setiap koin memiliki dua model independen dengan fitur tambahan:
- **Fitur Baru (Volume SMA 9):** AI sekarang mendeteksi apakah kenaikan harga didukung oleh volume yang sehat.
- **BTC Correlation (Anchor Fitur):** Model ETH dan SOL kini menerima input harga & volume BTC agar tidak terjebak saat BTC crash.

## 3. The "Super-Brain" Decision Logic
Bot hanya akan melakukan eksekusi jika melewati 4 lapisan filter:
1. **Consensus:** Arah 1H (Macro) setuju dengan arah 5M (Micro).
2. **Confidence:** Skor keyakinan AI > 70%.
3. **Liquidity Check (Order Book Imbalance):** Mengukur ketebalan antrean bid vs ask secara real-time. Minimal OBI > 0.1 untuk Buy.
4. **Volatility Guard (ATR):** Menyesuaikan jarak Stop Loss dan Take Profit secara dinamis berdasarkan lebar candle terakhir.

## 4. Model Manager (`model_manager.py`)
- **Auto-Retrainer:** Menjalankan incremental fit secara sekuensial.
- **Quant Engine:** Menghitung OBI dan ATR tiap 10 detik untuk dikirim ke Dashboard.

## 6. Target Metrics (Revised by 3.5 Flash)
- **MAPE Goal 1H (Macro):** < 0.5% (Akurasi tinggi pada tren besar).
- **MAPE Goal 5M (Micro):** < 2.0% (Toleransi noise market untuk scalping).
- **Order Book Imbalance (OBI) Threshold:** > 0.3 (Strong Support).

- **Micro Data:** 120 candle (5M) untuk indikator Stochastic, RSI-5, Volume Velocity.
- **Storage:** Model disimpan dalam format `.keras` dan Scaler dalam `.pkl` di subfolder koin masing-masing.

## 6. Target Metrics
- **Winrate Goal:** > 65% (dengan filter consensus).
- **MAPE Goal:** < 1.0% untuk 1H, < 0.5% untuk 5M.
