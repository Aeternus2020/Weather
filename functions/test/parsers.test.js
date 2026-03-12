const test = require("node:test")
const assert = require("node:assert/strict")

const {
  parsePercentToProbability,
  parseTgftpObservation,
  parseAviationObservation,
} = require("../src/parsers")

test("parsePercentToProbability normalizes numeric probability inputs", () => {
  assert.equal(parsePercentToProbability(0.6), 0.6)
  assert.equal(parsePercentToProbability(60), 0.6)
  assert.equal(parsePercentToProbability(null), null)
  assert.equal(parsePercentToProbability("abc"), null)
})

test("parseTgftpObservation parses NOAA text payload", () => {
  const raw = "2025/02/25 18:51\nKJFK 251851Z 33012KT 10SM FEW040 08/M01 A3012"
  const parsed = parseTgftpObservation(raw)

  assert.deepEqual(parsed, {
    station: "KJFK",
    timeIso: "2025-02-25T18:51:00.000Z",
    tempC: 8,
  })
})

test("parseAviationObservation parses aviationweather payload", () => {
  const parsed = parseAviationObservation({
    icaoId: "EGLL",
    obsTime: 1773319860,
    temp: 11,
  })

  assert.equal(parsed?.station, "EGLL")
  assert.equal(parsed?.tempC, 11)
  assert.equal(parsed?.timeIso, "2026-03-12T12:51:00.000Z")
})
