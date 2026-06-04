from datetime import datetime
from backend.core.state import asset_states, global_state

class TradingSandbox:
    def __init__(self, idr, btc):
        self.balance_idr = idr
        self.btc_holdings = btc
        self.realized_pnl = 0.0
        self.active_position = None # 'LONG' or 'SHORT'
        self.entry_price = 0
        self.daily_pnl_start = 0.0
        self.daily_equity_start = idr + (0.5 * 1000000000) # Placeholder starting equity
        self.active_lot = 0.0

    def _fee(self):
        return global_state["trading_params"].get("trading_fee", 0.001)

    def get_net_pnl_idr(self, current_price):
        floating = 0.0
        if self.active_position == 'LONG':
            floating = (current_price - self.entry_price) * self.active_lot
        elif self.active_position == 'SHORT':
            floating = (self.entry_price - current_price) * self.active_lot
        return self.realized_pnl + floating

    def open_long(self, coin, price, lot):
        if self.active_position is None and self.balance_idr >= (lot * price):
            self.active_position = 'LONG'
            self.entry_price = price
            self.active_lot = lot
            self.balance_idr -= (lot * price) * (1 + self._fee())
            self.btc_holdings += lot
            
            trade = {'coin': coin, 'type': 'OPEN_LONG', 'price': price, 'lot': lot, 'time': datetime.now().isoformat(), 'pnl': 0, 'status': 'OPEN'}
            asset_states[coin]['trade_history'].insert(0, trade)
            return trade
        return None

    def close_long(self, coin, price):
        if self.active_position == 'LONG':
            rev = (self.active_lot * price) * (1 - self._fee())
            pnl = rev - (self.active_lot * self.entry_price * (1 + self._fee()))
            self.balance_idr += rev
            self.btc_holdings -= self.active_lot
            self.realized_pnl += pnl
            self.active_position = None
            asset_states[coin]['rl_reward'] += pnl
            
            trade = {'coin': coin, 'type': 'CLOSE_LONG', 'price': price, 'lot': self.active_lot, 'time': datetime.now().isoformat(), 'pnl': pnl, 'status': 'CLOSED'}
            asset_states[coin]['trade_history'].insert(0, trade)
            return trade
        return None

    def open_short(self, coin, price, lot):
        if self.active_position is None:
            self.active_position = 'SHORT'
            self.entry_price = price
            self.active_lot = lot
            self.btc_holdings -= lot
            
            trade = {'coin': coin, 'type': 'OPEN_SHORT', 'price': price, 'lot': lot, 'time': datetime.now().isoformat(), 'pnl': 0, 'status': 'OPEN'}
            asset_states[coin]['trade_history'].insert(0, trade)
            return trade
        return None

    def close_short(self, coin, price):
        if self.active_position == 'SHORT':
            cost = (self.active_lot * price) * (1 + self._fee())
            rev = (self.active_lot * self.entry_price) * (1 - self._fee())
            pnl = rev - cost
            self.balance_idr += pnl
            self.btc_holdings += self.active_lot
            self.realized_pnl += pnl
            self.active_position = None
            asset_states[coin]['rl_reward'] += pnl
            
            trade = {'coin': coin, 'type': 'CLOSE_SHORT', 'price': price, 'lot': self.active_lot, 'time': datetime.now().isoformat(), 'pnl': pnl, 'status': 'CLOSED'}
            asset_states[coin]['trade_history'].insert(0, trade)
            return trade
        return None
