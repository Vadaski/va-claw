---
name: install-va-claw
description: Install and configure va-claw — persistent memory, identity, and wake-loop for Claude Code, OpenCode, or Codex
version: 1.0.0
triggers:
  - install va-claw
  - setup va-claw
  - va-claw
  - persistent memory
  - wake loop
  - agent memory
---

# Install va-claw

va-claw gives your CLI agent (Claude Code / OpenCode / Codex) persistent memory, a custom identity, and a scheduled wake-loop — turning it into a continuously running autonomous agent.

## Prerequisites check

First verify Node.js version (must be ≥22):

```bash
node --version
```

Also verify you have at least one supported CLI agent installed:

```bash
# Check Claude Code
claude --version 2>/dev/null && echo "✓ Claude Code found" || echo "✗ Claude Code not found"

# Check OpenCode
opencode --version 2>/dev/null && echo "✓ OpenCode found" || echo "✗ OpenCode not found"

# Check Codex
codex --version 2>/dev/null && echo "✓ Codex found" || echo "✗ Codex not found"
```

## Step 1 — Install va-claw globally

```bash
npm install -g va-claw
```

Verify the installation:

```bash
va-claw --version
```

## Step 2 — Set up your identity

Run the interactive identity wizard. This defines your agent's name, persona, system prompt, wake prompt, and loop schedule:

```bash
va-claw identity setup
```

You'll be asked to provide:
- **Name**: Your agent's identity (e.g. "Nova")
- **Persona**: Tone and style (e.g. "Precise, calm, senior engineer mindset")
- **System prompt**: Base behavior (e.g. "Check memory before starting any task")
- **Wake prompt**: What to do on each scheduled wake (e.g. "Review repo health and summarize what needs attention")
- **Loop interval**: Cron expression (e.g. `0 * * * *` for hourly, `*/30 * * * *` for every 30 min)

## Step 3 — Install identity into your CLI agents

```bash
# Install for all detected agents
va-claw install

# Or target a specific agent
va-claw install --for claude-code
va-claw install --for opencode
va-claw install --for codex
```

This injects your identity into:
- `~/.claude/CLAUDE.md` (Claude Code)
- `~/.codex/instructions.md` (Codex)
- OpenCode config (auto-detected)

## Step 4 — Start the wake-loop daemon

```bash
va-claw start
```

Check it's running:

```bash
va-claw status
```

## Optional: Connect to Discord

To receive wake outputs and send commands via Discord:

```bash
va-claw channel discord setup
# Follow the prompts to enter your bot token and channel ID
va-claw channel discord start
```

Get a Discord bot token at: https://discord.com/developers/applications

## Optional: Connect to Telegram

```bash
va-claw channel telegram setup --token <your-bot-token>
va-claw channel telegram start
```

Get a Telegram bot token from @BotFather: https://t.me/BotFather

## Optional: Connect to Slack

```bash
va-claw channel slack setup \
  --bot-token xoxb-your-bot-token \
  --app-token xapp-your-app-token
va-claw channel slack start
```

Create a Slack app at: https://api.slack.com/apps

## Optional: Connect to Lark (Feishu)

To receive wake outputs and send commands via Lark:

```bash
va-claw channel lark setup --app-id <your-app-id> --app-secret <your-app-secret>
va-claw channel lark start
```

Create a self-built app at: https://open.feishu.cn/
Enable the `im.message.receive_v1` event subscription and message send/reply permissions.

## Natural-language claw-fleet checks are enabled on install

`va-claw install` will automatically install a built-in skill so you can ask for claw status in natural language (for example, "我的 va/claw 在干什么" or "what are my claws doing").

## Verify everything is working

```bash
# Check daemon status
va-claw status

# Check memory (should be empty initially)
va-claw memory list

# Manually trigger a wake cycle to test
va-claw memory memorize "setup-complete" "va-claw installed and configured" --tags setup,milestone

# Search memory
va-claw memory recall "setup"
```

## Managing your agent

```bash
# Stop the daemon
va-claw stop

# Update your identity config
va-claw identity edit

# View what's in memory
va-claw memory list
va-claw memory recall "<query>"

# Consolidate memory (prune forgotten, reinforce recent)
va-claw memory consolidate

# Get a memory reflection summary
va-claw memory reflect

# Uninstall (removes from CLI config files, stops daemon)
va-claw uninstall
```

## Troubleshooting

**"No CLI agent detected"**
Make sure `claude`, `opencode`, or `codex` is in your PATH. You can also force a specific command:
```bash
VA_CLAW_CLI=claude-copilot va-claw start
```

**Wake loop not triggering**
Check that your cron expression is valid. Use `va-claw status` to see last wake time.

**Memory not persisting**
Memory is stored at `~/.va-claw/memory.db`. Ensure the directory is writable.

For more help: https://github.com/Vadaski/va-claw/issues
