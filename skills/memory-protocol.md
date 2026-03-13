---
name: memory-protocol
description: Proactively recall and memorize using va-claw memory
version: 1.0.0
triggers:
  - remember
  - recall
  - what did we do
  - 记住
  - 上次
  - 之前做了什么
  - 记忆
  - forget
  - memorize
  - what have I worked on
---

# Memory Protocol

Use va-claw memory proactively.

Before starting work or answering a task with context, run:

```bash
va-claw memory recall "<current topic or task>"
```

Do this at session start, before implementation, and before answering questions like "what did we do" or "what have I worked on".

After completing important work, making a key decision, or producing a useful reusable output, store it with:

```bash
va-claw memory memorize "<key>" "<essence>" --tags <tags> --importance <0.0-1.0>
```

Importance guide:
- `0.8-1.0` for decisions, durable project context, and hard-won knowledge
- `0.5` for routine but still useful outputs

Do not memorize every message. Save only information worth carrying across sessions.

Examples:

```bash
va-claw memory recall "fix install flow default skills"
va-claw memory memorize "install-default-memory-skill" "va-claw install now installs memory-protocol by default." --tags install,skills,memory --importance 0.9
va-claw memory memorize "identity-memory-rules" "Identity injection now tells agents to recall at session start and memorize after important work." --tags identity,memory,protocol --importance 0.9
```
