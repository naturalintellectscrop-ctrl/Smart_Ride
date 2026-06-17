#!/bin/bash
# Dev server watchdog - restarts bun run dev if it crashes
# Fully detached via setsid by the caller
cd /home/z/my-project
echo "[$(date)] Watchdog started" >> dev.log
while true; do
  # Start dev server
  bun run dev >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Dev server exited with code $EXIT_CODE, restarting in 3s..." >> dev.log
  sleep 3
done
