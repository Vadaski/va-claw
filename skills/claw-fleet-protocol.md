---
name: claw-fleet-protocol
description: Operate and inspect long-running va-claw claws from natural language prompts
version: 1.0.0
triggers:
  - 我的 va/claw 们都在干什么
  - 我的 va claw 在干什么
  - 我的 claw 在干什么
  - claw 在干什么
  - 我这边有哪些 claw
  - 我的 claw 状态
  - show my claws
  - what are my claws doing
  - check claw status
  - list my claws
  - claw fleet
---

# Claw Fleet Protocol

This skill translates user intent about long-running va-claw claws into CLI commands.

When the user asks for current status, run:

```bash
va-claw protocol --text
```

Then report:
- whether daemon/service are running
- memory and wake information
- every registered claw with status, goal, last seen, and notes

For management intents:

- `list claws` → `va-claw claw list`
- `add claw <name> ...` → `va-claw claw add <name> --goal <goal> --status <status>`
- `set / update claw <name> ...` → `va-claw claw set <name> --status <status> [--goal ...] [--cli-command ...] [--note ...] [--tags ...]`
- `remove claw <name>` → `va-claw claw remove <name>`
- `heartbeat claw <name>` → `va-claw claw heartbeat <name>`

Default response style:

1. If status is needed, always use `va-claw protocol --text` first.
2. For unknown commands, ask for one of:
   - `va-claw protocol --text`
   - `va-claw claw list`
   - `va-claw claw add <name> --goal ...`
   - `va-claw claw set <name> --status ...`
3. Use concise summaries; do not invent data not present in CLI output.

Recommended status phrasing:

> "Current fleet report:"
> - Daemon: running / stopped
> - Total claws: N
> - Active: running/working
> - Idle/waiting: list by name
