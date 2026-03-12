const test = require("node:test")
const assert = require("node:assert/strict")

const { runPipelineSteps } = require("../src/pipelines/runPipeline")

function createLoggerStub() {
  return {
    errorCalls: [],
    error(message) {
      this.errorCalls.push(message)
    },
  }
}

test("runPipelineSteps aggregates inserted values across successful steps", async () => {
  const logger = createLoggerStub()
  const result = await runPipelineSteps(logger, [
    { name: "step one", run: async () => ({ inserted: 2, failures: [] }) },
    { name: "step two", run: async () => ({ inserted: 3, failures: [] }) },
  ])

  assert.equal(result.inserted, 5)
  assert.deepEqual(result.failures, [])
  assert.equal(logger.errorCalls.length, 0)
})

test("runPipelineSteps captures thrown step errors as failures", async () => {
  const logger = createLoggerStub()
  const result = await runPipelineSteps(logger, [
    { name: "step one", run: async () => ({ inserted: 1, failures: [] }) },
    {
      name: "step two",
      run: async () => {
        throw new Error("Timeout")
      },
    },
  ])

  assert.equal(result.inserted, 1)
  assert.equal(result.failures.length, 1)
  assert.equal(result.failures[0].scope, "step two")
  assert.equal(result.failures[0].message, "Timeout")
  assert.equal(logger.errorCalls.length, 1)
})
