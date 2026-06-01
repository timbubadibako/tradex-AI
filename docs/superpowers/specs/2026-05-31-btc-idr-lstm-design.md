# Design Spec: Advanced CNN-LSTM-Attention for BTC/IDR Prediction

**Date:** 2026-05-31  
**Topic:** Bitcoin (BTC) to IDR Price Prediction using Deep Learning (Hybrid Model)

## 1. Goal
Membangun model AI berbasis deep learning yang lebih canggih daripada model baseline (LSTM sederhana) untuk memprediksi harga penutupan (Close) BTC/IDR 1 jam ke depan menggunakan data historis 5 tahun.

## 2. Architecture: Hybrid CNN-LSTM-Attention
Model ini menggunakan pendekatan hibrida untuk menangkap pola spasial dan temporal secara maksimal.

- **CNN 1D Layer:** Mengekstrak fitur lokal dari sequence 60 jam terakhir (fitur spasial).
- **LSTM Layer:** Memodelkan dependensi temporal jangka panjang dengan output sequence.
- **Attention Mechanism:** Memberikan bobot pada langkah waktu (time steps) yang paling relevan bagi prediksi masa depan.
- **Dense Layers:** Pemrosesan akhir dengan aktivasi ReLU.
- **Output Layer:** Satu neuron linear untuk regresi harga.

## 3. Data Flow & Preprocessing
- **Source:** `btc_idr_1h_5years.csv` (OHLCV).
- **Engineered Features:**
  - Momentum: RSI, Stochastic Oscillator.
  - Trend: MACD, MACD Signal.
  - Volatility: Bollinger Bands, ATR (Average True Range).
  - Volume: OBV (On-Balance Volume).
- **Sequence Length:** 60 jam.
- **Scaling:** `MinMaxScaler` (0-1).
- **Data Splitting:** Time Series Split (80% Train, 10% Validation, 10% Test).

## 4. Evaluation & Metrics
- **Metrics:** MAE, RMSE, MAPE, dan R-Squared.
- **Early Stopping:** Berdasarkan `val_loss` dengan patience 10.
- **Visualization:** Plot perbandingan Real vs Predicted pada data test.
- **Backtesting:** Simulasi sinyal Buy/Sell sederhana berdasarkan threshold selisih prediksi.

## 5. Implementation Plan (Summary)
1. **Data Loading & Indicators:** Menggunakan `pandas` dan `ta-lib` (atau library `ta`).
2. **Preprocessing:** Refactoring kode windowing agar lebih modular.
3. **Model Building:** Menggunakan `tensorflow.keras` dengan kustomisasi layer Attention.
4. **Training:** Memanfaatkan GPU (RTX 3050 yang terdeteksi).
5. **Validation:** Evaluasi mendalam pada subset data test.
