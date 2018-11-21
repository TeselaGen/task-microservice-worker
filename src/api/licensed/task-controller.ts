import { GET, Path, Preprocessor, POST } from "typescript-rest";
import { Security, Tags } from "typescript-rest-swagger";
import { TaskServiceStatus, TaskServiceRunner } from "./models/task-service-status";
import { state } from "../../state";
import { validateLicenseKey } from "./license-validator";
import { TaskRequest, TaskRequestStatus, TaskRequestStatusType } from "./models/task-request";
import { Task } from "./models/task";
import { config } from "../../config";
import { delay } from "../../utils/delay";
import { isSupportedTask, getSupportedServices, getTaskRunnerConfigByName } from "./is-supported-task";
import * as logger from "winston";

/**
 * This handles running tasks
 */
@Tags("api/licensed")
@Security("license_key")
@Path("licensed/task")
@Preprocessor(validateLicenseKey)
export class TaskController {
    /**
     * Returns if the service is ready
     * if the service is ready it also lists the supported services
     */
    @GET
    public getServiceStatus(): TaskServiceStatus {
        if (!state.isTaskRunnerReady) {
            return new TaskServiceStatus(state.isTaskRunnerReady);
        } else {
            const serviceStatus = new TaskServiceStatus(state.isTaskRunnerReady);
            serviceStatus.services = getSupportedServices();
            return serviceStatus;
        }
    }

    /**
     * Attempts to execute the TaskRequest if not busy. If busy it will wait
     * a predetermined amount of time for the running task to finish. Before
     * giving up and rejecting the TaskRequest.
     * @param taskRequest The object representing the task to be executed
     */
    @POST
    public async executeTask(taskRequest: TaskRequest): Promise<TaskRequestStatus> {

        // if task runner is not ready it should be soon
        if (!state.isTaskRunnerReady) {
            logger.info(`Task Runner not ready...delaying ${config.autoScaleDelay} ms`);
            await delay(config.autoScaleDelay);
        }

        // if it's still not ready something is probably wrong so just reject
        if (!state.isTaskRunnerReady) {
            logger.warn(`Task Runner still not ready! Rejecting task for service: ${taskRequest.service}`);
            return new TaskRequestStatus(TaskRequestStatusType.REJECTED, taskRequest.trackingInfo);
        } else {
            // If the request microservice is not supported by this worker 
            // return unsupported so the caller will update its queue manager
            // that this worker does not support this service
            if (!isSupportedTask(taskRequest)) {
                logger.warn(`Task Runner does not support service: ${taskRequest.service}`);
                return new TaskRequestStatus(TaskRequestStatusType.UNSUPPORTED, taskRequest.trackingInfo);
            }

            // Check to see if this has available capacity
            // if it doesn't wait a bit to see if a task finishes up
            const taskWeight = taskRequest.weight || 1;
            if (!state.hasAvailableCapacity(taskWeight)) {
                logger.info(`Task Runner does not current have enough capacity ${state.currentCapacity} for task with weight: ${taskWeight}`);
                logger.info(`Waiting ${config.autoScaleDelay} ms to see if more capacity becomes available`);
                await delay(config.autoScaleDelay);
            }

            // If it still doesn't have available capacity after waiting then reject
            if (!state.hasAvailableCapacity(taskWeight)) {
                logger.warn(`Task Runner still does not current have enough capacity ${state.currentCapacity} for task with weight: ${taskWeight}`);
                logger.warn(`Rejecting task`);
                return new TaskRequestStatus(TaskRequestStatusType.REJECTED, taskRequest.trackingInfo);
            } else {
                logger.info(`Task Runner has available capacity ${state.currentCapacity} and has ${state.activeTasks.length} in process. Adding task to active task list.`);
                const taskServiceRunner = new TaskServiceRunner(getTaskRunnerConfigByName(taskRequest.service));
                const task = new Task(taskRequest, taskServiceRunner);
                state.activeTasks.push(task);
                await task.init();
                task.start();
                return new TaskRequestStatus(TaskRequestStatusType.ACCEPTED, taskRequest.trackingInfo, task.id, task.heartbeatInterval);
            }
        }

    }
}
