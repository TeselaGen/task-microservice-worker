"use strict";
import "./state";
import { ApiServer } from "./api-server";
import * as logger from "winston";
import { postStartUpInit, buildInit, preStartupInit } from "./init";

export const start = async (): Promise<void> => {
    if (process.env.BUILD_INIT) {
        logger.info("Running ");
        await buildInit();
        process.exit(0);
    } else {
        logger.info("Starting server...");
        logger.info("Creating ApiServer");

        await preStartupInit();

        const apiServer = new ApiServer();

        const graceful = () => {
            logger.info("Stopping server");
            apiServer.stop().then(() => process.exit(0));
        };

        // Stop graceful
        process.on("SIGTERM", graceful);
        process.on("SIGINT", graceful);

        await apiServer.start();
        await postStartUpInit();
    }
};
