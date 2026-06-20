#!/usr/bin/env python3
"""Aegis Godmode v2.20 -- Cloudflare Data Bridge. Sends MT5 CSV data to live dashboard."""
import csv
import json
import time
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import urllib.request
import urllib.error

# ============================================================================
# CONFIGURATION
# ============================================================================
API_BASE_URL = "https://api-v2.staxpilot.com"

MT5_COMMON_PATH = Path("C:/Users/Administrator/AppData/Roaming/MetaQuotes/Terminal/Common/Files")
MT5_LOCAL_PATH = Path("C:/Users/Administrator/AppData/Roaming/MetaQuotes/Terminal/C837FBC196897F5626BEC21079440A61/MQL5/Files")

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)
BRIDGE_LOG = LOG_DIR / "bridge_sync.jsonl"
ERROR_LOG = LOG_DIR / "bridge_errors.jsonl"

# Magic number mapping
MAGIC_CONFIG = {
    31337: {"name": "Forex", "symbols": ["EURUSD", "GBPUSD", "USDJPY"], "broker": "PepperstoneUK-Demo"},
    31338: {"name": "Crypto", "symbols": ["BTCUSD", "ETHUSD", "LTCUSD"], "broker": "PepperstoneUK-Demo"},
    31339: {"name": "Indices", "symbols": ["NAS100", "US30", "GER40", "UK100"], "broker": "PepperstoneUK-Demo"},
    31340: {"name": "Metals", "symbols": ["XAUUSD", "XAGUSD"], "broker": "PepperstoneUK-Demo"},
}

SYNC_INTERVAL_SECONDS = 30


