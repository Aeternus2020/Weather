const test = require("node:test")
const assert = require("node:assert/strict")

const { filterTemperaturesForUtcDay } = require("../src/pipelines/openMeteoDerived")

test("filterTemperaturesForUtcDay keeps only temperatures for the runTime UTC day", () => {
  const runTime = new Date("2026-03-17T10:00:00.000Z")
  const times = [
    "2026-03-17T00:00:00.000Z",
    "2026-03-17T12:00:00.000Z",
    "2026-03-18T00:00:00.000Z",
  ]
  const temperatures = [8.2, 11.4, 5.1]

  assert.deepEqual(
    filterTemperaturesForUtcDay(times, temperatures, runTime),
    [8.2, 11.4],
  )
})

test("filterTemperaturesForUtcDay preserves null values inside the selected UTC day", () => {
  const runTime = new Date("2026-03-17T23:00:00.000Z")
  const times = [
    "2026-03-17T03:00:00.000Z",
    "2026-03-17T06:00:00.000Z",
    "2026-03-18T03:00:00.000Z",
  ]
  const temperatures = [null, 10.1, 6.2]

  assert.deepEqual(
    filterTemperaturesForUtcDay(times, temperatures, runTime),
    [null, 10.1],
  )
})
