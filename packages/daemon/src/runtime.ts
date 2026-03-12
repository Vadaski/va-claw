import { Cron } from "croner";

import type { DaemonStatus, DiscordRuntimeStatus, VaClawConfig } from "./types.js";
import { runWakeCycle } from "./wake-cycle.js";

type SchedulerHandle = { stop(): void };
type DiscordStarter = {
  status(): DiscordRuntimeStatus;
  stop(): Promise<void>;
};
type RuntimeDeps = {
  createScheduler: (pattern: string, onTick: () => Promise<void>) => SchedulerHandle;
  startDiscord: (config: {
    token: string;
    clientId: string;
    cliCommand?: string;
  }) => Promise<DiscordStarter>;
  wake: (config: VaClawConfig) => Promise<Date | null>;
};

const runtimeState: {
  discord: DiscordStarter | null;
  job: SchedulerHandle | null;
  wakeCount: number;
  lastWakeAt?: Date;
} = {
  discord: null,
  job: null,
  wakeCount: 0,
};

let runtimeDeps: RuntimeDeps = {
  createScheduler(pattern, onTick) {
    const job = new Cron(pattern, { catch: false }, () => {
      void onTick().catch((error: unknown) => {
        console.warn(`[va-claw/daemon] wake tick failed: ${String(error)}`);
      });
    });
    return { stop: () => job.stop() };
  },
  async startDiscord(config) {
    const moduleUrl = new URL("../../channels/discord/dist/index.js", import.meta.url);
    const channelModule = await import(moduleUrl.href) as {
      startDiscordChannel: RuntimeDeps["startDiscord"];
    };
    return channelModule.startDiscordChannel(config);
  },
  wake: runWakeCycle,
};

export async function startDaemon(config: VaClawConfig): Promise<void> {
  await stopDaemon();
  runtimeState.wakeCount = 0;
  runtimeState.lastWakeAt = undefined;
  runtimeState.discord = null;
  if (config.channels.discord.autoStart) {
    runtimeState.discord = await runtimeDeps.startDiscord({
      token: config.channels.discord.token,
      clientId: config.channels.discord.clientId,
      cliCommand: config.channels.discord.cliCommand,
    });
  }
  runtimeState.job = runtimeDeps.createScheduler(config.loopInterval, async () => {
    const wokeAt = await runtimeDeps.wake(config);
    if (!wokeAt) {
      return;
    }
    runtimeState.lastWakeAt = wokeAt;
    runtimeState.wakeCount += 1;
  });
}

export async function stopDaemon(): Promise<void> {
  await runtimeState.discord?.stop();
  runtimeState.discord = null;
  runtimeState.job?.stop();
  runtimeState.job = null;
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  return {
    discord: runtimeState.discord?.status() ?? "disconnected",
    running: runtimeState.job !== null,
    lastWakeAt: runtimeState.lastWakeAt ? new Date(runtimeState.lastWakeAt) : undefined,
    wakeCount: runtimeState.wakeCount,
  };
}

export function setRuntimeDepsForTests(deps: Partial<RuntimeDeps>): void {
  runtimeDeps = { ...runtimeDeps, ...deps };
}

export function resetRuntimeDepsForTests(): void {
  runtimeDeps = {
    createScheduler(pattern, onTick) {
      const job = new Cron(pattern, { catch: false }, () => {
        void onTick().catch((error: unknown) => {
          console.warn(`[va-claw/daemon] wake tick failed: ${String(error)}`);
        });
      });
      return { stop: () => job.stop() };
    },
    async startDiscord() {
      return {
        status() {
          return "connected";
        },
        async stop() {},
      };
    },
    wake: runWakeCycle,
  };
}
