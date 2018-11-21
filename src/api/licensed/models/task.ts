import { config } from "../../../config";
import { logErrorObjectAtAppropriateLevel } from "../../../utils/log-error";
import * as path from "path";
import * as fse from "fs-extra";
import * as fs from "fs";
import { v4 as uuid } from "uuid";
import { TaskRequest, InputFile } from "./task-request";
import * as Farm from "worker-farm/lib/farm";
import * as logger from "winston";
import * as download from "download";
import * as FormData from "form-data";
import axios from "axios";
import { trimStart, each, values, remove } from "lodash";
import { state } from "../../../state";
import * as klawSync from "klaw-sync";
import * as fkill from "fkill";
import { TaskServiceRunner } from "./task-service-status";

export enum TaskStatusType {
    INIT = "Initializing Task",
    INPUTS = "Downloading Inputs",
    IN_PROGRESS = "In Progress",
    OUTPUTS = "Uploading Outputs",
    CLEAN = "Cleaning Up",
    REPORT = "Reporting Results",
    CANCELLING = "Cancelling task",
    CANCELLED = "Task cancelled",
    ERRORED = "Task encountered an error",
}

const cancellableStates = [
    TaskStatusType.INIT,
    TaskStatusType.INPUTS,
    TaskStatusType.IN_PROGRESS,
];

export class Task extends TaskRequest {

    /**
     * This is the unique identifier for the task
     */
    id: string;

    /**
     * This is the absolute path for the base working directory for the task.
     */
    workingDirectoryBase: string;

    /**
     * This is the absolute path for the working directory for the task.
     */
    workingDirectory: string;

    /**
     * This is the absolute path for the input directory where input files are stored for the task.
     */
    inputDirectory: string;

    /**
     * This is the absolute path for the output directory where input files are stored for the task.
     */
    outputDirectory: string;

    /**
     * This is the absolute path for the output directory where input files are stored for the task.
     */
    serviceRunner: TaskServiceRunner;

    /**
     * This is the current status for the task
     */
    // tslint:disable-next-line:variable-name
    _status: TaskStatusType;

    get status(): TaskStatusType {
        return this._status;
    }

    set status(val: TaskStatusType) {
        logger.info(`Changing status for task ${this.id} from ${this._status} to ${val}`);
        this._status = val;
    }

    workerFarm: any;
    worker: any;
    heartbeatMonitor: any;

    constructor(taskRequest: TaskRequest, serviceRunner: TaskServiceRunner, id?: string) {
        super();
        this.callbacks = taskRequest.callbacks;
        this.files = taskRequest.files;
        this.heartbeatInterval = taskRequest.heartbeatInterval || 5;
        this.input = taskRequest.input;
        this.status = TaskStatusType.INIT;
        this.id = id || uuid();
        this.weight = taskRequest.weight || 1;
        this.serviceRunner = serviceRunner;
        this.trackingInfo = taskRequest.trackingInfo;
    }

    async init(): Promise<void> {
        const workingDirBase = path.join(config.workingDir, this.id);
        const inputDir = path.join(workingDirBase, "input");
        const outputDir = path.join(workingDirBase, "output");
        const workingDir = path.join(workingDirBase, "working");

        fse.emptyDirSync(inputDir);
        fse.emptyDirSync(outputDir);
        fse.emptyDirSync(workingDir);

        this.workingDirectory = workingDir;
        this.workingDirectoryBase = workingDirBase;
        this.inputDirectory = inputDir;
        this.outputDirectory = outputDir;
    }

    async start(): Promise<void> {
        const task = this;
        process.nextTick(() => {
            logger.info(`Task ${task.id} Started - ${new Date()}`);
            task.execute()
                .then(() => {
                    logger.info(`Task ${task.id} Completed - ${new Date()}`);
                })
                .catch((err) => {
                    logger.error(`[TASK-1001] Task ${task.id} Failed - ${new Date()}`);
                    logErrorObjectAtAppropriateLevel(err);
                });
        });
    }

    async heartbeat(): Promise<void> {
        try {
            const hb = this.callbacks.heartbeat;
            const headers = hb.headers || {};
            const resp = await axios({
                method: hb.serviceMethod || "post",
                url: hb.url,
                headers,
                data: {
                    trackingInfo: this.trackingInfo,
                    taskId: this.id,
                    status: this.status
                },
                responseType: "json"
            });
            logger.info(`Heartbeat response for task ${this.id}`, resp.data);
            if (resp.data.cancel) {
                if (cancellableStates.indexOf(this.status) > -1) {
                    logger.info(`Cancelling task ${this.id}`);
                    this.status = TaskStatusType.CANCELLING;
                    await this.cancelTask();
                } else {
                    logger.warn(`Unable to cancel task ${this.id} because its current state ${this.status} is not cancellable`);
                }
            }
        } catch (err) {
            logger.error(`[TASK-1002] Error with heartbeat for task ${this.id}`);
            logErrorObjectAtAppropriateLevel(err);
        }
    }

