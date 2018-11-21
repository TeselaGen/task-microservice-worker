const task = require("{{{moduleName}}}");

module.exports = function runTask(payload, done) {
    let {
        input,
        context
    } = payload;
    console.log(`Executing task ${context.taskId} with process id: ${process.pid}`);
    task(input, context)
    .then((result) => {
        console.log(`Task ${context.taskId} with process id: ${process.pid} completed`);
        done(null, result);
    })
    .catch((err) => {
        console.error(`Error executing task: ${context.taskId}`, err);
        done(err);
    });
}