# Zenith Singularity 🌌

**Autonomous Multi-Asset Neural Trading Engine**

Zenith Singularity adalah ekosistem trading AI canggih yang dirancang untuk eksekusi pasar otonom 24/7. Menggunakan arsitektur *Hybrid Intelligence*, sistem ini menggabungkan *Deep Learning* (LSTM & Conv1D) untuk prediksi harga dengan sistem *Reinforcement Learning* untuk adaptasi pasar secara *real-time*.

## 🏗️ Arsitektur Sistem
- **Engine (Backend)**: Python FastAPI dengan model TensorFlow, menangani inferensi AI dan logika trading.
- **Memory (Database)**: Supabase untuk penyimpanan state neural, ledger transaksi, dan *checkpoint* model.
- **Command Center (Frontend)**: Dashboard Next.js untuk monitoring, visualisasi chart, dan intervensi manual.

## 🚀 Instalasi

### Prasyarat
- Python 3.11+
- Node.js 18+
- Supabase Project

### Backend
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat virtual environment dan instal dependensi:
   ```bash
   python -m venv venv
   source venv/bin/activate  # atau .\venv\Scripts\activate di Windows
   pip install -r requirements.txt
   ```
3. Konfigurasi file `.env` di dalam folder `backend/`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_service_role_key
   ```
4. Jalankan bot:
   ```bash
   python sandbox_bot.py
   ```

### Frontend
1. Masuk ke folder frontend:
   ```bash
   cd frontend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Konfigurasi `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Jalankan server:
   ```bash
   npm run dev
   ```

## 🛠️ Maintenance & Evolution
Sistem ini mendukung *Cloud-Centric Model Storage*. Model terbaik secara otomatis diunggah ke Supabase Storage, dan sistem melakukan pembersihan berkala (*Smart 5 Model History*) untuk memastikan performa tetap optimal.

---
*Zenith Singularity - Autonomous Trading Ecosystem*
