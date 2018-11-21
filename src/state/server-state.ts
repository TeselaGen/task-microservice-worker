import * as moment from "moment";
import { Task } from "../api/licensed/models/task";
import { config } from "../config";

export class ServerState {
  public readonly startTime: moment.Moment;
  public isTaskRunnerReady: boolean;
  public taskRunnerManifest: any;
  public activeTasks: Task[];

  constructor() {
    this.startTime = moment();
    this.isTaskRunnerReady = false;
    this.activeTasks = [];
  }

  get upTime(): moment.Duration {
    return moment.duration(moment().diff(this.startTime));
  }

  get currentCapacity(): number {
    const capacity = this.activeTasks.reduce<number>((total, task) => {
      return total + task.weight;
    }, 0);
    return capacity;
  }

  get availableCapacity(): number {
    let capacityDiff = config.capacity - this.currentCapacity;
    if (capacityDiff < 0) {
      capacityDiff = 0;
    }
    return capacityDiff;
  }

  hasAvailableCapacity(weight: number = 1): boolean {
    if (this.activeTasks.length === 0) {
      return true;
    }
    return weight <= this.availableCapacity;
  }
}
