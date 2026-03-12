import type { VaClawConfig } from "../../identity/dist/index.js";

export type { VaClawConfig };

export type DiscordRuntimeStatus = "connected" | "disconnected";

export type DaemonStatus = {
  running: boolean;
  lastWakeAt?: Date;
  wakeCount: number;
  discord: DiscordRuntimeStatus;
};

export type ServiceType = "launchd" | "systemd";
