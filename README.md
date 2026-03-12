# va-claw

[![CI](https://github.com/vadaski/va-claw-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/vadaski/va-claw-plugin/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/va-claw.svg)](https://www.npmjs.com/package/va-claw)
[![License](https://img.shields.io/github/license/vadaski/va-claw-plugin.svg)](LICENSE)

Persistent local memory, identity, and wake-loop automation for Claude Code and Codex.

`va-claw` installs a saved identity into your CLI agents, keeps local memory in SQLite, and runs a background loop that wakes the available agent and writes the result back into memory.

## Install

Runtime: Node `>=22`.

```bash
npm install -g va-claw
va-claw install
```

## Three Capabilities

### memory

Local SQLite memory for wake outputs. Search it, list it, clear it, and keep continuity outside any single CLI session.

### identity

One saved identity, rendered into managed blocks for `~/.claude/CLAUDE.md` and `~/.codex/instructions.md`, with name, persona, system prompt, wake prompt, and loop interval.

### loop

A local daemon loop that wakes `claude` or `codex` on a cron schedule, captures the wake output, and stores it back into memory.

## CLI Quick Reference

```bash
va-claw install [--for claude-code|codex|all]
va-claw start
va-claw stop
va-claw status
va-claw uninstall

va-claw memory search <query>
va-claw memory list
va-claw memory clear
```

## Relation to open-claw

`va-claw` is inspired by `open-claw`: the same local-first, continuity-focused direction, but implemented independently for this repo as a smaller CLI-centered stack around memory, identity injection, and wake-loop automation.

## Badges

- CI: GitHub Actions
- Package: npm
- License: MIT

## Contributing

- See [CONTRIBUTING.md](CONTRIBUTING.md).

## Skills

va-claw supports local Markdown-based skills to extend behavior.

Install a skill file:

```bash
va-claw skill add ./my-skill.md
```

### Skill commands

```bash
va-claw skill list
va-claw skill add <path-or-url>
va-claw skill remove <name>
va-claw skill show <name>
```

## Channels

va-claw can connect to external channels for wake loop input/output.

### Discord

```bash
va-claw channel discord setup
va-claw channel discord start
va-claw channel discord status
```

### Telegram

```bash
va-claw channel telegram setup --token <token> [--cli-command <command>]
va-claw channel telegram start
va-claw channel telegram status
```

### Slack

```bash
va-claw channel slack setup --bot-token <token> --app-token <token> [--cli-command <command>]
va-claw channel slack start
va-claw channel slack status
```

## Complete CLI command table

```bash
va-claw install [--for claude-code|codex|all]
va-claw start
va-claw stop
va-claw status
va-claw uninstall

va-claw memory search <query>
va-claw memory list
va-claw memory clear

va-claw skill list
va-claw skill add <path-or-url>
va-claw skill remove <name>
va-claw skill show <name>

va-claw channel discord setup
va-claw channel discord start
va-claw channel discord status
va-claw channel telegram setup --token <token> [--cli-command <command>]
va-claw channel telegram start
va-claw channel telegram status
va-claw channel slack setup --bot-token <token> --app-token <token> [--cli-command <command>]
va-claw channel slack start
va-claw channel slack status
```

## License

This project is licensed under the [MIT License](LICENSE).