# ============================================================================
# HTTP API CLIENT
# ============================================================================
class CloudflareAPIClient:
    """Client for the Cloudflare Workers API."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
    
    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Tuple[bool, Dict]:
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(data).encode("utf-8") if data else None
        req = urllib.request.Request(url, data=body, method=method, headers=self.headers)
        
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return True, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            try:
                error_body = json.loads(e.read().decode("utf-8"))
            except:
                error_body = {"error": str(e)}
            return False, {"status": e.code, "error": error_body}
        except Exception as e:
            return False, {"error": str(e)}
    
    def health_check(self) -> bool:
        ok, resp = self._request("GET", "/api/health")
        return ok and resp.get("status") in ("healthy", "degraded")
    
    def send_trades(self, trades: List[Dict]) -> bool:
        ok, resp = self._request("POST", "/api/trades", {"trades": trades})
        return ok
    
    def send_signals(self, signals: List[Dict]) -> bool:
        ok, resp = self._request("POST", "/api/signals", {"signals": signals})
        return ok
    
    def send_metrics(self, metrics: Dict) -> bool:
        ok, resp = self._request("POST", "/api/metrics", metrics)
        return ok


# ============================================================================
# CSV READER
# ============================================================================
class MT5CSVReader:
    """Reads MT5 CSV export files (UTF-16, tab-delimited)."""
    
    @staticmethod
    def read_history_csv(filepath: Path) -> List[Dict]:
        """Read Aegis_Godmode_History_*.csv files."""
        if not filepath.exists():
            return []
        
        rows = []
        try:
            with open(filepath, "r", encoding="utf-16") as f:
                reader = csv.reader(f, delimiter="\t")
                header = next(reader, None)
                if not header:
                    return []
                
                for row in reader:
                    if len(row) < len(header):
                        continue
                    row_dict = {}
                    for i, col in enumerate(header):
                        row_dict[col] = row[i] if i < len(row) else ""
                    rows.append(row_dict)
        except Exception as e:
            print(f"[ERR] Failed to read {filepath}: {e}")
        
        return rows
    
    @staticmethod
    def read_ml_csv(filepath: Path) -> List[Dict]:
        """Read Aegis_ML_*.csv files."""
        if not filepath.exists():
            return []
        
        rows = []
        try:
            with open(filepath, "r", encoding="utf-16") as f:
                reader = csv.reader(f, delimiter="\t")
                header = next(reader, None)
                if not header:
                    return []
                
                for row in reader:
                    if len(row) < len(header):
                        continue
                    row_dict = {}
                    for i, col in enumerate(header):
                        row_dict[col] = row[i] if i < len(row) else ""
                    rows.append(row_dict)
        except Exception as e:
            print(f"[ERR] Failed to read {filepath}: {e}")
        
        return rows


# ============================================================================
# DATA CONVERTER
# ============================================================================
class DataConverter:
    """Converts MT5 CSV rows to API-compatible JSON."""
    
    @staticmethod
    def history_to_metrics(rows: List[Dict], magic: int) -> Dict:
        """Convert history rows to dashboard metrics."""
        if not rows:
            return {}
        
        config = MAGIC_CONFIG.get(magic, {})
        latest = rows[-1]
        
        total_trades = sum(int(float(r.get("Trades", 0))) for r in rows)
        total_wins = sum(int(float(r.get("Wins", 0))) for r in rows)
        total_losses = sum(int(float(r.get("Losses", 0))) for r in rows)
        total_profit = sum(float(r.get("NetProfit", 0)) for r in rows)
        
        win_rate = (total_wins / total_trades * 100) if total_trades > 0 else 0
        
        return {
            "account_id": str(magic),
            "account_name": config.get("name", "Unknown"),
            "broker": config.get("broker", "Unknown"),
            "timestamp": datetime.now().isoformat(),
            "total_trades": total_trades,
            "wins": total_wins,
            "losses": total_losses,
            "win_rate": round(win_rate, 2),
            "net_profit": round(total_profit, 2),
            "daily_trades": int(float(latest.get("Trades", 0))),
            "daily_wins": int(float(latest.get("Wins", 0))),
            "daily_losses": int(float(latest.get("Losses", 0))),
            "daily_win_rate": float(latest.get("WinRate", 0)),
            "daily_profit": float(latest.get("NetProfit", 0)),
            "symbols": config.get("symbols", []),
        }
    
    @staticmethod
    def ml_to_signals(rows: List[Dict], asset_class: str) -> List[Dict]:
        """Convert ML data rows to trading signals."""
        signals = []
        
        for row in rows[-10:]:
            try:
                signal = {
                    "timestamp": row.get("timestamp", ""),
                    "symbol": row.get("symbol", ""),
                    "price": float(row.get("close", 0)),
                    "atr": float(row.get("atr", 0)),
                    "rsi": float(row.get("rsi14", 0)),
                    "ma50": float(row.get("ma50", 0)),
                    "ma200": float(row.get("ma200", 0)),
                    "volume": float(row.get("volume", 0)),
                    "market_regime": row.get("marketRegime", "unknown"),
                    "asset_class": asset_class,
                    "equity": float(row.get("equity", 0)),
                    "open_positions": int(row.get("openPositions", 0)),
                }
                signals.append(signal)
            except (ValueError, KeyError):
                continue
        
        return signals


# ============================================================================
# MAIN BRIDGE
# ============================================================================
class AegisDataBridge:
    """Main bridge: reads MT5 CSV files and syncs to Cloudflare dashboard."""
    
    def __init__(self):
        self.api = CloudflareAPIClient(API_BASE_URL)
        self.reader = MT5CSVReader()
        self.converter = DataConverter()
        self.last_sync = None
        self.stats = {"syncs": 0, "trades_sent": 0, "errors": 0}
    
    def log_sync(self, data: Dict):
        with open(BRIDGE_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps({"timestamp": datetime.now().isoformat(), **data}) + "\n")
    
    def log_error(self, error: str):
        with open(ERROR_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps({"timestamp": datetime.now().isoformat(), "error": error}) + "\n")
        self.stats["errors"] += 1
    
    def sync_history(self, magic: int) -> bool:
        """Sync trade history for a magic number."""
        filepath = MT5_COMMON_PATH / f"Aegis_Godmode_History_{magic}.csv"
        rows = self.reader.read_history_csv(filepath)
        
        if not rows:
            print(f"  [SKIP] No history data for magic {magic}")
            return False
        
        metrics = self.converter.history_to_metrics(rows, magic)
        if metrics:
            success = self.api.send_metrics(metrics)
            if success:
                print(f"  [OK] Metrics synced for {MAGIC_CONFIG[magic]['name']}: {metrics['daily_trades']} trades today")
                return True
            else:
                self.log_error(f"Failed to send metrics for magic {magic}")
        
        return False
    
    def sync_ml_data(self, asset_class: str) -> bool:
        """Sync ML data for an asset class."""
        filename = f"Aegis_ML_{asset_class}.csv"
        filepath = MT5_COMMON_PATH / filename
        
        if not filepath.exists():
            alt_names = {"Metals": "Gold"}
            alt = alt_names.get(asset_class)
            if alt:
                filepath = MT5_COMMON_PATH / f"Aegis_ML_{alt}.csv"
        
        try:
            rows = self.reader.read_ml_csv(filepath)
        except PermissionError:
            print(f"  [SKIP] MT5 has {asset_class} ML file locked (normal when running)")
            return False
        
        if not rows:
            print(f"  [SKIP] No ML data for {asset_class}")
            return False
        
        signals = self.converter.ml_to_signals(rows, asset_class)
        if signals:
            success = self.api.send_signals(signals)
            if success:
                print(f"  [OK] {len(signals)} signals synced for {asset_class}")
                return True
            else:
                self.log_error(f"Failed to send signals for {asset_class}")
        
        return False
    
    def full_sync(self) -> Dict:
        """Perform a full sync of all data."""
        print(f"\n{'='*60}")
        print(f"[SYNC] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        results = {"metrics": 0, "signals": 0, "errors": []}
        
        if not self.api.health_check():
            msg = "API health check failed!"
            print(f"[ERR] {msg}")
            self.log_error(msg)
            results["errors"].append(msg)
            return results
        
        print("[OK] API connection healthy")
        
        print("\n[1] Syncing trade history...")
        for magic in MAGIC_CONFIG.keys():
            if self.sync_history(magic):
                results["metrics"] += 1
        
        print("\n[2] Syncing ML signals...")
        for asset_class in ["Forex", "Crypto", "Indices", "Metals"]:
            if self.sync_ml_data(asset_class):
                results["signals"] += 1
        
        self.last_sync = datetime.now()
        self.stats["syncs"] += 1
        
        print(f"\n[SUMMARY] Synced: {results['metrics']} metrics, {results['signals']} signal sets")
        self.log_sync(results)
        
        return results
    
    def run(self, interval: int = SYNC_INTERVAL_SECONDS):
        """Run continuous sync loop."""
        print(f"""
{'='*60}
  AEGIS GODMODE v2.20 -- Cloudflare Data Bridge
{'='*60}
  API Endpoint: {API_BASE_URL}
  Sync Interval: {interval}s
  
  Press Ctrl+C to stop
{'='*60}
""")
        
        try:
            while True:
                self.full_sync()
                print(f"\n[STATS] Total syncs: {self.stats['syncs']} | Errors: {self.stats['errors']}")
                print(f"[WAIT] Next sync in {interval}s... (Ctrl+C to stop)")
                for _ in range(interval):
                    time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n[BYE] Bridge stopped by user")
            print(f"[STATS] Total syncs: {self.stats['syncs']} | Errors: {self.stats['errors']}")


# ============================================================================
# ONE-TIME SYNC
# ============================================================================
def sync_once():
    """Run a single sync (for scheduled tasks)."""
    bridge = AegisDataBridge()
    return bridge.full_sync()


# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Aegis Godmode Cloudflare Data Bridge")
    parser.add_argument("--once", action="store_true", help="Sync once and exit")
    parser.add_argument("--interval", type=int, default=SYNC_INTERVAL_SECONDS, help="Sync interval in seconds")
    args = parser.parse_args()
    
    bridge = AegisDataBridge()
    
    if args.once:
        bridge.full_sync()
    else:
        bridge.run(interval=args.interval)
