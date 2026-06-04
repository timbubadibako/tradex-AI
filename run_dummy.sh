#!/bin/bash
# Zenith AI Dummy Launcher
# Use this only for frontend testing / simulations

export PYTHONPATH=$PYTHONPATH:.
export CUDA_VISIBLE_DEVICES=-1

echo "🧪 Launching Zenith AI Mock Engine (Simulation Mode)..."
python3 -m backend.dummy_main
