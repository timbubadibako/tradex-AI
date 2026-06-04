#!/bin/bash
# Zenith AI Production Launcher (with Auto-Reload)
# Run this from the project root directory

export PYTHONPATH=$PYTHONPATH:.
export CUDA_VISIBLE_DEVICES=-1

echo "🚀 Launching Zenith AI Predictive Engine (Auto-Reload Active)..."

# Using python3 -m uvicorn to ensure it uses the environment's uvicorn
# --reload: restarts server when code changes
# --factory: can be used if we had a factory, but here we use the app instance
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir backend
