import * as express from "express";
import { Errors } from "typescript-rest";
import { config } from "../../config";

export const validateLicenseKey = (req: express.Request): express.Request => {
  if (req.headers["x-license-key"] !== config.licenseKey) {
    throw new Errors.UnauthorizedError("Invalid License Key");
  } else {
    return req;
  }
};
