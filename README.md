# SuperClaw Dashboard

A modern dashboard for monitoring and managing your AI companion powered by [OpenClaw](https://github.com/openclaw/openclaw).

## Features

- **Real-time Agent Monitoring** — See main agent status and active sub-agents
- **Token Usage Tracking** — Monitor costs across models (Opus, Sonnet, Haiku)
- **Work Queue Management** — View backlog, in-progress tasks, and spawn agents
- **Cron Job Management** — Schedule and manage recurring tasks
- **Chat Interface** — Direct conversation with your AI
- **Workspace Browser** — View and edit workspace files (AGENTS.md, SOUL.md, etc.)
- **User Management** — Role-based access control (admin, edit, view)
- **Update Notifications** — Get notified when new versions are available

## Installation

### Via SuperClaw CLI (Recommended)

```bash
npx @skunkceo/superclaw init
```

This will set up a complete workspace including the dashboard.

### Manual Installation

```bash
npm install @skunkceo/superclaw-dashboard
```

## Configuration

The dashboard connects to your local OpenClaw gateway. It reads configuration from:

- `~/.openclaw/openclaw.json` — Gateway port and auth token
- Workspace files — AGENTS.md, SOUL.md, USER.md, etc.

No API keys or secrets are stored in the dashboard — all sensitive config comes from your local OpenClaw installation.

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

Or use PM2:

```bash
pm2 start npm --name "superclaw-dashboard" -- start
```

## User Management

Create your first admin user:

```bash
superclaw setup
```

Add additional users:

```bash
superclaw setup user add user@example.com --role edit
```

Roles:
- **admin** — Full access, can manage users
- **edit** — Can edit workspace files and chat
- **view** — Read-only access to dashboard

## Updating

The dashboard will show a notification banner when updates are available.

```bash
superclaw update
```

Or check for updates without installing:

```bash
superclaw update --check
```

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- SQLite (better-sqlite3)
- TypeScript

## Requirements

- Node.js 18+
- OpenClaw or OpenClaw running locally

## License

MIT

## Links

- [SuperClaw CLI](https://github.com/skunkceo/superclaw-cli)
- [OpenClaw](https://github.com/openclaw/openclaw)
- [Documentation](https://docs.clawd.bot)
