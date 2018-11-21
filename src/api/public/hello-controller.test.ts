import { HelloController } from "./hello-controller";

describe("HelloController", () => {
  describe("sayHello", () => {
    it("has method sayHello", () => {
      const controller = new HelloController();
      expect(typeof controller.sayHello).toBe("function");
    });
  });
});
