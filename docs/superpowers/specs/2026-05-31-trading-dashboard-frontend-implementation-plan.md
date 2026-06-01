# Implementation Plan: Trading AI Dashboard (Frontend)

## Phase 1: Environment & Setup
- [ ] Verify Next.js 15 installation in `frontend/`.
- [ ] Install dependencies:
    - `echarts`, `echarts-for-react` (Visualization)
    - `swr` (Data Fetching)
    - `lucide-react` (Icons)
    - `framer-motion` (Animations)
    - `clsx`, `tailwind-merge` (Utility for Tailwind)
- [ ] Setup folder structure: `components/dashboard/`, `hooks/`, `lib/utils.ts`.

## Phase 2: Core Components Development (Bento Grid)
- [ ] **Layout:** Create a responsive grid layout using Tailwind.
- [ ] **GlassCard:** Build a reusable wrapper component for the glassmorphism effect.
- [ ] **Header:** Implement bot status (dot indicator) and real-time clock.
- [ ] **Metrics Cards:** Develop `WalletCard` and `StatsCard` with soft blue accents.

## Phase 3: Advanced Charting (Apache ECharts)
- [ ] Create `TradingChart` component.
- [ ] Map OHLCV data from API to ECharts format.
- [ ] Implement 'Colored Zones' logic based on active positions.
- [ ] Add interactive tooltips and zoom features.

## Phase 4: Data Integration (SWR)
- [ ] Create custom hooks: `useBotStatus`, `useMarketData`, `useTradeHistory`.
- [ ] Implement auto-refresh logic (10s interval).
- [ ] Add loading states and error overlays (e.g., "Brain Disconnected").

## Phase 5: Polishing & Visual Effects
- [ ] Apply soft blue background gradients.
- [ ] Add `framer-motion` entrance animations for grid items.
- [ ] Ensure full responsiveness (Mobile/Tablet/Desktop).

## Phase 6: Final Review & Testing
- [ ] Cross-browser testing.
- [ ] Verify real-time sync with running `sandbox_bot.py`.
