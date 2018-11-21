import { TaskRequest } from "./models/task-request";
import { config } from "../../config";
import * as fse from "fs-extra";
import { TaskService } from "./models/task-service-status";
import * as logger from "winston";

export const isSupportedTask = (taskRequest: TaskRequest): boolean => {

    const taskRunners = getSupportedServices();
    const taskRunnerNames = taskRunners.map((item) => item.name);
    logger.info(`Checking if task request service ${taskRequest.service} is in the list of supported tasks: ${taskRunnerNames.join(", ")}`);

    if(getTaskRunnerConfigByName(taskRequest.service) !== null) {
        logger.info(`Task runner found for service ${taskRequest.service}`);
        return true;
    } else {
        logger.warn(`No task runner found!`);
        return false;
    }
};

export const getTaskRunnerConfigByName = (name: string): any => {
    const taskManifest = fse.readJsonSync(config.taskRunnerManifestPath);
    for (const taskRunner of taskManifest.taskRunners) {
        if (taskRunner.name === name) {
            return taskRunner;
        }
    }
    return null;
};

export const getSupportedServices = (): TaskService[] => {
    const taskManifest = fse.readJsonSync(config.taskRunnerManifestPath);

    return taskManifest.taskRunners.map((item) => {
        return new TaskService(item);
    });
};
