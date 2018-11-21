/**
 * Class to represent a TaskService
 */
export class TaskService {
  name?: string;
  weight?: number;

  constructor(taskRunnerConfigItem: any) {
    if (taskRunnerConfigItem) {
      this.name = taskRunnerConfigItem.name;
      this.weight = taskRunnerConfigItem.weight;
    }
  }
}

/**
 * Class to represent a TaskServiceRunner
 */
export class TaskServiceRunner extends TaskService {
  modulePath?: string;

  constructor(taskRunnerConfigItem: any) {
    super(taskRunnerConfigItem);
    if (taskRunnerConfigItem) {
      this.modulePath = taskRunnerConfigItem.taskRunnerPath;
    }
  }
}

/**
 * Class to represent the status service response
 */
export class TaskServiceStatus {
  isReady: boolean;
  services: TaskService[];
  constructor(isReady: boolean = false) {
    this.isReady = isReady;
    this.services = [];
  }
}
