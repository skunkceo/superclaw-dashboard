# SuperClaw Dashboard Deployment Notes

## OpenClaw Workspace Configuration

### How It Works
The dashboard reads the OpenClaw workspace path from the `.env` file:

```bash
# .env
OPENCLAW_WORKSPACE=/path/to/.openclaw/workspace
```

### Setup Methods

#### Option A: Automatic (Recommended)
Run the CLI setup command:
```bash
superclaw setup agents
```

This will:
1. Detect your OpenClaw workspace location
2. Create/update `.env` file with the correct path
3. Configure agents and routing rules

#### Option B: Manual
Create a `.env` file in the dashboard root:
```bash
echo "OPENCLAW_WORKSPACE=/root/.openclaw/workspace" > .env
```

Or if OpenClaw runs as a different user:
```bash
echo "OPENCLAW_WORKSPACE=/home/youruser/.openclaw/workspace" > .env
```

### Finding Your OpenClaw Workspace

**Method 1: Check OpenClaw status**
```bash
openclaw status --json | grep workspace
```

**Method 2: Common locations**
- `/root/.openclaw/workspace` (if OpenClaw runs as root)
- `/home/username/.openclaw/workspace` (if OpenClaw runs as user)
- `~/.openclaw/workspace` (current user's home)

### Verifying Configuration

**1. Check .env file exists:**
```bash
cat .env
```

**2. Restart dashboard:**
```bash
pm2 restart superclaw.skunkglobal.com
```

**3. Test agent list API:**
```bash
curl http://localhost:3001/api/agents/list
```

Should return agents, not an error.

### Troubleshooting

**Error: "OpenClaw workspace not found"**
- Check `.env` file exists and has correct path
- Verify path exists: `ls -la /path/from/.env`
- Ensure dashboard process can read the path (permissions)

**Error: "No agents configured"**
- Workspace path is correct but no agents created yet
- Run: `superclaw setup agents` to create standard agents

**Agents show but detail pages 404:**
- File permissions issue
- Run: `chmod 755 /path/to/.openclaw/workspace/agents`
- Run: `chmod 644 /path/to/.openclaw/workspace/agents/*/IDENTITY.md`

## File Permissions
All agent workspace files should be readable by the dashboard process user:
```bash
chmod 755 /root/.openclaw/workspace/agents
chmod 755 /root/.openclaw/workspace/agents/*/
chmod 644 /root/.openclaw/workspace/agents/*/*.md
```

## Environment Variables

### Required
- `OPENCLAW_WORKSPACE` - Path to OpenClaw workspace directory

### Optional
- `PORT` - Dashboard port (default: 3077)
- `NODE_ENV` - Environment (development|production)
- `SUPERCLAW_DATA_DIR` - Database location (default: ./data)

## PM2 Configuration Example

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

Or use `.env` file (recommended):
```json
{
  "name": "superclaw.skunkglobal.com",
  "script": "server.js",
  "cwd": "/home/mike/apps/websites/superclaw-dashboard",
  "env_file": "/home/mike/apps/websites/superclaw-dashboard/.env"
}
```

## Testing Checklist
- [ ] `.env` file exists with OPENCLAW_WORKSPACE
- [ ] `/agents` page loads and shows agent grid
- [ ] Individual agent pages (`/agents/[label]`) load successfully
- [ ] Memory files display correctly
- [ ] No "none" showing for inactive agents (shows "not active" instead)
- [ ] CLI setup creates agents that dashboard can read
