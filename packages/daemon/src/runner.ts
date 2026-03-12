import { loadIdentity } from "../../identity/dist/index.js";
import { startDaemon, stopDaemon } from "./runtime.js";

export async function runDaemonProcess(): Promise<void> {
  const config = await loadIdentity();
  await startDaemon(config);

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

await runDaemonProcess();
