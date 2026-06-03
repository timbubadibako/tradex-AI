import requests
import json
import time

def test_endpoints():
    base_url = "http://127.0.0.1:8000"
    results = {"success": True, "details": []}
    
    try:
        # Test 1: System Status
        r1 = requests.get(f"{base_url}/api/all_status", timeout=5)
        if r1.status_code == 200:
            data = r1.json()
            if "assets" in data and "BTC" in data["assets"]:
                results["details"].append("✅ /api/all_status: Responded correctly with asset data.")
            else:
                results["success"] = False
                results["details"].append("❌ /api/all_status: Missing expected keys ('assets', 'BTC').")
        else:
            results["success"] = False
            results["details"].append(f"❌ /api/all_status: Failed with status code {r1.status_code}.")

        # Test 2: Chart & Prediction Data
        r2 = requests.get(f"{base_url}/api/chart", timeout=5)
        if r2.status_code == 200:
            data = r2.json()
            if "ohlcv" in data and "prediction" in data:
                results["details"].append("✅ /api/chart: Responded correctly with OHLCV and Prediction shapes.")
            else:
                results["success"] = False
                results["details"].append("❌ /api/chart: Missing expected keys ('ohlcv', 'prediction').")
        else:
            results["success"] = False
            results["details"].append(f"❌ /api/chart: Failed with status code {r2.status_code}.")
            
    except requests.exceptions.ConnectionError:
        results["success"] = False
        results["details"].append("❌ Connection Error: Is the local Uvicorn server running on port 8000?")
    except Exception as e:
        results["success"] = False
        results["details"].append(f"❌ Unexpected Error: {str(e)}")
        
    print(json.dumps(results, indent=2))

test_endpoints()
