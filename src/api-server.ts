import * as express from "express";
import { Server } from "typescript-rest";
import * as http from "http";
import * as cors from "cors";
import * as path from "path";
import { config } from "./config";
import { publicApi, adminApi, licensedApi } from "./api";
import { returnHttpErrorsAsJSON } from "./utils/json-error-handler";
import * as morgan from "morgan";

export class ApiServer {
  private readonly app: express.Application;
  private readonly apiRouter: express.Router;
  private server: http.Server;

  constructor(port: number | undefined = 7000) {
    this.app = express();

    this.app.use(morgan("combined"));

    this.apiRouter = express.Router();

    this.config();

    Server.buildServices(
      this.apiRouter,
      ...publicApi,
      ...adminApi,
      ...licensedApi
    );

    // TODO: enable for Swagger generation error
    // Server.loadServices(this.app, 'controllers/*', __dirname);
    Server.swagger(
      this.app,
      "./build/swagger.json",
      "/api-docs",
      `${config.hostUrl.host}/api`,
      [config.hostUrl.scheme]
    );
    this.app.use("/api", this.apiRouter);

    this.app.use("/docs", express.static(path.resolve(__dirname, "../docs")));

    // if (process.env.NODE_ENV === "production" || process.env.TG_SERVE_CLIENT) {
    //     this.app.use(express.static(clientPath));
    // } else {
    this.app.use(express.static(path.join(__dirname, "public")));
    // }
    this.app.use(returnHttpErrorsAsJSON);
  }

  /**
   * Configure the express app.
   */
  private config(): void {
    // Native Express configuration
    // this.app.use( bodyParser.urlencoded( { extended: false } ) );
    // this.app.use( bodyParser.json( { limit: '1mb' } ) );
    if (process.env.NODE_ENV === "production" || process.env.TG_SERVE_CLIENT) {
      this.app.use(cors());
    }
  }

  /**
   * Start the server
   * @returns {Promise<any>}
   */
  public start(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.server = this.app.listen(config.port, (err: any) => {
        if (err) {
          return reject(err);
        }

        // TODO: replace with Morgan call
        // tslint:disable-next-line:no-console
        console.log(
          `Listening to ${config.hostUrl.scheme}://${config.hostUrl.host}/`
        );

        return resolve();
      });
    });
  }

  /**
   * Stop the server (if running).
   * @returns {Promise<boolean>}
   */
  public stop(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (this.server) {
        this.server.close(() => {
          return resolve(true);
        });
      } else {
        return resolve(true);
      }
    });
  }
}
