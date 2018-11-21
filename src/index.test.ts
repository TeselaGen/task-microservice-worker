describe("index", () => {
  it("calls start", () => {
    jest.mock("./start", () => {
      return {
        start: jest.fn(() => {
          return {
            catch: jest.fn(cb => {
              cb("test error");
            })
          };
        })
      };
    });
    const { start } = require("./start");
    const mockExit = jest.spyOn(process, "exit");
    mockExit.mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, "error");
    mockConsoleError.mockImplementation(() => {});
    require("./index");
    expect(start).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalled();
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });
});
