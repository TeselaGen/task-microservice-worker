import * as logger from "winston";
import * as dumpster from "dumpster";
import { get, has } from "lodash";

const dump = dumpster.dump;
let LOGGING_LEVEL = "default";
if (process.env.LOGGING_LEVEL) {
  LOGGING_LEVEL = process.env.LOGGING_LEVEL.toLowerCase();
}

export const logErrorObjectAtAppropriateLevel = (error: Error) => {
  if (LOGGING_LEVEL === "verbose") {
    logger.error(error);
  } else if (LOGGING_LEVEL === "minimal") {
    logger.error(`[${error.name}] - ${error.message}`);
  } else {
    let stackTrace;
    if (error.stack) {
      stackTrace = error.stack;
    } else {
      stackTrace = "Generated Trace:\n" + new Error().stack;
    }

    let message = error.message;

    if (has(error, "response") && LOGGING_LEVEL !== "trace") {
      let headers = get(error, "response.headers");
      if (typeof headers === "object")
        headers = dump(headers, { pretty: true });

      let status = get(error, "response.status");
      if (typeof status === "object") status = dump(status, { pretty: true });

      let data = get(error, "response.data");
      if (typeof data === "object") data = dump(data, { pretty: true });

      message = `${message}\nHeaders:\n${headers}\nStatus:\n${status}\nData:\n${data}`;
    }

    logger.error(`[${error.name}] - ${message}\n${stackTrace}`);
  }
};
