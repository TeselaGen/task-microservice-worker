import { parseAndInitTaskRunners } from "./parse-init-and-task-runners";
import { clearTaskRunners } from "./clear-task-runners";
import { config } from "../config";

// preStartUpInit runs any initialization logic that needs to happen
// before the api server starts
export const preStartupInit = async (): Promise<any> => {
  if (process.env.RESET_MODULES) {
    clearTaskRunners();
    config.initModules = true;
  }
  return Promise.resolve();
};

// postStartUpInit will dynamically install task runners which is useful
// for dev
export const postStartUpInit = async (): Promise<any> => {
  parseAndInitTaskRunners();
  return Promise.resolve();
};

// buildInit creates the task runners based on the config for a Docker build
// so that the task runners are now embedded in the build instead of dynamically
// pulled
export const buildInit = async (): Promise<any> => {
  parseAndInitTaskRunners();
  return Promise.resolve();
};
