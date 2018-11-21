import * as fse from "fs-extra";
import * as path from "path";
import * as logger from "winston";
import { config } from "../config";
import { state } from "../state";
import { ModuleConfig } from "./module-config";
import { each } from "lodash";
import { initTaskRunner } from "./init-task-runner";

export const parseAndInitTaskRunners = (): void => {
  // If initModules is false then don't do anything
  if (!config.initModules && !process.env.BUILD_INIT) {
    logger.info(`Not re-initializing modules`);
    logger.info(
      `Loading modules from manifest ${config.taskRunnerManifestPath}`
    );
    const manifest = fse.readJsonSync(config.taskRunnerManifestPath);
    state.taskRunnerManifest = manifest;
    logger.info(JSON.stringify({ manifest }));
    state.isTaskRunnerReady = true;
    return;
  }

  if (!process.env.NPM_TOKEN) {
    if (process.env.BUILD_INIT) {
      logger.warn(
        `NPM_TOKEN not set but trying to install private packages anyways`
      );
    } else {
      throw new Error(
        `No NPM_TOKEN has been supplied! Unable to initialize task runners!`
      );
    }
  }

  logger.info(`Init Task Runners`);

  const taskRunnersDir = path.resolve(__dirname, `../../task-runners`);

  logger.info(`Ensuring Task Runners Directory is empty: ${taskRunnersDir}`);
  fse.emptyDirSync(taskRunnersDir);

  logger.info(
    `Ensuring Task Runner Working Directory is empty: ${config.workingDir}`
  );
  fse.emptyDirSync(config.workingDir);

  const taskRunnerConfigs = fse.readJsonSync(config.taskRunnerConfigPath);

  const moduleConfigs = [];

  logger.info(
    `Initializing task runners from task runner config: ${
      config.taskRunnerConfigPath
    }`
  );
  each(taskRunnerConfigs, (taskConfig, name) => {
    const modConfig = new ModuleConfig(name, taskConfig);
    moduleConfigs.push(modConfig);
    modConfig.taskRunnerPath = initTaskRunner(modConfig);
  });

  const manifest = {
    createdOn: new Date(),
    taskRunners: moduleConfigs
  };

  logger.info(`Saving task runner manifest: ${config.taskRunnerManifestPath}`);
  fse.writeJsonSync(config.taskRunnerManifestPath, manifest, { spaces: 4 });

  state.taskRunnerManifest = manifest;

  // Move to top
  state.isTaskRunnerReady = true;
};
