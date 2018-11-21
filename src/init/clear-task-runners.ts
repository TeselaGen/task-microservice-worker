import * as fse from "fs-extra";
import * as path from "path";
import * as logger from "winston";
import { config } from "../config";

export const clearTaskRunners = (): void => {

    logger.info(`Clearing Task Runners`);

    const taskRunnersDir = path.resolve(__dirname, `../../task-runners`);

    logger.info(`Removing task runner directory: ${taskRunnersDir}`);
    fse.removeSync(taskRunnersDir);

    logger.info(`Removing task runner manifest: ${config.taskRunnerManifestPath}`);
    fse.removeSync(config.taskRunnerManifestPath);
};
