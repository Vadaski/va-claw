import { Command } from "commander";

import { createDefaultCliDeps } from "./deps.js";
import {
  runInstall,
  runDiscordSetup,
  runDiscordStart,
  runDiscordStatus,
  runMemoryClear,
  runMemoryConsolidate,
  runMemoryList,
  runMemoryReflect,
  runMemoryGet,
  runMemoryForget,
  runMemorySearch,
  runMemoryMemorize,
  runMemoryRecall,
  runMemoryUpdate,
  runSkillAdd,
  runSkillList,
  runSkillRemove,
  runSkillShow,
  runStart,
  runStatus,
  runStop,
  runUninstall,
} from "./handlers.js";
import {
  runSlackChannelSetup as runSlackSetup,
  runSlackChannelStart as runSlackStart,
  runSlackChannelStatus as runSlackStatus,
  runTelegramChannelSetup as runTelegramSetup,
  runTelegramChannelStart as runTelegramStart,
  runTelegramChannelStatus as runTelegramStatus,
} from "./channel-handlers.js";
import type { CliDeps, InstallTarget } from "./types.js";

export function createCliProgram(deps: CliDeps = createDefaultCliDeps()): Command {
  const program = new Command("va-claw");
  program.description("va-claw CLI");
  program.showHelpAfterError();

  program
    .command("install")
    .description("Install va-claw config, prompt injections, and daemon service.")
    .option("--for <target>", "claude-code | codex | all", "all")
    .action(async (options: { for?: string }) => runInstall((options.for ?? "all") as InstallTarget, deps));

  program.command("start").description("Start the daemon in the foreground.").action(async () => runStart(deps));
  program.command("stop").description("Stop the daemon.").action(async () => runStop(deps));
  program.command("status").description("Show daemon and memory status.").action(async () => runStatus(deps));
  program.command("uninstall").description("Remove daemon service and injected prompts.").action(async () => runUninstall(deps));

  const memory = program.command("memory").description("Memory operations.");
  memory
    .command("search")
    .description("Search memory.")
    .argument("<query>")
    .action(async (query: string) => runMemorySearch(query, deps));
  memory
    .command("memorize")
    .description("Store or update a memory entry by key.")
    .argument("<key>")
    .argument("<essence>")
    .option("--tags <tags>", "Comma-separated tags.")
    .option("--details <details>", "Details text.")
    .option("--importance <importance>", "Importance from 0 to 1.")
    .action((key: string, essence: string, options: { tags?: string; details?: string; importance?: string }) =>
      runMemoryMemorize(key, essence, options, deps),
    );
  memory
    .command("get")
    .description("Get a memory entry by key.")
    .argument("<key>")
    .action(async (key: string) => runMemoryGet(key, deps));
  memory
    .command("update")
    .description("Update a memory entry by key.")
    .argument("<key>")
    .option("--essence <essence>", "Replace essence text.")
    .option("--tags <tags>", "Comma-separated tags.")
    .option("--importance <importance>", "Importance from 0 to 1.")
    .option("--details <details>", "Replace details text.")
    .action((key: string, options: { essence?: string; tags?: string; importance?: string; details?: string }) =>
      runMemoryUpdate(key, options, deps),
    );
  memory.command("list").description("List recent memory entries.").action(async () => runMemoryList(deps));
  memory
    .command("forget")
    .description("Forget a memory by key.")
    .argument("<key>")
    .action(async (key: string) => runMemoryForget(key, deps));
  memory
    .command("recall")
    .description("Recall memories by query.")
    .argument("<query>")
    .option("--limit <limit>", "Max results.")
    .action((query: string, options: { limit?: string }) =>
      runMemoryRecall(query, options.limit ? Number(options.limit) : 5, deps),
    );
  memory.command("consolidate").description("Consolidate memory store.").action(async () => runMemoryConsolidate(deps));
  memory.command("reflect").description("Reflect memory map grouped by tags.").action(async () => runMemoryReflect(deps));
  memory.command("clear").description("Clear all memory entries.").action(async () => runMemoryClear(deps));

  const skill = program.command("skill").description("Skill operations.");
  skill.command("list").description("List installed and project skills.").action(async () => runSkillList(deps));
  skill
    .command("add")
    .description("Install a skill from a local Markdown file or URL.\n\nTip: vet unknown skills first — va-claw skill add https://clawhub.ai/spclaudehome/Skill-vetter")
    .argument("<path-or-url>")
    .action(async (pathOrUrl: string) => runSkillAdd(pathOrUrl, deps));
  skill
    .command("remove")
    .description("Remove an installed skill by name.")
    .argument("<name>")
    .action(async (name: string) => runSkillRemove(name, deps));
  skill
    .command("show")
    .description("Show the raw Markdown content for a skill.")
    .argument("<name>")
    .action(async (name: string) => runSkillShow(name, deps));

  const channel = program.command("channel").description("Channel operations.");
  const discord = channel.command("discord").description("Discord channel operations.");
  discord.command("setup").description("Configure Discord bot credentials.").action(async () => runDiscordSetup(deps));
  discord.command("start").description("Start the Discord channel in the foreground.").action(async () => runDiscordStart(deps));
  discord.command("status").description("Show Discord channel status.").action(async () => runDiscordStatus(deps));
  const telegram = channel.command("telegram").description("Telegram channel operations.");
  telegram
    .command("setup")
    .description("Configure Telegram bot credentials.")
    .option("--token <token>", "Telegram bot token")
    .option("--cli-command <command>", "CLI command to invoke for each message")
    .action(async (options: { cliCommand?: string; token?: string }) =>
      runTelegramSetup(options.token, options.cliCommand, deps),
    );
  telegram.command("start").description("Start the Telegram channel in the foreground.").action(async () => runTelegramStart(deps));
  telegram.command("status").description("Show Telegram channel status.").action(async () => runTelegramStatus(deps));
  const slack = channel.command("slack").description("Slack channel operations.");
  slack
    .command("setup")
    .description("Configure Slack bot credentials.")
    .option("--bot-token <token>", "Slack bot token")
    .option("--app-token <token>", "Slack app token")
    .option("--cli-command <command>", "CLI command to invoke for each message")
    .action(async (options: { appToken?: string; botToken?: string; cliCommand?: string }) =>
      runSlackSetup(options.botToken, options.appToken, options.cliCommand, deps),
    );
  slack.command("start").description("Start the Slack channel in the foreground.").action(async () => runSlackStart(deps));
  slack.command("status").description("Show Slack channel status.").action(async () => runSlackStatus(deps));

  return program;
}

export async function runCli(argv: string[] = process.argv, deps?: CliDeps): Promise<void> {
  const program = createCliProgram(deps ?? createDefaultCliDeps());
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    (deps ?? createDefaultCliDeps()).stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
