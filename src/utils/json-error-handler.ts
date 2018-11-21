import { HttpError } from "typescript-rest";
import * as express from "express";
import * as logger from "winston";

export const returnHttpErrorsAsJSON = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (err instanceof HttpError) {
    if (res.headersSent) {
      // important to allow default error handler to close connection if headers already sent
      return next(err);
    }
    res.set("Content-Type", "application/json");
    res.status(err.statusCode);
    let stackTrace = err.stack;
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.SHOW_STACK_TRACES
    ) {
      stackTrace = "Refer to the logs for the stack trace.";
    }
    res.json({ error: err.message, code: err.statusCode, stackTrace });
    logger.error(`[${err.statusCode}] - ${err.message}\n${err.stack}`);
  } else {
    next(err);
  }
};
