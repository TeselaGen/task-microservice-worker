export class ModuleConfig {
  name?: string;
  weight?: number;
  moduleName?: string;
  taskRunnerPath?: string;

  constructor(name?: string, config?: any) {
    const { module, weight = 10 } = config;
    this.moduleName = module;
    this.weight = weight;
    this.name = name;
  }
}
