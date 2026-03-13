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
  <a href="https://vadaski.github.io/va-claw">🌐 Website</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#features">Features</a> •
  <a href="#channels">Channels</a> •
  <a href="#vs-openclaw">vs OpenClaw</a>
</p>

> [中文文档](README.zh-CN.md)

---

## What is va-claw?

<p align="center">
<img src="docs/comic.svg" alt="va-claw comic strip: from session-reset pain to OpenClaw fleet" width="900"/>
</p>

**va-claw** is a minimal plugin that adds OpenClaw's three core superpowers to any CLI agent you already have:

| | Without va-claw | With va-claw |
|---|---|---|
| **Memory** | Session resets every time | Persistent SQLite memory, semantic search |
| **Identity** | Generic assistant | Named persona injected into every session |
| **Wake Loop** | You have to prompt it | Scheduled daemon wakes the agent for you |

> *No new gateway. No new CLI to learn. Just install the plugin and your existing `claude` or `codex` becomes persistent, self-aware, and autonomous.*

---

## Install via Skill (zero-effort setup)

The fastest way to install va-claw is to drop the install skill into any Claude Code or OpenCode session. The agent will handle everything — checking prerequisites, running the install, configuring identity, and starting the daemon.

```bash
# In any Claude Code or OpenCode session, run:
/install https://raw.githubusercontent.com/Vadaski/va-claw/main/skills/install-va-claw.md
```

Or add it as a persistent skill so any future agent can self-install va-claw:

```bash
va-claw skill add https://raw.githubusercontent.com/Vadaski/va-claw/main/skills/install-va-claw.md
```

Fleet management language support (`va-claw` + `claw` fleet status) is included by default after installation.

### Migrating from OpenClaw or another AI assistant

If you already have memories stored in OpenClaw or another Claude-based assistant, use the migration skill to let the agent package its own memories into va-claw — zero manual work:

```bash
/install https://raw.githubusercontent.com/Vadaski/va-claw/main/skills/migrate-to-va-claw.md
```

The agent will introspect its stored context, generate a ready-to-run shell script of `va-claw memory memorize` commands, and explain why the move is good for both agent and user.

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
va-claw memory recall "what was I working on"

# Check daemon health
va-claw status
```

### Tutorial use cases

**1. Query fleet status in natural language**

```bash
va-claw protocol --text
```

Outputs a fleet snapshot: daemon status, memory state, and the full list of running claws with their current status.

**2. Create and track a long-running claw**

```bash
va-claw claw add review-claw \
  --goal "Review PRs and summarize risks" \
  --status "running" \
  --tags "review,automation"
va-claw claw list
```

The output should include `review-claw` with its goal, status, and tags confirming the task is registered.

**3. Update a running claw**

```bash
va-claw claw set review-claw --status working --note "Investigating auth module"
va-claw claw heartbeat review-claw
```

Use this to record what the claw is actively doing and refresh its last-seen timestamp.

**4. Quick fleet overview from the CLI**

```bash
va-claw claw status
```

Returns a summary of all claws with their run states, plus daemon and service health.

**5. Remove a claw and verify the fleet**

```bash
va-claw claw remove review-claw
va-claw protocol --text
```

Confirms the claw is gone and the fleet snapshot reflects the updated state.

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

### 🕸 Fleet protocol for long-running claws

Once installed, you and your agent can query running claw status through natural language:

- "What are my claws doing?"
- "Show my claw fleet"
- "Give me a fleet snapshot"

This maps to:

```bash
va-claw protocol --text
```

Management operations remain through CLI:

```bash
va-claw claw list
va-claw claw add <name> --goal "..." --status idle
va-claw claw set <name> --status running
va-claw claw heartbeat <name>
va-claw claw remove <name>
```

### 🧠 Memory

Structured SQLite memory with full CRUD, Ebbinghaus forgetting curve, and weighted recall. Your agent doesn't just log outputs — it remembers, forgets, and gets smarter over time.

**Store a named memory:**

```bash
va-claw memory memorize "auth-pattern" \
  "Always use JWT with 1h expiry and refresh token rotation" \
  --tags auth,security \
  --importance 0.9 \
  --details "Single-use refresh tokens mandatory after Feb incident"
