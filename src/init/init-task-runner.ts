import * as fse from "fs-extra";
import * as path from "path";
import * as shelljs from "shelljs";
import * as logger from "winston";
import { ModuleConfig } from "./module-config";
import * as mustache from "mustache";

export const initTaskRunner = (moduleConfig: ModuleConfig): string => {

    if (!process.env.NPM_TOKEN) {
        if (process.env.BUILD_INIT) {
          logger.warn(
            `NPM_TOKEN not set but trying to install private task runner anyways`
          );
        } else {
          throw new Error(
            `No NPM_TOKEN has been supplied! Unable to initialize task runner!`
          );
        }
      }

    const taskRunnerName = `${moduleConfig.name}-task-runner`;

    logger.info(`Init Task Runner: ${taskRunnerName}`);

    //const npmrcContents = `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`;
    const taskRunnerDir = path.resolve(__dirname, `../../task-runners/${taskRunnerName}`);
    const taskRunnerTemplateDir = path.resolve(__dirname, "../../task-runner-template");

    logger.info(`Ensuring Task Runner Directory is empty: ${taskRunnerDir}`);
    fse.emptyDirSync(taskRunnerDir);

    logger.info(`Copying Task Runner Template from: ${taskRunnerTemplateDir}`);
    fse.copySync(taskRunnerTemplateDir, taskRunnerDir);

    const model = {
        name: moduleConfig.name,
        moduleName: "" + moduleConfig.moduleName
    };

    const indexjsPath = path.join(taskRunnerDir, "index.js");
    logger.info(`Rendering index.js content: ${indexjsPath}`);
    let indexjsContent = fse.readFileSync(indexjsPath, { encoding: "utf8" });
    indexjsContent = mustache.render(indexjsContent, model);
    fse.outputFileSync(indexjsPath, indexjsContent, { encoding: "utf8" });

    const packageJsonPath = path.join(taskRunnerDir, "package.json");
    logger.info(`Rendering package.json content: ${packageJsonPath}`);
    let packageJsonContent = fse.readFileSync(packageJsonPath, { encoding: "utf8" });
    packageJsonContent = mustache.render(packageJsonContent, model);
    fse.outputFileSync(packageJsonPath, packageJsonContent, { encoding: "utf8" });

    // const npmrcPath = path.join(taskRunnerDir, ".npmrc");
    // if(fse.existsSync(npmrcPath)){
    //     logger.info(`Writing out .npmrc file to: ${npmrcPath}`);
        
    //     fse.outputFileSync(npmrcPath, npmrcContents, { encoding: "utf8" });
    // }else{
    //     throw new Error(`.npmrc file path ${npmrcPath} does not exist! Unable to finish setting up task runner!`);
    // }

    // logger.info(`Running npm and adding package ${moduleConfig.moduleName} to the task-runner in ${taskRunnerDir}`);
    // const result = shelljs.exec(`cd ${taskRunnerDir} && cat .npmrc && npm install && npm install ${moduleConfig.moduleName}`);
    logger.info(`Running yarn and adding package ${moduleConfig.moduleName} to the task-runner`);
    const result = shelljs.exec(`cd ${taskRunnerDir} && cat .npmrc && yarn && yarn add ${moduleConfig.moduleName}`);

    logger.info(`yarn result code ${result.code}`);

    if (result.code !== 0) { throw new Error(`Unable to add package: ${moduleConfig.moduleName} to task-runner!`); }

    return taskRunnerDir;
};
