export async function waitForStopSignal(stop: () => Promise<void>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let stopping = false;
    const cleanup = () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };
    const onSignal = () => {
      if (stopping) {
        return;
      }
      stopping = true;
      void stop().then(
        () => {
          cleanup();
          resolve();
        },
        (error: unknown) => {
          cleanup();
          reject(error);
        },
      );
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  });
}
