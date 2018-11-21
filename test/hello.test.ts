"use strict";

import * as request from "request";
import { ApiServer } from "../src/api-server";
import {Server, HttpMethod} from "typescript-rest";

const apiServer: ApiServer = new ApiServer();
const helloRequest: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>
                 = request.defaults({baseUrl: `http://localhost:${apiServer.PORT}`});

describe("Hello Controller Tests", () => {

    beforeAll(() => {
        return apiServer.start();
    });

    afterAll(() => {
        return apiServer.stop();
    });

    describe("The Rest Server", () => {
        it("should provide a catalog containing the exposed paths", () => {
            expect(Server.getPaths()).toEqual(expect.arrayContaining([
                "/hello/:name",
                "/hello-objects/:name",
                "/hello-ioc-direct/:name",
                "/hello-ioc-base/:name",
            ]));
            expect(Server.getHttpMethods("/hello/:name")).toEqual(expect.arrayContaining([HttpMethod.GET]));
            expect(Server.getHttpMethods("/hello-objects/:name")).toEqual(expect.arrayContaining([HttpMethod.GET]));
        });
    });

    describe("/hello/:name", () => {
        it("should return the name informed for GET requests", (done) => {
            helloRequest("/hello/joe", (error: any, response, body) => {
                expect(response.statusCode).toEqual(200);
                expect(body).toEqual("Hello joe");
                done();
            });
        });

        it("should return 405 for POST requests", (done) => {
            helloRequest.post({
                body: "joe",
                url: "/hello/joe"
            }, (error, response, body) => {
                expect(response.statusCode).toEqual(405);
                done();
            });
        });
    });

    describe("/hello-objects/:name", () => {
        it("should return the object with field \"name\" informed for GET requests", (done) => {
            helloRequest("/hello-objects/joe", (error: any, response, body) => {
                expect(response.statusCode).toEqual(200);
                expect(JSON.parse(body)).toEqual({greeting:"joe"});
                done();
            });
        });

        it("should return 405 for POST requests", (done) => {
            helloRequest.post({
                body: "joe",
                url: "/hello-objects/joe"
            }, (error, response, body) => {
                expect(response.statusCode).toEqual(405);
                done();
            });
        });
    });

    describe("/hello-ioc-direct/:name", () => {
        it("should return the name informed for GET requests", (done) => {
            helloRequest("/hello-ioc-direct/mike", (error: any, response, body) => {
                expect(response.statusCode).toEqual(200);
                expect(body).toEqual("Hello, mike");
                done();
            });
        });

        it("should return 405 for POST requests", (done) => {
            helloRequest.post({
                body: "mike",
                url: "/hello-ioc-direct/mike"
            }, (error, response, body) => {
                expect(response.statusCode).toEqual(405);
                done();
            });
        });
    });

    describe("/hello-ioc-base/:name", () => {
        it("should return the name informed for GET requests", (done) => {
            helloRequest("/hello-ioc-base/sam", (error: any, response, body) => {
                expect(response.statusCode).toEqual(200);
                expect(body).toEqual("Hi sam!");
                done();
            });
        });

        it("should return 405 for POST requests", (done) => {
            helloRequest.post({
                body: "sam",
                url: "/hello-ioc-base/sam"
            }, (error, response, body) => {
                expect(response.statusCode).toEqual(405);
                done();
            });
        });
    });
});