```

**Full CRUD:**

```bash
va-claw memory get auth-pattern                        # retrieve by key
va-claw memory update auth-pattern --importance 1.0    # patch fields
va-claw memory forget auth-pattern                     # delete one memory
va-claw memory clear                                   # wipe all
```

**Recall:**

```bash
va-claw memory recall "JWT authentication"   # weighted: tags > triggers > essence > details
va-claw memory list --limit 20               # recent entries
```

**Maintenance (Ebbinghaus model):**

```bash
va-claw memory consolidate   # prune faded memories, reinforce recently accessed
va-claw memory reflect       # Markdown summary grouped by tag
```

Every memory has `strength`, `importance`, and `decayTau`. High-importance memories decay ~3× slower. Accessing a memory reinforces it. `consolidate` runs the forgetting curve and cleans up dead entries automatically.

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

**Realistic `wakePrompt` example for a developer agent:**

```json
{
  "name": "Nova",
  "persona": "Precise and calm. Senior engineer mindset.",
  "systemPrompt": "Act with continuity. Check memory before starting.",
  "wakePrompt": "Open the current repository and do a quick operator health pass: inspect git status, note any uncommitted changes, check the most recent CI/test signals, identify the highest-risk file touched recently, and leave a short summary with the next concrete action if attention is needed.",
  "wakeTimeoutMs": 300000,
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

## Long-running considerations

If you plan to keep `va-claw` running for weeks or months, treat the wake loop like an always-on operator process: budget tokens, watch local disk growth, and rotate logs before they become noise.

**Token budget estimation:** a simple planning formula is `wakes per day × average tokens per wake`. Hourly wakes are `24/day`; every 15 minutes is `96/day`. If your prompt + tool output averages 1.5k tokens, an hourly loop is roughly `36k tokens/day` and a 15-minute loop is roughly `144k tokens/day`. Start with a conservative interval, then tighten it only when the wake output is consistently actionable.

**`memory.db` growth:** the SQLite store at `~/.va-claw/memory.db` grows with every saved wake. For short repo-health summaries, expect roughly low single-digit KB per wake; for verbose research or review loops it can climb much faster. A practical habit is to check size monthly with `du -h ~/.va-claw/memory.db`, run `va-claw memory consolidate` on a cadence, and avoid wake prompts that dump full diffs or long logs unless you actually need them remembered.

**`wake.log` rotation:** each wake also appends one JSON line to `~/.va-claw/wake.log`, including timestamp, duration, exit code, and the last 2 KB of combined output. Create the file on first run, then rotate it with your OS tooling before it grows indefinitely. A minimal `logrotate` example on Linux:

```conf
/home/you/.va-claw/wake.log {
  size 1M
  rotate 7
  copytruncate
  missingok
  notifempty
}
```

On macOS, the equivalent is usually a small `newsyslog.conf` rule or a periodic `mv ~/.va-claw/wake.log ~/.va-claw/wake.log.$(date +%F)` job. The important part is simple: keep a few recent log files, drop the oldest ones, and never let wake diagnostics grow without bound.

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

> **Security tip:** Before installing skills from unknown sources, vet them first with the [Skill Vetter](https://clawhub.ai/spclaudehome/Skill-vetter) — a zero-footprint skill that checks for red flags (credential access, outbound requests, obfuscated code) and produces a risk report before you commit.
>
> ```bash
> # Install the vetter once, use it forever
> va-claw skill add https://clawhub.ai/spclaudehome/Skill-vetter
> ```

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
va-claw protocol [--text]

# Identity
va-claw identity setup | show | edit

# Memory — full CRUD + Ebbinghaus lifecycle
va-claw memory memorize <key> <essence> [--tags t1,t2] [--details "..."] [--importance 0-1]
va-claw memory get <key>
va-claw memory update <key> [--essence "..."] [--tags "..."] [--importance 0-1] [--details "..."]
va-claw memory forget <key>
va-claw memory recall <query> [--limit <n>]
va-claw memory list [--limit <n>]
va-claw memory consolidate
va-claw memory reflect
va-claw memory clear

# Skills
va-claw skill list | add <path-or-url> | remove <name> | show <name>

# Long-running claw fleet
va-claw claw status
va-claw claw list
va-claw claw add <name> [--goal ...] [--status running|working|idle|waiting|error|offline|stopped] [--cli-command ...] [--note ...] [--tags ...]
va-claw claw set <name> [--goal ...] [--status ...] [--cli-command ...] [--note ...] [--tags ...] [--seen]
va-claw claw heartbeat <name>
va-claw claw remove <name>

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
