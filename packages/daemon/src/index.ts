export { detectCliAdapter, whichCommandExists } from "./cli-adapter.js";
export {
  getDaemonStatus,
  resetRuntimeDepsForTests,
  setRuntimeDepsForTests,
  startDaemon,
  stopDaemon,
} from "./runtime.js";
export { installDaemonService, uninstallDaemonService } from "./service.js";
export type { DaemonStatus, ServiceType, VaClawConfig } from "./types.js";