    async cancelTask(): Promise<void> {
        try {
            await this.killWorker();
            this.status = TaskStatusType.CANCELLED;
            await this.processResult({ message: `Task ${this.id} cancelled` }, true);
        } catch (err) {
            logger.error(`[TASK-1003] Error cancelling task ${this.id}`);
            logErrorObjectAtAppropriateLevel(err);
            this.status = TaskStatusType.ERRORED;
            await this.processResult(err, true);
        }
    }

    async execute(): Promise<any> {
        const workerFarmOptions = {
            autoStart: false,
            maxCallsPerWorker: 1,
            maxConcurrentCallsPerWorker: 1,
            maxConcurrentWorkers: 1,
            maxRetries: 0,
            workerOptions: {
                cwd: this.workingDirectory
            }
        };

        const payload = {
            input: this.input,
            context: {
                taskId: this.id,
                workingDirectory: this.workingDirectory,
                inputDirectory: this.inputDirectory,
                outputDirectory: this.outputDirectory
            }
        };

        if (this.files && this.files.length > 0) {
            for (const inputFile of this.files) {
                const dest = await this.downloadInputFile(inputFile);
                logger.info(`Downloaded input file for task ${this.id} to: ${dest}`);
            }
        }

        logger.info(`Task ${this.id} is loading module: ${this.serviceRunner.modulePath}`);
        this.workerFarm = new Farm(workerFarmOptions, this.serviceRunner.modulePath);
        this.worker = this.workerFarm.setup();
        this.status = TaskStatusType.IN_PROGRESS;

        // Do this after setting up the worker to prevent errors cancelling the worker
        const intervalMilliseconds = this.heartbeatInterval * 1000;
        this.heartbeatMonitor = setInterval(() => {
            task.heartbeat();
        }, intervalMilliseconds);

        const task = this;
        return new Promise(resolve => {
            task.worker(payload, (err, result) => {
                if (err) {
                    logger.error(`[TASK-1004] Error executing task ${task.id}`);
                    logErrorObjectAtAppropriateLevel(err);
                    resolve(task.processResult(err, true));
                } else {
                    logger.info(`Task ${task.id} finished execution`);
                    resolve(task.processResult(result));
                }
            });
        });
    }

    async downloadInputFile(inputFile: InputFile): Promise<string> {
        const filename = path.basename(inputFile.destinationPath);
        let dirname = path.dirname(inputFile.destinationPath);
        dirname = trimStart(dirname, path.sep);
        dirname = path.join(this.inputDirectory, dirname);
        const opts = {
            filename
        };
        logger.info(`Input File Download: ${dirname} ${filename}`);

        await download(inputFile.downloadUrl, dirname, opts);
        return path.join(dirname, filename);
    }

    async killWorker(): Promise<any> {
        const childProcesses = values(this.workerFarm.children);
        const childProcessIds = childProcesses.map((p) => p.child.pid);
        for (const pid of childProcessIds) {
            logger.info(`Killing worker process with pid ${pid} for task ${this.id}`);
            await fkill(pid);
        }
    }

