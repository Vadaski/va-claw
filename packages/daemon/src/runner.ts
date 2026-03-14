import { loadIdentity } from "../../identity/dist/index.js";
import { sendLarkMessage } from "@va-claw/channels/lark";
import { startDaemon, stopDaemon } from "./runtime.js";

export async function runDaemonProcess(): Promise<void> {
  const config = await loadIdentity();
  await startDaemon(config, {
    wakeDeps: createWakeDeps(config),
  });

  const shutdown = async () => {
    await stopDaemon();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

function createWakeDeps(config: Awaited<ReturnType<typeof loadIdentity>>): {
  notifyLark?: (chatId: string, text: string) => Promise<boolean>;
} {
  const notifyChatId = config.channels.lark.notifyChatId?.trim() ?? "";
  if (
    notifyChatId === ""
    || config.channels.lark.appId.trim() === ""
    || config.channels.lark.appSecret.trim() === ""
  ) {
    return {};
  }

  return {
    notifyLark: (chatId, text) => sendLarkMessage(config.channels.lark, chatId, text),
  };
}

await runDaemonProcess();
