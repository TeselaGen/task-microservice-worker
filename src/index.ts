"use strict";
import "source-map-support/register";
import * as winston from "winston";
import { start } from "./start";

winston.configure({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.splat(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

start().catch(err => {
  console.error(`Error starting server: ${err.message}`);
  process.exit(-1);
});