    async destroyWorkerFarm(): Promise<any> {
        const task = this;
        return new Promise((resolve, reject) => {
            try {
                
                if(task.status === TaskStatusType.CANCELLED){
                    logger.info(`Not trying to end worker farm for task ${task.id} because task has been cancelled`);
                    resolve();
                    return;
                }

                task.workerFarm.end((err, result) => {
                    if (err) {
                        logger.error(`[TASK-1011] Error ending worker farm for task ${task.id}`);
                        logErrorObjectAtAppropriateLevel(err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            } catch (err) {
                logger.error(`[TASK-1012] Error destroying worker farm for task ${task.id}`);
                logErrorObjectAtAppropriateLevel(err);
                reject(err);
            }
        });
    }

    async processResult(result: any, isError: boolean = false): Promise<any> {
        // The task is being cancelled wait until the cancel routine calls this
        logger.info(`Processing results for task ${this.id}`);
        if (this.status === TaskStatusType.CANCELLING) {
            logger.info(`Skipping process results for task ${this.id} because it's being cancelled`);
            return;
        }

        const isCancelled = (this.status === TaskStatusType.CANCELLED);

        let finalResult = result;

        try {
            logger.info(`Destroying worker farm for task ${this.id}`);
            await this.destroyWorkerFarm();
            logger.info(`Destroyed worker farm for task ${this.id}`);
        } catch (err) {
            logger.error(`[TASK-1005] Error stopping worker farm for task ${this.id}`);
            logErrorObjectAtAppropriateLevel(err);
            finalResult = err;
            isError = true;
        }

        try {
            if (!isError) {
                const outputFiles = klawSync(this.outputDirectory, { nodir: true });
                if (outputFiles.length > 0) {
                    logger.info(`Uploading output ${outputFiles.length} files for task ${this.id}`);
                } else {
                    logger.info(`No output files to upload for task ${this.id}`);
                }

                if (outputFiles && outputFiles.length > 0) {
                    for (const outputFile of outputFiles) {
                        await this.uploadOutputFile(outputFile.path);
                    }
                }
            } else {
                logger.warn(`Skipping uploading output files for task ${this.id} because it has errored!`);
            }
        } catch (err) {
            logger.error(`[TASK-1006] Error uploading output files for task ${this.id}`);
            logErrorObjectAtAppropriateLevel(err);
            finalResult = err;
            isError = true;
        }

        logger.info(`Cleaning up working folder for task ${this.id}`);
        await this.cleanUp();

        logger.info(`Reporting final results for task ${this.id}`);
        await this.reportResults(finalResult, isError, isCancelled);

        logger.info(`Stopping heartbeat for task ${this.id}`);
        clearInterval(this.heartbeatMonitor);
        this.heartbeatMonitor = undefined;

        logger.info(`Removing task ${this.id} from active queue`);
        remove(state.activeTasks, { id: this.id });

        if(isCancelled) {
            return;
        } else if (isError) {
            logger.warn(`Return task ${this.id} error to execute function`);
            throw result;
        } else {
            logger.info(`Return task ${this.id} results to execute function`);
            return result;
        }
    }

    async reportResults(result: any, isError: boolean = false, isCancelled: boolean = false): Promise<void> {
        try {
            let status = "completed-success";
            
            if (isError) {
                status = "completed-failed";
            }
            
            if (isCancelled) {
                status = "completed-cancelled";
            }

            const completed = this.callbacks.completed;
            const headers = completed.headers || {};
            const resp = await axios({
                method: completed.serviceMethod || "post",
                url: completed.url,
                headers,
                data: { result, taskId: this.id, status, trackingInfo: this.trackingInfo },
                responseType: "json"
            });
            logger.info(`Reported result to caller for ${this.id}`);
            // logger.info(resp.data);
        } catch (err) {
            logger.error(`[TASK-1007] Error reporting results for task ${this.id}`);
            logErrorObjectAtAppropriateLevel(err);
        }
    }

    async uploadOutputFile(outputFilePath: string): Promise<any> {
        const relFilePath = outputFilePath.substr(this.outputDirectory.length);
        try {
            const filedrop = this.callbacks.filedrop;
            const headers = filedrop.headers || {};
            const resp = await axios({
                method: filedrop.serviceMethod || "post",
                url: filedrop.url,
                headers,
                data: { outputFilePath: relFilePath, taskId: this.id, trackingInfo: this.trackingInfo },
                responseType: "json"
            });

            logger.info(`[TASK-1008] Received file drop instructions for output file: ${relFilePath} for task ${this.id}.`, resp.data);

            const {
                postUrl,
                formData,
                headers: multiPartHeaders = {},
                fileFieldName = "file"
            } = resp.data;

            const form = new FormData();

            each(formData, (val, key) => {
                logger.info(`Appending custom form values ${key}: ${val}`);
                form.append(key, val);
            });
            logger.info(`Appending file: ${fileFieldName}: ${outputFilePath}`);
            form.append(fileFieldName, fs.createReadStream(outputFilePath));

            return axios.create({
                headers: {
                    ...form.getHeaders(),
                    ...multiPartHeaders
                }
            })
                .post(postUrl, form)
                .then((res) => {
                    logger.info(`Received post response ${res.status}`);
                    logger.info(`Successfully posted file ${outputFilePath} to ${postUrl}`);
                    return res;
                })
                .catch(err => {
                    logger.error(`[TASK-1009] Error posting file ${outputFilePath} to ${postUrl}`);
                    logErrorObjectAtAppropriateLevel(err);
                    if (err.response) {
                        const {
                            status,
                            statusText,
                            data
                        } = err.response;
                        throw new Error(`${status} - ${statusText}\n${JSON.stringify(data, null, 4)}`);
                    }
                    throw err;
                });
        } catch (err) {
            logger.error(`[TASK-1010] Error uploading output file ${relFilePath} for task ${this.id}`);
            logErrorObjectAtAppropriateLevel(err);
            throw err;
        }
    }

    async cleanUp(): Promise<void> {
        if (!process.env.NO_CLEAN) {
            fse.removeSync(this.workingDirectoryBase);
        } else {
            logger.warn("Not cleaning up working directory!");
        }
    }
}