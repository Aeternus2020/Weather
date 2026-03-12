const test = require("node:test")
const assert = require("node:assert/strict")

const { assertSuccessfulRun, runScheduledJob } = require("../index")
const { createFailure } = require("../src/utils/runResult")

test("assertSuccessfulRun allows successful job results", () => {
  assert.doesNotThrow(() =>
    assertSuccessfulRun("Observation ingestion", { inserted: 2, failures: [] })
  )
})

test("assertSuccessfulRun throws when a job has failures", () => {
  const result = {
    inserted: 1,
    failures: [createFailure("weather.gov", new Error("Timeout"), { location: "NY" })],
  }

  assert.throws(
    () => assertSuccessfulRun("Observation ingestion", result),
    /Observation ingestion failed with 1 failures: weather\.gov \(NY\): Timeout/
  )
})

test("runScheduledJob rejects when the runner reports failures", async () => {
  await assert.rejects(
    () =>
      runScheduledJob(
        "Forecast ingestion",
        async () => ({
          inserted: 0,
          failures: [createFailure("provider", new Error("401"))],
        }),
        () => new Date("2026-03-11T12:00:00.000Z")
      ),
    /Forecast ingestion failed with 1 failures: provider: 401/
  )
})
