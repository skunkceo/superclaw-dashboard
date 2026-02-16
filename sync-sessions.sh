#!/bin/bash
# Sync OpenClaw sessions data and usage stats for dashboard access
cp /root/.openclaw/agents/main/sessions/sessions.json /tmp/openclaw-sessions.json 2>/dev/null
chmod 644 /tmp/openclaw-sessions.json 2>/dev/null

# Sync usage data
/root/sync-usage.sh >/dev/null 2>&1
