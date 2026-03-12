const test = require("node:test")
const assert = require("node:assert/strict")

const { createRunResult } = require("../src/utils/runResult")
const { appendMissingBatchFailures } = require("../src/pipelines/observationIngestion")

test("appendMissingBatchFailures records missing requested stations", () => {
  const result = createRunResult()
  const loggerStub = {
    error() {},
  }

  appendMissingBatchFailures({
    source: "checkwx.com",
    dueLocations: [
      { id: "London", metar: "EGLL" },
      { id: "NY", metar: "KJFK" },
    ],
    seenStations: new Set(["EGLL"]),
    result,
    log: loggerStub,
  })

  assert.equal(result.failures.length, 1)
  assert.equal(result.failures[0].scope, "checkwx.com")
  assert.equal(result.failures[0].location, "NY")
  assert.equal(result.failures[0].station, "KJFK")
  assert.equal(result.failures[0].message, "Requested station missing from batch response")
})
