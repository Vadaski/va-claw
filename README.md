<h1 align="center">va-claw</h1>

<p align="center">
  <b>Turn your Claude Code or OpenCode into an OpenClaw — in 30 seconds.</b>
</p>

<p align="center">
  <a href="https://github.com/Vadaski/va-claw/actions/workflows/ci.yml">
    <img src="https://github.com/Vadaski/va-claw/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://www.npmjs.com/package/va-claw">
    <img src="https://img.shields.io/npm/v/va-claw.svg" alt="npm">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/Vadaski/va-claw.svg" alt="License">
  </a>
  <a href="https://www.npmjs.com/package/va-claw">
    <img src="https://img.shields.io/npm/dm/va-claw.svg" alt="Downloads">
  </a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#features">Features</a> •
  <a href="#channels">Channels</a> •
  <a href="#vs-openclaw">vs OpenClaw</a>
</p>

---

## What is va-claw?

**va-claw** is a minimal plugin that adds OpenClaw's three core superpowers to any CLI agent you already have:

| | Without va-claw | With va-claw |
|---|---|---|
| **Memory** | Session resets every time | Persistent SQLite memory, semantic search |
| **Identity** | Generic assistant | Named persona injected into every session |
| **Wake Loop** | You have to prompt it | Scheduled daemon wakes the agent for you |

> *No new gateway. No new CLI to learn. Just install the plugin and your existing `claude` or `codex` becomes persistent, self-aware, and autonomous.*

---

## Quick Start

### Prerequisites

- **Node.js** >= 22
- **Claude Code** (`npm install -g @anthropic-ai/claude-code`) or **OpenCode / Codex** installed

### Install & go

```bash
npm install -g va-claw
va-claw install        # injects identity into ~/.claude/CLAUDE.md or ~/.codex/instructions.md
va-claw start          # starts the wake-loop daemon
```

That's it. Your CLI agent now has memory, an identity, and runs autonomously in the background.

### First steps

```bash
# See what your agent has been doing
va-claw memory list

# Search across all past wake outputs
va-claw memory search "what was I working on"

# Check daemon health
va-claw status
```

---

## How It Works

```
 ┌──────────────────┐       ┌──────────────────┐
 │   Claude Code    │       │  OpenCode/Codex  │
 └────────┬─────────┘       └────────┬─────────┘
          │  identity injected        │  identity injected
          │  via CLAUDE.md / instructions.md
          └──────────┬───────────────┘
                     │
          ┌──────────▼───────────┐
          │    va-claw Daemon    │
          │                      │
          │  ┌────────────────┐  │
          │  │  Wake Loop     │  │  ← cron schedule, runs silently
          │  │  (croner)      │  │
          │  └───────┬────────┘  │
          │          │           │
          │  ┌───────▼────────┐  │
          │  │  Memory Store  │  │  ← SQLite, ~/.va-claw/memory.db
          │  │  (node:sqlite) │  │
          │  └───────┬────────┘  │
          │          │           │
          │  ┌───────▼────────┐  │
          │  │  Skills Layer  │  │  ← Markdown-based, zero compile
          │  └────────────────┘  │
          └──────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐
    │ Discord │ │Telegram │ │  Slack  │
    └─────────┘ └─────────┘ └─────────┘
```

**One daemon. Local SQLite. Zero cloud dependency.** Wake outputs are automatically stored in memory so your next session always has context.

---

## Features

### 🧠 Memory

Local SQLite, zero config, persists across every session.

```bash
va-claw memory search "refactor auth"   # semantic search
va-claw memory list                     # recent entries
va-claw memory clear                    # start fresh
```

### 🎭 Identity

Define your agent's name, persona, and behavior once — injected automatically into every Claude Code or OpenCode session.

```bash
va-claw identity setup    # interactive wizard
va-claw identity show     # view current config
```

Config lives at `~/.va-claw/config.json`:

```json
{
  "name": "Nova",
  "persona": "Precise and calm. Senior engineer mindset.",
  "systemPrompt": "Act with continuity. Check memory before starting.",
  "wakePrompt": "Check repo status and summarize what needs attention.",
  "loopInterval": "0 * * * *"
}
```

### ⏰ Wake Loop

A local cron daemon that wakes your agent on a schedule and writes the output back into memory.

```bash
va-claw start      # start the daemon
va-claw stop       # stop the daemon
va-claw status     # check health + last wake time
```

Use cases: daily standup summaries, repo health checks, automated PR reviews, background research.

---

## Skills

Extend behavior with plain Markdown files — no compilation, no config:

```bash
va-claw skill add ./my-skill.md                          # local file
va-claw skill add https://example.com/skills/git.md      # remote URL

va-claw skill list
va-claw skill show <name>
va-claw skill remove <name>
```

A skill file looks like this:

```markdown
---
name: git-hygiene
description: Check for stale branches and large commits
version: 1.0.0
triggers:
  - git
  - branch
  - commit
---

When checking the repository, always:
1. List branches older than 30 days
2. Flag commits larger than 500 lines
3. Suggest a cleanup plan
```

---

## Channels

Connect your wake loop to Discord, Telegram, or Slack to receive outputs and send commands remotely.

### Discord

```bash
va-claw channel discord setup
va-claw channel discord start
va-claw channel discord status
```

### Telegram

```bash
va-claw channel telegram setup --token <bot-token>
va-claw channel telegram start
```

### Slack

```bash
va-claw channel slack setup --bot-token <xoxb-...> --app-token <xapp-...>
va-claw channel slack start
```

---

## Full CLI Reference

```bash
# Core
va-claw install [--for claude-code|codex|all]
va-claw start | stop | status | uninstall

# Identity
va-claw identity setup | show | edit

# Memory
va-claw memory search <query>
va-claw memory list [--limit <n>]
va-claw memory clear

# Skills
va-claw skill list | add <path-or-url> | remove <name> | show <name>

# Channels
va-claw channel discord  setup | start | stop | status
va-claw channel telegram setup --token <t> | start | stop | status
va-claw channel slack    setup --bot-token <t> --app-token <t> | start | stop | status
```

---

## vs OpenClaw

| | **va-claw** | **OpenClaw** |
|---|---|---|
| **Concept** | Plugin for your existing CLI | Standalone AI agent system |
| **Install** | `npm install -g va-claw` | Full gateway setup |
| **Agents** | Claude Code, OpenCode, Codex | Own runtime |
| **Memory** | SQLite (local) | SQLite + Markdown compaction |
| **Channels** | Discord, Telegram, Slack | WhatsApp, iMessage, + more |
| **Footprint** | ~2 MB, zero cloud deps | Full service stack |
| **Best for** | Devs who already use Claude Code / Codex | Users who want a dedicated agent |

**va-claw = OpenClaw's soul, Claude Code's body.** If you're already paying for Claude Code or OpenCode, don't run a separate agent stack — just add the three superpowers you're missing.

---

## Development

```bash
git clone https://github.com/Vadaski/va-claw.git
cd va-claw
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

## License

[MIT](LICENSE) © Vadaski
