#!/bin/bash
# Zenith System Audit Script
python3 backend/dummy_main.py &
PY_PID=$!

cd frontend
npm run dev -- --port 3000 &
NEXT_PID=$!

echo "Waiting for Neural Synapses to hydrate (20s)..."
sleep 20

npx playwright test tests/zenith-singularity.spec.ts
RESULT=$?

# Cleanup
kill $PY_PID
kill $NEXT_PID

exit $RESULT
