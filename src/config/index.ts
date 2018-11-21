import * as url from "url";
import * as path from "path";
import * as fs from "fs";
import { trimEnd } from "lodash";
import { ConfigType } from "./config-type";

// console.log(process.env);

const taskRunnerManifestPath = path.resolve(__dirname, "../../task-runner-manifest.json");
const taskRunnerConfigPath = path.resolve(__dirname, "../../task-runner.config.json");

const config: ConfigType = {
    autoScaleDelay: +(process.env.AUTO_SCALE_DELAY || 10000),
    licenseKey: process.env.LICENSE_KEY || "freebird",
    port: +(process.env.PORT || 7000),
    initModules: !fs.existsSync(taskRunnerManifestPath),
    capacity: +(process.env.CAPACITY || 1),
    taskRunnerConfigPath,
    taskRunnerManifestPath
};

if (process.env.NODE_ENV === "production" &&
    !(process.env.HEROKU_APP_NAME || process.env.HOST_URL)) {
    console.warn(`Running in a production environment but neither HEROKU_APP_NAME or HOST_URL environment variables are set!`);
    console.warn(`If running on Heroku run command: 'heroku labs:enable runtime-dyno-metadata -a <app_name>' to enable the HEROKU_APP_NAME variable`);
}

if (process.env.HOST_URL) {
    config.fullHostUrl = process.env.HOST_URL;
} else if (process.env.HEROKU_APP_NAME) {
    config.fullHostUrl = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
} else {
    // assume it's local dev
    config.fullHostUrl = `http://localhost:${config.port}`;
}

const hostUrl: any = { ...url.parse(config.fullHostUrl) };
hostUrl.scheme = trimEnd(hostUrl.protocol, ":");
config.hostUrl = hostUrl;

config.workingDir = path.resolve(__dirname, "../../working");

export { config };
