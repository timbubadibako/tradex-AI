# Design Spec: Zenith Micro-Aggressive Scalper (Debt-Based)

**Date:** 2026-06-02  
**Author:** Gemini CLI  
**Status:** Draft

## 1. Vision
Transformasi sistem trading dari pengelolaan aset total menjadi sistem **Cash-Flow Scalper** yang fokus pada pencapaian target profit harian (Daily Harvest) dengan modal IDR kecil dan pengelolaan aset "utang" (0.5 BTC/ETH/SOL).

## 2. Portfolio & Accounting Logic
Sistem tidak lagi menghitung total ekuitas sebagai parameter utama, melainkan fokus pada selisih (PnL):
- **Baseline Assets:** 0.5 BTC, 0.5 ETH, 0.5 SOL. Aset ini dianggap sebagai "pinjaman".
- **Absolute PnL:** Keuntungan dihitung dalam nilai Rupiah bersih dari hasil scalping di atas baseline.
- **ROI:** Diabaikan (fokus pada angka absolut Rp).

## 3. The Daily Harvest (70/30 Rule)
Siklus harian untuk mengelola profit yang didapat:
- **Daily Target:** Default Rp 100.000 (Dapat diubah via UI).
- **Execution Time:** Setiap pukul 00:00 (Reset Day).
- **Allocation:**
    - **70% (Re-investment):** Profit tetap tinggal di saldo operasional (Compounding).
    - **30% (Withdrawal):** Profit dipindahkan ke statistik "The Vault" (Gaji User).
- **Example:** Jika hari ini untung Rp 100.000, maka Rp 70.000 menjadi tambahan modal operasional besok, dan Rp 30.000 dicatat sebagai pendapatan tetap user.

## 4. Manual Override System (Safety Button)
Panel kontrol untuk menyesuaikan "keberanian" bot secara real-time.
- **Default Mode (Safety ON):**
    - Confidence Threshold: 75%
    - Macro Consensus (1H): Required
    - OBI Filter: Strict (> 0.1)
- **Manual Mode (Safety CLICKED):**
    - Membuka **Sliders** untuk mengatur nilai parameter secara bebas.
    - **Confidence Slider:** Rentang 51% - 95%.
    - **OBI Sensitivity Slider:** Rentang 0.0 - 0.5.
    - **Macro Toggle:** ON/OFF (Jika OFF, bot hanya peduli pada timeframe 5M).
- **Auto-Reset:** Saat Manual Mode dimatikan, semua nilai slider kembali (snapback) ke posisi Default Mode.

## 5. UI/UX Components
- **Daily Target Tracker:** Progress bar menuju Rp 100.000.
- **The Vault Card:** Menampilkan akumulasi total profit 30% yang telah dikumpulkan.
- **Brave Control Panel:** Area interaktif untuk sliders dan toggle saat Safety Button aktif.
- **PnL Timeline:** Grafik garis sederhana yang menunjukkan fluktuasi PnL bersih harian.

## 6. Backend Implementation Changes
- **Database Schema:** Tambahkan tabel `daily_harvest` untuk mencatat rekap harian (Date, PnL, Reinvested, Withdrawn).
- **State Management:** `asset_states` akan menyimpan variabel `manual_override_active` dan parameter dinamis yang dikirim dari UI.
- **Execution Loop:** Update `fast_ticker_loop` di `sandbox_bot.py` untuk menggunakan threshold dari state dinamis.
