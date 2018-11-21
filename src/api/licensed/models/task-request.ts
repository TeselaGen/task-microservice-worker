export enum ServiceType {
  REST = "REST",
  GraphQL = "GRAPHQL"
}

export enum TaskRequestStatusType {
  ACCEPTED = "ACCEPTED",
  UNSUPPORTED = "UNSUPPORTED",
  REJECTED = "REJECTED"
}

export enum RESTMethodType {
  PATCH = "patch",
  POST = "post",
  PUT = "put"
}

export interface Dictionary<T> {
  [key: string]: T;
}

/**
 * A TaskCallback defines a service the worker will call back to
 * when a certain event happens
 */
export class TaskCallback {
  /**
   * serviceType is the type of service either REST or GraphQL
   * that this callback is for. Currently only REST is supported.
   * This value defaults to REST if undefined.
   */
  serviceType?: ServiceType;

  /**
   * serviceMethod is the type of method such as PUT or POST for REST
   * or Mutation for GraphQL that used when executing the callback.
   * This value defaults to POST for REST if undefined.
   */
  serviceMethod?: RESTMethodType;

  /**
   * url is the full url of the service endpoint to callback to
   */
  url: string;

  /**
   * These are header values that should be included in the callback
   */
  headers: any;
}

/**
 * The TaskCallbackConfig defines the TaskCallback settings for the worker
 */
export class TaskCallbackConfig {
  /**
   * The completed TaskCallback is executed when the task is completed (either in success or failure).
   * If there were output files that needed posted back these will have all been posted by the time this callback is executed.
   */
  completed: TaskCallback;

  /**
   * The hearbeat TaskCallback is executed at a regular interval while the task is processing to let
   * the caller know the task is still running. The interval defaults to 5 seconds but can be specified
   * in the TaskRequest.
   */
  heartbeat: TaskCallback;

  /**
   * The filedrop TaskCallback is executed just prior to the completed callback and requests
   * the URL to multi-part form post any output files to. If there are no output files this
   * callback will not be called.
   */
  filedrop: TaskCallback;
}

/**
 * The InputFile defines where to download input files from and where to place them in the input directory.
 */
export class InputFile {
  /**
   * This is the URL to download the file from.
   */
  downloadUrl: string;

  /**
   * This is the relative path including file name of where to download the file to in the input directory
   */
  destinationPath: string;
}

/**
 * The TaskRequest defines a task for the worker to execute
 */
export class TaskRequest {
  /**
   * The heartbeatInterval specifies in seconds how often the worker should call the heartbeat
   * callback while in progress. If undefined this defaults to 5 seconds.
   */
  heartbeatInterval: number | undefined;

  /**
   * The input is JSON input that will be parsed and passed to the worker process
   * as the first arg: input.
   */
  input: any;

  /**
   * The trackingInfo is JSON input that will be echoed back on callbacks
   */
  trackingInfo: any;

  /**
   * service is the name of the microservice that this TaskRequest should be processed by
   * such as j5, blast, alignment, etc.
   */
  service: string;

  /**
   * The files is a list of input files URL's that need to be downloaded before starting
   * the task.
   */
  files: InputFile[] | undefined;

  /**
   * The TaskCallbackConfig defines the TaskCallback settings for the worker
   */
  callbacks: TaskCallbackConfig;

  /**
   * weight indicates how much capacity is needed to run this task
   * by default the weight will be 1
   */
  weight?: number;
}

/**
 * The TaskRequestStatus informs the caller if their request was accepted or rejected
 */
export class TaskRequestStatus {
  /**
   * This is the status of the request either accepted or rejected
   */
  status: TaskRequestStatusType;

  /**
   * If accepted this is the worker's tracking id for the task
   */
  taskId: string | undefined;

  /**
   * The trackingInfo is JSON input that will be echoed back on callbacks
   */
  trackingInfo: any;

  /**
   * If accepted this is the heartbeatInterval that will be used.
   */
  heartbeatInterval: number | undefined;

  constructor(
    status: TaskRequestStatusType = TaskRequestStatusType.REJECTED,
    trackingInfo: any,
    taskId?: string,
    heartbeatInterval?: number
  ) {
    this.trackingInfo = trackingInfo;
    this.status = status;
    this.taskId = taskId;
    this.heartbeatInterval = heartbeatInterval;
  }
}
