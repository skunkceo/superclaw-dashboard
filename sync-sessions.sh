#!/bin/bash
# Sync OpenClaw sessions data for dashboard access
cp /root/.openclaw/agents/main/sessions/sessions.json /tmp/openclaw-sessions.json 2>/dev/null
chmod 644 /tmp/openclaw-sessions.json 2>/dev/null
