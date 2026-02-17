# SuperClaw Dashboard Deployment Notes

## User & Path Issues

### Current Problem
SuperClaw CLI and OpenClaw run as different users, causing path mismatches:
- OpenClaw runs as: `root` → workspace at `/root/.openclaw/workspace`
- Dashboard runs as: `mike` → tries to read from `/home/mike/.openclaw/workspace`

### Current Workarounds
1. Dashboard API hardcodes `/root/.openclaw/workspace` path
2. Agents created by root are readable (644 permissions)

### Proper Solutions (Pick One)

#### Option A: Environment Variable
Set `OPENCLAW_WORKSPACE=/root/.openclaw/workspace` in dashboard PM2 config:
```json
{
  "name": "superclaw.skunkglobal.com",
  "script": "server.js",
  "cwd": "/home/mike/apps/websites/superclaw-dashboard",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3001",
    "OPENCLAW_WORKSPACE": "/root/.openclaw/workspace"
  }
}
```

#### Option B: Symlink
```bash
sudo -u mike mkdir -p /home/mike/.openclaw
sudo -u mike ln -s /root/.openclaw/workspace /home/mike/.openclaw/workspace
```

#### Option C: Run Dashboard as Root
**Not recommended** - bad security practice

#### Option D: OpenClaw User Service
Run OpenClaw as `mike` user instead of root:
1. Move `/root/.openclaw` to `/home/mike/.openclaw`
2. Update systemd service to run as `mike`
3. Both dashboard and OpenClaw share same workspace

### Recommended: Option D
Most sustainable long-term solution. Both services run as same user.

## File Permissions
All agent workspace files are created with 644 (readable by all), so cross-user reading works.

## Testing Checklist
- [ ] `/agents` page loads and shows agent grid
- [ ] Individual agent pages (`/agents/[label]`) load successfully
- [ ] Memory files display correctly
- [ ] No "none" showing for inactive agents (shows "not active" instead)
- [ ] CLI setup creates agents that dashboard can read
