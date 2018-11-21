import * as url from "url";

export interface HostUrl extends url.UrlWithStringQuery {
    scheme: string;
}

export interface ConfigType {
    licenseKey?: string;
    port?: number;
    capacity?: number;
    fullHostUrl?: string;
    hostUrl?: HostUrl;
    workingDir?: string;
    autoScaleDelay?: number;
    initModules?: boolean;
    taskRunnerConfigPath?: string;
    taskRunnerManifestPath?: string;
}
